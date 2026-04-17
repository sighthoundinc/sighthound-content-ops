import { NextResponse, type NextRequest } from "next/server";

import { createSessionServerClient } from "@/lib/supabase/server-session";
import { createAdminClient } from "@/lib/supabase/server";
import { isAllowedEmail } from "@/lib/allowed-email";

/**
 * Allowlist of destinations we are willing to redirect to after OAuth.
 * Prevents an open-redirect attack via a crafted `next` / `redirect_to`
 * query parameter pointing at an external host. We only accept relative
 * paths rooted at `/` and without a protocol / host prefix.
 */
function resolveSafeRedirect(requestUrl: string, raw: string | null) {
  const fallback = new URL("/", requestUrl);
  if (!raw) {
    return fallback;
  }
  const trimmed = raw.trim();
  // Reject anything that looks like an absolute URL or protocol-relative path.
  if (!trimmed.startsWith("/") || trimmed.startsWith("//")) {
    return fallback;
  }
  try {
    return new URL(trimmed, requestUrl);
  } catch {
    return fallback;
  }
}

function getRedirectForService(
  requestUrl: string,
  service: "google" | "slack" | null
) {
  if (service === "google" || service === "slack") {
    const url = new URL("/settings", requestUrl);
    url.searchParams.set("reconnect", service);
    return url;
  }
  return null;
}

/**
 * GET /auth/callback
 *
 * This route receives the redirect from Supabase after the user completes an
 * OAuth flow (Google or Slack). Responsibilities:
 *  1. Exchange the authorization code for a session cookie.
 *  2. Validate the resulting user is on an allowlisted email domain.
 *  3. Record the provider as connected in `user_integrations` (the single
 *     trustworthy write path for `*_connected=true`).
 *  4. Redirect the user to a safe in-app destination.
 */
export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const code = url.searchParams.get("code");
  const service = url.searchParams.get("service");
  const next = url.searchParams.get("next");
  const error = url.searchParams.get("error");
  const errorDescription = url.searchParams.get("error_description");

  if (error) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("reason", "oauth_error");
    if (errorDescription) {
      loginUrl.searchParams.set("message", errorDescription);
    }
    return NextResponse.redirect(loginUrl);
  }

  const safeService =
    service === "google" || service === "slack" ? service : null;

  if (!code) {
    // No code means this wasn't an OAuth redirect; fall back to login.
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const supabase = await createSessionServerClient();
  const { error: exchangeError } =
    await supabase.auth.exchangeCodeForSession(code);
  if (exchangeError) {
    console.error("OAuth code exchange failed:", exchangeError);
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("reason", "oauth_exchange_failed");
    return NextResponse.redirect(loginUrl);
  }

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("reason", "session");
    return NextResponse.redirect(loginUrl);
  }

  if (!isAllowedEmail(userData.user.email)) {
    // Sign the disallowed user out immediately and surface the reason.
    await supabase.auth.signOut().catch(() => {
      /* best effort */
    });
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("reason", "domain");
    return NextResponse.redirect(loginUrl);
  }

  // Resolve which provider just authenticated the user. Prefer the explicit
  // `service` query parameter we set at initiation time, otherwise fall back
  // to Supabase's recorded provider on the user.
  const providerFromMetadata =
    typeof userData.user.app_metadata?.provider === "string"
      ? (userData.user.app_metadata.provider as string)
      : null;
  const provider: "google" | "slack" | null =
    safeService ??
    (providerFromMetadata === "google"
      ? "google"
      : providerFromMetadata === "slack_oidc"
        ? "slack"
        : null);

  if (provider) {
    try {
      const admin = createAdminClient();
      const nowIso = new Date().toISOString();
      const updates: Record<string, unknown> = { updated_at: nowIso };
      if (provider === "google") {
        updates.google_connected = true;
        updates.google_connected_at = nowIso;
      } else {
        updates.slack_connected = true;
        updates.slack_connected_at = nowIso;
      }
      const { error: upsertError } = await admin.from("user_integrations").upsert(
        {
          user_id: userData.user.id,
          ...updates,
        },
        { onConflict: "user_id" }
      );
      if (upsertError) {
        console.error(
          "Failed to persist connected provider status:",
          upsertError
        );
      }
    } catch (persistError) {
      // Never block login on an integrations write failure; surface in logs.
      console.error("Failed to record provider connection:", persistError);
    }
  }

  const redirectTarget =
    getRedirectForService(request.url, safeService) ??
    resolveSafeRedirect(request.url, next);
  return NextResponse.redirect(redirectTarget);
}
