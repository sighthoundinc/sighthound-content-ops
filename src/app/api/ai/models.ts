/**
 * AI Assistant Models
 *
 * TypeScript interfaces and types for Phase 0 deterministic workflow intelligence.
 * Shared models across API endpoint and client consumers.
 */

import { DeterministicResult } from "./utils/response-generator";
import { DEFAULT_ASK_AI_PROMPT, type AskAIIntent } from "./types";
import type { AskAISafeLink } from "./utils/safe-links";

/**
 * API Request Model
 */
export interface AskAIRequest {
  entityType: "blog" | "social_post" | "idea" | "workspace";
  /** Required for entity-scoped queries; omitted/ignored when entityType === 'workspace'. */
  entityId?: string;
  userId: string;
  userRole: "writer" | "publisher" | "editor" | "admin";
  prompt?: string;
  /** Optional IANA timezone for date-formatting in responses. */
  userTimezone?: string;
}

/**
 * API Response Model
 */
export interface AskAIResponse {
  success: boolean;
  data?: {
    currentState: {
      entityType: string;
      status: string;
      userRole: string;
      isOwner: boolean;
    };
    blockers: Array<{
      type: string;
      severity: string;
      field?: string;
      message?: string;
    }>;
    nextSteps: string[];
    qualityIssues: Array<{
      type: string;
      severity: string;
      field: string;
      message: string;
      currentLength?: number;
      minLength?: number;
      maxLength?: number;
    }>;
    canProceed: boolean;
    confidence: number;
    prompt: string;
    questionIntent: AskAIIntent;
    answer: string;
    responseSource: "deterministic" | "gemini";
    aiModel?: string;
    /** Human-readable reason Gemini didn't answer. Only set on deterministic fallback. */
    fallbackReason?: string;
    links?: AskAISafeLink[];
    assignee?: {
      name?: string;
      role?: string;
    } | null;
    rateLimit?: {
      remaining: number;
    };
  };
  error?: {
    code: string;
    message: string;
  };
  generatedAt: string;
}

/**
 * Formatted Response Model
 */
export interface FormattedAIResponse {
  state: string;
  blockers: string[];
  nextSteps: string[];
  qualityIssues: string[];
  confidence: number;
  formattedText?: string;
}

/**
 * API Error Response
 */
export interface APIErrorResponse {
  success: false;
  error: {
    code:
      | "INVALID_INPUT"
      | "NOT_FOUND"
      | "UNAUTHORIZED"
      | "INTERNAL_ERROR"
      | "RATE_LIMITED";
    message: string;
    retryAfterSeconds?: number;
  };
  generatedAt: string;
}

/**
 * Validation error detail
 */
export interface ValidationError {
  field: string;
  message: string;
}

/**
 * Type guard for successful response
 */
export function isSuccessResponse(response: AskAIResponse | APIErrorResponse): response is AskAIResponse {
  return response.success === true;
}

/**
 * Type guard for error response
 */
export function isErrorResponse(response: AskAIResponse | APIErrorResponse): response is APIErrorResponse {
  return response.success === false;
}

export interface AskAIResultExtras {
  links?: AskAISafeLink[];
  assignee?: { name?: string; role?: string } | null;
  rateLimitRemaining?: number;
  fallbackReason?: string;
}

/**
 * Convert DeterministicResult to API response
 */
export function resultToAPIResponse(
  result: DeterministicResult,
  extras: AskAIResultExtras = {}
): AskAIResponse {
  return {
    success: true,
    data: {
      currentState: result.currentState,
      blockers: result.blockers,
      nextSteps: result.nextSteps,
      qualityIssues: result.qualityIssues,
      canProceed: result.canProceed,
      confidence: result.confidence,
      prompt: result.prompt || DEFAULT_ASK_AI_PROMPT,
      questionIntent: result.questionIntent || "general",
      answer: result.answer || result.nextSteps[0] || "No additional guidance available.",
      responseSource: result.responseSource || "deterministic",
      aiModel: result.aiModel,
      fallbackReason: extras.fallbackReason,
      links: extras.links ?? [],
      assignee: extras.assignee ?? null,
      rateLimit:
        typeof extras.rateLimitRemaining === "number"
          ? { remaining: extras.rateLimitRemaining }
          : undefined,
    },
    generatedAt: result.generatedAt
  };
}

/**
 * Create error response
 */
export function createErrorResponse(
  code:
    | "INVALID_INPUT"
    | "NOT_FOUND"
    | "UNAUTHORIZED"
    | "INTERNAL_ERROR"
    | "RATE_LIMITED",
  message: string,
  extras: { retryAfterSeconds?: number } = {}
): APIErrorResponse {
  return {
    success: false,
    error: {
      code,
      message,
      retryAfterSeconds: extras.retryAfterSeconds,
    },
    generatedAt: new Date().toISOString(),
  };
}

/**
 * Validate request
 */
export function validateAIRequest(data: unknown): { valid: boolean; errors?: ValidationError[] } {
  if (!data || typeof data !== "object") {
    return {
      valid: false,
      errors: [{ field: "body", message: "Request body is required and must be JSON" }]
    };
  }

  const errors: ValidationError[] = [];
  const req = data as Record<string, unknown>;

  const entityType = req.entityType as string | undefined;
  if (!entityType || !["blog", "social_post", "idea", "workspace"].includes(entityType)) {
    errors.push({
      field: "entityType",
      message: "entityType is required and must be blog, social_post, idea, or workspace",
    });
  }

  if (entityType !== "workspace") {
    if (!req.entityId || typeof req.entityId !== "string") {
      errors.push({ field: "entityId", message: "entityId is required and must be a string" });
    }
  }

  if (!req.userId || typeof req.userId !== "string") {
    errors.push({ field: "userId", message: "userId is required and must be a string" });
  }

  if (!req.userRole || !["writer", "publisher", "editor", "admin"].includes(req.userRole as string)) {
    errors.push({ field: "userRole", message: "userRole is required and must be writer, publisher, editor, or admin" });
  }

  if (req.prompt !== undefined) {
    if (typeof req.prompt !== "string") {
      errors.push({ field: "prompt", message: "prompt must be a string when provided" });
    } else if (!req.prompt.trim()) {
      errors.push({ field: "prompt", message: "prompt cannot be empty when provided" });
    } else if (req.prompt.trim().length > 500) {
      errors.push({ field: "prompt", message: "prompt must be 500 characters or fewer" });
    }
  }

  if (req.userTimezone !== undefined) {
    if (typeof req.userTimezone !== "string") {
      errors.push({
        field: "userTimezone",
        message: "userTimezone must be a string when provided",
      });
    } else if (req.userTimezone.length > 64) {
      errors.push({
        field: "userTimezone",
        message: "userTimezone must be 64 characters or fewer",
      });
    }
  }

  return {
    valid: errors.length === 0,
    errors: errors.length > 0 ? errors : undefined
  };
}
