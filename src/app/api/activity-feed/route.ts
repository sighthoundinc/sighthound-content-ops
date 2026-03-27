import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/server-permissions";
import {
  formatActivityChangeDescription,
  formatActivityEventTitle,
} from "@/lib/activity-history-format";
import { withApiContract } from "@/lib/api-contract";

interface ActivityRecord {
  id: string;
  content_type: "blog" | "social_post";
  content_id: string;
  content_title: string;
  changed_by_name: string | null;
  event_type: string;
  event_title: string;
  event_summary: string | null;
  field_name: string | null;
  old_value: string | null;
  new_value: string | null;
  changed_at: string;
}

/**
 * GET /api/activity-feed
 * Fetches recent blog activity history for display in the notifications bell
 * Includes writer/publisher status changes, assignments, and metadata updates
 */
export const GET = withApiContract(async function GET(request: NextRequest) {
  const auth = await requirePermission(request, "view_dashboard");
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const adminClient = auth.context.adminClient;

  // Fetch user map for display names upfront
  const { data: users } = await adminClient
    .from("profiles")
    .select("id, full_name");

  const userMap = new Map(
    (users ?? [])
      .filter((u): u is { id: string; full_name: string } => Boolean(u?.id))
      .map((u) => [u.id, u.full_name])
  );
  const userNameById = Object.fromEntries(userMap.entries());

  // Fetch blog activity history
  const { data: blogActivityData, error: blogActivityError } = await adminClient
    .from("blog_assignment_history")
    .select(
      `
      id,
      blog_id,
      changed_by,
      event_type,
      field_name,
      old_value,
      new_value,
      changed_at,
      blogs(id, title)
    `
    )
    .order("changed_at", { ascending: false })
    .limit(50);

  if (blogActivityError) {
    console.error("Failed to load blog activity:", blogActivityError);
    return NextResponse.json({ error: "Failed to load activity feed. Please try again." }, { status: 500 });
  }

  // Fetch social post activity history
  const { data: socialActivityData, error: socialActivityError } = await adminClient
    .from("social_post_activity_history")
    .select(
      `
      id,
      social_post_id,
      changed_by,
      event_type,
      field_name,
      old_value,
      new_value,
      changed_at,
      social_posts(id, title)
    `
    )
    .order("changed_at", { ascending: false })
    .limit(50);

  if (socialActivityError) {
    console.error("Failed to load social post activity:", socialActivityError);
    return NextResponse.json({ error: "Failed to load activity feed. Please try again." }, { status: 500 });
  }

  // Transform blog activity records
  const blogActivities: ActivityRecord[] = (blogActivityData ?? [])
    .map((record) => {
      const event = {
        event_type: record.event_type ?? "",
        field_name: record.field_name ?? null,
        old_value: record.old_value ?? null,
        new_value: record.new_value ?? null,
      };
      return {
        id: record.id ?? "",
        content_type: "blog" as const,
        content_id: record.blog_id ?? "",
        content_title: (record.blogs as { title?: string } | null)?.title || "Unknown Blog",
        changed_by_name: record.changed_by ? userMap.get(record.changed_by) ?? null : null,
        event_type: record.event_type ?? "",
        event_title: formatActivityEventTitle(event),
        event_summary: formatActivityChangeDescription(event, { userNameById }),
        field_name: record.field_name ?? null,
        old_value: record.old_value ?? null,
        new_value: record.new_value ?? null,
        changed_at: record.changed_at ?? "",
      };
    })
    .filter((activity) => activity.id && activity.content_id);

  // Transform social post activity records
  const socialActivities: ActivityRecord[] = (socialActivityData ?? [])
    .map((record) => {
      const event = {
        event_type: record.event_type ?? "",
        field_name: record.field_name ?? null,
        old_value: record.old_value ?? null,
        new_value: record.new_value ?? null,
      };
      return {
        id: record.id ?? "",
        content_type: "social_post" as const,
        content_id: record.social_post_id ?? "",
        content_title: (record.social_posts as { title?: string } | null)?.title || "Unknown Social Post",
        changed_by_name: record.changed_by ? userMap.get(record.changed_by) ?? null : null,
        event_type: record.event_type ?? "",
        event_title: formatActivityEventTitle(event),
        event_summary: formatActivityChangeDescription(event, { userNameById }),
        field_name: record.field_name ?? null,
        old_value: record.old_value ?? null,
        new_value: record.new_value ?? null,
        changed_at: record.changed_at ?? "",
      };
    })
    .filter((activity) => activity.id && activity.content_id);

  // Merge and sort by timestamp
  const activities = [...blogActivities, ...socialActivities]
    .sort((a, b) => new Date(b.changed_at).getTime() - new Date(a.changed_at).getTime())
    .slice(0, 50);

  return NextResponse.json({
    data: {
      activities,
      count: activities.length,
    },
  });
});
