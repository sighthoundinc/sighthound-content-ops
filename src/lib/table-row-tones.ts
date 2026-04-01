import type {
  OverallBlogStatus,
  PublisherStageStatus,
  SocialPostStatus,
  WriterStageStatus,
} from "@/lib/types";

type WorkflowRowTone =
  | "default"
  | "in_progress"
  | "review"
  | "ready_to_publish"
  | "awaiting_live_link"
  | "needs_revision"
  | "published";

type WorkflowRowToneClassSet = {
  base: string;
  selected: string;
  active: string;
};

const WORKFLOW_ROW_TONE_CLASSES: Record<WorkflowRowTone, WorkflowRowToneClassSet> = {
  default: {
    base: "hover:bg-slate-50",
    selected: "bg-slate-50",
    active: "bg-slate-100",
  },
  in_progress: {
    base: "bg-blue-50 hover:bg-blue-100",
    selected: "bg-blue-100",
    active: "bg-blue-200",
  },
  review: {
    base: "bg-violet-50 hover:bg-violet-100",
    selected: "bg-violet-100",
    active: "bg-violet-200",
  },
  ready_to_publish: {
    base: "bg-sky-50 hover:bg-sky-100",
    selected: "bg-sky-100",
    active: "bg-sky-200",
  },
  awaiting_live_link: {
    base: "bg-amber-50 hover:bg-amber-100",
    selected: "bg-amber-100",
    active: "bg-amber-200",
  },
  needs_revision: {
    base: "bg-rose-50 hover:bg-rose-100",
    selected: "bg-rose-100",
    active: "bg-rose-200",
  },
  published: {
    base: "bg-emerald-50 hover:bg-emerald-100",
    selected: "bg-emerald-100",
    active: "bg-emerald-200",
  },
};

const BLOG_WRITER_STATUSES = new Set<WriterStageStatus>([
  "not_started",
  "in_progress",
  "pending_review",
  "needs_revision",
  "completed",
]);
const BLOG_PUBLISHER_STATUSES = new Set<PublisherStageStatus>([
  "not_started",
  "in_progress",
  "pending_review",
  "publisher_approved",
  "completed",
]);
const BLOG_OVERALL_STATUSES = new Set<OverallBlogStatus>([
  "planned",
  "writing",
  "needs_revision",
  "ready_to_publish",
  "published",
]);
const SOCIAL_STATUSES = new Set<SocialPostStatus>([
  "draft",
  "in_review",
  "changes_requested",
  "creative_approved",
  "ready_to_publish",
  "awaiting_live_link",
  "published",
]);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === "object";

const asString = (value: unknown): string | null =>
  typeof value === "string" ? value : null;

const getToneFromSocialStatus = (status: SocialPostStatus): WorkflowRowTone => {
  if (status === "published") {
    return "published";
  }
  if (status === "awaiting_live_link") {
    return "awaiting_live_link";
  }
  if (status === "changes_requested") {
    return "needs_revision";
  }
  if (status === "in_review") {
    return "review";
  }
  if (status === "creative_approved" || status === "ready_to_publish") {
    return "ready_to_publish";
  }
  return "in_progress";
};

const getToneFromLifecycleBucket = (bucket: string): WorkflowRowTone => {
  if (bucket === "published") {
    return "published";
  }
  if (bucket === "awaiting_live_link") {
    return "awaiting_live_link";
  }
  if (bucket === "ready_to_publish") {
    return "ready_to_publish";
  }
  if (bucket === "awaiting_review") {
    return "review";
  }
  if (bucket === "open_work") {
    return "in_progress";
  }
  return "default";
};

