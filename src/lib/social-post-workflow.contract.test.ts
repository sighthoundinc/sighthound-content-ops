import {
  NEXT_ACTION_LABELS as WORKFLOW_NEXT_ACTION_LABELS,
  STATUS_LABELS as WORKFLOW_STATUS_LABELS,
  TRANSITION_GRAPH as WORKFLOW_TRANSITION_GRAPH,
  type SocialPostStatus,
} from "@/lib/social-post-workflow";
import {
  SOCIAL_POST_ALLOWED_TRANSITIONS,
  SOCIAL_POST_NEXT_ACTION_LABELS,
  SOCIAL_POST_STATUS_LABELS,
} from "@/lib/status";

const WORKFLOW_STATUSES: SocialPostStatus[] = [
  "draft",
  "in_review",
  "changes_requested",
  "creative_approved",
  "ready_to_publish",
  "awaiting_live_link",
  "published",
];

const CANONICAL_NEXT_ACTION_LABELS: Record<SocialPostStatus, string> = {
  draft: "Submit for Review",
  in_review: "Admin Review Needed",
  changes_requested: "Apply Changes",
  creative_approved: "Add Caption & Schedule",
  ready_to_publish: "Publish Post",
  awaiting_live_link: "Submit Link",
  published: "Done",
};

const statusLabelsStaySynchronized = WORKFLOW_STATUSES.every(
  (status) => SOCIAL_POST_STATUS_LABELS[status] === WORKFLOW_STATUS_LABELS[status]
);

const nextActionLabelsStaySynchronized = WORKFLOW_STATUSES.every(
  (status) =>
    SOCIAL_POST_NEXT_ACTION_LABELS[status] === WORKFLOW_NEXT_ACTION_LABELS[status]
);

const transitionsStaySynchronized = WORKFLOW_STATUSES.every((status) => {
  const statusTransitions = SOCIAL_POST_ALLOWED_TRANSITIONS[status] ?? [];
  const workflowTransitions = WORKFLOW_TRANSITION_GRAPH[status] ?? [];
  return (
    statusTransitions.length === workflowTransitions.length &&
    statusTransitions.every((nextStatus) => workflowTransitions.includes(nextStatus))
  );
});

const nextActionCopyMatchesCanonical = WORKFLOW_STATUSES.every(
  (status) => SOCIAL_POST_NEXT_ACTION_LABELS[status] === CANONICAL_NEXT_ACTION_LABELS[status]
);

export const socialPostWorkflowContractSmokeChecks = {
  statusLabelsStaySynchronized,
  nextActionLabelsStaySynchronized,
  transitionsStaySynchronized,
  nextActionCopyMatchesCanonical,
} as const;
