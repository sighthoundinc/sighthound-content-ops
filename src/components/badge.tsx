// Shared module (no "use client"). Pure stateless pill; pure `badgeClass()`
// string helper. Renders safely on both the server and the client.
//
// Sighthound Content Relay — shared <Badge> primitive (post-Phase-4.6 refactor).
//
// Tones:
// - `default`  → white surface + ink text + gray-200 border
// - `muted`    → sh-gray surface + navy-500 text + gray-200 border
// - `brand`    → Blurple-100 fill + Blurple-800 text + Blurple-100 border
// - `info`     → Blurple-50 fill + Blurple-800 text + Blurple-100 border
// - `critical` → red-50 / red-700 / red-200 (semantic danger)
// - `warning`  → amber-50 / amber-800 / amber-200 (semantic warning)
// - `success`  → emerald-50 / emerald-700 / emerald-200 (semantic success)
//
// This primitive is NOT the contract-locked status-chip palette — those live
// in `src/lib/status.ts` (`STATUS_COLORS`, `WRITER_STATUS_COLORS`, …) and
// stay locked per AGENTS.md's Global Vocabulary Contract. Use `<Badge>` for
// general-purpose pills (role labels, metadata tags, severity flags inside
// cards, etc.), not for workflow status rendering.
//
// Shape: `inline-flex`, rounded-full, px-2 py-0.5, text-xs font-medium.
// Override with className for wider pills or different typography.

import type { HTMLAttributes } from "react";

import { cn } from "@/lib/utils";

export type BadgeTone =
  | "default"
  | "muted"
  | "brand"
  | "info"
  | "critical"
  | "warning"
  | "success";

const BADGE_TONE_CLASSES: Record<BadgeTone, string> = {
  default: "bg-surface text-ink border-[color:var(--sh-gray-200)]",
  muted: "bg-[color:var(--sh-gray)] text-navy-500 border-[color:var(--sh-gray-200)]",
  brand: "bg-blurple-100 text-blurple-800 border-[color:var(--sh-blurple-100)]",
  info: "bg-blurple-50 text-blurple-800 border-[color:var(--sh-blurple-100)]",
  critical: "bg-red-50 text-red-700 border-red-200",
  warning: "bg-amber-50 text-amber-800 border-amber-200",
  success: "bg-emerald-50 text-emerald-700 border-emerald-200",
};

export function badgeClass({
  tone = "default",
  className,
}: {
  tone?: BadgeTone;
  className?: string;
}) {
  return cn(
    "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium",
    BADGE_TONE_CLASSES[tone],
    className
  );
}

export function Badge({
  tone = "default",
  className,
  children,
  ...props
}: HTMLAttributes<HTMLSpanElement> & { tone?: BadgeTone }) {
  return (
    <span className={badgeClass({ tone, className })} {...props}>
      {children}
    </span>
  );
}
