/**
 * Converts blog assignment history records to notification-like items for the bell drawer.
 * Parses event_type, metadata, and field changes to create human-readable activity summaries.
 */

import type { BlogHistoryRecord } from "@/lib/types";

export interface ActivityNotificationItem {
  id: string;
  title: string;
  message: string;
  timestamp: number;
  href: string | null;
  category: "writer" | "publisher" | "editor" | "assignment" | "metadata";
}

/**
 * Maps blog event types to human-readable categories and titles
 */
function getActivityCategory(
  eventType: string,
  fieldName?: string | null
): ActivityNotificationItem["category"] {
  if (eventType.includes("writer")) {
    return "writer";
  }
  if (eventType.includes("publisher")) {
    return "publisher";
  }
  if (eventType.includes("editor")) {
    return "editor";
  }
  if (
    fieldName?.includes("writer") ||
    fieldName?.includes("publisher")
  ) {
    return "assignment";
  }
  return "metadata";
}

/**
 * Format a field name for display (e.g., "writer_status" => "Writer Status")
 */
function formatFieldName(field: string | null): string {
  if (!field) return "Content";
  return field
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/**
 * Converts a blog assignment history record to a notification-like item
 */
export function historyRecordToActivityNotification(
  record: BlogHistoryRecord,
  blogTitle: string,
  blogId: string,
  changedByName?: string | null
): ActivityNotificationItem {
  const category = getActivityCategory(record.event_type, record.field_name);
  const fieldLabel = formatFieldName(record.field_name);
  const actor = changedByName || "Someone";

  // Build message based on event type
  let title = "Activity";
  let message = `${actor} updated ${blogTitle}`;

  if (record.event_type.includes("writer_status")) {
    title = "Writer Status Changed";
    message = `${actor} changed writer status from ${formatStatusLabel(
      record.old_value
    )} to ${formatStatusLabel(record.new_value)}`;
  } else if (record.event_type.includes("publisher_status")) {
    title = "Publisher Status Changed";
    message = `${actor} changed publisher status from ${formatStatusLabel(
      record.old_value
    )} to ${formatStatusLabel(record.new_value)}`;
  } else if (record.field_name?.includes("writer_id")) {
    title = "Writer Assigned";
    message = `${actor} assigned writer: ${record.new_value || "unassigned"}`;
  } else if (record.field_name?.includes("publisher_id")) {
    title = "Publisher Assigned";
    message = `${actor} assigned publisher: ${record.new_value || "unassigned"}`;
  } else if (record.field_name) {
    title = `${fieldLabel} Updated`;
    message = `${actor} changed ${fieldLabel.toLowerCase()} to ${record.new_value || "(empty)"}`;
  }

  return {
    id: record.id,
    title,
    message,
    timestamp: new Date(record.changed_at).getTime(),
    href: `/blogs/${blogId}`,
    category,
  };
}

/**
 * Batch convert multiple history records to activity notifications
 */
export function historyRecordsToActivityNotifications(
  records: BlogHistoryRecord[],
  blogTitle: string,
  blogId: string,
  userMap: Record<string, string>
): ActivityNotificationItem[] {
  return records.map((record) =>
    historyRecordToActivityNotification(
      record,
      blogTitle,
      blogId,
      record.changed_by ? userMap[record.changed_by] : null
    )
  );
}

/**
 * Format status values for display
 */
function formatStatusLabel(status: string | null): string {
  if (!status) return "(empty)";
  const labels: Record<string, string> = {
    not_started: "Not Started",
    in_progress: "In Progress",
    pending_review: "Pending Review",
    needs_revision: "Needs Revision",
    completed: "Completed",
    publishing_in_progress: "Publishing in Progress",
    publisher_approved: "Publisher Approved",
  };
  return labels[status] || status;
}
