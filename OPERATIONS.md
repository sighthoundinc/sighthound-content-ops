# OPERATIONS.md

## Purpose
This runbook describes how to operate Content Relay safely in day-to-day environments while preserving workflow continuity for blogs and social posts.

## 1) Operational model
- Core workflow authority is database + API transition contracts.
- UI is guidance and feedback; transition validity is enforced server-side.
- All workflow-critical actions should flow through canonical API routes.
- Workspace home standup cards (`/api/dashboard/summary`) and `My Tasks Snapshot` (`/api/dashboard/tasks-snapshot`) must stay aligned by using the same assignment/action-state classifier, including review assignments from `task_assignments`.
- `My Tasks` queue payload (`/api/tasks/queue`) must read from the same assignment/blog/social input helper as summary/snapshot so all three surfaces stay synchronized.
- When multiple associations exist for the same blog, classifier precedence must favor `action_required` over `waiting_on_others`.
- Social ownership classification in summary/snapshot must evaluate `assigned_to_user_id` first and fall back to legacy owner columns when ownership columns are unavailable.
- Dashboard overview social metrics must apply the same ownership-column fallback pattern so social counts do not drop to zero during schema-cache drift.
- Dashboard overview cards are fetched from `GET /api/dashboard/overview-metrics`; keep this endpoint authoritative for overview totals and avoid re-implementing these aggregates on the client.
- Dashboard summary/snapshot/overview endpoints use per-user short-lived cache entries (30s TTL, private cache-control) to reduce repeated DB hits during rapid navigation:
  - `GET /api/dashboard/summary`
  - `GET /api/dashboard/tasks-snapshot`
  - `GET /api/dashboard/overview-metrics`
- Keep overview aggregation server-side and single-pass; do not reintroduce repeated metric-bucket `.filter()` chains in client dashboard code.
- Dashboard and Social Posts list search filtering should remain debounced at the client (current standard: `180ms`) to avoid expensive recomputation on every keypress.

## 2) Environments and release gate
### Recommended flow
1. Validate changes in local development.
2. Promote to staging and confirm stage transitions + required gates.
3. Run full verification before release.

### Verification command
```bash
npm run check:full
```

