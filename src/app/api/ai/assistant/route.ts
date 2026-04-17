/**
 * Ask AI — workflow guidance endpoint.
 *
 * Read-only, advisory-only. Gemini-primary with deterministic fallback,
 * RLS-gated fact retrieval, safe-link curation, per-user rate limiting,
 * response caching, and fire-and-forget telemetry.
 */

import { NextRequest, NextResponse } from "next/server";
import {
  createClient,
  type PostgrestError,
  type SupabaseClient,
} from "@supabase/supabase-js";
import {
  AskAIRequest,
  AskAIResponse,
  APIErrorResponse,
  validateAIRequest,
  resultToAPIResponse,
  createErrorResponse,
} from "@/app/api/ai/models";
import { extractContextSync } from "@/app/api/ai/utils/context-extractor";
import { detectBlockers } from "@/lib/blocker-detector";
import { checkQuality, type QualityCheckResult } from "@/lib/quality-checker";
import { generateResponse } from "@/app/api/ai/utils/response-generator";
import {
  getRequiredFieldsForStatus,
  getNextStagesForStatus,
} from "@/lib/workflow-rules";
import {
  getGeminiGuidance,
  getLastGeminiFailure,
  describeGeminiFailure,
} from "@/app/api/ai/utils/gemini-client";
import {
  normalizePrompt,
  routePrompt,
} from "@/app/api/ai/utils/prompt-router";
import type { AskAIIntent } from "@/app/api/ai/types";
import { isMissingSocialOwnershipColumnsError } from "@/lib/social-post-schema";
import { getWorkflowStage } from "@/lib/status";
import type { PublisherStageStatus, WriterStageStatus } from "@/lib/types";
import { fetchFacts, type FactContext } from "@/app/api/ai/utils/fact-provider";
import { buildSafeLinks } from "@/app/api/ai/utils/safe-links";
import {
  buildCacheKey,
  getCachedResponse,
  setCachedResponse,
} from "@/app/api/ai/utils/response-cache";
import {
  checkRateLimit,
  seedRateLimitBucket,
} from "@/app/api/ai/utils/rate-limiter";
import { recordAskAIEvent } from "@/app/api/ai/utils/telemetry";
import { buildWorkspaceSnapshot } from "@/app/api/ai/utils/multi-entity-context";

interface EntityState {
  status: string;
  fields: Record<string, boolean>;
  ownerId: string;
  reviewerId?: string;
  title?: string;
  caption?: string;
  platforms?: string[];
  updatedAt?: string;
}

type SocialEntityStateRow = {
  id: string | null;
  status: string | null;
  product: string | null;
  type: string | null;
  canva_url: string | null;
  canva_page: number | null;
  caption: string | null;
  platforms: unknown;
  scheduled_date: string | null;
  created_by: string | null;
  worker_user_id: string | null;
  reviewer_user_id: string | null;
  assigned_to_user_id?: string | null;
  title: string | null;
  associated_blog_id: string | null;
  updated_at: string | null;
};

type EntityStateErrorCode = "not_found" | "unauthorized" | "query_error";

class EntityStateError extends Error {
  code: EntityStateErrorCode;
  constructor(code: EntityStateErrorCode, message: string) {
    super(message);
    this.code = code;
    this.name = "EntityStateError";
  }
}

function isUnauthorizedEntityQueryError(
  error: Pick<PostgrestError, "code" | "message" | "details" | "hint"> | null | undefined
) {
  if (!error) return false;
  const code = (error.code ?? "").toUpperCase();
  const text = `${error.message ?? ""} ${error.details ?? ""} ${error.hint ?? ""}`.toLowerCase();
  return (
    code === "42501" ||
    text.includes("permission denied") ||
    text.includes("row-level security")
  );
}

