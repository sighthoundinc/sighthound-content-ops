export const AUTH_BYPASS_PREFIXES = [
  "/login",
  "/auth/callback",
  "/api",
  "/_next",
  "/favicon",
  "/public",
];

export function shouldBypassAuth(pathname: string) {
  return AUTH_BYPASS_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

/**
 * Match only the Supabase auth token cookies (emitted by @supabase/ssr).
 * We explicitly exclude generic `sb-` prefixed cookies that could be spoofed
 * by an attacker to get past the early short-circuit and force a database
 * round-trip. The real validation still happens in `getUser()`.
 */
const SUPABASE_AUTH_COOKIE_PATTERN = /^sb-[^-]+-auth-token(\.|$)/;

export function hasSupabaseAuthCookieNames(cookieNames: string[]) {
  return cookieNames.some((cookieName) =>
    SUPABASE_AUTH_COOKIE_PATTERN.test(cookieName)
  );
}
