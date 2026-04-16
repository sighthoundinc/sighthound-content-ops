import { DEFAULT_ASK_AI_PROMPT, type AskAIIntent } from "../types";
import type { ExtractedContext } from "./context-extractor";
import type { Blocker } from "@/lib/blocker-detector";
import type { QualityIssue } from "@/lib/quality-checker";

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
  const statusLabel = formatFieldLabel(input.context.currentStatus);
  const criticalBlockers = input.blockers.filter((blocker) => blocker.severity === "critical");
  const missingFields = getMissingFields(input.blockers);

  switch (intent) {
    case "blockers":
      if (criticalBlockers.length === 0) {
        return `You are in ${statusLabel} with no critical blockers right now.`;
      }

      return `You are blocked in ${statusLabel}. Main blockers: ${criticalBlockers
        .slice(0, 2)
        .map((blocker) => blocker.message || "workflow gate")
        .join("; ")}.`;
    case "requirements":
      if (missingFields.length === 0) {
        return `All required fields for the next transition from ${statusLabel} are currently complete.`;
      }

      return `Before moving forward from ${statusLabel}, complete: ${missingFields
        .map(formatFieldLabel)
        .join(", ")}.`;
    case "ownership":
      if (input.context.userRole === "admin") {
        return `You can review and guide this record as an admin, even when you are not the current assignee.`;
      }

      if (input.context.userIsOwner) {
        return `You are currently assigned to this record and can perform the next workflow action if gates are satisfied.`;
      }

      return `You are not the current assignee, so transition actions may be blocked until ownership is reassigned.`;
    case "transition": {
      const nextStage = input.context.nextAllowedStages[0];
      if (!nextStage) {
        return `This record is already in ${statusLabel}, which is a terminal stage with no next transition.`;
      }

      if (criticalBlockers.length > 0) {
        return `You cannot transition to ${formatFieldLabel(nextStage)} yet because required workflow gates are still failing.`;
      }

      return `You can transition from ${statusLabel} to ${formatFieldLabel(nextStage)} now.`;
    }
    case "quality":
      if (input.qualityIssues.length === 0) {
        return `No quality warnings are currently detected for this record.`;
      }

      return `Quality needs attention before handoff. Focus on: ${input.qualityIssues
        .slice(0, 2)
        .map((issue) => issue.message)
        .join("; ")}.`;
    case "status":
      return `This record is currently in ${statusLabel}. ${
        input.canProceed ? "It is ready for the next transition." : "Some gates still need to be completed."
      }`;
    case "next_steps":
    case "general":
    default:
      if (input.canProceed) {
        return `You are in ${statusLabel}. Complete the next recommended action to move this record forward.`;
      }

      return `You are in ${statusLabel}. Resolve the listed blockers first, then continue with the next transition action.`;
  }
}

function buildIntentAwareNextSteps(intent: AskAIIntent, input: PromptRoutingInput): string[] {
  const missingFields = getMissingFields(input.blockers);
  const qualitySteps = input.qualityIssues.map((issue) => issue.message);

  if (intent === "requirements" && missingFields.length > 0) {
    return dedupeSteps([
      ...missingFields.map((field) => `Complete required field: ${formatFieldLabel(field)}`),
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
      `Current stage: ${formatFieldLabel(input.context.currentStatus)}`,
      nextStage ? `Next allowed stage: ${formatFieldLabel(nextStage)}` : "No further transition available from this stage.",
      ...input.deterministicNextSteps
    ]);
  }

  if (intent === "ownership" && !input.context.userIsOwner && input.context.userRole !== "admin") {
    return dedupeSteps([
      "Request reassignment to yourself or ask the current assignee to complete the transition.",
      ...input.deterministicNextSteps
    ]);
  }

  if (intent === "blockers" && input.blockers.length === 0) {
    return dedupeSteps([
      "No blockers detected. Continue with the next transition.",
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

function formatFieldLabel(value: string): string {
  return value.replace(/_/g, " ");
}

function dedupeSteps(steps: string[]): string[] {
  const cleanSteps = steps
    .map((step) => step.trim())
    .filter(Boolean);

  return [...new Set(cleanSteps)].slice(0, 5);
}
