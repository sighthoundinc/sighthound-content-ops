import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { invalidateUserPreferencesCache } from "@/lib/notification-preferences-cache";

interface NotificationPreferencesUpdate {
  notifications_enabled?: boolean;
  notify_on_task_assigned?: boolean;
  notify_on_stage_changed?: boolean;
  notify_on_awaiting_action?: boolean;
  notify_on_mention?: boolean;
  notify_on_submitted_for_review?: boolean;
  notify_on_published?: boolean;
  notify_on_assignment_changed?: boolean;
}

/**
 * GET /api/users/notification-preferences
 * Get the current user's notification preferences
 */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader) {
      return NextResponse.json(
        { error: "Missing authorization header" },
        { status: 401 }
      );
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Extract user from JWT in authorization header
    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
    } = await supabase.auth.getUser(token);

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Get user's notification preferences
    const { data: preferences, error } = await supabase
      .from("notification_preferences")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (error && error.code !== "PGRST116") {
      throw error;
    }

    // If no preferences exist, return defaults (all enabled)
    if (!preferences) {
      return NextResponse.json({
        notifications_enabled: true,
        notify_on_task_assigned: true,
        notify_on_stage_changed: true,
        notify_on_awaiting_action: true,
        notify_on_mention: true,
        notify_on_submitted_for_review: true,
        notify_on_published: true,
        notify_on_assignment_changed: true,
      });
    }

    return NextResponse.json(preferences);
  } catch (error) {
    console.error("Error fetching notification preferences:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/users/notification-preferences
 * Update the current user's notification preferences
 */
export async function PATCH(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader) {
      return NextResponse.json(
        { error: "Missing authorization header" },
        { status: 401 }
      );
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Extract user from JWT
    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
    } = await supabase.auth.getUser(token);

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
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
    if (body.notify_on_task_assigned !== undefined) {
      updates.notify_on_task_assigned = body.notify_on_task_assigned;
    }
    if (body.notify_on_stage_changed !== undefined) {
      updates.notify_on_stage_changed = body.notify_on_stage_changed;
    }
    if (body.notify_on_awaiting_action !== undefined) {
      updates.notify_on_awaiting_action = body.notify_on_awaiting_action;
    }
    if (body.notify_on_mention !== undefined) {
      updates.notify_on_mention = body.notify_on_mention;
    }
    if (body.notify_on_submitted_for_review !== undefined) {
      updates.notify_on_submitted_for_review = body.notify_on_submitted_for_review;
    }
    if (body.notify_on_published !== undefined) {
      updates.notify_on_published = body.notify_on_published;
    }
    if (body.notify_on_assignment_changed !== undefined) {
      updates.notify_on_assignment_changed = body.notify_on_assignment_changed;
    }

    // Try to update existing preferences
    const { data: updated, error: updateError } = await supabase
      .from("notification_preferences")
      .update(updates)
      .eq("user_id", user.id)
      .select()
      .single();

    // If no row exists, create one
    if (updateError && updateError.code === "PGRST116") {
      const { data: created, error: createError } = await supabase
        .from("notification_preferences")
        .insert({
          user_id: user.id,
          ...updates,
        })
        .select()
        .single();

      if (createError) {
        throw createError;
      }

      // Invalidate cache after creation
      invalidateUserPreferencesCache(user.id);

      return NextResponse.json(created);
    }

    if (updateError) {
      throw updateError;
    }

    // Invalidate cache after update
    invalidateUserPreferencesCache(user.id);

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating notification preferences:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
