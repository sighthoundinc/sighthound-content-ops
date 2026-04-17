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
 *
 * Users can ONLY disconnect (set a provider flag to `false`) through this
 * endpoint. Setting a provider to `true` is rejected so the `Connected` badge
 * cannot be spoofed without actually completing OAuth.
 *
 * Connecting a provider is recorded exclusively by the `/auth/callback` route
 * handler after Supabase verifies the provider identity.
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

    // Reject any attempt to mark a provider as connected.
    if (body.google_connected === true || body.slack_connected === true) {
      return NextResponse.json(
        {
          error:
            "Use the provider sign-in flow to connect a service. This endpoint only disconnects.",
        },
        { status: 400 }
      );
    }

    // Build update object with only provided fields (disconnects only).
    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (body.google_connected === false) {
      updates.google_connected = false;
      updates.google_connected_at = null;
    }
    if (body.slack_connected === false) {
      updates.slack_connected = false;
      updates.slack_connected_at = null;
    }

    // No-op guard: nothing to update apart from timestamp.
    if (Object.keys(updates).length === 1) {
      return NextResponse.json(
        {
          error: "No disconnect action specified.",
        },
        { status: 400 }
      );
    }

    // Use atomic upsert keyed on user_id so disconnect calls remain idempotent
    // even when multiple requests race.
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
