import type {
  OverallBlogStatus,
  PublisherStageStatus,
  WorkflowStage,
  WriterStageStatus,
} from "@/lib/types";

export const SITES = ["sighthound.com", "redactor.com"] as const;

export const WRITER_STATUSES: WriterStageStatus[] = [
  "not_started",
  "in_progress",
  "needs_revision",
  "completed",
];

export const PUBLISHER_STATUSES: PublisherStageStatus[] = [
  "not_started",
  "in_progress",
  "completed",
];

export const OVERALL_STATUSES: OverallBlogStatus[] = [
  "planned",
  "writing",
  "needs_revision",
  "ready_to_publish",
  "published",
];

export const STATUS_LABELS: Record<OverallBlogStatus, string> = {
  planned: "Planned",
  writing: "Writing",
  needs_revision: "Needs Revision",
  ready_to_publish: "Ready to Publish",
  published: "Published",
};

export const WRITER_STATUS_LABELS: Record<WriterStageStatus, string> = {
  not_started: "Not Started",
  in_progress: "In Progress",
  needs_revision: "Needs Review",
  completed: "Completed",
};

export const PUBLISHER_STATUS_LABELS: Record<PublisherStageStatus, string> = {
  not_started: "Not Started",
  in_progress: "In Progress",
  completed: "Completed",
};

export const STATUS_COLORS: Record<OverallBlogStatus, string> = {
  planned: "bg-slate-100 text-slate-700",
  writing: "bg-sky-100 text-sky-700",
  needs_revision: "bg-amber-100 text-amber-700",
  ready_to_publish: "bg-violet-100 text-violet-700",
  published: "bg-emerald-100 text-emerald-700",
};

export const WRITER_STATUS_COLORS: Record<WriterStageStatus, string> = {
  not_started: "bg-slate-100 text-slate-700",
  in_progress: "bg-blue-100 text-blue-700",
  needs_revision: "bg-orange-100 text-orange-700",
  completed: "bg-emerald-100 text-emerald-700",
};

export const PUBLISHER_STATUS_COLORS: Record<PublisherStageStatus, string> = {
  not_started: "bg-slate-100 text-slate-700",
  in_progress: "bg-blue-100 text-blue-700",
  completed: "bg-emerald-100 text-emerald-700",
};

export const WORKFLOW_STAGES: WorkflowStage[] = [
  "writing",
  "ready",
  "publishing",
  "published",
];

export const WORKFLOW_STAGE_LABELS: Record<WorkflowStage, string> = {
  writing: "Writing",
  ready: "Ready",
  publishing: "Publishing",
  published: "Published",
};

export const WORKFLOW_STAGE_COLORS: Record<WorkflowStage, string> = {
  writing: "bg-sky-100 text-sky-700",
  ready: "bg-violet-100 text-violet-700",
  publishing: "bg-blue-100 text-blue-700",
  published: "bg-emerald-100 text-emerald-700",
};

export function getWorkflowStage({
  writerStatus,
  publisherStatus,
}: {
  writerStatus: WriterStageStatus;
  publisherStatus: PublisherStageStatus;
}): WorkflowStage {
  if (publisherStatus === "completed") {
    return "published";
  }
  if (publisherStatus === "in_progress") {
    return "publishing";
  }
  if (writerStatus !== "completed") {
    return "writing";
  }
  return "ready";
}