async function getEntityState(
  supabase: SupabaseClient,
  entityType: string,
  entityId: string,
  userId: string
): Promise<EntityState> {
  if (entityType === "blog") {
    const { data, error } = await supabase
      .from("blogs")
      .select(
        `id, title, writer_status, publisher_status, overall_status, google_doc_url, 
         writer_id, publisher_id, scheduled_publish_date, site, created_by, updated_at`
      )
      .eq("id", entityId)
      .maybeSingle();

    if (error) {
      console.error("[AI Assistant Blog Query Error]", { error, data });
      if (isUnauthorizedEntityQueryError(error)) {
        throw new EntityStateError("unauthorized", "Blog access denied");
      }
      throw new EntityStateError("query_error", `Blog query failed: ${error.message}`);
    }
    if (!data) {
      throw new EntityStateError("not_found", "Blog not found");
    }

    const writerStatus = (data.writer_status || "not_started") as WriterStageStatus;
    const publisherStatus = (data.publisher_status || "not_started") as PublisherStageStatus;
    const stage = getWorkflowStage({ writerStatus, publisherStatus });

    return {
      status: stage,
      fields: {
        title: !!data.title,
        writer_id: !!data.writer_id,
        draft_doc_link: !!data.google_doc_url,
        google_doc_url: !!data.google_doc_url,
        publisher_id: !!data.publisher_id,
        scheduled_publish_date: !!data.scheduled_publish_date,
      },
      ownerId: data.writer_id || data.created_by || userId,
      reviewerId: data.publisher_id,
      title: data.title || undefined,
      updatedAt: (data.updated_at as string | null) || undefined,
    };
  }

  if (entityType === "social_post") {
    const socialSelectWithOwnership = `
      id, status, product, type, canva_url, canva_page, caption,
      platforms, scheduled_date, created_by, worker_user_id, reviewer_user_id,
      assigned_to_user_id, title, associated_blog_id, updated_at
    `;
    const socialSelectLegacy = `
      id, status, product, type, canva_url, canva_page, caption,
      platforms, scheduled_date, created_by, worker_user_id, reviewer_user_id,
      title, associated_blog_id, updated_at
    `;

    let data: SocialEntityStateRow | null = null;
    let error: PostgrestError | null = null;
    {
      const result = await supabase
        .from("social_posts")
        .select(socialSelectWithOwnership)
        .eq("id", entityId)
        .maybeSingle();
      data = result.data as SocialEntityStateRow | null;
      error = result.error;
    }
    if (isMissingSocialOwnershipColumnsError(error)) {
      const fallback = await supabase
        .from("social_posts")
        .select(socialSelectLegacy)
        .eq("id", entityId)
        .maybeSingle();
      data = fallback.data as SocialEntityStateRow | null;
      error = fallback.error;
    }

    if (error) {
      console.error("[AI Assistant Social Post Query Error]", { error, data });
      if (isUnauthorizedEntityQueryError(error)) {
        throw new EntityStateError("unauthorized", "Social post access denied");
      }
      throw new EntityStateError("query_error", `Social post query failed: ${error.message}`);
    }
    if (!data) {
      throw new EntityStateError("not_found", "Social post not found");
    }

    const reviewerUserId =
      typeof data.reviewer_user_id === "string" ? data.reviewer_user_id : null;
    const workerUserId =
      typeof data.worker_user_id === "string" ? data.worker_user_id : null;
    const assignedToUserId =
      typeof data.assigned_to_user_id === "string" ? data.assigned_to_user_id : null;
    const derivedOwnerId =
      assignedToUserId ??
      (data.status === "in_review" || data.status === "creative_approved"
        ? reviewerUserId
        : workerUserId) ??
      (typeof data.created_by === "string" ? data.created_by : null) ??
      userId;

    return {
      status: data.status || "draft",
      fields: {
        product: !!data.product,
        type: !!data.type,
        canva_url: !!data.canva_url,
        canva_page: !!data.canva_page,
        caption: !!data.caption,
        platforms: Array.isArray(data.platforms) ? data.platforms.length > 0 : !!data.platforms,
        scheduled_publish_date: !!data.scheduled_date,
        title: !!data.title,
        associated_blog_id: !!data.associated_blog_id,
      },
      ownerId: derivedOwnerId,
      reviewerId: reviewerUserId ?? undefined,
      title: data.title || undefined,
      caption: data.caption || undefined,
      platforms: Array.isArray(data.platforms) ? (data.platforms as string[]) : [],
      updatedAt: data.updated_at || undefined,
    };
  }

  if (entityType === "idea") {
    const { data, error } = await supabase
      .from("blog_ideas")
      .select(
        "id,title,site,description,created_by,is_converted,converted_blog_id,created_at,updated_at"
      )
      .eq("id", entityId)
      .maybeSingle();

    if (error) {
      console.error("[AI Assistant Idea Query Error]", { error, data });
      if (isUnauthorizedEntityQueryError(error)) {
        throw new EntityStateError("unauthorized", "Idea access denied");
      }
      throw new EntityStateError("query_error", `Idea query failed: ${error.message}`);
    }
    if (!data) {
      throw new EntityStateError("not_found", "Idea not found");
    }

    return {
      status: "idea",
      fields: {
        title: !!data.title,
        site: !!data.site,
        description: !!data.description,
        converted_blog_id: !!data.converted_blog_id,
      },
      ownerId:
        (typeof data.created_by === "string" ? data.created_by : null) || userId,
      title: typeof data.title === "string" ? data.title : undefined,
      updatedAt: (data.updated_at as string | null) || (data.created_at as string | null) || undefined,
    };
  }

  throw new EntityStateError("query_error", `Unknown entity type: ${entityType}`);
}

