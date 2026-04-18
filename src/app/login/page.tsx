import { Suspense } from "react";

import { LoginPageContent } from "./login-page-content";

// Thin server wrapper. Real UI lives in login-page-content.tsx +
// login-hero.tsx + login-form.tsx so the autoresearch ratchet can mutate
// individual concerns without touching shared providers, auth, or the
// Suspense boundary itself.
export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gradient-to-b from-slate-100 via-slate-50 to-white" />
      }
    >
      <LoginPageContent />
    </Suspense>
  );
}
