# Sighthound Content Relay — Migration Audit (Phase 0)

Read-only audit of the current `sighthound-content-ops` app against `design-system/`.
No code changes made.

Commit baseline: `baaf298` on `main` (post-flashpoint; `design-system/` committed in `3d18a65`).

---

## 1. Current stack

| Layer | What is actually in use |
|---|---|
| Framework | Next.js **15.3.8**, App Router (`src/app/`), React 18.3.1 |
| CSS approach | **Tailwind CSS v4** (via `@tailwindcss/postcss` 4.2.2) |
| Tailwind config | **No `tailwind.config.ts` / .js** — v4 uses CSS-first `@theme inline` in `src/app/globals.css` |
| Component library | **None.** Custom primitives under `src/components/` (`button.tsx`, `data-table.tsx`, `detail-drawer.tsx`, `confirmation-modal.tsx`, etc.) |
| Icon set | `lucide-react` **0.577.0** via shared wrapper `src/lib/icons.tsx` (`AppIcon` + per-icon exports at 1.75 stroke weight) |
| Font loading | `next/font/google`: **Inter** (sans) + **JetBrains Mono** (mono), declared in `src/app/layout.tsx:12-22`, exposed as CSS vars `--font-inter-sans` / `--font-jetbrains-mono` |
| CSS-in-JS | None (no styled-components, emotion, stitches). Some inline `style={{…}}` usage remains. |
| Storybook / visual tests | **None.** No Chromatic, Percy, or Playwright visual snapshots. |
| State / UX libs | `@dnd-kit/*`, `@supabase/ssr`, Zod, `date-fns`. No UI kit (no Radix, no Headless UI, no MUI). |
| Tests | Jest (`jest --coverage`). Contract tests: `src/lib/status.contract.test.ts`, `src/lib/ui-vocab.contract.test.ts`, `tests/ui/no-forbidden-strings.test.ts`. |

---

## 2. Current token inventory

### 2.1 CSS custom properties (`src/app/globals.css`)
- Base: `--background: #f8fafc` (slate-50), `--foreground: #0f172a` (slate-900)
- Spacing: `--space-1..10` → 4/8/12/16/20/24/32/40 px
- Radius: `--radius-sm: 6`, `--radius-md: 8`, `--radius-lg: 12`
- Elevation: `--elevation-1/2/3` (slate-tinted shadows, `rgba(15,23,42,…)`)
- Motion: `--motion-duration-{instant 80, fast 120, base 150, slow 200, pulse 250}`; easings `cubic-bezier(0.22,1,0.36,1)` etc.

### 2.2 Tailwind theme (`@theme inline` block in `globals.css`)
Tiny on purpose — delegates to Tailwind v4 built-in palette:
```css path=/Users/harisajmal/Desktop/SIGHTHOUND INC/vibeCode/content-ops/sighthound-content-ops/src/app/globals.css start=53
@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --font-sans: var(--font-inter-sans);
  --font-mono: var(--font-jetbrains-mono);
}
```
No brand colors (blurple, navy, orange) are registered; components rely on Tailwind defaults (`slate-*`, `blue-*`, `emerald-*`, etc.).

### 2.3 Typography utility classes (`globals.css:60-104`)
Eleven `@apply`-based classes (`.page-title`, `.section-title`, `.subsection-label`, `.table-header-text`, `.body-text`, `.meta-text`, `.disabled-text`, `.text-secondary`, `.monospace-technical`, `.tabular-nums`) — **every color is hardcoded to `text-slate-*`**.

### 2.4 Typography constants (`src/lib/typography.ts`)
Twenty `TYPOGRAPHY.*` string constants, all embedding `text-slate-*` literals (plus one `text-blue-600` for `LINK`).

### 2.5 Status chip palette (`src/lib/status.ts:116-187`)
Contract-locked palette for badges: `slate/blue/violet/rose/emerald/sky/amber` at the `-100/-200/-700` ramp. Guarded by `status.contract.test.ts` and AGENTS.md Global Vocabulary Contract.

---

## 3. Token map: current → `design-system/colors_and_type.css`

### 3.1 Color — **major divergence**

