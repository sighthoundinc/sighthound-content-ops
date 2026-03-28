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

  // Check for social posts stuck in in_review status (overdue for review)
  const { data: reviewDuePost, error: reviewError } = await auth.context.adminClient
    .from("social_posts")
    .select("id,title,product,status,last_review_overdue_notification_at")
    .eq("status", "in_review")
    .gte("updated_at", oneDayAgo);

  if (reviewError) {
    console.error("Failed to load posts for review overdue check:", reviewError);
    return NextResponse.json(
      { error: "Failed to load posts for review overdue check." },
      { status: 500 }
    );
  }

  // Check for social posts stuck in ready_to_publish status (overdue for publishing)
  const { data: publishDuePost, error: publishError } = await auth.context.adminClient
    .from("social_posts")
    .select("id,title,product,status,scheduled_date,last_publish_overdue_notification_at")
    .eq("status", "ready_to_publish")
    .not("scheduled_date", "is", null)
    .gte("updated_at", oneDayAgo);

  if (publishError) {
    console.error("Failed to load posts for publish overdue check:", publishError);
    return NextResponse.json(
      { error: "Failed to load posts for publish overdue check." },
      { status: 500 }
    );
  }

  let reviewOverdueNotificationsSent = 0;
  let publishOverdueNotificationsSent = 0;

  // Process review overdue posts
  for (const post of reviewDuePost ?? []) {
    // Skip if notification was sent within last 24 hours
    if (post.last_review_overdue_notification_at) {
      const previousNotificationAt = new Date(post.last_review_overdue_notification_at).getTime();
      if (!Number.isNaN(previousNotificationAt) && now - previousNotificationAt < OVERDUE_COOLDOWN_MS) {
        continue;
      }
    }

    const { emitEvent } = await import("@/lib/emit-event");
    const { success: emitSuccess } = await emitEvent({
      type: "social_review_overdue",
      contentType: "social_post",
      contentId: post.id,
      actor: "system",
      actorName: "System",
      contentTitle: post.title,
      timestamp: Date.now(),
    });
    if (emitSuccess) {
      reviewOverdueNotificationsSent += 1;
    }
  }

  // Process publish overdue posts
  for (const post of publishDuePost ?? []) {
    // Skip if notification was sent within last 24 hours
    if (post.last_publish_overdue_notification_at) {
      const previousNotificationAt = new Date(post.last_publish_overdue_notification_at).getTime();
      if (!Number.isNaN(previousNotificationAt) && now - previousNotificationAt < OVERDUE_COOLDOWN_MS) {
        continue;
      }
    }

    const { emitEvent } = await import("@/lib/emit-event");
    const { success: emitSuccess } = await emitEvent({
      type: "social_publish_overdue",
      contentType: "social_post",
      contentId: post.id,
      actor: "system",
      actorName: "System",
      contentTitle: post.title,
      timestamp: Date.now(),
    });
    if (emitSuccess) {
      publishOverdueNotificationsSent += 1;
    }
  }

  // Update notification timestamps for review posts (non-blocking)
  const reviewIds = reviewDuePost?.map((p) => p.id) ?? [];
  if (reviewIds.length > 0) {
    auth.context.adminClient
      .from("social_posts")
      .update({ last_review_overdue_notification_at: nowIso })
      .in("id", reviewIds)
      .then(({ error: updateError }) => {
        if (updateError) {
          console.warn("Failed to update social post review overdue notification timestamps:", updateError);
        }
      });
  }

  // Update notification timestamps for publish posts (non-blocking)
  const publishIds = publishDuePost?.map((p) => p.id) ?? [];
  if (publishIds.length > 0) {
    auth.context.adminClient
      .from("social_posts")
      .update({ last_publish_overdue_notification_at: nowIso })
      .in("id", publishIds)
      .then(({ error: updateError }) => {
        if (updateError) {
          console.warn("Failed to update social post publish overdue notification timestamps:", updateError);
        }
      });
  }

  return NextResponse.json({
    reviewOverdueNotificationsSent,
    publishOverdueNotificationsSent,
    totalNotificationsSent: reviewOverdueNotificationsSent + publishOverdueNotificationsSent,
  });
});
