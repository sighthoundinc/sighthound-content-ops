-- Add Slack delivery method preferences to notification_preferences table
-- Allows users to choose between DM, channel, or both for Slack notifications

ALTER TABLE notification_preferences ADD COLUMN slack_delivery_dm BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE notification_preferences ADD COLUMN slack_delivery_channel BOOLEAN NOT NULL DEFAULT TRUE;

-- Create index for quick lookups
CREATE INDEX idx_notification_preferences_user_id ON notification_preferences(user_id);

-- Update existing rows to have both delivery methods enabled by default
-- This maintains backward compatibility (both DM and channel were always sent)
UPDATE notification_preferences 
SET slack_delivery_dm = TRUE, slack_delivery_channel = TRUE
WHERE slack_delivery_dm IS NULL OR slack_delivery_channel IS NULL;
