-- Create user_integrations table to track third-party service connections
-- Tracks whether Google, Slack, and other connectors are connected per user
CREATE TABLE user_integrations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  google_connected BOOLEAN NOT NULL DEFAULT FALSE,
  google_connected_at TIMESTAMP WITH TIME ZONE,
  slack_connected BOOLEAN NOT NULL DEFAULT FALSE,
  slack_connected_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on user_integrations
ALTER TABLE user_integrations ENABLE ROW LEVEL SECURITY;

-- Users can only read/write their own integration status
CREATE POLICY "Users can view own integration status"
  ON user_integrations
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own integration status"
  ON user_integrations
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Admins can read all integration statuses for debugging/auditing
CREATE POLICY "Admins can view all integration statuses"
  ON user_integrations
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Create trigger to automatically populate user_integrations for new users
CREATE OR REPLACE FUNCTION public.create_default_user_integrations()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_integrations (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_auth_user_created_integrations ON auth.users;
CREATE TRIGGER on_auth_user_created_integrations
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.create_default_user_integrations();

-- Migrate existing users: populate user_integrations for all current users
-- This is safe to run multiple times due to ON CONFLICT DO NOTHING
INSERT INTO user_integrations (user_id)
SELECT id FROM auth.users
ON CONFLICT (user_id) DO NOTHING;