| Role | Current value (Tailwind) | Proposed value (DS) | Verdict |
|---|---|---|---|
| Page background | `slate-50` `#f8fafc` | `--sh-white #ffffff` or `--sh-gray #eff3f7` | Close, not 1:1 (slate vs warm-navy gray) |
| Body text | `slate-800` `#1e293b` / `slate-900` `#0f172a` | `--sh-navy #1a1d38` | Different hue (cool slate → warm navy). **Conflict — one-shot visual change.** |
| Meta text | `slate-600` `#475569` | `--sh-navy-500 #4b4f73` | Close, not 1:1 |
| Disabled text | `slate-400` `#94a3b8` | `--sh-gray-400 #9aa3b2` | Close |
| Primary accent | `blue-600` `#2563eb` | `--sh-blurple #4f60dc` | **Conflict** — different hue; no existing blurple scale in Tailwind |
| Borders | `slate-200` / implicit | `--border-subtle #e4e8ef`, `--border-default #d9dfe6` | Close |
| — | (no orange) | `--sh-orange-light/-medium/-red` | **Add** — three new accent ramps |
| — | (no gradients) | `--sh-gradient-brand/-warm/-cool` | **Add** |
| Status chips (pastel) | `violet/rose/sky/emerald/amber @ -100/-200/-700` | — | **No direct mapping in DS.** Retain OR remap; contract-locked (see §4). |

### 3.2 Typography — **major change**

