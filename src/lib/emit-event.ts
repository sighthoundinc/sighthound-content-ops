/**
 * Unified event emission service.
 * Emits events to both notifications and activity history simultaneously.
 * Single source of truth for workflow events.
 */

import type { NotificationInput } from "@/lib/notification-types";
import {
  getApiErrorMessage,
  isApiFailure,
  parseApiResponseJson,
} from "@/lib/api-response";
import {
  UNIFIED_EVENT_TO_NOTIFICATION_TYPE,
  unifiedEventToActivityRecord,
  validateUnifiedEvent,
  type UnifiedEvent,
} from "@/lib/unified-events";

/**
 * Emit a unified event that triggers both notifications and activity history.
 * Non-breaking: Returns success/error for caller to handle.
 *
 * Note: This function prepares the event but does NOT directly emit notifications.
 * Notifications must be emitted separately in React components via pushNotification().
 * Use getNotificationFromEvent() to get the NotificationInput object.
 *
 * @param event - UnifiedEvent payload with all context
 * @param options - Optional configuration
 * @returns Promise<{success: boolean; error?: string}>
 */
export async function emitEvent(
  event: UnifiedEvent,
  options?: {
    skipNotification?: boolean;
    skipActivityHistory?: boolean;
  }
): Promise<{ success: boolean; error?: string }> {
  // Validate event before processing
  const validationError = validateUnifiedEvent(event);
  if (validationError) {
    console.warn("Invalid unified event", { event, error: validationError });
    return { success: false, error: validationError };
  }

  const success: {
    notification: boolean;
    activityHistory: boolean;
  } = {
    notification: true,
    activityHistory: true,
  };

  const errors: string[] = [];

  // Prepare notification (unless skipped)
  if (!options?.skipNotification) {
    try {
      const notificationSuccess = await validateNotificationEvent(event);
      success.notification = notificationSuccess;
      if (!notificationSuccess) {
        errors.push("Notification preparation failed (see console logs)");
      }
    } catch (error) {
      console.error("Error preparing notification from unified event", {
        event,
        error,
      });
      errors.push(`Notification error: ${String(error)}`);
    }
  }

  // Record to activity history (unless skipped)
  if (!options?.skipActivityHistory) {
    try {
      const historySuccess = await recordActivityHistory(event);
      success.activityHistory = historySuccess;
      if (!historySuccess) {
        errors.push("Activity history recording failed (see console logs)");
      }
    } catch (error) {
      console.error("Error recording activity history from unified event", {
        event,
        error,
      });
      errors.push(`Activity history error: ${String(error)}`);
    }
  }

  // Return overall success only if both succeeded (or were skipped)
  const overallSuccess = success.notification && success.activityHistory;

  if (!overallSuccess && errors.length > 0) {
    return {
      success: false,
      error: errors.join("; "),
    };
  }

  return { success: overallSuccess };
}

/**
 * Validate unified event can be converted to a notification.
 * Does not emit - callers must use the returned NotificationInput with pushNotification().
 *
 * @returns true if event can be converted to notification
 */
async function validateNotificationEvent(event: UnifiedEvent): Promise<boolean> {
  try {
    const notificationType =
      UNIFIED_EVENT_TO_NOTIFICATION_TYPE[event.type];

    if (!notificationType) {
      console.warn("Unknown notification type for event", {
        eventType: event.type,
      });
      return false;
    }

    if (process.env.NODE_ENV === "development") {
      console.log("Unified event notification validated", {
        type: event.type,
        notificationType,
        contentId: event.contentId,
      });
    }

    return true;
  } catch (error) {
    console.error("Error validating event for notification", {
      event,
      error,
    });
    return false;
  }
}

function getRecordActivityEndpoint() {
  if (typeof window !== "undefined") {
    return "/api/events/record-activity";
  }

  const configuredAppUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (configuredAppUrl) {
    return `${configuredAppUrl.replace(/\/$/, "")}/api/events/record-activity`;
  }

  const vercelUrl = process.env.VERCEL_URL?.trim();
  if (vercelUrl) {
    const absoluteVercelUrl =
      vercelUrl.startsWith("http://") || vercelUrl.startsWith("https://")
        ? vercelUrl
        : `https://${vercelUrl}`;
    return `${absoluteVercelUrl.replace(/\/$/, "")}/api/events/record-activity`;
  }

  const port = process.env.PORT?.trim() || "3000";
  return `http://127.0.0.1:${port}/api/events/record-activity`;
}

/**
 * Get notification payload from unified event.
 * Callers in React components should use pushNotification() with the returned object.
 *
 * @returns NotificationInput ready for pushNotification()
 */
export function getNotificationFromEvent(event: UnifiedEvent): NotificationInput {
  const notificationType =
    UNIFIED_EVENT_TO_NOTIFICATION_TYPE[event.type];

  if (!notificationType) {
    throw new Error(`Unknown event type: ${event.type}`);
  }

  return {
    type: notificationType,
    title: buildNotificationTitle(event),
    message: buildNotificationMessage(event),
    href: buildNotificationHref(event),
    timestamp: event.timestamp,
    metadata: {
      targetUserName: event.targetUserName,
      targetUserNames: event.targetUserNames,
      targetUserId: event.targetUserId,
    },
  };
}

