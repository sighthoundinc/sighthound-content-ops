## Workflow ownership defaults
- Task assignment visibility is open to all authenticated users for collaboration clarity.
- Assigned writers and publishers can edit workflow-critical blog fields by ownership:
  - Google Doc URL
  - Live URL
  - Scheduled Publish Date
  - Display Publish Date
- These fields are treated as core workflow controls and are not intended to be blocked by separate permission toggles.
# sighthound-content-ops
Sighthound Content Relay: content operations platform for Sighthound marketing workflows across `sighthound.com` and `redactor.com`.

## Company & app vision
- **Company vision**: turn content execution into a reliable relay where strategy, drafting, review, and publishing stay synchronized.
- **App vision**: provide one operational source of truth for blogs and social posts, with explicit ownership and clear next actions.
- **Execution goal**: help teams ship more consistently by reducing handoff confusion, hidden blockers, and status ambiguity.

## Product snapshot
- Blog and social-post workflow operations
- DB-authoritative permissions and workflow enforcement
- Blog creation with smart date defaults: today's scheduled date, auto-synced display date via checkbox, no permission gating on dates
- Queue-first dashboard, tasks, and calendar execution views
- Ideas intake and conversion into blogs or social posts
- Global delete confirmation via shared in-app modal (`ConfirmationModal`)
- Workspace home with full associated task snapshot (`Required by: <username>` / `Waiting on Others`)
- Workspace snapshot deduplicates multi-role same-blog associations and prioritizes actionable ownership
- OAuth login and connected-service management for Google and Slack
- Login and app-shell branding use resilient fallbacks to avoid broken logo states on failed loads:
  - login: `text-logo SVG` → `text-logo PNG` → `badge SVG` → text lockup
  - app header badge: `animated GIF` → `badge SVG` → `SH` lockup
- Unified notifications across activity history, in-app notifications, and Slack
- Centralized workflow Slack emission layer for create/transition/reminder paths via `src/lib/server-slack-emitter.ts`
  - create routes: `POST /api/blogs`, `POST /api/social-posts`
  - transition routes: `POST /api/blogs/[id]/transition`, `POST /api/social-posts/[id]/transition`
  - reminder sweeps: social live-link + social/blog overdue routes

## Documentation map
- Product behavior: `SPECIFICATION.md`
- End-user manual: `HOW_TO_USE_APP.md`
- Operations runbook: `OPERATIONS.md`
- In-app manual page: `/resources`
- Role-based quick starts:
  - Writer: `HOW_TO_USE_APP.md#writer-quick-start`
  - Publisher: `HOW_TO_USE_APP.md#publisher-quick-start`
  - Editor/Reviewer: `HOW_TO_USE_APP.md#editorreviewer-quick-start`
  - Admin: `HOW_TO_USE_APP.md#admin-quick-start`

## Core product areas
### Dashboard
- Sidebar navigation split:
  - workflow pages first (`Dashboard`, `My Tasks`, `Calendar`, `Blogs`, `Ideas`, `Social Posts`)
  - divider
  - configuration pages (`Settings`, `Permissions` for admins only)
- Sidebar is collapsible with global persistent state:
  - expanded: `240px` (icons + labels)
  - collapsed: `72px` (icons only)
