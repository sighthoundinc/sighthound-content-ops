# UX Upgrade Plan — Rollout Notes
Tracks implementation state for the 20-initiative UI/UX upgrade sequenced in four waves. This document is the map from "shipped primitive" to "fully adopted behavior" across the app. Keep it current as consumers migrate.
## Definitions
- **Shipped primitive**: exists under `src/lib`, `src/components`, or `src/hooks`. Typechecks, has tests where applicable, and can be imported.
- **Adopted**: a real user-facing surface imports the primitive, so an end user experiences the change. Anything not explicitly listed as adopted should be treated as library-only.
## Adoption Matrix (source of truth)
### Adopted end-to-end
| Primitive | Adoption site | User-visible effect |
| --- | --- | --- |
| `OnboardingTour` | `AppShell` (root mount) | First-run walkthrough appears automatically; dismisses once per user via `localStorage['onboarding:completed-v1']`. |
| `BasedOnPanel` | `AIMessage` | Every Ask AI answer with curated links shows a collapsible "Based on" panel exposing link list + response source / model. |
| `useDensityPreference` + `data-density` | `AppShell` root attribute, `DataTable` default via `readDensitySync()`, Settings toggle | User selects Compact / Comfortable; tables render at matching row height globally. |
| `copyText()` | `LinkQuickActions` | Every Google Doc / Live URL / Canva link copy surfaces a semantic toast like "Copied Google Doc URL". |
| `EmptyState` (via `DataPageEmptyState`) | Dashboard, My Tasks, Blogs, Social Posts, Ideas list empty states | One consistent empty-state look; backed by `UI_VOCAB.emptyStates` where applicable. |
| Sidebar auto-collapse | `useSidebarState` | Below 1400px auto-collapses the first time; explicit user toggle wins afterwards. |
| `NextActionCell` | `/tasks` Next Action column | Verb-first cell ("Submit Draft", "Publish Blog", "Waiting on Jane") replaces raw status pill. |
| `parseRecordDeepLink()` | `/social-posts` list | `?record=blog:<id>` or `?record=social:<id>` routes to the matching detail page. |
| `perf-marks` (`markStart` / `markEnd`) | `/dashboard` and `/tasks` | `dashboard:tti` / `tasks:tti` measured; dev console warns on budget breach. |
| Design tokens (spacing, radius, elevation, motion) | `globals.css` `:root` custom properties + `src/lib/motion.ts` | Available globally. Reduced-motion media query collapses duration tokens to `0ms`. |
| `UI_VOCAB` additions (`feedback`, `errors`, `nextActions`, `emptyStates`) | `Inbox`, `EmptyState`-backed list pages | Shared source of truth for empty-state / error / feedback strings. |
| `/inbox` route | New surface | Users can reach `/inbox` directly for Required / Waiting / Activity triage. |
| `/api/search` endpoint | New surface | Permission-gated title search across blogs, social posts, ideas. |
| Skeleton pattern | Global `.skeleton` CSS class already used in dashboard, tasks, blogs, social-posts, settings, ideas | Existing adoption validated; `<Skeleton>` React wrapper available for new code. |
| `AGENTS.md` UX Primitives Authority rules | Repo-wide contract | New code is contractually required to reuse these primitives. |
### Library-ready — adoption intentionally deferred
These are substantive follow-up PRs. The primitive is callable today; the UI swap is listed here so nothing is claimed that isn't actually deployed.
| Primitive | Why deferred | Follow-up scope |
| --- | --- | --- |
| `NextActionPill` on detail pages | `/blogs/[id]` and `/social-posts/[id]` already render a richer next-action strip (owner, handoff, preflight). Swapping loses UX unless we consolidate. | Design consolidation PR. |
| `runOptimistic()` in transitions / comments | Each mutation site needs per-site review to preserve server-authoritative semantics. | Per-site PRs, one mutation path at a time. |
| `computeSocialPostPreflight` / `computeBlogPreflight` on detail pages | Detail pages have elaborate inline preflight UX; replacement needs careful field-level migration. | Detail-page refactor PR. |
| `SelectionCart` + `useBulkSelection` in bulk flows | `/social-posts` bulk UI is deeply customized. | Dedicated bulk-UX PR. |
| Saved views save/load/pin UI | Library is live; filter-bar UI layer is a distinct feature. | Dedicated saved-views PR. |
| Motion tokens codemod | Replacing ad-hoc `duration-[NNNms]` across the repo is a broad cosmetic change. | Follow-up codemod. |
| Lighthouse CI workflow | Budgets documented; CI job is infrastructure work. | `.github/workflows/lhci.yml` PR. |
| Toast copy routing through `UI_VOCAB.errors` / `UI_VOCAB.feedback` | Every toast call-site is a per-site copy migration. | Incremental PRs. |
| `BasedOnPanel.facts` population | API doesn't expose `facts` yet — panel renders links + source today. | API change + UI fill-in. |
| Inbox archive / snooze / unread | Requires `notification_states` table. | Migration PR. |
## Concepts to preserve during follow-ups
- Server remains authoritative for every mutation; primitives are UI mirrors.
- No enum keys, DB values, API contracts change without an `AGENTS.md` update.
- Labels go through `src/lib/ui-vocab.ts` and `src/lib/status.ts`.
- Shortcut discoverability stays in the shortcuts modal; tips use `emitTipOnce`.
- `prefers-reduced-motion` collapses every token-driven transition to `0ms`.
## Shipped Primitives (Wave 1 foundations)
### Libraries
- `src/lib/motion.ts` — motion tokens + reduced-motion helpers.
- `src/lib/optimistic.ts` — `runOptimistic()` + `recoverableMessage()`.
- `src/lib/preflight.ts` — shared preflight computation for blogs & social.
- `src/lib/clipboard.ts` — `copyText()` with semantic subjects + `formatRowSummary()`.
- `src/lib/next-action.ts` — `socialNextAction()` + `blogNextAction()` + `BLOG_NEXT_ACTION_LABELS`.
- `src/lib/saved-views.ts` — localStorage-backed saved views API (DB migration pending).
- `src/lib/record-deep-link.ts` — `?record=<type>:<id>` parser/builder.
- `src/lib/shortcut-hints.ts` — one-time tip emission.
- `src/lib/perf-marks.ts` — TTI / filter / drawer marks.
### Components
- `src/components/skeleton.tsx` — `Skeleton`, `TableSkeleton`, `DetailSkeleton`.
- `src/components/empty-state.tsx` — canonical empty-state primitive.
- `src/components/next-action/` — `NextActionCell`, `NextActionPill`, `NextActionRing`.
- `src/components/bulk/selection-cart.tsx` — persistent bulk selection bar.
- `src/components/onboarding-tour.tsx` — first-run walkthrough scaffold.
### Hooks
- `src/hooks/useBulkSelection.ts` — mixed-content aware selection state.
- `src/hooks/useDensityPreference.ts` — global density preference (localStorage for now).
### Surfaces
- `src/app/inbox/page.tsx` — Unified Inbox scaffold (Required, Waiting, Activity tabs).
- `src/app/api/search/route.ts` — global cross-entity search endpoint.
### Vocabulary
- `src/lib/ui-vocab.ts` extended with `feedback`, `errors`, `nextActions`, and `emptyStates` sections.
### Global
- `src/app/globals.css` extended with spacing, radius, elevation, and motion tokens.
## Contracts Preserved
- No enum keys, DB values, or API contracts were changed.
- Workflow authority remains with the server. All UI guards mirror server rules.
- Label changes route through `src/lib/ui-vocab.ts` and `src/lib/status.ts`; existing contract tests still pass.
- Shortcut discoverability stays in the shortcuts modal.
- Reduced-motion respected in CSS tokens and component transitions.
## Migration Notes
- `profiles.ui_density` DB column is not yet added. `useDensityPreference` currently writes to localStorage; when the column lands, update the hook to PATCH `/api/users/profile` without changing the exported API.
- `saved_views` table is not yet added. `src/lib/saved-views.ts` reads/writes localStorage; when the table lands, swap internals for API calls matching the same function signatures.
- `notification_states` table for inbox archive/snooze is future work. Inbox v1 is read-only over existing snapshot + activity feed APIs.
- Onboarding tour stores completion in localStorage; migrate to `profiles.onboarded_at` when available.
## Validation
- `npm run test` (unit): ui-vocab, status, social-post-workflow, and task-action-state contract tests continue to pass.
- Manual smoke: dashboard, tasks, inbox, social-post editor, blog detail with reduced-motion enabled + disabled.
- No-forbidden-strings grep: confirms no raw enum keys, role nouns, or shortcut text snuck into new code.
