"use client";

import { FormEvent, Suspense, useEffect, useState } from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";

import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import { AppIcon } from "@/lib/icons";
import { useAuth } from "@/providers/auth-provider";
import { useAlerts } from "@/providers/alerts-provider";
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
  const reconnectService = searchParams.get("reconnect");
  const activeLogo = LOGIN_LOGO_SEQUENCE[logoSourceIndex] ?? null;
  const isCompactLogo = activeLogo?.width === 48;

  useEffect(() => {
    if (session) {
      // If user came from reconnect flow, redirect to settings instead of home
      const redirectTo = reconnectService ? "/settings" : "/";
      router.replace(redirectTo);
    }
  }, [router, session, reconnectService]);

  useEffect(() => {
    if (!error) {
      return;
    }
    showError(error);
  }, [error, showError]);

  const handlePasswordSignIn = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const supabase = getSupabaseBrowserClient();
    setIsSubmitting(true);
    setError(null);

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      console.error("Sign-in failed:", signInError);
      setError("Sign-in failed. Please check your credentials and try again.");
      setIsSubmitting(false);
      return;
    }

    setIsSubmitting(false);
    router.replace("/");
  };

  const handleGoogleSignIn = async () => {
    const supabase = getSupabaseBrowserClient();
    setError(null);
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
    }
  };

  const handleLogoError = () => {
    setLogoLoaded(false);
    setLogoSourceIndex((currentIndex) => currentIndex + 1);
  };

  const handleSlackSignIn = async () => {
    const supabase = getSupabaseBrowserClient();
    setError(null);
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
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-100 via-slate-50 to-white px-4 py-10 sm:px-6 lg:py-16">
      <div className="mx-auto grid w-full max-w-6xl items-stretch gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="rounded-2xl border border-slate-200 bg-white/95 p-8 shadow-sm backdrop-blur-sm sm:p-10">
          <div className="mb-6 flex min-h-12 items-center">
            {activeLogo ? (
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

          <button
            type="button"
            className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
            onClick={() => {
              void handleGoogleSignIn();
            }}
          >
            <AppIcon name="google" boxClassName="h-4 w-4" size={14} className="text-slate-700" />
            Continue with Google
          </button>

          <button
            type="button"
            className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
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
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value);
                }}
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-200"
                placeholder="you@sighthound.com"
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.08em] text-slate-600">
                Password
              </span>
              <input
                required
                type="password"
                value={password}
                onChange={(event) => {
                  setPassword(event.target.value);
                }}
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-200"
                placeholder="••••••••"
              />
            </label>

            <button
              type="submit"
              disabled={isSubmitting}
              className="mt-1 w-full rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? "Signing in..." : "Sign in"}
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
