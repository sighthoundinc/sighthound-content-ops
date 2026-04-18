// Shared module (no "use client"). `Button` is a pure stateless component
// and `buttonClass()` is a pure string helper — neither uses hooks, event
// listeners, or browser APIs. Marking this file server-neutral lets server
// components (e.g. src/app/page.tsx) call `buttonClass(...)` directly.
// Client components still import from `@/components/button` unchanged.

import type { ButtonHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

/**
 * Sighthound Content Relay — shared <Button> primitive (Phase 3).
 *
 * Variant colour story:
 * - `primary`   → `bg-brand` (Blurple), hover `blurple-700`. Replaces the
 *                 pre-Content-Relay slate-900 primary.
 * - `secondary` → neutral surface + navy ink + subtle `--sh-gray-200` border,
 *                 hover into `blurple-50`. Consumes the gray ramp via raw
 *                 CSS var (Phase 2 deliberately left that ramp out of
 *                 Tailwind to avoid conflict with the default `gray-*`).
 * - `destructive` → unchanged. `rose-*` is a semantic danger colour, not brand.
 * - `ghost` / `icon` → `text-navy-500`, hover into `blurple-50` + `text-ink`.
 *
 * Sizes split per Phase-1 decision (§§11.4):
 * - `cta`  → `rounded-button-cta` (20px), DS spec padding 14/29, Lexend Light 16.
 * - `md` / `sm` / `xs` / `icon` → `rounded-button-compact` (8px), dense app style.
 *
 * Focus ring uses the brand-safe `shadow-brand-focus` token (Phase 2).
 */
type ButtonVariant = "primary" | "secondary" | "destructive" | "ghost" | "icon";
type ButtonSize = "cta" | "md" | "sm" | "xs" | "icon";

const BUTTON_VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary:
    "border border-transparent bg-brand text-surface hover:bg-blurple-700",
  secondary:
    "border border-[color:var(--sh-gray-200)] bg-surface text-ink hover:bg-blurple-50 hover:border-[color:var(--sh-gray-400)]",
  destructive:
    "border border-rose-600 bg-rose-600 text-white hover:bg-rose-500 hover:border-rose-500",
  ghost:
    "border border-transparent bg-transparent text-navy-500 hover:bg-blurple-50 hover:text-ink",
  icon:
    "border border-[color:var(--sh-gray-200)] bg-surface text-navy-500 hover:bg-blurple-50 hover:text-ink",
};

const BUTTON_SIZE_CLASSES: Record<ButtonSize, string> = {
  cta: "rounded-button-cta px-[29px] py-[14px] text-base font-light",
  md: "rounded-button-compact px-3 py-2 text-sm font-semibold",
  sm: "rounded-button-compact px-3 py-1.5 text-sm font-medium",
  xs: "rounded-button-compact px-2 py-1 text-xs font-medium",
  icon: "rounded-button-compact h-7 w-7 text-xs",
};

export function buttonClass({
  variant = "secondary",
  size = "sm",
  className,
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
}) {
  return cn(
    "pressable inline-flex items-center justify-center transition disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:shadow-brand-focus",
    BUTTON_VARIANT_CLASSES[variant],
    BUTTON_SIZE_CLASSES[size],
    className
  );
}

export function Button({
  variant = "secondary",
  size = "sm",
  className,
  type = "button",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
}) {
  return <button type={type} className={buttonClass({ variant, size, className })} {...props} />;
}
