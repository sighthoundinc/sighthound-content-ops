// Server Component (no "use client"). Static marketing hero rendered
// entirely on the server — no client state, no client JS.
//
// The previous 3-source logo fallback state machine has been collapsed to
// a single authoritative source. If the SVG ever fails to load in prod we
// render the "SH Sighthound" fallback text instead, but without relying on
// React state (the decision is made at render time, not after a client-side
// onError fires).

import { CheckIcon } from "@/lib/icons";

const LOGIN_HIGHLIGHTS = [
  "See upcoming and overdue publishing work in one calendar view",
  "Keep blog drafts, reviews, and publish dates moving on schedule",
  "Coordinate social post creation, captioning, scheduling, and live links",
] as const;

const LOGO_SRC = "/sighthound-logo-with-text.svg";
const LOGO_WIDTH = 212;
const LOGO_HEIGHT = 48;
const LOGO_ALT = "Sighthound";

export function LoginHero() {
  return (
    <section className="rounded-2xl border border-[color:var(--sh-gray-200)] bg-white/95 p-8 shadow-brand-sm backdrop-blur-sm sm:p-10">
      <div className="mb-6 flex min-h-12 items-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={LOGO_SRC}
          alt={LOGO_ALT}
          width={LOGO_WIDTH}
          height={LOGO_HEIGHT}
          className="h-12 w-auto"
        />
      </div>
      <h1 className="mt-4 text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
        Sighthound Content Relay
      </h1>
      <p className="mt-3 max-w-xl text-base text-navy-500 sm:text-lg">
        Manage your content calendar across blogs and social posts from one place,
        with clear day-to-day publishing priorities.
      </p>
      <ul className="mt-6 space-y-3">
        {LOGIN_HIGHLIGHTS.map((highlight) => (
          <li key={highlight} className="flex items-start gap-2 text-sm text-navy-500">
            <CheckIcon boxClassName="mt-0.5 h-4 w-4"
              size={13}
              className="text-brand" />
            <span>{highlight}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
