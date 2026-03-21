import { NextRequest, NextResponse } from "next/server";

import { getUserRoles } from "@/lib/roles";
import { SOCIAL_POST_ALLOWED_TRANSITIONS, getNextActor } from "@/lib/status";
import { authenticateRequest } from "@/lib/server-permissions";
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

function parseToStatus(value: unknown): SocialPostStatus | null {
  return typeof value === "string" && SOCIAL_STATUS_VALUES.has(value as SocialPostStatus)
    ? (value as SocialPostStatus)
    : null;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ postId: string }> }
) {
  const auth = await authenticateRequest(request);
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { postId } = await params;
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
    .select("id,status,title")
    .eq("id", postId)
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
      p_social_post_id: postId,
      p_to_status: toStatus,
      p_actor_id: auth.context.userId,
      p_reason: normalizedReason,
    }
  );

  if (transitionError) {
    return NextResponse.json({ error: transitionError.message }, { status: 400 });
  }

  return NextResponse.json({
    post: transitionedPost,
    nextActor: getNextActor(toStatus),
  });
}
