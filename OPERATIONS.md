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
### Social posts
- Status flow remains:
  - `draft`
  - `in_review`
  - `changes_requested`
  - `creative_approved`
  - `ready_to_publish`
  - `awaiting_live_link`
  - `published`
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

### Sidebar auto-collapse
- `useSidebarState` (in `src/hooks/useSidebarState.ts`) auto-collapses the sidebar on first paint when the viewport is below 1400px AND the user has not previously saved a preference.
- Once the user toggles manually, the localStorage preference wins regardless of viewport.
- `prefers-reduced-motion` continues to suppress all sidebar transitions.

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
