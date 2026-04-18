# / (Home) Bundle-Size AutoResearch
## Goal
**Minimise `ROUTE_PAGE_SIZE_KB` on `/`** as reported by `next build`.
Baseline: **`ROUTE_PAGE_SIZE_KB = 3.840`** (First Load JS = 173.0 kB).
Secondary observation: `ROUTE_FIRST_LOAD_KB`.
Why it matters: `/` is the authenticated landing page — the first thing a signed-in user sees. It renders a dashboard summary + a tasks snapshot, so perceived TTI on this route dominates the daily in-app experience.
## Constraints on this session
- `/` is an authenticated route. It legitimately needs `AuthProvider`, `AlertsProvider`, and the full app shell from `src/app/layout.tsx`. Do not split layouts or remove providers — unlike `/login`, those are not leverage here.
- Scope is intentionally narrow: only `src/app/page.tsx` may be edited. If an experiment needs a companion file (e.g. a server component sibling), the ratchet `EDITABLE_FILES` must be widened explicitly for that iteration.
- No new packages, no config changes (`next.config.*`, `tsconfig.json`, `package.json` off-limits).
- Preserve behaviour: the dashboard summary fetch, the tasks snapshot fetch, the auth redirect, and the task-logic validation must all still run and render the same UI.
## What you CAN modify
- `src/app/page.tsx` (594 lines; `HomePage` component)
Fair-game patterns:
- **Convert to Server Component**: push `session`/`profile` resolution and the two `fetch`es (dashboard summary, tasks snapshot) to the server; extract only the interactive parts (filters, redirects, hydration) into a small client sub-component. Since `page.tsx` is currently `"use client"`, this is a structural change but stays in one file if the client sub-component sits alongside as an inline `"use client"`-wrapped helper imported from a colocated file.
- **Dynamic-import below-the-fold panels**: wrap lists/sections that render only after the fetches resolve with `next/dynamic(() => import(...), { ssr: false })`.
- **Replace `AppIcon` calls with per-icon exports** (`CheckIcon`, etc.) — requires adding the per-icon exports to `src/lib/icons.tsx` first; note that per the Exp #2 finding on `/login`, this only yields savings if the module graph actually lets webpack tree-shake the barrel.
- **Inline static constants**: the `LOADING_MESSAGES` array and other compile-time-constant data should live outside the component function body.
- **Prune unused imports / dead branches** spotted while editing.
## What you CANNOT modify
- Any file outside `src/app/page.tsx` unless `EDITABLE_FILES` is widened for that experiment
- `src/providers/*`, `src/lib/supabase/*`, `src/lib/icons.tsx`, `src/lib/task-logic.ts`, `src/lib/api-response.ts`
- `src/app/layout.tsx`, route-group layouts
- Semantic behaviour: auth redirect target, the two endpoint paths (`/api/dashboard/summary`, `/api/dashboard/tasks-snapshot`), the loading states
## Experiment Priorities
Ranked by expected `ROUTE_PAGE_SIZE_KB` impact:
1. **Hoist static constants out of the component body** — `LOADING_MESSAGES` and any other `const [...] = [...]` / `const {...} = {...}` that doesn't depend on props/state. Low risk, may help by a few hundred bytes via better minification.
2. **Replace `AppIcon` usages in `/` with direct lucide imports** — if `page.tsx` imports `<AppIcon name="..." />` multiple times, each call lists a string key rather than referencing the icon component directly. Inlining `Check`/etc. lets webpack shake the AppIcon wrapper for this route's module graph (the barrel still lives elsewhere, but the page module's code gets smaller).
3. **Convert render of large JSX sections to split components in the same file** — React minifies better on smaller function bodies; extracting sub-components inside `page.tsx` can compress well.
4. **Dynamic-import post-fetch sections** — the tasks snapshot table and the dashboard summary cards only render after data arrives. Wrapping with `next/dynamic` moves their code to a separate chunk, reducing the initial `/` page chunk.
5. **Collapse repeated long Tailwind class strings** into module-local constants — only if the minified output demonstrably shrinks.
6. **Combine 1 + 2 + 3** if individual attempts each fall below `MIN_DELTA`.
7. **Refactor `/` to a Server Component + small client interactive shim** — biggest-impact, highest-risk; attempt only after smaller experiments plateau and the team has reviewed the approach.
## Simplicity Criterion
- Improvement < `MIN_DELTA` (0.1 kB) → discard even if technically positive
- Improvement requires unreadable refactors → probably not worth keeping
- Improvement comes from deleting dead code → always keep
## Crash Handling
Same as `/login` session. `measure-route-bundle.sh` returns exit 2 on any build failure; `autoresearch.sh` classifies that as CRASH and restores tracked files. Remember the restore-atomic bug: if an experiment adds a new file and fails, `git restore` will fail atomically — manual cleanup required.
## End-of-Session Documentation
When the session closes:
1. Update the "Baseline" line at the top with the new best `ROUTE_PAGE_SIZE_KB`.
2. Move tried experiments to a "Tried this session" section with `kept`/`failed` status.
3. Refresh the priority list for the next session.
