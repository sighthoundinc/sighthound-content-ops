"use client";

import { FormEvent, Suspense, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";

import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import { AppIcon } from "@/lib/icons";
import { useAuth } from "@/providers/auth-provider";
import { useAlerts } from "@/providers/alerts-provider";
import {
  ALLOWED_EMAIL_ERROR_MESSAGE,
  GOOGLE_OAUTH_HOSTED_DOMAIN,
  isAllowedEmail,
} from "@/lib/allowed-email";

const LOGIN_HIGHLIGHTS = [
  "See upcoming and overdue publishing work in one calendar view",
  "Keep blog drafts, reviews, and publish dates moving on schedule",
  "Coordinate social post creation, captioning, scheduling, and live links",
] as const;

const LOGIN_LOGO_SEQUENCE = [
  { src: "/sighthound-logo-with-text.svg", width: 212, height: 48, alt: "Sighthound" },
  { src: "/sighthound-logo-with-text.png", width: 212, height: 48, alt: "Sighthound" },
  { src: "/sighthound-badge-mark.svg", width: 48, height: 48, alt: "Sighthound badge mark" },
] as const;

// Client-side password lockout. Complements Supabase's platform rate limit
// with an immediate visible cooldown for the current browser session.
const MAX_PASSWORD_ATTEMPTS = 5;
const LOCKOUT_SECONDS = 60;

function resolveRedirectBase(): string | null {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
  if (configured && /^https?:\/\//i.test(configured)) {
    return configured;
  }
  if (typeof window === "undefined") {
    return null;
  }
  // In production we refuse to derive the redirect host from the browser.
  // `window.location.origin` on a misconfigured mirror domain would send users
  // back to the wrong environment; Supabase's allowlist is the only thing
  // stopping that and we want to fail loud instead.
  if (process.env.NODE_ENV === "production") {
    return null;
  }
  return window.location.origin;
}

function resolveReasonMessage(reason: string | null, message: string | null) {
  switch (reason) {
    case "domain":
      return ALLOWED_EMAIL_ERROR_MESSAGE;
    case "session":
      return "Your session has expired. Please sign in again.";
    case "env":
      return "The app is misconfigured. Please contact an administrator.";
    case "oauth_error":
    case "oauth_exchange_failed":
      return (
        message ??
        "Sign-in could not be completed. Please try again or use another method."
      );
    default:
      return null;
  }
}

function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { session } = useAuth();
  const { showError } = useAlerts();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [logoSourceIndex, setLogoSourceIndex] = useState(0);
  const [logoLoaded, setLogoLoaded] = useState(false);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockoutRemaining, setLockoutRemaining] = useState(0);
  const lockoutTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const reconnectService = searchParams.get("reconnect");
  const reason = searchParams.get("reason");
  const message = searchParams.get("message");
  const reasonMessage = useMemo(
    () => resolveReasonMessage(reason, message),
    [reason, message]
  );

  const activeLogo = LOGIN_LOGO_SEQUENCE[logoSourceIndex] ?? null;
  const isCompactLogo = activeLogo?.width === 48;
  const hasExhaustedLogoFallbacks = logoSourceIndex >= LOGIN_LOGO_SEQUENCE.length;

  useEffect(() => {
    return () => {
      if (lockoutTimerRef.current) {
        clearInterval(lockoutTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (session) {
      // If user came from reconnect flow, redirect to settings instead of home
      const redirectTo = reconnectService
        ? `/settings?reconnect=${encodeURIComponent(reconnectService)}`
        : "/";
      router.replace(redirectTo);
    }
  }, [router, session, reconnectService]);

  useEffect(() => {
    if (!error) {
      return;
    }
    showError(error);
  }, [error, showError]);

  useEffect(() => {
    if (!reasonMessage) {
      return;
    }
    showError(reasonMessage);
  }, [reasonMessage, showError]);

  const startLockout = () => {
    setLockoutRemaining(LOCKOUT_SECONDS);
    if (lockoutTimerRef.current) {
      clearInterval(lockoutTimerRef.current);
    }
    lockoutTimerRef.current = setInterval(() => {
      setLockoutRemaining((value) => {
        if (value <= 1) {
          if (lockoutTimerRef.current) {
            clearInterval(lockoutTimerRef.current);
            lockoutTimerRef.current = null;
          }
          setFailedAttempts(0);
          return 0;
        }
        return value - 1;
      });
    }, 1000);
  };

  const handlePasswordSignIn = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (lockoutRemaining > 0 || isSubmitting) {
      return;
    }
    const normalizedEmail = email.trim().toLowerCase();
    if (!isAllowedEmail(normalizedEmail)) {
      setError(ALLOWED_EMAIL_ERROR_MESSAGE);
      return;
    }

    const supabase = getSupabaseBrowserClient();
    setIsSubmitting(true);
    setError(null);

    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    });

    if (signInError) {
      console.error("Sign-in failed:", signInError);
      const nextAttempts = failedAttempts + 1;
      setFailedAttempts(nextAttempts);
      if (nextAttempts >= MAX_PASSWORD_ATTEMPTS) {
        startLockout();
        setError(
          `Too many failed attempts. Please wait ${LOCKOUT_SECONDS} seconds before trying again.`
        );
      } else {
        setError(
          "Sign-in failed. Please check your credentials and try again."
        );
      }
      setIsSubmitting(false);
      return;
    }

    // Defense in depth: even with the email-level check above, confirm the
    // resulting session user is on the allowlist before honoring the sign-in.
    if (!isAllowedEmail(data.user?.email ?? normalizedEmail)) {
      await supabase.auth.signOut().catch(() => {
        /* best effort */
      });
      setError(ALLOWED_EMAIL_ERROR_MESSAGE);
      setIsSubmitting(false);
      return;
    }

    setFailedAttempts(0);
    setIsSubmitting(false);
    // Honor reconnect param so email/password stays consistent with OAuth.
    const destination = reconnectService
      ? `/settings?reconnect=${encodeURIComponent(reconnectService)}`
      : "/";
    router.replace(destination);
  };

  const handleOAuthSignIn = async (provider: "google" | "slack") => {
    const supabase = getSupabaseBrowserClient();
    setError(null);
    const appUrl = resolveRedirectBase();
    if (!appUrl) {
      setError(
        "The app is not configured for sign-in on this domain. Please contact an administrator."
      );
      return;
    }
    const callbackUrl = new URL("/auth/callback", appUrl);
    const reconnectParam =
      reconnectService === "google" || reconnectService === "slack"
        ? reconnectService
        : provider;
    callbackUrl.searchParams.set("service", reconnectParam);

    const supabaseProvider: "google" | "slack_oidc" =
      provider === "google" ? "google" : "slack_oidc";

    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: supabaseProvider,
      options: {
        redirectTo: callbackUrl.toString(),
        // Force the Google account chooser AND restrict to the workspace to
        // prevent non-@sighthound accounts completing the handshake. Slack
        // workspace restriction is configured at the Supabase / Slack app level.
        queryParams:
          provider === "google"
            ? {
                hd: GOOGLE_OAUTH_HOSTED_DOMAIN,
                prompt: "select_account",
              }
            : undefined,
      },
    });
    if (oauthError) {
      console.error(`${provider} sign-in failed:`, oauthError);
      setError(
        provider === "google"
          ? "Google sign-in failed. Please try again."
          : "Slack sign-in failed. Please try again."
      );
    }
  };

  const handleGoogleSignIn = () => {
    void handleOAuthSignIn("google");
  };
  const handleSlackSignIn = () => {
    void handleOAuthSignIn("slack");
  };

  const handleLogoError = () => {
    setLogoLoaded(false);
    setLogoSourceIndex((currentIndex) =>
      // Bound the index so we never keep incrementing past the array length,
      // which previously triggered unnecessary re-renders on repeated errors.
      currentIndex >= LOGIN_LOGO_SEQUENCE.length
        ? currentIndex
        : currentIndex + 1
    );
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-100 via-slate-50 to-white px-4 py-10 sm:px-6 lg:py-16">
      <div className="mx-auto grid w-full max-w-6xl items-stretch gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="rounded-2xl border border-slate-200 bg-white/95 p-8 shadow-sm backdrop-blur-sm sm:p-10">
          <div className="mb-6 flex min-h-12 items-center">
            {activeLogo && !hasExhaustedLogoFallbacks ? (
              <div className="relative h-12">
                {!logoLoaded ? (
                  <div
                    aria-hidden="true"
                    className={`h-12 animate-pulse rounded-md bg-slate-200/70 ${
                      isCompactLogo ? "w-12" : "w-[212px]"
                    }`}
                  />
                ) : null}
                <Image
                  src={activeLogo.src}
                  alt={activeLogo.alt}
                  width={activeLogo.width}
                  height={activeLogo.height}
                  priority
                  unoptimized
                  onLoad={() => {
                    setLogoLoaded(true);
                  }}
                  onError={handleLogoError}
                  className={`h-12 ${isCompactLogo ? "w-12" : "w-auto"} transition-opacity ${
                    logoLoaded
                      ? "opacity-100"
                      : "pointer-events-none absolute left-0 top-0 opacity-0"
                  }`}
                />
              </div>
            ) : (
              <div className="inline-flex h-12 items-center gap-3">
                <span className="inline-flex h-10 min-w-10 items-center justify-center rounded-md bg-slate-900 px-2 text-xs font-semibold uppercase tracking-wide text-white">
                  SH
                </span>
                <span className="text-lg font-semibold tracking-tight text-slate-900">
                  Sighthound
                </span>
              </div>
            )}
          </div>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
            Sighthound Content Relay
          </h1>
          <p className="mt-3 max-w-xl text-base text-slate-600 sm:text-lg">
            Manage your content calendar across blogs and social posts from one place,
            with clear day-to-day publishing priorities.
          </p>
          <ul className="mt-6 space-y-3">
            {LOGIN_HIGHLIGHTS.map((highlight) => (
              <li key={highlight} className="flex items-start gap-2 text-sm text-slate-700">
                <AppIcon
                  name="check"
                  boxClassName="mt-0.5 h-4 w-4"
                  size={13}
                  className="text-slate-700"
                />
                <span>{highlight}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <h2 className="text-xl font-semibold tracking-tight text-slate-900">Sign in</h2>
          <p className="mt-1 text-sm text-slate-600">
            Use your @sighthound.com account to get started.
          </p>

          {reasonMessage ? (
            <div
              role="alert"
              className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-900"
            >
              {reasonMessage}
            </div>
          ) : null}

          <button
            type="button"
            className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={lockoutRemaining > 0}
            onClick={() => {
              void handleGoogleSignIn();
            }}
          >
            <AppIcon name="google" boxClassName="h-4 w-4" size={14} className="text-slate-700" />
            Continue with Google
          </button>

          <button
            type="button"
            className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={lockoutRemaining > 0}
            onClick={() => {
              void handleSlackSignIn();
            }}
          >
            <AppIcon name="slack" boxClassName="h-4 w-4" size={14} className="text-slate-700" />
            Continue with Slack
          </button>

          <div className="my-5 flex items-center gap-3">
            <div className="h-px flex-1 bg-slate-200" />
            <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-500">
              or email sign in
            </span>
            <div className="h-px flex-1 bg-slate-200" />
          </div>

          <form className="space-y-3" onSubmit={handlePasswordSignIn}>
            <label className="block">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.08em] text-slate-600">
                Email
              </span>
              <input
                required
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value);
                }}
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-200"
                placeholder="you@sighthound.com"
                disabled={lockoutRemaining > 0}
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.08em] text-slate-600">
                Password
              </span>
              <input
                required
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => {
                  setPassword(event.target.value);
                }}
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-200"
                placeholder="••••••••"
                disabled={lockoutRemaining > 0}
              />
            </label>

            {lockoutRemaining > 0 ? (
              <p className="text-xs font-medium text-amber-700" role="status">
                Too many attempts. Try again in {lockoutRemaining}s.
              </p>
            ) : null}

            <button
              type="submit"
              disabled={isSubmitting || lockoutRemaining > 0}
              className="mt-1 w-full rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {lockoutRemaining > 0
                ? `Locked (${lockoutRemaining}s)`
                : isSubmitting
                  ? "Signing in..."
                  : "Sign in"}
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gradient-to-b from-slate-100 via-slate-50 to-white" />}>
      <LoginPageContent />
    </Suspense>
  );
}