## 3) Core workflow contracts to verify after each release
### Focused workflow regression harness
- Verification checkpoint (2026-09-08): 398 workflow tests and `git diff --check` passed. Local RPC-access, execution-integrity, atomic-handoff SQL suites and both publication/link race orderings passed. Full default Jest was interrupted without a result; full typecheck/build and authenticated browser/HTTP checks are not verified. These results are not release approval.
- Release prerequisite: if pushing `main` triggers automatic application deployment, hold that deployment until the three social migrations are applied and verified in the target environment. No remote migrations were applied during this work.
- Residual risks: SQL regex and TypeScript URL parsing differ on normalization edge cases; orphaned assignments and historically invalid published links may require repair. Multi-record lock contention and durable notification retries are not covered by the local regression suite.
- **Local database hardening, not remote deployment:** migrations `20260908134500_restrict_social_workflow_rpc_access.sql` and `20260908135000_guard_social_execution_integrity.sql` were applied only to an approved disposable Supabase instance. The first closes a locally reproduced anonymous RPC transition bypass; the second closes combined execution edits and wrong-platform publication proof. Remote exposure has not been inspected.
- Real PostgreSQL checks: run `tests/workflow/database-rpc-access.sql` and `tests/workflow/database-execution-integrity.sql` through `psql -v ON_ERROR_STOP=1` only on an approved disposable database. Fixtures roll back. These tests cover ordinary database-role denial, service-role reopen, unchanged state on rejection, valid publication, and final-valid-link deletion/invalidation guards; they do not test HTTP sessions.
- Two-session race check: `WF_DISPOSABLE_DB_CONTAINER=<approved-container> python3 tests/workflow/database-concurrency.py`. The runner accepts only the `supabase_db_content-relay-workflow.*` naming pattern, uses random fixture IDs, and deletes only its generated records. Both publication-first and deletion-first orderings must preserve the invariant. Do not point it at a shared or production database.
- Clean migration replay is currently blocked by historical enum ordering. The local test bootstrap applies the 14 enum additions from `20260315143000_status_enum_replay_compat.sql` early; this workaround is not clean-replay proof and must not be applied to remote databases without separate review.
- Deployment review: inspect affected existing published rows for invalid links, apply additive migrations on staging, run the database regressions, then verify the API reopen path. RPC callers must go through guarded server routes. Do not roll back by restoring public RPC grants; prefer a forward correction. Parent locking can surface contention/deadlocks, which require safe retry handling; only the two tested single-record race orderings are proven so far.
- `tests/workflow/task-surfaces.test.ts` exercises actual summary/snapshot/queue routes with mocked shared inputs and disabled caches. It verifies admin responsibility follows the worker/reviewer stage owner; it does not prove query visibility, cache invalidation, or browser refresh behavior.
- Transition requests with nonempty `liveLinks` now fail explicitly; callers must save links separately. Required stored values reuse request field validation. Date-only formatting also rejects impossible timestamp clock/offset components.
- Apply `20260908140000_atomic_social_handoffs.sql` after the hardening migrations and **before deploying the transition API**. The API calls service-only `apply_social_post_transition` with the exact fetched version, authenticated actor, normalized reason, and validated brief fields. Status, ownership, and history commit together; event emission skips duplicate history.
- The atomic SQL regression passed locally, covering actor checks, stale versions, required fields, owner handoffs, and rollback history. HTTP-session and remote deployment verification remain open. Prefer forward fixes; do not drop the RPC while this API is deployed or restore the old direct-update handler. Conflicts/deadlocks return 409; refresh before retry. Notification failures are logged without failing a committed transition; durable delivery retry is not implemented.
- Execution locks now apply to admin and worker transition payloads across all nine brief fields, including edit-plus-rollback requests. Full editor and drawer guards mirror the API; use the existing admin reopen path for changes. Handler regressions cover rejection before mutation and status-only rollback success. Browser behavior, direct database/RPC bypasses, and stale-client races still require separate proof.
- Handoff targets now reject missing owners; publishing rejects invalid stored platform/URL pairs. Repair assignments or saved links through the normal editing workflow, then retry. Existing published records are not rewritten by these API changes.
- Date-only formatting rejects impossible calendar dates rather than silently rolling them forward. Correct malformed source values through normal edits; valid dates retain their input day in every timezone.
- Local SQL tests establish only the exercised database guards; full direct-write coverage, HTTP authentication, and browser refresh consistency remain separate proof obligations.
- Run `npm run test:workflow` for executable domain assertions and real transition/reopen handlers with mocked database transport. `jest.workflow.config.js` narrows discovery to `tests/workflow/`; it also executes the existing status label/color contract through an import.
- For date-only checks, run the same suite in separate processes with `TZ=America/Los_Angeles`, `TZ=UTC`, and `TZ=Pacific/Auckland`. Changing the application user's timezone is a separate UI check.
- Handler tests assert actual API codes, rejected-write behavior, and RPC status/version arguments. They do NOT simulate RLS, triggers, persisted ownership, or concurrent transactions.
- `npm run test:workflow:ui` requires `WORKFLOW_UI_BASE_URL`, an existing `WORKFLOW_UI_STORAGE_STATE` file outside version control, `WORKFLOW_UI_POST_ID`, and `WORKFLOW_UI_EXPECTED_DATE` (`YYYY-MM-DD`). Use a disposable execution-stage social post and its non-admin worker session. For remote staging, explicitly set `WORKFLOW_UI_ALLOWED_ORIGIN` to that HTTPS origin. Never use production.
- UI probes do not submit transitions and block non-read HTTP requests. Trace/video/screenshots are disabled to avoid capturing sessions or private content. An expired session may fail because token refresh is blocked; supply a fresh test session rather than relaxing mutation safety.
- Missing environment prerequisites or test-runner initialization failures mean BLOCKED, not passed. No live workflow or RLS verification is implied by an offline green suite.
- Diagnose a demonstrated failure with a named red command, minimized fixture, ranked falsifiable hypotheses, then an authority-layer fix and regression. Admin override semantics must be explicitly resolved before changing authorization.
- Validation uses three-minute batches; ask before extending a stalled batch. Live mutations, fixture provisioning, migrations, and external notification delivery require separate approval.
### Diagnostic replay, live, and differential runner
- Run offline runner safety tests with `npm run test:workflow:tooling`. These test the diagnostic tooling, not application authorization.
- CLI: `node scripts/debug/workflow-harness.mjs replay|live|differential <fixture.json>`. The checked-in example is `tests/debug/scenarios.json`; choose exactly one mode.
- `replay` compares synthetic expected/observed results only. It does not execute route handlers; use `test:workflow` for handler execution. The sample contains three denial scenarios, not a complete workflow cycle.
- Fixtures must be synthetic, credential-free JSON with logical actor/record names. Do not save session cookies, authorization headers, or real private content. Credentials must come from environment variables populated securely, never command-line literals.
- Before an approved live run, configure `WF_ALLOW_MUTATIONS=yes` and side-specific `WF_A_ORIGIN`, `WF_A_DISPOSABLE=yes`, `WF_A_NOTIFICATIONS_ISOLATED=yes`, `WF_A_ACTOR_<NAME>` (ordinary-user JWT), and `WF_A_RECORD_<NAME>` (disposable record UUID). Names correspond to uppercase logical names in the fixture.
- Expected persisted-state checks additionally require `WF_A_SUPABASE_ORIGIN` and `WF_A_PUBLIC_KEY` (anon/publishable). Exact remote HTTPS origins, including Supabase, must appear in comma-separated `WF_ALLOWED_STAGING_ORIGINS`. Never allowlist production.
- `differential` requires the same settings with `WF_B_` for the second independently prepared target. Record IDs must not overlap across sides, even under different hostnames. Each side must satisfy the expected result; identical incorrect output fails.
- Disposal and notification isolation are operator attestations, not automatic detection. The runner does not provision/reset records, disable notifications, verify deployed SHAs, or prove RLS. Prepare equivalent isolated fixtures and verify deployment identities separately.
- Requests refuse redirects, have an eight-second timeout, and cap fixture/response data at 64 KiB. There are no retries. If a sent mutation times out or its state read fails, the write outcome may be unknown: inspect persisted state before retrying or cleaning up.
- Exit codes: `0` passed comparisons, `1` assertion/transport failure, `2` invalid fixture, `3` blocked prerequisites. Output contains assertion results rather than raw response bodies or credentials. Direct RLS probes, real concurrency, and cross-surface action-state comparisons remain separate coverage.
### Social posts
- Status flow remains:
  - `draft`
  - `in_review`
  - `changes_requested`
  - `creative_approved`
  - `ready_to_publish`
  - `awaiting_live_link`
  - `published`
