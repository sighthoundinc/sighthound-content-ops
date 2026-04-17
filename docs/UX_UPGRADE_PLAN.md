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
- [x] Adoption: skeleton pattern already used globally via `.skeleton` CSS class (dashboard, tasks, blogs, social-posts, settings, ideas); `<Skeleton>` React primitive available for new code.
- [ ] Adoption: route save/error/permission toasts through `UI_VOCAB.feedback` / `UI_VOCAB.errors`. Vocab is consumable; large-scale toast-copy migration pending.
### Wave 2 (list/detail ergonomics)
- [x] Next-Action primitives.
- [x] Global search API route.
- [x] Record deep-link helpers.
- [x] Shortcut tip helper.
- [x] Adoption: `<NextActionCell>` wired into `/tasks` Next Action column.
- [x] Adoption: `parseRecordDeepLink()` wired into `/social-posts` list (routes `?record=<type>:<id>` to the matching detail page).
- [ ] Adoption: `<NextActionCell>` in dashboard, blogs list, social-posts list. Detail pages (`/blogs/[id]`, `/social-posts/[id]`) already render a richer next-action strip with owner/handoff/preflight context, semantically equivalent to `<NextActionPill>`; no swap planned until we consolidate behavior.
- [ ] Adoption: top-chrome `⌘K` badge + command palette binding to `/api/search`. Endpoint is live; palette integration is a separate feature PR.
### Wave 3 (scale & collaboration)
- [x] `SelectionCart` primitive.
- [x] `useBulkSelection` hook.
- [x] Saved views local storage API.
- [x] Inbox scaffold page.
- [ ] Adoption: `SelectionCart` into existing bulk flows. Current social-posts/dashboard bulk UI is a deeply customized pattern; migration is a dedicated PR.
- [ ] Adoption: Saved views UI (save/load/pin) on dashboard filter bar. Library is available; UI layer is a dedicated PR.
- [ ] Adoption: Inbox archive/snooze after `notification_states` migration.
### Wave 4 (premium polish & structure)
- [x] Empty state primitive + vocab.
- [x] Onboarding tour scaffold.
- [x] Performance budget doc.
- [x] Design tokens doc.
- [x] Adoption: `DataPageEmptyState` now routes through `<EmptyState>` when used without a custom action, covering dashboard, tasks, blogs, social-posts, ideas list empty states.
- [x] Adoption: `OnboardingTour` mounted inside `AppShell` so it appears on first run for every user.
- [x] Adoption: `AppShell` root carries `data-density` attribute driven by `useDensityPreference`; Settings exposes Compact/Comfortable toggle; `DataTable` reads `readDensitySync()` by default.
- [x] Adoption: `markStart`/`markEnd` wired on `/tasks` and `/dashboard` for `tasks:tti` / `dashboard:tti`.
- [x] Adoption: `<BasedOnPanel>` rendered inside `AIMessage` when response links exist.
- [x] Adoption: `copyText()` used by `LinkQuickActions`, giving every Google Doc / Live URL copy a semantic toast.
- [ ] Adoption: Lighthouse CI workflow under `.github/workflows/lhci.yml`. Budget doc is authoritative; CI job is pending.
- [ ] Adoption: `runOptimistic()` in transition/comment mutation flows. Helper is available; each mutation path needs per-site review before wrapping.
- [ ] Adoption: `computeSocialPostPreflight` / `computeBlogPreflight` replacing duplicated required-field arrays on detail pages. Pending per-site review to preserve existing preflight UX.
- [ ] Adoption: motion token migration across ad-hoc `duration-[NNNms]` values. Tokens are defined; codemod is pending.
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
