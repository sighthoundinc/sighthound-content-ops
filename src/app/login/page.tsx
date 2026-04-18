// Server Component. No "use client".
//
// The previous implementation had three layers: a thin client wrapper
// (page.tsx), a client "content" component that ran a session-redirect
// useEffect (login-page-content.tsx), and a client hero + client form.
// In the migrated version, the session check and redirect happen
// server-side before any HTML ships, and the hero is server-rendered.
// Only the form (password + OAuth handlers) remains a client island.

import { redirect } from "next/navigation";

import { getSupabaseServerClient } from "@/lib/supabase/ssr";

import { LoginHero } from "./login-hero";
import { LoginForm } from "./login-form";

export const dynamic = "force-dynamic";

interface LoginPageProps {
  searchParams: Promise<{ reconnect?: string }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { reconnect } = await searchParams;

  // Server-side session-aware redirect. Preserves the previous client-side
  // behaviour: signed-in users are pushed to /settings when coming from a
  // reconnect flow, otherwise to /.
  const supabase = await getSupabaseServerClient();
  const { data: sessionResult } = await supabase.auth.getSession();
  if (sessionResult?.session) {
    redirect(reconnect ? "/settings" : "/");
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-blurple-50 via-white to-white px-4 py-10 sm:px-6 lg:py-16">
      <div className="mx-auto grid w-full max-w-6xl items-stretch gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <LoginHero />
        <LoginForm />
      </div>
    </main>
  );
}