- List view `Published Date` column reads `scheduled_date` (the agreed-upon publish day). `updated_at` is NOT used for this column because it drifts on later edits (for example saving a live link after publication). Schema follow-up: when `social_posts.published_at` lands, switch the column to that canonical timestamp.
- Draft create gate remains: Product, Type, Assigned to, Reviewer.
- Optional draft-create fields remain non-blocking: Title, Platforms, Scheduled date, Associated blog.
- Empty create title should auto-normalize to `Untitled social post` instead of failing create.
- `published` requires at least one valid live link.
- Execution-stage rollback to `changes_requested` requires a reason.
- Social post editor section order is:
  - `Setup` → `Assignment` → `Associated Blog` → `Write Caption` → `Review & Publish` → `Comments` → `Current Snapshot` → `Checklist` → `Assignment & Changes`
- Social post history sections use the label `Assignment & Changes` (never `Activity`).
- Live-link controls are part of `Review & Publish` on the dedicated social editor.
- Detail-page responsive rail contract:
  - On `lg`+ screens, detail pages render a right rail (`~280px`, `~320px` at `2xl`) for high-priority workflow controls.
  - On smaller screens, those controls stack inline in the main column to avoid overflow and cramped layouts.
  - Sticky behavior is applied to a single rail wrapper on `lg`+ to prevent stacked-sticky overlap.
