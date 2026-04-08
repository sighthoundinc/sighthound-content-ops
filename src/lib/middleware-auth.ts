export const AUTH_BYPASS_PREFIXES = [
  "/login",
  "/api",
  "/_next",
  "/favicon",
  "/public",
];

export function shouldBypassAuth(pathname: string) {
  return AUTH_BYPASS_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

export function hasSupabaseAuthCookieNames(cookieNames: string[]) {
  return cookieNames.some((cookieName) => cookieName.startsWith("sb-"));
}
