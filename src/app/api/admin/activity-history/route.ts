import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { getUserRoles } from "@/lib/roles";
import { authenticateRequest, requirePermission } from "@/lib/server-permissions";
import { createAdminClient } from "@/lib/supabase/server";
import {
  getActivityTypeCategory,
  getActivityTypeLabel,
} from "@/lib/activity-history-format";
import { withApiContract } from "@/lib/api-contract";

type ActivityType =
  | "login"
  | "dashboard_visit"
  | "blog_writer_status_changed"
  | "blog_publisher_status_changed"
  | "blog_assignment_changed"
  | "social_post_status_changed"
  | "social_post_assignment_changed";

interface UnifiedActivity {
  id: string;
  activity_type: ActivityType;
  content_type: "access_log" | "blog" | "social_post";
  user_id: string | null;
  user_name: string | null;
  user_email: string | null;
  content_id: string | null;
  content_title: string | null;
  event_description: string;
  created_at: string;
}

const ACTIVITY_TYPE_LABELS: Record<ActivityType, string> = {
  login: getActivityTypeLabel("login"),
  dashboard_visit: getActivityTypeLabel("dashboard_visit"),
  blog_writer_status_changed: getActivityTypeLabel("blog_writer_status_changed"),
  blog_publisher_status_changed: getActivityTypeLabel("blog_publisher_status_changed"),
  blog_assignment_changed: getActivityTypeLabel("blog_assignment_changed"),
  social_post_status_changed: getActivityTypeLabel("social_post_status_changed"),
  social_post_assignment_changed: getActivityTypeLabel("social_post_assignment_changed"),
};

const ACTIVITY_TYPE_CATEGORIES: Record<ActivityType, string> = {
  login: getActivityTypeCategory("login"),
  dashboard_visit: getActivityTypeCategory("dashboard_visit"),
  blog_writer_status_changed: getActivityTypeCategory("blog_writer_status_changed"),
  blog_publisher_status_changed: getActivityTypeCategory("blog_publisher_status_changed"),
  blog_assignment_changed: getActivityTypeCategory("blog_assignment_changed"),
  social_post_status_changed: getActivityTypeCategory("social_post_status_changed"),
  social_post_assignment_changed: getActivityTypeCategory("social_post_assignment_changed"),
};

/**
 * GET /api/admin/activity-history
 * Unified activity history with multi-select filtering
 * Query params:
 *   - activity_types: comma-separated list of activity types
 *   - user_ids: comma-separated list of user IDs
 *   - limit: page size (default 100, max 1000)
 *   - offset: pagination offset
 */
async function batchLoadProfiles(
  adminClient: ReturnType<typeof createAdminClient>,
  userIds: string[]
) {
  if (userIds.length === 0) return new Map();
  const { data: profiles } = await adminClient
    .from("profiles")
    .select("id, full_name, email");
  const profileMap = new Map(
    (profiles ?? []).map((p) => [
      p.id,
      { full_name: p.full_name, email: p.email },
    ])
  );
  return profileMap;
}

