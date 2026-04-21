/**
 * Humanize helpers for Ask AI prose output.
 *
 * Deterministic data (statuses, field keys) is authoritative, but user-facing
 * text must render in natural, title-cased language without leaking enum keys.
 */

import { formatDateInTimezone } from "@/lib/format-date";
import { formatDateOnly } from "@/lib/utils";

const STATUS_LABELS: Record<string, string> = {
  // Unified blog stages (see src/lib/status.ts#getWorkflowStage)
  writing: "Writing",
  ready: "Ready for Publishing",
  publishing: "Publishing",
  // Social post stages
  draft: "Draft",
  in_review: "In Review",
  changes_requested: "Changes Requested",
  creative_approved: "Creative Approved",
  ready_to_publish: "Ready to Publish",
  awaiting_live_link: "Awaiting Live Link",
  published: "Published",
  // Shared / fallback values
  completed: "Completed",
  not_started: "Not Started",
  idea: "Idea",
};

const FIELD_LABELS: Record<string, string> = {
  title: "title",
  writer_id: "writer assignment",
  draft_doc_link: "Google Doc link",
  google_doc_url: "Google Doc link",
  publisher_id: "publisher assignment",
  scheduled_publish_date: "scheduled publish date",
  product: "product",
  type: "type",
  canva_url: "Canva link",
  canva_page: "Canva page",
  caption: "caption",
  platforms: "platforms",
  associated_blog_id: "associated blog",
  live_link: "live link",
  site: "site",
  description: "description",
  converted_blog_id: "converted blog",
};

function titleCase(value: string): string {
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

/**
 * Humanize a workflow status into a display label.
 * Falls back to title case when an explicit mapping is missing.
 */
export function humanizeStatus(value: string | undefined | null): string {
  if (!value) return "this stage";
  return STATUS_LABELS[value] || titleCase(value);
}

/**
 * Humanize a field name into a friendly noun phrase.
 * Falls back to spaced lowercase when no explicit mapping exists.
 */
export function humanizeField(value: string | undefined | null): string {
  if (!value) return "";
  return FIELD_LABELS[value] || value.replace(/_/g, " ");
}

/**
 * Humanize a list of field names, joined as a natural list (`a, b, and c`).
 */
export function humanizeFieldList(values: string[]): string {
  const cleaned = values
    .map((value) => humanizeField(value))
    .filter((value) => value.length > 0);

  if (cleaned.length === 0) return "";
  if (cleaned.length === 1) return cleaned[0];
  if (cleaned.length === 2) return `${cleaned[0]} and ${cleaned[1]}`;
  return `${cleaned.slice(0, -1).join(", ")}, and ${cleaned[cleaned.length - 1]}`;
}

const DEFAULT_TZ = "America/New_York";
const HUMANIZE_DATE_PATTERN = "MMM d, yyyy";

/**
 * Humanize an ISO timestamp or date-only string into a friendly
 * month-day-year label.
 *
 * Routes through the centralized date formatters per AGENTS.md §4/§8:
 * - Pure `YYYY-MM-DD` strings use `formatDateOnly` (no timezone conversion
 *   to avoid day-shift bugs in behind-UTC timezones).
 * - Full ISO timestamps use `formatDateInTimezone`, which renders in the
 *   caller-provided timezone (from `ExtractedContext.userTimezone` ->
 *   `profiles.timezone`) and falls back to `America/New_York` when missing
 *   or invalid.
 */
export function humanizeDateOnly(
  value?: string | null,
  timezone?: string | null
): string {
  if (!value) return "an unknown date";

  const pureDateOnlyMatch = /^\d{4}-\d{2}-\d{2}$/.test(value);
  if (pureDateOnlyMatch) {
    const label = formatDateOnly(value);
    return label || "an unknown date";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "an unknown date";
  }

  const effectiveTz = timezone && timezone.trim().length > 0 ? timezone : DEFAULT_TZ;
  const label =
    formatDateInTimezone(value, effectiveTz, HUMANIZE_DATE_PATTERN) ||
    formatDateInTimezone(value, DEFAULT_TZ, HUMANIZE_DATE_PATTERN);
  return label || "an unknown date";
}

/**
 * Humanize a day count into a friendly duration string.
 */
export function humanizeDuration(days?: number | null): string {
  if (days === undefined || days === null) return "an unknown amount of time";
  if (days <= 0) return "less than a day";
  if (days === 1) return "1 day";
  return `${days} days`;
}
