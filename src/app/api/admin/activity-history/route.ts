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
    console.log("[Activity History] DELETE request received");
    const auth = await authenticateRequest(request);
    if ("error" in auth) {
      console.error("[Activity History] Auth failed:", auth.error);
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const roles = getUserRoles(auth.context.profile);
    if (!roles.includes("admin")) {
      console.error("[Activity History] Non-admin attempted cleanup");
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
    console.log("[Activity History] Raw request body:", body);
    const parsed = deleteActivityHistorySchema.safeParse(body);
    if (!parsed.success) {
      console.error("[Activity History] Validation failed:", parsed.error.issues);
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid request body." },
        { status: 400 }
      );
    }
    console.log("[Activity History] Parsed request:", {
      scope: parsed.data.scope,
      includeCommentsActivity: parsed.data.includeCommentsActivity,
      requestedUserIds: parsed.data.userIds?.length ?? 0,
    });

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
      console.log(`[Activity History] Counting rows in ${table}`, {
        scope: parsed.data.scope,
        targetUserIds,
      });
      let countQuery = adminClient
        .from(table)
        .select("*", { count: "exact", head: true });
      if (targetUserIds && targetUserIds.length > 0) {
        countQuery = countQuery.in("changed_by", targetUserIds);
      } else {
        // For delete all, we need to add a condition that's always true
        // to satisfy Supabase's requirement for WHERE clause
        countQuery = countQuery.neq("id", null);
      }
      const { count, error: countError } = await countQuery;
      if (countError) {
        console.error(`[Activity History] Error counting ${table}:`, countError);
        throw new Error(`${table}: ${countError.message}`);
      }
      console.log(`[Activity History] Found ${count} rows in ${table} to delete`);

      let deleteQuery = adminClient.from(table).delete();
      if (targetUserIds && targetUserIds.length > 0) {
        deleteQuery = deleteQuery.in("changed_by", targetUserIds);
      } else {
        // For delete all, we need to add a condition that's always true
        deleteQuery = deleteQuery.neq("id", null);
      }
      const { error: deleteError } = await deleteQuery;
      if (deleteError) {
        console.error(`[Activity History] Error deleting from ${table}:`, deleteError);
        throw new Error(`${table}: ${deleteError.message}`);
      }
      console.log(`[Activity History] Successfully deleted ${count} rows from ${table}`);

      return count ?? 0;
    };
    const deleteCommentActivityForTable = async (table: CommentActivityTable) => {
      console.log(`[Comments] Counting rows in ${table}`, {
        scope: parsed.data.scope,
        targetUserIds,
      });
      let countQuery = adminClient
        .from(table)
        .select("*", { count: "exact", head: true });
      if (targetUserIds && targetUserIds.length > 0) {
        const filterStr = `user_id.in.(${targetUserIds.join(",")}),created_by.in.(${targetUserIds.join(",")})`;
        console.log(`[Comments] Applying filter: ${filterStr}`);
        countQuery = countQuery.or(filterStr);
      } else {
        // For delete all, we need to add a condition that's always true
        console.log(`[Comments] Applying delete-all condition for ${table}`);
        countQuery = countQuery.neq("id", null);
      }
      const { count, error: countError } = await countQuery;
      if (countError) {
        console.error(`[Comments] Error counting ${table}:`, countError);
        throw new Error(`${table}: ${countError.message}`);
      }
      console.log(`[Comments] Found ${count} rows in ${table} to delete`);

      let deleteQuery = adminClient.from(table).delete();
      if (targetUserIds && targetUserIds.length > 0) {
        const filterStr = `user_id.in.(${targetUserIds.join(",")}),created_by.in.(${targetUserIds.join(",")})`;
        console.log(`[Comments] Applying delete filter: ${filterStr}`);
        deleteQuery = deleteQuery.or(filterStr);
      } else {
        // For delete all, we need to add a condition that's always true
        console.log(`[Comments] Applying delete-all condition for ${table}`);
        deleteQuery = deleteQuery.neq("id", null);
      }
      const { error: deleteError } = await deleteQuery;
      if (deleteError) {
        console.error(`[Comments] Error deleting from ${table}:`, deleteError);
        throw new Error(`${table}: ${deleteError.message}`);
      }
      console.log(`[Comments] Successfully deleted ${count} rows from ${table}`);

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
    console.log("[Activity History] Cleanup complete:", {
      scope: parsed.data.scope,
      includeCommentsActivity: parsed.data.includeCommentsActivity,
      blogAssignmentHistoryDeleted,
      socialPostActivityHistoryDeleted,
      permissionAuditLogsDeleted,
      blogCommentsDeleted,
      socialPostCommentsDeleted,
      totalDeleted,
    });

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
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Activity history deletion error:", errorMessage, error);
    return NextResponse.json(
      { error: `Unexpected server error: ${errorMessage}` },
      { status: 500 }
    );
  }
}
