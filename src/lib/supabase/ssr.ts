// Server-only module. Do NOT import from a client component.
// Shared Supabase SSR client wired to Next's cookie store. Reads session
// cookies set by the @supabase/ssr browser client; no cookie writes are
// attempted (Server Components cannot set cookies).

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

function requireEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY."
    );
  }
  return { url, anonKey };
}

/**
 * Creates a Supabase server client for use in Server Components.
 * Read-only against cookies; session refresh happens client-side.
 */
export async function getSupabaseServerClient() {
  const { url, anonKey } = requireEnv();
  const cookieStore = await cookies();
  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll().map(({ name, value }) => ({ name, value }));
      },
      // Server Components cannot set cookies; intentionally a no-op.
      setAll() {
        /* noop */
      },
    },
  });
}