- Collapsed nav labels are provided through the app tooltip component (hover/focus), not `title` attributes
- Sidebar is rendered as a dedicated layout column, so content shifts and never overlays
- Sidebar column is viewport-anchored with `sticky top-0 h-screen` for always-visible navigation
- Sidebar scroll is isolated to the middle nav section (`flex-1 overflow-y-auto`), keeping header/toggle visible
- Optional sidebar footer content remains fixed below the nav scroll region
- Sidebar nav scroll resets to top on route changes for predictable cross-page behavior
- Sidebar respects reduced-motion preferences by disabling toggle/nav transitions (`motion-reduce:transition-none`)
- Tooltip rendering uses a portal + high z-index layer to avoid clipping in table scroll containers and to stay above drawers/modals
- Collapsed sidebar supports keyboard navigation with visible focus ring and focus-triggered tooltips
- CardBoard navigation uses a dedicated kanban icon (not reused blog icon) for clearer recognition in collapsed mode
- Toggling sidebar while focused inside nav preserves focus predictably (fallback to toggle button, no jump to body)
- Active sidebar item remains obvious in collapsed mode via dark background + white icon contrast
- Collapsed nav rows keep a ~44px minimum hit target with centered icons and full-row click area (no dead zones)
- Active nav page has stronger visual state (left border + highlighted row)
- Left sidebar is intentionally clean (no quick-filter groups and no recently-published card)
- Clickable cross-content overview metrics (`Open Work`, `Scheduled Next 7 Days`, `Awaiting Review`, `Ready to Publish`, `Awaiting Live Link`, `Published Last 7 Days`)
- Delayed metric: scheduled publish date is in the past and overall status is not `Published`
- Active filter chips + clear-all behavior
- Role-agnostic dashboard filter controls (same filter set for all users)
- Filter panel scales to 4 columns on wide screens for faster filtering workflows
- Explicit grouped filtering:
  - Cross-Content Scope: `Sites`, `Content Type`, `Workflow (All Content)`, `Delivery (All Content)`
  - Blog Filters: `Blog Stage`, `Blog Writers`, `Blog Publishers`, `Blog Writer Status`, `Blog Publisher Status`
  - Social Filters: `Social Status`, `Social Product`
- Canonical mixed-table site options: `Sighthound (SH)` and `Redactor (RED)`
- Shared mixed-content filter taxonomy (`src/lib/content-classification.ts`):
  - `Blog`
  - `Social Post (All)` umbrella
  - `Social: Image`, `Social: Carousel`, `Social: Video`, `Social: Link`
- Scope-safe filtering ensures blog filters only constrain blog rows and social filters only constrain social rows.
- Single canonical active-filter pills row (no duplicate chip bars)
- Selection-driven bulk panel with visible permission-disabled mutation states
- Home standup social counts are assignment-scoped to current user relevance (not global social totals)
- Home standup includes writer-facing social handoff visibility for `ready_to_publish`
- Notification bell includes `Required by: <username>` task shortcuts using the same task snapshot contract
- Unified content dashboard table (blogs + social posts) with core contract columns:
  - `Content`, `Site`, `ID`, `Title`, `Status`, `Lifecycle`, `Scheduled`, `Published`, `Assigned to`, `Updated`
  - optional `Product` column via column customization
  - content labels can include social subtype context (for example `Social Post · Carousel`) while filters preserve an umbrella `Social Post (All)` option
  - row click routing: blogs open drawer, social rows navigate to `/social-posts/[id]`
  - Phase A selection: mixed row selection enabled (blogs + social)
  - safety gate: blog mutation controls disable when any social row is selected
  - selected export supports mixed selected rows
- Shared primary-table UX contract (`Dashboard`, `My Tasks`, `Blogs`, `Social Posts` list):
  - top control strip uses results summary + action controls
  - action order remains `Copy` → `Customize` → `Import` → `Export` when present
  - bottom control strip uses rows-per-page selector + pagination controls
  - default density is `compact`
  - default rows-per-page is `10` (`10`, `20`, `50`, `all` options)
  - rows are workflow-colorized globally (`published` emerald, `awaiting live link` amber, `ready` sky, `in review` violet, `changes requested` rose, `in progress` blue, neutral fallback slate)
- Exceptions: `Settings` and `Activity History` tables keep specialized admin layouts and are intentionally excluded from the primary-table UX contract
- Export View / Export Selected CSV (permission-gated)
- Edit Columns popover and bottom pagination controls

### Blog Creation (`/blogs/new`)
|- New blog form with guided date input:
  - Scheduled Publish Date defaults to today
  - Display Publish Date checkbox ("Same as Scheduled Publish Date") is checked by default
  - Uncheck to set a different display date (allowed for all users, no permissions required)
  - Changing scheduled date auto-syncs display date when checkbox is checked
- Both dates can be set by any user with `create_blog` permission
- Assignment defaults:
  - Writer defaults to the current user and remains editable
  - Publisher remembers the last selected publisher from localStorage when that user still exists
  - Saved publisher memory clears automatically when the user chooses `Unassigned` or the saved publisher is no longer available

