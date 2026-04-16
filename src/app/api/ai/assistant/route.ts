/**
 * AI Assistant API Endpoint
 *
 * POST /api/ai/assistant
 * 
 * Deterministic-first workflow intelligence for blogs, social posts, and ideas.
 * No content generation. Only guidance, blocker detection, and next steps.
 * 
 * Request:
 * {
 *   "entityType": "blog" | "social_post" | "idea",
 *   "entityId": "string",
 *   "userId": "string",
 *   "userRole": "writer" | "publisher" | "editor" | "admin",
 *   "prompt": "Why can't I publish this?" // optional
 * }
 * 
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "currentState": {...},
 *     "blockers": [...],
 *     "nextSteps": [...],
 *     "qualityIssues": [...],
 *     "canProceed": boolean,
 *     "confidence": number,
 *     "questionIntent": "string",
 *     "answer": "string",
 *     "responseSource": "deterministic" | "gemini"
 *   },
 *   "generatedAt": "ISO8601"
 * }
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
  createErrorResponse 
} from "@/app/api/ai/models";
import { extractContextSync } from "@/app/api/ai/utils/context-extractor";
import { detectBlockers } from "@/lib/blocker-detector";
import { checkQuality, type QualityCheckResult } from "@/lib/quality-checker";
import { generateResponse } from "@/app/api/ai/utils/response-generator";
import { getRequiredFieldsForStatus, getNextStagesForStatus } from "@/lib/workflow-rules";
import { getGeminiGuidance } from "@/app/api/ai/utils/gemini-client";
import { routePrompt } from "@/app/api/ai/utils/prompt-router";
import { isMissingSocialOwnershipColumnsError } from "@/lib/social-post-schema";

/**
 * Entity state interface for DB mapping
 */
interface EntityState {
  status: string;
  fields: Record<string, boolean>;
  ownerId: string;
  reviewerId?: string;
  title?: string;
  caption?: string;
  platforms?: string[];
}
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
  if (!error) {
    return false;
  }
  const code = (error.code ?? "").toUpperCase();
  const text = `${error.message ?? ""} ${error.details ?? ""} ${error.hint ?? ""}`.toLowerCase();
  return (
    code === "42501" ||
    text.includes("permission denied") ||
    text.includes("row-level security")
  );
}

function mergeUniqueSteps(primary: string[], fallback: string[]): string[] {
  const merged = [...primary, ...fallback]
    .map((step) => step.trim())
    .filter(Boolean);

  return [...new Set(merged)].slice(0, 5);
}

/**
 * Get entity state from Supabase using authenticated context
 * Uses auth token from client to respect RLS policies
 */
async function getEntityState(supabase: SupabaseClient, entityType: string, entityId: string, userId: string): Promise<EntityState> {

  if (entityType === "blog") {
    // Query blogs table with RLS
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

    // Map DB fields to DetectorInput format
    // Use writer_status as primary status indicator
    return {
      status: data.writer_status || "not_started",
      fields: {
        title: !!data.title,
        writer_id: !!data.writer_id,
        draft_doc_link: !!data.google_doc_url,
        google_doc_url: !!data.google_doc_url,
        publisher_id: !!data.publisher_id,
        scheduled_publish_date: !!data.scheduled_publish_date
      },
      ownerId: data.writer_id || data.created_by || userId,
      reviewerId: data.publisher_id,
      title: data.title || undefined
    };
  } else if (entityType === "social_post") {
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

    // Query social_posts table with RLS (fallback for legacy ownership schema)
    let { data, error } = await supabase
      .from("social_posts")
      .select(socialSelectWithOwnership)
      .eq("id", entityId)
      .maybeSingle();
    if (isMissingSocialOwnershipColumnsError(error)) {
      const fallbackResult = await supabase
        .from("social_posts")
        .select(socialSelectLegacy)
        .eq("id", entityId)
        .maybeSingle();
      data = fallbackResult.data;
      error = fallbackResult.error;
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

    // Map DB fields to DetectorInput format
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
        associated_blog_id: !!data.associated_blog_id
      },
      ownerId: derivedOwnerId,
      reviewerId: reviewerUserId ?? undefined,
      title: data.title || undefined,
      caption: data.caption || undefined,
      platforms: Array.isArray(data.platforms) ? data.platforms : []
    };
  } else if (entityType === "idea") {
    const { data, error } = await supabase
      .from("blog_ideas")
      .select(
        "id,title,site,description,created_by,is_converted,converted_blog_id,created_at"
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
    };
  }

  throw new EntityStateError("query_error", `Unknown entity type: ${entityType}`);
}

/**
 * POST /api/ai/assistant
 * Deterministic workflow guidance
 */
