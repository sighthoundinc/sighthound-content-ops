// IMPORTANT:
// This file is the single source of truth for all task/status logic.
// Do NOT duplicate status arrays anywhere else in the app.
// All DB queries filtering by social/writer/publisher status MUST reference
// the ACTIVE_* arrays defined here. All dashboard summary init objects MUST
// use the initialXxxCounts() helpers defined here.

/**
 * Single source of truth for task/assignment logic across all surfaces.
 *
 * Used by:
 * - src/app/page.tsx (home / work buckets)
 * - src/app/tasks/page.tsx
 * - src/app/api/dashboard/summary/route.ts
 * - src/app/api/dashboard/tasks-snapshot/route.ts
 */

import type {
  PublisherStageStatus,
  SocialPostStatus,
  WriterStageStatus,
} from "@/lib/types";

// ---------------------------------------------------------------------------
// Active status sets — the complete list of non-terminal statuses that
// represent in-flight work. "published" is intentionally excluded from both.
// ---------------------------------------------------------------------------

export const ACTIVE_SOCIAL_STATUSES: SocialPostStatus[] = [
  "draft",
  "changes_requested",
  "in_review",
  "creative_approved",
  "ready_to_publish",
  "awaiting_live_link",
];

/** Writer stage statuses that represent active (non-terminal) work. */
export const ACTIVE_WRITER_STATUSES: WriterStageStatus[] = [
  "not_started",
  "in_progress",
  "pending_review",
  "needs_revision",
  // "completed" is terminal for the writer stage — excluded intentionally
];

/** Publisher stage statuses that represent active (non-terminal) work. */
export const ACTIVE_PUBLISHER_STATUSES: PublisherStageStatus[] = [
  "not_started",
  "in_progress",
  "pending_review",
  "publisher_approved",
  // "completed" is terminal for the publisher stage — excluded intentionally
];

// ---------------------------------------------------------------------------
// Summary count keys
// These mirror the keys used in the DashboardSummary response object so that
// the summary API init object can be derived from these arrays.
// ---------------------------------------------------------------------------

/** Initial count record for social post statuses shown on the dashboard. */
export function initialSocialPostCounts(): Record<SocialPostStatus | string, number> {
  return Object.fromEntries(ACTIVE_SOCIAL_STATUSES.map((s) => [s, 0]));
}

/** Initial count record for writer statuses shown on the dashboard. */
export function initialWriterCounts(): Record<WriterStageStatus | string, number> {
  return Object.fromEntries(ACTIVE_WRITER_STATUSES.map((s) => [s, 0]));
}

/** Initial count record for publisher statuses shown on the dashboard. */
export function initialPublisherCounts(): Record<PublisherStageStatus | string, number> {
  return Object.fromEntries(ACTIVE_PUBLISHER_STATUSES.map((s) => [s, 0]));
}

// ---------------------------------------------------------------------------
// Assignment ownership helpers
// ---------------------------------------------------------------------------

/**
 * Returns true if the social post is an active task for the given user.
 *
 * "Active" means the post has a non-terminal status AND the user has any
 * ownership stake in it (worker, reviewer, creator, legacy fields, or admin).
 */
export function isSocialTaskForUser(
  post: {
    status: SocialPostStatus;
    worker_user_id: string | null;
    reviewer_user_id: string | null;
    created_by: string;
    assigned_to_user_id?: string | null;
    editor_user_id?: string | null;
    admin_owner_id?: string | null;
  },
  userId: string,
  isAdmin: boolean
): boolean {
  if (!ACTIVE_SOCIAL_STATUSES.includes(post.status)) {
    return false;
  }
  return (
    post.worker_user_id === userId ||
    post.reviewer_user_id === userId ||
    post.created_by === userId ||
    (post.assigned_to_user_id != null && post.assigned_to_user_id === userId) ||
    (post.editor_user_id != null && post.editor_user_id === userId) ||
    (post.admin_owner_id != null && post.admin_owner_id === userId) ||
    isAdmin
  );
}

/**
 * Returns true if the blog is an active task for the given user.
 *
 * "Active" means overall_status is not published/archived AND the user is
 * assigned as writer, publisher, or is an admin.
 *
 * Note: admin assignment tasks (task_assignments table) are handled
 * separately at the call site — this only covers direct assignment.
 */
export function isBlogTaskForUser(
  blog: {
    overall_status: string;
    is_archived: boolean;
    writer_id: string | null;
    publisher_id: string | null;
  },
  userId: string,
  isAdmin: boolean
): boolean {
  if (blog.overall_status === "published" || blog.is_archived) {
    return false;
  }
  return blog.writer_id === userId || blog.publisher_id === userId || isAdmin;
}

// ---------------------------------------------------------------------------
// Build-time / request-time status assertion
// ---------------------------------------------------------------------------

// All known status values per type, including terminal ones.
// assertValidStatus checks against these — not just the ACTIVE_* subsets —
// so that terminal values like "completed" or "published" are allowed through
// while truly unknown values (e.g. a new migration added "scheduled") are caught.
const ALL_KNOWN_STATUSES: Record<"social" | "writer" | "publisher", Set<string>> = {
  social: new Set<string>([
    ...ACTIVE_SOCIAL_STATUSES,
    "published", // terminal
  ]),
  writer: new Set<string>([
    ...ACTIVE_WRITER_STATUSES,
    "completed", // terminal
  ]),
  publisher: new Set<string>([
    ...ACTIVE_PUBLISHER_STATUSES,
    "completed", // terminal
  ]),
};

