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
    return NextResponse.json({ error: reopenError.message }, { status: 400 });
  }
  if (reopenedPost) {
    const reopenedRecord = reopenedPost as {
      id: string;
      title: string;
      admin_owner_id: string | null;
    };
    let targetEmail: string | null = null;
    if (reopenedRecord.admin_owner_id) {
      const { data: targetProfile } = await auth.context.adminClient
        .from("profiles")
        .select("email")
        .eq("id", reopenedRecord.admin_owner_id)
        .maybeSingle();
      targetEmail = targetProfile?.email ?? null;
    }
    await auth.context.adminClient.functions
      .invoke("slack-notify", {
        body: {
          eventType: "social_creative_approved",
          socialPostId: reopenedRecord.id,
          title: reopenedRecord.title,
          site: "social",
          actorName: "Admin",
          targetEmail,
          appUrl: process.env.NEXT_PUBLIC_APP_URL,
        },
      })
      .catch(() => null);
  }

  return NextResponse.json({
    post: reopenedPost,
    nextActor: getNextActor("creative_approved"),
  });
});