export const GET = withApiContract(async function GET(request: NextRequest) {
  const auth = await requirePermission(request, "manage_users");
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const adminClient = auth.context.adminClient;

  const url = new URL(request.url);
  const activityTypesParam = url.searchParams.get("activity_types");
  const userIdsParam = url.searchParams.get("user_ids");
  const limit = Math.min(parseInt(url.searchParams.get("limit") || "100"), 1000);
  const offset = parseInt(url.searchParams.get("offset") || "0");

  // Parse activity types
  const selectedActivityTypes: ActivityType[] = activityTypesParam
    ? (activityTypesParam.split(",") as ActivityType[]).filter((type) =>
        Object.keys(ACTIVITY_TYPE_LABELS).includes(type)
      )
    : (Object.keys(ACTIVITY_TYPE_LABELS) as ActivityType[]);

  // Parse user IDs
  const selectedUserIds: string[] = userIdsParam
    ? userIdsParam.split(",").filter((id) => id.trim())
    : [];

  try {
    const activities: UnifiedActivity[] = [];
    const userIdsToLoad = new Set<string>();

    // Fetch access logs (no pagination at query level)
    if (
      selectedActivityTypes.some((t) =>
        ["login", "dashboard_visit"].includes(t)
      )
    ) {
      const accessLogTypes = selectedActivityTypes.filter((t) =>
        ["login", "dashboard_visit"].includes(t)
      ) as ("login" | "dashboard_visit")[];

      let accessLogsQuery = adminClient
        .from("access_logs")
        .select("id, user_id, event_type, created_at");

      if (selectedUserIds.length > 0) {
        accessLogsQuery = accessLogsQuery.in("user_id", selectedUserIds);
      }

      if (accessLogTypes.length > 0) {
        accessLogsQuery = accessLogsQuery.in("event_type", accessLogTypes);
      }

      const { data: accessLogs } = await accessLogsQuery.order("created_at", {
        ascending: false,
      });

      if (accessLogs) {
        for (const log of accessLogs) {
          userIdsToLoad.add(log.user_id);
          activities.push({
            id: `access_log_${log.id}`,
            activity_type: log.event_type as ActivityType,
            content_type: "access_log",
            user_id: log.user_id,
            user_name: null,
            user_email: null,
            content_id: null,
            content_title: null,
            event_description: ACTIVITY_TYPE_LABELS[log.event_type as ActivityType],
            created_at: log.created_at,
          });
        }
      }
    }

    // Fetch blog activities (no pagination at query level)
    if (
      selectedActivityTypes.some((t) =>
        [
          "blog_writer_status_changed",
          "blog_publisher_status_changed",
          "blog_assignment_changed",
        ].includes(t)
      )
    ) {
      let blogActivityQuery = adminClient
        .from("blog_assignment_history")
        .select("id, blog_id, changed_by, event_type, created_at, blogs(title)");

      if (selectedUserIds.length > 0) {
        blogActivityQuery = blogActivityQuery.in("changed_by", selectedUserIds);
      }

      const { data: blogActivities } = await blogActivityQuery.order(
        "created_at",
        { ascending: false }
      );

      if (blogActivities) {
        for (const activity of blogActivities) {
          const eventType = activity.event_type as ActivityType;

          if (selectedActivityTypes.includes(eventType)) {
            userIdsToLoad.add(activity.changed_by);
            activities.push({
              id: `blog_${activity.id}`,
              activity_type: eventType,
              content_type: "blog",
              user_id: activity.changed_by,
              user_name: null,
              user_email: null,
              content_id: activity.blog_id,
              content_title: (activity.blogs as { title?: string } | null)
                ?.title || null,
              event_description: ACTIVITY_TYPE_LABELS[eventType],
              created_at: activity.created_at,
            });
          }
        }
      }
    }

    // Fetch social post activities (no pagination at query level)
    if (
      selectedActivityTypes.some((t) =>
        [
          "social_post_status_changed",
          "social_post_assignment_changed",
        ].includes(t)
      )
    ) {
      let socialActivityQuery = adminClient
        .from("social_post_activity_history")
        .select(
          "id, social_post_id, changed_by, event_type, created_at, social_posts(title)"
        );

      if (selectedUserIds.length > 0) {
        socialActivityQuery = socialActivityQuery.in(
          "changed_by",
          selectedUserIds
        );
      }

      const { data: socialActivities } = await socialActivityQuery.order(
        "created_at",
        { ascending: false }
      );

      if (socialActivities) {
        for (const activity of socialActivities) {
          const eventType = activity.event_type as ActivityType;

          if (selectedActivityTypes.includes(eventType)) {
            userIdsToLoad.add(activity.changed_by);
            activities.push({
              id: `social_post_${activity.id}`,
              activity_type: eventType,
              content_type: "social_post",
              user_id: activity.changed_by,
              user_name: null,
              user_email: null,
              content_id: activity.social_post_id,
              content_title: (activity.social_posts as {
                title?: string;
              } | null)?.title || null,
              event_description: ACTIVITY_TYPE_LABELS[eventType],
              created_at: activity.created_at,
            });
          }
        }
      }
    }

    // Batch-load all profiles
    const profileMap = await batchLoadProfiles(
      adminClient,
      Array.from(userIdsToLoad)
    );

    // Enrich activities with profile data
    const enrichedActivities = activities.map((activity) => {
      const profile = profileMap.get(activity.user_id ?? "");
      return {
        ...activity,
        user_name: profile?.full_name || null,
        user_email: profile?.email || null,
      };
    });

    // Sort by created_at descending and apply pagination
    const sortedActivities = enrichedActivities.sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    const paginatedActivities = sortedActivities.slice(offset, offset + limit);

    return NextResponse.json({
      activities: paginatedActivities,
      total: sortedActivities.length,
      limit,
      offset,
      activityTypeLabels: ACTIVITY_TYPE_LABELS,
      activityTypeCategories: ACTIVITY_TYPE_CATEGORIES,
    });
  } catch (error) {
    console.error("Error in activity history GET endpoint:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
});

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

export const DELETE = withApiContract(async function DELETE(request: NextRequest) {
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
      console.log(`[Activity History] Deleting from ${table}`, {
        scope: parsed.data.scope,
        targetUserIds,
      });

      let deleteQuery = adminClient.from(table).delete().gt("id", "00000000-0000-0000-0000-000000000000");
      if (targetUserIds && targetUserIds.length > 0) {
        deleteQuery = deleteQuery.in("changed_by", targetUserIds);
      }
      const { count, error: deleteError } = await deleteQuery;
      if (deleteError) {
        console.error(`[Activity History] Error deleting from ${table}:`, deleteError);
        throw new Error(`${table}: ${deleteError.message}`);
      }
      console.log(`[Activity History] Successfully deleted ${count} rows from ${table}`);

      return count ?? 0;
    };
    const deleteCommentActivityForTable = async (table: CommentActivityTable) => {
      console.log(`[Comments] Deleting from ${table}`, {
        scope: parsed.data.scope,
        targetUserIds,
      });

      if (!targetUserIds || targetUserIds.length === 0) {
        console.log(`[Comments] No target user IDs, skipping delete for ${table}`);
        return 0;
      }

      const [{ count: userIdCount, error: userIdError }, { count: createdByCount, error: createdByError }] = await Promise.all([
        adminClient
          .from(table)
          .delete()
          .in("user_id", targetUserIds),
        adminClient
          .from(table)
          .delete()
          .in("created_by", targetUserIds),
      ]);

      if (userIdError) {
        console.error(`[Comments] Error deleting from ${table} by user_id:`, userIdError);
        throw new Error(`${table}: ${userIdError.message}`);
      }
      if (createdByError) {
        console.error(`[Comments] Error deleting from ${table} by created_by:`, createdByError);
        throw new Error(`${table}: ${createdByError.message}`);
      }

      const totalDeleted = (userIdCount ?? 0) + (createdByCount ?? 0);
      console.log(`[Comments] Successfully deleted ${totalDeleted} rows from ${table}`);

      return totalDeleted;
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
});
