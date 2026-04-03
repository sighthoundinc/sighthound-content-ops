/**
 * Notification type definitions.
 * Separated from notification-helpers and notifications-provider to avoid circular dependencies.
 */

export type NotificationType =
  | "task_assigned"
  | "stage_changed"
  | "awaiting_action"
  | "mention"
  | "submitted_for_review"
  | "published"
  | "assignment_changed";

export type NotificationInput = {
  type: NotificationType;
  title: string;
  message: string;
  href?: string;
  timestamp?: number;
  sourceId?: string;
  metadata?: {
    targetUserName?: string;
    targetUserNames?: string[];
    targetUserId?: string;
    sourceId?: string;
  };
};
