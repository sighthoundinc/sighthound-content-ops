/**
 * Canonical UI vocabulary for the app.
 *
 * Single source of truth for user-visible labels. Consumers MUST import from
 * this module rather than hard-coding display strings.
 *
 * Rules (also codified in AGENTS.md "Global Vocabulary Contract"):
 * - Product name is "Sighthound Content Relay" (full form) or "Content Relay"
 *   (short form where space/context is tight, e.g. header subtitle, breadcrumbs).
 * - Pipelines, stages, statuses, section titles, and filter groups use the
 *   pipeline noun form: "Writing" / "Publishing".
 * - The role-noun words "Writer" / "Publisher" appear ONLY where the label
 *   points to a specific user performing that role (for example a filter
 *   pill whose value is a user name).
 * - "Worker" is legacy and must not appear in UI copy; use "Assigned to".
 * - The record-level history section is always called "Assignment & Changes";
 *   the notifications popover heading uses the same label.
 */

export const UI_VOCAB = {
  product: {
    full: "Sighthound Content Relay",
    short: "Content Relay",
    brand: "Sighthound",
  },
  pipelines: {
    writing: "Writing",
    publishing: "Publishing",
  },
  roles: {
    // Role nouns - used only when the label refers to a specific user.
    writer: "Writer",
    publisher: "Publisher",
    reviewer: "Reviewer",
    assignedTo: "Assigned to",
  },
  sections: {
    comments: "Comments",
    links: "Links",
    assignmentChanges: "Assignment & Changes",
    currentSnapshot: "Current Snapshot",
    checklist: "Checklist",
    writingWorkflow: "Writing Workflow",
    publishingWorkflow: "Publishing Workflow",
    notificationsPanel: "Assignment & Changes",
  },
  filterConcepts: {
    // Pill concept labels: "{Concept}: {value}".
    // Use role nouns when the value is a user name, pipeline nouns for states.
    writer: "Writer",
    publisher: "Publisher",
    writingStatus: "Writing Status",
    publishingStatus: "Publishing Status",
    stage: "Stage",
    site: "Site",
    type: "Type",
    assignedTo: "Assigned to",
    delivery: "Delivery",
    socialStatus: "Social Status",
    socialProduct: "Social Product",
  },
  sidebarFilters: {
    writingFilters: "Writing Filters",
    publishingFilters: "Publishing Filters",
  },
  comments: {
    placeholder: "Add context or feedback…",
    emptyState: "No comments yet. Add context to keep handoffs clear.",
    addButton: "Add Comment",
    addingButton: "Adding…",
  },
} as const;

/**
 * Strings that must never appear in UI copy under src/app or src/components.
 * Consumed by the no-forbidden-strings regression test.
 */
export const UI_VOCAB_FORBIDDEN_SUBSTRINGS: readonly string[] = [
  "Sighthound Content Ops",
  "Content Ops Dashboard",
  "Writing Assignee",
  "Publishing Assignee",
] as const;

/**
 * Strings that are explicitly allowed even though they match related patterns.
 * Used by the test harness to avoid false positives when asserting the above
 * forbidden list.
 */
export const UI_VOCAB_ALLOWED_SUBSTRINGS: readonly string[] = [
  "Writer:",
  "Publisher:",
  "Writing Status",
  "Publishing Status",
  "Writing Filters",
  "Publishing Filters",
  "Writing Workflow",
  "Publishing Workflow",
] as const;