export async function POST(req: NextRequest): Promise<NextResponse<AskAIResponse | APIErrorResponse>> {
  try {
    const body = await req.json();

    // Validate request
    const validation = validateAIRequest(body);
    if (!validation.valid) {
      const errorMsg = validation.errors?.map((e) => `${e.field}: ${e.message}`).join("; ") || "Invalid request";
      return NextResponse.json(createErrorResponse("INVALID_INPUT", errorMsg), { status: 400 });
    }

    const request = body as AskAIRequest;

    // Extract auth token from request headers
    const authHeader = req.headers.get("Authorization") || "";
    const accessToken = authHeader.replace(/^Bearer\s+/i, "");
    if (!accessToken) {
      return NextResponse.json(
        createErrorResponse("UNAUTHORIZED", "Please sign in to use the AI assistant"),
        { status: 401 }
      );
    }

    // Create authenticated Supabase client with the user's token
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
    const supabase = createClient(supabaseUrl, anonKey, {
      auth: {
        persistSession: false,
      },
      global: {
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
      },
    });

    // Get entity state from Supabase
    let entityState: EntityState;
    try {
      entityState = await getEntityState(supabase, request.entityType, request.entityId, request.userId);
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

    // Extract context
    const context = extractContextSync(
      {
        entityType: request.entityType,
        entityId: request.entityId,
        userId: request.userId,
        userRole: request.userRole
      },
      entityState
    );

    // Get required fields and next stages
    const requiredFieldsForStatus = getRequiredFieldsForStatus(request.entityType, context.currentStatus);
    const nextAllowedStages = getNextStagesForStatus(request.entityType, context.currentStatus);

    // Detect blockers
    const blockerResult = detectBlockers({
      entityType: request.entityType,
      status: context.currentStatus,
      userRole: request.userRole,
      userIsOwner: context.userIsOwner,
      userIsReviewer: context.userIsReviewer,
      fields: context.fields,
      requiredFieldsForStatus,
      nextAllowedStages
    });

    // Check quality using entity snapshot data
    let qualityResult: QualityCheckResult = { issues: [], qualityScore: 100 };
    if (request.entityType === "blog") {
      qualityResult = checkQuality({
        entityType: "blog",
        title: entityState.title
      });
    } else if (request.entityType === "social_post") {
      qualityResult = checkQuality({
        entityType: "social_post",
        caption: entityState.caption,
        platforms: entityState.platforms || []
      });
    }

    // Generate deterministic baseline response
    const deterministicResult = generateResponse({
      context,
      blockers: blockerResult.blockers,
      qualityIssues: qualityResult.issues
    });

    // Route prompt to intent-aware guidance (local deterministic path)
    const routedPrompt = routePrompt({
      prompt: request.prompt,
      context,
      blockers: blockerResult.blockers,
      qualityIssues: qualityResult.issues,
      deterministicNextSteps: deterministicResult.nextSteps,
      canProceed: deterministicResult.canProceed
    });

    let answer = routedPrompt.answer;
    let questionIntent = routedPrompt.intent;
    let nextSteps = routedPrompt.nextSteps;
    let responseSource: "deterministic" | "gemini" = "deterministic";
    let aiModel: string | undefined;
    let confidence = deterministicResult.confidence;

    // Optional Gemini enhancement for natural language interpretation
    const geminiGuidance = await getGeminiGuidance({
      prompt: routedPrompt.prompt,
      context,
      blockers: blockerResult.blockers,
      qualityIssues: qualityResult.issues,
      nextSteps,
      canProceed: deterministicResult.canProceed
    });

    if (geminiGuidance) {
      answer = geminiGuidance.answer;
      questionIntent = geminiGuidance.intent;
      nextSteps = mergeUniqueSteps(geminiGuidance.nextSteps, routedPrompt.nextSteps);
      responseSource = "gemini";
      aiModel = geminiGuidance.model;

      if (typeof geminiGuidance.confidence === "number") {
        confidence = Math.round((deterministicResult.confidence + geminiGuidance.confidence) / 2);
      }
    }

    const result = {
      ...deterministicResult,
      nextSteps,
      confidence,
      prompt: routedPrompt.prompt,
      questionIntent,
      answer,
      responseSource,
      aiModel
    };

    // Convert to API response
    const apiResponse = resultToAPIResponse(result);

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
 * GET /api/ai/assistant
 * Health check and documentation
 */
export async function GET(): Promise<NextResponse<Record<string, unknown>>> {
  return NextResponse.json({
    endpoint: "/api/ai/assistant",
    method: "POST",
    description: "Prompt-aware workflow intelligence for content ops",
    version: "0.1.0",
    status: "operational",
    documentation: {
      request: {
        entityType: "blog | social_post | idea",
        entityId: "string",
        userId: "string",
        userRole: "writer | publisher | editor | admin",
        prompt: "string (optional natural language question)"
      },
      response: {
        currentState: "object",
        blockers: "array",
        nextSteps: "array",
        qualityIssues: "array",
        canProceed: "boolean",
        confidence: "number",
        prompt: "string",
        questionIntent: "string",
        answer: "string",
        responseSource: "deterministic | gemini"
      }
    }
  });
}
