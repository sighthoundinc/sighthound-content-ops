/**
 * Notification helper utilities for workflow state transitions.
 *
 * These functions generate notification payloads for events like:
 * - Blog status changes (writer/publisher stages)
 * - Task assignments and status changes
 * - Approval/revision workflows
 *
 * All notifications are subject to user preference enforcement via shouldSendNotification().
 * This ensures all notifications respect both the global notifications_enabled toggle
 * and specific event-type toggles.
 */

import type { NotificationInput } from "@/lib/notification-types";
export type { NotificationInput } from "@/lib/notification-types";
import type {
  PublisherStageStatus,
  SocialPostStatus,
  WriterStageStatus,
} from "@/lib/types";
import { SOCIAL_POST_STATUS_LABELS, getNextActor } from "@/lib/status";

/**
 * Map notification types to user preference toggle fields.
 * Each notification type must be explicitly mapped to a preference toggle.
 * This ensures clear accountability: if it's not in the map, it's not enforced.
 */
export const NOTIFICATION_TYPE_TO_PREFERENCE_KEY: Record<
  NotificationInput["type"],
  keyof {
    notify_on_task_assigned: boolean;
    notify_on_stage_changed: boolean;
    notify_on_awaiting_action: boolean;
    notify_on_mention: boolean;
    notify_on_submitted_for_review: boolean;
    notify_on_published: boolean;
    notify_on_assignment_changed: boolean;
  }
> = {
  task_assigned: "notify_on_task_assigned",
  stage_changed: "notify_on_stage_changed",
  awaiting_action: "notify_on_awaiting_action",
  mention: "notify_on_mention",
  submitted_for_review: "notify_on_submitted_for_review",
  published: "notify_on_published",
  assignment_changed: "notify_on_assignment_changed",
};

/**
 * User notification preferences structure
 * Enforced before any notification is emitted (in-app or Slack).
 * Each notification type can be toggled independently for in-app and Slack channels.
 */
export interface UserNotificationPreferences {
  notifications_enabled: boolean;
  notify_on_task_assigned: boolean;
  notify_on_stage_changed: boolean;
  notify_on_awaiting_action: boolean;
  notify_on_mention: boolean;
  notify_on_submitted_for_review: boolean;
  notify_on_published: boolean;
  notify_on_assignment_changed: boolean;
  slack_notify_on_task_assigned?: boolean;
  slack_notify_on_stage_changed?: boolean;
  slack_notify_on_awaiting_action?: boolean;
  slack_notify_on_mention?: boolean;
  slack_notify_on_submitted_for_review?: boolean;
  slack_notify_on_published?: boolean;
  slack_notify_on_assignment_changed?: boolean;
  slack_delivery_dm?: boolean;
  slack_delivery_channel?: boolean;
}

/**
 * Check if a specific notification type should be sent to a user
 * based on their notification preferences.
 *
 * Returns true if the user wants to receive this notification type.
 * Returns false if:
 * - Global notifications_enabled is false, OR
 * - The specific notification type toggle is false
 * - The notification type is invalid/unknown
 *
 * This is the single enforcement point for all notifications.
 */
export function shouldSendNotification(
  notificationType: NotificationInput["type"],
  preferences: UserNotificationPreferences | null,
  userId?: string
): boolean {
  // Validate notification type is known
  if (!NOTIFICATION_TYPE_TO_PREFERENCE_KEY[notificationType]) {
    console.warn("Unknown notification type", {
      type: notificationType,
      userId,
    });
    return false; // Fail-safe: don't send unknown notification types
  }

  // Default to sending if preferences don't exist (backward compatibility)
  if (!preferences) {
    return true;
  }

  // If global notifications are disabled, don't send anything
  if (!preferences.notifications_enabled) {
    if (process.env.NODE_ENV === "development") {
      console.log("Notification skipped: global toggle disabled", {
        userId,
        type: notificationType,
      });
    }
    return false;
  }

  // Check the specific notification type toggle
  const preferenceKey = NOTIFICATION_TYPE_TO_PREFERENCE_KEY[notificationType];
  const isAllowed = preferences[preferenceKey] !== false;

  if (!isAllowed && process.env.NODE_ENV === "development") {
    console.log("Notification skipped: type toggle disabled", {
      userId,
      type: notificationType,
      preferenceKey,
    });
  }

  return isAllowed;
}

/**
 * Generates a notification when a blog writer status changes
 */
export function blogWriterStatusChangedNotification(
  blogTitle: string,
  previousStatus: WriterStageStatus | null,
  newStatus: WriterStageStatus,
  writerName: string | null,
  blogId: string
): NotificationInput {
  const statusLabel = getWriterStatusLabel(newStatus);

  return {
    type: "stage_changed",
    title: `Blog Update: ${blogTitle}`,
    message: `Writer stage changed to ${statusLabel}${writerName ? ` by ${writerName}` : ""}`,
    href: `/blogs/${blogId}`,
    timestamp: Date.now(),
  };
}

/**
 * Generates a notification when a blog publisher status changes
 */
export function blogPublisherStatusChangedNotification(
  blogTitle: string,
  previousStatus: PublisherStageStatus | null,
  newStatus: PublisherStageStatus,
  publisherName: string | null,
  blogId: string
): NotificationInput {
  const statusLabel = getPublisherStatusLabel(newStatus);

  return {
    type: "stage_changed",
    title: `Blog Update: ${blogTitle}`,
    message: `Publisher stage changed to ${statusLabel}${publisherName ? ` by ${publisherName}` : ""}`,
    href: `/blogs/${blogId}`,
    timestamp: Date.now(),
  };
}

