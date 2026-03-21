-- Create notification_preferences table with per-user notification toggles
-- Includes 7 specific notification types + 1 global master toggle
CREATE TABLE notification_preferences (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Global control: disable all notifications at once
  notifications_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  -- 7 notification type toggles (default to true for backward compatibility)
  notify_on_task_assigned BOOLEAN NOT NULL DEFAULT TRUE,
  notify_on_stage_changed BOOLEAN NOT NULL DEFAULT TRUE,
  notify_on_awaiting_action BOOLEAN NOT NULL DEFAULT TRUE,
  notify_on_mention BOOLEAN NOT NULL DEFAULT TRUE,
  notify_on_submitted_for_review BOOLEAN NOT NULL DEFAULT TRUE,
  notify_on_published BOOLEAN NOT NULL DEFAULT TRUE,
  notify_on_assignment_changed BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on notification_preferences
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

-- Users can only read/write their own preferences
CREATE POLICY "Users can view own notification preferences"
  ON notification_preferences
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notification preferences"
  ON notification_preferences
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can insert own notification preferences"
  ON notification_preferences
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Admins can read all preferences for debugging/auditing
CREATE POLICY "Admins can view all notification preferences"
  ON notification_preferences
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Create trigger to automatically populate notification preferences for new users
CREATE OR REPLACE FUNCTION public.create_default_notification_preferences()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO notification_preferences (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.create_default_notification_preferences();

-- Migrate existing users: populate notification_preferences for all current users
-- This is safe to run multiple times due to ON CONFLICT DO NOTHING
INSERT INTO notification_preferences (user_id)
SELECT id FROM auth.users
ON CONFLICT (user_id) DO NOTHING;
