import type { AppIconName } from "@/lib/icons";
import type { DashboardFilterIntent } from "@/lib/dashboard-filter-state";
import { PUBLISHER_STATUS_LABELS, WRITER_STATUS_LABELS } from "@/lib/status";
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
  icon: AppIconName;
  priority: "high" | "normal";
  /** Filter My Tasks applies when the tile is opened. */
  intent: DashboardFilterIntent;
}

type BucketDefinition = Omit<WorkBucket, "count"> & {
  counts: "writerCounts" | "publisherCounts" | "socialPostCounts";
};

const writerBucket = (
  status: keyof typeof WRITER_STATUS_LABELS,
  rest: Pick<BucketDefinition, "id" | "title" | "icon" | "priority">
): BucketDefinition => ({
  ...rest,
  counts: "writerCounts",
  intent: { type: "writer_status", value: status },
});

const publisherBucket = (
  status: keyof typeof PUBLISHER_STATUS_LABELS,
  rest: Pick<BucketDefinition, "id" | "title" | "icon" | "priority">
): BucketDefinition => ({
  ...rest,
  counts: "publisherCounts",
  intent: { type: "publisher_status", value: status },
});

const socialBucket = (
  status: string,
  rest: Pick<BucketDefinition, "title" | "icon" | "priority">
): BucketDefinition => ({
  ...rest,
  id: `social-${status.replace(/_/g, "-")}`,
  counts: "socialPostCounts",
  intent: { type: "social_status", value: status },
});

/**
 * Every tile Home can show, in tie-break order. The summary API only counts
 * work that needs the viewer's own action, so there is no role gating here
 * and no tile for finished stages: a tile appears exactly when its count is
 * above zero.
 */
const BUCKET_DEFINITIONS: BucketDefinition[] = [
  writerBucket("needs_revision", { id: "writer-needs-revision", title: "Awaiting Your Revision", icon: "warning", priority: "high" }),
  writerBucket("in_progress", { id: "writer-in-progress", title: WRITER_STATUS_LABELS.in_progress, icon: "writing", priority: "normal" }),
  writerBucket("pending_review", { id: "writer-pending-review", title: WRITER_STATUS_LABELS.pending_review, icon: "writing", priority: "normal" }),
  writerBucket("not_started", { id: "writer-not-started", title: "Writing Not Started", icon: "home", priority: "normal" }),
  publisherBucket("in_progress", { id: "publisher-in-progress", title: PUBLISHER_STATUS_LABELS.in_progress, icon: "warning", priority: "high" }),
  publisherBucket("pending_review", { id: "publisher-pending-review", title: PUBLISHER_STATUS_LABELS.pending_review, icon: "warning", priority: "high" }),
  publisherBucket("publisher_approved", { id: "publisher-approved", title: PUBLISHER_STATUS_LABELS.publisher_approved, icon: "check", priority: "high" }),
  publisherBucket("not_started", { id: "publisher-not-started", title: "Publishing Not Started", icon: "home", priority: "normal" }),
  socialBucket("draft", { title: "Social Posts in Draft", icon: "writing", priority: "normal" }),
  socialBucket("changes_requested", { title: "Social Posts Need Changes", icon: "warning", priority: "high" }),
  socialBucket("ready_to_publish", { title: "Social Posts Ready to Publish", icon: "writing", priority: "high" }),
  socialBucket("awaiting_live_link", { title: "Social Posts Awaiting Live Link", icon: "warning", priority: "high" }),
  socialBucket("in_review", { title: "Social Posts in Review", icon: "writing", priority: "normal" }),
  socialBucket("creative_approved", { title: "Social Posts Creative Approved", icon: "check", priority: "normal" }),
];

/**
 * Pure data transform. Takes the authoritative dashboard summary and emits
 * the ranked work buckets for the home page: high priority first, then by
 * count. Callable from both server and client.
 */
export function buildWorkBuckets(data: DashboardSummary): WorkBucket[] {
  const buckets = BUCKET_DEFINITIONS.flatMap(({ counts, ...bucket }) => {
    const count = data[counts][bucket.intent.value] ?? 0;
    return count > 0 ? [{ ...bucket, count }] : [];
  }).sort((a, b) => {
    if (a.priority !== b.priority) {
      return a.priority === "high" ? -1 : 1;
    }
    return b.count - a.count;
  });

  validateTaskLogicConsistency(
    {
      writerCounts: Object.keys(data.writerCounts),
      publisherCounts: Object.keys(data.publisherCounts),
      socialPostCounts: Object.keys(data.socialPostCounts),
    },
    buckets.map((bucket) => bucket.id)
  );

  return buckets;
}
