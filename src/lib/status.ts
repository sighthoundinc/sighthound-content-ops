import type {
  OverallBlogStatus,
  PublisherStageStatus,
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

export const STATUS_COLORS: Record<OverallBlogStatus, string> = {
  planned: "bg-slate-100 text-slate-700",
  writing: "bg-sky-100 text-sky-700",
  needs_revision: "bg-amber-100 text-amber-700",
  ready_to_publish: "bg-violet-100 text-violet-700",
  published: "bg-emerald-100 text-emerald-700",
};
