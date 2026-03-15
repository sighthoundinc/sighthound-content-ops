import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { getUserRoles } from "@/lib/roles";
import { authenticateRequest } from "@/lib/server-permissions";

const deleteActivityHistorySchema = z.object({
  scope: z.enum(["all", "users"]).default("all"),
  userIds: z.array(z.string().uuid()).optional(),
  includeCommentsActivity: z.boolean().default(false),
});

type ActivityHistoryTable =
  | "blog_assignment_history"
  | "social_post_activity_history"
  | "permission_audit_logs";
type CommentActivityTable = "blog_comments" | "social_post_comments";

export async function DELETE(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request);
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const roles = getUserRoles(auth.context.profile);
    if (!roles.includes("admin")) {
      return NextResponse.json(
        { error: "Only admins can delete activity history." },
        { status: 403 }
      );
    }

    let body: unknown = {};
    try {
      body = await request.json();
    } catch {
      body = {};
    }
    const parsed = deleteActivityHistorySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid request body." },
        { status: 400 }
      );
    }

    const normalizedUserIds = Array.from(new Set(parsed.data.userIds ?? []));
    if (parsed.data.scope === "users" && normalizedUserIds.length === 0) {
      return NextResponse.json(
        { error: "Select at least one user for targeted cleanup." },
        { status: 400 }
      );
    }

    const targetUserIds =
      parsed.data.scope === "users" ? normalizedUserIds : null;
    const adminClient = auth.context.adminClient;

    const deleteForTable = async (table: ActivityHistoryTable) => {
      let countQuery = adminClient
        .from(table)
        .select("*", { count: "exact", head: true });
      if (targetUserIds && targetUserIds.length > 0) {
        countQuery = countQuery.in("changed_by", targetUserIds);
      }
      const { count, error: countError } = await countQuery;
      if (countError) {
        throw new Error(countError.message);
      }

      let deleteQuery = adminClient.from(table).delete();
      if (targetUserIds && targetUserIds.length > 0) {
        deleteQuery = deleteQuery.in("changed_by", targetUserIds);
      }
      const { error: deleteError } = await deleteQuery;
      if (deleteError) {
        throw new Error(deleteError.message);
      }

      return count ?? 0;
    };
    const deleteCommentActivityForTable = async (table: CommentActivityTable) => {
      let countQuery = adminClient
        .from(table)
        .select("*", { count: "exact", head: true });
      if (targetUserIds && targetUserIds.length > 0) {
        const actorFilter = `user_id.in.(${targetUserIds.join(
          ","
        )}),created_by.in.(${targetUserIds.join(",")})`;
        countQuery = countQuery.or(actorFilter);
      }
      const { count, error: countError } = await countQuery;
      if (countError) {
        throw new Error(countError.message);
      }

      let deleteQuery = adminClient.from(table).delete();
      if (targetUserIds && targetUserIds.length > 0) {
        const actorFilter = `user_id.in.(${targetUserIds.join(
          ","
        )}),created_by.in.(${targetUserIds.join(",")})`;
        deleteQuery = deleteQuery.or(actorFilter);
      }
      const { error: deleteError } = await deleteQuery;
      if (deleteError) {
        throw new Error(deleteError.message);
      }

      return count ?? 0;
    };

    const blogAssignmentHistoryDeleted = await deleteForTable(
      "blog_assignment_history"
    );
    const socialPostActivityHistoryDeleted = await deleteForTable(
      "social_post_activity_history"
    );
    const permissionAuditLogsDeleted = await deleteForTable(
      "permission_audit_logs"
    );
    const blogCommentsDeleted = parsed.data.includeCommentsActivity
      ? await deleteCommentActivityForTable("blog_comments")
      : 0;
    const socialPostCommentsDeleted = parsed.data.includeCommentsActivity
      ? await deleteCommentActivityForTable("social_post_comments")
      : 0;

    const totalDeleted =
      blogAssignmentHistoryDeleted +
      socialPostActivityHistoryDeleted +
      permissionAuditLogsDeleted +
      blogCommentsDeleted +
      socialPostCommentsDeleted;

    return NextResponse.json({
      scope: parsed.data.scope,
      targetedUserIds: targetUserIds,
      includeCommentsActivity: parsed.data.includeCommentsActivity,
      blogAssignmentHistoryDeleted,
      socialPostActivityHistoryDeleted,
      permissionAuditLogsDeleted,
      blogCommentsDeleted,
      socialPostCommentsDeleted,
      totalDeleted,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Unexpected server error" },
      { status: 500 }
    );
  }
}
