import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { buttonClass } from "@/components/button";
import { pageTitle } from "@/lib/page-title";

export const metadata: Metadata = { title: pageTitle("Page not found") };

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-[color:var(--sh-gray)] px-4 py-12 text-center">
      <Image
        src="/sighthound-badge-mark.svg"
        alt="Sighthound"
        width={48}
        height={48}
      />
      <div className="space-y-2">
        <h1 className="page-title">Page not found</h1>
        <p className="body-text mx-auto max-w-md text-navy-500">
          This link may be old, or the item may have been deleted. Pick up
          from one of these instead.
        </p>
      </div>
      <nav
        aria-label="Suggested pages"
        className="flex flex-wrap items-center justify-center gap-2"
      >
        <Link href="/" className={buttonClass({ variant: "primary", size: "md" })}>
          Go to Home
        </Link>
        <Link href="/tasks" className={buttonClass({ variant: "secondary", size: "md" })}>
          My Tasks
        </Link>
        <Link href="/dashboard" className={buttonClass({ variant: "secondary", size: "md" })}>
          Dashboard
        </Link>
      </nav>
    </main>
  );
}
