import { DEFAULT_ASK_AI_PROMPT, type AskAIIntent } from "../types";
import type { ExtractedContext } from "./context-extractor";
import type { Blocker } from "@/lib/blocker-detector";
import type { QualityIssue } from "@/lib/quality-checker";
import { humanizeField, humanizeFieldList, humanizeStatus } from "./humanize";

export interface PromptRoutingInput {
  prompt?: string;
  context: ExtractedContext;
  blockers: Blocker[];
  qualityIssues: QualityIssue[];
  deterministicNextSteps: string[];
  canProceed: boolean;
}

export interface PromptRoutingResult {
  prompt: string;
  intent: AskAIIntent;
  answer: string;
  nextSteps: string[];
}

const INTENT_KEYWORDS: Array<{ intent: AskAIIntent; keywords: string[] }> = [
  {
    intent: "blockers",
    keywords: ["why can't", "why cant", "cannot", "can't", "blocked", "blocking", "stuck", "why not", "issue"]
  },
  {
    intent: "requirements",
    keywords: ["required", "requirement", "mandatory", "missing field", "what fields", "need to fill", "checklist"]
  },
  {
    intent: "ownership",
    keywords: ["assigned", "owner", "ownership", "permission", "can i", "am i allowed", "who can"]
  },
  {
    intent: "transition",
    keywords: ["publish", "submit", "approve", "review", "move to", "transition", "next stage"]
  },
  {
    intent: "quality",
    keywords: ["quality", "improve", "better", "caption", "title", "copy", "polish"]
  },
  {
    intent: "status",
    keywords: ["status", "state", "where am i", "what stage", "current stage", "what is this in"]
  },
  {
    intent: "next_steps",
    keywords: ["what should i do", "next step", "what next", "how do i proceed", "how to proceed"]
  }
];

export function normalizePrompt(prompt?: string): string {
  if (typeof prompt !== "string") {
    return DEFAULT_ASK_AI_PROMPT;
  }

  const trimmed = prompt.trim();
  if (!trimmed) {
    return DEFAULT_ASK_AI_PROMPT;
  }

  return trimmed.length > 500 ? trimmed.slice(0, 500) : trimmed;
}

export function parsePromptIntent(prompt: string): AskAIIntent {
  const normalizedPrompt = prompt.toLowerCase();

  for (const intentConfig of INTENT_KEYWORDS) {
    if (intentConfig.keywords.some((keyword) => normalizedPrompt.includes(keyword))) {
      return intentConfig.intent;
    }
  }

  return "general";
}

export function routePrompt(input: PromptRoutingInput): PromptRoutingResult {
  const prompt = normalizePrompt(input.prompt);
  const intent = parsePromptIntent(prompt);
  const answer = buildAnswer(intent, input);
  const nextSteps = buildIntentAwareNextSteps(intent, input);

  return {
    prompt,
    intent,
    answer,
    nextSteps
  };
}

