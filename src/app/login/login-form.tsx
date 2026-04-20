"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { Button } from "@/components/button";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import { EyeIcon, EyeOffIcon, GoogleIcon, SlackIcon } from "@/lib/icons";
import { useAlerts } from "@/providers/alerts-provider";
import { useAuth } from "@/providers/auth-provider";

// Content Relay refresh (see conversation for rationale):
// - SSO buttons lead the form; email sign-in is collapsed behind a quiet
//   "Sign in with email" disclosure so ~95% of traffic sees a two-option
//   surface.
// - Primary CTA uses the shared Button primitive so hover and focus are
//   on-brand (Blurple-600 → Blurple-700 + shadow-brand-focus ring).
// - Labels are sentence-case, password field has a reveal toggle, empty
//   placeholder for a cleaner rest state.
// - SSO handlers set a redirecting flag to prevent a "button looks
//   clickable but nothing happens" flicker while the OAuth navigation is
//   in flight.

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showError } = useAlerts();
  const { session } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState<"google" | "slack" | null>(
    null
  );
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reconnectService = searchParams.get("reconnect");
  const ssoDisabled = isRedirecting !== null || isSubmitting;

  useEffect(() => {
    if (!error) {
      return;
    }
    showError(error);
  }, [error, showError]);

  // Session-watching redirect. Covers paths where the session is established
  // client-side AFTER the page is already rendered — primarily the OAuth
  // return chain (Supabase callback -> middleware bounce to /login ->
  // client-side hash / code exchange sets cookies -> session becomes
  // non-null). Password sign-ins already navigate directly inside
  // handlePasswordSignIn; this effect is the safety net for everything else.
  useEffect(() => {
    if (!session) return;
    const destination = reconnectService ? "/settings" : "/";
    router.replace(destination);
    router.refresh();
  }, [router, session, reconnectService]);

  const handlePasswordSignIn = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    // Read authoritative values from the form DOM. This avoids the
    // controlled-input / browser-autofill desync that caused "takes two
    // clicks" when password managers populated the fields without
    // triggering React's onChange.
    const formData = new FormData(event.currentTarget);
    const emailValue = ((formData.get("email") as string | null) ?? email).trim();
    const passwordValue = (formData.get("password") as string | null) ?? password;

    if (!emailValue || !passwordValue) {
      setError("Please enter your email and password.");
      return;
    }

    // Keep React state in sync with what we actually submitted.
    setEmail(emailValue);
    setPassword(passwordValue);

    const supabase = getSupabaseBrowserClient();
    setIsSubmitting(true);
    setError(null);

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: emailValue,
      password: passwordValue,
    });

    if (signInError) {
      console.error("Sign-in failed:", signInError);
      setError("Sign-in failed. Please check your credentials and try again.");
      setIsSubmitting(false);
      return;
    }

    // Navigate client-side after a successful sign-in. The server component
    // at /login also enforces this redirect, but only catches you on an
    // initial page load; interactive sign-ins resolve in place, so we must
    // push the navigation ourselves. router.refresh() ensures the new
    // session cookie is observed by the destination's server components.
    const destination = reconnectService ? "/settings" : "/";
    router.replace(destination);
    router.refresh();
    // Leave isSubmitting true while navigation is in flight so the form
    // button stays disabled and the spinner stays visible.
  };

  const handleGoogleSignIn = async () => {
    const supabase = getSupabaseBrowserClient();
    setError(null);
    setIsRedirecting("google");
    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ??
      window.location.origin;
    // If reconnecting, redirect to settings after OAuth
    const redirectPath = reconnectService ? "/settings" : "/";
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${appUrl}${redirectPath}`,
      },
    });
    if (oauthError) {
      console.error("Google sign-in failed:", oauthError);
      setError("Google sign-in failed. Please try again.");
      setIsRedirecting(null);
    }
  };

  const handleSlackSignIn = async () => {
    const supabase = getSupabaseBrowserClient();
    setError(null);
    setIsRedirecting("slack");
    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ??
      window.location.origin;
    // If reconnecting, redirect to settings after OAuth
    const redirectPath = reconnectService ? "/settings" : "/";
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: "slack_oidc",
      options: {
        redirectTo: `${appUrl}${redirectPath}`,
      },
    });
    if (oauthError) {
      console.error("Slack sign-in failed:", oauthError);
      setError("Slack sign-in failed. Please try again.");
      setIsRedirecting(null);
    }
  };

  const ssoButtonClass =
    "inline-flex w-full items-center justify-center gap-2.5 rounded-lg border border-[color:var(--sh-gray-200)] bg-white px-4 py-3 text-sm font-medium text-ink transition hover:bg-blurple-50 hover:border-[color:var(--sh-gray-400)] focus-visible:outline-none focus-visible:shadow-brand-focus disabled:cursor-not-allowed disabled:opacity-60";

  return (
    <section
      className="relative rounded-2xl border border-[color:var(--sh-gray-200)] bg-white p-7 shadow-brand-sm sm:p-9 opacity-0 motion-safe:animate-[sh-login-fade-in_280ms_ease-out_140ms_forwards] motion-reduce:opacity-100"
      aria-labelledby="login-form-title"
    >
      <h2
        id="login-form-title"
        className="text-xl font-semibold tracking-tight text-ink"
      >
        Sign in
      </h2>
      <p className="mt-1 text-sm text-navy-500">
        Use your @sighthound.com account to get started.
      </p>

      <div className="mt-6 space-y-3">
        <button
          type="button"
          className={ssoButtonClass}
          disabled={ssoDisabled}
          aria-busy={isRedirecting === "google"}
          onClick={() => {
            void handleGoogleSignIn();
          }}
        >
          <GoogleIcon boxClassName="h-4 w-4" size={14} className="text-navy-500" />
          {isRedirecting === "google" ? (
            <>
              <span>Redirecting to Google</span>
              <InlineDotPulse />
            </>
          ) : (
            "Continue with Google"
          )}
        </button>

        <button
          type="button"
          className={ssoButtonClass}
          disabled={ssoDisabled}
          aria-busy={isRedirecting === "slack"}
          onClick={() => {
            void handleSlackSignIn();
          }}
        >
          <SlackIcon boxClassName="h-4 w-4" size={14} className="text-navy-500" />
          {isRedirecting === "slack" ? (
            <>
              <span>Redirecting to Slack</span>
              <InlineDotPulse />
            </>
          ) : (
            "Continue with Slack"
          )}
        </button>
      </div>

      {/* Email sign-in disclosure. Collapsed by default so the two SSO
          buttons read as the primary action. The trigger is a quiet text
          button to keep it visually subordinate. */}
      <div className="mt-5">
        {!showEmailForm ? (
          <button
            type="button"
            onClick={() => setShowEmailForm(true)}
            className="group inline-flex w-full items-center justify-center gap-2 rounded-lg px-2 py-2 text-sm text-navy-500 transition hover:text-ink focus-visible:outline-none focus-visible:shadow-brand-focus"
            aria-expanded={false}
            aria-controls="login-email-form"
          >
            <span className="h-px flex-1 bg-[color:var(--sh-gray-200)]" aria-hidden />
            <span className="text-[11px] font-semibold uppercase tracking-[0.12em]">
              Sign in with email
            </span>
            <span className="h-px flex-1 bg-[color:var(--sh-gray-200)]" aria-hidden />
          </button>
        ) : (
          <>
            <div className="my-4 flex items-center gap-3" aria-hidden>
              <div className="h-px flex-1 bg-[color:var(--sh-gray-200)]" />
              <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-navy-500">
                or
              </span>
              <div className="h-px flex-1 bg-[color:var(--sh-gray-200)]" />
            </div>

            <form
              id="login-email-form"
              className="space-y-4"
              onSubmit={handlePasswordSignIn}
            >
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-navy-500">
                  Email
                </span>
                <input
                  required
                  type="email"
                  name="email"
                  autoComplete="username"
                  inputMode="email"
                  autoFocus
                  value={email}
                  onChange={(event) => {
                    setEmail(event.target.value);
                  }}
                  className="focus-field w-full rounded-lg border border-[color:var(--sh-gray-200)] bg-white px-3 py-2.5 text-sm text-ink placeholder:text-navy-500/50"
                  placeholder="you@sighthound.com"
                />
              </label>

              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-navy-500">
                  Password
                </span>
                <div className="relative">
                  <input
                    required
                    type={showPassword ? "text" : "password"}
                    name="password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(event) => {
                      setPassword(event.target.value);
                    }}
                    className="focus-field w-full rounded-lg border border-[color:var(--sh-gray-200)] bg-white px-3 py-2.5 pr-10 text-sm text-ink"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    aria-pressed={showPassword}
                    className="absolute inset-y-0 right-0 flex items-center rounded-r-lg px-3 text-navy-500 transition hover:text-ink focus-visible:outline-none focus-visible:shadow-brand-focus"
                  >
                    {showPassword ? (
                      <EyeOffIcon boxClassName="h-4 w-4" size={14} />
                    ) : (
                      <EyeIcon boxClassName="h-4 w-4" size={14} />
                    )}
                  </button>
                </div>
              </label>

              <Button
                type="submit"
                variant="primary"
                size="cta"
                disabled={ssoDisabled}
                aria-busy={isSubmitting}
                className="mt-1 w-full"
              >
                {isSubmitting ? (
                  <span className="inline-flex items-center gap-2">
                    Signing in
                    <InlineDotPulse tone="on-brand" />
                  </span>
                ) : (
                  "Continue"
                )}
              </Button>
            </form>
          </>
        )}
      </div>
    </section>
  );
}

// Three-dot loading indicator. Kept inline (no external dep) so it plays
// nicely with the button's text baseline and shrinks/grows with the
// surrounding font size. Gated on `prefers-reduced-motion` through the
// `motion-safe:animate-*` Tailwind variants.
function InlineDotPulse({ tone = "muted" }: { tone?: "muted" | "on-brand" }) {
  const dotColor = tone === "on-brand" ? "bg-white" : "bg-navy-500";
  return (
    <span
      aria-hidden
      className="inline-flex items-center gap-1 leading-none"
    >
      <span
        className={`h-1 w-1 rounded-full ${dotColor} motion-safe:animate-[sh-login-dot_1s_ease-in-out_infinite]`}
      />
      <span
        className={`h-1 w-1 rounded-full ${dotColor} motion-safe:animate-[sh-login-dot_1s_ease-in-out_infinite_150ms]`}
      />
      <span
        className={`h-1 w-1 rounded-full ${dotColor} motion-safe:animate-[sh-login-dot_1s_ease-in-out_infinite_300ms]`}
      />
      <style>{`
        @keyframes sh-login-dot {
          0%, 80%, 100% { opacity: 0.25; transform: scale(0.9); }
          40%            { opacity: 1;    transform: scale(1.1); }
        }
      `}</style>
    </span>
  );
}
