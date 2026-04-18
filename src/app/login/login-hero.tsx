"use client";

import { useState } from "react";
import Image from "next/image";

import { AppIcon } from "@/lib/icons";

const LOGIN_HIGHLIGHTS = [
  "See upcoming and overdue publishing work in one calendar view",
  "Keep blog drafts, reviews, and publish dates moving on schedule",
  "Coordinate social post creation, captioning, scheduling, and live links",
] as const;

const LOGIN_LOGO_SEQUENCE = [
  { src: "/sighthound-logo-with-text.svg", width: 212, height: 48, alt: "Sighthound" },
  { src: "/sighthound-logo-with-text.png", width: 212, height: 48, alt: "Sighthound" },
  { src: "/sighthound-badge-mark.svg", width: 48, height: 48, alt: "Sighthound badge mark" },
] as const;

export function LoginHero() {
  const [logoSourceIndex, setLogoSourceIndex] = useState(0);
  const [logoLoaded, setLogoLoaded] = useState(false);

  const activeLogo = LOGIN_LOGO_SEQUENCE[logoSourceIndex] ?? null;
  const isCompactLogo = activeLogo?.width === 48;

  const handleLogoError = () => {
    setLogoLoaded(false);
    setLogoSourceIndex((currentIndex) => currentIndex + 1);
  };

  return (
    <section className="rounded-2xl border border-slate-200 bg-white/95 p-8 shadow-sm backdrop-blur-sm sm:p-10">
      <div className="mb-6 flex min-h-12 items-center">
        {activeLogo ? (
          <div className="relative h-12">
            {!logoLoaded ? (
              <div
                aria-hidden="true"
                className={`h-12 animate-pulse rounded-md bg-slate-200/70 ${
                  isCompactLogo ? "w-12" : "w-[212px]"
                }`}
              />
            ) : null}
            <Image
              src={activeLogo.src}
              alt={activeLogo.alt}
              width={activeLogo.width}
              height={activeLogo.height}
              priority
              unoptimized
              onLoad={() => {
                setLogoLoaded(true);
              }}
              onError={handleLogoError}
              className={`h-12 ${isCompactLogo ? "w-12" : "w-auto"} transition-opacity ${
                logoLoaded
                  ? "opacity-100"
                  : "pointer-events-none absolute left-0 top-0 opacity-0"
              }`}
            />
          </div>
        ) : (
          <div className="inline-flex h-12 items-center gap-3">
            <span className="inline-flex h-10 min-w-10 items-center justify-center rounded-md bg-slate-900 px-2 text-xs font-semibold uppercase tracking-wide text-white">
              SH
            </span>
            <span className="text-lg font-semibold tracking-tight text-slate-900">
              Sighthound
            </span>
          </div>
        )}
      </div>
      <h1 className="mt-4 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
        Sighthound Content Relay
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
  );
}
