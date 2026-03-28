import { NextRequest, NextResponse } from "next/server";

import { authenticateRequest } from "@/lib/server-permissions";
import { getUserRoles } from "@/lib/roles";
import { withApiContract } from "@/lib/api-contract";

const OVERDUE_COOLDOWN_MS = 24 * 60 * 60 * 1000;

export const POST = withApiContract(async function POST(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const roles = getUserRoles(auth.context.profile);
  if (!roles.includes("admin")) {
    return NextResponse.json(
      { error: "Only admins can trigger overdue checks." },
      { status: 403 }
    );
  }

  const now = Date.now();
  const nowIso = new Date(now).toISOString();
  const oneDayAgo = new Date(now - 24 * 60 * 60 * 1000).toISOString();

  // Check for blogs stuck in pending_review publisher status (overdue for publishing)
  // Look for blogs with a scheduled_publish_date that has passed or is today
  const todayIso = new Date(now).toISOString().split("T")[0];

  const { data: publishDueBlogs, error: publishError } = await auth.context.adminClient
    .from("blogs")
    .select("id,title,site,publisher_id,scheduled_publish_date,last_publish_overdue_notification_at")
    .eq("publisher_status", "pending_review")
    .lte("scheduled_publish_date", todayIso)
    .gte("updated_at", oneDayAgo);

  if (publishError) {
    console.error("Failed to load blogs for publish overdue check:", publishError);
    return NextResponse.json(
      { error: "Failed to load blogs for publish overdue check." },
      { status: 500 }
    );
  }

  let publishOverdueNotificationsSent = 0;

  // Process publish overdue blogs
  for (const blog of publishDueBlogs ?? []) {
    // Skip if notification was sent within last 24 hours
    if (blog.last_publish_overdue_notification_at) {
      const previousNotificationAt = new Date(blog.last_publish_overdue_notification_at).getTime();
      if (!Number.isNaN(previousNotificationAt) && now - previousNotificationAt < OVERDUE_COOLDOWN_MS) {
        continue;
      }
    }

    const { emitEvent } = await import("@/lib/emit-event");
    const { success: emitSuccess } = await emitEvent({
      type: "blog_publish_overdue",
      contentType: "blog",
      contentId: blog.id,
      actor: "system",
      actorName: "System",
      contentTitle: blog.title,
      timestamp: Date.now(),
    });
    if (emitSuccess) {
      publishOverdueNotificationsSent += 1;
    }
  }

  // Update notification timestamps for publish blogs (non-blocking)
  const publishIds = publishDueBlogs?.map((b) => b.id) ?? [];
  if (publishIds.length > 0) {
    auth.context.adminClient
      .from("blogs")
      .update({ last_publish_overdue_notification_at: nowIso })
      .in("id", publishIds)
      .then(({ error: updateError }) => {
        if (updateError) {
          console.warn("Failed to update blog publish overdue notification timestamps:", updateError);
        }
      });
  }

  return NextResponse.json({
    publishOverdueNotificationsSent,
    totalNotificationsSent: publishOverdueNotificationsSent,
  });
});
