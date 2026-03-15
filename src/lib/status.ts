import type {
  OverallBlogStatus,
  PublisherStageStatus,
  SocialPlatform,
  SocialPostProduct,
  SocialPostStatus,
  SocialPostType,
  WorkflowStage,
  WriterStageStatus,
} from "@/lib/types";

export const SITES = ["sighthound.com", "redactor.com"] as const;
export const SOCIAL_POST_STATUSES: SocialPostStatus[] = [
  "idea",
  "review",
  "published",
];
export const SOCIAL_POST_PRODUCTS: SocialPostProduct[] = [
  "alpr_plus",
  "redactor",
  "hardware",
  "general_company",
];
export const SOCIAL_POST_TYPES: SocialPostType[] = [
  "image",
  "carousel",
  "link",
  "video",
];
export const SOCIAL_PLATFORMS: SocialPlatform[] = [
  "linkedin",
  "facebook",
  "instagram",
];

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
  planned: "Draft",
  writing: "Writing",
  needs_revision: "Needs Revision",
  ready_to_publish: "Ready for Publishing",
  published: "Published",
};
export const SOCIAL_POST_STATUS_LABELS: Record<SocialPostStatus, string> = {
  idea: "Idea",
  review: "Review",
  published: "Published",
};
export const SOCIAL_POST_PRODUCT_LABELS: Record<SocialPostProduct, string> = {
  alpr_plus: "ALPR+",
  redactor: "Redactor",
  hardware: "Hardware",
  general_company: "General / Company",
};
export const SOCIAL_POST_TYPE_LABELS: Record<SocialPostType, string> = {
  image: "Image",
  carousel: "Carousel",
  link: "Link",
  video: "Video",
};
export const SOCIAL_PLATFORM_LABELS: Record<SocialPlatform, string> = {
  linkedin: "LinkedIn",
  facebook: "Facebook",
  instagram: "Instagram",
};

export const WRITER_STATUS_LABELS: Record<WriterStageStatus, string> = {
  not_started: "Draft",
  in_progress: "Writing",
  needs_revision: "Needs Revision",
  completed: "Ready for Publishing",
};

export const PUBLISHER_STATUS_LABELS: Record<PublisherStageStatus, string> = {
  not_started: "Not Started",
  in_progress: "In Progress",
  completed: "Completed",
};

export const STATUS_COLORS: Record<OverallBlogStatus, string> = {
  planned: "bg-slate-100 text-slate-700 border border-slate-200",
  writing: "bg-blue-100 text-blue-700 border border-blue-200",
  needs_revision: "bg-amber-100 text-amber-700 border border-amber-200",
  ready_to_publish: "bg-orange-100 text-orange-700 border border-orange-200",
  published: "bg-emerald-100 text-emerald-700 border border-emerald-200",
};
export const SOCIAL_POST_STATUS_COLORS: Record<SocialPostStatus, string> = {
  idea: "bg-slate-50 text-slate-700",
  review: "bg-blue-50 text-blue-700",
  published: "bg-emerald-50 text-emerald-700",
};

export const WRITER_STATUS_COLORS: Record<WriterStageStatus, string> = {
  not_started: "bg-slate-100 text-slate-700 border border-slate-200",
  in_progress: "bg-blue-100 text-blue-700 border border-blue-200",
  needs_revision: "bg-amber-100 text-amber-700 border border-amber-200",
  completed: "bg-orange-100 text-orange-700 border border-orange-200",
};

export const PUBLISHER_STATUS_COLORS: Record<PublisherStageStatus, string> = {
  not_started: "bg-slate-100 text-slate-700 border border-slate-200",
  in_progress: "bg-violet-100 text-violet-700 border border-violet-200",
  completed: "bg-emerald-100 text-emerald-700 border border-emerald-200",
};

export const WORKFLOW_STAGES: WorkflowStage[] = [
  "writing",
  "ready",
  "publishing",
  "published",
];

export const WORKFLOW_STAGE_LABELS: Record<WorkflowStage, string> = {
  writing: "Writing",
  ready: "Ready for Publishing",
  publishing: "Publishing",
  published: "Published",
};

export const WORKFLOW_STAGE_COLORS: Record<WorkflowStage, string> = {
  writing: "bg-blue-100 text-blue-700 border border-blue-200",
  ready: "bg-orange-100 text-orange-700 border border-orange-200",
  publishing: "bg-violet-100 text-violet-700 border border-violet-200",
  published: "bg-emerald-100 text-emerald-700 border border-emerald-200",
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
