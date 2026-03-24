import {
  PUBLISHER_STATUS_LABELS,
  SOCIAL_POST_PRODUCT_LABELS,
  SOCIAL_POST_STATUS_LABELS,
  SOCIAL_POST_TYPE_LABELS,
  STATUS_LABELS,
  WRITER_STATUS_LABELS,
} from "@/lib/status";
import { toTitleCase } from "@/lib/utils";

export type ActivityChangeEntry = {
  event_type: string;
  field_name: string | null;
  old_value: string | null;
  new_value: string | null;
};

export type ActivityFormatOptions = {
  userNameById?: Record<string, string>;
};

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const ASSIGNMENT_FIELDS = new Set([
  "writer_id",
  "publisher_id",
  "editor_user_id",
  "admin_owner_id",
  "created_by",
  "changed_by",
]);

const FIELD_LABEL_OVERRIDES: Record<string, string> = {
  writer_status: "Writing Stage",
  publisher_status: "Publishing Stage",
  overall_status: "Workflow Status",
  status: "Status",
  writer_id: "Writer Assignment",
  publisher_id: "Publisher Assignment",
  editor_user_id: "Editor Assignment",
  admin_owner_id: "Admin Assignment",
  google_doc_url: "Draft Link",
  live_url: "Live Link",
  canva_url: "Canva Link",
  title: "Title",
  type: "Type",
  product: "Product",
  scheduled_publish_date: "Scheduled Publish Date",
  display_published_date: "Published Date",
  scheduled_date: "Scheduled Date",
};

const EVENT_TITLE_OVERRIDES: Record<string, string> = {
  created: "Created",
  writer_completed: "Writing Approved",
  ready_to_publish: "Ready to Publish",
  published: "Published",
  assignment_changed: "Assignment Updated",
  status_updated: "Status Updated",
  link_updated: "Link Updated",
  blog_writer_status_changed: "Writing Stage Updated",
  blog_publisher_status_changed: "Publishing Stage Updated",
  blog_assignment_changed: "Assignment Updated",
  social_post_status_changed: "Status Updated",
  social_post_assignment_changed: "Assignment Updated",
  login: "Signed In",
  dashboard_visit: "Opened Dashboard",
};

const ACTIVITY_TYPE_LABELS: Record<string, string> = {
  login: "Signed In",
  dashboard_visit: "Opened Dashboard",
  blog_writer_status_changed: "Writing Stage Updated",
  blog_publisher_status_changed: "Publishing Stage Updated",
  blog_assignment_changed: "Blog Assignment Updated",
  social_post_status_changed: "Status Updated",
  social_post_assignment_changed: "Social Post Assignment Updated",
};

const ACTIVITY_TYPE_CATEGORIES: Record<string, string> = {
  login: "Access",
  dashboard_visit: "Access",
  blog_writer_status_changed: "Blog Activity",
  blog_publisher_status_changed: "Blog Activity",
  blog_assignment_changed: "Blog Activity",
  social_post_status_changed: "Social Post Activity",
  social_post_assignment_changed: "Social Post Activity",
};

function isValueEmpty(value: string | null | undefined) {
  if (value === null || value === undefined) {
    return true;
  }
  const trimmed = value.trim();
  return trimmed.length === 0 || trimmed === "—";
}

function toPrettyFallbackValue(value: string) {
  if (value.includes("_")) {
    return toTitleCase(value.replace(/_/g, " "));
  }
  return value;
}

function isAssignmentField(fieldName: string | null) {
  if (!fieldName) {
    return false;
  }
  return ASSIGNMENT_FIELDS.has(fieldName);
}

function resolveFieldLabel(fieldName: string | null, eventType: string) {
  if (fieldName && FIELD_LABEL_OVERRIDES[fieldName]) {
    return FIELD_LABEL_OVERRIDES[fieldName];
  }
  if (fieldName) {
    return toTitleCase(fieldName.replace(/_/g, " "));
  }
  if (eventType.includes("assignment")) {
    return "Assignment";
  }
  if (eventType.includes("status")) {
    return "Status";
  }
  if (eventType === "created") {
    return "Item";
  }
  return "Details";
}

function formatStatusValue(fieldName: string, value: string) {
  if (fieldName === "writer_status") {
    return WRITER_STATUS_LABELS[value as keyof typeof WRITER_STATUS_LABELS] ?? toPrettyFallbackValue(value);
  }
  if (fieldName === "publisher_status") {
    return (
      PUBLISHER_STATUS_LABELS[value as keyof typeof PUBLISHER_STATUS_LABELS] ??
      toPrettyFallbackValue(value)
    );
  }
  if (fieldName === "overall_status") {
    return STATUS_LABELS[value as keyof typeof STATUS_LABELS] ?? toPrettyFallbackValue(value);
  }
  if (fieldName === "status") {
    return (
      SOCIAL_POST_STATUS_LABELS[value as keyof typeof SOCIAL_POST_STATUS_LABELS] ??
      toPrettyFallbackValue(value)
    );
  }
  return null;
}

