import { NextRequest, NextResponse } from "next/server";

import { getUserRoles } from "@/lib/roles";
import { requirePermission } from "@/lib/server-permissions";
import { withApiContract } from "@/lib/api-contract";

export const DELETE = withApiContract(async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requirePermission(request, "delete_social_post");
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { id } = await params;

  // Get the post to verify ownership, admin status, and deletion eligibility
  const { data: post, error: postError } = await auth.context.adminClient
    .from("social_posts")
    .select("id, title, created_by, status")
    .eq("id", id)
    .maybeSingle();

  if (postError) {
    console.error("Failed to load post for deletion:", postError);
    return NextResponse.json({ error: "Failed to load post. Please try again." }, { status: 500 });
  }

  // Idempotent: Already deleted
  if (!post) {
    return NextResponse.json(
      { message: "Post already deleted" },
      { status: 200 }
    );
  }

  // Defense-in-depth: only creator or admin can delete
  const roles = getUserRoles(auth.context.profile);
  const isAdmin = roles.includes("admin");
  const isOwner = post.created_by === auth.context.userId;

  if (!isOwner && !isAdmin) {
    return NextResponse.json(
      { error: "You do not have permission to delete this post" },
      { status: 403 }
    );
  }

  // Prevent deletion of published posts
  if (post.status === "published") {
    return NextResponse.json(
      { error: "Published posts cannot be deleted" },
      { status: 400 }
    );
  }

  // Delete the post (cascades to links, comments, activity history)
  const { error: deleteError } = await auth.context.adminClient
    .from("social_posts")
    .delete()
    .eq("id", id);

  if (deleteError) {
    return NextResponse.json(
      { error: "Failed to delete post. Please try again." },
      { status: 500 }
    );
  }

  return NextResponse.json(
    {
      data: { deletedPostId: id, deletedPostTitle: post.title },
      message: "Post deleted successfully",
    },
    { status: 200 }
  );
});