/**
 * Record event to activity history via API.
 * @returns true if recording succeeded
 */
async function recordActivityHistory(event: UnifiedEvent): Promise<boolean> {
  try {
    const record = unifiedEventToActivityRecord(event);
    const endpoint = getRecordActivityEndpoint();

    // Call API to record activity history
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ...record,
        contentType: event.contentType,
      }),
    });
    const payload = await parseApiResponseJson<Record<string, unknown>>(response);

    if (isApiFailure(response, payload)) {
      console.error("API error recording activity history", {
        status: response.status,
        error: getApiErrorMessage(payload, "Failed to record activity history."),
        event,
      });
      return false;
    }

    if (process.env.NODE_ENV === "development") {
      console.log("Activity history recorded", {
        type: event.type,
        contentId: event.contentId,
      });
    }

    return true;
  } catch (error) {
    console.error("Error recording activity history", {
      event,
      error,
    });
    return false;
  }
}

/**
 * Build notification title from unified event.
 */
function buildNotificationTitle(event: UnifiedEvent): string {
  const contentLabel = event.contentType === "blog" ? "Blog" : "Social Post";
  const titleMap: Record<string, string> = {
    blog_writer_status_changed: `${contentLabel} Update`,
    blog_publisher_status_changed: `${contentLabel} Update`,
    blog_writer_assigned: `${contentLabel} Assignment`,
    blog_publisher_assigned: `${contentLabel} Assignment`,
    blog_awaiting_writer_action: "Action Needed",
    blog_awaiting_publisher_action: "Action Needed",
    blog_publish_overdue: "Publish Overdue",
    social_post_status_changed: `${contentLabel} Update`,
    social_post_assigned: `${contentLabel} Assignment`,
    social_post_reassigned: `${contentLabel} Reassigned`,
    social_post_awaiting_action: "Action Needed",
    social_post_editor_assigned: `${contentLabel} Assignment`,
    social_review_overdue: "Review Overdue",
    social_publish_overdue: "Publish Overdue",
    social_post_live_link_reminder: "Live Link Needed",
  };
  return titleMap[event.type] || `${contentLabel} Event`;
}

/**
 * Returns a display-safe target user string for notification copy.
 * Fallback is always "Team" when no user name is available.
 */
function getTargetUserDisplay(event: UnifiedEvent): string {
  if (Array.isArray(event.targetUserNames) && event.targetUserNames.length > 0) {
    return event.targetUserNames.join(", ");
  }
  if (typeof event.targetUserName === "string" && event.targetUserName.trim().length > 0) {
    return event.targetUserName.trim();
  }
  const metadataNames = event.metadata?.targetUserNames;
  if (Array.isArray(metadataNames)) {
    const names = metadataNames
      .map((value) => String(value).trim())
      .filter((value) => value.length > 0);
    if (names.length > 0) {
      return names.join(", ");
    }
  }
  const metadataName = event.metadata?.targetUserName;
  if (typeof metadataName === "string" && metadataName.trim().length > 0) {
    return metadataName.trim();
  }
  return "Team";
}

/**
 * Build notification message from unified event.
 * Shows user names instead of roles for better clarity.
 */
function buildNotificationMessage(event: UnifiedEvent): string {
  const title = event.contentTitle || event.contentId;
  const targetUser = getTargetUserDisplay(event);

  const messageMap: Record<string, string> = {
    blog_writer_status_changed: `${title} writer stage changed to ${event.newValue || "..."}`,
    blog_publisher_status_changed: `${title} publisher stage changed to ${event.newValue || "..."}`,
    blog_writer_assigned: `${title} assigned to ${targetUser}`,
    blog_publisher_assigned: `${title} assigned to ${targetUser}`,
    blog_awaiting_writer_action: `${title} awaiting action from ${targetUser}`,
    blog_awaiting_publisher_action: `${title} awaiting action from ${targetUser}`,
    blog_publish_overdue: `${title} is overdue for publishing`,
    social_post_status_changed: `${title} stage changed to ${event.newValue || "..."}`,
    social_post_assigned: `${title} assigned to ${targetUser}`,
    social_post_reassigned: `${title} reassigned to ${targetUser}`,
    social_post_awaiting_action: `${title} awaiting action from ${targetUser}`,
    social_post_editor_assigned: `${title} assigned to ${targetUser}`,
    social_review_overdue: `${title} review is overdue`,
    social_publish_overdue: `${title} is overdue for publishing`,
    social_post_live_link_reminder: `${title} is waiting for a live link`,
  };

  return messageMap[event.type] || `Event on ${title}`;
}

/**
 * Build notification href from unified event.
 */
function buildNotificationHref(event: UnifiedEvent): string | undefined {
  if (event.contentType === "blog") {
    return `/blogs/${event.contentId}`;
  }
  if (event.contentType === "social_post") {
    return `/social-posts/${event.contentId}`;
  }
  return undefined;
}
