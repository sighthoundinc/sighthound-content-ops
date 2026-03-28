import { NextRequest, NextResponse } from "next/server";

import { getUserRoles } from "@/lib/roles";
import { requirePermission } from "@/lib/server-permissions";
import { withApiContract } from "@/lib/api-contract";

export const DELETE = withApiContract(async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requirePermission(request, "delete_idea");
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { id } = await params;

  // Get the idea to verify ownership or admin status
  const { data: idea, error: ideaError } = await auth.context.adminClient
    .from("blog_ideas")
    .select("id, title, created_by")
    .eq("id", id)
    .maybeSingle();

  if (ideaError) {
    console.error("Failed to load idea for deletion:", ideaError);
    return NextResponse.json(
      { error: "Failed to load idea. Please try again." },
      { status: 500 }
    );
  }

  // Idempotent: Already deleted
  if (!idea) {
    return NextResponse.json(
      { message: "Idea already deleted" },
      { status: 200 }
    );
  }

  // Defense-in-depth: only creator or admin can delete
  const roles = getUserRoles(auth.context.profile);
  const isAdmin = roles.includes("admin");
  const isCreator = idea.created_by === auth.context.userId;

  if (!isCreator && !isAdmin) {
    return NextResponse.json(
      { error: "You do not have permission to delete this idea" },
      { status: 403 }
    );
  }

  // Delete the idea (cascades to comments via DB triggers/RLS)
  const { error: deleteError } = await auth.context.adminClient
    .from("blog_ideas")
    .delete()
    .eq("id", id);

  if (deleteError) {
    return NextResponse.json(
      { error: "Failed to delete idea. Please try again." },
      { status: 500 }
    );
  }

  return NextResponse.json(
    {
      data: { deletedIdeaId: id, deletedIdeaTitle: idea.title },
      message: "Idea deleted successfully",
    },
    { status: 200 }
  );
});
