import {
  hasSupabaseAuthCookieNames,
  shouldBypassAuth,
} from "@/lib/middleware-auth";

export const middlewareAuthContractSmokeChecks = {
  loginPathBypassesAuth: shouldBypassAuth("/login") === true,
  apiPathBypassesAuth: shouldBypassAuth("/api/social-posts") === true,
  nextStaticPathBypassesAuth: shouldBypassAuth("/_next/static/chunk.js") === true,
  protectedPathRequiresAuth: shouldBypassAuth("/dashboard") === false,
  supabaseCookieDetected:
    hasSupabaseAuthCookieNames(["foo", "sb-project-auth-token"]) === true,
  unrelatedCookieNotDetected:
    hasSupabaseAuthCookieNames(["session", "theme"]) === false,
} as const;
