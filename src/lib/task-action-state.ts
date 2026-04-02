import type {
  PublisherStageStatus,
  SocialPostStatus,
  WriterStageStatus,
} from "@/lib/types";

export type TaskActionState = "action_required" | "waiting_on_others";
export type BlogReviewTaskType = "writer_review" | "publisher_review";

export function getWriterTaskActionState(
  writerStatus: WriterStageStatus
): TaskActionState {
  if (
    writerStatus === "not_started" ||
    writerStatus === "in_progress" ||
    writerStatus === "needs_revision"
  ) {
    return "action_required";
  }
  return "waiting_on_others";
}

export function getPublisherTaskActionState(
  writerStatus: WriterStageStatus,
  publisherStatus: PublisherStageStatus
): TaskActionState {
  if (writerStatus !== "completed") {
    return "waiting_on_others";
  }
  if (
    publisherStatus === "not_started" ||
    publisherStatus === "in_progress" ||
    publisherStatus === "publisher_approved"
  ) {
    return "action_required";
  }
  return "waiting_on_others";
}

export function getAdminAssignmentTaskActionState(
  taskType: BlogReviewTaskType,
  writerStatus: WriterStageStatus,
  publisherStatus: PublisherStageStatus
): TaskActionState {
  if (taskType === "writer_review") {
    return writerStatus === "pending_review" ? "action_required" : "waiting_on_others";
  }
  return publisherStatus === "pending_review" ? "action_required" : "waiting_on_others";
}

export function getSocialTaskActionState({
  status,
  userId,
  isAdmin,
  createdBy,
  workerUserId,
  reviewerUserId,
  assignedToUserId,
  editorUserId,
  adminOwnerId,
}: {
  status: SocialPostStatus;
  userId: string;
  isAdmin: boolean;
  createdBy: string | null;
  workerUserId: string | null;
  reviewerUserId: string | null;
  assignedToUserId: string | null;
  editorUserId: string | null;
  adminOwnerId: string | null;
}): TaskActionState {
  const isWorkerStage =
    status === "draft" ||
    status === "changes_requested" ||
    status === "ready_to_publish" ||
    status === "awaiting_live_link";

  if (isWorkerStage) {
    const matchesWorkerOwner =
      workerUserId === userId ||
      editorUserId === userId ||
      createdBy === userId ||
      assignedToUserId === userId;
    return matchesWorkerOwner ? "action_required" : "waiting_on_others";
  }

  if (status === "in_review" || status === "creative_approved") {
    const matchesReviewerOwner =
      reviewerUserId === userId ||
      adminOwnerId === userId ||
      assignedToUserId === userId ||
      isAdmin;
    return matchesReviewerOwner ? "action_required" : "waiting_on_others";
  }

  return "waiting_on_others";
}
