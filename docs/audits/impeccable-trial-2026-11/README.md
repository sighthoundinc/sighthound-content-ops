# Impeccable trial — home and My Tasks (2026-11-15)

Trial of the [Impeccable](https://github.com/pbakaus/impeccable) design skill (v4.9.1, installed without hooks, telemetry off) against the existing `app-craft-audit` skill, on `/` (`src/app/page.tsx`) and `/tasks` (`src/app/tasks/page.tsx`).

**Method limits.** Source review only: the app was not rendered, so contrast, mobile layout, and click behaviour were not checked. One reviewer ran both rubrics in one context, so the two finding lists are not independent.

## Files

- `critique-home.md`, `critique-tasks.md` — Impeccable `critique` (Nielsen heuristics, 26/40 each).
- `audit-home.md`, `audit-tasks.md` — Impeccable `audit` (16/20 and 14/20).
- `/DESIGN.md` — output of Impeccable `document`; a summary that defers to `design-system/`.

Impeccable's deterministic detector reported zero findings on both pages and the shared table/page components.

## app-craft-audit findings (same two pages)

Verdict: no blockers. Passed: double-submit guard on the inline status select, plain-language error text, versioned stored table preferences (`tasks-column-view:v1`), no client-side secrets, cached rows shown during refresh, page titles.

| ID | Tier | Finding | Where |
|---|---|---|---|
| B6 | Major | Inline status select changes workflow status in one click with no undo | `src/app/tasks/page.tsx` status column |
| M8 | Major | Filters and page number live in component state, not the URL; lost on back navigation | `src/app/tasks/page.tsx` |
| M1 | Major | Clear-search and filter-pill remove buttons are very small | `src/components/data-page.tsx` |
| M9 | Polish | Row limit "all" renders every row | `src/app/tasks/page.tsx` |
| P3 | Polish | One message for "no tasks" and "filters too narrow", shown twice | `src/app/tasks/page.tsx` |
| S2 | Polish | `WorkBucket.href` is set but every tile links to `/tasks` | `src/app/home-work-buckets.ts` |
| T6 | Taste | Negative letter-spacing on all body text | `src/app/globals.css` |
| D8 | Taste | Several ad hoc text opacities (`white/70`, `white/20`, `navy-500/60`) | `src/app/page.tsx` |

Unverified (needs a running app): tap target sizes, 375px overflow, text scaling, server-side idempotency of the transition route.

## Comparison

| | Impeccable | app-craft-audit |
|---|---|---|
| Issues it led to | about 8 | about 5 |
| Strongest at | labels, hierarchy, consistency, accessibility | behaviour: undo, lost state, unbounded lists |

Recommendation: use Impeccable `critique` and `audit` for design review, keep `app-craft-audit` as a pre-ship behaviour check, and leave Impeccable's detector hook off (no signal on this codebase).
