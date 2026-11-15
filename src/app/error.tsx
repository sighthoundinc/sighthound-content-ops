"use client";

import { useEffect } from "react";
import Link from "next/link";

import { Button, buttonClass } from "@/components/button";
import { UI_VOCAB } from "@/lib/ui-vocab";

/**
 * Route-level error boundary. Catches render errors in any page so the user
 * gets a way forward instead of a blank screen. The raw error is logged for
 * debugging and never shown.
 */
export default function RouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("route error boundary", error);
  }, [error]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-[color:var(--sh-gray)] px-4 py-12 text-center">
      <div role="alert" className="space-y-2">
        <h1 className="page-title">This page hit a problem</h1>
        <p className="body-text mx-auto max-w-md text-navy-500">
          Nothing you saved was lost. Try again, or head back to Home if it
          keeps happening.
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-2">
        <Button type="button" variant="primary" size="md" onClick={reset}>
          {UI_VOCAB.errors.retry}
        </Button>
        <Link href="/" className={buttonClass({ variant: "secondary", size: "md" })}>
          Go to Home
        </Link>
      </div>
    </main>
  );
}
