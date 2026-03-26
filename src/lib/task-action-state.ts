import type { SocialPostStatus } from "@/lib/types";

export type TaskActionState = "action_required" | "waiting_on_others";

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
