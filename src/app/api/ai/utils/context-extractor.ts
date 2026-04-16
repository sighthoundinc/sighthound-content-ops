/**
 * Context Extractor
 *
 * Pure deterministic function to extract context from user input and entity data.
 * Does NOT call external APIs or databases in the pure function.
 * DB calls are injected as dependencies for testing.
 *
 * Extracts:
 * - Entity type and ID from context
 * - User role from context
 * - Entity current state and fields
 * - User permissions and ownership
 */

import { getWorkflowDefinition, type WorkflowDefinition } from "@/lib/workflow-rules";

export interface ContextInput {
  entityType: "blog" | "social_post" | "idea";
  entityId: string;
  userId: string;
  userRole: "writer" | "publisher" | "editor" | "admin";
}

export interface ExtractedContext {
  entityType: "blog" | "social_post" | "idea";
  entityId: string;
  userId: string;
  userRole: "writer" | "publisher" | "editor" | "admin";
  currentStatus: string;
  userIsOwner: boolean;
  userIsReviewer: boolean;
  fields: Record<string, boolean>; // field name -> is present
  nextAllowedStages: string[];
  workflowDefinition: WorkflowDefinition;
  extractedAt: string;
}

export interface ContextExtractorDeps {
  // Mock-friendly DB query function
  // In real implementation, this reads from database with RLS enforcement
  getEntityState: (entityType: string, entityId: string) => Promise<{
    status: string;
    fields: Record<string, boolean>;
    ownerId: string;
    reviewerId?: string;
  }>;
}

/**
 * Extracts context from user input and entity data.
 * Returns structured context for downstream analysis.
 * Safe for offline execution (doesn't call external APIs).
 */
export async function extractContext(
  input: ContextInput,
  deps: ContextExtractorDeps
): Promise<ExtractedContext> {
  // Get workflow definition
  const workflowDefinition = getWorkflowDefinition(input.entityType);
  if (!workflowDefinition) {
    throw new Error(`Unknown entity type: ${input.entityType}`);
  }

  // Get entity current state (would come from DB in real implementation)
  const entityState = await deps.getEntityState(input.entityType, input.entityId);

  // Determine if user is owner
  const userIsOwner = entityState.ownerId === input.userId;

  // Determine if user is reviewer
  const userIsReviewer = entityState.reviewerId === input.userId || input.userRole === "admin";

  // Get next allowed stages for current status
  const nextAllowedStages = workflowDefinition.transitions[entityState.status] || [];

  return {
    entityType: input.entityType,
    entityId: input.entityId,
    userId: input.userId,
    userRole: input.userRole,
    currentStatus: entityState.status,
    userIsOwner,
    userIsReviewer,
    fields: entityState.fields,
    nextAllowedStages,
    workflowDefinition,
    extractedAt: new Date().toISOString()
  };
}

/**
 * Minimal context extractor for pure logic (no DB calls).
 * Used in tests and deterministic scenarios where entity state is provided.
 */
export function extractContextSync(
  input: ContextInput,
  entityState: {
    status: string;
    fields: Record<string, boolean>;
    ownerId: string;
    reviewerId?: string;
  }
): ExtractedContext {
  const workflowDefinition = getWorkflowDefinition(input.entityType);
  if (!workflowDefinition) {
    throw new Error(`Unknown entity type: ${input.entityType}`);
  }

  const userIsOwner = entityState.ownerId === input.userId;
  const userIsReviewer = entityState.reviewerId === input.userId || input.userRole === "admin";
  const nextAllowedStages = workflowDefinition.transitions[entityState.status] || [];

  return {
    entityType: input.entityType,
    entityId: input.entityId,
    userId: input.userId,
    userRole: input.userRole,
    currentStatus: entityState.status,
    userIsOwner,
    userIsReviewer,
    fields: entityState.fields,
    nextAllowedStages,
    workflowDefinition,
    extractedAt: new Date().toISOString()
  };
}
