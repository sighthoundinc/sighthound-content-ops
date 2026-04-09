/**
 * Social Post Workflow Authority
 *
 * This module defines the canonical transition matrix and assignment logic
 * for the social post workflow. All workflow enforcement code depends on
 * these definitions—do NOT scatter transition or assignment logic elsewhere.
 *
 * Single source of truth:
 * - TRANSITION_GRAPH: allowed status transitions
 * - getNextAssignment(): derives owner for each status
 * - isBackwardTransition(): detects execution-stage rollbacks
 */

export type SocialPostStatus =
  | "draft"
  | "in_review"
  | "changes_requested"
  | "creative_approved"
  | "ready_to_publish"
  | "awaiting_live_link"
  | "published";

/**
 * Canonical transition matrix
 * If nextStatus is not in TRANSITION_GRAPH[currentStatus], the transition is invalid
 */
export const TRANSITION_GRAPH: Record<SocialPostStatus, SocialPostStatus[]> = {
  draft: ["in_review"],
  in_review: ["creative_approved", "changes_requested"],
  changes_requested: ["in_review"],
  creative_approved: ["ready_to_publish"],
  ready_to_publish: ["awaiting_live_link", "changes_requested"],
  awaiting_live_link: ["published", "changes_requested"],
  published: [], // terminal state
};

/**
 * Check if a transition is allowed
 */
export function isValidTransition(
  currentStatus: SocialPostStatus,
  nextStatus: SocialPostStatus
): boolean {
  return TRANSITION_GRAPH[currentStatus]?.includes(nextStatus) ?? false;
}

/**
 * Detect backward transitions (execution-stage rollbacks)
 * These require a reason to be provided
 */
export function isBackwardTransition(
  currentStatus: SocialPostStatus,
  nextStatus: SocialPostStatus
): boolean {
  // Only ready_to_publish and awaiting_live_link can roll back to changes_requested
  if (currentStatus === "ready_to_publish" && nextStatus === "changes_requested") {
    return true;
  }
  if (currentStatus === "awaiting_live_link" && nextStatus === "changes_requested") {
    return true;
  }
  return false;
}

/**
 * Derive the next owner for a given status transition
 *
 * Clean model:
 * - Worker executes: draft, changes_requested, ready_to_publish, awaiting_live_link
 * - Reviewer (always admin) approves: in_review, creative_approved
 *
 * @param nextStatus The target status after transition
 * @param workerId The user executing the work
 * @param reviewerId The admin reviewing and approving
 * @returns The user ID who should own this post in the next status, or null if terminal
 */
export function getNextAssignment(
  nextStatus: SocialPostStatus,
  workerId: string | null,
  reviewerId: string | null
): string | null {
  switch (nextStatus) {
    // Worker executes
    case "draft":
      return workerId || null;

    // Reviewer approves
    case "in_review":
      return reviewerId || null;

    // Worker revises
    case "changes_requested":
      return workerId || null;

    // Reviewer prepares
    case "creative_approved":
      return reviewerId || null;

    // Worker marks ready
    case "ready_to_publish":
      return workerId || null;

    // Worker awaits link
    case "awaiting_live_link":
      return workerId || null;

    // Terminal state: no owner
    case "published":
      return null;

    default:
      throw new Error(`Unknown status: ${nextStatus}`);
  }
}

/**
 * Returns the current stage owner for a social post status.
 * Worker executes: draft, changes_requested, ready_to_publish, awaiting_live_link
 * Reviewer acts: in_review, creative_approved
 * Published is terminal (no owner)
 */
export function getStatusActorId(
  status: SocialPostStatus,
  workerUserId: string | null,
  reviewerUserId: string | null
): string | null {
  switch (status) {
    case "draft":
    case "changes_requested":
    case "ready_to_publish":
    case "awaiting_live_link":
      return workerUserId;
    case "in_review":
    case "creative_approved":
      return reviewerUserId;
    case "published":
      return null;
    default:
      return null;
  }
}

export function canUserActOnStatus(options: {
  status: SocialPostStatus;
  workerUserId: string | null;
  reviewerUserId: string | null;
  userId: string | null;
  isAdmin: boolean;
}): boolean {
  if (options.isAdmin) {
    return true;
  }
  if (!options.userId) {
    return false;
  }
  const actorId = getStatusActorId(
    options.status,
    options.workerUserId,
    options.reviewerUserId
  );
  return Boolean(actorId && actorId === options.userId);
}

/**
 * Check if a status is an execution stage (brief fields are locked)
 */
export function isExecutionStage(status: SocialPostStatus): boolean {
  return status === "ready_to_publish" || status === "awaiting_live_link";
}

/**
 * Brief fields that are locked during execution stages
 */
export const LOCKED_BRIEF_FIELDS = [
  "title",
  "platforms",
  "product",
  "type",
  "canva_url",
  "canva_page",
] as const;
const LOCKED_BRIEF_FIELD_SET = new Set<string>(LOCKED_BRIEF_FIELDS);

/**
 * Check if a field is locked during execution
 */
export function isFieldLocked(
  field: string,
  status: SocialPostStatus
): boolean {
  return isExecutionStage(status) && LOCKED_BRIEF_FIELD_SET.has(field);
}

/**
 * Required fields for each transition checkpoint
 *
 * Workflow:
 * - draft → in_review: Worker needs Product, Type, Canva URL
 * - creative approval path requires Platforms, Caption, Scheduled Date
 * - handoff to execution keeps those requirements
 * - published: Plus at least one valid live link (checked separately)
 */
export const REQUIRED_FIELDS_FOR_STATUS: Record<
  SocialPostStatus,
  string[] | null
> = {
  draft: null, // Create stage
  in_review: ["product", "type", "canva_url"],
  changes_requested: null, // Revising, no new requirements
  creative_approved: [
    "product",
    "type",
    "canva_url",
    "platforms",
    "caption",
    "scheduled_date",
  ],
  ready_to_publish: [
    "product",
    "type",
    "canva_url",
    "platforms",
    "caption",
    "scheduled_date",
  ],
  awaiting_live_link: [
    "product",
    "type",
    "canva_url",
    "platforms",
    "caption",
    "scheduled_date",
  ],
  published: [
    "product",
    "type",
    "canva_url",
    "platforms",
    "caption",
    "scheduled_date",
  ], // Plus at least one live link (checked separately)
};

/**
 * Workflow status descriptions for UI labels
 */
export const STATUS_LABELS: Record<SocialPostStatus, string> = {
  draft: "Draft",
  in_review: "In Review",
  changes_requested: "Changes Requested",
  creative_approved: "Creative Approved",
  ready_to_publish: "Ready to Publish",
  awaiting_live_link: "Awaiting Live Link",
  published: "Published",
};

/**
 * Next action labels (what the assigned user should do)
 */
export const NEXT_ACTION_LABELS: Record<SocialPostStatus, string> = {
  draft: "Submit for Review",
  in_review: "Admin Review Needed",
  changes_requested: "Apply Changes",
  creative_approved: "Add Caption & Schedule",
  ready_to_publish: "Publish Post",
  awaiting_live_link: "Submit Link",
  published: "Done",
};
