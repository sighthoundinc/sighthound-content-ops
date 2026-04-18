"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { useAuth } from "@/providers/auth-provider";

import { LoginHero } from "./login-hero";
import { LoginForm } from "./login-form";

export function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { session } = useAuth();

  const reconnectService = searchParams.get("reconnect");

  useEffect(() => {
    if (session) {
      // If user came from reconnect flow, redirect to settings instead of home
      const redirectTo = reconnectService ? "/settings" : "/";
      router.replace(redirectTo);
    }
  }, [router, session, reconnectService]);

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-100 via-slate-50 to-white px-4 py-10 sm:px-6 lg:py-16">
      <div className="mx-auto grid w-full max-w-6xl items-stretch gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <LoginHero />
        <LoginForm />
      </div>
    </main>
  );
}
