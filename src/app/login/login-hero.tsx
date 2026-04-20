// Server Component (no "use client"). Static marketing hero for the login
// page — no client state, no client JS.
//
// Design direction (Content Relay refresh):
// - No card chrome. The hero floats over the ambient backdrop so the auth
//   form is the single visual anchor.
// - The logo IS the hero: larger lockup, generous breathing space, no
//   competing H1. Product name appears as a quiet "Content Relay" caption
//   immediately under the logo.
// - One line of supporting copy, then the brand tagline. No bullet list
//   (a checklist reads like marketing-site energy, not premium-app energy).
//
// Logo reliability contract:
//   Previous iterations tried `/sighthound-logo-with-text.svg` (36KB, baked-
//   in white background paths, unreliable on cold loads) and then
//   `/brand/sighthound-logo-horizontal.jpg` — that "jpg" was actually a
//   WebP with a lying `.jpg` extension (verified via `file(1)`). Browsers
//   that strictly trust MIME by extension refuse to render it. That brand
//   asset has since been renamed to `/brand/sighthound-logo-horizontal.webp`
//   so it is self-consistent; see `src/app/design-system-preview/page.tsx`
//   for a live reference render.
//
//   The authoritative raster on the login surface lives at
//   `/sighthound-logo-with-text.png`:
//   a real PNG, 1776×435, 57KB, with a transparent background and no
//   export surprises. We render it via `next/image` with `priority` so
//   the loader still emits a <link rel="preload"> in <head> — giving us
//   reliability without sacrificing first-paint performance.

import Image from "next/image";

const LOGO_SRC = "/sighthound-logo-with-text.png";
const LOGO_INTRINSIC_WIDTH = 1776;
const LOGO_INTRINSIC_HEIGHT = 435;
const LOGO_ALT = "Sighthound";

export function LoginHero() {
  return (
    <section
      className="relative select-none px-1 opacity-0 motion-safe:animate-[sh-login-fade-in_280ms_ease-out_60ms_forwards] motion-reduce:opacity-100"
      aria-labelledby="login-hero-title"
    >
      {/* Local fade-in keyframe. Single property, reduced-motion-safe.
          Kept local to the login surface so we don't touch globals.css. */}
      <style>{`
        @keyframes sh-login-fade-in {
          0%   { opacity: 0; transform: translateY(4px); }
          100% { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <div className="flex min-h-14 items-center">
        <Image
          src={LOGO_SRC}
          alt={LOGO_ALT}
          width={LOGO_INTRINSIC_WIDTH}
          height={LOGO_INTRINSIC_HEIGHT}
          priority
          unoptimized
          sizes="(min-width: 640px) 260px, 220px"
          className="h-[52px] w-auto"
        />
      </div>

      <p
        id="login-hero-title"
        className="mt-7 text-[32px] font-medium leading-[1.15] tracking-tight text-ink sm:text-[36px]"
      >
        Content Relay
      </p>

      <p className="mt-4 max-w-md text-base leading-relaxed text-navy-500">
        One place to plan, write and publish
        <br />
        across blogs and socials.
      </p>

      <p className="mt-10 text-[11px] font-semibold uppercase tracking-[0.18em] text-navy-500/70">
        Turning Sight Into Insight
      </p>
    </section>
  );
}
