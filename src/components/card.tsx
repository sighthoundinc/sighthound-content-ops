// Shared module (no "use client"). `Card` is a pure stateless surface
// primitive; `cardClass()` is a pure string helper. Both safely render on
// the server and the client.
//
// Sighthound Content Relay — shared <Card> primitive (post-Phase-4.6 refactor).
//
// Absorbs the surface / border / padding story from the four bespoke cards
// we carried through Phase 4.6 (ai-blocker-card, ai-quality-card,
// ai-next-steps-card, associated-blog-context-card).
//
// Tones:
// - `default`  → white surface + gray-200 border (next-steps items, generic)
// - `muted`    → gray surface + gray-200 border (empty/loading/error states,
//                associated-blog context surface)
// - `critical` → red-50 / red-200 (semantic danger — blocker/quality critical)
// - `warning`  → amber-50 / amber-200 (semantic warning — blocker/quality)
// - `info`     → blurple-50 / --sh-blurple-100 (brand info — blocker/quality)
//
// Tone colours follow the app's two signal-palette policies:
// - brand (blurple/navy/gray) for the neutral surfaces;
// - semantic (red / amber / emerald) for danger / warning / success. These
//   semantic tones parallel the retentions in Button (destructive rose),
//   DetailDrawerQuickAction (copy-success emerald), and ConfirmationModal
//   (danger rose) — see design-system/MIGRATION_AUDIT.md §16.6.
//
// Radius + default padding (`rounded-lg p-3`) are part of the primitive.
// Override padding via className (e.g. `className="p-4"`).

import type { HTMLAttributes } from "react";

import { cn } from "@/lib/utils";

export type CardTone = "default" | "muted" | "critical" | "warning" | "info";

const CARD_TONE_CLASSES: Record<CardTone, string> = {
  default: "bg-surface border-[color:var(--sh-gray-200)]",
  muted: "bg-[color:var(--sh-gray)] border-[color:var(--sh-gray-200)]",
  critical: "bg-red-50 border-red-200",
  warning: "bg-amber-50 border-amber-200",
  info: "bg-blurple-50 border-[color:var(--sh-blurple-100)]",
};

export function cardClass({
  tone = "default",
  className,
}: {
  tone?: CardTone;
  className?: string;
}) {
  return cn(
    "rounded-lg border p-3",
    CARD_TONE_CLASSES[tone],
    className
  );
}

export function Card({
  tone = "default",
  className,
  children,
  ...props
}: HTMLAttributes<HTMLDivElement> & { tone?: CardTone }) {
  return (
    <div className={cardClass({ tone, className })} {...props}>
      {children}
    </div>
  );
}
