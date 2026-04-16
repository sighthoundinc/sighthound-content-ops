export const ASK_AI_INTENTS = [
  "blockers",
  "next_steps",
  "requirements",
  "ownership",
  "transition",
  "quality",
  "status",
  "general"
] as const;
export type AskAIIntent = (typeof ASK_AI_INTENTS)[number];
export const DEFAULT_ASK_AI_PROMPT = "What should I do next?";
