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
import { createClient, SupabaseClient } from "@supabase/supabase-js";
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
      .single();

    if (error || !data) {
      console.error("[AI Assistant Blog Query Error]", { error, data });
      throw new Error(`Blog query failed: ${error?.message || 'no data'}`);
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
    // Query social_posts table with RLS
    const { data, error } = await supabase
      .from("social_posts")
      .select(
        `id, status, product, type, canva_url, canva_page, caption,
         platforms, scheduled_date, created_by, worker_user_id, reviewer_user_id,
         assigned_to_user_id, title, associated_blog_id, updated_at`
      )
      .eq("id", entityId)
      .single();

    if (error || !data) {
      console.error("[AI Assistant Social Post Query Error]", { error, data });
      throw new Error(`Social post query failed: ${error?.message || 'no data'}`);
    }

    // Map DB fields to DetectorInput format
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
      ownerId: data.assigned_to_user_id || data.worker_user_id || data.created_by || userId,
      reviewerId: data.reviewer_user_id,
      title: data.title || undefined,
      caption: data.caption || undefined,
      platforms: Array.isArray(data.platforms) ? data.platforms : []
    };
  }

  throw new Error(`Unknown entity type: ${entityType}`);
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
      const dbErrorMsg = (dbError as Error).message;
      console.error("[AI Assistant DB Error]", dbErrorMsg);
      // Check if it's an RLS denial or not found
      if (dbErrorMsg.includes("access denied")) {
        return NextResponse.json(
          createErrorResponse("UNAUTHORIZED", "You do not have access to this content"),
          { status: 403 }
        );
      }
      return NextResponse.json(
        createErrorResponse("NOT_FOUND", "Content not found"),
        { status: 404 }
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
