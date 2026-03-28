import { NextRequest, NextResponse } from "next/server";

import { getUserRoles } from "@/lib/roles";
import { authenticateRequest } from "@/lib/server-permissions";
import { withApiContract } from "@/lib/api-contract";

const REMINDER_COOLDOWN_MS = 24 * 60 * 60 * 1000;

export const POST = withApiContract(async function POST(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const roles = getUserRoles(auth.context.profile);
  if (!roles.includes("admin")) {
    return NextResponse.json(
      { error: "Only admins can trigger social live-link reminders." },
      { status: 403 }
    );
  }

  const now = Date.now();
  const nowIso = new Date(now).toISOString();

  const { data: awaitingPosts, error: postsError } = await auth.context.adminClient
    .from("social_posts")
    .select("id,title,last_live_link_reminder_at")
    .eq("status", "awaiting_live_link");

  if (postsError) {
    console.error("Failed to load posts for reminders:", postsError);
    return NextResponse.json({ error: "Failed to load posts. Please try again." }, { status: 500 });
  }

  const duePosts = (awaitingPosts ?? []).filter((post) => {
    if (!post.last_live_link_reminder_at) {
      return true;
    }
    const previousReminderAt = new Date(post.last_live_link_reminder_at).getTime();
    if (Number.isNaN(previousReminderAt)) {
      return true;
    }
    return now - previousReminderAt >= REMINDER_COOLDOWN_MS;
  });

  if (duePosts.length === 0) {
    return NextResponse.json({ remindersSent: 0, updated: 0, posts: [] });
  }

  let remindersSent = 0;
  for (const post of duePosts) {
    const { emitEvent } = await import("@/lib/emit-event");
    const { success: emitSuccess } = await emitEvent({
      type: "social_post_live_link_reminder",
      contentType: "social_post",
      contentId: post.id,
      actor: "system",
      actorName: "System",
      contentTitle: post.title,
      timestamp: Date.now(),
    });
    if (emitSuccess) {
      remindersSent += 1;
    }
  }

  const dueIds = duePosts.map((post) => post.id);
  const { error: updateError } = await auth.context.adminClient
    .from("social_posts")
    .update({ last_live_link_reminder_at: nowIso })
    .in("id", dueIds);

  if (updateError) {
    console.error("Failed to update reminder timestamps:", updateError);
    return NextResponse.json({ error: "Failed to update reminder timestamps. Please try again." }, { status: 500 });
  }

  return NextResponse.json({
    remindersSent,
    updated: dueIds.length,
    posts: duePosts.map((post) => ({
      id: post.id,
      title: post.title,
    })),
  });
});
