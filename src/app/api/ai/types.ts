export const ASK_AI_INTENTS = [
  "blockers",
  "next_steps",
  "requirements",
  "ownership",
  "transition",
  "quality",
  "status",
  "identity",
  "people",
  "timeline",
  "lookup",
  "general",
  // Workspace-scope intents (used when entityType === 'workspace').
  "overview",
  "priorities",
  "overdue",
  "ownership_map"
] as const;
export type AskAIIntent = (typeof ASK_AI_INTENTS)[number];
export const DEFAULT_ASK_AI_PROMPT = "What should I do next?";
export const ASK_AI_ENTITY_TYPES = [
  "blog",
  "social_post",
  "idea",
  "workspace"
] as const;
export type AskAIEntityType = (typeof ASK_AI_ENTITY_TYPES)[number];
