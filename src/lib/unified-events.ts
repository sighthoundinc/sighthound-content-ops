/**
 * Unified event system for notifications + activity history.
 * A single UnifiedEvent triggers:
 * - Activity history insertion (blog_assignment_history)
 * - Notification emission (with preference checks)
 * - Slack delivery (if user connected)
 */

import type { NotificationType } from "@/lib/notification-types";

/**
 * Event types that trigger both notifications and activity history.
 * Must map to notification types and activity history event_type values.
 */
export type UnifiedEventType =
  | "blog_writer_status_changed"
  | "blog_publisher_status_changed"
  | "blog_writer_assigned"
  | "blog_publisher_assigned"
  | "blog_awaiting_writer_action"
  | "blog_awaiting_publisher_action"
  | "blog_publish_overdue"
  | "social_post_status_changed"
  | "social_post_assigned"
  | "social_post_reassigned"
  | "social_post_awaiting_action"
  | "social_post_editor_assigned"
  | "social_review_overdue"
  | "social_publish_overdue"
  | "social_post_live_link_reminder";

/**
 * Maps unified event types to notification types.
 * Ensures events trigger notifications with correct preference checks.
 */
export const UNIFIED_EVENT_TO_NOTIFICATION_TYPE: Record<
  UnifiedEventType,
  NotificationType
> = {
  blog_writer_status_changed: "stage_changed",
  blog_publisher_status_changed: "stage_changed",
  blog_writer_assigned: "task_assigned",
  blog_publisher_assigned: "task_assigned",
  blog_awaiting_writer_action: "awaiting_action",
  blog_awaiting_publisher_action: "awaiting_action",
  blog_publish_overdue: "awaiting_action",
  social_post_status_changed: "stage_changed",
  social_post_assigned: "task_assigned",
  social_post_reassigned: "assignment_changed",
  social_post_awaiting_action: "awaiting_action",
  social_post_editor_assigned: "task_assigned",
  social_review_overdue: "awaiting_action",
  social_publish_overdue: "awaiting_action",
  social_post_live_link_reminder: "awaiting_action",
};

/**
 * Unified event payload for both notifications and activity history.
 * Single source of truth for what happened.
 */
export interface UnifiedEvent {
  // Core event identity
  type: UnifiedEventType;
  contentType: "blog" | "social_post";
  contentId: string;

  // Change details
  oldValue?: string;
  newValue?: string;
  fieldName?: string;

  // Who did it
  actor: string; // user ID
  actorName?: string; // user display name
  actorRole?: "writer" | "publisher" | "admin" | "editor";

  // Context
  contentTitle?: string;
  metadata?: Record<string, unknown>;

  // Timestamps (if not provided, server uses now())
  timestamp?: number;
}

/**
 * Activity history record structure (what gets inserted into DB).
 * Derived from UnifiedEvent for storage.
 */
export interface ActivityHistoryRecord {
  blog_id?: string;
  social_post_id?: string;
  changed_by: string;
  event_type: string;
  field_name?: string;
  old_value?: string;
  new_value?: string;
  metadata: Record<string, unknown>;
}

/**
 * Convert UnifiedEvent to activity history record.
 * Prepares event for DB insertion.
 */
export function unifiedEventToActivityRecord(
  event: UnifiedEvent
): ActivityHistoryRecord {
  return {
    blog_id: event.contentType === "blog" ? event.contentId : undefined,
    social_post_id:
      event.contentType === "social_post" ? event.contentId : undefined,
    changed_by: event.actor,
    event_type: event.type,
    field_name: event.fieldName,
    old_value: event.oldValue,
    new_value: event.newValue,
    metadata: {
      ...(event.metadata || {}),
      actor_name: event.actorName,
      actor_role: event.actorRole,
      content_title: event.contentTitle,
    },
  };
}

/**
 * Validate unified event has required fields.
 * Prevents invalid events from being emitted.
 */
export function validateUnifiedEvent(event: UnifiedEvent): string | null {
  if (!event.type) {
    return "Event type is required";
  }

  if (!UNIFIED_EVENT_TO_NOTIFICATION_TYPE[event.type]) {
    return `Unknown event type: ${event.type}`;
  }

  if (!event.contentType || !["blog", "social_post"].includes(event.contentType)) {
    return "Content type must be 'blog' or 'social_post'";
  }

  if (!event.contentId) {
    return "Content ID is required";
  }

  if (!event.actor) {
    return "Actor (user ID) is required";
  }

  return null;
}
