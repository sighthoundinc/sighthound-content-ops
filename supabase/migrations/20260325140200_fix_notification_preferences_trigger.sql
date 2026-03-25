-- Fix notification preferences trigger to properly handle RLS
-- The issue: Trigger on auth.users tries to insert into notification_preferences which has RLS enabled
-- The trigger executes with auth context from the new user, but notification_preferences RLS expects
-- the user to be able to insert their own row.
--
-- Solution: Use SECURITY INVOKER and ensure the trigger can bypass RLS when needed, or
-- use a direct insert that respects the RLS policy

-- Drop the old trigger and function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.create_default_notification_preferences();

-- Create improved trigger function that explicitly sets user_id for proper RLS handling
CREATE OR REPLACE FUNCTION public.create_default_notification_preferences()
RETURNS TRIGGER
SECURITY DEFINER  -- Run as superuser/definer, not as the new user
SET search_path = public
LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO notification_preferences (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Log error but don't fail user creation
  RAISE WARNING 'Failed to create default notification preferences for user %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$;

-- Recreate trigger with SECURITY DEFINER function
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.create_default_notification_preferences();
