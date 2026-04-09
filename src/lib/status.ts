import type {
  OverallBlogStatus,
  PublisherStageStatus,
  SocialNextActor,
  SocialPlatform,
  SocialPostProduct,
  SocialPostStatus,
  SocialPostType,
  WorkflowStage,
  WriterStageStatus,
} from "@/lib/types";
import {
  NEXT_ACTION_LABELS as SOCIAL_WORKFLOW_NEXT_ACTION_LABELS,
  STATUS_LABELS as SOCIAL_WORKFLOW_STATUS_LABELS,
  TRANSITION_GRAPH as SOCIAL_WORKFLOW_TRANSITION_GRAPH,
} from "@/lib/social-post-workflow";

export const SITES = ["sighthound.com", "redactor.com"] as const;
export const SOCIAL_POST_STATUSES: SocialPostStatus[] = [
  "draft",
  "in_review",
  "changes_requested",
  "creative_approved",
  "ready_to_publish",
  "awaiting_live_link",
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
  "pending_review",
  "needs_revision",
  "completed",
];
export const PUBLISHER_STATUSES: PublisherStageStatus[] = [
  "not_started",
  "in_progress",
  "pending_review",
  "publisher_approved",
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
  ready_to_publish: "Ready",
  published: "Published",
};
export const SOCIAL_POST_STATUS_LABELS: Record<SocialPostStatus, string> = {
  ...SOCIAL_WORKFLOW_STATUS_LABELS,
};
export const SOCIAL_POST_NEXT_ACTION_LABELS: Record<SocialPostStatus, string> = {
  ...SOCIAL_WORKFLOW_NEXT_ACTION_LABELS,
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
  in_progress: "Writing in Progress",
  pending_review: "Awaiting Editorial Review",
  needs_revision: "Needs Revision",
  completed: "Writing Approved",
};

export const PUBLISHER_STATUS_LABELS: Record<PublisherStageStatus, string> = {
  not_started: "Not Started",
  in_progress: "Publishing in Progress",
  pending_review: "Awaiting Publishing Approval",
  publisher_approved: "Publishing Approved",
  completed: "Published",
};

// Unified status badge color palette for system-wide consistency
// All statuses use the same color mapping regardless of type
export const STATUS_COLORS: Record<OverallBlogStatus, string> = {
  planned: "bg-slate-100 text-slate-700 border border-slate-200",
  writing: "bg-blue-100 text-blue-700 border border-blue-200",
  needs_revision: "bg-orange-100 text-orange-700 border border-orange-200",
  ready_to_publish: "bg-purple-100 text-purple-700 border border-purple-200",
  published: "bg-green-100 text-green-700 border border-green-200",
};
export const SOCIAL_POST_ALLOWED_TRANSITIONS: Record<SocialPostStatus, SocialPostStatus[]> = {
  ...SOCIAL_WORKFLOW_TRANSITION_GRAPH,
};
export function getNextActor(status: SocialPostStatus): SocialNextActor {
  if (
    status === "draft" ||
    status === "changes_requested" ||
    status === "ready_to_publish" ||
    status === "awaiting_live_link"
  ) {
    return "editor";
  }
  if (status === "in_review" || status === "creative_approved") {
    return "admin";
  }
  return "none";
}
export const SOCIAL_POST_STATUS_COLORS: Record<SocialPostStatus, string> = {
  draft: "bg-slate-100 text-slate-700 border border-slate-200",
  in_review: "bg-blue-100 text-blue-700 border border-blue-200",
  changes_requested: "bg-orange-100 text-orange-700 border border-orange-200",
  creative_approved: "bg-emerald-100 text-emerald-700 border border-emerald-200",
  ready_to_publish: "bg-violet-100 text-violet-700 border border-violet-200",
  awaiting_live_link: "bg-amber-100 text-amber-700 border border-amber-200",
  published: "bg-green-100 text-green-700 border border-green-200",
};

export const WRITER_STATUS_COLORS: Record<WriterStageStatus, string> = {
  not_started: "bg-slate-100 text-slate-700 border border-slate-200",
  in_progress: "bg-blue-100 text-blue-700 border border-blue-200",
  pending_review: "bg-amber-100 text-amber-700 border border-amber-200",
  needs_revision: "bg-orange-100 text-orange-700 border border-orange-200",
  completed: "bg-emerald-100 text-emerald-700 border border-emerald-200",
};

export const PUBLISHER_STATUS_COLORS: Record<PublisherStageStatus, string> = {
  not_started: "bg-slate-100 text-slate-700 border border-slate-200",
  in_progress: "bg-blue-100 text-blue-700 border border-blue-200",
  pending_review: "bg-amber-100 text-amber-700 border border-amber-200",
  publisher_approved: "bg-emerald-100 text-emerald-700 border border-emerald-200",
  completed: "bg-green-100 text-green-700 border border-green-200",
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
  ready: "bg-purple-100 text-purple-700 border border-purple-200",
  publishing: "bg-blue-500 text-white border border-blue-600",
  published: "bg-green-100 text-green-700 border border-green-200",
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
  if (
    publisherStatus === "in_progress" ||
    publisherStatus === "pending_review" ||
    publisherStatus === "publisher_approved"
  ) {
    return "publishing";
  }
  if (writerStatus !== "completed") {
    return "writing";
  }
  return "ready";
}