- Detail pages include a top `Next Action` strip + `Jump to` section navigator for faster execution.
- Detail pages show explicit save state (`Unsaved changes` vs `All changes saved`) tied to form state.
- Blog detail uses preflight readiness + jump-to-field guidance and keyboard parity shortcuts:
  - `Alt+Shift+J` (next missing required field)
  - `Alt+Shift+Enter` (primary action)
  - These shortcuts are surfaced exclusively in the shared shortcuts modal; detail pages must not render inline `Shortcut: …` / `Primary action: …` text.

### Blogs
- Writing flow handoff to publishing remains enforced.
- Publishing completion cannot bypass prerequisite writing completion and review checkpoint.
- On first transition to publisher `completed`, `actual_published_at` is auto-captured when unset.
- Canonical writing labels: `Not Started`, `Writing in Progress`, `Awaiting Writing Review`, `Needs Revision`, `Writing Approved`.
- Canonical publishing labels: `Not Started`, `Publishing in Progress`, `Awaiting Publishing Review`, `Approved for Publishing`, `Published`.
- Role nouns (`Writer`, `Publisher`, `Reviewer`) appear only where the label points to a specific user acting in that role.
- Blog details preserve footer ordering: `Comments` → `Links` → `Assignment & Changes`.

## 4) API contract integrity
- Use canonical mutation routes for workflow transitions.
- Keep request validation at route boundaries.
- Keep response shape stable (success/error envelope) for predictable client handling.
- Avoid direct state mutation bypasses from client to DB.
- Legacy endpoint policy: `DELETE /api/ideas/[id]/delete` is retired and returns `410 Gone`; use `DELETE /api/ideas/[id]`.
- Middleware auth gate validates Supabase session identity on protected routes (not just cookie presence) before allowing page access.

### Ask AI guidance endpoint (`POST /api/ai/assistant`)
- Request contract includes optional `prompt` (max 500 chars) and optional `userTimezone` (IANA string).
- Endpoint remains read-only and advisory: no workflow transitions, no record mutations.
- Response contract includes `questionIntent`, `answer`, `responseSource`, optional `aiModel`, plus blocker/next-step/quality payloads.
- Deterministic blocker detection and stage-gate logic remain authoritative even when Gemini is used for prompt interpretation.
- Runtime behavior:
  - Default model is `gemini-2.5-flash` (`GEMINI_MODEL` overrides).
  - If `GEMINI_API_KEY` is present, Ask AI attempts Gemini interpretation first with one retry on 429 / 5xx / network / timeout (≈400ms backoff).
  - If Gemini fails/unavailable, endpoint degrades gracefully to deterministic prompt routing.
  - `ASK_AI_REQUIRE_GEMINI=true` (dev/staging only) disables the fallback and returns `503`; message distinguishes “not configured” from “temporarily unavailable”. Do not enable in production.
- Grounded RAG facts:
  - Every request also calls `fetchFacts(entityType, entityId)` under the caller’s RLS.
  - Coverage: blogs / social posts / ideas. Profile joins resolve assignee UUIDs to display names; RLS-clipped profiles surface as `*Unavailable` booleans so prose can say “name isn’t available to you” instead of inventing one.
  - Fact fetch failures are logged (`[AI Assistant Facts] …`) and never break the main guidance flow.
- Factual intents (`identity`, `people`, `timeline`) are answered strictly from facts; workflow noise (`blockers`, `nextSteps`, `qualityIssues`, `confidence`) is suppressed in the response.
- Ideas never report workflow blockers; `detectBlockers` short-circuits for `entityType === "idea"`.
- Observability (watch these log prefixes in production):
  - `[AI Assistant Gemini] non-200 response` — Gemini health / quota / model retirement.
  - `[AI Assistant Gemini] unable to parse JSON` or `invalid output schema` — prompt or model drift (raw preview logged).
  - `[AI Assistant Gemini] request threw` — network/timeout (retry path).
  - `[AI Assistant Facts] … fetch failed` — RLS / schema drift.
  - Rising `responseSource: "deterministic"` rate in prod indicates Gemini degradation.

