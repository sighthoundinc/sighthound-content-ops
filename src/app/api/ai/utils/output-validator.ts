/**
 * Output Validator
 *
 * Runtime guard that re-checks every Gemini response before it is surfaced
 * to the user. Rejects drift into:
 *   - Content generation (captions, copy, titles, etc.)
 *   - Raw enum leakage (e.g. `ready_to_publish`, `canva_url`)
 *   - Length / shape violations (defensive second layer on top of Zod)
 *
 * A rejected response causes the caller to fall back to the deterministic
 * pipeline (same behaviour as if Gemini had timed out).
 */

import {
  BANNED_RAW_ENUMS,
  CONTENT_GENERATION_SIGNALS,
} from "./canonical-labels";

export interface OutputValidationIssue {
  code:
    | "content_generation"
    | "banned_enum"
    | "empty_answer"
    | "answer_too_long"
    | "next_step_too_long"
    | "too_many_next_steps";
  detail: string;
}

export interface OutputValidationResult {
  ok: boolean;
  issues: OutputValidationIssue[];
}

export interface ValidatableGeminiOutput {
  answer: string;
  nextSteps?: string[];
}

const MAX_ANSWER_CHARS = 600;
const MAX_NEXT_STEP_CHARS = 240;
const MAX_NEXT_STEPS = 5;

export function validateGeminiOutput(
  output: ValidatableGeminiOutput
): OutputValidationResult {
  const issues: OutputValidationIssue[] = [];

  const answer = (output.answer ?? "").trim();
  const lower = answer.toLowerCase();

  if (!answer) {
    issues.push({ code: "empty_answer", detail: "Gemini returned an empty answer" });
  } else if (answer.length > MAX_ANSWER_CHARS) {
    issues.push({
      code: "answer_too_long",
      detail: `Answer exceeded ${MAX_ANSWER_CHARS} characters`,
    });
  }

  for (const phrase of CONTENT_GENERATION_SIGNALS) {
    if (lower.includes(phrase)) {
      issues.push({
        code: "content_generation",
        detail: `Answer contained content-generation signal: "${phrase}"`,
      });
      break;
    }
  }

  for (const enumKey of BANNED_RAW_ENUMS) {
    const wordBoundary = new RegExp(`\\b${enumKey}\\b`, "i");
    if (wordBoundary.test(answer)) {
      issues.push({
        code: "banned_enum",
        detail: `Answer contained banned raw enum: "${enumKey}"`,
      });
      break;
    }
  }

  const steps = Array.isArray(output.nextSteps) ? output.nextSteps : [];
  if (steps.length > MAX_NEXT_STEPS) {
    issues.push({
      code: "too_many_next_steps",
      detail: `nextSteps returned ${steps.length} items (max ${MAX_NEXT_STEPS})`,
    });
  }
  for (const step of steps) {
    if (typeof step !== "string") continue;
    if (step.length > MAX_NEXT_STEP_CHARS) {
      issues.push({
        code: "next_step_too_long",
        detail: `A next step exceeded ${MAX_NEXT_STEP_CHARS} characters`,
      });
      break;
    }
    const stepLower = step.toLowerCase();
    for (const phrase of CONTENT_GENERATION_SIGNALS) {
      if (stepLower.includes(phrase)) {
        issues.push({
          code: "content_generation",
          detail: `A next step contained content-generation signal: "${phrase}"`,
        });
        break;
      }
    }
  }

  return { ok: issues.length === 0, issues };
}