### Blog Library (`/blogs`)
|- Dedicated reference-first page for title/URL lookup
|- Default: published-only, newest-first by display publish date
- Copy-first utilities:
  - row-level title/url copy (hover-revealed controls)
  - copy-all titles / copy-all URLs
- Exports:
  - View Export: CSV + PDF (`export_csv`)
  - Selected Export: CSV (`export_selected_csv`)

### CardBoard (`/blogs/cardboard`)
- Kanban-style pipeline board (`Idea`, `Writing`, `Reviewing`, `Publishing`, `Published`)
- Drag-and-drop stage movement with permission and field validation
- Quick-add from idea lane
- Stage columns deep-link back to table view filters

### Ideas (`/ideas`)
- Idea cards keep comments/references visible by default
- Idea title/site/comments-references are edited through `Edit Idea` (single edit path)
- Creator/admin users can delete ideas from the card action row after confirmation
- Conversion actions include:
  - `Convert to Blog`
  - `Convert to Social Post`

### Tasks
- Top-3 priority summary + expandable full list
- Top-3 priority summary is mixed across blogs and social posts
- `Overdue` / `Due Soon` / `Upcoming` indicators
- Priority sorting by schedule urgency and status state
- Single unified tasks table across blogs + social posts with shared sorting, filters, pagination, and exports
- Assignment-based visibility for non-published work tied to current user
- Canonical mixed-table site filter options: `Sighthound (SH)` and `Redactor (RED)`
- Shared mixed-content filtering and labels:
  - `Blog`
  - `Social Post (All)` umbrella
  - `Social: Image`, `Social: Carousel`, `Social: Video`, `Social: Link`
- Social action-state classification is stage-derived (`draft/changes_requested/ready_to_publish/awaiting_live_link` worker-owned; `in_review/creative_approved` reviewer-owned) so handoff items appear in the correct bucket
- Blog publishing action-state ownership is stage-specific: admin `publisher_review` assignments are actionable only at `pending_review`, while `publisher_approved` remains actionable for the assigned publisher
- Action-state filtering for `Required by: <username>` vs `Waiting on Others`

### Calendar
- Month/week views
- Week-grouped month layout with compact per-day cards
- Month day tiles show up to 3 items and expose overflow via `+N more`
- `+N more` jumps directly to week view on that date
- Month view avoids nested per-tile scroll regions for smoother page scroll
- Calendar shell primitives are shared across `/calendar` and `/social-posts` calendar mode for consistent weekday headers and day-grid framing
- Calendar weekday order and today highlighting are user-preference aware (`week_start`, `timezone`; fallback `America/New_York`)
- Drag-and-drop scheduling (permission-gated)
- Published entries are non-draggable

### Settings and Permissions
- `My Profile` for all personal preferences (name, timezone, week start, draft attention threshold)
- Timezone-based timestamps preserve correct midnight/noon AM/PM rendering (for example, `12:34 AM` remains AM)
- `Connected Services` for Google and Slack OAuth management:
  - Click `Connect` to link a provider's account
  - OAuth flow opens directly from Settings (no login page redirect)
  - After auth, you're returned to Settings with updated connection status
  - Click `Disconnect` to unlink a provider anytime
- `Access & Oversight` for quick-view and permissions panel entry
- `Create User Account`, `Reassign User Work`, and `User Directory` for team administration
- Permission matrix management (`/settings/permissions`)
- Permission audit history
- Admin-only activity history cleanup (global or user-scoped)
- Optional comments cleanup during history purge
- Admin quick-view as non-admin user with return-to-admin workflow
- Admin quick-view opens impersonated sessions on `My Tasks` (`/tasks?action=action_required`) for immediate actionable-work validation
- Admin-only `Danger Zone: Wipe App Clean` reset that removes all other users and app data while preserving only the signed-in admin account
- Activity and timeline entries are rendered with plain-language labels and UUID-safe wording for operator readability
- Link behavior is globally consistent: internal app links stay in the same tab; external links open in a new tab

### Social Post Editor (`/social-posts/[id]`)
- Guided 4-step single-post workflow:
  1. Setup (required-now fields first, required-before-approval fields second, optional details in disclosure)
  2. Link Context (optional blog lookup + linked blog actions)
  3. Write Caption (UTF-8 editor + formatting + grouped Copy menu + platform guidance)
  4. Review & Publish (checklist validation, transition preflight, live-link actions, stage-based final CTA)