/**
 * Generates a notification when a blog is assigned to a writer
 */
export function blogAssignedToWriterNotification(
  blogTitle: string,
  writerName: string,
  blogId: string
): NotificationInput {
  return {
    type: "task_assigned",
    title: "Blog Assignment",
    message: `${blogTitle} assigned to writer ${writerName}`,
    href: `/blogs/${blogId}`,
    timestamp: Date.now(),
  };
}

/**
 * Generates a notification when a blog is assigned to a publisher
 */
export function blogAssignedToPublisherNotification(
  blogTitle: string,
  publisherName: string,
  blogId: string
): NotificationInput {
  return {
    type: "task_assigned",
    title: "Blog Assignment",
    message: `${blogTitle} assigned to publisher ${publisherName}`,
    href: `/blogs/${blogId}`,
    timestamp: Date.now(),
  };
}

/**
 * Generates a notification when a blog is awaiting review/action
 */
export function blogAwaitingActionNotification(
  blogTitle: string,
  actionType: "writer_revision" | "publisher_review",
  blogId: string
): NotificationInput {
  const message =
    actionType === "writer_revision"
      ? `${blogTitle} needs writer revision`
      : `${blogTitle} awaiting publisher review`;

  return {
    type: "awaiting_action",
    title: "Action Needed",
    message,
    href: `/blogs/${blogId}`,
    timestamp: Date.now(),
  };
}

/**
 * Generates a notification when a blog is submitted for review
 */
export function blogSubmittedForReviewNotification(
  blogTitle: string,
  submitterName: string | null,
  reviewType: "writer" | "publisher",
  blogId: string
): NotificationInput {
  const reviewTypeLabel = reviewType === "writer" ? "Writer" : "Publisher";
  return {
    type: "submitted_for_review",
    title: `Submitted for ${reviewTypeLabel} Review`,
    message: `${blogTitle} submitted by ${submitterName || "user"}`,
    href: `/blogs/${blogId}`,
    timestamp: Date.now(),
  };
}

/**
 * Generates a notification when a blog is published
 */
export function blogPublishedNotification(
  blogTitle: string,
  publisherName: string | null,
  blogId: string
): NotificationInput {
  return {
    type: "published",
    title: "Blog Published",
    message: `${blogTitle} published by ${publisherName || "user"}`,
    href: `/blogs/${blogId}`,
    timestamp: Date.now(),
  };
}

/**
 * Generates a notification when a blog's writer or publisher assignment changes
 */
export function blogAssignmentChangedNotification(
  blogTitle: string,
  assignmentType: "writer" | "publisher",
  assignedToName: string | null,
  assignedByName: string | null,
  blogId: string
): NotificationInput {
  const roleLabel = assignmentType === "writer" ? "Writer" : "Publisher";
  const message = assignedToName
    ? `${blogTitle} reassigned to ${assignedToName} as ${roleLabel} by ${assignedByName || "user"}`
    : `${blogTitle} ${roleLabel} assignment removed`;

  return {
    type: "assignment_changed",
    title: `Assignment Changed`,
    message,
    href: `/blogs/${blogId}`,
    timestamp: Date.now(),
  };
}

/**
 * Get human-readable label for writer status
 */
function getWriterStatusLabel(status: WriterStageStatus): string {
  const labels: Record<WriterStageStatus, string> = {
    not_started: "Not Started",
    in_progress: "In Progress",
    pending_review: "Pending Review",
    needs_revision: "Needs Revision",
    completed: "Writing Approved",
  };
  return labels[status] || status;
}

/**
 * Get human-readable label for publisher status
 */
function getPublisherStatusLabel(status: PublisherStageStatus): string {
  const labels: Record<PublisherStageStatus, string> = {
    not_started: "Not Started",
    in_progress: "Publishing in Progress",
    pending_review: "Awaiting Publishing Approval",
    publisher_approved: "Publishing Approved",
    completed: "Published",
  };
  return labels[status] || status;
}

/**
 * Generates a notification when a social post status changes
 */
export function socialPostStatusChangedNotification(
  postTitle: string,
  previousStatus: SocialPostStatus | null,
  newStatus: SocialPostStatus,
  actorName: string | null,
  postId: string
): NotificationInput {
  const nextActor = getNextActor(newStatus);
  const nextActorLabel =
    nextActor === "none"
      ? "No next actor"
      : nextActor === "admin"
        ? "Admin"
        : "Social Editor";

  return {
    type: "stage_changed",
    title: `Social Post Update: ${postTitle}`,
    message: `${SOCIAL_POST_STATUS_LABELS[newStatus]}${actorName ? ` by ${actorName}` : ""} • Next: ${nextActorLabel}`,
    href: `/social-posts/${postId}`,
    timestamp: Date.now(),
  };
}

/**
 * Generates a reminder notification for awaiting live link social posts
 */
export function socialPostAwaitingLiveLinkReminderNotification(
  postTitle: string,
  postId: string
): NotificationInput {
  return {
    type: "awaiting_action",
    title: "Live Link Needed",
    message: `${postTitle} is awaiting at least one live social link.`,
    href: `/social-posts/${postId}`,
    timestamp: Date.now(),
  };
}