## 5) Import operations
- Import should support selective columns and selective rows.
- Required key columns must be present for successful import.
- Missing optional fields use deterministic fallback behavior where configured.
- Existing rows can be updated by import when identity match rules are met.

## 6) Date/time and scheduling reliability
- Render user-facing date/time from user timezone preferences.
- Use shared date formatting utilities for consistency.
- Keep date-only rendering on date-only formatters to prevent timezone day shift.
- Comments, timelines, and record-level assignment/history timestamps must also render in the user’s selected timezone.
- Calendar timezone selection must use `profiles.timezone` first, with `America/New_York` fallback only.
- Admin Activity History in Settings is the single allowed UTC-rendered exception.
- Calendar view modes QA checks:
  - verify Month/Week/Stream toggle renders and switches between modes without layout jump.
  - verify Stream mode shows SH + RED blog rows per week, with optional `SH SOC` / `RED SOC` rows gated by legend toggles.
  - verify Stream mode sticky weekday header stays pinned as the user scrolls.
  - verify clicking `Load earlier weeks` does not jump the user back to today (scroll position is preserved).
  - verify `Today` button in the nav cluster scrolls the current week into view while in Stream mode.
  - verify drag-to-reschedule is disabled in Stream mode; clicking a title opens the detail drawer.
  - verify `S` keyboard shortcut switches to Stream mode.
- Calendar month overview QA checks:
  - verify overview rows cover previous/current/next-month scheduled items.
  - verify mixed blog/social status pills use normalized labels and consistent color semantics.
  - verify unscheduled cards at zero count are non-expandable and show passive empty-state copy.
  - verify two-row control layout: Row 1 with month label (left), navigation cluster (Prev/Today/Next), Today chip, and Month/Week toggle (right); Row 2 with View, content toggles, and Assigned to.
  - verify `Today` button is visually primary (indigo background) and `Prev/Next` use lighter neutral styling with directional chevron icons.
  - verify `Today · <date>` chip displays near the mode toggle.
  - verify Row 2 control strip stays compact with neutral labels (`View`, content toggles, `Assigned to`).
  - verify removable filter pills and legend filters render below the weekday header row (not in the top control rows) to reduce layout jumps.
  - verify no pill-row placeholder renders when no active filter pills exist.
  - verify top controls use a single outer shell with lighter inner separation (avoid stacked heavy borders).
  - verify `This Week` summary card and day-header item count badges are absent.
  - verify month view applies a subtle current-week background band without overpowering event cards.
  - verify calendar event cards show one metadata line by default and preserve detail in tooltip text.
  - verify unscheduled zero-count states render as quiet single-line muted messages.

## 7) Notification and reminder behavior
- Workflow reminders and notifications should be emitted through centralized event paths.
- Notification preference toggles should be respected at emission time.
- Delivery failures should degrade safely without blocking core workflow transitions.
- Bell activity feed syncing should fan out top activity entries to inbox notifications concurrently (`Promise.allSettled`) so one failed emit does not block others.
- Notification emission should prefer cached user identity (`userIdCache`) and only fetch session identity when cache is empty.

### Slack delivery details
- Edge function: `supabase/functions/slack-notify/index.ts`.
- Canonical server emitter: `emitWorkflowSlackEvent()` in `src/lib/server-slack-emitter.ts`. All workflow/comment Slack events must route through this helper; the legacy client-side `notifySlack` helper has been retired.
- Centralized comment emitters:
  - `POST /api/blogs/[id]/comments`
  - `POST /api/social-posts/[id]/comments`
- Deep-link base URL fallback order:
  1. `NEXT_PUBLIC_APP_URL`
  2. `APP_URL`
  3. `https://sighthound-content-ops.vercel.app`
- `Open link:` generation uses canonical record IDs (`blogId`/`socialPostId`) and must not depend on payload `appUrl`.
- Both bot-token and webhook sends suppress previews while keeping links clickable:
  - `unfurl_links: false`
  - `unfurl_media: false`
