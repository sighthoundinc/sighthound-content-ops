import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { withApiContract } from "@/lib/api-contract";
import { authenticateRequest, hasPermission } from "@/lib/server-permissions";
import { emitWorkflowSlackEvent } from "@/lib/server-slack-emitter";

type PostgrestLikeError = {
  code?: string | null;
  message?: string | null;
  details?: string | null;
  hint?: string | null;
};

const createBlogCommentPayloadSchema = z
  .object({
    comment: z.string().trim().min(1, "Comment cannot be empty."),
  })
  .strict();

function isMissingBlogCommentUserIdColumnError(error: PostgrestLikeError | null) {
  if (!error) {
    return false;
  }
  const code = (error.code ?? "").toUpperCase();
  const text = `${error.message ?? ""} ${error.details ?? ""} ${error.hint ?? ""}`.toLowerCase();
  return code === "42703" && text.includes("user_id");
}

function isMissingBlogCommentsTableError(error: PostgrestLikeError | null) {
  if (!error) {
    return false;
  }
  const code = (error.code ?? "").toUpperCase();
  const text = `${error.message ?? ""} ${error.details ?? ""} ${error.hint ?? ""}`.toLowerCase();
  return (
    (code === "42P01" || code === "PGRST204" || code === "PGRST205") &&
    (text.includes("blog_comments") || text.includes("schema cache") || text.includes("could not find"))
  );
}

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
  const parsedPayload = createBlogCommentPayloadSchema.safeParse(rawPayload);
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

  const { data: blog, error: blogError } = await auth.context.adminClient
    .from("blogs")
    .select("id,title,site")
    .eq("id", id)
    .maybeSingle();
  if (blogError || !blog) {
    return NextResponse.json({ error: "Blog not found" }, { status: 404 });
  }

  let {
    data: insertedComment,
    error: insertError,
  } = await auth.context.adminClient
    .schema("public")
    .from("blog_comments")
    .insert({
      blog_id: id,
      comment: payload.comment,
      user_id: auth.context.userId,
    })
    .select("id")
    .maybeSingle();

  if (isMissingBlogCommentUserIdColumnError(insertError)) {
    const fallback = await auth.context.adminClient
      .schema("public")
      .from("blog_comments")
      .insert({
        blog_id: id,
        comment: payload.comment,
        created_by: auth.context.userId,
      })
      .select("id")
      .maybeSingle();
    insertedComment = fallback.data;
    insertError = fallback.error;
  }

  if (insertError) {
    if (isMissingBlogCommentsTableError(insertError)) {
      return NextResponse.json(
        {
          error:
            "Comments table is missing from schema cache. Run the latest Supabase migrations and refresh schema cache.",
        },
        { status: 500 }
      );
    }
    console.error("[POST /api/blogs/[id]/comments] insert failed", insertError);
    return NextResponse.json(
      { error: "Couldn't add comment. Please try again." },
      { status: 500 }
    );
  }

  await emitWorkflowSlackEvent(auth.context.adminClient, {
    eventType: "blog_comment_created",
    blogId: blog.id,
    title: blog.title,
    site: blog.site,
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