const getToneFromBlogStatuses = ({
  writerStatus,
  publisherStatus,
  overallStatus,
}: {
  writerStatus: WriterStageStatus | null;
  publisherStatus: PublisherStageStatus | null;
  overallStatus: OverallBlogStatus | null;
}): WorkflowRowTone => {
  if (publisherStatus === "completed" || overallStatus === "published") {
    return "published";
  }
  if (writerStatus === "needs_revision" || overallStatus === "needs_revision") {
    return "needs_revision";
  }
  if (writerStatus === "pending_review" || publisherStatus === "pending_review") {
    return "review";
  }
  if (
    overallStatus === "ready_to_publish" ||
    publisherStatus === "publisher_approved" ||
    writerStatus === "completed"
  ) {
    return "ready_to_publish";
  }
  if (
    overallStatus === "writing" ||
    writerStatus === "in_progress" ||
    publisherStatus === "in_progress"
  ) {
    return "in_progress";
  }
  return "default";
};

const getStatusToneFromRecord = (record: Record<string, unknown>): WorkflowRowTone => {
  const lifecycleBucket = asString(record.lifecycle_bucket);
  if (lifecycleBucket) {
    return getToneFromLifecycleBucket(lifecycleBucket);
  }

  const socialStatusRaw = asString(record.status);
  if (socialStatusRaw && SOCIAL_STATUSES.has(socialStatusRaw as SocialPostStatus)) {
    return getToneFromSocialStatus(socialStatusRaw as SocialPostStatus);
  }

  const writerStatusRaw = asString(record.writer_status);
  const publisherStatusRaw = asString(record.publisher_status);
  const overallStatusRaw = asString(record.overall_status);

  const writerStatus = BLOG_WRITER_STATUSES.has(writerStatusRaw as WriterStageStatus)
    ? (writerStatusRaw as WriterStageStatus)
    : null;
  const publisherStatus = BLOG_PUBLISHER_STATUSES.has(
    publisherStatusRaw as PublisherStageStatus
  )
    ? (publisherStatusRaw as PublisherStageStatus)
    : null;
  const overallStatus = BLOG_OVERALL_STATUSES.has(overallStatusRaw as OverallBlogStatus)
    ? (overallStatusRaw as OverallBlogStatus)
    : null;

  if (writerStatus || publisherStatus || overallStatus) {
    return getToneFromBlogStatuses({ writerStatus, publisherStatus, overallStatus });
  }

  const blogTask = isRecord(record.blogTask) ? record.blogTask : null;
  if (blogTask) {
    const blogTaskWriterStatusRaw = asString(blogTask.writerStatus);
    const blogTaskPublisherStatusRaw = asString(blogTask.publisherStatus);
    const blogTaskWriterStatus = BLOG_WRITER_STATUSES.has(
      blogTaskWriterStatusRaw as WriterStageStatus
    )
      ? (blogTaskWriterStatusRaw as WriterStageStatus)
      : null;
    const blogTaskPublisherStatus = BLOG_PUBLISHER_STATUSES.has(
      blogTaskPublisherStatusRaw as PublisherStageStatus
    )
      ? (blogTaskPublisherStatusRaw as PublisherStageStatus)
      : null;
    return getToneFromBlogStatuses({
      writerStatus: blogTaskWriterStatus,
      publisherStatus: blogTaskPublisherStatus,
      overallStatus: null,
    });
  }

  const socialTask = isRecord(record.socialTask) ? record.socialTask : null;
  if (socialTask) {
    const socialTaskStatusRaw = asString(socialTask.status);
    if (
      socialTaskStatusRaw &&
      SOCIAL_STATUSES.has(socialTaskStatusRaw as SocialPostStatus)
    ) {
      return getToneFromSocialStatus(socialTaskStatusRaw as SocialPostStatus);
    }
  }

  return "default";
};

export function getWorkflowRowClassName(
  row: unknown,
  isActive: boolean,
  isSelected: boolean
) {
  const tone = isRecord(row) ? getStatusToneFromRecord(row) : "default";
  const classes = WORKFLOW_ROW_TONE_CLASSES[tone];
  if (isActive) {
    return classes.active;
  }
  if (isSelected) {
    return classes.selected;
  }
  return classes.base;
}
