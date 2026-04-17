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
    // Writer/publisher pipeline sub-statuses (referenced in definitional Q&A).
    in_progress: "In Progress",
    pending_review: "Awaiting Editorial Review",
    needs_revision: "Needs Revision",
    publisher_approved: "Approved for Publishing",
  });

/**
 * One-sentence descriptions for each canonical status, injected into the
 * Gemini system prompt so the assistant can answer "what does X mean?"
 * definitional questions from a grounded source.
 */
export const CANONICAL_STATUS_DESCRIPTIONS: Readonly<Record<string, string>> =
  Object.freeze({
    // Blog lifecycle
    writing: "The writer is drafting the blog in the Google Doc.",
    ready: "Writing is approved; the blog is ready for the publisher to take over.",
    publishing:
      "The publisher is formatting, scheduling, and preparing to go live.",
    published: "The blog is live on the site; the workflow is complete.",
    // Writer pipeline sub-statuses
    in_progress: "The current owner is actively working on this item.",
    pending_review:
      "The writer has submitted their draft and is waiting on editorial review.",
    needs_revision:
      "The editor reviewed the draft and requested revisions; the writer needs to address feedback and resubmit.",
    // Publisher pipeline sub-statuses
    publisher_approved:
      "The publisher\u2019s work has been approved and the blog is queued to go live.",
    // Social post statuses
    draft:
      "The creator is setting up the post; product, type, and Canva link are required to submit for review.",
    in_review:
      "The creator submitted the post and is waiting on the editor to approve or request changes.",
    changes_requested:
      "The editor asked for revisions; the creator needs to apply them and resubmit.",
    creative_approved:
      "The creative is approved; the editor now adds caption, platforms, and schedule.",
    ready_to_publish:
      "All fields are set; the creator publishes and will add the live link(s) afterwards.",
    awaiting_live_link:
      "The post has been published externally; the creator needs to paste the live URL(s) to close the loop.",
    // Shared
    completed: "The item has finished its workflow successfully.",
    not_started: "No one has begun work yet.",
    idea: "A topic that hasn\u2019t been converted into a blog or social post yet.",
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

/**
 * Format the status descriptions as a dense reference the system prompt
 * can inject so Gemini can answer definitional questions from a grounded
 * source instead of the current record\u2019s snapshot.
 */
export function buildCanonicalStatusDescriptionsText(): string {
  return Object.entries(CANONICAL_STATUS_DESCRIPTIONS)
    .map(([key, description]) => {
      const label = CANONICAL_STATUS_LABELS[key] ?? key;
      return `"${label}": ${description}`;
    })
    .join(" | ");
}
