# Design Tokens
Content Relay uses a small, intentional token layer. Tokens are defined as CSS custom properties in `src/app/globals.css` and mirrored in TypeScript where useful (e.g. motion in `src/lib/motion.ts`).
## Spacing
4px rhythm. Use Tailwind utilities (`p-2`, `gap-3`) for the common case; reach for the custom properties only when styling needs to live outside Tailwind (CSS-in-JS, inline style overrides, SVG attributes).
| Token | Value |
| --- | --- |
| `--space-1` | 4px |
| `--space-2` | 8px |
| `--space-3` | 12px |
| `--space-4` | 16px |
| `--space-5` | 20px |
| `--space-6` | 24px |
| `--space-8` | 32px |
| `--space-10` | 40px |
## Radius
| Token | Value |
| --- | --- |
| `--radius-sm` | 6px |
| `--radius-md` | 8px |
| `--radius-lg` | 12px |
## Elevation
Subtle, consistent shadow ramp. Do NOT introduce new shadows outside this ramp.
| Token | Intent |
| --- | --- |
| `--elevation-1` | Cards, inputs on hover |
| `--elevation-2` | Dropdowns, popovers |
| `--elevation-3` | Modals, drawers, floating bars |
## Motion
Timing and easing tokens (mirror `src/lib/motion.ts`):
| Token | Value | Use |
| --- | --- | --- |
| `--motion-duration-instant` | 80 ms | Press, hover micro-feedback |
| `--motion-duration-fast` | 120 ms | Focus rings, background changes |
| `--motion-duration-base` | 150 ms | Popovers, small drawers |
| `--motion-duration-slow` | 200 ms | Detail drawers, modals |
| `--motion-duration-pulse` | 250 ms | Optimistic row pulse |
| `--motion-easing-out` | cubic-bezier | Entering motion |
| `--motion-easing-in` | cubic-bezier | Exiting motion |
| `--motion-easing-in-out` | cubic-bezier | Symmetric motion (rare) |
All duration tokens collapse to `0ms` under `prefers-reduced-motion: reduce`.
## Typography
Typography tokens remain authoritative in `src/lib/typography.ts` and `docs/TYPOGRAPHY_SYSTEM.md`. This document does not re-specify them.
## Rules
- No ad-hoc `p-[13px]`, `shadow-[0_8px_20px_#00000022]`, or bespoke durations in new code.
- Consumers needing a custom shadow or duration should propose a token addition in a PR rather than inlining.
- Dark mode / custom themes may override these tokens later; keep semantic names stable.
