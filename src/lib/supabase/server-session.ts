import { cookies } from "next/headers";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

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

/**
 * Cookie-aware Supabase client for server actions and route handlers.
 *
 * Use this when you need to resolve the currently authenticated user
 * server-side from the request cookies. NEVER trust a userId passed
 * from the client — always call `getUser()` against this client first.
 */
export async function createSessionServerClient() {
  const { url, anonKey } = getCommonEnv();
  const cookieStore = await cookies();

  return createServerClient(url, anonKey, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
      set(name: string, value: string, options: CookieOptions) {
        try {
          cookieStore.set({ name, value, ...options });
        } catch {
          // Called from a Server Component where cookies cannot be mutated.
          // Safe to ignore; the caller should refresh via middleware.
        }
      },
      remove(name: string, options: CookieOptions) {
        try {
          cookieStore.set({ name, value: "", ...options });
        } catch {
          // See note above.
        }
      },
    },
  });
}

/**
 * Resolve the authenticated user for the current request. Returns null if
 * there is no session or the token is invalid. Uses Supabase `getUser()`
 * to validate against the auth server (not just the local cookie).
 */
export async function getServerSessionUser() {
  const supabase = await createSessionServerClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    return null;
  }
  return data.user;
}
