/**
 * Canonical status & field labels for Ask AI.
 *
 * Single source of truth that the Gemini system prompt and the output
 * validator both consume, so labels stay in lock-step with `src/lib/status.ts`
 * and the product rules (e.g. "Awaiting Editorial Review", "Approved for
 * Publishing", "Ready").
 *
 * We re-export here (instead of pulling from status.ts directly into the
 * Gemini layer) because the assistant uses a UI-friendly dialect that diverges
 * slightly from the raw writer/publisher pipeline labels.
 */

export const CANONICAL_STATUS_LABELS: Readonly<Record<string, string>> =
  Object.freeze({
    // Unified blog lifecycle
    writing: "Writing",
    ready: "Ready for Publishing",
    publishing: "Publishing",
    published: "Published",
    // Social post canonical statuses
    draft: "Draft",
    in_review: "In Review",
    changes_requested: "Changes Requested",
    creative_approved: "Creative Approved",
    ready_to_publish: "Ready",
    awaiting_live_link: "Awaiting Live Link",
    // Shared
    completed: "Completed",
    not_started: "Not Started",
    idea: "Idea",
  });

/**
 * Raw enum keys that must NEVER appear verbatim in Gemini output.
 * The validator greps for these as whole words and rejects any match.
 */
export const BANNED_RAW_ENUMS: readonly string[] = Object.freeze([
  "ready_to_publish",
  "creative_approved",
  "changes_requested",
  "awaiting_live_link",
  "publisher_approved",
  "needs_revision",
  "canva_url",
  "canva_page",
  "google_doc_url",
  "writer_id",
  "publisher_id",
  "reviewer_user_id",
  "worker_user_id",
  "assigned_to_user_id",
  "scheduled_publish_date",
  "associated_blog_id",
  "converted_blog_id",
]);

/**
 * Phrases that indicate the assistant has drifted into content generation
 * (which is strictly out of scope — the assistant is advisory-only).
 */
export const CONTENT_GENERATION_SIGNALS: readonly string[] = Object.freeze([
  "here's a caption",
  "here is a caption",
  "try this caption",
  "draft caption:",
  "suggested caption:",
  "here's a draft",
  "here is a draft",
  "suggested title:",
  "here's a title",
  "here is a title",
  "i've written",
  "i have written",
  "i wrote",
  "here's some copy",
  "here is some copy",
  "try this copy",
  "draft copy:",
  "here's a headline",
  "here is a headline",
  "suggested tweet",
  "suggested post",
  "here's the tweet",
  "here is the tweet",
]);

/**
 * Format a canonical allow-list for the system prompt. Gemini should only
 * use values that appear in this mapping when referring to a status.
 */
export function buildCanonicalStatusAllowListText(): string {
  return Object.entries(CANONICAL_STATUS_LABELS)
    .map(([key, label]) => `${key} = "${label}"`)
    .join("; ");
}
