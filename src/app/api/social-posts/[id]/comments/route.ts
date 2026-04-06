import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { withApiContract } from "@/lib/api-contract";
import { authenticateRequest, hasPermission } from "@/lib/server-permissions";
import { emitWorkflowSlackEvent } from "@/lib/server-slack-emitter";

const createSocialCommentPayloadSchema = z
  .object({
    comment: z.string().trim().min(1, "Comment cannot be empty."),
    parent_comment_id: z.string().uuid().nullable().optional(),
  })
  .strict();

export const POST = withApiContract(async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticateRequest(request);
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  if (!hasPermission(auth.context, "create_comment")) {
    return NextResponse.json({ error: "Permission denied" }, { status: 403 });
  }

  const rawPayload = (await request.json().catch(() => ({}))) as unknown;
  const parsedPayload = createSocialCommentPayloadSchema.safeParse(rawPayload);
  if (!parsedPayload.success) {
    return NextResponse.json(
      {
        error: parsedPayload.error.issues[0]?.message ?? "Invalid comment payload",
      },
      { status: 400 }
    );
  }
  const payload = parsedPayload.data;
  const { id } = await params;

  const { data: socialPost, error: socialPostError } = await auth.context.adminClient
    .from("social_posts")
    .select("id,title,product")
    .eq("id", id)
    .maybeSingle();
  if (socialPostError || !socialPost) {
    return NextResponse.json({ error: "Social post not found" }, { status: 404 });
  }

  const { data: insertedComment, error: insertError } = await auth.context.adminClient
    .from("social_post_comments")
    .insert({
      social_post_id: id,
      comment: payload.comment,
      user_id: auth.context.userId,
      parent_comment_id: payload.parent_comment_id ?? null,
    })
    .select("id")
    .maybeSingle();
  if (insertError) {
    console.error("[POST /api/social-posts/[id]/comments] insert failed", insertError);
    return NextResponse.json(
      { error: "Couldn't add comment. Please try again." },
      { status: 500 }
    );
  }

  await emitWorkflowSlackEvent(auth.context.adminClient, {
    eventType: "social_comment_created",
    socialPostId: socialPost.id,
    title: socialPost.title,
    site: socialPost.product ?? "general_company",
    actorUserId: auth.context.userId,
    commentBody: payload.comment,
  });

  return NextResponse.json(
    {
      success: true,
      commentId: typeof insertedComment?.id === "string" ? insertedComment.id : null,
    },
    { status: 201 }
  );
});
