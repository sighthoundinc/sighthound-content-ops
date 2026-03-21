import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

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

    // Derive provider links from Supabase auth identities (authoritative for OAuth links)
    const identities = user.identities ?? [];
    const hasGoogleIdentity = identities.some((identity) => identity.provider === "google");
    const hasSlackIdentity = identities.some((identity) => identity.provider === "slack_oidc");

    // Get user's persisted integration status
    const { data: integrations, error } = await supabase
      .from("user_integrations")
      .select("google_connected, google_connected_at, slack_connected, slack_connected_at")
      .eq("user_id", user.id)
      .single();

    if (error && error.code !== "PGRST116") {
      throw error;
    }

    // If no integrations row exists, initialize from identities
    if (!integrations) {
      const initialized = {
        google_connected: hasGoogleIdentity,
        google_connected_at: hasGoogleIdentity ? new Date().toISOString() : null,
        slack_connected: hasSlackIdentity,
        slack_connected_at: hasSlackIdentity ? new Date().toISOString() : null,
      };

      // Silently attempt to initialize; if it fails, we return the inferred state anyway
      void supabase
        .from("user_integrations")
        .insert({
          user_id: user.id,
          ...initialized,
        })

      return NextResponse.json(initialized);
    }

    // Merge persisted flags with identities so OAuth-linked providers always appear connected
    const merged: UserIntegrations = {
      google_connected: Boolean(integrations.google_connected || hasGoogleIdentity),
      google_connected_at:
        integrations.google_connected_at ??
        (hasGoogleIdentity ? new Date().toISOString() : null),
      slack_connected: Boolean(integrations.slack_connected || hasSlackIdentity),
      slack_connected_at:
        integrations.slack_connected_at ??
        (hasSlackIdentity ? new Date().toISOString() : null),
    };

    // Self-heal stored flags if identities indicate connected providers
    if (
      merged.google_connected !== integrations.google_connected ||
      merged.slack_connected !== integrations.slack_connected
    ) {
      // Silently attempt self-heal; if it fails, we still return the merged state
      void supabase
        .from("user_integrations")
        .update({
          google_connected: merged.google_connected,
          google_connected_at: merged.google_connected_at,
          slack_connected: merged.slack_connected,
          slack_connected_at: merged.slack_connected_at,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", user.id)
    }

    return NextResponse.json(merged);
  } catch (error) {
    console.error("Error fetching integrations:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/users/integrations
 * Update integration connection status (typically called after OAuth completion)
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

    const body = (await request.json()) as Partial<UserIntegrations>;

    // Build update object with only provided fields
    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (body.google_connected !== undefined) {
      updates.google_connected = body.google_connected;
      if (body.google_connected) {
        updates.google_connected_at = new Date().toISOString();
      }
    }
    if (body.slack_connected !== undefined) {
      updates.slack_connected = body.slack_connected;
      if (body.slack_connected) {
        updates.slack_connected_at = new Date().toISOString();
      }
    }

    // Try to update existing integrations row
    const { data: updated, error: updateError } = await supabase
      .from("user_integrations")
      .update(updates)
      .eq("user_id", user.id)
      .select()
      .single();

    // If no row exists, create one
    if (updateError && updateError.code === "PGRST116") {
      const { data: created, error: createError } = await supabase
        .from("user_integrations")
        .insert({
          user_id: user.id,
          ...updates,
        })
        .select()
        .single();

      if (createError) {
        throw createError;
      }

      return NextResponse.json(created);
    }

    if (updateError) {
      throw updateError;
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating integrations:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
