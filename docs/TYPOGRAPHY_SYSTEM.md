# Typography System

**Source of truth:** `design-system/README.md` + `design-system/colors_and_type.css`.
All brand tokens (colours, type scale, font stacks, radii, shadows, motion) live there. Do not edit them here.

This file only records the **app's intentional deviations** from the brand spec, so future agents don't "correct" them back to the DS defaults.

## Canonical tokens (where to look)

- Primary sans: **Lexend** (weights 300/400/500/600/700), loaded via `next/font/google` in `src/app/layout.tsx`, exposed as CSS var `--font-lexend-sans`, and mapped to Tailwind `font-sans` via `@theme inline` in `src/app/globals.css`.
- Mono: **JetBrains Mono**, exposed as `--font-jetbrains-mono`, mapped to Tailwind `font-mono`.
- Colour tokens: `--color-ink` (body / headings), `--color-navy-500` (meta / secondary), `--color-navy-500/60` (disabled), `--color-brand` (Blurple links) — defined in `globals.css`, sourced from `--sh-*` brand ramps.
- Typography constants: `src/lib/typography.ts` (`TYPOGRAPHY.*` keys) consume the tokens above.
- Typography utility classes: `.page-title`, `.section-title`, `.subsection-label`, `.table-header-text`, `.body-text`, `.meta-text`, `.disabled-text`, `.text-secondary`, `.monospace-technical`, `.tabular-nums` in `globals.css`.

## App deviations from the design-system spec

These are intentional and should not be reverted to the DS defaults without an explicit product decision. They are recorded in `design-system/MIGRATION_AUDIT.md` §§11.2–11.4.

1. **Body size: 14px** (DS spec: 16px).
   The DS 16px applies to marketing / docs surfaces. App density wins here — lifting to 16px re-paginates every table, list, and form. Marketing exceptions: `/login` and `/` render at the DS 16px.
2. **Body weight: 400** (DS spec: 300 Light).
   Light 300 at 14px is a legibility gamble on non-retina displays. Use 300 only for large display type (H1 / H2 at 32 px+).
3. **Split button radii** (DS spec: 20px everywhere).
   - `--radius-button-cta: 20px` for marketing CTAs, auth, and primary hero actions.
   - `--radius-button-compact: 8px` for dense app controls (table row actions, filter chips, toolbar buttons, icon buttons).
4. **Status chip palette is contract-locked** (`slate / blue / violet / rose / emerald / sky / amber` at the `-100 / -200 / -700` ramp).
   Defined in `src/lib/status.ts` and guarded by `src/lib/status.contract.test.ts` + AGENTS.md's **Global Vocabulary Contract (MUST)**. Intentionally richer than the DS's `--status-success/warning/danger/info` tokens. See `design-system/MIGRATION_AUDIT.md` §11.5.
5. **Neutral Gray ramp not exposed as Tailwind utilities.**
   The DS `--sh-gray` / `-200` / `-400` / `-600` ramp would collide with Tailwind's default `gray-*`. Consume via raw CSS vars: `bg-[color:var(--sh-gray-200)]`, `border-[color:var(--sh-gray-200)]`, etc.

## Usage rules

- Consume tokens, never hex. Brand token changes must originate in `design-system/colors_and_type.css` and flow downstream into `src/app/globals.css` + the Tailwind theme — never the other way around.
- Prefer `TYPOGRAPHY.*` constants from `src/lib/typography.ts` or the `.body-text` / `.meta-text` utility classes over bespoke font-size / colour combinations.
- Do not introduce new `text-slate-*` / `bg-slate-*` / `text-blue-*` / `text-indigo-*` classes. Use `text-ink`, `text-navy-500`, `text-brand`, `bg-surface`, `border-[color:var(--sh-gray-200)]`, etc.
- Do not modify `src/lib/status.ts` enum-key mappings; status labels and chip colour tokens are contract-locked.

## Related docs

- `design-system/README.md` — brand spec, voice, visual foundations.
- `design-system/colors_and_type.css` — canonical token ramps.
- `design-system/MIGRATION_AUDIT.md` — full migration history, token map, and deviation rationale.
- `docs/DESIGN_TOKENS.md` — implementation notes and Tailwind utility exposure.
- `AGENTS.md` — **Design System Authority**, **Typography System**, and **Global Vocabulary Contract** rules.