function buildAnswer(intent: AskAIIntent, input: PromptRoutingInput): string {
  const statusLabel = humanizeStatus(input.context.currentStatus);
  const criticalBlockers = input.blockers.filter((blocker) => blocker.severity === "critical");
  const missingFields = getMissingFields(input.blockers);

  switch (intent) {
    case "blockers":
      if (criticalBlockers.length === 0) {
        return `You’re in ${statusLabel} with nothing blocking you right now.`;
      }

      return `You’re stuck in ${statusLabel}. The main thing holding you up: ${criticalBlockers
        .slice(0, 2)
        .map((blocker) => humanizeBlockerMessage(blocker.message, blocker.field))
        .join(" and ")}.`;
    case "requirements":
      if (missingFields.length === 0) {
        return `Nothing missing — the next move from ${statusLabel} is ready to go.`;
      }

      return `Before you can move on from ${statusLabel}, finish the ${humanizeFieldList(missingFields)}.`;
    case "ownership":
      if (input.context.userRole === "admin") {
        return `As an admin, you can guide or unblock this record even when you aren’t the current assignee.`;
      }

      if (input.context.userIsOwner) {
        return `You’re the one on this — once the checklist is satisfied, you can move it forward.`;
      }

      return `You’re not the assignee right now, so the next transition has to come from whoever owns it.`;
    case "transition": {
      const nextStage = input.context.nextAllowedStages[0];
      if (!nextStage) {
        return `This one’s already at ${statusLabel} — it’s the final stage, there’s nothing further to move to.`;
      }

      if (criticalBlockers.length > 0) {
        return `You can’t move to ${humanizeStatus(nextStage)} yet — a couple of requirements still need to be wrapped up.`;
      }

      return `You’re good to move from ${statusLabel} to ${humanizeStatus(nextStage)}.`;
    }
    case "quality":
      if (input.qualityIssues.length === 0) {
        return `Quality looks good — no warnings on this one.`;
      }

      return `A couple of quality things to tighten up: ${input.qualityIssues
        .slice(0, 2)
        .map((issue) => issue.message)
        .join(" and ")}.`;
    case "status":
      return `You’re in ${statusLabel}. ${
        input.canProceed ? "Ready to move to the next step." : "A few things still need to be finished first."
      }`;
    case "next_steps":
    case "general":
    default:
      if (input.canProceed) {
        return `You’re in ${statusLabel} and clear to move forward — just take the next action.`;
      }

      return `You’re in ${statusLabel}. Clear the blockers below and you’ll be ready for the next step.`;
  }
}

/**
 * Humanize a blocker message when it is a raw field-required string.
 * Leaves custom human-written messages (ownership, permission) as-is.
 */
function humanizeBlockerMessage(message: string | undefined, field: string | undefined): string {
  if (message && /is required$/i.test(message) && field) {
    return `${humanizeField(field)} is still missing`;
  }
  return message || "a workflow requirement";
}

function buildIntentAwareNextSteps(intent: AskAIIntent, input: PromptRoutingInput): string[] {
  const missingFields = getMissingFields(input.blockers);
  const qualitySteps = input.qualityIssues.map((issue) => issue.message);

  if (intent === "requirements" && missingFields.length > 0) {
    return dedupeSteps([
      ...missingFields.map((field) => `Add the ${humanizeField(field)}.`),
      ...input.deterministicNextSteps
    ]);
  }

  if (intent === "quality" && qualitySteps.length > 0) {
    return dedupeSteps([
      ...qualitySteps,
      ...input.deterministicNextSteps
    ]);
  }

  if (intent === "status") {
    const nextStage = input.context.nextAllowedStages[0];
    return dedupeSteps([
      `You’re currently in ${humanizeStatus(input.context.currentStatus)}.`,
      nextStage
        ? `Next up: ${humanizeStatus(nextStage)}.`
        : "This is the final stage — nothing further to move to.",
      ...input.deterministicNextSteps
    ]);
  }

  if (intent === "ownership" && !input.context.userIsOwner && input.context.userRole !== "admin") {
    return dedupeSteps([
      "Ask the current assignee to take the next step, or request reassignment.",
      ...input.deterministicNextSteps
    ]);
  }

  if (intent === "blockers" && input.blockers.length === 0) {
    return dedupeSteps([
      "Nothing’s in the way — go ahead with the next move.",
      ...input.deterministicNextSteps
    ]);
  }

  return dedupeSteps(input.deterministicNextSteps);
}

function getMissingFields(blockers: Blocker[]): string[] {
  return blockers
    .filter((blocker) => blocker.type === "missing_field" && blocker.field)
    .map((blocker) => blocker.field as string);
}

function dedupeSteps(steps: string[]): string[] {
  const cleanSteps = steps
    .map((step) => step.trim())
    .filter(Boolean);

  return [...new Set(cleanSteps)].slice(0, 5);
}