/**
 * Asserts that `status` is a known value for the given status type.
 *
 * Covers both active (in-flight) and terminal statuses. Throws if a value
 * arrives from the DB that is not recognised at all — indicating a schema
 * migration added a new status without updating task-logic.ts.
 *
 * - In development: throws an Error immediately so the mismatch surfaces
 *   during local dev or CI before reaching production.
 * - In production: silently returns to avoid crashing live requests.
 *
 * Example error:
 *   Error: [task-logic] Unknown social status "scheduled" — not in known social statuses.
 *          Add it to task-logic.ts (ACTIVE_SOCIAL_STATUSES or terminal list).
 */
export function assertValidStatus(
  status: string,
  type: "social" | "writer" | "publisher"
): void {
  if (ALL_KNOWN_STATUSES[type].has(status)) {
    return;
  }
  const message =
    `[task-logic] Unknown ${type} status "${status}" — not in known ${type} statuses. ` +
    `Add it to task-logic.ts (ACTIVE_${type.toUpperCase()}_STATUSES or terminal list).`;
  if (process.env.NODE_ENV !== "production") {
    throw new Error(message);
  }
}

// ---------------------------------------------------------------------------
// Dev-only consistency safeguard
// ---------------------------------------------------------------------------

/**
 * Validates that every status key present in the dashboard summary count
 * objects and every bucket ID derived from those statuses is consistent with
 * the ACTIVE_* arrays defined in this file.
 *
 * Call once on app mount (client-side, dev only). Logs a console warning for
 * any mismatch so drift is caught before it reaches production.
 *
 * @param summaryCountKeys - keys from writerCounts, publisherCounts, socialPostCounts
 * @param bucketIds - all work bucket IDs rendered on the home page
 */
export function validateTaskLogicConsistency(
  summaryCountKeys: {
    writerCounts: string[];
    publisherCounts: string[];
    socialPostCounts: string[];
  },
  bucketIds: string[]
): void {
  if (process.env.NODE_ENV !== "development") {
    return;
  }

  const expectedWriterKeys = new Set<string>(ACTIVE_WRITER_STATUSES);
  const expectedPublisherKeys = new Set<string>(ACTIVE_PUBLISHER_STATUSES);
  const expectedSocialKeys = new Set<string>(ACTIVE_SOCIAL_STATUSES);

  // Check summary count keys match ACTIVE_* arrays
  for (const key of summaryCountKeys.writerCounts) {
    if (!expectedWriterKeys.has(key)) {
      console.warn(
        `[task-logic] Task logic mismatch detected: writer count key "${key}" is not in ACTIVE_WRITER_STATUSES`
      );
    }
  }
  for (const key of summaryCountKeys.publisherCounts) {
    if (!expectedPublisherKeys.has(key)) {
      console.warn(
        `[task-logic] Task logic mismatch detected: publisher count key "${key}" is not in ACTIVE_PUBLISHER_STATUSES`
      );
    }
  }
  for (const key of summaryCountKeys.socialPostCounts) {
    if (!expectedSocialKeys.has(key)) {
      console.warn(
        `[task-logic] Task logic mismatch detected: social count key "${key}" is not in ACTIVE_SOCIAL_STATUSES`
      );
    }
  }

  // Check that every social bucket ID maps back to a known active status
  const expectedSocialBucketIds = new Set(
    ACTIVE_SOCIAL_STATUSES.map((s) => `social-${s.replace(/_/g, "-")}`)
  );
  const expectedWriterBucketIds = new Set(
    ACTIVE_WRITER_STATUSES.map((s) => `writer-${s.replace(/_/g, "-")}`)
  );
  const expectedPublisherBucketIds = new Set(
    ACTIVE_PUBLISHER_STATUSES.map((s) => `publisher-${s.replace(/_/g, "-")}`)
  );
  // publisher_approved → "publisher-publisher-approved" under the pattern, but
  // the home page uses "publisher-approved" intentionally. Allow both.
  expectedPublisherBucketIds.add("publisher-approved");

  for (const id of bucketIds) {
    if (id.startsWith("social-") && !expectedSocialBucketIds.has(id)) {
      console.warn(
        `[task-logic] Task logic mismatch detected: social bucket "${id}" does not correspond to any status in ACTIVE_SOCIAL_STATUSES`
      );
    } else if (id.startsWith("writer-") && !expectedWriterBucketIds.has(id)) {
      console.warn(
        `[task-logic] Task logic mismatch detected: writer bucket "${id}" does not correspond to any status in ACTIVE_WRITER_STATUSES`
      );
    } else if (id.startsWith("publisher-") && !expectedPublisherBucketIds.has(id)) {
      console.warn(
        `[task-logic] Task logic mismatch detected: publisher bucket "${id}" does not correspond to any status in ACTIVE_PUBLISHER_STATUSES`
      );
    }
  }
}
