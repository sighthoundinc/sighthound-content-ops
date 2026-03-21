/**
 * Notification helper utilities for workflow state transitions.
 *
 * These functions generate notification payloads for events like:
 * - Blog status changes (writer/publisher stages)
 * - Task assignments and status changes
 * - Approval/revision workflows
 */

import type { NotificationInput } from "@/providers/notifications-provider";
import type { PublisherStageStatus, WriterStageStatus } from "@/lib/types";

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
