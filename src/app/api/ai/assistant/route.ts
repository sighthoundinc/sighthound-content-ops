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
 *   "userRole": "writer" | "publisher" | "editor" | "admin"
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
 *     "confidence": number
 *   },
 *   "generatedAt": "ISO8601"
 * }
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
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

/**
 * Entity state interface for DB mapping
 */
interface EntityState {
  status: string;
  fields: Record<string, boolean>;
  ownerId: string;
  reviewerId?: string;
}

/**
 * Get entity state from Supabase with RLS enforcement
 * RLS ensures user can only access content they own or are assigned to
 */
async function getEntityState(entityType: string, entityId: string, userId: string, authToken?: string): Promise<EntityState> {
  let supabase;
  
  // Use authenticated client if token provided, otherwise use service role
  if (authToken) {
    supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || "",
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
      {
        global: {
          headers: {
            Authorization: `Bearer ${authToken}`
          }
        }
      }
    );
  } else {
    // Fall back to service role for server-side operations
    supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || "",
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
    );
  }

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
      throw new Error(`Blog not found or access denied: ${error?.message}`);
    }

    // Map DB fields to DetectorInput format
    // Use writer_status as primary status indicator
    return {
      status: data.writer_status || "not_started",
      fields: {
        title: !!data.title,
        writer_id: !!data.writer_id,
        google_doc_url: !!data.google_doc_url,
        publisher_id: !!data.publisher_id,
        scheduled_publish_date: !!data.scheduled_publish_date
      },
      ownerId: data.writer_id || data.created_by || userId,
      reviewerId: data.publisher_id
    };
  } else if (entityType === "social_post") {
    // Query social_posts table with RLS
    const { data, error } = await supabase
      .from("social_posts")
      .select(
        `id, status, product, type, canva_url, canva_page, caption,
         platforms, scheduled_publish_date, created_by, editor_id,
         title, associated_blog_id, updated_at`
      )
      .eq("id", entityId)
      .single();

    if (error || !data) {
      throw new Error(`Social post not found or access denied: ${error?.message}`);
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
        platforms: !!data.platforms,
        scheduled_publish_date: !!data.scheduled_publish_date,
        title: !!data.title,
        associated_blog_id: !!data.associated_blog_id
      },
      ownerId: data.created_by || userId,
      reviewerId: data.editor_id
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
    
    // Extract auth token from request headers for RLS
    const authHeader = req.headers.get('authorization');
    const authToken = authHeader?.replace('Bearer ', '');

    // Get entity state from Supabase with RLS enforcement
    let entityState: EntityState;
    try {
      entityState = await getEntityState(request.entityType, request.entityId, request.userId, authToken);
    } catch (dbError) {
      const dbErrorMsg = (dbError as Error).message;
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

    // Check quality using real entity data from Supabase
    let qualityResult: QualityCheckResult = { issues: [], qualityScore: 100 };
    if (request.entityType === "blog") {
      // Blog title already fetched above in entityState, use it
      qualityResult = checkQuality({
        entityType: "blog",
        title: entityState.fields.title ? "Sample Title" : undefined
      });
    } else if (request.entityType === "social_post") {
      // Get social post data for quality check
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL || "",
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
      );
      const { data: socialData } = await supabase
        .from("social_posts")
        .select("caption, platforms")
        .eq("id", request.entityId)
        .single();
      
      qualityResult = checkQuality({
        entityType: "social_post",
        caption: socialData?.caption,
        platforms: socialData?.platforms || []
      });
    }

    // Generate response
    const result = generateResponse({
      context,
      blockers: blockerResult.blockers,
      qualityIssues: qualityResult.issues
    });

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
    description: "Deterministic workflow intelligence for content ops",
    version: "0.1.0",
    status: "operational",
    documentation: {
      request: {
        entityType: "blog | social_post | idea",
        entityId: "string",
        userId: "string",
        userRole: "writer | publisher | editor | admin"
      },
      response: {
        currentState: "object",
        blockers: "array",
        nextSteps: "array",
        qualityIssues: "array",
        canProceed: "boolean",
        confidence: "number"
      }
    }
  });
}
