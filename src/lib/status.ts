import type {
  OverallBlogStatus,
  PublisherStageStatus,
  WriterStageStatus,
} from "@/lib/types";

export const SITES = ["sighthound.com", "redactor.com"] as const;

export const WRITER_STATUSES: WriterStageStatus[] = [
  "assigned",
  "writing",
  "pending_review",
  "completed",
];

export const PUBLISHER_STATUSES: PublisherStageStatus[] = [
  "not_started",
  "publishing",
  "pending_review",
  "completed",
];

export const OVERALL_STATUSES: OverallBlogStatus[] = [
  "writing",
  "writing_review",
  "ready_to_publish",
  "publishing",
  "publishing_review",
  "published",
];

export const STATUS_LABELS: Record<OverallBlogStatus, string> = {
  writing: "Writing",
  writing_review: "Writing Review",
  ready_to_publish: "Ready to Publish",
  publishing: "Publishing",
  publishing_review: "Publishing Review",
  published: "Published",
};

export const STATUS_COLORS: Record<OverallBlogStatus, string> = {
  writing: "bg-sky-100 text-sky-700",
  writing_review: "bg-amber-100 text-amber-700",
  ready_to_publish: "bg-violet-100 text-violet-700",
  publishing: "bg-indigo-100 text-indigo-700",
  publishing_review: "bg-fuchsia-100 text-fuchsia-700",
  published: "bg-emerald-100 text-emerald-700",
};
