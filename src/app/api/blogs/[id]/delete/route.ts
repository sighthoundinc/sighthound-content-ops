import { NextRequest, NextResponse } from "next/server";

import { getUserRoles } from "@/lib/roles";
import { requirePermission } from "@/lib/server-permissions";
import { withApiContract } from "@/lib/api-contract";

export const DELETE = withApiContract(async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requirePermission(request, "delete_blog");
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { id } = await params;

  // Get the blog to verify ownership, admin status, and deletion eligibility
  const { data: blog, error: blogError } = await auth.context.adminClient
    .from("blogs")
    .select("id, title, created_by, publisher_status")
    .eq("id", id)
    .maybeSingle();

  if (blogError) {
    console.error("Failed to load blog for deletion:", blogError);
    return NextResponse.json({ error: "Failed to load blog. Please try again." }, { status: 500 });
  }

  // Idempotent: Already deleted
  if (!blog) {
    return NextResponse.json(
      { message: "Blog already deleted" },
      { status: 200 }
    );
  }

  // Defense-in-depth: verify creator or admin (delete_blog is admin-locked,
  // so only admins reach here, but keep this check as a safety net)
  const roles = getUserRoles(auth.context.profile);
  const isAdmin = roles.includes("admin");
  const isCreator = blog.created_by === auth.context.userId;

  if (!isCreator && !isAdmin) {
    return NextResponse.json(
      { error: "You do not have permission to delete this blog" },
      { status: 403 }
    );
  }

  // Prevent deletion of published blogs (publisher_status === 'completed')
  if (blog.publisher_status === "completed") {
    return NextResponse.json(
      { error: "Published blogs cannot be deleted" },
      { status: 400 }
    );
  }

  // Check for linked social posts
  const { data: linkedPosts, error: linkedError } = await auth.context.adminClient
    .from("social_posts")
    .select("id, title")
    .eq("associated_blog_id", id);

  if (linkedError) {
    return NextResponse.json(
      { error: "Failed to check linked content. Please try again." },
      { status: 500 }
    );
  }

  if (linkedPosts && linkedPosts.length > 0) {
    return NextResponse.json(
      {
        error: `This blog has ${linkedPosts.length} linked social post${linkedPosts.length === 1 ? "" : "s"}. Unlink them before deleting.`,
        linkedPostCount: linkedPosts.length,
        linkedPostIds: linkedPosts.map((p) => p.id),
      },
      { status: 409 }
    );
  }

  // Delete the blog (cascades to comments, activity history via DB triggers/RLS)
  const { error: deleteError } = await auth.context.adminClient
    .from("blogs")
    .delete()
    .eq("id", id);

  if (deleteError) {
    console.error("Failed to delete blog:", deleteError);
    return NextResponse.json(
      { error: "Failed to delete blog. Please try again." },
      { status: 500 }
    );
  }

  return NextResponse.json(
    {
      data: { deletedBlogId: id, deletedBlogTitle: blog.title },
      message: "Blog deleted successfully",
    },
    { status: 200 }
  );
});