- Sidebar CTA is the primary transition path; raw status transition controls are available under `Advanced transition controls`
- Primary stage-changing CTA transitions now show a compact confirmation summary before submission (`status change`, `next owner`, `locking behavior`)
- Transition preflight summarizes required fields for the next transition and provides `Go to field` shortcuts
- `Changes Requested` transitions use a structured template (category + actionable checklist + optional context note), and the template is serialized into the existing `reason` payload contract
- Social post create modal remembers last-used `product` + `type` + `platforms` defaults and includes quick preset buttons for common setup combinations
- `Work in Full View` from `/social-posts` now carries status-aware continuity focus and lands the editor at the most relevant section (`Setup`, `Review & Publish`, or `Live Links`)
- Keyboard-first editor helpers:
  - `Alt+Shift+J` jumps to the next missing transition-required field
  - `Alt+Shift+Enter` runs the primary sidebar action using the same transition guards as button clicks
  - clickable `Shortcut` text in the sidebar opens the shared shortcuts modal with these page-specific keys
- Transition requirements:
  - `draft` → `in_review`: product + type + Canva link
  - `in_review` → `creative_approved`: product + type + Canva link + platforms + caption + scheduled date
  - `awaiting_live_link` → `published`: at least one saved live link
- Stage-based final CTA behavior:
  - Draft incomplete → `Save Draft`
  - Draft complete → `Submit for Review`
  - Creative Approved + complete draft → `Move to Ready to Publish`
  - Ready to Publish → `Mark Awaiting Live Link`
  - Awaiting Live Link without links → `Await Live Link`
  - Awaiting Live Link with at least one saved link → `Submit Link` (marks `Published`)
- Step 4 includes:
  - quick paste `Live Links` add with automatic platform detection (LinkedIn/Facebook/Instagram)
  - platform-specific URL inputs for precise edits before save
- Snapshot rail includes handoff context (`Assigned to`, `Reviewer`, `Current owner`, `Next owner`) and latest rollback reason when present
- Execution-stage authority:
  - non-admin writers can edit brief fields in `draft` and `changes_requested` only
  - admins can edit brief fields at any stage when operationally needed
  - in `awaiting_live_link`, non-admin users can submit live links only
  - admin-only `Edit Brief` reopens status to `creative_approved`
  - rollback from execution stages to `changes_requested` requires a reason
  - rollback/reopen reasons are entered through in-app modal dialogs (no browser prompt usage)
  - `published` requires at least one valid live link
- Stage transition saves include `associated_blog_id`, so linked blog context persists when moving stages.
- Record-level visibility:
  - full editor shows assignment, comments, and activity history to all authenticated users
  - social detail drawer shows explicit assignment fields (`Assigned to`, `Reviewer`) and latest activity entries
  - blog library/detail drawers show latest comments and activity history for each record
- `/social-posts` calendar mode now aligns with the main calendar UX:
  - month/week toggle with compact month overflow (`+N more` → focused week)
  - no nested month tile scrolling
  - keyboard day navigation parity (`Arrow`/`J/K`, `Enter`, `Escape`)

## Tech stack
- Next.js (App Router) + TypeScript + Tailwind
- Supabase (Postgres, Auth, RLS, Functions)
- Vercel deployment target

## Local setup
1. Install dependencies
```bash
npm install
```
2. Create local env
```bash
cp .env.example .env.local
```
3. Set required env values
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_APP_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `IMPORT_CREATED_BY_USER_ID`
- optional: `LEGACY_XLSX_PATH`
4. Start app
```bash
npm run dev
```

## Dev scripts
- `npm run dev` — Next dev server
- `npm run dev:full` — Next dev + TS watch
- `npm run lint` — ESLint
- `npm run lint:full` — ESLint (no cache)
- `npm run typecheck` — TypeScript check
- `npm run check` — lint + typecheck
- `npm run check:full` — lint (no cache) + typecheck + production build
- `npm run import:legacy` — legacy XLSX import