- Comment notifications include full multi-line comment text with mention-token neutralization and defensive max-length capping.

## 8) Common failure patterns and quick response
| Symptom | Likely cause | Response |
|---|---|---|
| Transition rejected | Missing required target-stage fields | Complete required fields and retry |
| Social cannot publish | No valid live link saved | Save at least one valid public link, retry |
| Inconsistent queue ownership | Assignment/state mismatch | Refresh queue and re-run transition with current state |
| Import partial failures | Key columns/row validation issues | Fix invalid rows, re-run import on valid selection |

Dashboard filtering operating model:
- Default dashboard filters are `Lens`, `Content Type`, `Status`, `Assigned to`, and `Site`.
- Lens order is fixed for consistent triage behavior and saved-view recall:
  `All Work` → `Needs My Action` → `Awaiting Review` → `Ready to Publish` → `Awaiting Live Link` → `Published Last 7 Days` (`All Work` default).
- Filter option labels include contextual counts in the current filter context.
- `Lens shortcuts` are optional user-saved quick actions for one-click lens reapplication.
- `More filters` reveals advanced controls (delivery + detailed blog/social filters).
- Advanced controls are scope-aware: blog controls only affect blog rows; social controls only affect social rows.
- Social Posts bulk delete operations are processed concurrently per selected row and must always return a single aggregated success/failure/skip summary.

## 9) Database and migration operations
- Treat `supabase/migrations` as append-only.
- Add new timestamped migrations; do not rewrite applied migration history.
- Run migration push when schema-affecting changes are introduced.
- Keep composite query indexes in place for high-frequency queue/summary filters:
  - `social_posts(status, assigned_to_user_id, worker_user_id, reviewer_user_id, created_by)`
  - `blogs(is_archived, overall_status, writer_id, publisher_id, scheduled_publish_date)`
  - `task_assignments(assigned_to_user_id, status, blog_id, task_type)`

## 10) Inbox, global search, and UX primitives (operational notes)
### Inbox (`/inbox`)
- Surface is read-only; aggregates `GET /api/dashboard/tasks-snapshot` and `GET /api/activity-feed`.
- Do not point the Inbox at non-standard feeds; counts must stay aligned with My Tasks and dashboard snapshot.
- Archive/snooze/per-item unread are NOT implemented yet. Any support request implying those features should be rerouted — they are follow-up work gated on a future `notification_states` migration.
- Timezone display uses the user’s `profiles.timezone` (fallback `America/New_York`).

### Global search (`GET /api/search`)
- Authenticated via `authenticateRequest()` and permission-gated per entity (`view_dashboard`, `view_social_posts`, `view_ideas`).
- Admin client is used for the data read; visibility is enforced by the per-entity permission check, not RLS, so permission role defaults must remain accurate.
- Title-only `ilike` matching with wildcards stripped. Per-group limit 10. `Cache-Control: no-store`.
- Budget: keep p50 <250 ms; no UI consumes this endpoint yet, but the contract is live.

### UX primitives rollout
- Primitives shipped under `src/lib`, `src/components`, and `src/hooks` are canonical. Adoption is tracked in `docs/UX_UPGRADE_PLAN.md`.
- Do not describe a primitive as “shipped to users” on a given surface until that surface imports it. Current user-visible effects limited to: `/inbox` page, `/api/search` endpoint, sidebar auto-collapse under 1400px.
- Performance budget targets live in `docs/PERFORMANCE_BUDGET.md` and are enforced at development time via `console.warn` when marks exceed budget.

### Print / detached popup brand tokens
- Detached print popups (`window.open(...)`) do not inherit host CSS custom properties, so brand hex values must be inlined.
- Single source of truth for those hex fallbacks: `src/lib/print-brand-tokens.ts` (`PRINT_BRAND_TOKENS`).
- Any brand token change in `design-system/colors_and_type.css` MUST also update `PRINT_BRAND_TOKENS`. Currently consumed by the blog library PDF export in `src/app/blogs/page.tsx`.

