/**
 * Workflow Rules
 *
 * Pure deterministic definitions of workflow state machines.
 * Single source of truth for blog, social post, and idea workflows.
 * No external API calls, no side effects.
 */

export interface WorkflowDefinition {
  entityType: "blog" | "social_post" | "idea";
  stages: string[];
  transitions: Record<string, string[]>; // stage -> allowed next stages
  requiredFieldsByStage: Record<string, string[]>;
  description: string;
}

/**
 * Blog Workflow Definition
 *
 * Uses the unified workflow stages derived from writer_status + publisher_status
 * (see `src/lib/status.ts#getWorkflowStage`):
 *   writing -> ready -> publishing -> published
 *
 * `writing`   : writer_status has not yet reached "completed"
 * `ready`     : writer_status = "completed" and publisher_status = "not_started"
 * `publishing`: publisher_status in (in_progress | pending_review | publisher_approved)
 * `published` : publisher_status = "completed" (terminal)
 */
export const BLOG_WORKFLOW: WorkflowDefinition = {
  entityType: "blog",
  stages: ["writing", "ready", "publishing", "published"],
  transitions: {
    writing: ["ready"],
    ready: ["publishing"],
    publishing: ["published"],
    published: []
  },
  requiredFieldsByStage: {
    writing: ["title", "writer_id"],
    ready: ["title", "writer_id", "draft_doc_link"],
    publishing: ["title", "writer_id", "draft_doc_link", "publisher_id"],
    published: ["title", "writer_id", "draft_doc_link", "publisher_id"]
  },
  description: "Blog workflow: Writing -> Ready -> Publishing -> Published"
};

/**
 * Social Post Workflow Definition
 *
 * Stages: draft -> in_review -> creative_approved -> ready_to_publish -> awaiting_live_link -> published
 * With changes_requested branch from in_review
 */
export const SOCIAL_POST_WORKFLOW: WorkflowDefinition = {
  entityType: "social_post",
  stages: ["draft", "in_review", "changes_requested", "creative_approved", "ready_to_publish", "awaiting_live_link", "published"],
  transitions: {
    draft: ["in_review"],
    in_review: ["creative_approved", "changes_requested"],
    changes_requested: ["in_review"],
    creative_approved: ["ready_to_publish"],
    ready_to_publish: ["awaiting_live_link"],
    awaiting_live_link: ["published"],
    published: []
  },
  requiredFieldsByStage: {
    draft: ["product", "type", "canva_url"],
    in_review: ["product", "type", "canva_url"],
    changes_requested: ["product", "type", "canva_url"],
    creative_approved: ["product", "type", "canva_url", "caption", "platforms", "scheduled_publish_date"],
    ready_to_publish: ["product", "type", "canva_url", "caption", "platforms", "scheduled_publish_date"],
    awaiting_live_link: ["product", "type", "canva_url", "caption", "platforms", "scheduled_publish_date"],
    published: ["product", "type", "canva_url", "caption", "platforms", "scheduled_publish_date", "live_link"]
  },
  description: "Social post workflow: Draft -> In Review -> Creative Approved -> Ready to Publish -> Awaiting Live Link -> Published"
};

/**
 * Idea Workflow Definition
 *
 * Single stage: idea (triage point to blog or social post)
 */
export const IDEA_WORKFLOW: WorkflowDefinition = {
  entityType: "idea",
  stages: ["idea"],
  transitions: {
    idea: []
  },
  requiredFieldsByStage: {
    idea: []
  },
  description: "Idea intake and triage workflow"
};

/**
 * Get workflow definition by entity type
 */
export function getWorkflowDefinition(
  entityType: "blog" | "social_post" | "idea"
): WorkflowDefinition | null {
  switch (entityType) {
    case "blog":
      return BLOG_WORKFLOW;
    case "social_post":
      return SOCIAL_POST_WORKFLOW;
    case "idea":
      return IDEA_WORKFLOW;
    default:
      return null;
  }
}

/**
 * Get required fields for a specific status
 */
export function getRequiredFieldsForStatus(
  entityType: "blog" | "social_post" | "idea",
  status: string
): string[] {
  const workflow = getWorkflowDefinition(entityType);
  if (!workflow) return [];
  return workflow.requiredFieldsByStage[status] || [];
}

/**
 * Get next allowed stages for current status
 */
export function getNextStagesForStatus(
  entityType: "blog" | "social_post" | "idea",
  status: string
): string[] {
  const workflow = getWorkflowDefinition(entityType);
  if (!workflow) return [];
  return workflow.transitions[status] || [];
}

/**
 * Check if user can transition from current status
 */
export function canUserTransitionFrom(
  entityType: "blog" | "social_post" | "idea",
  status: string
): boolean {
  const nextStages = getNextStagesForStatus(entityType, status);
  return nextStages.length > 0;
}

/**
 * Get role required for a specific status
 */
export function getRequiredRoleForStatus(
  entityType: "blog" | "social_post" | "idea",
  status: string
): string {
  // Map statuses to required roles
  const roleMap: Record<string, string> = {
    // Blog roles (unified stages)
    writing: "writer",
    ready: "editor",
    publishing: "publisher",

    // Social post roles
    in_review: "editor",
    changes_requested: "writer",
    creative_approved: "editor",
    ready_to_publish: "writer",
    awaiting_live_link: "writer",
    published: "writer",

    // Idea roles
    idea: "writer"
  };

  return roleMap[status] || "writer";
}

/**
 * Get human-readable description of status
 */
export function getStatusDescription(
  entityType: "blog" | "social_post" | "idea",
  status: string
): string {
  const descriptions: Record<string, string> = {
    // Blog (unified stages)
    writing: "Writer is still working on the draft",
    ready: "Writing is approved and ready for publishing",
    publishing: "Publisher is finalizing the post",

    // Social post
    in_review: "Awaiting editor review",
    changes_requested: "Writer needs to make revisions",
    creative_approved: "Creative approved, ready for scheduling",
    ready_to_publish: "Scheduled and ready to post",
    awaiting_live_link: "Posted, awaiting live link submission",
    published: "Published",

    // Idea
    idea: "Idea in triage"
  };

  return descriptions[status] || `In ${status} stage`;
}
