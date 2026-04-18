// Server-only module. Do NOT import from a client component.
// Uses @supabase/ssr to read the auth session from cookies, then fetches
// the dashboard summary + tasks snapshot server-side. Keeps the existing
// HTTP API contracts intact (API routes still expect Bearer tokens).

import { headers } from "next/headers";

import { getSupabaseServerClient } from "@/lib/supabase/ssr";

import type {
  DashboardSummary,
  TasksSnapshot,
} from "./home-work-buckets";

export interface HomeData {
  /** null when the viewer is not authenticated. */
  displayName: string | null;
  /** null when the viewer is not authenticated or the summary fetch failed. */
  summary: DashboardSummary | null;
  /** Empty arrays when unauthenticated or snapshot fetch failed. */
  tasksSnapshot: TasksSnapshot;
  /** Human-readable message when at least one fetch failed. */
  error: string | null;
}

const EMPTY_SNAPSHOT: TasksSnapshot = {
  requiredByMe: [],
  waitingOnOthers: [],
};

/**
 * Resolves the current request origin from forwarded headers.
 * both local dev and Vercel production.
 */
async function getRequestOrigin(): Promise<string> {
  const h = await headers();
  const host = h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

/**
 * Fetches the authoritative home-page data set server-side.
 *
 * Behaviour contract (matches prior client-side behaviour in page.tsx):
 *  - unauthenticated viewer -> returns null summary, empty snapshot, no error
 *  - fetch errors            -> returns null summary, empty snapshot, error set
 *  - success                 -> full payloads
 *
 * Implementation notes:
 *  - Forwards session.access_token as a Bearer header to the internal API
 *    routes, matching what the client previously sent. Preserves RLS,
 *    permission checks, and server-side response caching.
 *  - Marked no-store so Next does NOT collapse dashboard data across users.
 */
export async function fetchHomeData(): Promise<HomeData> {
  const supabase = await getSupabaseServerClient();
  const { data: sessionResult } = await supabase.auth.getSession();
  const session = sessionResult?.session ?? null;

  if (!session?.access_token) {
    // Match prior behaviour: the unauthenticated render showed "Hi there,"
    // with no buckets and no error.
    return {
      displayName: null,
      summary: null,
      tasksSnapshot: EMPTY_SNAPSHOT,
      error: null,
    };
  }

  const origin = await getRequestOrigin();
  const authHeaders = {
    authorization: `Bearer ${session.access_token}`,
  };

  // Resolve display name in parallel with the two dashboard fetches. Profile
  // lookup uses the admin path via the existing profiles table; fall back to
  // session metadata if the row is missing.
  const [summaryRes, snapshotRes, profileRes] = await Promise.all([
    fetch(`${origin}/api/dashboard/summary`, {
      headers: authHeaders,
      cache: "no-store",
    }),
    fetch(`${origin}/api/dashboard/tasks-snapshot`, {
      headers: authHeaders,
      cache: "no-store",
    }),
    supabase
      .from("profiles")
      .select("display_name, full_name")
      .eq("id", session.user.id)
      .maybeSingle(),
  ]);

  // Resolve display name with the same precedence the client used:
  // display_name > full_name > "there"
  const profileRow = profileRes.data as
    | { display_name: string | null; full_name: string | null }
    | null;
  const displayName =
    profileRow?.display_name ||
    profileRow?.full_name ||
    (session.user.user_metadata?.display_name as string | undefined) ||
    (session.user.user_metadata?.full_name as string | undefined) ||
    "there";

  let summary: DashboardSummary | null = null;
  let tasksSnapshot: TasksSnapshot = EMPTY_SNAPSHOT;
  let error: string | null = null;

  if (summaryRes.ok) {
    try {
      summary = (await summaryRes.json()) as DashboardSummary;
    } catch (err) {
      console.error("home-data: summary parse failed", err);
      error = "Couldn't load your workspace summary. Please try again.";
    }
  } else {
    console.error("home-data: summary fetch failed", summaryRes.status);
    error = "Couldn't load your workspace summary. Please try again.";
  }

  if (snapshotRes.ok) {
    try {
      tasksSnapshot = (await snapshotRes.json()) as TasksSnapshot;
    } catch (err) {
      console.error("home-data: snapshot parse failed", err);
      // Non-fatal: leave tasksSnapshot as empty; don't overwrite a non-null
      // error message from the summary fetch above.
    }
  } else {
    console.error("home-data: snapshot fetch failed", snapshotRes.status);
  }

  return {
    displayName,
    summary,
    tasksSnapshot,
    error,
  };
}
