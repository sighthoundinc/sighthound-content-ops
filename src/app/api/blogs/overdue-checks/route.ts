import { NextRequest, NextResponse } from "next/server";

import { authenticateRequest } from "@/lib/server-permissions";
import { getUserRoles } from "@/lib/roles";
import { withApiContract } from "@/lib/api-contract";
import { emitWorkflowSlackEvent } from "@/lib/server-slack-emitter";
import {
  getCurrentDateIso,
  getOverdueUpdatedAtCutoffIso,
} from "@/lib/overdue-window";

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
  const overdueUpdatedAtCutoffIso = getOverdueUpdatedAtCutoffIso(now);
  const requestAuthToken = request.headers.get("authorization") ?? undefined;

  // Check for blogs stuck in pending_review publisher status (overdue for publishing)
  // Look for blogs with a scheduled_publish_date that has passed or is today
  const todayIso = getCurrentDateIso(now);

  const { data: publishDueBlogs, error: publishError } = await auth.context.adminClient
    .from("blogs")
    .select(
      "id,title,site,publisher_id,scheduled_publish_date,last_publish_overdue_notification_at"
    )
    .eq("publisher_status", "pending_review")
    .lte("scheduled_publish_date", todayIso)
    .lte("updated_at", overdueUpdatedAtCutoffIso);

  if (publishError) {
    console.error("Failed to load blogs for publish overdue check:", publishError);
    return NextResponse.json(
      { error: "Failed to load blogs for publish overdue check." },
      { status: 500 }
    );
  }

  let publishOverdueNotificationsSent = 0;
  const claimPublishOverdueSlot = async (options: {
    id: string;
    previousTimestamp: string | null;
  }) => {
    let claimQuery = auth.context.adminClient
      .from("blogs")
      .update({ last_publish_overdue_notification_at: nowIso })
      .eq("id", options.id)
      .eq("publisher_status", "pending_review")
      .lte("scheduled_publish_date", todayIso);
    claimQuery = options.previousTimestamp
      ? claimQuery.eq(
          "last_publish_overdue_notification_at",
          options.previousTimestamp
        )
      : claimQuery.is("last_publish_overdue_notification_at", null);

    const { data: claimedRow, error: claimError } = await claimQuery
      .select("id")
      .maybeSingle();
    if (claimError) {
      console.warn("Failed to claim blog overdue notification slot:", claimError);
      return false;
    }
    return Boolean(claimedRow);
  };

  // Process publish overdue blogs
  for (const blog of publishDueBlogs ?? []) {
    // Skip if notification was sent within last 24 hours
    if (blog.last_publish_overdue_notification_at) {
      const previousNotificationAt = new Date(blog.last_publish_overdue_notification_at).getTime();
      if (!Number.isNaN(previousNotificationAt) && now - previousNotificationAt < OVERDUE_COOLDOWN_MS) {
        continue;
      }
    }
    const claimed = await claimPublishOverdueSlot({
      id: blog.id,
      previousTimestamp: blog.last_publish_overdue_notification_at ?? null,
    });
    if (!claimed) {
      continue;
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
    }, {
      authToken: requestAuthToken,
    });
    if (emitSuccess) {
      publishOverdueNotificationsSent += 1;
    }
    void emitWorkflowSlackEvent(auth.context.adminClient, {
      eventType: "blog_publish_overdue",
      blogId: blog.id,
      title: blog.title ?? "Blog",
      site: blog.site ?? "sighthound.com",
      actorName: "System",
      targetUserId: blog.publisher_id ?? undefined,
    });
  }

  return NextResponse.json({
    publishOverdueNotificationsSent,
    totalNotificationsSent: publishOverdueNotificationsSent,
  });
});
