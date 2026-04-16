import { z } from "zod";
import { ASK_AI_INTENTS, type AskAIIntent } from "../types";
import type { Blocker } from "@/lib/blocker-detector";
import type { QualityIssue } from "@/lib/quality-checker";
import type { ExtractedContext } from "./context-extractor";

const GeminiAssistantSchema = z.object({
  intent: z.enum(ASK_AI_INTENTS),
  answer: z.string().min(1).max(500),
  nextSteps: z.array(z.string().min(1).max(220)).max(5).optional(),
  confidence: z.number().min(0).max(100).optional()
});

export interface GeminiGuidanceInput {
  prompt: string;
  context: ExtractedContext;
  blockers: Blocker[];
  qualityIssues: QualityIssue[];
  nextSteps: string[];
  canProceed: boolean;
}

export interface GeminiGuidanceOutput {
  intent: AskAIIntent;
  answer: string;
  nextSteps: string[];
  confidence?: number;
  model: string;
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
  "You are a workflow guidance assistant for a content operations app.",
  "You must only provide advisory guidance about current stage, blockers, and next steps.",
  "Do not generate captions, social copy, blog content, or any creative content.",
  "Do not suggest bypassing workflow rules, permissions, or required field gates.",
  "Use only the supplied context. If data is missing, state uncertainty explicitly.",
  "Write in a warm, natural, second-person tone (\"you\").",
  "Never expose raw enum keys, field names, or status codes like 'ready_to_publish' or 'canva_url'.",
  "Use friendly labels instead (e.g. 'Ready to Publish', 'Canva link', 'Google Doc link').",
  "Keep the answer to 1 short sentence.",
  "Keep each next step to a single short, actionable sentence.",
  "Respond with strict JSON and no markdown.",
  // Factual-question grounding (RAG):
  "When the user asks a factual question about this record (title, author, publisher, dates, how long something took), answer only from the 'facts' object in the snapshot.",
  "If a requested fact is missing from 'facts', say you don't have that information on record — never invent titles, names, dates, or durations.",
  "For factual questions you can omit the 'nextSteps' array or keep it empty.",
].join(" ");

export async function getGeminiGuidance(input: GeminiGuidanceInput): Promise<GeminiGuidanceOutput | null> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    return null;
  }

  const model = process.env.GEMINI_MODEL?.trim() || "gemini-2.5-flash";
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;

  const payload = {
    systemInstruction: {
      parts: [{ text: GEMINI_SYSTEM_INSTRUCTIONS }]
    },
    contents: [
      {
        role: "user",
        parts: [{ text: buildGeminiPrompt(input) }]
      }
    ],
    generationConfig: {
      temperature: 0.1,
      maxOutputTokens: 400,
      responseMimeType: "application/json"
    }
  };

  const MAX_ATTEMPTS = 2;
  const RETRY_DELAY_MS = 400;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const isFinalAttempt = attempt === MAX_ATTEMPTS;
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(9000)
      });

      if (!response.ok) {
        let errorBody = "";
        try {
          errorBody = await response.text();
        } catch {
          // ignore read failure
        }
        const transient = response.status === 429 || response.status >= 500;
        console.warn("[AI Assistant Gemini] non-200 response", {
          status: response.status,
          model,
          attempt,
          transient,
          body: errorBody.slice(0, 500)
        });
        if (transient && !isFinalAttempt) {
          await delay(RETRY_DELAY_MS);
          continue;
        }
        return null;
      }

      const json = (await response.json()) as GeminiResponsePayload;
      const rawText = json.candidates?.[0]?.content?.parts
        ?.map((part) => part.text || "")
        .join("\n")
        .trim();

      if (!rawText) {
        console.warn("[AI Assistant Gemini] empty response text", { model, attempt });
        return null;
      }

      const parsedJson = parseJsonFromGemini(rawText);
      if (!parsedJson) {
        console.warn("[AI Assistant Gemini] unable to parse JSON", {
          model,
          attempt,
          rawPreview: rawText.slice(0, 200),
        });
        return null;
      }

      const parsed = GeminiAssistantSchema.safeParse(parsedJson);
      if (!parsed.success) {
        console.warn("[AI Assistant Gemini] invalid output schema", {
          model,
          attempt,
          issues: parsed.error.issues.slice(0, 3),
          rawPreview: rawText.slice(0, 200),
        });
        return null;
      }

      return {
        intent: parsed.data.intent,
        answer: parsed.data.answer.trim(),
        nextSteps: parsed.data.nextSteps || [],
        confidence: parsed.data.confidence,
        model
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
        await delay(RETRY_DELAY_MS);
        continue;
      }
      return null;
    }
  }
  return null;
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
      field: blocker.field
    })),
    qualityIssues: input.qualityIssues.map((issue) => ({
      severity: issue.severity,
      field: issue.field,
      message: issue.message
    })),
    deterministicNextSteps: input.nextSteps,
    // Grounded RAG-style facts (title, people, dates). May be null.
    facts: input.context.facts ?? null
  };

  return [
    "Interpret the question and provide guidance from the given snapshot.",
    "If the user is asking a factual question about this record (title, author, publisher, dates, durations), answer from the 'facts' object only. Never invent values that are not present in 'facts'.",
    "For workflow questions (blockers, next steps, transitions, ownership, quality, status), use the deterministic fields plus 'facts' for friendly names.",
    "Return JSON with this exact shape:",
    "{\"intent\":\"blockers|next_steps|requirements|ownership|transition|quality|status|identity|people|timeline|general\",\"answer\":\"string\",\"nextSteps\":[\"string\"],\"confidence\":0-100}",
    "Keep answer concise (1-2 sentences) and keep each next step actionable.",
    `Snapshot: ${JSON.stringify(workflowSnapshot)}`
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
