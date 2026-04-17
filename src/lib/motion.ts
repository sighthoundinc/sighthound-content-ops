/**
 * Motion tokens for Content Relay.
 *
 * Single source of truth for animation durations and easings.
 * All new motion in the app must import from this module.
 *
 * Respects `prefers-reduced-motion` by default — consumers should pair
 * these tokens with `motion-reduce:*` Tailwind utilities or the
 * `prefersReducedMotion()` helper when rendering programmatic animations.
 *
 * Contract (AGENTS.md):
 * - Tooltip < Drawer < Modal < Toast z-index hierarchy is preserved elsewhere;
 *   motion tokens here are layout-agnostic and only describe timing / easing.
 */

export const MOTION_DURATION = {
  /** 80ms — micro interactions (press feedback, subtle hover) */
  instant: 80,
  /** 120ms — small UI affordances (focus rings, background color changes) */
  fast: 120,
  /** 150ms — default for popovers, dropdowns, small drawers */
  base: 150,
  /** 200ms — detail drawer overlays, modals */
  slow: 200,
  /** 250ms — optimistic commit row pulse / exit animations */
  pulse: 250,
} as const;

export const MOTION_EASING = {
  /** ease-out — primary choice for entering animations */
  out: "cubic-bezier(0.22, 1, 0.36, 1)",
  /** ease-in — primary choice for exiting animations */
  in: "cubic-bezier(0.64, 0, 0.78, 0)",
  /** ease-in-out — symmetric motion, avoid for list row updates */
  inOut: "cubic-bezier(0.65, 0, 0.35, 1)",
  /** linear — progress indicators only */
  linear: "linear",
} as const;

export type MotionDurationToken = keyof typeof MOTION_DURATION;
export type MotionEasingToken = keyof typeof MOTION_EASING;

/**
 * Returns true when the user has requested reduced motion via the OS.
 * Safe to call during SSR — returns false when `window` is unavailable.
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) {
    return false;
  }
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Returns a CSS `transition` string honoring `prefers-reduced-motion`.
 * When reduced-motion is set, transitions collapse to `none` so state
 * changes paint immediately without flashing.
 */
export function transitionStyle(
  property: string,
  options?: { duration?: MotionDurationToken; easing?: MotionEasingToken }
): string {
  if (prefersReducedMotion()) {
    return "none";
  }
  const duration = MOTION_DURATION[options?.duration ?? "base"];
  const easing = MOTION_EASING[options?.easing ?? "out"];
  return `${property} ${duration}ms ${easing}`;
}