### Modal z-index alignment
- All Modal-tier overlays render at `z-[120]`, consistent with the Tooltip < Drawer < Modal < Toast contract.
- Covered: `ConfirmationModal`, `CommandPalette`, `GlobalQuickCreate`, `NameResolutionModal`, `BulkActionPreviewModal`, and the Quick Create / Shortcuts modals in `app-shell.tsx`.

### Sidebar auto-collapse
- `useSidebarState` (in `src/hooks/useSidebarState.ts`) auto-collapses the sidebar on first paint when the viewport is below 1400px AND the user has not previously saved a preference.
- Once the user toggles manually, the localStorage preference wins regardless of viewport.
- `prefers-reduced-motion` continues to suppress all sidebar transitions.

## Visual quality notes
- Keep workspace surfaces composition-led: one clear primary region, restrained supporting cards, and semantic accents.
- Prefer shared button, icon, tooltip, empty-state, skeleton, and motion primitives over page-specific styling.
- Do not add decorative idle animations, generic page gradients, nested card chrome, or inline shortcut key prose.
- Validate loading, empty, error, focus, and reduced-motion states alongside the happy path when reviewing UI changes.
- Preserve existing workflow, table, link-target, and z-index contracts while refining visual hierarchy.
- Calendar review should confirm opaque month/week/stream surfaces, site/type marker dots, and border-based today/focus states without event-card hover elevation.
- Ask AI and detail-page review should confirm divided next-step/comment/history rows, semantic warning callouts, readable 12px metadata, and unchanged provenance/order behavior.
- Login review should confirm one static ambient accent, no secondary blur orb, and a form-first composition at desktop and mobile widths.

## 11) Documentation maintenance rule
When workflow behavior changes, update:
- `README.md`
- `HOW_TO_USE_APP.md`
- `SPECIFICATION.md`
- `OPERATIONS.md`