function formatFieldValue(
  fieldName: string | null,
  value: string | null,
  options: ActivityFormatOptions
) {
  if (isValueEmpty(value)) {
    return isAssignmentField(fieldName) ? "Unassigned" : "Not set";
  }

  const rawValue = String(value).trim();

  if (fieldName === "type") {
    return SOCIAL_POST_TYPE_LABELS[rawValue as keyof typeof SOCIAL_POST_TYPE_LABELS] ?? toPrettyFallbackValue(rawValue);
  }

  if (fieldName === "product") {
    return (
      SOCIAL_POST_PRODUCT_LABELS[rawValue as keyof typeof SOCIAL_POST_PRODUCT_LABELS] ??
      toPrettyFallbackValue(rawValue)
    );
  }

  if (fieldName) {
    const statusValue = formatStatusValue(fieldName, rawValue);
    if (statusValue) {
      return statusValue;
    }
  }

  if (isAssignmentField(fieldName)) {
    const name = options.userNameById?.[rawValue];
    if (name) {
      return name;
    }
    if (UUID_PATTERN.test(rawValue)) {
      return "Team member";
    }
  }

  if (rawValue === "true") {
    return "Yes";
  }
  if (rawValue === "false") {
    return "No";
  }

  return toPrettyFallbackValue(rawValue);
}

function normalizeEventType(eventType: string) {
  return eventType.trim().toLowerCase();
}

export function formatActivityEventTitle(entry: ActivityChangeEntry) {
  const normalizedEventType = normalizeEventType(entry.event_type);
  const explicitTitle = EVENT_TITLE_OVERRIDES[normalizedEventType];
  if (explicitTitle) {
    return explicitTitle;
  }
  if (isAssignmentField(entry.field_name)) {
    return "Assignment Updated";
  }
  if ((entry.field_name ?? "").includes("status")) {
    return "Status Updated";
  }
  if ((entry.field_name ?? "").includes("url")) {
    return "Link Updated";
  }
  if (normalizedEventType.includes("status")) {
    return "Status Updated";
  }
  if (normalizedEventType.includes("assignment")) {
    return "Assignment Updated";
  }
  return toTitleCase(normalizedEventType.replace(/_/g, " "));
}

export function formatActivityChangeDescription(
  entry: ActivityChangeEntry,
  options: ActivityFormatOptions = {}
) {
  const normalizedEventType = normalizeEventType(entry.event_type);
  const fieldLabel = resolveFieldLabel(entry.field_name, normalizedEventType);
  const oldEmpty = isValueEmpty(entry.old_value);
  const newEmpty = isValueEmpty(entry.new_value);
  const oldValue = formatFieldValue(entry.field_name, entry.old_value, options);
  const newValue = formatFieldValue(entry.field_name, entry.new_value, options);

  if (normalizedEventType === "created") {
    if (newEmpty) {
      return "New item created";
    }
    return `${fieldLabel}: ${newValue}`;
  }

  if (isAssignmentField(entry.field_name)) {
    if (oldEmpty && !newEmpty) {
      return `${fieldLabel}: Assigned to ${newValue}`;
    }
    if (!oldEmpty && newEmpty) {
      return `${fieldLabel}: Unassigned`;
    }
    if (entry.old_value !== entry.new_value) {
      if (oldValue === "Team member" && newValue === "Team member") {
        return `${fieldLabel}: Reassigned`;
      }
      return `${fieldLabel}: ${oldValue} → ${newValue}`;
    }
    return `${fieldLabel}: ${newValue}`;
  }

  if (oldEmpty && !newEmpty) {
    return `${fieldLabel}: ${newValue}`;
  }
  if (!oldEmpty && newEmpty) {
    return `${fieldLabel}: Cleared`;
  }
  if (oldEmpty && newEmpty) {
    return null;
  }
  return `${fieldLabel}: ${oldValue} → ${newValue}`;
}

export function getActivityTypeLabel(activityType: string) {
  const normalizedType = normalizeEventType(activityType);
  return (
    ACTIVITY_TYPE_LABELS[normalizedType] ??
    toTitleCase(normalizedType.replace(/_/g, " "))
  );
}

export function getActivityTypeCategory(activityType: string) {
  const normalizedType = normalizeEventType(activityType);
  return ACTIVITY_TYPE_CATEGORIES[normalizedType] ?? "Activity";
}
