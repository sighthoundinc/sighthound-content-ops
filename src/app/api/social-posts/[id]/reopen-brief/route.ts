import { NextRequest, NextResponse } from "next/server";

import { getUserRoles } from "@/lib/roles";
import { getNextActor } from "@/lib/status";
import { authenticateRequest } from "@/lib/server-permissions";
import { withApiContract } from "@/lib/api-contract";

export const POST = withApiContract(async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticateRequest(request);
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const roles = getUserRoles(auth.context.profile);
  if (!roles.includes("admin")) {
    return NextResponse.json(
      { error: "Only admins can reopen execution stages for brief edits." },
      { status: 403 }
    );
  }

  const { id } = await params;
  const payload = (await request.json().catch(() => ({}))) as { reason?: unknown };
  const reason =
    typeof payload.reason === "string" && payload.reason.trim().length > 0
      ? payload.reason.trim()
      : null;

  const { data: reopenedPost, error: reopenError } = await auth.context.adminClient.rpc(
    "reopen_social_post_for_brief_edit",
    {
      p_social_post_id: id,
      p_actor_id: auth.context.userId,
      p_reason: reason,
    }
  );

  if (reopenError) {
    console.error("Failed to reopen post for brief edit:", reopenError);
    return NextResponse.json({ error: "Failed to reopen post for editing. Please try again." }, { status: 400 });
  }
  if (reopenedPost) {
    // Note: Skipping Slack notification on reopen for brief edits
    // Activity history is still recorded; Slack notification is low-value noise
    // If needed in future, emit dedicated "post_reopened_for_editing" event instead
  }

  return NextResponse.json({
    post: reopenedPost,
    nextActor: getNextActor("creative_approved"),
  });
});
