import { z } from "zod";
import { ASK_AI_INTENTS, type AskAIIntent } from "../types";
import type { Blocker } from "@/lib/blocker-detector";
import type { QualityIssue } from "@/lib/quality-checker";
import type { ExtractedContext } from "./context-extractor";
import { buildCanonicalStatusAllowListText } from "./canonical-labels";
import { validateGeminiOutput } from "./output-validator";
import type { AskAISafeLink } from "./safe-links";

const GeminiLinkSchema = z.object({
  key: z.string().min(1).max(40),
  label: z.string().min(1).max(60),
  kind: z.enum(["internal", "external"]),
});

const GeminiAssistantSchema = z.object({
  intent: z.enum(ASK_AI_INTENTS),
  answer: z.string().min(1).max(600),
  nextSteps: z.array(z.string().min(1).max(240)).max(5).optional(),
  confidence: z.number().min(0).max(100).optional(),
  links: z.array(GeminiLinkSchema).max(4).optional(),
});

export interface GeminiGuidanceInput {
  prompt: string;
  context: ExtractedContext;
  blockers: Blocker[];
  qualityIssues: QualityIssue[];
  nextSteps: string[];
  canProceed: boolean;
  /** Server-curated links Gemini may reference by `key`. Never generated. */
  safeLinks?: AskAISafeLink[];
  /** Optional flag — workspace queries use a heavier model by default. */
  preferComplexModel?: boolean;
}

export interface GeminiGuidanceOutput {
  intent: AskAIIntent;
  answer: string;
  nextSteps: string[];
  confidence?: number;
  model: string;
  links: AskAISafeLink[];
  /** Set when the validator rejected the response and we should fall back. */
  validatorFailed?: boolean;
}

export type GeminiFailureReason =
  | "unconfigured"
  | "rate_limited"
  | "model_unavailable"
  | "network_error"
  | "timeout"
  | "empty_response"
  | "parse_error"
  | "schema_invalid"
  | "validator_rejected"
  | "unknown";

/**
 * Human-readable reason derived from a structured failure code.
 * Used in user-facing error messages when deterministic fallback is disabled.
 */
export function describeGeminiFailure(reason: GeminiFailureReason): string {
  switch (reason) {
    case "unconfigured":
      return "the AI service is not configured";
    case "rate_limited":
      return "we've temporarily hit the AI rate limit";
    case "model_unavailable":
      return "Google Gemini is experiencing high demand";
    case "network_error":
      return "a network issue reaching Google Gemini";
    case "timeout":
      return "the AI response timed out";
    case "empty_response":
      return "the AI returned an empty response";
    case "parse_error":
      return "the AI returned an unexpected format";
    case "schema_invalid":
      return "the AI response didn't match the expected shape";
    case "validator_rejected":
      return "the AI response failed safety checks";
    default:
      return "an unknown AI error occurred";
  }
}

/** Stored on module state so the route can surface the last outage reason. */
let lastFailure: { reason: GeminiFailureReason; at: number } | null = null;

export function getLastGeminiFailure(): GeminiFailureReason | null {
  if (!lastFailure) return null;
  // Stale reasons (>2min old) aren't useful for the current request.
  if (Date.now() - lastFailure.at > 2 * 60 * 1000) {
    lastFailure = null;
    return null;
  }
  return lastFailure.reason;
}

function recordFailure(reason: GeminiFailureReason): null {
  lastFailure = { reason, at: Date.now() };
  return null;
}

interface GeminiResponsePayload {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
  }>;
}

const GEMINI_SYSTEM_INSTRUCTIONS = [
  "You are Sighthound Content Relay's read-only, advisory assistant for a specific record (blog, social post, or idea).",
  "The 'facts' object in the snapshot is a comprehensive mirror of what the user sees on the page: metadata, assignees, dates, links, recent comments, recent activity history, and linked social posts (for blogs). Treat it as your source of truth.",
  "You may summarise comments, describe the activity/change history, list linked social posts, recall URLs, and explain ownership — all strictly from the supplied facts.",
  "You NEVER generate captions, titles, blog copy, tweets, headlines, or any creative content. Summaries of existing user content are OK; new creative content is not.",
  "You NEVER suggest bypassing workflow rules, permissions, or required-field gates.",
  "If a specific fact isn't present in the snapshot, say you don't have that on record — don't invent names, dates, URLs, titles, or quotes.",
  'Write in a warm, natural, second-person tone ("you"). 1 to 4 short sentences. No markdown.',
  "If the user asks what powers you, what model you use, or a similar meta-question about the assistant itself, answer truthfully: you are a read-only advisory assistant in Sighthound Content Relay, powered by Google Gemini. Never deny the underlying model. Set intent to 'meta' for these questions and keep nextSteps empty.",
  "Never expose raw enum keys or internal column names (e.g. 'ready_to_publish', 'canva_url', 'publisher_id'). Use friendly names.",
  `Use only these canonical status labels when naming a stage: ${buildCanonicalStatusAllowListText()}.`,
  "Keep the answer under 600 characters. Keep each next step under 220 characters.",
  "When referencing a resource, include it in the 'links' array by its supplied 'key'. Never invent URLs.",
  "When summarising comments, attribute by author name when available and keep it concise; when summarising activity, describe events in plain language (e.g. 'Assigned to Ali' not 'assigned_to_user_id changed').",
  "For purely factual lookup / identity / people / timeline questions, 'nextSteps' may be empty.",
  "Respond with strict JSON only. No prose preamble, no markdown fences.",
].join(" ");

