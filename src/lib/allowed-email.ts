/**
 * Email domain allowlist used across login, middleware, and auth-provider.
 *
 * Users may only authenticate with an `@sighthound.com` email address.
 * This is the single source of truth for that rule; do not duplicate it.
 */

export const ALLOWED_EMAIL_DOMAINS = ["sighthound.com"] as const;

export type AllowedEmailDomain = (typeof ALLOWED_EMAIL_DOMAINS)[number];

export function isAllowedEmail(email: string | null | undefined): boolean {
  if (!email) {
    return false;
  }
  const normalized = email.trim().toLowerCase();
  if (!normalized.includes("@")) {
    return false;
  }
  const domain = normalized.split("@").pop()?.trim() ?? "";
  if (!domain) {
    return false;
  }
  return ALLOWED_EMAIL_DOMAINS.some(
    (allowed) => domain === allowed || domain.endsWith(`.${allowed}`)
  );
}

export const ALLOWED_EMAIL_ERROR_MESSAGE =
  "Access is restricted to @sighthound.com accounts. Please sign in with your Sighthound email.";

/** Google OAuth `hd` hint — restricts the Google account chooser to the given workspace. */
export const GOOGLE_OAUTH_HOSTED_DOMAIN: AllowedEmailDomain = "sighthound.com";
