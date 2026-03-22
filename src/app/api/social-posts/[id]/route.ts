import { NextRequest, NextResponse } from "next/server";

import { getUserRoles } from "@/lib/roles";
import { authenticateRequest } from "@/lib/server-permissions";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticateRequest(request);
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { id } = await params;

  // Get the post to verify ownership or admin status
  const { data: post, error: postError } = await auth.context.adminClient
    .from("social_posts")
    .select("id, title, created_by")
    .eq("id", id)
    .maybeSingle();

  if (postError) {
    return NextResponse.json({ error: postError.message }, { status: 500 });
  }
  if (!post) {
    return NextResponse.json({ error: "Post not found" }, { status: 404 });
  }

  // Check if user is owner or admin
  const roles = getUserRoles(auth.context.profile);
  const isAdmin = roles.includes("admin");
  const isOwner = post.created_by === auth.context.userId;

  if (!isOwner && !isAdmin) {
    return NextResponse.json(
      { error: "You do not have permission to delete this post" },
      { status: 403 }
    );
  }

  // Delete the post (cascades to links, comments, activity history)
  const { error: deleteError } = await auth.context.adminClient
    .from("social_posts")
    .delete()
    .eq("id", id);

  if (deleteError) {
    return NextResponse.json(
      { error: `Failed to delete post: ${deleteError.message}` },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    message: "Post deleted successfully",
    deletedPostId: id,
  });
}