function selectModels(preferComplexModel: boolean): string[] {
  const complexModel = process.env.ASK_AI_COMPLEX_MODEL?.trim();
  const defaultModel = process.env.GEMINI_MODEL?.trim() || "gemini-2.5-flash";
  const fallbackModel = process.env.ASK_AI_FALLBACK_MODEL?.trim();

  const chain: string[] = [];
  if (preferComplexModel && complexModel) chain.push(complexModel);
  chain.push(defaultModel);
  if (fallbackModel && !chain.includes(fallbackModel)) chain.push(fallbackModel);
  return chain;
}

export async function getGeminiGuidance(
  input: GeminiGuidanceInput
): Promise<GeminiGuidanceOutput | null> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    return recordFailure("unconfigured");
  }

  const models = selectModels(!!input.preferComplexModel);
  for (const model of models) {
    const result = await callGeminiForModel(apiKey, model, input);
    if (result) return result;
    // On hard Gemini failure (null) try the next model in the chain.
  }
  return null;
}

async function callGeminiForModel(
  apiKey: string,
  model: string,
  input: GeminiGuidanceInput
): Promise<GeminiGuidanceOutput | null> {
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
    model
  )}:generateContent?key=${encodeURIComponent(apiKey)}`;

  const payload = {
    systemInstruction: {
      parts: [{ text: GEMINI_SYSTEM_INSTRUCTIONS }],
    },
    contents: [
      {
        role: "user",
        parts: [{ text: buildGeminiPrompt(input) }],
      },
    ],
    generationConfig: {
      temperature: 0.1,
      // 1024 tokens is plenty for our schema (intent + answer + up to 5 next steps + up to 4 links)
      // while leaving headroom above the previous 500-token cap that was truncating responses.
      maxOutputTokens: 1024,
      responseMimeType: "application/json",
      // Gemini 2.5 models consume output budget on internal "thinking" tokens by
      // default. Our assistant is pure structured output with no chain-of-reasoning
      // needed, so we disable thinking to avoid truncation and reduce latency.
      thinkingConfig: {
        thinkingBudget: 0,
      },
    },
  };

  const MAX_ATTEMPTS = 3;
  const BASE_BACKOFF_MS = 500;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const isFinalAttempt = attempt === MAX_ATTEMPTS;
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(9000),
      });

      if (!response.ok) {
        let errorBody = "";
        try {
          errorBody = await response.text();
        } catch {
          // ignore
        }
        const transient = response.status === 429 || response.status >= 500;
        console.warn("[AI Assistant Gemini] non-200 response", {
          status: response.status,
          model,
          attempt,
          transient,
          body: errorBody.slice(0, 500),
        });
        if (transient && !isFinalAttempt) {
          const backoff =
            BASE_BACKOFF_MS * Math.pow(2, attempt - 1) + Math.floor(Math.random() * 250);
          await delay(backoff);
          continue;
        }
        if (response.status === 429) return recordFailure("rate_limited");
        if (response.status >= 500) return recordFailure("model_unavailable");
        return recordFailure("unknown");
      }

      const json = (await response.json()) as GeminiResponsePayload;
      const rawText = json.candidates?.[0]?.content?.parts
        ?.map((part) => part.text || "")
        .join("\n")
        .trim();

      if (!rawText) {
        console.warn("[AI Assistant Gemini] empty response text", { model, attempt });
        return recordFailure("empty_response");
      }

      const parsedJson = parseJsonFromGemini(rawText);
      if (!parsedJson) {
        console.warn("[AI Assistant Gemini] unable to parse JSON", {
          model,
          attempt,
          rawPreview: rawText.slice(0, 200),
        });
        return recordFailure("parse_error");
      }

      const parsed = GeminiAssistantSchema.safeParse(parsedJson);
      if (!parsed.success) {
        console.warn("[AI Assistant Gemini] invalid output schema", {
          model,
          attempt,
          issues: parsed.error.issues.slice(0, 3),
          rawPreview: rawText.slice(0, 200),
        });
        return recordFailure("schema_invalid");
      }

      const validation = validateGeminiOutput({
        answer: parsed.data.answer,
        nextSteps: parsed.data.nextSteps,
      });
      if (!validation.ok) {
        console.warn("[AI Assistant Gemini] output validator rejected response", {
          model,
          attempt,
          issues: validation.issues.slice(0, 3),
        });
        recordFailure("validator_rejected");
        return {
          intent: "general",
          answer: "",
          nextSteps: [],
          links: [],
          model,
          validatorFailed: true,
        };
      }

      const safeLinksByKey = new Map(
        (input.safeLinks ?? []).map((link) => [link.key, link] as const)
      );
      const resolvedLinks = (parsed.data.links ?? [])
        .map((suggested) => {
          const match = safeLinksByKey.get(suggested.key);
          if (!match) return null;
          return {
            ...match,
            label: suggested.label.trim() || match.label,
          } satisfies AskAISafeLink;
        })
        .filter((link): link is AskAISafeLink => !!link);

      return {
        intent: parsed.data.intent,
        answer: parsed.data.answer.trim(),
        nextSteps: parsed.data.nextSteps || [],
        confidence: parsed.data.confidence,
        links: resolvedLinks,
        model,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const transient =
        error instanceof Error &&
        (error.name === "AbortError" ||
          error.name === "TimeoutError" ||
          /fetch|network|timeout|ECONN|ENOTFOUND/i.test(message));
      console.warn("[AI Assistant Gemini] request threw", {
        model,
        attempt,
        transient,
        message,
      });
      if (transient && !isFinalAttempt) {
        const backoff =
          BASE_BACKOFF_MS * Math.pow(2, attempt - 1) + Math.floor(Math.random() * 250);
        await delay(backoff);
        continue;
      }
      if (error instanceof Error && (error.name === "AbortError" || error.name === "TimeoutError")) {
        return recordFailure("timeout");
      }
      return recordFailure("network_error");
    }
  }
  return recordFailure("unknown");
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function buildGeminiPrompt(input: GeminiGuidanceInput): string {
  const workflowSnapshot = {
    prompt: input.prompt,
    entityType: input.context.entityType,
    status: input.context.currentStatus,
    userRole: input.context.userRole,
    userIsOwner: input.context.userIsOwner,
    userIsReviewer: input.context.userIsReviewer,
    canProceed: input.canProceed,
    nextAllowedStages: input.context.nextAllowedStages,
    blockers: input.blockers.map((blocker) => ({
      type: blocker.type,
      severity: blocker.severity,
      message: blocker.message,
      field: blocker.field,
    })),
    qualityIssues: input.qualityIssues.map((issue) => ({
      severity: issue.severity,
      field: issue.field,
      message: issue.message,
    })),
    deterministicNextSteps: input.nextSteps,
    facts: input.context.facts ?? null,
    availableLinks: (input.safeLinks ?? []).map((link) => ({
      key: link.key,
      label: link.label,
      kind: link.kind,
    })),
  };

  return [
    "Interpret the user's question and respond conversationally from the snapshot below.",
    "If they ask for a link or URL, include the matching entry in 'links' (by its 'key') AND mention the resource in the answer by name. Never paste invented URLs.",
    "If they ask a factual question (title, author, publisher, dates, durations), answer from 'facts' only. If missing, say you don't have it on record.",
    "For workflow questions (blockers, next steps, transitions, ownership, quality, status), use the deterministic fields plus 'facts' for friendly names.",
    "Choose the best intent from: blockers | next_steps | requirements | ownership | transition | quality | status | identity | people | timeline | lookup | meta | general.",
    "Return JSON with exactly this shape:",
    '{"intent":"<intent>","answer":"string","nextSteps":["string"],"links":[{"key":"string","label":"string","kind":"internal|external"}],"confidence":0-100}',
    `Snapshot: ${JSON.stringify(workflowSnapshot)}`,
  ].join("\n");
}

function parseJsonFromGemini(rawText: string): unknown | null {
  const fencedMatch = rawText.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = (fencedMatch?.[1] || rawText).trim();

  try {
    return JSON.parse(candidate);
  } catch {
    return null;
  }
}
