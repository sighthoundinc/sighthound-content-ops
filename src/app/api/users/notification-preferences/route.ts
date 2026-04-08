import { NextRequest, NextResponse } from "next/server";
import { invalidateUserPreferencesCache } from "@/lib/notification-preferences-cache";
import { withApiContract } from "@/lib/api-contract";
import { authenticateRequest } from "@/lib/server-permissions";

interface NotificationPreferencesUpdate {
  notifications_enabled?: boolean;
  task_assigned?: boolean;
  stage_changed?: boolean;
  awaiting_action?: boolean;
  mention?: boolean;
  submitted_for_review?: boolean;
  published?: boolean;
  assignment_changed?: boolean;
  notify_on_task_assigned?: boolean;
  notify_on_stage_changed?: boolean;
  notify_on_awaiting_action?: boolean;
  notify_on_mention?: boolean;
  notify_on_submitted_for_review?: boolean;
  notify_on_published?: boolean;
  notify_on_assignment_changed?: boolean;
  slack_delivery_dm?: boolean;
  slack_delivery_channel?: boolean;
}
type RawNotificationPreferences = {
  user_id?: string;
  notifications_enabled?: boolean;
  task_assigned?: boolean;
  stage_changed?: boolean;
  awaiting_action?: boolean;
  mention?: boolean;
  submitted_for_review?: boolean;
  published?: boolean;
  assignment_changed?: boolean;
  notify_on_task_assigned?: boolean;
  notify_on_stage_changed?: boolean;
  notify_on_awaiting_action?: boolean;
  notify_on_mention?: boolean;
  notify_on_submitted_for_review?: boolean;
  notify_on_published?: boolean;
  notify_on_assignment_changed?: boolean;
  slack_delivery_dm?: boolean;
  slack_delivery_channel?: boolean;
  created_at?: string;
  updated_at?: string;
};

function normalizePreferences(preferences: RawNotificationPreferences | null) {
  return {
    user_id: preferences?.user_id,
    notifications_enabled: preferences?.notifications_enabled ?? true,
    task_assigned:
      preferences?.task_assigned ??
      preferences?.notify_on_task_assigned ??
      true,
    stage_changed:
      preferences?.stage_changed ??
      preferences?.notify_on_stage_changed ??
      true,
    awaiting_action:
      preferences?.awaiting_action ??
      preferences?.notify_on_awaiting_action ??
      true,
    mention: preferences?.mention ?? preferences?.notify_on_mention ?? true,
    submitted_for_review:
      preferences?.submitted_for_review ??
      preferences?.notify_on_submitted_for_review ??
      true,
    published:
      preferences?.published ??
      preferences?.notify_on_published ??
      true,
    assignment_changed:
      preferences?.assignment_changed ??
      preferences?.notify_on_assignment_changed ??
      true,
    slack_delivery_dm: preferences?.slack_delivery_dm ?? true,
    slack_delivery_channel: preferences?.slack_delivery_channel ?? true,
    created_at: preferences?.created_at,
    updated_at: preferences?.updated_at,
  };
}

/**
 * GET /api/users/notification-preferences
 * Get the current user's notification preferences
 */
export const GET = withApiContract(async function GET(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request);
    if ("error" in auth) {
      return NextResponse.json(
        { error: auth.error },
        { status: auth.status }
      );
    }

    // Get user's notification preferences
    const { data: preferences, error } = await auth.context.adminClient
      .from("notification_preferences")
      .select("*")
      .eq("user_id", auth.context.userId)
      .single();

    if (error && error.code !== "PGRST116") {
      throw error;
    }

    return NextResponse.json(
      normalizePreferences((preferences ?? null) as RawNotificationPreferences | null)
    );
  } catch (error) {
    console.error("Error fetching notification preferences:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
});

/**
 * PATCH /api/users/notification-preferences
 * Update the current user's notification preferences
 */
export const PATCH = withApiContract(async function PATCH(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request);
    if ("error" in auth) {
      return NextResponse.json(
        { error: auth.error },
        { status: auth.status }
      );
    }

    const body = (await request.json()) as NotificationPreferencesUpdate;

    // Build update object with only provided fields
    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (body.notifications_enabled !== undefined) {
      updates.notifications_enabled = body.notifications_enabled;
    }
    const taskAssigned = body.task_assigned ?? body.notify_on_task_assigned;
    if (taskAssigned !== undefined) {
      updates.notify_on_task_assigned = taskAssigned;
    }
    const stageChanged = body.stage_changed ?? body.notify_on_stage_changed;
    if (stageChanged !== undefined) {
      updates.notify_on_stage_changed = stageChanged;
    }
    const awaitingAction = body.awaiting_action ?? body.notify_on_awaiting_action;
    if (awaitingAction !== undefined) {
      updates.notify_on_awaiting_action = awaitingAction;
    }
    const mention = body.mention ?? body.notify_on_mention;
    if (mention !== undefined) {
      updates.notify_on_mention = mention;
    }
    const submittedForReview =
      body.submitted_for_review ?? body.notify_on_submitted_for_review;
    if (submittedForReview !== undefined) {
      updates.notify_on_submitted_for_review = submittedForReview;
    }
    const published = body.published ?? body.notify_on_published;
    if (published !== undefined) {
      updates.notify_on_published = published;
    }
    const assignmentChanged =
      body.assignment_changed ?? body.notify_on_assignment_changed;
    if (assignmentChanged !== undefined) {
      updates.notify_on_assignment_changed = assignmentChanged;
    }
    if (body.slack_delivery_dm !== undefined) {
      updates.slack_delivery_dm = body.slack_delivery_dm;
    }
    if (body.slack_delivery_channel !== undefined) {
      updates.slack_delivery_channel = body.slack_delivery_channel;
    }

    // Atomic upsert avoids duplicate-key races when multiple requests
    // try to bootstrap/update notification preferences concurrently.
    const { data: upserted, error: upsertError } = await auth.context.adminClient
      .from("notification_preferences")
      .upsert(
        {
          user_id: auth.context.userId,
          ...updates,
        },
        { onConflict: "user_id" }
      )
      .select()
      .single();

    if (upsertError) {
      throw upsertError;
    }

    // Invalidate cache after upsert
    invalidateUserPreferencesCache(auth.context.userId);

    return NextResponse.json(
      normalizePreferences((upserted ?? null) as RawNotificationPreferences | null)
    );
  } catch (error) {
    console.error("Error updating notification preferences:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
});
