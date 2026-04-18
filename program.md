# Dashboard Bundle-Size AutoResearch (Round 4)

## Goal

**Minimise `dashboard_first_load_kb` — the First Load JS size of the
`/dashboard` route — without regressing any other route beyond noise.**

Current baseline: **`dashboard_first_load_kb = 383.0`** (measured
2026-04-18 on clean main).

Per-route context (same baseline build):
```
/                         173.0 kB
/dashboard                383.0 kB   ← target (heaviest non-API route)
/blogs                    351.0 kB
/social-posts             241.0 kB
/calendar                 229.0 kB
/blogs/[id]               216.0 kB
/tasks                    215.0 kB
/settings                 206.0 kB
/inbox                    202.0 kB
Total (58 routes)        8076.0 kB
```

Why this matters: `/dashboard` is the landing surface for every logged-in
user. 383 kB First Load JS on a 4G connection is ~1.5 s of JS download alone
before parse + hydration. A 30 % reduction (→ ~270 kB) saves roughly half a
second on cold dashboard load and drops the "dashboard feels slow" tax that
currently eats every first-of-day session.

## Metric definition

`scripts/measure-bundle.mjs` runs `npx next build --no-lint`, parses the
per-route table Next.js emits, and prints:

```
dashboard_first_load_kb=<n>    ← the ratcheted metric
total_first_load_kb=<n>        (diagnostic)
route_count=<n>                (diagnostic)
build_chunks_kb=<n>            (diagnostic: du .next/static/chunks)
```

`METRIC_PATTERN` pins on the first line. `MIN_DELTA=3` (kB) filters build
noise; Next.js bundle numbers can flip ±1–2 kB between otherwise-identical
builds.

## What you CAN modify (`EDITABLE_FILES`)

- `src/app/dashboard/**` — dashboard route + colocated components.
- `src/components/dashboard/**` — dashboard-specific shared components.
- `src/components/next-action/**` — heavy primitives rendered on dashboard.
- `src/components/bulk/**` — selection cart used on dashboard.
- `src/lib/saved-views.ts` — localStorage helper; check for stray heavy deps.
- `next.config.js` / `next.config.ts` — webpack config; dynamic import
  guards, bundle-analyzer, experimental optimizations.
- `src/app/layout.tsx` — root layout; sometimes leaks deps to all routes.

## What you CANNOT modify

- Any other `src/**` path (changes there require widening scope explicitly).
- `package.json` — dep additions/removals require a manual review round.
- `eval/**`, `scripts/**`, `research.env`, `program.md` (harness is frozen).
- `supabase/**` (unrelated to bundles).
- The evaluation command (`scripts/measure-bundle.mjs`).

## Experiment Priorities

Ranked by expected kB impact. Each is a single targeted change.

1. **Lazy-load heavy dashboard subviews with `next/dynamic`.**
   Likely culprits: Snapshot table, pipeline/CardBoard view, any chart
   component bundled into the initial render. Wrap in
   `dynamic(() => import('./X'), { ssr: false, loading: () => <Skeleton/> })`.
   Expected: **20–60 kB**.

2. **Split the bulk selection cart (`src/components/bulk/**`) behind a
   client-only dynamic import.** Only needed when the user clicks
   "Select all"; no reason to ship on first paint. Expected: **10–30 kB**.

3. **Audit dashboard barrel imports.** `import { X, Y } from "@/components/…"`
   where `…/index.ts` re-exports everything causes whole-subtree bundling.
   Switch to deep imports. Expected: **5–15 kB**.

4. **Remove accidental `"use client"` from dashboard subcomponents that
   don't actually use state/effects.** Server components ship zero client
   JS for that subtree. Expected: **10–40 kB** per flipped component.

5. **Convert lucide-react to per-icon ESM imports** in the dashboard tree.
   `import { X, Y } from "lucide-react"` tree-shakes well in modern Next,
   but occasional misses do happen. Expected: **3–8 kB**.

6. **Lazy-load keyboard shortcut / command palette registration** on
   dashboard mount. `Cmd+K` often pulls fuzzy-search libs into the
   initial bundle. Defer to idle callback. Expected: **5–15 kB**.

