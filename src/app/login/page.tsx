"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import { AppIcon } from "@/lib/icons";
import { useAuth } from "@/providers/auth-provider";
import { useSystemFeedback } from "@/providers/system-feedback-provider";
const LOGIN_HIGHLIGHTS = [
  "See upcoming and overdue publishing work in one calendar view",
  "Keep blog drafts, reviews, and publish dates moving on schedule",
  "Coordinate social post creation, captioning, scheduling, and live links",
] as const;

export default function LoginPage() {
  const router = useRouter();
  const { session } = useAuth();
  const { showError } = useSystemFeedback();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (session) {
      router.replace("/");
    }
  }, [router, session]);

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
      setError(signInError.message);
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
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${appUrl}/`,
      },
    });
    if (oauthError) {
      setError(oauthError.message);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-100 via-slate-50 to-white px-4 py-10 sm:px-6 lg:py-16">
      <div className="mx-auto grid w-full max-w-6xl items-stretch gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="rounded-2xl border border-slate-200 bg-white/95 p-8 shadow-sm backdrop-blur-sm sm:p-10">
          <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-slate-600">
            <AppIcon
              name="success"
              boxClassName="h-4 w-4"
              size={13}
              className="text-emerald-600"
            />
            Secure Workspace Access
          </span>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
            Sighthound Content Ops
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
            Google Workspace (`@sighthound.com`) or admin-managed credentials.
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
