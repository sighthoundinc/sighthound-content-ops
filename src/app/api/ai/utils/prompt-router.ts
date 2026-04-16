import { DEFAULT_ASK_AI_PROMPT, type AskAIIntent } from "../types";
import type { ExtractedContext } from "./context-extractor";
import type { Blocker } from "@/lib/blocker-detector";
import type { QualityIssue } from "@/lib/quality-checker";
import {
  humanizeDateOnly,
  humanizeDuration,
  humanizeField,
  humanizeFieldList,
  humanizeStatus,
} from "./humanize";

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

// Factual intents are checked first so questions like "what is the title"
// don't get intercepted by generic keywords such as "title" under "quality".
const INTENT_KEYWORDS: Array<{ intent: AskAIIntent; keywords: string[] }> = [
  {
    intent: "identity",
    keywords: [
      "what is the name",
      "what's the name",
      "whats the name",
      "what is the title",
      "what's the title",
      "whats the title",
      "blog name",
      "blog title",
      "what is this blog",
      "what's this blog",
      "name of this",
      "title of this",
    ],
  },
  {
    intent: "people",
    keywords: [
      "who wrote",
      "who's the writer",
      "whos the writer",
      "who is the writer",
      "who is the author",
      "who's the author",
      "who is the publisher",
      "who's the publisher",
      "who published",
      "who is assigned",
      "who is the assignee",
      "writer of this",
      "publisher of this",
    ],
  },
  {
    intent: "timeline",
    keywords: [
      "when was",
      "when did",
      "publish date",
      "published on",
      "how long",
      "how many days",
      "created on",
      "draft to publish",
      "time to publish",
    ],
  },
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

const FACTUAL_INTENTS: ReadonlySet<AskAIIntent> = new Set([
  "identity",
  "people",
  "timeline",
]);

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

  // Factual intents read strictly from grounded facts to avoid hallucination.
  if (FACTUAL_INTENTS.has(intent)) {
    const factualAnswer = buildFactualAnswer(intent, input);
    if (factualAnswer) {
      return {
        prompt,
        intent,
        answer: factualAnswer,
        nextSteps: [],
      };
    }
    // If facts are unavailable, fall through to workflow-style answer.
  }

  const answer = buildAnswer(intent, input);
  const nextSteps = buildIntentAwareNextSteps(intent, input);

  return {
    prompt,
    intent,
    answer,
    nextSteps
  };
}

/**
 * Build a factual answer strictly from the grounded FactContext.
 * Returns null when the intent isn't covered by the current facts
 * (caller falls back to workflow-style answer).
 */
function buildFactualAnswer(
  intent: AskAIIntent,
  input: PromptRoutingInput
): string | null {
  const facts = input.context.facts;
  if (!facts) return null;

  if (facts.kind === "blog") {
    switch (intent) {
      case "identity": {
        if (!facts.title) {
          return "I don’t have a title on record for this blog.";
        }
        if (facts.site) {
          return `This blog is “${facts.title}” on ${facts.site}.`;
        }
        return `This blog is “${facts.title}”.`;
      }
      case "people": {
        const parts: string[] = [];
        if (facts.writerName) parts.push(`${facts.writerName} wrote it`);
        if (facts.publisherName) parts.push(`${facts.publisherName} handled publishing`);
        if (parts.length > 0) {
          return `${parts.join(" and ")}.`;
        }
        return "I don’t know who’s assigned on this blog yet.";
      }
      case "timeline": {
        const bits: string[] = [];
        if (facts.createdAt) {
          bits.push(`drafted ${humanizeDateOnly(facts.createdAt)}`);
        }
        const publishedLabel =
          facts.displayPublishedDate ?? facts.actualPublishedAt;
        if (publishedLabel) {
          bits.push(`published ${humanizeDateOnly(publishedLabel)}`);
        }
        if (typeof facts.timeToPublishDays === "number") {
          bits.push(
            `took ${humanizeDuration(facts.timeToPublishDays)} from draft to publish`
          );
        } else if (facts.scheduledPublishDate && !publishedLabel) {
          bits.push(
            `scheduled for ${humanizeDateOnly(facts.scheduledPublishDate)}`
          );
        }
        if (bits.length === 0) {
          return "I don’t have enough timeline info for this blog.";
        }
        // Capitalize first letter for readability.
        const sentence = bits.join(", ");
        return `${sentence[0].toUpperCase()}${sentence.slice(1)}.`;
      }
      default:
        return null;
    }
  }

  return null;
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
