import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { authenticateRequest } from "@/lib/server-permissions";
import { emitEvent } from "@/lib/emit-event";
import { withApiContract } from "@/lib/api-contract";
import { emitWorkflowSlackEvent } from "@/lib/server-slack-emitter";
import {
  TRANSITION_GRAPH,
  isBackwardTransition,
  isExecutionStage,
  LOCKED_BRIEF_FIELDS,
  REQUIRED_FIELDS_FOR_STATUS,
  getNextAssignment,
  isValidSocialLiveLink,
  type SocialPostStatus,
} from "@/lib/social-post-workflow";
import { getUserRoles } from "@/lib/roles";
const SOCIAL_POST_STATUSES = [
  "draft",
  "in_review",
  "changes_requested",
  "creative_approved",
  "ready_to_publish",
  "awaiting_live_link",
  "published",
] as const;

const transitionPayloadSchema = z
  .object({
    nextStatus: z.enum(SOCIAL_POST_STATUSES),
    reason: z.string().trim().optional(),
    liveLinks: z
      .array(
        z.object({
          platform: z.enum(["linkedin", "facebook", "instagram"]),
          url: z.string().url(),
        })
      )
      .optional(),
    // Optional brief field updates
    title: z.string().trim().optional(),
    product: z.enum(["alpr_plus", "redactor", "hardware", "general_company"]).optional(),
    type: z.enum(["image", "carousel", "link", "video"]).optional(),
    canva_url: z.string().url().optional(),
    canva_page: z.number().int().min(1).nullable().optional(),
    caption: z.string().trim().optional(),
    platforms: z.array(z.enum(["linkedin", "facebook", "instagram"])).optional(),
    scheduled_date: z.string().date().optional(),
    associated_blog_id: z.string().uuid().nullable().optional(),
  })
  .passthrough();