## API highlights
- `/api/dashboard/summary` — standup summary counts (assignment-scoped social counts; requires `view_dashboard`)
- `/api/dashboard/tasks-snapshot` — grouped mixed My Tasks snapshot for `/` (requires `view_dashboard`)
- Dashboard summary/snapshot endpoints now rely on canonical blog date + social ownership fields (no runtime legacy fallback branches).
- `/api/admin/permissions` — role permission read/update/reset
- `/api/admin/reassign-assignments` — controlled assignment transfer
- `/api/admin/activity-history` — admin activity/audit cleanup
- `/api/admin/quick-view` — admin quick-view session switch
- `/api/admin/users` — admin user operations
- `/api/admin/wipe-app-clean` — full factory reset preserving only signed-in admin account
- `/api/blogs/import` — blog import endpoint (supports `nameResolutions` with `userId`/`selectedUserId` compatibility)
  - existing blogs (matched by canonical live URL) are overwritten with imported core fields (site/title/assignees/publish dates)
  - `draftDocLink` and `actualPublishDate` are optional import fields
  - fallback fill is applied before validation/upsert:
    - missing `liveUrl` uses site base (`https://www.sighthound.com/blog/` or `https://www.redactor.com/blog/`)
    - missing selected `draftDocLink` defaults to `https://docs.google.com/`
    - missing selected `actualPublishDate` copies `displayPublishDate`
  - for existing rows, selected optional fields are also updated from import values/fallbacks
  - writer/publisher resolution uses exact + loose contains/token-overlap matching across full/display/username/first/last/email signals with confidence scoring
- `/api/blogs/[id]/transition` — canonical blog workflow transition endpoint (writer/publisher status, assignment, scheduled/display dates) with optimistic concurrency guard on `updated_at` to prevent stale writes; auto-jogs publishing from `not_started` to `in_progress` when writing is marked complete and a publisher is assigned (unless `publisher_status` is explicitly provided)
- `/api/blogs` — canonical blog creation endpoint (schema-validated create payload + centralized `blog_created` Slack emission)
- `/api/social-posts` — canonical social post creation endpoint (schema-validated create payload + centralized `social_post_created` Slack emission)
- `/api/social-posts/[postId]/transition` — canonical social status transitions with concurrency conflict handling when status changes mid-request
- `/api/social-posts/[postId]/reopen-brief` — admin execution-stage brief reopen
- `/api/social-posts/reminders` — awaiting-live-link reminder sweep with per-row atomic claim to avoid duplicate reminders during concurrent runs
- `/api/ideas/[id]/delete` — creator/admin idea deletion
- `/api/users/profile` — current user profile operations
- `/api/users/integrations` — connected services read/update; PATCH is idempotent via atomic upsert on `user_id` to avoid duplicate-key races on repeated reconnect callbacks
- `/api/users/notification-preferences` — normalized preference keys (`task_assigned` etc.) with legacy `notify_on_*` column compatibility; PATCH is idempotent via atomic upsert on `user_id`
- `/api/events/record-activity` — unified activity history recording
- `/api/social-posts/overdue-checks` — social review/publish overdue sweep with atomic per-row claim to prevent duplicate emissions on overlapping runs
- `/api/blogs/overdue-checks` — blog publish overdue sweep with atomic per-row claim to prevent duplicate emissions on overlapping runs

## Contract-driven engineering baseline
- API routes are normalized via `src/lib/api-contract.ts` to prevent drift:
  - success envelope includes `success: true`
  - error envelope includes `success: false`, `error`, `errorCode`
  - response header includes `x-api-contract-version`
- Frontend API consumers must parse envelopes via `src/lib/api-response.ts`:
  - `parseApiResponseJson()` for safe JSON parsing
  - `isApiFailure()` to fail on either HTTP error or `success: false`
  - `getApiErrorMessage()` to surface `error` and optional `errorCode`
- Edge response handling:
  - non-JSON responses (downloads/streams), redirects, and no-body statuses (`204/205/304`) are explicit pass-through responses from the wrapper (not JSON-enveloped)
  - `parseApiResponseJson()` safely returns an empty object for non-JSON/no-body responses to avoid runtime parsing failures
