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
    const isAdmin = getUserRoles(auth.context.profile).includes("admin");

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

    if (fetchError || !socialPost) {
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
    if (!isAdmin && allowedOwner && allowedOwner !== auth.context.userId) {
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

    const BRIEF_FIELDS = [
      "title",
      "product",
      "type",
      "canva_url",
      "canva_page",
      "caption",
      "platforms",
      "scheduled_date",
      "associated_blog_id",
    ];

    for (const field of BRIEF_FIELDS) {
      const payloadValue = payload[field as keyof typeof payload];
      if (payloadValue !== undefined) {
        briefFieldUpdates[field] = payloadValue as string | number | string[] | null;
        mergedBriefState[field] = payloadValue as string | number | string[] | null;
      }
    }

    // 8. Check field locking for execution stages
    if (
      !isAdmin &&
      currentStatus === "awaiting_live_link" &&
      Object.keys(briefFieldUpdates).length > 0
    ) {
      return NextResponse.json(
        {
          error:
            "Awaiting Live Link is read-only. Only live links can be submitted in this stage.",
        },
        { status: 400 }
      );
    }
    if (!isAdmin && isExecutionStage(currentStatus)) {
      const lockedFieldsPresent = Object.keys(briefFieldUpdates).filter(
        (field) => LOCKED_BRIEF_FIELDS.includes(field as typeof LOCKED_BRIEF_FIELDS[number])
      );
      if (lockedFieldsPresent.length > 0) {
        return NextResponse.json(
          {
            error: `Cannot edit locked fields during ${currentStatus}: ${
              lockedFieldsPresent.join(", ")
            }`,
          },
          { status: 400 }
        );
      }
    }

    // 9. Validate required fields for next status (using merged state)
    const requiredFields = REQUIRED_FIELDS_FOR_STATUS[nextStatus] || [];
    const missingFields: string[] = [];

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

    // 10. Special validation for published: at least one live link required
    if (nextStatus === "published") {
      const { data: links, error: linksError } = await auth.context.adminClient
        .from("social_post_links")
        .select("id")
        .eq("social_post_id", id)
        .limit(1);
      if (linksError || !links || links.length === 0) {
        return NextResponse.json(
          {
            error: "Cannot publish without at least one live link",
          },
          { status: 400 }
        );
      }
    }

    // 11. Update status and merged brief fields atomically (database RLS will enforce permissions)
    const updatePayload: Record<string, string | number | string[] | null | Date> = {
      status: nextStatus,
      updated_at: new Date().toISOString(),
      ...briefFieldUpdates, // Include all brief field updates
    };

    const { data: updated, error: updateError } = await auth.context.adminClient
      .from("social_posts")
      .update(updatePayload)
      .eq("id", id)
      .eq("status", currentStatus) // Concurrency protection: fails if status changed
      .select("id, status, created_by, editor_user_id, admin_owner_id")
      .maybeSingle();

    if (updateError) {
      if (updateError.code === "PGRST116") {
        return NextResponse.json(
          {
            error: "Concurrent modification detected. Refresh and retry.",
          },
          { status: 409 }
        );
      }
      throw updateError;
    }
    if (!updated) {
      return NextResponse.json(
        {
          error: "Concurrent modification detected. Refresh and retry.",
        },
        { status: 409 }
      );
    }

    // 12. Log canonical activity event (non-blocking)
    const activityType = isBackwardTransition(currentStatus, nextStatus)
      ? "social_post_rolled_back"
      : "social_post_status_changed";
    auth.context.adminClient
      .from("social_post_activity_history")
      .insert({
        social_post_id: id,
        changed_by: auth.context.userId,
        event_type: activityType,
        field_name: "status",
        old_value: currentStatus,
        new_value: nextStatus,
        metadata: normalizedReason ? { reason: normalizedReason } : {},
      })
      .then(({ error: activityError }) => {
        if (activityError) {
          console.warn(
            "[POST /api/social-posts/[id]/transition] failed to record status activity",
            activityError.message
          );
        }
      });

    // 13. Insert live links if provided
    if (Array.isArray(payload.liveLinks) && payload.liveLinks.length > 0) {
      // Non-blocking insert, fire and forget
      auth.context.adminClient
        .from("social_post_links")
        .insert(
          payload.liveLinks.map((link) => ({
            social_post_id: id,
            platform: link.platform,
            url: link.url,
            created_at: new Date().toISOString(),
          }))
        );
    }

    // 14. Resolve actor and target user names for display-layer notifications
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
    });

    // 15. Send Slack notification (non-blocking)
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
      void emitWorkflowSlackEvent(auth.context.adminClient, {
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

    return NextResponse.json({
      success: true,
      post: updated,
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
