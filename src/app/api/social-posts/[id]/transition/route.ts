import { NextRequest, NextResponse } from "next/server";

import { getUserRoles } from "@/lib/roles";
import { SOCIAL_POST_ALLOWED_TRANSITIONS, getNextActor } from "@/lib/status";
import { authenticateRequest } from "@/lib/server-permissions";
import { emitEvent } from "@/lib/emit-event";
import type { SocialPostStatus } from "@/lib/types";

const SOCIAL_STATUS_VALUES = new Set<SocialPostStatus>([
  "draft",
  "in_review",
  "changes_requested",
  "creative_approved",
  "ready_to_publish",
  "awaiting_live_link",
  "published",
]);
const SOCIAL_STATUS_TO_SLACK_EVENT: Partial<
  Record<
    SocialPostStatus,
    | "social_submitted_for_review"
    | "social_changes_requested"
    | "social_creative_approved"
    | "social_ready_to_publish"
    | "social_awaiting_live_link"
    | "social_published"
  >
> = {
  in_review: "social_submitted_for_review",
  changes_requested: "social_changes_requested",
  creative_approved: "social_creative_approved",
  ready_to_publish: "social_ready_to_publish",
  awaiting_live_link: "social_awaiting_live_link",
  published: "social_published",
};

function parseToStatus(value: unknown): SocialPostStatus | null {
  return typeof value === "string" && SOCIAL_STATUS_VALUES.has(value as SocialPostStatus)
    ? (value as SocialPostStatus)
    : null;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticateRequest(request);
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { id } = await params;
  const payload = (await request.json().catch(() => ({}))) as {
    toStatus?: unknown;
    reason?: unknown;
  };

  const toStatus = parseToStatus(payload.toStatus);
  if (!toStatus) {
    return NextResponse.json({ error: "Invalid target status" }, { status: 400 });
  }

  const normalizedReason =
    typeof payload.reason === "string" && payload.reason.trim().length > 0
      ? payload.reason.trim()
      : null;

  const { data: existingPost, error: existingPostError } = await auth.context.adminClient
    .from("social_posts")
    .select("id,status,title,created_by,editor_user_id,admin_owner_id")
    .eq("id", id)
    .maybeSingle();

  if (existingPostError) {
    return NextResponse.json({ error: existingPostError.message }, { status: 500 });
  }
  if (!existingPost) {
    return NextResponse.json({ error: "Social post not found" }, { status: 404 });
  }

  const currentStatus = existingPost.status as SocialPostStatus;
  const allowedTransitions = SOCIAL_POST_ALLOWED_TRANSITIONS[currentStatus] ?? [];
  if (!allowedTransitions.includes(toStatus)) {
    return NextResponse.json(
      { error: `Invalid transition from ${currentStatus} to ${toStatus}` },
      { status: 400 }
    );
  }

  const roles = getUserRoles(auth.context.profile);
  const isAdmin = roles.includes("admin");
  const isExecutionRollback =
    toStatus === "changes_requested" &&
    (currentStatus === "ready_to_publish" || currentStatus === "awaiting_live_link");

  if (
    !isAdmin &&
    (currentStatus === "in_review" || toStatus === "creative_approved" || isExecutionRollback)
  ) {
    return NextResponse.json(
      { error: "Only admins can perform this status transition." },
      { status: 403 }
    );
  }

  if (isExecutionRollback && !normalizedReason) {
    return NextResponse.json(
      { error: "Reason is required for execution-stage rollback." },
      { status: 400 }
    );
  }

  const { data: transitionedPost, error: transitionError } = await auth.context.adminClient.rpc(
    "transition_social_post_status",
    {
      p_social_post_id: id,
      p_to_status: toStatus,
      p_actor_id: auth.context.userId,
      p_reason: normalizedReason,
    }
  );

  if (transitionError) {
    return NextResponse.json({ error: transitionError.message }, { status: 400 });
  }

  // Emit unified event for activity history + notification preference enforcement
  const transitionedPostRecord = transitionedPost as {
    id: string;
    title: string;
    created_by: string | null;
    editor_user_id: string | null;
    admin_owner_id: string | null;
  };
  
  // Get actor name for event metadata
  let actorName: string | undefined;
  if (auth.context.userId) {
    const { data: actorProfile } = await auth.context.adminClient
      .from("profiles")
      .select("full_name")
      .eq("id", auth.context.userId)
      .maybeSingle();
    actorName = actorProfile?.full_name ?? undefined;
  }
  
  await emitEvent({
    type: "social_post_status_changed",
    contentType: "social_post",
    contentId: id,
    oldValue: currentStatus,
    newValue: toStatus,
    fieldName: "status",
    actor: auth.context.userId,
    actorName,
    contentTitle: transitionedPostRecord.title,
    metadata: {
      reason: normalizedReason,
      nextActor: getNextActor(toStatus),
    },
    timestamp: Date.now(),
  });

  const nextActor = getNextActor(toStatus);
  const slackEventType = SOCIAL_STATUS_TO_SLACK_EVENT[toStatus];
  if (slackEventType && transitionedPost) {
    const targetUserId =
      nextActor === "editor"
        ? transitionedPostRecord.editor_user_id ?? transitionedPostRecord.created_by
        : nextActor === "admin"
          ? transitionedPostRecord.admin_owner_id
          : null;
    let targetEmail: string | null = null;
    if (targetUserId) {
      const { data: targetProfile } = await auth.context.adminClient
        .from("profiles")
        .select("email")
        .eq("id", targetUserId)
        .maybeSingle();
      targetEmail = targetProfile?.email ?? null;
    }

    await auth.context.adminClient.functions
      .invoke("slack-notify", {
        body: {
          eventType: slackEventType,
          socialPostId: transitionedPostRecord.id,
          title: transitionedPostRecord.title,
          site: "social",
          actorName: isAdmin ? "Admin" : "Social Editor",
          targetEmail,
          appUrl: process.env.NEXT_PUBLIC_APP_URL,
        },
      })
      .catch(() => null);
  }

  return NextResponse.json({
    post: transitionedPost,
    nextActor,
  });
}