- Request payloads are schema-validated at route boundaries.
- Reusable UI components are treated as contracts (not per-page variants).
- URL interaction contract uses shared `LinkQuickActions` (`src/components/link-quick-actions.tsx`) for consistent in-place `Open` + `Copy` controls across workflow surfaces.
- `DataTable` keeps fixed row-height and forced single-line text truncation invariants.
- Workflow state mutations must follow: client action → API contract → DB mutation (no bypass).
- Dashboard/My Tasks blog workflow edits are API-authoritative through `/api/blogs/[id]/transition` and no longer rely on direct client `blogs.update(...)` calls.
- Public-schema tables exposed to PostgREST must keep RLS enabled; admin maintenance endpoints use `service_role` server clients instead of disabling RLS.

## Supabase migrations
Apply in timestamp order from `supabase/migrations/`.

Current set:
- `20260311191500_init.sql`
- `20260311203000_calendar_model_alignment.sql`
- `20260312000100_fix_blog_history_trigger_rls.sql`
- `20260312114000_separate_publish_dates.sql`
- `20260312124500_pipeline_status_model.sql`
- `20260312125000_backfill_completion_links.sql`
- `20260312125500_completion_link_requirements.sql`
- `20260312131500_publish_timestamp_and_comments.sql`
- `20260312203000_profile_names_multirole_and_comments_cache.sql`
- `20260312214500_blog_comments_user_id_compat.sql`
- `20260312221000_fix_status_trigger_enum_compat.sql`
- `20260312224000_pipeline_fail_safes_and_import_hash.sql`
- `20260313113000_blog_ideas.sql`
- `20260313143000_social_posts_module.sql`
- `20260313193000_shared_non_admin_role_model.sql`
- `20260313200000_role_permissions_and_audit.sql`
- `20260313213000_expand_permission_matrix.sql`
- `20260320195000_add_activity_history_delete_policies.sql`
- `20260320195100_fix_activity_history_rls.sql`
- `20260321133000_social_workflow_authority_and_event_normalization.sql`
- `20260325111500_enable_public_table_rls.sql`
- `20260325201000_harden_auth_user_creation_trigger.sql`
- `20260325202500_auth_user_creation_diagnostics.sql`
- `20260326100000_enforce_comprehensive_rls_policies.sql`
- `20260326103000_harden_auth_user_integrations_trigger.sql`
- `20260326113000_guard_social_post_link_delete_audit.sql`
- `20260326123000_fix_wipe_app_clean_preserve_current_admin.sql`

Auth provisioning hardening note:
- `20260326103000_harden_auth_user_integrations_trigger.sql` fixes auth user creation failures caused by unqualified trigger writes (`INSERT INTO user_integrations`) by enforcing `public.user_integrations`, `SECURITY DEFINER`, and exception-safe trigger behavior.

## Unified notification system
Notifications no longer rely on ad-hoc Slack-only calls. The app uses a centralized event pipeline so activity history, in-app notifications, and Slack delivery stay in sync.

Core flow:
1. A workflow action emits a unified event.
2. The event is recorded through `/api/events/record-activity`.
3. In-app notifications are generated using the mapped notification type and user preferences.
4. Slack delivery is attempted through `supabase/functions/slack-notify/index.ts`.

Unified event coverage includes:
- blog and social post creation events
- blog assignments and status changes
- social assignments and reassignments
- overdue review/publish reminders
- awaiting-live-link reminders

Key implementation files:
- `src/lib/unified-events.ts`
- `src/lib/emit-event.ts`
- `src/lib/notifications.ts`
- `src/app/api/social-posts/overdue-checks/route.ts`
- `src/app/api/blogs/overdue-checks/route.ts`
- `src/app/api/social-posts/reminders/route.ts`

Slack delivery:
- default channel: `#content-ops-alerts`
- override channel: `SLACK_MARKETING_CHANNEL`
- secrets: `SLACK_BOT_TOKEN` and optional `SLACK_WEBHOOK_URL`
- channel failure should not block fallback delivery attempts
- global display contract for Slack-enabled notifications:
  - `Assigned to` and `Assigned by` must show user display names (not role labels)
  - fallback for unknown/role-only names is `Team`
  - multiple assignees render as comma-joined names
  - include `Open link: <app-url>` deep links when content ID is available

## Quality checks
```bash
npm run lint
npm run typecheck
npm run check
npm run check:full
```
