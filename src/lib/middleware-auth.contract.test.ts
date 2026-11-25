import {
  buildLoginRedirectUrl,
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
  oauthCodeSurvivesLoginRedirect:
    buildLoginRedirectUrl("https://app.test/?code=abc&next=/x").href ===
    "https://app.test/login?code=abc",
  plainLoginRedirectHasNoQuery:
    buildLoginRedirectUrl("https://app.test/dashboard?tab=1").href ===
    "https://app.test/login",
} as const;
