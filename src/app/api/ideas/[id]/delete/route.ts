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

  // Get the idea to verify ownership or admin status
  const { data: idea, error: ideaError } = await auth.context.adminClient
    .from("blog_ideas")
    .select("id, title, created_by")
    .eq("id", id)
    .maybeSingle();

  if (ideaError) {
    return NextResponse.json({ error: ideaError.message }, { status: 500 });
  }

  // Idempotent: Already deleted
  if (!idea) {
    return NextResponse.json(
      { success: true, message: "Idea already deleted" },
      { status: 204 }
    );
  }

  // Check if user is creator or admin
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
      { error: `Failed to delete idea: ${deleteError.message}` },
      { status: 500 }
    );
  }

  return NextResponse.json(
    {
      success: true,
      message: "Idea deleted successfully",
      deletedIdeaId: id,
      deletedIdeaTitle: idea.title,
    },
    { status: 204 }
  );
}