export const POST = withApiContract(async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authenticateRequest(request);
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { id } = await params;
    const rawPayload = (await request.json().catch(() => ({}))) as unknown;
    const parsedPayload = transitionPayloadSchema.safeParse(rawPayload);
    if (!parsedPayload.success) {
      return NextResponse.json(
        {
          error:
            parsedPayload.error.issues[0]?.message ??
            "Invalid social post transition payload",
        },
        { status: 400 }
      );
    }
    const payload = parsedPayload.data;
    if (payload.liveLinks && payload.liveLinks.length > 0) {
      return NextResponse.json(
        { error: "Save live links before changing status. Transitions do not save links." },
        { status: 400 }
      );
    }
    const isAdmin = getUserRoles(auth.context.profile).includes("admin");
    const requestAuthToken = request.headers.get("authorization") ?? undefined;

    // 1. Parse and validate next status
    const nextStatus = payload.nextStatus as SocialPostStatus;

    // 2. Normalize reason
    const normalizedReason =
      typeof payload.reason === "string" && payload.reason.trim().length > 0
        ? payload.reason.trim()
        : null;

    // 3. Fetch current social post with new ownership fields
    const { data: socialPost, error: fetchError } = await auth.context.adminClient
      .from("social_posts")
      .select(
        `
        id,
        status,
        updated_at,
        created_by,
        worker_user_id,
        reviewer_user_id,
        title,
        platforms,
        product,
        type,
        canva_url,
        canva_page,
        caption,
        scheduled_date,
        associated_blog_id
      `
      )
      .eq("id", id)
      .maybeSingle();

    if (fetchError) {
      console.error(
        "[POST /api/social-posts/[id]/transition] failed to load social post",
        fetchError
      );
      const fetchErrorText = `${fetchError.message ?? ""} ${fetchError.details ?? ""} ${fetchError.hint ?? ""}`.toLowerCase();
      if (
        fetchError.code === "PGRST116" ||
        fetchErrorText.includes("no rows") ||
        fetchErrorText.includes("not found")
      ) {
        return NextResponse.json(
          { error: "Social post not found" },
          { status: 404 }
        );
      }
      return NextResponse.json(
        { error: "Couldn't load social post. Please try again." },
        { status: 500 }
      );
    }
    if (!socialPost) {
      return NextResponse.json(
        { error: "Social post not found" },
        { status: 404 }
      );
    }

    // 4. Ownership check: simple and clean
    // Worker executes: draft, changes_requested, ready_to_publish, awaiting_live_link
    // Reviewer approves: in_review, creative_approved
    const currentStatus = socialPost.status as SocialPostStatus;
    
    // Determine who should be able to act on this status
    const allowedActors = {
      draft: socialPost.worker_user_id,
      in_review: socialPost.reviewer_user_id,
      changes_requested: socialPost.worker_user_id,
      creative_approved: socialPost.reviewer_user_id,
      ready_to_publish: socialPost.worker_user_id,
      awaiting_live_link: socialPost.worker_user_id,
      published: null,
    };
    
    const allowedOwner = allowedActors[currentStatus];
    // Missing stage owner must not open the transition to arbitrary non-admins.
    if (!isAdmin && allowedOwner !== auth.context.userId) {
      return NextResponse.json(
        {
          error: "Permission denied: You are not authorized to transition this post at this stage.",
        },
        { status: 403 }
      );
    }

    // 5. Validate transition is allowed
    const allowedTransitions = TRANSITION_GRAPH[currentStatus] ?? [];
    if (!allowedTransitions.includes(nextStatus)) {
      return NextResponse.json(
        {
          error: `Invalid transition: ${currentStatus} → ${nextStatus}`,
        },
        { status: 400 }
      );
    }

    const nextOwner = getNextAssignment(
      nextStatus, socialPost.worker_user_id, socialPost.reviewer_user_id
    );
    if (nextStatus !== "published" && !nextOwner) {
      return NextResponse.json(
        { error: "Assign the person responsible for the next stage before continuing." },
        { status: 400 }
      );
    }

    // 6. Backward transitions require reason
    if (isBackwardTransition(currentStatus, nextStatus) && !normalizedReason) {
      return NextResponse.json(
        {
          error: "Backward transitions require a reason",
        },
        { status: 400 }
      );
    }

    // 7. Merge brief field updates from payload with current database values
    const briefFieldUpdates: Record<string, unknown> = {};
    const mergedBriefState: Record<string, unknown> = { ...socialPost };

    for (const field of LOCKED_BRIEF_FIELDS) {
      const payloadValue = payload[field as keyof typeof payload];
      if (payloadValue !== undefined) {
        briefFieldUpdates[field] = payloadValue as string | number | string[] | null;
        mergedBriefState[field] = payloadValue as string | number | string[] | null;
      }
    }

    // 8. Check field locking for execution stages
    if (
      isExecutionStage(currentStatus) &&
      Object.keys(briefFieldUpdates).length > 0
    ) {
      return NextResponse.json(
        {
          error:
            "Brief details are locked during execution. Ask an admin to reopen the brief before editing.",
        },
        { status: 400 }
      );
    }

    // 9. Validate required fields for next status (using merged state)
    const requiredFields = REQUIRED_FIELDS_FOR_STATUS[nextStatus] || [];
    const missingFields: string[] = [];
    let hasInvalidRequiredField = false;

    for (const field of requiredFields) {
      const value = mergedBriefState[field];
      // Check for truly missing/empty values (handle null, undefined, empty string, empty array)
      const isEmpty = 
        value === null || 
        value === undefined || 
        (typeof value === 'string' && value.trim() === '') ||
        (Array.isArray(value) && value.length === 0);
      
      if (isEmpty) {
        missingFields.push(field);
      } else if (!transitionPayloadSchema.shape[field].safeParse(value).success) {
        hasInvalidRequiredField = true;
      }
    }

    if (missingFields.length > 0) {
      return NextResponse.json(
        {
          error: `Missing required fields for ${nextStatus}: ${
            missingFields.join(", ")
          }`,
        },
        { status: 400 }
      );
    }

    if (hasInvalidRequiredField) {
      return NextResponse.json(
        { error: "Required post details contain invalid values. Correct them before continuing." },
        { status: 400 }
      );
    }

    // 10. Special validation for published: at least one live link required
    if (nextStatus === "published") {
      const { data: links, error: linksError } = await auth.context.adminClient
        .from("social_post_links")
        .select("platform,url")
        .eq("social_post_id", id);
      if (linksError || !links?.some(isValidSocialLiveLink)) {
        return NextResponse.json(
          {
            error: "Cannot publish without at least one live link",
          },
          { status: 400 }
        );
      }
    }

    // Lock/recheck version and actor; persist ownership and history atomically.

    const { data: updated, error: updateError } = await auth.context.adminClient
      .rpc("apply_social_post_transition", {
        p_social_post_id: id,
        p_from_status: currentStatus,
        p_expected_updated_at: socialPost.updated_at,
        p_to_status: nextStatus,
        p_actor_id: auth.context.userId,
        p_reason: normalizedReason,
        p_brief: briefFieldUpdates,
      });

    if (updateError) {
      const errors: Record<string, { status: number; error: string }> = {
        "40001": { status: 409, error: "Concurrent modification detected. Refresh and retry." },
        "40P01": { status: 409, error: "Concurrent modification detected. Refresh and retry." },
        P0002: { status: 404, error: "Social post not found" },
        "42501": { status: 403, error: "You are not authorized to transition this post. Refresh and try again." },
        "23514": { status: 400, error: "Post details no longer meet the transition requirements. Refresh and check the required fields." },
        "23503": { status: 400, error: "A linked record is no longer available. Refresh and check the post details." },
        "22P02": { status: 400, error: "Invalid post details. Refresh and check the required fields." },
      };
      console.error("[POST /api/social-posts/[id]/transition] atomic transition failed", updateError);
      const failure = errors[updateError.code];
      return NextResponse.json(
        { error: failure?.error ?? "Couldn't update post. Please try again." },
        { status: failure?.status ?? 500 }
      );
    }
    if (!updated) {
      return NextResponse.json(
        {
          error: "Concurrent modification detected. Refresh and retry.",
        },
        { status: 409 }
      );
    }

    // Delivery failures cannot turn an already committed transition into a 500.
    try {
      // 13. Resolve actor and target user names for display-layer notifications
      const targetUserId =
        nextStatus === "in_review" || nextStatus === "creative_approved"
          ? socialPost.reviewer_user_id
          : nextStatus === "published"
            ? null
            : socialPost.worker_user_id;
      const profileIds = [auth.context.userId, targetUserId].filter(
        (value): value is string => typeof value === "string" && value.trim().length > 0
      );
      const uniqueProfileIds = Array.from(new Set(profileIds));
      let actorName: string | undefined;
      let targetUserName: string | undefined;
      if (uniqueProfileIds.length > 0) {
        const { data: profileRows } = await auth.context.adminClient
          .from("profiles")
          .select("id,full_name")
          .in("id", uniqueProfileIds);
        const profileNameById = new Map<string, string>();
        for (const row of profileRows ?? []) {
          const id = typeof row.id === "string" ? row.id : "";
          const fullName = typeof row.full_name === "string" ? row.full_name : "";
          if (id) {
            profileNameById.set(id, fullName);
          }
        }
        actorName = profileNameById.get(auth.context.userId);
        if (targetUserId) {
          targetUserName = profileNameById.get(targetUserId);
        }
      }

      await emitEvent({
        type: "social_post_status_changed",
        contentType: "social_post",
        contentId: id,
        oldValue: currentStatus,
        newValue: nextStatus,
        fieldName: "status",
        actor: auth.context.userId,
        actorName,
        targetUserId: targetUserId ?? undefined,
        targetUserName,
        contentTitle: socialPost.title,
        metadata: {
          reason: normalizedReason,
        },
        timestamp: Date.now(),
      }, {
        authToken: requestAuthToken,
        skipActivityHistory: true,
      });

      // 14. Send optional Slack notification
      const TRANSITION_TO_SLACK_EVENT: Partial<Record<string, string>> = {
        in_review: "social_submitted_for_review",
        changes_requested: "social_changes_requested",
        creative_approved: "social_creative_approved",
        ready_to_publish: "social_ready_to_publish",
        awaiting_live_link: "social_awaiting_live_link",
        published: "social_published",
      };

      const slackEventType = TRANSITION_TO_SLACK_EVENT[nextStatus];
      if (slackEventType) {
        await emitWorkflowSlackEvent(auth.context.adminClient, {
          eventType: slackEventType as
            | "social_submitted_for_review"
            | "social_changes_requested"
            | "social_creative_approved"
            | "social_ready_to_publish"
            | "social_awaiting_live_link"
            | "social_published",
          socialPostId: id,
          title: socialPost.title,
          site: socialPost.product ?? "general_company",
          actorName: actorName ?? "Team",
          actorUserId: auth.context.userId,
          targetUserId: targetUserId ?? undefined,
          targetUserName: targetUserName ?? undefined,
        });
      }

    } catch (notificationError) {
      console.error("[POST /api/social-posts/[id]/transition] notification delivery failed", notificationError);
    }

    return NextResponse.json({
      success: true,
      post: { id: updated.id, status: updated.status },
    });
  } catch (err) {
    const error = err instanceof Error ? err.message : "Unknown error";
    console.error("[POST /api/social-posts/[id]/transition]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
});
