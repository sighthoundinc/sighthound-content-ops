import type { AppIconName } from "@/lib/icons";
import { validateTaskLogicConsistency } from "@/lib/task-logic";

export interface DashboardSummary {
  writerCounts: Record<string, number>;
  publisherCounts: Record<string, number>;
  socialPostCounts: Record<string, number>;
  userRoles: string[];
}

export interface SnapshotTask {
  id: string;
  title: string;
  kind: "blog" | "social";
  href: string;
  statusLabel: string;
  scheduledDate: string | null;
  actionState: "action_required" | "waiting_on_others";
}

export interface TasksSnapshot {
  requiredByMe: SnapshotTask[];
  waitingOnOthers: SnapshotTask[];
}

export interface WorkBucket {
  id: string;
  title: string;
  count: number;
  href: string;
  icon: AppIconName;
  priority: "high" | "normal";
}

/**
 * Pure data transform. Takes the authoritative dashboard summary and emits
 * a ranked list of work buckets for the home page grid. Callable from both
 * server and client.
 */
export function buildWorkBuckets(data: DashboardSummary): WorkBucket[] {
  const buckets: WorkBucket[] = [];

  if (data.userRoles.includes("writer") || data.userRoles.includes("admin")) {
    const needsRevision = data.writerCounts.needs_revision ?? 0;
    const inProgress = data.writerCounts.in_progress ?? 0;
    const pendingReview = data.writerCounts.pending_review ?? 0;
    const completed = data.writerCounts.completed ?? 0;
    const notStarted = data.writerCounts.not_started ?? 0;

    if (needsRevision > 0) {
      buckets.push({
        id: "writer-needs-revision",
        title: "Awaiting Your Revision",
        count: needsRevision,
        href: "/dashboard",
        icon: "warning",
        priority: "high",
      });
    }

    if (inProgress > 0) {
      buckets.push({
        id: "writer-in-progress",
        title: "Writing in Progress",
        count: inProgress,
        href: "/dashboard",
        icon: "writing",
        priority: "normal",
      });
    }

    if (pendingReview > 0) {
      buckets.push({
        id: "writer-pending-review",
        title: "Submitted for Editorial Review",
        count: pendingReview,
        href: "/dashboard",
        icon: "writing",
        priority: "normal",
      });
    }

    if (completed > 0) {
      buckets.push({
        id: "writer-completed",
        title: "Writing Approved",
        count: completed,
        href: "/dashboard",
        icon: "check",
        priority: "normal",
      });
    }

    if (notStarted > 0 && data.userRoles.includes("admin")) {
      buckets.push({
        id: "writer-not-started",
        title: "Not Started (Admin View)",
        count: notStarted,
        href: "/dashboard",
        icon: "home",
        priority: "normal",
      });
    }
  }

  if (data.userRoles.includes("publisher") || data.userRoles.includes("admin")) {
    const inProgress = data.publisherCounts.in_progress ?? 0;
    const pendingReview = data.publisherCounts.pending_review ?? 0;
    const publisherApproved = data.publisherCounts.publisher_approved ?? 0;
    const completed = data.publisherCounts.completed ?? 0;
    const notStarted = data.publisherCounts.not_started ?? 0;

    if (inProgress > 0) {
      buckets.push({
        id: "publisher-in-progress",
        title: "Awaiting Publishing Approval",
        count: inProgress,
        href: "/dashboard",
        icon: "warning",
        priority: "high",
      });
    }

    if (pendingReview > 0) {
      buckets.push({
        id: "publisher-pending-review",
        title: "Awaiting Publishing Review",
        count: pendingReview,
        href: "/dashboard",
        icon: "warning",
        priority: "high",
      });
    }

    if (publisherApproved > 0) {
      buckets.push({
        id: "publisher-approved",
        title: "Publishing Approved — Ready to Publish",
        count: publisherApproved,
        href: "/dashboard",
        icon: "check",
        priority: "high",
      });
    }

    if (completed > 0) {
      buckets.push({
        id: "publisher-completed",
        title: "Published",
        count: completed,
        href: "/dashboard",
        icon: "check",
        priority: "normal",
      });
    }

    if (notStarted > 0) {
      buckets.push({
        id: "publisher-not-started",
        title: "Awaiting Publishing Review",
        count: notStarted,
        href: "/dashboard",
        icon: "home",
        priority: "normal",
      });
    }
  }

  if (
    data.userRoles.includes("admin") ||
    data.userRoles.includes("publisher") ||
    data.userRoles.includes("editor") ||
    data.userRoles.includes("writer")
  ) {
    const draft = data.socialPostCounts.draft ?? 0;
    const changesRequested = data.socialPostCounts.changes_requested ?? 0;
    const inReview = data.socialPostCounts.in_review ?? 0;
    const creativeApproved = data.socialPostCounts.creative_approved ?? 0;
    const readyToPublish = data.socialPostCounts.ready_to_publish ?? 0;
    const awaitingLink = data.socialPostCounts.awaiting_live_link ?? 0;

    if (draft > 0) {
      buckets.push({
        id: "social-draft",
        title: "Social Posts in Draft",
        count: draft,
        href: "/social-posts",
        icon: "writing",
        priority: "normal",
      });
    }

    if (changesRequested > 0) {
      buckets.push({
        id: "social-changes-requested",
        title: "Social Posts Need Changes",
        count: changesRequested,
        href: "/social-posts",
        icon: "warning",
        priority: "high",
      });
    }

    if (readyToPublish > 0) {
      buckets.push({
        id: "social-ready-to-publish",
        title: "Social Posts Ready to Publish",
        count: readyToPublish,
        href: "/social-posts",
        icon: "writing",
        priority: "high",
      });
    }

    if (awaitingLink > 0) {
      buckets.push({
        id: "social-awaiting-live-link",
        title: "Social Posts Awaiting Live Link",
        count: awaitingLink,
        href: "/social-posts",
        icon: "warning",
        priority: "high",
      });
    }

    if (inReview > 0) {
      buckets.push({
        id: "social-in-review",
        title: "Social Posts in Review",
        count: inReview,
        href: "/social-posts",
        icon: "writing",
        priority: "normal",
      });
    }

    if (creativeApproved > 0) {
      buckets.push({
        id: "social-creative-approved",
        title: "Social Posts Creative Approved",
        count: creativeApproved,
        href: "/social-posts",
        icon: "check",
        priority: "normal",
      });
    }
  }

  const sorted = buckets.sort((a, b) => {
    if (a.priority === "high" && b.priority !== "high") return -1;
    if (a.priority !== "high" && b.priority === "high") return 1;
    return b.count - a.count;
  });

  validateTaskLogicConsistency(
    {
      writerCounts: Object.keys(data.writerCounts),
      publisherCounts: Object.keys(data.publisherCounts),
      socialPostCounts: Object.keys(data.socialPostCounts),
    },
    sorted.map((b) => b.id)
  );

  return sorted;
}