function deriveAssignee(
  facts: FactContext
): { name?: string; role?: string } | null {
  if (!facts) return null;
  if (facts.kind === "blog") {
    if (facts.publisherName) return { name: facts.publisherName, role: "Publisher" };
    if (facts.writerName) return { name: facts.writerName, role: "Writer" };
    return null;
  }
  if (facts.kind === "social_post") {
    if (facts.assignedToName) return { name: facts.assignedToName, role: "Assigned to" };
    if (facts.reviewerName) return { name: facts.reviewerName, role: "Reviewer" };
    if (facts.creatorName) return { name: facts.creatorName, role: "Creator" };
    return null;
  }
  if (facts.kind === "idea") {
    if (facts.creatorName) return { name: facts.creatorName, role: "Submitted by" };
  }
  return null;
}

export async function POST(
  req: NextRequest
): Promise<NextResponse<AskAIResponse | APIErrorResponse>> {
  const startedAt = Date.now();
  try {
    const body = await req.json();

    const validation = validateAIRequest(body);
    if (!validation.valid) {
      const errorMsg =
        validation.errors?.map((e) => `${e.field}: ${e.message}`).join("; ") ||
        "Invalid request";
      return NextResponse.json(
        createErrorResponse("INVALID_INPUT", errorMsg),
        { status: 400 }
      );
    }

    const request = body as AskAIRequest;

    const authHeader = req.headers.get("Authorization") || "";
    const accessToken = authHeader.replace(/^Bearer\s+/i, "");
    if (!accessToken) {
      return NextResponse.json(
        createErrorResponse(
          "UNAUTHORIZED",
          "Please sign in to use the AI assistant"
        ),
        { status: 401 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
    const supabase = createClient(supabaseUrl, anonKey, {
      auth: { persistSession: false },
      global: {
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
      },
    });

    // Rate limit
    const isAdmin = request.userRole === "admin";
    const rate = checkRateLimit(request.userId, isAdmin);
    if (!rate.allowed) {
      // Seed the bucket asynchronously so subsequent workers stay in sync.
      seedRateLimitBucket(supabase, request.userId).catch(() => undefined);
      return NextResponse.json(
        createErrorResponse(
          "RATE_LIMITED",
          "You're asking a lot of questions — please wait a moment and try again.",
          { retryAfterSeconds: rate.retryAfterSeconds }
        ),
        {
          status: 429,
          headers: { "Retry-After": String(rate.retryAfterSeconds) },
        }
      );
    }

    // Workspace branch
    if (request.entityType === "workspace") {
      return await handleWorkspaceRequest(supabase, request, startedAt, rate.remaining);
    }

    // Entity branch — existing semantics.
    const entityId = request.entityId as string;
    let entityState: EntityState;
    try {
      entityState = await getEntityState(
        supabase,
        request.entityType,
        entityId,
        request.userId
      );
    } catch (dbError) {
      if (dbError instanceof EntityStateError) {
        console.error("[AI Assistant DB Error]", {
          code: dbError.code,
          message: dbError.message,
        });
        if (dbError.code === "unauthorized") {
          return NextResponse.json(
            createErrorResponse("UNAUTHORIZED", "You do not have access to this content"),
            { status: 403 }
          );
        }
        if (dbError.code === "not_found") {
          return NextResponse.json(
            createErrorResponse("NOT_FOUND", "Content not found"),
            { status: 404 }
          );
        }
        return NextResponse.json(
          createErrorResponse(
            "INTERNAL_ERROR",
            "Couldn't load content for AI guidance. Please try again."
          ),
          { status: 500 }
        );
      }
      const dbErrorMsg = dbError instanceof Error ? dbError.message : "Unknown DB error";
      console.error("[AI Assistant DB Error]", dbErrorMsg);
      return NextResponse.json(
        createErrorResponse(
          "INTERNAL_ERROR",
          "Couldn't load content for AI guidance. Please try again."
        ),
        { status: 500 }
      );
    }

    const normalizedPrompt = normalizePrompt(request.prompt);

    // Cache lookup — keyed by prompt + updated_at so we invalidate on record change.
    const cacheKey = buildCacheKey({
      userId: request.userId,
      entityType: request.entityType,
      entityId,
      updatedAt: entityState.updatedAt,
      prompt: normalizedPrompt,
    });
    const cached = getCachedResponse(cacheKey);
    if (cached) {
      recordAskAIEvent({
        userId: request.userId,
        entityType: request.entityType,
        entityId,
        intent: "cache_hit",
        responseSource: "cache",
        model: null,
        latencyMs: Date.now() - startedAt,
        hadError: false,
        cached: true,
      });
      return NextResponse.json(cached.data as AskAIResponse, { status: 200 });
    }

    let facts: FactContext = null;
    try {
      facts = await fetchFacts(supabase, request.entityType, entityId);
    } catch (factError) {
      console.warn(
        "[AI Assistant] fact provider failed",
        factError instanceof Error ? factError.message : factError
      );
    }

    const userTimezone =
      typeof request.userTimezone === "string" && request.userTimezone.trim().length > 0
        ? request.userTimezone.trim()
        : "America/New_York";

    const context = extractContextSync(
      {
        entityType: request.entityType,
        entityId,
        userId: request.userId,
        userRole: request.userRole,
      },
      entityState,
      facts,
      userTimezone
    );

    const requiredFieldsForStatus = getRequiredFieldsForStatus(
      request.entityType,
      context.currentStatus
    );
    const nextAllowedStages = getNextStagesForStatus(
      request.entityType,
      context.currentStatus
    );

    const blockerResult = detectBlockers({
      entityType: request.entityType,
      status: context.currentStatus,
      userRole: request.userRole,
      userIsOwner: context.userIsOwner,
      userIsReviewer: context.userIsReviewer,
      fields: context.fields,
      requiredFieldsForStatus,
      nextAllowedStages,
    });

    let qualityResult: QualityCheckResult = { issues: [], qualityScore: 100 };
    if (request.entityType === "blog") {
      qualityResult = checkQuality({
        entityType: "blog",
        title: entityState.title,
      });
    } else if (request.entityType === "social_post") {
      qualityResult = checkQuality({
        entityType: "social_post",
        caption: entityState.caption,
        platforms: entityState.platforms || [],
      });
    }

    const deterministicResult = generateResponse({
      context,
      blockers: blockerResult.blockers,
      qualityIssues: qualityResult.issues,
    });

    const safeLinks = buildSafeLinks(request.entityType, entityId, facts);

    let answer =
      deterministicResult.nextSteps[0] || "No additional guidance available.";
    let questionIntent: AskAIIntent = "general";
    let nextSteps = deterministicResult.nextSteps;
    let responseSource: "deterministic" | "gemini" = "deterministic";
    let aiModel: string | undefined;
    let confidence = deterministicResult.confidence;
    let resolvedLinks = safeLinks;
    let validatorFailed = false;

    const geminiGuidance = await getGeminiGuidance({
      prompt: normalizedPrompt,
      context,
      blockers: blockerResult.blockers,
      qualityIssues: qualityResult.issues,
      nextSteps: deterministicResult.nextSteps,
      canProceed: deterministicResult.canProceed,
      safeLinks,
    });

    if (geminiGuidance && !geminiGuidance.validatorFailed) {
      answer = geminiGuidance.answer;
      questionIntent = geminiGuidance.intent;
      nextSteps =
        geminiGuidance.nextSteps.length > 0
          ? geminiGuidance.nextSteps
          : deterministicResult.nextSteps;
      responseSource = "gemini";
      aiModel = geminiGuidance.model;
      if (typeof geminiGuidance.confidence === "number") {
        confidence = geminiGuidance.confidence;
      }
      if (geminiGuidance.links.length > 0) {
        resolvedLinks = geminiGuidance.links;
      }
    } else {
      validatorFailed = !!geminiGuidance?.validatorFailed;
      if (process.env.ASK_AI_REQUIRE_GEMINI === "true") {
        const reason = getLastGeminiFailure();
        const reasonText = reason
          ? describeGeminiFailure(reason)
          : "Google Gemini is temporarily unavailable";
        const userMessage = `Chat is not available currently due to ${reasonText}. Please try again shortly.`;

        // Record the outage so admins can see the 503s in telemetry.
        recordAskAIEvent({
          userId: request.userId,
          entityType: request.entityType,
          entityId,
          intent: reason ?? "gemini_unavailable",
          responseSource: "deterministic", // no successful source
          model: null,
          latencyMs: Date.now() - startedAt,
          hadError: true,
          cached: false,
          validatorFailed,
        });

        return NextResponse.json(
          createErrorResponse("INTERNAL_ERROR", userMessage),
          { status: 503 }
        );
      }
      const routedPrompt = routePrompt({
        prompt: normalizedPrompt,
        context,
        blockers: blockerResult.blockers,
        qualityIssues: qualityResult.issues,
        deterministicNextSteps: deterministicResult.nextSteps,
        canProceed: deterministicResult.canProceed,
      });
      answer = routedPrompt.answer;
      questionIntent = routedPrompt.intent;
      nextSteps = routedPrompt.nextSteps;
    }

    // Factual and meta/lookup intents don't need workflow scaffolding —
    // surfacing blockers/next-steps on them is noisy and robotic.
    // We also suppress scaffolding when Gemini returned a general answer,
    // since that's typically a conversational follow-up that doesn't need
    // the full workflow chrome.
    const nonWorkflowIntents = new Set<AskAIIntent>([
      "identity",
      "people",
      "timeline",
      "lookup",
      "meta",
    ]);
    const suppressWorkflowChrome =
      nonWorkflowIntents.has(questionIntent) ||
      (responseSource === "gemini" && questionIntent === "general");

    const result = {
      ...deterministicResult,
      blockers: suppressWorkflowChrome ? [] : deterministicResult.blockers,
      qualityIssues: suppressWorkflowChrome ? [] : deterministicResult.qualityIssues,
      nextSteps: suppressWorkflowChrome ? [] : nextSteps,
      confidence: suppressWorkflowChrome ? 0 : confidence,
      prompt: normalizedPrompt,
      questionIntent,
      answer,
      responseSource,
      aiModel,
    };

    const apiResponse = resultToAPIResponse(result, {
      links: resolvedLinks,
      assignee: deriveAssignee(facts),
      rateLimitRemaining: rate.remaining,
    });

    setCachedResponse(cacheKey, {
      data: apiResponse,
      generatedAt: apiResponse.generatedAt,
    });

    recordAskAIEvent({
      userId: request.userId,
      entityType: request.entityType,
      entityId,
      intent: questionIntent,
      responseSource,
      model: aiModel ?? null,
      latencyMs: Date.now() - startedAt,
      hadError: false,
      cached: false,
      validatorFailed,
    });

    return NextResponse.json(apiResponse, { status: 200 });
  } catch (error) {
    console.error("[AI Assistant Error]", error);
    return NextResponse.json(
      createErrorResponse("INTERNAL_ERROR", "Failed to generate workflow guidance"),
      { status: 500 }
    );
  }
}

/**
 * Workspace-wide guidance: aggregates owned/assigned blogs + social posts
 * and asks Gemini to summarise priorities. No cache on workspace (data
 * shifts frequently across items).
 */
async function handleWorkspaceRequest(
  supabase: SupabaseClient,
  request: AskAIRequest,
  startedAt: number,
  rateLimitRemaining: number
): Promise<NextResponse<AskAIResponse | APIErrorResponse>> {
  const snapshot = await buildWorkspaceSnapshot(supabase, request.userId);
  const normalizedPrompt = normalizePrompt(
    request.prompt || "What should I focus on today?"
  );

  const workspaceFacts = {
    kind: "workspace" as const,
    userId: snapshot.userId,
    blogsCount: snapshot.blogsCount,
    socialCount: snapshot.socialCount,
    overdueCount: snapshot.overdueCount,
    items: snapshot.items,
  };

  // Fake context for workspace — reuses types but with workspace semantics.
  const context = extractContextSync(
    {
      entityType: "blog", // coerced; only used for workflow-rule hooks that we bypass below
      entityId: request.userId,
      userId: request.userId,
      userRole: request.userRole,
    },
    {
      status: "workspace",
      fields: {},
      ownerId: request.userId,
    },
    // Pass workspace facts through the facts slot so Gemini treats it as grounded data.
    // We cast because FactContext is a discriminated union on entity kind.
    workspaceFacts as unknown as FactContext,
    typeof request.userTimezone === "string" ? request.userTimezone : "America/New_York"
  );

  const safeLinks = buildSafeLinks("workspace", null, null);

  const gemini = await getGeminiGuidance({
    prompt: normalizedPrompt,
    context,
    blockers: [],
    qualityIssues: [],
    nextSteps: [],
    canProceed: true,
    safeLinks,
    preferComplexModel: snapshot.items.length > 10,
  });

  const deterministicFallbackAnswer = buildDeterministicWorkspaceAnswer(snapshot);

  const answer =
    gemini && !gemini.validatorFailed ? gemini.answer : deterministicFallbackAnswer;
  const intent: AskAIIntent =
    gemini && !gemini.validatorFailed ? gemini.intent : "overview";
  const responseSource: "deterministic" | "gemini" =
    gemini && !gemini.validatorFailed ? "gemini" : "deterministic";

  const apiResponse: AskAIResponse = {
    success: true,
    data: {
      currentState: {
        entityType: "workspace",
        status: "workspace",
        userRole: request.userRole,
        isOwner: true,
      },
      blockers: [],
      nextSteps: gemini?.nextSteps ?? [],
      qualityIssues: [],
      canProceed: true,
      confidence: gemini?.confidence ?? 0,
      prompt: normalizedPrompt,
      questionIntent: intent,
      answer,
      responseSource,
      aiModel: gemini?.model,
      links: gemini?.links?.length ? gemini.links : safeLinks,
      assignee: null,
      rateLimit: { remaining: rateLimitRemaining },
    },
    generatedAt: new Date().toISOString(),
  };

  recordAskAIEvent({
    userId: request.userId,
    entityType: "workspace",
    entityId: null,
    intent,
    responseSource,
    model: gemini?.model ?? null,
    latencyMs: Date.now() - startedAt,
    hadError: false,
    cached: false,
    validatorFailed: !!gemini?.validatorFailed,
  });

  return NextResponse.json(apiResponse, { status: 200 });
}

function buildDeterministicWorkspaceAnswer(snapshot: {
  blogsCount: number;
  socialCount: number;
  overdueCount: number;
  items: Array<{ awaitingMe: boolean; title: string }>;
}): string {
  const awaiting = snapshot.items.filter((i) => i.awaitingMe).length;
  const parts = [
    `You have ${snapshot.blogsCount} blog${snapshot.blogsCount === 1 ? "" : "s"} and ${snapshot.socialCount} social post${snapshot.socialCount === 1 ? "" : "s"} in flight.`,
  ];
  if (awaiting > 0) {
    parts.push(
      `${awaiting} item${awaiting === 1 ? " is" : "s are"} waiting on you.`
    );
  }
  if (snapshot.overdueCount > 0) {
    parts.push(
      `${snapshot.overdueCount} ${snapshot.overdueCount === 1 ? "is" : "are"} past scheduled publish.`
    );
  }
  return parts.join(" ");
}

export async function GET(): Promise<NextResponse<Record<string, unknown>>> {
  return NextResponse.json({
    endpoint: "/api/ai/assistant",
    method: "POST",
    description: "Read-only advisory assistant for content ops",
    version: "1.0.0",
    status: "operational",
    documentation: {
      request: {
        entityType: "blog | social_post | idea | workspace",
        entityId: "string (required unless entityType === 'workspace')",
        userId: "string",
        userRole: "writer | publisher | editor | admin",
        prompt: "string (optional natural language question)",
      },
      responseExtras: {
        links: "Array<{key,label,href,kind}>",
        assignee: "{name,role} | null",
        rateLimit: "{remaining}",
      },
    },
  });
}
