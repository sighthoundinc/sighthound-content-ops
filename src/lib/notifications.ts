import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import { shouldSendNotification } from "@/lib/notification-helpers";
import { getUserNotificationPreferencesWithCache } from "@/lib/notification-preferences-cache";

// Map Slack event types to notification preference keys
const SLACK_EVENT_TO_NOTIFICATION_TYPE: Record<
  NotifySlackInput["eventType"],
  "task_assigned" | "stage_changed" | "submitted_for_review" | "published" | "awaiting_action"
> = {
  writer_assigned: "task_assigned",
  writer_completed: "stage_changed",
  ready_to_publish: "stage_changed",
  published: "published",
  social_submitted_for_review: "submitted_for_review",
  social_changes_requested: "awaiting_action",
  social_creative_approved: "stage_changed",
  social_ready_to_publish: "stage_changed",
  social_awaiting_live_link: "awaiting_action",
  social_published: "published",
  social_live_link_reminder: "awaiting_action",
};

interface NotifySlackInput {
  eventType:
    | "writer_assigned"
    | "writer_completed"
    | "ready_to_publish"
    | "published"
    | "social_submitted_for_review"
    | "social_changes_requested"
    | "social_creative_approved"
    | "social_ready_to_publish"
    | "social_awaiting_live_link"
    | "social_published"
    | "social_live_link_reminder";
  blogId?: string;
  socialPostId?: string;
  title: string;
  site: string;
  actorName: string;
  targetEmail?: string | null;
  userId?: string; // User ID to check notification preferences
}

/**
 * Send notification to Slack if user preferences allow.
 *
 * Slack is treated as an optional delivery channel:
 * - If Slack is not connected: skip silently (no error)
 * - If user preferences forbid notification: skip silently
 * - If in-app notification is allowed: Slack message sent if connected
 *
 * Returns: true if notification was sent, false if skipped
 *
 * Important: Slack failures do NOT break the notification system.
 * In-app notifications already succeeded; Slack is just a bonus channel.
 */
export async function notifySlack(input: NotifySlackInput): Promise<boolean> {
  try {
    // Check user preferences if userId is provided
    if (input.userId) {
      const notificationType = SLACK_EVENT_TO_NOTIFICATION_TYPE[input.eventType];

      try {
        const preferences = await getUserNotificationPreferencesWithCache(input.userId);
        if (!shouldSendNotification(notificationType, preferences)) {
          // User has disabled this notification type
          return false;
        }
      } catch (error) {
        // If preference check fails, log but continue (don't break Slack notification)
        console.warn("Could not check notification preferences, continuing with Slack send", error);
      }
    }

    const supabase = getSupabaseBrowserClient();
    await supabase.functions.invoke("slack-notify", {
      body: {
        ...input,
        appUrl: process.env.NEXT_PUBLIC_APP_URL,
      },
    });

    return true;
  } catch (error) {
    // Slack notification failure is not critical - log but don't propagate
    // In-app notification already succeeded, Slack is just a bonus channel
    console.warn("Slack notification failed (non-critical, continuing normally)", error);
    return false;
  }
}
