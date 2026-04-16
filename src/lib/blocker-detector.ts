/**
 * Blocker Detector
 *
 * Pure deterministic function to detect blockers preventing workflow progression.
 * No external API calls, no side effects.
 *
 * Detects:
 * - Missing required fields
 * - Permission issues
 * - Ownership problems
 * - Invalid transitions
 * - Reviewer assignment issues
 */

export interface DetectorInput {
  entityType: "blog" | "social_post" | "idea";
  status: string;
  userRole: "writer" | "publisher" | "editor" | "admin";
  userIsOwner: boolean;
  userIsReviewer: boolean;
  fields: Record<string, boolean>; // field name -> is present
  requiredFieldsForStatus: string[]; // required fields for current status
  nextAllowedStages: string[]; // valid next statuses
}

export interface Blocker {
  type: "missing_field" | "permission" | "ownership" | "invalid_transition" | "reviewer_assignment";
  field?: string;
  message?: string;
  severity: "critical" | "warning";
}

export interface BlockerResult {
  blockers: Blocker[];
  canProceedToNextStage: boolean;
}

/**
 * Detects all blockers preventing workflow progression.
 * Returns critical blockers (prevent transition) and warnings (informational).
 */
export function detectBlockers(input: DetectorInput): BlockerResult {
  const blockers: Blocker[] = [];

  // 1. Check for missing required fields
  detectMissingFields(input, blockers);

  // 2. Check permission issues
  detectPermissionIssues(input, blockers);

  // 3. Check ownership
  detectOwnershipIssues(input, blockers);

  // 4. Check if transition is valid
  detectInvalidTransitions(input, blockers);

  // 5. Check reviewer assignment
  detectReviewerIssues(input, blockers);

  // Can proceed only if no critical blockers exist
  const criticalBlockers = blockers.filter((b) => b.severity === "critical");
  const canProceed = criticalBlockers.length === 0 && input.nextAllowedStages.length > 0;

  return {
    blockers,
    canProceedToNextStage: canProceed
  };
}

/**
 * Detects missing required fields for current status.
 */
function detectMissingFields(input: DetectorInput, blockers: Blocker[]): void {
  for (const field of input.requiredFieldsForStatus) {
    if (!input.fields[field]) {
      blockers.push({
        type: "missing_field",
        field,
        message: `${field} is required`,
        severity: "critical"
      });
    }
  }
}

/**
 * Detects permission-related blockers.
 * - Admin always allowed
 * - Non-admin reviewer role required for review stages
 */
function detectPermissionIssues(input: DetectorInput, blockers: Blocker[]): void {
  // Admin bypass
  if (input.userRole === "admin") {
    return;
  }

  // Check if status requires reviewer role but user is not reviewer
  const reviewStages = ["writer_review", "publisher_review", "in_review"];
  if (reviewStages.includes(input.status) && !input.userIsReviewer) {
    blockers.push({
      type: "permission",
      message: "You are not assigned as reviewer for this stage",
      severity: "warning"
    });
  }
}

/**
 * Detects ownership blockers.
 * - Owner can always edit their own content
 * - Non-owner (non-admin) cannot edit
 */
function detectOwnershipIssues(input: DetectorInput, blockers: Blocker[]): void {
  // Admin bypass
  if (input.userRole === "admin") {
    return;
  }

  // In execution stages, owner is critical
  if (!input.userIsOwner) {
    blockers.push({
      type: "ownership",
      message: "You are not the owner of this content",
      severity: "critical"
    });
  }
}

/**
 * Detects invalid transition attempts.
 * If no next allowed stages, cannot proceed.
 */
function detectInvalidTransitions(input: DetectorInput, blockers: Blocker[]): void {
  if (input.nextAllowedStages.length === 0) {
    blockers.push({
      type: "invalid_transition",
      message: "This record is already at the final stage.",
      severity: "critical"
    });
  }
}

/**
 * Detects reviewer assignment issues.
 * Warning if user is not assigned as reviewer but content requires review.
 */
function detectReviewerIssues(input: DetectorInput, blockers: Blocker[]): void {
  // Only warn, don't block
  const executionStages = ["draft", "in_review", "creative_approved", "ready_to_publish", "awaiting_live_link"];
  if (executionStages.includes(input.status) && !input.userIsReviewer && input.userRole !== "admin") {
    // Only add if no existing reviewer warning already added
    const hasReviewerWarning = blockers.some((b) => b.type === "reviewer_assignment");
    if (!hasReviewerWarning) {
      blockers.push({
        type: "reviewer_assignment",
        message: "Reviewer assignment pending",
        severity: "warning"
      });
    }
  }
}