| Role | Current | Proposed | Verdict |
|---|---|---|---|
| Sans family | Inter (`next/font/google`, var `--font-inter-sans`) | **Lexend** (weights 300/500/600) | **Swap** — full replacement |
| Mono family | JetBrains Mono (`next/font/google`) | `SF Mono, Menlo, Consolas, 'Roboto Mono'` | **Conflict** — DS lists system stack; JetBrains Mono is a legitimate compatible equivalent. Keep? (open question) |
| Body size | `text-sm` (14px) | `--fs-body 16px` | **Conflict** — 16px will visibly enlarge every list/table/form |
| Body weight | 400 (Normal) | **300 (Light)** | **Conflict** — DS body is Light, not Normal |
| H1 | `text-2xl` (24px) `font-semibold` | **46px** / medium | App uses much denser heading scale (app, not marketing) |
| H2 | `text-lg` (18px) `font-semibold` | **32px** / light | Same density gap |
| Wordmark typeface | N/A (not typeset in app) | Robofan (proprietary — **use logo files only**) | Compliant |
| Letter spacing | body `-0.01em` | (DS doesn't specify body tracking) | Retain |

### 3.3 Radius

| Role | Current | Proposed (DS) | Verdict |
|---|---|---|---|
| sm | 6px | **4px** | **Conflict** — DS is tighter |
| md | 8px | 8px | **1:1** |
| lg | 12px | 12px | **1:1** |
| Button | N/A (currently `rounded-md` / `rounded-lg`, 6–8px) | **20px** (`--radius-button`) | **Add + conflict** — high-visibility change |
| Pill | N/A (currently `rounded-full`) | 999px (`--radius-pill`) | Effectively 1:1 |
| Input | N/A (currently `rounded-md`, 6–8px) | 8px | ≈ 1:1 |

### 3.4 Spacing — **mostly 1:1**

| Step | Current | Proposed | Verdict |
|---|---|---|---|
| 1..10 (4..40 px) | present | present | **1:1** |
| 12/16/20/24 (48/64/80/96 px) | missing | present | **Add** — extends scale |

### 3.5 Shadow — **tint + ramp differ**

| Role | Current | Proposed | Verdict |
|---|---|---|---|
| `elevation-1` | `0 1px 2px rgba(15,23,42,.04)` slate | `--shadow-xs 0 1px 2px rgba(26,29,56,.06)` navy | **Conflict** — different tint + opacity |
| `elevation-2` | `0 2px 6px rgba(15,23,42,.06)` | `--shadow-sm 0 2px 6px rgba(26,29,56,.08)` | **Conflict** — tint |
| `elevation-3` | `0 8px 24px rgba(15,23,42,.08)` | `--shadow-md 0 8px 20px rgba(26,29,56,.10)` | **Conflict** — tint + slight geometry |
| — | — | `--shadow-lg`, `--shadow-focus` | **Add** |

### 3.6 Motion — **different model**

| Role | Current | Proposed | Verdict |
|---|---|---|---|
| Easings | `cubic-bezier(0.22,1,0.36,1)` (out), `(0.64,0,0.78,0)` (in), `(0.65,0,0.35,1)` (in-out) | `--ease-standard (0.2,0,0.2,1)`, `--ease-out (0,0,0.2,1)` | **Conflict** — different curves |
| Durations | 80/120/150/200/250 ms (5 steps) | 120/200/320 ms (3 steps) | **Conflict** — current has finer granularity |
| Reduced motion override | yes (zeroed out) | implicit (none defined in DS) | Current is stricter; keep override |

---

## 4. Risk areas

### 4.1 Contract-locked palette (HIGH risk)
`src/lib/status.ts` status chip maps (`STATUS_COLORS`, `WRITER_STATUS_COLORS`, `PUBLISHER_STATUS_COLORS`, `SOCIAL_POST_STATUS_COLORS`, `WORKFLOW_STAGE_COLORS`) are locked by `src/lib/status.contract.test.ts` and AGENTS.md's **Global Vocabulary Contract (MUST)** — status color tokens are explicitly enumerated (review=violet, ready=sky, awaiting-live-link=amber, needs-revision=rose, in-progress=blue, published=emerald, neutral=slate).
→ Any remap requires: (a) contract test update, (b) AGENTS.md amendment, (c) explicit user decision.

### 4.2 Auth / login branding (MEDIUM risk, HIGH visibility)
- `src/app/login/login-form.tsx`, `src/app/login/login-hero.tsx`, `src/app/page.tsx` (marketing / premium landing)
- Heavy `slate-*` + `blue-*` usage. First impression; candidate for a hero Lexend + Blurple showcase.

### 4.3 AI assistant surfaces (MEDIUM)
`src/components/ai/*` (chat panel, message, blocker/quality/next-steps/feedback cards, based-on panel, quick prompts, floating button, links row) — dense slate/blue/violet usage. High‑interaction, visible on every content detail page + dashboard/tasks/calendar per AGENTS.md.

### 4.4 Tables & drawers (MEDIUM)
`data-table.tsx`, `dashboard-table.tsx`, `detail-drawer.tsx`, `table-controls.tsx`, `dashboard-sidebar.tsx`, `app-shell.tsx`, `calendar-*` — these are app-wide primitives. Any radius/shadow/color change ripples everywhere.

### 4.5 Third-party widgets & external surfaces
- **Slack payloads** (`src/lib/server-slack-emitter.ts`, `src/lib/notifications.ts`) — plain-text. Not affected by tokens. **No risk.**
- **Email templates** — `grep sendgrid|resend|postmark|nodemailer` returns zero hits. There are no transactional email templates in the repo. Notifications are Slack + in-app only. **No risk.**
- **OpenGraph / social cards** — no `og-image` route found. **No risk today.** (If added later, token adoption must include it.)
- **Marketing site / docs site** — lives in `design-system/ui_kits/sighthound-marketing/` (reference only, not deployed). Out of scope for app migration.

### 4.6 Zombie / inconsistent code
- `src/app/font-variants.tsx` references `--font-geist-sans` and `FONT_STACK_CURRENT` based on Geist — **Geist is not used anywhere**; `layout.tsx` loads Inter. File is dead or stale.
- `docs/TYPOGRAPHY_SYSTEM.md` referenced from both `globals.css` and `AGENTS.md`; AGENTS.md now points upstream to `design-system/`. Alignment needed on touch.

### 4.7 Tailwind v4 mechanics (procedural risk)
The user's Phase 2 plan says "extend `tailwind.config.js` theme". **This repo has no such file.** In Tailwind v4 the equivalent is the `@theme inline { … }` block in `src/app/globals.css`. All Phase 2 token-to-Tailwind glue happens there. Phase 2 mechanics need adjustment (see §6).

---

## 5. Surface-area estimate (migration effort)

Based on `src/` grep for `slate-[0-9]{2,3}` and `(bg|text|border|ring)-blue-[0-9]{2,3}`:

| Bucket | File count (approx) |
|---|---|
| Slate/blue literals in pages | 15+ (`dashboard`, `social-posts` list + detail, `blogs` list + detail + cardboard + new, `tasks`, `ideas`, `calendar`, `settings` page + access-logs + permissions, `inbox`, `updates`, `resources`, `login`) |
| Slate/blue literals in shared components | 40+ (`app-shell`, `data-table`, `dashboard-table`, `dashboard-sidebar`, `detail-drawer`, `button`, `skeleton`, `empty-state`, `filter-bar`, `filter-chip`, `confirmation-modal`, `bulk/selection-cart`, `command-palette`, `global-quick-create`, `notification-preferences-form`, `connected-services-form`, `markdown-comment`, `name-resolution-modal`, `checkbox-multi-select`, `tooltip`, `table-controls`, `calendar-*`, `column-editor`, `sidebar-toggle`, `sidebar-version-footer`, `presence-bubbles`, `onboarding-tour`, `ai/*` (10 files), `next-action/*` (3 files), `social-post-status-info`, `associated-blog-context-card`, `associated-social-posts-section`, `kbd-shortcut`, `link-quick-actions`, `bulk-action-preview-modal`, `protected-page`) |
| Typography utility classes / constants | 2 central files (`globals.css`, `src/lib/typography.ts`) — cascades everywhere |
| Contract-locked status maps | 1 (`src/lib/status.ts` + `status.contract.test.ts`) |
| Literal-hex in `.tsx` | 5 files (`dashboard/page.tsx`, `blogs/page.tsx`, `tasks/page.tsx`, `app-shell.tsx:602`, plus `globals.css` CSS-only) |
| Arbitrary Tailwind `bg-[#…]` / `text-[#…]` | 1 file (`app-shell.tsx:602`) |
| `fontFamily` in JSX | 0 (all fonts flow through `next/font` + `@theme`) |

**Raw estimate:** ~60–70 app-surface files touch current tokens. A clean "leaf first" migration per the user's Phase 3 plan is viable, but one‑PR‑per‑component will be 10–15+ PRs minimum for primitives alone.

---

## 6. Discrepancies between the user's phase plan and repo reality

| User's plan says | Repo reality | Recommendation |
|---|---|---|
| Phase 1: copy `design-system/assets/fonts/` to `public/static` | **No `assets/fonts/` exists.** DS ships Lexend via `@import url(fonts.googleapis.com)` in `colors_and_type.css`. | Load Lexend via `next/font/google` (drop-in replacement for current Inter loader) to preserve zero-CLS behavior. Self-host only if offline availability is required. |
| Phase 1: "verify fonts load (no FOUT swap to fallback)" | Google `@import` cannot guarantee no-FOUT. `next/font` can. | Prefer `next/font/google` for Lexend. |
| Phase 2: extend `tailwind.config.js theme.colors / fontFamily / …` | **No `tailwind.config.*` exists** (Tailwind v4, CSS-based `@theme inline`). | Map tokens in `src/app/globals.css`'s `@theme inline` block (e.g. `--color-blurple: var(--sh-blurple);`). Utility class names come for free once tokens are in theme. |
| Phase 4: "swap font-family to **Untitled Sans / Tiempos Headline**" | DS specifies **Lexend** only; no Untitled Sans, no Tiempos. | Treat as boilerplate error. Canonical font is Lexend. |
| Phase 3: "update all snapshot/visual tests; screenshot before/after" | No visual test tooling; Jest snapshots not widely used for UI. | Either stand up Playwright/Chromatic first, or accept manual visual QA per PR. |
| Phase 5: "Update any email templates, marketing site, and external embeds" | No emails; marketing site lives in `design-system/ui_kits/` (reference only, not deployed). | Scope is app-only. |

None of these block Phase 1 — they just rewrite what Phases 1/2/3/4/5 mean concretely for this repo.

---

## 7. Gaps the design system does not cover

The DS defines brand primitives but intentionally stops short of app chrome. These concepts exist in our app but have **no corresponding token in `design-system/colors_and_type.css`** and need a decision:

1. **Semantic status palette** (review/ready/waiting/changes-requested/in-progress). DS has `--status-success/warning/danger/info` only. Our existing violet/rose/sky/amber/emerald mapping is richer and contract-locked.
2. **Table row workflow tones** (published rows emerald, awaiting-live-link amber, etc. — see AGENTS.md Global Table Consistency Contract).
3. **Focus ring color on inputs** — DS has `--shadow-focus` (blurple ring) but current `.focus-field` uses blue-400 on light-blue background. Blurple is arguably better brand-aligned.
4. **Toast/alert tones** — no DS tokens for success/error/warning/info toasts.
5. **Sidebar dark-on-navy mode** — Redactor UI kit uses `#1a1d38` sidebar with `#dee2f8` text. Our sidebar is currently white. Adoption is a product decision, not just tokens.
6. **Density modes** — current app has `compact`/`comfortable` density preference. DS doesn't speak to this.

---

## 8. Open questions (block Phase 1 until resolved)

1. **Lexend delivery**: `next/font/google` (recommended) vs the DS-shipped `@import` from `colors_and_type.css`? Affects CLS, bundle, and offline behavior.
2. **Body size**: adopt DS 16px body, or keep current 14px (`text-sm`) app-density? 16px visibly re-paginates every table/list.
3. **Body weight**: adopt DS Light 300, or keep current Normal 400? Light 300 at 14px is legibility-borderline on low-DPI displays.
4. **Button radius**: adopt 20px everywhere, or keep 6–8px for dense app controls and reserve 20px for CTAs only? The DS spec is absolute (20px), but app density suggests a split.
5. **Status chip palette**: retain the locked violet/rose/sky/amber/emerald pastel contract, or remap to brand-only (blurple/navy/orange)? Contract + AGENTS.md rule change required either way.
6. **Sidebar surface**: keep white or adopt the `#1a1d38` navy sidebar shown in the Redactor UI kit?
7. **Mono font**: keep JetBrains Mono (current, loaded via `next/font`) or adopt the DS system-mono stack (`SF Mono, Menlo, …`)?
8. **`src/app/font-variants.tsx` + `docs/TYPOGRAPHY_SYSTEM.md`**: delete / rewrite / leave alone during migration?
9. **Visual regression tooling**: do we stand up Playwright screenshots before Phase 3, or go manual-QA?
10. **History of the 10 MB `design-system/uploads/*.pdf`**: unrelated to visual migration but still open from the previous pass.

---

## 9. Recommendations (agent POV)

- **Proceed with Phase 1** after §8 answers are on the record.
- **Replace "copy fonts + update `@font-face`"** with **"swap `Inter` for `Lexend` in `next/font/google` inside `src/app/layout.tsx`"**. Add new Lexend weights 300/500/600. Leave `--font-inter-sans` as a deprecated-but-live fallback until Phase 5 cleanup.
- **Add tokens to `src/app/globals.css`** as `--sh-*` variables (mirror of `colors_and_type.css`) plus a semantic layer (`--color-brand`, `--color-ink`, `--color-surface`, `--color-accent-warm`, `--color-accent-hot`). Register a subset in `@theme inline` so Tailwind utilities like `bg-brand`, `text-ink`, `bg-surface`, `rounded-button` become available.
- **Do not delete any existing `--background` / `--foreground` / slate classes** in Phase 1 or 2. Coexistence is the whole point of an additive migration.
- **Treat the contract-locked status palette as out-of-scope** for visual migration. Touch it in a dedicated later PR with contract + AGENTS updates.
- **One PR per primitive** (Button → Input → Card → Badge → Nav → Modal) with manual visual QA, since there is no visual test harness.
- **Keep `design-system/uploads/*.pdf` off the critical path** — unrelated to tokens; decision still open.

---

## 10. Pending user decisions before Phase 1 begins

Answers needed to: §8.1 (Lexend loading), §8.2 (body size), §8.3 (body weight), §8.4 (button radius), §8.5 (status palette), §8.6 (sidebar surface), §8.7 (mono font), §8.8 (zombie files), §8.9 (visual regression tooling).

If all else is blocked, the minimum viable Phase 1 is:
- Add `src/styles/sighthound-tokens.css` (or extend `globals.css` directly) with Sighthound tokens as CSS vars.
- Swap Inter → Lexend via `next/font/google`.
- Copy `design-system/assets/sighthound-logo-*` and `redactor-logo-*` into `public/brand/`.
- Add one preview route at `/design-system-preview` that renders type ramp + color swatches + button variants using the new tokens.
- No component refactors, no Tailwind theme edits yet.

---

## 11. Decisions recorded & intentional deviations (Phase 1)

Answers to §8 that unblock Phase 1. All are deliberate and must be referenced in future work.

1. **Lexend delivery**: via `next/font/google` in `src/app/layout.tsx` (weights 300/400/500/600/700). The DS `@import url(fonts.googleapis.com/…Lexend)` in `colors_and_type.css` is a static-HTML convenience only — not brought into the app. Next/font is preload-able and zero-CLS.
2. **Body size — intentional deviation from DS**: app body remains **14px** (Tailwind `text-sm`). The DS 16px spec applies to marketing / docs surfaces. Rationale: 16px would visibly re-paginate every table, list, and form; density is a feature of the app.
3. **Body weight — intentional deviation from DS**: app body remains **400 (Normal)**. DS Light 300 at 14px is a legibility gamble on non-retina displays. Use 300 only for large display type (H1/H2 at 32px+).
4. **Button radius — split**: encode **two** tokens.
   - `--radius-button-cta: 20px` for CTAs, marketing, and auth surfaces (matches DS spec).
   - `--radius-button-compact: 8px` for dense app controls (table row actions, filter chips, toolbar buttons, icon buttons).
   The leaf `Button` primitive will take a `size` prop that selects between them.
5. **Status chip palette — out of scope for visual migration**: retain the contract-locked pastel palette in `src/lib/status.ts` (`slate/blue/violet/rose/emerald/sky/amber`). Richer than DS's `--status-success/warning/danger/info` and locked by `status.contract.test.ts` + AGENTS.md Global Vocabulary Contract. A note on the DS side will document this boundary.
6. **Sidebar surface**: keep white for now. The navy (`#1a1d38`) sidebar shown in `design-system/ui_kits/redactor-app/` is a Redactor pattern, not a Content Relay pattern. Revisit after Phase 4 once Blurple is everywhere else and the decision is lower-risk.
7. **Mono font**: keep **JetBrains Mono** (loaded via `next/font/google`, zero CLS). Treat the DS system-mono stack (`SF Mono, Menlo, …`) as the fallback chain, not the primary. DS docs will be updated to reflect this.
8. **Zombie files**: both will be deleted in a dedicated follow-up PR — NOT scoped to Phase 1.
   - `src/app/font-variants.tsx` (references `--font-geist-sans`; Geist is not used).
   - `docs/TYPOGRAPHY_SYSTEM.md` (once Phase 4 types are done; superseded by `design-system/README.md`).
9. **Visual regression tooling**: manual QA for now. Screenshot before/after in PR descriptions per primitive. Standing up Playwright/Chromatic is its own project; revisit if the migration bogs down.
10. **PDF history (`design-system/uploads/*.pdf`, ~10 MB)**: unrelated to the visual migration. Will be handled separately.

### Corrections applied to the phase plan

- **Phase 1 font step**: swap `Inter → Lexend` inside `next/font/google` in `src/app/layout.tsx`. Export as `--font-lexend-sans`; keep `--font-inter-sans` defined as a CSS alias to the same loader result, removed in Phase 5.
- **Phase 2 Tailwind step**: this repo is Tailwind v4 (no `tailwind.config.*`). Token-to-utility glue is added inside `@theme inline { … }` in `src/app/globals.css`.
- **Phase 4 font names**: canonical sans is **Lexend** only. Any reference to “Untitled Sans / Tiempos Headline” in the original phase plan was boilerplate and should be ignored.
- **Phase 5 scope**: app-only. There are no transactional email templates in this repo; marketing is not in this repo.

### Phase 1 execution summary

Implemented (this commit):
- `src/app/layout.tsx`: Inter → Lexend, weights 300–700, variable `--font-lexend-sans`.
- `src/app/globals.css`:
  - Added `--sh-*` brand ramps (blurple / navy / gray / orange / gradients) to `:root`.
  - Added semantic layer (`--color-brand`, `--color-ink`, `--color-surface`, `--color-accent-warm`, `--color-accent-hot`).
  - Added split button radii (`--radius-button-cta`, `--radius-button-compact`).
  - Added transitional alias `--font-inter-sans: var(--font-lexend-sans)`.
  - Updated `@theme inline` to expose the semantic layer as Tailwind utilities and point `--font-sans` at Lexend.
  - Updated body `font-family` to reference `--font-lexend-sans` primary.
- `public/brand/`: copied `sighthound-logo-horizontal.jpg`, `sighthound-logo-white.png`, `redactor-logo-horizontal.webp` (DS does not ship SVG variants).
- `src/app/design-system-preview/page.tsx`: smoke-test route rendering type ramp, brand swatches, both button variants, shadow ramp, and logos. No imports from `src/lib/typography.ts`, `src/lib/status.ts`, or shared components.

Explicitly **not** touched in Phase 1: `src/lib/status.ts`, `src/lib/typography.ts`, any `src/components/*`, any route other than the new preview.
