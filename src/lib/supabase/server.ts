import { createClient } from "@supabase/supabase-js";

function getCommonEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY."
    );
  }

  return { url, anonKey };
}

export function createAnonServerClient() {
  const { url, anonKey } = getCommonEnv();
  return createClient(url, anonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

/**
 * Request header that tells the database which signed-in user a
 * service-role write is being made for. Read by the
 * `blog_history_fill_actor` trigger so history rows are attributed to the
 * person, not left empty (shown as "System"). It carries no authority: RLS
 * and permission checks never read it.
 */
export const ACTOR_REQUEST_HEADER = "x-content-relay-actor";

export function createAdminClient(options: { actorUserId?: string | null } = {}) {
  const { url } = getCommonEnv();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY.");
  }
  return createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    ...(options.actorUserId
      ? { global: { headers: { [ACTOR_REQUEST_HEADER]: options.actorUserId } } }
      : {}),
  });
}
