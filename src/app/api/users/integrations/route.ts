import { NextRequest, NextResponse } from "next/server";
import { withApiContract } from "@/lib/api-contract";
import { authenticateRequest } from "@/lib/server-permissions";

interface UserIntegrations {
  google_connected: boolean;
  google_connected_at: string | null;
  slack_connected: boolean;
  slack_connected_at: string | null;
}

/**
 * GET /api/users/integrations
 * Get the current user's connected services status
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

    // Get user's persisted integration status (source of truth)
    // This respects manual disconnects from Settings → Connected Services
    const { data: integrations, error } = await auth.context.adminClient
      .from("user_integrations")
      .select("google_connected, google_connected_at, slack_connected, slack_connected_at")
      .eq("user_id", auth.context.userId)
      .single();

    if (error && error.code !== "PGRST116") {
      throw error;
    }

    // If no integrations row exists, return disconnected state
    // User must explicitly connect via Settings (proper UX)
    if (!integrations) {
      return NextResponse.json({
        google_connected: false,
        google_connected_at: null,
        slack_connected: false,
        slack_connected_at: null,
      });
    }

    // Return persisted state only — user's explicit choice is respected
    // If they disconnected Google in Settings, it stays disconnected even if they have Google OAuth
    return NextResponse.json(integrations);
  } catch (error) {
    console.error("Error fetching integrations:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
});

/**
 * PATCH /api/users/integrations
 * Update integration connection status (called from Settings → Connected Services)
 * 
 * This is the ONLY place where connection status should be modified.
 * Users explicitly control which providers appear "connected" via the UI.
 * OAuth login does NOT auto-update these flags — that would override manual disconnects.
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

    const body = (await request.json()) as Partial<UserIntegrations>;

    // Build update object with only provided fields
    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (body.google_connected !== undefined) {
      updates.google_connected = body.google_connected;
      updates.google_connected_at = body.google_connected ? new Date().toISOString() : null;
    }
    if (body.slack_connected !== undefined) {
      updates.slack_connected = body.slack_connected;
      updates.slack_connected_at = body.slack_connected ? new Date().toISOString() : null;
    }

    // Use atomic upsert keyed on user_id so reconnect callbacks remain idempotent
    // even when multiple requests race (e.g., duplicate redirects/effect retries).
    const { data: upserted, error: upsertError } = await auth.context.adminClient
      .from("user_integrations")
      .upsert(
        {
          user_id: auth.context.userId,
          ...updates,
        },
        {
          onConflict: "user_id",
        }
      )
      .select()
      .single();

    if (upsertError) {
      throw upsertError;
    }

    return NextResponse.json(upserted);
  } catch (error) {
    console.error("Error updating integrations:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
});
