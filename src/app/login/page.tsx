// Server Component. No "use client".
//
// The previous implementation had three layers: a thin client wrapper
// (page.tsx), a client "content" component that ran a session-redirect
// useEffect (login-page-content.tsx), and a client hero + client form.
// In the migrated version, the session check and redirect happen
// server-side before any HTML ships, and the hero is server-rendered.
// Only the form (password + OAuth handlers) remains a client island.
//
// Layout shape (Content Relay refresh):
//   <main>  full-bleed, white, vertically centred, hosts the ambient bg
//     <LoginAmbient/>  radial Blurple glow + grain + wave motif (-z-10)
//     <div.max-w-5xl>
//       <div.grid 1fr / 0.85fr>
//         <LoginHero/>  borderless, floats over the ambient
//         <LoginForm/>  the only carded surface — visual anchor
//       <LoginFooter/>  build sha + Privacy/Terms
//
// The hero lost its card chrome intentionally: a single carded surface on
// the page gives the form a clear visual anchor role and matches the
// "premium minimalist" direction. See the conversation for rationale.

import { redirect } from "next/navigation";

import { getSupabaseServerClient } from "@/lib/supabase/ssr";

import { LoginAmbient } from "./login-ambient";
import { LoginFooter } from "./login-footer";
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
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-white px-4 py-12 sm:px-6 sm:py-16">
      <LoginAmbient />
      <div className="relative mx-auto w-full max-w-5xl">
        <div className="grid items-center gap-10 lg:grid-cols-[1fr_0.85fr] lg:gap-14">
          <LoginHero />
          <LoginForm />
        </div>
        <LoginFooter />
      </div>
    </main>
  );
}
