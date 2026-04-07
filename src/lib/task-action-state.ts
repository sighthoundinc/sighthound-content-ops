import type {
  PublisherStageStatus,
  SocialPostStatus,
  WriterStageStatus,
} from "@/lib/types";

export type TaskActionState = "action_required" | "waiting_on_others";
export type BlogReviewTaskType = "writer_review" | "publisher_review";
export type BlogTaskAssociation = "writer" | "publisher" | "admin_assignment";
export type BlogTaskAssignmentEntry = { taskType: BlogReviewTaskType };
export type BlogTaskSelectionCandidate = {
  association: BlogTaskAssociation;
  actionState: TaskActionState;
  countBucket: "writer" | "publisher";
  statusKey: WriterStageStatus | PublisherStageStatus;
};

type BlogTaskCandidatePriorityInput = {
  actionState: TaskActionState;
  association: BlogTaskAssociation;
};

export function compareBlogTaskCandidatePriority<
  T extends BlogTaskCandidatePriorityInput,
>(left: T, right: T) {
  const actionPriority: Record<TaskActionState, number> = {
    action_required: 2,
    waiting_on_others: 1,
  };
  if (actionPriority[left.actionState] !== actionPriority[right.actionState]) {
    return actionPriority[right.actionState] - actionPriority[left.actionState];
  }

  const associationPriority: Record<BlogTaskAssociation, number> = {
    admin_assignment: 3,
    publisher: 2,
    writer: 1,
  };
  return associationPriority[right.association] - associationPriority[left.association];
}

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

export function getSelectedBlogTaskCandidate({
  userId,
  writerId,
  publisherId,
  writerStatus,
  publisherStatus,
  assignmentEntries,
}: {
  userId: string;
  writerId: string | null;
  publisherId: string | null;
  writerStatus: WriterStageStatus;
  publisherStatus: PublisherStageStatus;
  assignmentEntries: BlogTaskAssignmentEntry[];
}): BlogTaskSelectionCandidate | null {
  const candidates: BlogTaskSelectionCandidate[] = [];

  if (writerId === userId) {
    candidates.push({
      association: "writer",
      countBucket: "writer",
      statusKey: writerStatus,
      actionState: getWriterTaskActionState(writerStatus),
    });
  }

  if (publisherId === userId) {
    candidates.push({
      association: "publisher",
      countBucket: "publisher",
      statusKey: publisherStatus,
      actionState: getPublisherTaskActionState(writerStatus, publisherStatus),
    });
  }

  for (const assignment of assignmentEntries) {
    const countBucket = assignment.taskType === "writer_review" ? "writer" : "publisher";
    candidates.push({
      association: "admin_assignment",
      countBucket,
      statusKey: countBucket === "writer" ? writerStatus : publisherStatus,
      actionState: getAdminAssignmentTaskActionState(
        assignment.taskType,
        writerStatus,
        publisherStatus
      ),
    });
  }

  if (candidates.length === 0) {
    return null;
  }

  return [...candidates].sort(compareBlogTaskCandidatePriority)[0] ?? null;
}

export function getSocialTaskActionStateFromRow({
  row,
  userId,
  isAdmin,
}: {
  row: Record<string, unknown>;
  userId: string;
  isAdmin: boolean;
}) {
  const status = row.status as SocialPostStatus | undefined;
  if (!status) {
    return null;
  }
  return getSocialTaskActionState({
    status,
    userId,
    isAdmin,
    createdBy: typeof row.created_by === "string" ? row.created_by : null,
    workerUserId: typeof row.worker_user_id === "string" ? row.worker_user_id : null,
    reviewerUserId: typeof row.reviewer_user_id === "string" ? row.reviewer_user_id : null,
    assignedToUserId:
      typeof row.assigned_to_user_id === "string" ? row.assigned_to_user_id : null,
    editorUserId: typeof row.editor_user_id === "string" ? row.editor_user_id : null,
    adminOwnerId: typeof row.admin_owner_id === "string" ? row.admin_owner_id : null,
  });
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
