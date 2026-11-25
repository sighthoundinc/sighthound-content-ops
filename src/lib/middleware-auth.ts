export const AUTH_BYPASS_PREFIXES = [
  "/login",
  "/api",
  "/_next",
  "/favicon",
  "/public",
  "/.well-known",
];

export function shouldBypassAuth(pathname: string) {
  return AUTH_BYPASS_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

export function hasSupabaseAuthCookieNames(cookieNames: string[]) {
  return cookieNames.some((cookieName) => cookieName.startsWith("sb-"));
}

// Supabase returns from Google/Slack with `?code=` (or `?error=`). The
// browser client on /login needs those to finish (or report) the sign-in,
// so they must survive the redirect to /login.
const OAUTH_RETURN_PARAMS = ["code", "error", "error_code", "error_description"];

export function buildLoginRedirectUrl(requestUrl: string) {
  const source = new URL(requestUrl);
  const loginUrl = new URL("/login", source);
  for (const name of OAUTH_RETURN_PARAMS) {
    const value = source.searchParams.get(name);
    if (value) loginUrl.searchParams.set(name, value);
  }
  return loginUrl;
}
