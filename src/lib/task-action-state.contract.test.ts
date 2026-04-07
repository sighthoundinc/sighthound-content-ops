import {
  getSelectedBlogTaskCandidate,
  getSocialTaskActionState,
  getSocialTaskActionStateFromRow,
} from "@/lib/task-action-state";

const selectedBlogCandidateWithMultipleAssociations = getSelectedBlogTaskCandidate({
  userId: "user-1",
  writerId: "user-1",
  publisherId: "user-1",
  writerStatus: "pending_review",
  publisherStatus: "not_started",
  assignmentEntries: [{ taskType: "writer_review" }],
});

const selectedPublisherReviewCandidate = getSelectedBlogTaskCandidate({
  userId: "user-1",
  writerId: null,
  publisherId: "user-1",
  writerStatus: "completed",
  publisherStatus: "publisher_approved",
  assignmentEntries: [{ taskType: "publisher_review" }],
});

const socialRow = {
  status: "draft",
  created_by: "user-1",
  worker_user_id: "user-1",
  reviewer_user_id: "reviewer-1",
  assigned_to_user_id: "user-1",
  editor_user_id: null,
  admin_owner_id: null,
} as const;

const socialActionFromRow = getSocialTaskActionStateFromRow({
  row: socialRow,
  userId: "user-1",
  isAdmin: false,
});

const socialActionDirect = getSocialTaskActionState({
  status: socialRow.status,
  userId: "user-1",
  isAdmin: false,
  createdBy: socialRow.created_by,
  workerUserId: socialRow.worker_user_id,
  reviewerUserId: socialRow.reviewer_user_id,
  assignedToUserId: socialRow.assigned_to_user_id,
  editorUserId: socialRow.editor_user_id,
  adminOwnerId: socialRow.admin_owner_id,
});

export const taskActionStateContractSmokeChecks = {
  blogDedupPrioritizesActionRequired:
    selectedBlogCandidateWithMultipleAssociations?.actionState === "action_required" &&
    selectedBlogCandidateWithMultipleAssociations.countBucket === "writer",
  publisherReviewUsesPublisherBucket:
    selectedPublisherReviewCandidate?.countBucket === "publisher",
  socialRowHelperMatchesDirectHelper: socialActionFromRow === socialActionDirect,
} as const;
