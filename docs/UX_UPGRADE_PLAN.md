# UX Upgrade Plan — Rollout Notes
Tracks implementation state for the 20-initiative UI/UX upgrade sequenced in four waves. This document is the map from "shipped primitive" to "fully adopted behavior" across the app. Keep it current as consumers migrate.
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
## Adoption Checklist by Wave
### Wave 1 (foundations)
- [x] Motion tokens library and CSS variables.
- [x] Optimistic helper + skeleton primitives.
- [x] Preflight library.
- [x] Micro-copy additions to `ui-vocab.ts`.
- [x] Design token CSS variables.
- [ ] Adoption: replace centered spinners with skeletons on dashboard, tasks, blogs list, social-posts list, detail drawers.
- [ ] Adoption: route save/error/permission toasts through `UI_VOCAB.feedback` / `UI_VOCAB.errors`.
### Wave 2 (list/detail ergonomics)
- [x] Next-Action primitives.
- [x] Global search API route.
- [x] Record deep-link helpers.
- [x] Shortcut tip helper.
- [ ] Adoption: swap status cells for `NextActionCell` on dashboard/tasks/blogs/social-posts.
- [ ] Adoption: wire `parseRecordDeepLink()` into list pages to open detail drawer on URL.
- [ ] Adoption: add `⌘K` badge to app shell header + bind palette to new search API.
- [ ] Adoption: extend command palette with verbs + recent items.
### Wave 3 (scale & collaboration)
- [x] `SelectionCart` primitive.
- [x] `useBulkSelection` hook.
- [x] Saved views local storage API.
- [x] Inbox scaffold page.
- [ ] Adoption: integrate `SelectionCart` into dashboard/tasks/blogs/social-posts.
- [ ] Adoption: Saved views UI (save/load/pin) wired to filter-bar state.
- [ ] Adoption: Inbox archive/snooze after `notification_states` migration.
### Wave 4 (premium polish & structure)
- [x] Empty state primitive + vocab.
- [x] Onboarding tour scaffold.
- [x] Performance budget doc.
- [x] Design tokens doc.
- [ ] Adoption: replace ad-hoc "No data" messages with `<EmptyState />`.
- [ ] Adoption: mount onboarding tour in root layout for new users.
- [ ] Adoption: instrument dashboard/tasks with `markStart`/`markEnd`.
- [ ] Adoption: Lighthouse CI workflow under `.github/workflows/lhci.yml`.
- [ ] Adoption: Explainable AI "Based on" panel in `src/components/ai`.
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