Keep all four docs aligned on:
- stage names
- transition gates
- ownership rules
- usage flow
## 12) Bundle-size autoresearch tool (`autoresearch/`)
The repo vendors a single-metric git-ratchet tool at `autoresearch/` (adapted from `sighthoundinc/sh-autoresearch`). It runs `next build`, extracts a single bundle-size metric from the route table, and keeps code changes only when the metric improves beyond `MIN_DELTA`.
### How to run a bundle optimization session
1. Write a fresh `research.env` at repo root pointing `TRAIN_CMD` at `./autoresearch/scripts/measure-route-bundle.sh <route>` (for example `./autoresearch/scripts/measure-route-bundle.sh /`). Set `METRIC_PATTERN="ROUTE_PAGE_SIZE_KB=([0-9.]+)"`, `METRIC_DIRECTION="lower"`, and scope `EDITABLE_FILES` tightly to the files the session may mutate.
2. Measure baseline once: `./autoresearch/scripts/measure-route-bundle.sh <route>`. Paste the emitted `ROUTE_PAGE_SIZE_KB=<v>` into `BASELINE_METRIC`.
3. Start a timed session: `./autoresearch/scripts/start-session.sh <hours> <baseline>`.
4. For each iteration: check time (`check-time.sh`), edit within `EDITABLE_FILES`, then `./autoresearch/scripts/autoresearch.sh "<short description>"`. The script runs the build, extracts the metric, and commits + updates `BASELINE_METRIC` on improvement or `git restore`s on regression/crash.
### Inputs, outputs, and state
- Config: `research.env` (gitignored).
- Strategy doc: `program.md` (gitignored).
- Session state: `results/session.env`, `results/autoresearch.tsv`, `results/last_experiment.log` (gitignored).
- Archived prior sessions live under `autoresearch/history/<session-name>/`.
- Measurement wrapper: `autoresearch/scripts/measure-route-bundle.sh <route>` emits `ROUTE_PAGE_SIZE_KB=<v>` and `ROUTE_FIRST_LOAD_KB=<v>` for any Next route that appears in the build route table.
### Known quirks to work around
- Ratchet commit messages use `perf(ui): <lowercased description>` to satisfy this repo's commitlint config. Keep descriptions short (<60 chars) and ASCII; multi-line bodies trigger the 100-char body rule.
- `git restore` inside `autoresearch.sh` is atomic: if an experiment adds new files and fails the build, the restore aborts for the whole path list and leaves the tree dirty. Clean up manually with `git checkout HEAD -- <tracked paths> && rm -f <untracked paths>`.
- Next's `.next` cache plus node_modules state must be healthy before the ratchet starts; stale `_ssgManifest.js` references or broken `@types/* 2` / broken package folders from macOS file duplication will surface as crashes. If a baseline measurement crashes on something unrelated to your change, repair node_modules first (`rm -rf node_modules/<broken-pkg> && npm install` or a full clean install) rather than widening scope.
- Do not run two autoresearch sessions concurrently against the same repo; both write to the root `research.env`, `program.md`, and `results/` and will clobber each other's state. Archive the closed session into `autoresearch/history/<name>/` before starting a new one.
- Each iteration does a full `next build` (~60–90s on a warm cache). Budget accordingly; a 1h session typically yields 6–10 iterations with agent thinking time.
### Reference
- Vendored upstream docs: `autoresearch/README.md`.
- Archived sessions with outcomes: `autoresearch/history/`.
## 13) Authentication runbook
Authentication is enforced in three layers (full contract in `SPECIFICATION.md` §16). Use this runbook to triage sign-in issues fast.
### Layer map
1. **Edge middleware** — `src/middleware.ts` (+ `src/lib/middleware-auth.ts`)
2. **Server Components** — `src/app/page.tsx`, `src/app/login/page.tsx` using `src/lib/supabase/ssr.ts`
3. **Client state** — `src/providers/auth-provider.tsx` using `src/lib/supabase/browser.ts`
### Troubleshooting by symptom
- **User stuck on `/login` after clicking Sign in** — check that `src/app/login/login-form.tsx` contains BOTH the `router.replace + router.refresh` inside `handlePasswordSignIn` (covers interactive sign-ins) AND the top-level session-watching `useEffect` (covers OAuth return). If either is missing, the user cannot escape `/login` after authenticating.
- **User redirected back to `/login` after OAuth** — expected for the first brief moment: middleware bounces the OAuth callback to `/login` because cookies are not yet set; the browser Supabase client then exchanges the hash/code and fires `onAuthStateChange`, and the session-watching effect navigates to `/`. If they are stuck, check that `@supabase/ssr`'s browser client is actually configured (`getSupabaseBrowserClient()`) and that the URL has a preserved `#...` hash or `?code=...`.
- **Everyone redirected to `/login` even when signed in** — the `sb-*` cookie is missing or malformed. Verify `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` are present on the server. Check `AUTH_BYPASS_PREFIXES` still includes `/login`.
- **`/api/*` returns 401 for signed-in users** — callers must forward `Authorization: Bearer <access_token>`. Client code reads from `useAuth().session?.access_token`. Server Components read from their `supabase.auth.getSession()` result.
- **Cross-user data leak / stale render on `/` or `/login`** — confirm `export const dynamic = "force-dynamic"` is still present on both pages. Without it Next may collapse renders across users.
- **Redirect loop between `/login` and itself** — confirm `AUTH_BYPASS_PREFIXES` in `src/lib/middleware-auth.ts` still starts with `/login`.
### When to reach for `supabase db push`
- Any schema change (`supabase/migrations/*.sql`). This is unrelated to auth plumbing but shares the verification flow; a stuck login can occasionally be caused by stale `profiles` / `user_integrations` / `role_permissions` schemas if a migration is behind.
- After resetting the local dev DB.
### Observability hooks
- `logLoginEvent(userId)` fires fire-and-forget inside `AuthProvider` whenever a session is established. Access logs are visible under `Settings → Activity History → Login only`.
- Middleware redirect loops will show up as repeated `302` responses to `/login` in server logs. If the loop is not visible in a browser devtools Network tab (because Next resolves 302s internally for SSR), `curl -I http://localhost:3000/foo` will expose it.