7. **Switch `date-fns` imports to subpath form** in dashboard code.
   `import { format } from "date-fns"` → `import format from "date-fns/format"`.
   Expected: **5–10 kB** if multiple helpers are used.

8. **Deduplicate Supabase client imports** in dashboard server components —
   the SSR and browser clients occasionally both bundle on a page due to
   shared code paths. Expected: **10–20 kB**.

9. **Enable `next.config` `experimental.optimizePackageImports`** for heavy
   deps like `lucide-react`, `date-fns`, `@dnd-kit/*`. One config line;
   modern Next handles tree-shaking these packages more aggressively when
   listed. Expected: **variable (0–30 kB)**.

10. **Route-level chunks for independent feature sections** of the dashboard.
    Once #1 and #4 have landed, the remaining shared surface can be split
    per-feature. Expected: **cumulative 30–100 kB**.

**Combination experiments** come AFTER each individual change has landed
cleanly. Expected aggregate lift: 80–150 kB (dashboard_first_load_kb in the
230–300 kB range).

## Simplicity Criterion

- Improvement < `MIN_DELTA` (3 kB) → discard even if technically negative.
- Any change that ships > 30 net new lines of code to save < 10 kB is
  probably hiding complexity behind the metric — discard unless it unlocks
  future experiments.
- Lazy-loading a component behind `loading: () => null` is a lie to the user
  (empty screen instead of spinner). Always provide a Skeleton fallback.

## Agent Workflow (Copy-Paste Prompt)

```
Run the autoresearch loop for 4 hours. Follow program.md §Agent Workflow exactly:
1. Start the session: ./scripts/start-session.sh 4 383.0
2. Before every experiment: ./scripts/check-time.sh — stop if it exits 1
3. Read program.md and results/autoresearch.tsv, pick the next untried
   experiment from §Experiment Priorities, make ONE targeted change to
   EDITABLE_FILES, then run:
   ./scripts/autoresearch.sh "<short description of change>"
4. Each iteration takes ~15-30 seconds (build-bound). Expect ~8-15 iterations
   in 4 hours accounting for thinking + crash recovery.
5. Stop when check-time.sh exits 1 or autoresearch.sh exits 3;
   summarise results/autoresearch.tsv.
```

## Crash Handling

If `next build --no-lint` crashes (type error, invalid import, missing
module), the scorer exits 2 and `autoresearch.sh` records a crash + restores
files. Crashes are common with optimization experiments — stay defensive:

- Always verify the change compiles locally before running the loop step
  (`npx next build --no-lint` from the repo root is ~15 s).
- `results/last_build.log` has the full build output including error tail.
- If the same crash fires twice, the idea is fundamentally broken — move on.

## Deployment verification

**Not applicable for Round 4.** Bundle changes live in Next.js application
code, which deploys through the normal Vercel (or wherever) pipeline — not
through `supabase functions deploy`. The ratchet commits land on `main`;
deploy happens via whatever CI/CD setup the repo uses.

## History of closed rounds

Round 1–3 targeted Slack notification quality (`slack_contract_pass`).
See git history for the ratchet trajectory:

- **Round 1** (0.9657 → 1.0000): title trim, case-insensitive dedupe,
  site canonicalization, HTML-escape angle brackets.
- **Round 2** (0.7714 → 1.0000): Slack `<URL|label>` link syntax, per-event
  CTA labels. Surfaced the deployment-verification false-victory bug.
- **Round 3** (0.9908 → 1.0000): site derivation from linked blog.
- **Direct fixes** (post-Round-3): drop redundant "Open link:" prefix,
  new bracket-tag header layout, bold titles, em-dash action lines,
  self-assignment collapse, `[URGENT]` prefix for overdue events,
  blockquote comment bodies.

Round 4 (this document) is a fresh KIND of loop — optimization, not
correctness. The Slack contract harness in `eval/slack/**` and
`scripts/slack-contract-lint.mjs` stays preserved in the repo for
regression runs but is not part of Round 4's ratchet.
