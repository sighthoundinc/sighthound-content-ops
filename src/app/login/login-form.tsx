"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import { AppIcon } from "@/lib/icons";
import { useAlerts } from "@/providers/alerts-provider";
import { useAuth } from "@/providers/auth-provider";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showError } = useAlerts();
  const { session } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reconnectService = searchParams.get("reconnect");

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
            name="email"
            autoComplete="username"
            inputMode="email"
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
            name="password"
            autoComplete="current-password"
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
  );
}
