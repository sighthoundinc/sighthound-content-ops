# Sighthound Content Ops — Operations Runbook
This runbook is for maintainers and operators.  
It describes how the system runs in practice today (deployment, monitoring, incident response, and admin maintenance).  
For product behavior, see `SPECIFICATION.md`.  
For implementation/build rules, see `AGENTS.md`.  
For end-user manual instructions, see `HOW_TO_USE_APP.md`.

## 1) System overview
- Frontend: Next.js + TypeScript + Tailwind (Phase 4A-4C UI complete)
- Backend: Supabase (Postgres, Auth, RLS, triggers/functions)
- Integration: Slack via `supabase/functions/slack-notify`
- Authorization: permission matrix + role templates + DB checks
- Entry routing:
  - signed-out traffic to protected routes is redirected to `/login` by middleware
  - `/login` presents a premium split sign-in layout (brand context + focused auth card)
  - successful login routes authenticated users to `/` workspace home
  - clicking the top-left Sighthound brand in the app shell routes to `/`

Content mutations (blogs, stages, comments, derived status) are DB-authoritative via RLS, triggers, and constraints. Administrative operations are authorized in the application layer (`src/lib/server-permissions.ts`) before executing `service_role` actions. UI checks are UX guardrails.
For social execution-stage completion, live links are entered from `/social-posts/[id]` Step 4 (`Review & Publish` → `Live Links`) and persisted in `social_post_links`.

### Contract enforcement model
- API contract normalization is centralized in `src/lib/api-contract.ts` and applied to all route handlers in `src/app/api/**/route.ts`.
- Response invariants:
  - success responses include `success: true`
  - error responses include `success: false`, `error`, and `errorCode`
  - contract version header `x-api-contract-version` is always present
- Frontend consumption invariant:
  - client fetch handlers must use `src/lib/api-response.ts` helpers to parse envelopes and evaluate failures via both HTTP status and `success` flag.
- Edge response invariant:
  - non-JSON/download/stream responses, redirects, and no-body statuses (`204/205/304`) are pass-through responses with `x-api-contract-version` only (no forced JSON envelope).
  - `parseApiResponseJson` must safely no-op (empty object) for non-JSON/no-body responses to prevent parser crashes.
- Boundary validation expectation:
  - request bodies are schema-validated at route boundaries
  - workflow transitions must be validated by API/DB authority before mutation
- No-bypass operational rule:
  - do not run direct DB mutations for workflow state changes outside approved API contract paths
  - preferred path is client action → API route validation → DB mutation

### UI Architecture (Phase 4A-4C)
**Phase 4A**: Core UI components (AppShell, DataPageHeader, FilterBar, StatusBadgeSystem)
**Phase 4B**: Global command palette + quick create modal  
**Phase 4C**: Unified DataTable system for Dashboard, Tasks, Blogs, Social Posts
- All pages use consistent DataTable component for sorting, filtering, pagination
- Column definitions defined at page level with type safety
- StatusBadgeSystem used throughout for status rendering
- Dashboard left sidebar is intentionally minimal (quick filters and recently published panel removed)
- App shell sidebar is collapsible with persistent local state (`sidebar:collapsed`)
- Collapsed sidebar labels are rendered via `Tooltip` component (`src/components/tooltip.tsx`) on hover/focus only
- Sidebar tooltip behavior intentionally avoids browser `title` attributes for consistent UX and accessibility control
- Sidebar/content are rendered in separate layout columns (no overlay behavior when toggling collapsed state)
- App shell sidebar root is viewport-anchored (`sticky top-0 h-screen`) with a fixed header/toggle row
- Sidebar scrolling is intentionally isolated to the nav region (`flex-1 overflow-y-auto`); root sidebar does not scroll
- Optional sidebar footer content is non-scrolling to keep persistent controls visible
- Sidebar nav scroll position is reset to top on route changes to ensure deterministic navigation behavior
- Reduced-motion users get immediate sidebar state changes via `motion-reduce:transition-none` on sidebar width and nav/toggle interactions
- Tooltip layering uses portal rendering + `fixed` positioning + `z-[220]` to stay above drawers/modals and outside overflow clipping
- Tooltip position is viewport-clamped to prevent edge clipping
- Collapsed sidebar links expose keyboard-first UX: visible focus ring (`focus-visible` inset ring) and tooltip opening on focus
- CardBoard nav item uses a dedicated kanban icon to improve icon-only state recognition
- Sidebar toggle includes focus-retention handling: if focus was inside sidebar during toggle, focus is preserved predictably (fallback to toggle control) instead of dropping to document body
- Active nav item in collapsed mode is intentionally high-contrast (dark background + white icon) so state is clear without labels/tooltips
- Collapsed nav item hit area is constrained to ~44px minimum row height with centered icon and full-row click target
- Zero dead code, production-ready quality (TypeScript 0 errors, ESLint 0 errors)
- `/tasks` follows assignment-based visibility:
  - shows all non-published work assigned to the current user (not only currently actionable rows)
  - includes rows waiting on another actor to preserve end-to-end assignment visibility
  - provides `Action State` filtering (`Required by Me` / `Waiting on Others`) for triage

### Icon system operations standard
- Icon provider: `lucide-react` (open-source SVG icon set)
- Shared app abstraction: `src/lib/icons.tsx` (`AppIcon`, `AppIconName`)
- Emoji-based icons are disallowed in UI control/status/notification surfaces
- Any icon additions should be registered in the shared icon map before use
- Validation expectation after icon changes: run `npm run check`

## 2) Key directories
- `src/` — app routes/components/libs
- `src/lib/permissions.ts` — permission definitions/templates/helpers
- `src/lib/server-permissions.ts` — server-side permission resolution
- `src/lib/access-logging.ts` — server-side utility for logging access events
- `src/lib/format-date.ts` — timezone-aware date formatting utilities
- `src/components/tooltip.tsx` — global hover/focus tooltip component used by collapsed sidebar navigation
- `src/components/app-shell.tsx` — app shell layout with non-overlay collapsible sidebar column, sticky full-height shell, and nav-only scroll partition
- `src/app/settings/permissions/` — permission management UI
- `src/app/settings/access-logs/` — activity history page UI
- `src/app/api/admin/permissions/` — permission CRUD/reset APIs
- `src/app/api/admin/reassign-assignments/` — assignment transfer API
- `src/app/api/admin/access-logs/` — activity history retrieval API
- `src/app/api/admin/activity-history/` — admin audit/history cleanup API
- `src/app/api/admin/quick-view/` — admin quick-view user session switch API
- `src/app/api/admin/users/[userId]/password/` — admin password reset API
- `src/app/api/social-posts/[postId]/transition/` — canonical social status transition API
- `src/app/api/social-posts/[postId]/reopen-brief/` — admin execution-stage brief reopen API
- `src/app/api/social-posts/reminders/` — awaiting-live-link reminder sweep API
- `src/app/api/ideas/[id]/delete/` — idea deletion API (creator/admin-gated, idempotent response)
- `src/lib/quick-view.ts` — quick-view snapshot storage helpers
- `supabase/migrations/` — schema/history migrations
- `supabase/functions/` — edge functions
- `scripts/` — operational scripts (legacy import)

## 3) Local setup
```bash
npm install
cp .env.example .env.local
npm run dev
```

Required env:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_APP_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `IMPORT_CREATED_BY_USER_ID`
- optional `LEGACY_XLSX_PATH`

## 4) Dev workflows
- `npm run dev` — app only
- `npm run dev:full` — app + TypeScript watch
- `npm run lint` — `next lint`
- `npm run typecheck` — `tsc --noEmit`
- `npm run check` — lint + typecheck in parallel
- `npm run import:legacy` — legacy import

Pre-commit:
- Husky enabled via `prepare`
- `.husky/pre-commit` runs `lint-staged`
- staged TS/TSX files run `eslint --fix`

## 5) Supabase migration operations
### List migration state
```bash
supabase --workdir "/absolute/path/to/sighthound-content-ops" migration list
```

### Push migrations
```bash
supabase --workdir "/absolute/path/to/sighthound-content-ops" db push --yes
```

### Sanity sequence (recommended)
```bash
supabase --workdir "/absolute/path/to/sighthound-content-ops" migration list
supabase --workdir "/absolute/path/to/sighthound-content-ops" db push --yes
supabase --workdir "/absolute/path/to/sighthound-content-ops" migration list
npm run check
```

### Migration note: `20260313213000_expand_permission_matrix.sql`
- this migration remaps legacy permission keys into the expanded keyset
- if permission-key check constraints are still legacy at runtime, remap inserts can fail
- ensure constraint drops occur before remap inserts (already reflected in current migration file)

### Current migration set
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
- `20260315143000_status_enum_replay_compat.sql`
- `20260316195500_blog_import_logs.sql`
- `20260316221500_add_delete_user_permission.sql`
- `20260316224500_approval_audit_trail.sql`
- `20260317141728_blog_idea_comments_and_updates.sql`
- `20260317194000_blog_ideas_conversion_sync.sql`
- `20260317194500_canonical_status_workflow.sql`
|- `20260318104000_wipe_app_clean_data.sql`
|- `20260318200000_create_task_assignments.sql`
|- `20260320164320_relax_writer_complete_google_doc_constraint.sql`
|- `20260320195000_add_activity_history_delete_policies.sql`
|- `20260320195100_fix_activity_history_rls.sql`
|- `20260320220000_create_access_logs.sql` (access_logs table with RLS)
|- `20260320223000_update_access_logs_rls.sql` (RLS policy updates for user self-access)
|- `20260321133000_social_workflow_authority_and_event_normalization.sql` (canonical social transition authority, event normalization, reminder tracking)
|- `20260325111500_enable_public_table_rls.sql` (re-enables RLS on audit/comment/import log tables and adds `blog_import_logs` policies)

## 5.5) User preferences
Per-user preferences are stored in `profiles`:
- `timezone` (default: `America/New_York`) for all date/time display
- `week_start` (default: 1 = Monday) for calendar views
- `stale_draft_days` (default: 10) for dashboard draft flagging
All are editable via Settings → My Profile.

## 5.6) Calendar runtime behavior
- Calendar month view is intentionally compact:
  - day tiles render up to 3 visible event cards
  - overflow is represented by `+N more`
  - selecting `+N more` switches to week view on that date
- Month tiles do not use nested per-tile scroll regions (reduces wheel-capture jitter/flicker in dense datasets).
- Calendar event cards rely on native title metadata for hover detail to keep scroll performance stable.
- Drag-reschedule remains permission-gated by `edit_scheduled_publish_date`; published blogs remain non-draggable.

## 6) Permission operations
Primary control plane:
- UI: `/settings/permissions`
- API: `/api/admin/permissions`

Behavior:
- role-level permission toggles by configurable permission keys
- reset selected role to default template
- permission change audit log
- admin-locked permissions remain non-configurable
- frontend mappings to verify during access debugging:
  - `edit_scheduled_publish_date` gates Scheduled Publish Date edits and calendar reschedule actions
  - `edit_display_publish_date` gates Display Publish Date edits
  - `export_csv` gates View Export actions
  - `export_selected_csv` gates Selected Export actions
  - `view_writing_queue` / `view_publishing_queue` gate dashboard queue sections

When debugging access:
1. verify role assignment (`profiles.role`, `profiles.user_roles`)
2. verify `role_permissions` rows for role
3. confirm permission key naming (canonical vs legacy aliases)
4. refresh profile/session permissions cache

Ideas delete behavior:
- Route: `DELETE /api/ideas/[id]/delete`
- Authorization: creator of the idea or admin
- Operational safety: idempotent success response when idea is already deleted

## 7) Assignment transfer operations
API:
- `/api/admin/reassign-assignments`

Use this to move writer/publisher assignments safely between users, instead of manual SQL updates.

## 8) Access history and unified activity operations
Access logging API:
- `POST /api/actions/log-login` (client action) — logs successful login events
- `POST /api/actions/log-dashboard-visit` (client action) — logs dashboard page visits
- `GET /api/admin/access-logs` — retrieves access logs with filters (legacy endpoint, deprecated in favor of unified activity API)

Unified activity history API:
- `GET /api/admin/activity-history` — retrieves unified activity records with multi-select filtering

Behavior:
- **Non-admin users**: cannot access activity history (admin-only feature)
- **Admin users**: can filter by activity type (multi-select) and user (multi-select)
- **RLS policies**: admin role required; endpoint is hard-gated in application layer
- **Immutable**: activity records cannot be edited, only created or deleted by admins
- **Cleanup**: included in `/api/admin/activity-history` deletion scope
- **Message formatting**: user-facing activity copy must stay plain-language (no raw field keys, enum values, or UUID output in change summaries)

Access logs table (`access_logs`):
- `id` (UUID)
- `user_id` (FK to profiles)
- `event_type` ('login' | 'dashboard_visit')
- `timestamp` (UTC)

Unified activity sources:
- `access_logs` — login and dashboard visit events
- `blog_assignment_history` — blog writer/publisher status transitions and assignment changes
- `social_post_activity_history` — social post status transitions and assignment changes

Multi-select filtering:
- **Activity types**: login, dashboard_visit, blog_writer_status_changed, blog_publisher_status_changed, blog_assignment_changed, social_post_status_changed, social_post_assignment_changed
- **Users**: any user in the system (all selected by default on page load)
- **Filter logic**: OR within activity types, AND across activity types and users
- **Query params**: `activity_types=type1,type2&user_ids=user1,user2&limit=100&offset=0`

Notification bell integration:
- Top 5 recent activity notifications displayed in bell dropdown
- "View History" link navigates to full Activity History page
- "Clear All" button dismisses only bell dropdown view (does not delete full history)
- Bell activity entries use the same plain-language formatter as timeline/history views to keep wording consistent across surfaces

## 8.5) Admin maintenance operations
Activity history cleanup API:
- `/api/admin/activity-history` (`DELETE`)

Capabilities:
- delete all activity history (global)
- delete history scoped to selected users
- optional comments cleanup (`blog_comments`, `social_post_comments`) with same scope rules

Operational notes:
- endpoint is hard-gated to admin role
- destructive operation; no restore path
- intended for test-data cleanup and environment hygiene
- RLS remains enabled on maintenance-related public tables; cleanup endpoints still work because server-side admin clients use `service_role` (which bypasses RLS)
- delete-all cleanup paths use `.gt("id", "00000000-0000-0000-0000-000000000000")` to safely match all UUID rows

## 9) Admin password reset (test-only) operations
Password reset API:
- `PATCH /api/admin/users/[userId]/password` — admin sets password for any user

Behavior:
- **Authorization**: requires admin role + `manage_users` permission
- **Password validation**: minimum 8 characters
- **Authentication**: uses Supabase admin auth to update
- **User experience**: user can log in with new password immediately
- **Temporary feature**: intended for testing only; will be removed before production
- **UI location**: Settings → User Directory → Edit User → Reset Password (Test Only) section

## 10) Quick-view as user operations
Quick-view session switch API:
- `/api/admin/quick-view` (`POST`)

Behavior:
- admin chooses active non-admin target user
- system generates one-time auth flow and switches browser session
- while quick-view is active, all reads/writes run as selected user
- audit trail and action attribution follow the selected user context

Return flow:
- quick-view snapshot is stored in browser local storage
- “Return to Admin” restores original admin session
- sign-out clears quick-view snapshot state
## 11) Slack operations and notification system

### Slack integration configuration

**Environment variables**:
- `SLACK_BOT_TOKEN` (preferred method) — Bot user OAuth token
- `SLACK_MARKETING_CHANNEL` (optional) — Default channel for notifications (default: `#content-ops-alerts`)
- `SLACK_WEBHOOK_URL` (fallback method) — Incoming Webhook URL

**How it works**:
1. If `SLACK_BOT_TOKEN` is configured:
   - Posts to configured channel (`SLACK_MARKETING_CHANNEL` or `#content-ops-alerts`)
   - Sends DMs to users if `targetEmail` matches Slack user email
   - Uses `chat.postMessage` API
2. If only `SLACK_WEBHOOK_URL` is configured:
   - Posts only to webhook's designated channel
   - No DM capability

**Deploy/update**:
```bash
supabase functions deploy slack-notify --project-ref <PROJECT_REF>
```

**Debugging**:
Check Supabase Edge Function logs for:
- `Invalid payload` — malformed request
- `No Slack credentials configured` — missing env vars
- Slack API errors (channel not found, invalid_auth, users.lookupByEmail failure)

### Unified events system

**Architecture**:
Single `emitEvent()` call handles both notifications and activity history recording.

**Components**:
- `src/lib/unified-events.ts` — Event type definitions and mappings
- `src/lib/emit-event.ts` — Emission implementation
- `src/lib/notifications.ts` — Notification delivery (in-app + Slack)
- `src/app/api/events/record-activity` — Activity history persistence

**Event flow**:
```
emitEvent() call
├─ Validates event structure
├─ Records to activity history table
├─ Maps to notification type
├─ Checks user preferences
└─ Emits notification (in-app + Slack)
```

**Supported event types**:
- `blog_writer_status_changed` — Writer stage transitions
- `blog_publisher_status_changed` — Publisher stage transitions
- `blog_assignment_changed` — Writer/publisher reassignments
- `social_post_status_changed` — Social post status transitions
- `social_post_assignment_changed` — Editor/admin reassignments

**Slack event types** (active):
- `writer_assigned`, `ready_to_publish`, `published`
- `social_submitted_for_review`, `social_changes_requested`
- `social_ready_to_publish`, `social_awaiting_live_link`, `social_published`, `social_live_link_reminder`

**Removed events** (no longer sent):
- `writer_completed` — redundant signal; `ready_to_publish` carries actionable next step
- `social_creative_approved` — low-urgency internal state with no required next action

### Notification preferences enforcement

**System design**:
- **Single source of truth**: `shouldSendNotification()` in `src/lib/notification-helpers.ts`
- **Enforcement point**: `pushNotification()` checks preferences before emitting
- **Automatic coverage**: All existing and future notifications are filtered
- **Session caching**: Preferences cached per request to avoid N+1 queries

**User preferences** (Settings → Notification Preferences):
- `notifications_enabled` — Master switch
- `task_assigned` — Assignment notifications
- `stage_changed` — Status transition notifications
- `submitted_for_review` — Review request notifications
- `published` — Publication notifications
- `awaiting_action` — Action needed notifications
- `mention` — Comment mention notifications

**API endpoints**:
- `GET /api/users/notification-preferences` — Fetch current preferences
- `PATCH /api/users/notification-preferences` — Update preferences

**Database**:
- Table: `notification_preferences`
- Columns: user_id, notifications_enabled, 7 type toggles, timestamps
- RLS: Users see/edit only own preferences
- Auto-provisioning: Trigger creates defaults for new users

### Social post event emission

**Status transition events**:
```typescript
// When social post status changes:
await emitEvent({
  type: 'social_post_status_changed',
  contentType: 'social_post',
  contentId: postId,
  oldValue: previousStatus,
  newValue: newStatus,
  fieldName: 'status',
  actor: userId,
  actorName: userDisplayName,
  contentTitle: postTitle,
  metadata: { reason: rollbackReason },
  timestamp: new Date(),
});
```

**Assignment events** (when UI is built):
```typescript
// When editor/admin is reassigned:
await emitEvent({
  type: 'social_post_assignment_changed',
  contentType: 'social_post',
  contentId: postId,
  oldValue: { editor_user_id: oldEditor, admin_owner_id: oldAdmin },
  newValue: { editor_user_id: newEditor, admin_owner_id: newAdmin },
  fieldName: 'assignment',
  actor: userId,
  actorName: userDisplayName,
  contentTitle: postTitle,
  timestamp: new Date(),
});
```

**Backend infrastructure** (already implemented):
- Database fields: `editor_user_id`, `admin_owner_id`
- Audit trigger: `audit_social_post_changes()` logs assignment changes
- History table: `social_post_activity_history`
- RLS policies: Admin-only access for assignment changes

**Current state**: 70% complete
- ✅ Database schema
- ✅ Event types and mappings
- ✅ Activity history logging
- ✅ Notification system integration
- ❌ UI for reassigning editor/admin (pending product decision)
- ❌ API endpoint for assignment updates

**Documentation**:
- `docs/UNIFIED_EVENTS_MIGRATION.md` — Migration guide
- `docs/SOCIAL_POST_TESTING_GUIDE.md` — Testing procedures
- `docs/SOCIAL_POST_ASSIGNMENT_VISUAL_GUIDE.md` — UI implementation guide

## 12) Blog import name resolution (Step 1.75)
### Overview
The system automatically matches imported writer/publisher names against existing users to prevent duplicate user creation. This runs as a mandatory step before final import.

### Matching algorithm
Matches are scored by confidence level (highest to lowest priority):
1. **Exact full name** (100%) - normalized case-insensitive comparison
2. **Exact display name** (100%) - if user has a custom display name
3. **Exact username** (100%) - if imported name matches user account username
4. **First + Last name match** (95%) - first and last word of imported name match user's name parts
5. **First name only** (70%) - first word matches first name part
6. **Last name only** (60%) - last word matches last name part
7. **No match** - system marks for new user creation

### Resolution flow
1. **Background auto-trigger** (after column selection, Step 1.75):
   - Only processes valid rows (no validation errors)
   - Extracts unique writer + publisher names
   - Calls `/api/users/resolve-names` API endpoint

2. **Auto-resolution**:
   - If `bestMatch` found → uses that user (action: `use_existing`, userId)
   - If no match → marks for new user creation (action: `create_new`)

3. **Confirmation modal**:
   - Shows all resolved names with match type + confidence
   - Recommends best matches (★ Recommended indicator)
   - User can:
     - Accept all → proceeds to Step 2 (preview)
     - Modify individual resolutions → changes mapping
     - Re-run resolution → triggers fresh matching
   - User must explicitly accept before import is allowed

4. **Import with resolutions**:
   - `nameResolutions` map is passed to `/api/blogs/import`
   - Backend respects user's selections (no re-matching)

### Database schema
- `profiles.username` - unique text field, indexed for fast lookup
- Populated from email local-part for existing users during migration

### API details
**POST /api/users/resolve-names**
- Input: `{ names: string[] }`
- Output: `{ resolutions: NameResolutionResult[] }`
- Where `NameResolutionResult` contains:
  - `inputName`: original imported name
  - `candidates`: array of matching users with matchType + confidence
  - `bestMatch`: highest-confidence candidate (null if no matches)

**POST /api/blogs/import** (updated)
- Input includes: `nameResolutions: Record<string, { action: 'use_existing' | 'create_new', userId?: string }>`
- Backend uses provided resolutions instead of re-matching

### Troubleshooting
**"Names don't match expected users"**
1. Check that `profiles.username` is populated
2. Verify user full_name, display_name, and username values
3. Ensure imported names are not misspelled (e.g., "John Doe" vs "Jon Doe")
4. Try Re-run Resolution to see fresh candidates

**"Modal doesn't appear"**
1. Check browser console for fetch errors
2. Verify `/api/users/resolve-names` is returning data
3. Confirm valid rows exist (rows with validation errors are skipped)
4. If all rows have validation errors, resolution is automatically skipped (no API call)

**"Import blocked after resolution"**
- You must click "Confirm" in the resolution modal to accept matches
- The import button remains disabled until acceptance

### Edge case behavior
**Empty name set (all rows have validation errors)**
- Auto-resolution safely skips if there are no valid rows with extractable names
- No API call is made (guard clause prevents empty array validation error)
- User is then forced to fix validation errors before import can proceed
- This is correct behavior since unparseable rows should not advance

## 13) Legacy import operations
Dry run:
```bash
npm run import:legacy -- --dry-run
```

Execute:
```bash
npm run import:legacy
```

Canonical source is the cleaned workbook (`Calendar View` sheet).

## 14) Troubleshooting quick map
### “Comments table is missing from schema cache”
1. run latest migrations
2. confirm `blog_comments` exists
3. confirm schema reload notify executed

### “Permission denied for action”
1. verify user role(s)
2. verify permission matrix rows for role
3. verify required permission key for that action
4. re-login or refresh permission cache

### “Migration 20260313213000 fails with `role_permissions_permission_key_valid`”
1. confirm local migration file includes early constraint drops before legacy remap insert
2. rerun `supabase ... db push --yes`
3. verify local/remote parity with `supabase ... migration list`

### “Queue sections empty unexpectedly”
1. verify assignment (`writer_id` / `publisher_id`)
2. verify current queue filter and stage state
3. confirm `view_writing_queue` / `view_publishing_queue` permission

### “Calendar month view feels janky or seems to hide items”
1. confirm users are on current build with compact month rendering (`+N more` behavior)
2. use `+N more` to jump to week view for full same-day item list
3. verify no custom CSS reintroduced per-tile `overflow-y-auto` in month mode
4. check filter state (`Blogs`, `Social Posts`, writer scope) before triaging data completeness

### “Actions are being logged under unexpected user”
1. check whether quick-view mode is active in UI banner
2. run Return to Admin flow
3. if restore fails, re-authenticate admin user and verify local snapshot clear

### “Enum/status mismatch during writes”
1. verify latest status compatibility migrations are applied
2. verify local/remote migration alignment
### “Supabase reports `rls_disabled_in_public`”
1. confirm latest migrations are applied (`supabase ... db push --yes`)
2. verify `20260325111500_enable_public_table_rls.sql` has run in the target project
3. run SQL check:
   - `select schemaname, tablename, rowsecurity from pg_tables where schemaname = 'public' and rowsecurity = false;`
4. if rows remain, enable RLS and add/verify policies before re-checking Supabase security advisor

### General runtime issue
1. run `npm run check`
2. verify env vars
3. check Supabase logs + Next runtime logs
## 15) Deployment pipeline (current state)
### Environments
- Local development: Next app + local env file (`.env.local`)
- Hosted runtime: Vercel (Next.js app) + Supabase project (DB/Auth/Edge Functions)
- This repository does not currently include in-repo CI workflow files (for example `.github/workflows/*`), so deployment orchestration lives in Vercel/Supabase project configuration.

### Testing and release gates
Before release/promotion, run these gates in order:
1. `npm run check` (lint + typecheck)
2. migration sanity sequence:
   - `supabase ... migration list`
   - `supabase ... db push --yes`
   - `supabase ... migration list`
3. verify environment variables are present in deployment target:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `NEXT_PUBLIC_APP_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
4. deploy frontend on Vercel (current config: `installCommand` = `npm install`, `buildCommand` = `npm run build`)

### Rollback posture
- Frontend rollback: redeploy last known-good Vercel deployment.
- Data rollback: no single-click app-level rollback; use targeted data correction, or restore from DB backup strategy outside this repo.

## 16) Monitoring, logging, and alerting
### Logging sources used today
- Next.js server/API logs (route handlers log via `console.log`/`console.error`)
- Supabase logs:
  - PostgREST/API errors
  - Edge Function logs (including `slack-notify`)
- Import telemetry:
  - `blog_import_logs` tracks `rows_created`, `rows_updated`, `rows_failed`, `imported_at`
- Audit/forensics tables:
  - `blog_assignment_history`
  - `social_post_activity_history`
  - `permission_audit_logs`

### Alerting reality today
- No dedicated in-repo pager/incident integration is configured.
- Operational alerting is log-driven via Vercel + Supabase dashboards and manual triage.
- Slack notifications are workflow notifications (content events), not a full error-alerting system.

## 17) Common failure handling playbooks
### Import failures and rollback
For `/api/blogs/import`:
1. review returned `failures` and `failedRows` payload (row-level diagnostics)
2. correct source data and re-import only corrected rows
3. confirm counts in API response and in `blog_import_logs`

Current-state rollback notes:
- Import processing is row-by-row and can be partially successful; there is no single atomic rollback endpoint for an entire import batch.
- For broad cleanup in non-production/test environments, use admin **Wipe App Clean**.
- For production correction, use targeted cleanup/reassignment flows and controlled data repair.

For legacy XLSX import script (`npm run import:legacy`):
- run dry-run first: `npm run import:legacy -- --dry-run`
- script relies on dedupe keys (`legacy_import_hash`, URL/key matching), so safe re-runs are the primary correction path

### User recovery
- Soft deactivation: admin can reactivate users by setting `isActive` back to `true` through profile edit flow (`/api/users/profile`).
- If auth user was hard deleted/purged, recovery is recreate + reassignment (no undelete endpoint).
- For authored content continuity during delete/purge, APIs attempt reassignment of `created_by` ownership before removal.

### Data cleanup
|- Activity history cleanup: `/api/admin/activity-history`
  - scope: all users or selected users
  - optional comments cleanup for `blog_comments` and `social_post_comments`
|- Factory reset: `/api/admin/wipe-app-clean`
  - admin-only
  - always preserves currently signed-in admin auth/profile context
  - optional: delete all other admin profiles and auth accounts (checkbox in confirmation modal)
  - if unchecked, other admin profiles are preserved alongside signed-in admin
  - clears all non-admin users, content, logs, permissions, and related operational data

## 18) Admin workflows (current state)
Settings UI grouping (for operator orientation):
- `Access & Oversight` → quick-view and permissions entrypoint
- `Create User Account` / `Reassign User Work` / `User Directory` → team administration
- `Activity History Cleanup` and `Danger Zone: Wipe App Clean` → destructive maintenance actions
### Activity history cleanup
- Entry point: Settings → Activity History Cleanup
- API: `DELETE /api/admin/activity-history`
- Use when test data/noise in history blocks troubleshooting or demos.

### Role and permission changes
- User role/profile changes:
  - UI: Settings user editor
  - API: `PATCH /api/users/profile` (`userRoles`, `isActive`, profile names)
- Permission matrix changes:
  - UI: `/settings/permissions`
  - API: `/api/admin/permissions` (`GET`/`PATCH`/`POST` reset)
- Always verify effective permissions after change by refreshing session/profile.

### Quick-view troubleshooting
- Quick-view start API: `POST /api/admin/quick-view` (admin → non-admin only)
- If attribution/logging looks wrong, first check whether quick-view is active.
- Recovery sequence:
  1. use **Return to Admin** in Settings
  2. if restore fails, sign out/in as admin
  3. clear stale local snapshot key `sighthound.quick_view_admin_session_v1` if needed

## 19) Slack integration behavior and debugging (detailed)

### Current behavior
- Caller: `src/lib/notifications.ts` invokes Supabase function `slack-notify`
- Events currently sent (with Slack event type mapping):
  | Event | Slack Event Type | Description |
  |-------|-----------------|-------------|
  | `writer_assigned` | `writer_assigned` | Writer assigned to blog |
  | `writer_completed` | `writer_completed` | Writer finished draft |
  | `ready_to_publish` | `ready_to_publish` | Blog ready for publishing |
  | `published` | `published` | Blog went live |
  | `social_submitted_for_review` | `social_submitted_for_review` | Social post submitted |
  | `social_changes_requested` | `social_changes_requested` | Changes requested on social post |
  | `social_creative_approved` | `social_creative_approved` | Social creative approved |
  | `social_ready_to_publish` | `social_ready_to_publish` | Social post ready to publish |
  | `social_awaiting_live_link` | `social_awaiting_live_link` | Waiting for live link |
  | `social_published` | `social_published` | Social post published |
  | `social_live_link_reminder` | `social_live_link_reminder` | Reminder to submit live link |

### Channel and DM configuration

**Channel notifications**:
- Default channel: `#marketing`
- Configurable via `SLACK_MARKETING_CHANNEL` env var
- Message format: `*Event Label* • Post Title (site)`
- Includes: Actor name, deep link to app, timestamp

**Direct message notifications**:
- Sent to `targetEmail` if provided in notification payload
- Requires matching email in Slack workspace
- Uses `users.lookupByEmail` to find Slack user ID
- If lookup fails, silently skips DM (logs warning)

### Reminder sweep behavior
- **Trigger**: `POST /api/social-posts/reminders` (admin-only)
- **Criteria**: Posts in `awaiting_live_link` status
- **Dedupe**: 24-hour cooldown per post via `last_live_link_reminder_at`
- **Notifications**: Sends `social_live_link_reminder` event

### Delivery order and fallbacks
1. **Bot Token method** (preferred):
   - Posts to channel (`SLACK_MARKETING_CHANNEL` or `#marketing`)
   - Attempts DM to `targetEmail` if configured
   - Uses `chat.postMessage` API
2. **Webhook method** (fallback):
   - Posts only to webhook URL's configured channel
   - No DM capability
3. **No credentials**:
   - Returns configuration error
   - Does NOT break in-app notifications

### Failure handling
- Slack failures are **non-blocking**
- In-app notifications succeed even if Slack fails
- Errors logged to Supabase Edge Function logs
- App flow continues normally

### Notification preference enforcement
All Slack notifications respect user preferences:
- Global `notifications_enabled` toggle
- Individual event type toggles
- If disabled, Slack notification is skipped silently

### Deployment and debug checklist
1. Confirm function deployment:
   - `supabase functions deploy slack-notify --project-ref <PROJECT_REF>`
2. Verify secrets exist and are valid:
   - `SLACK_BOT_TOKEN` and optional `SLACK_MARKETING_CHANNEL`
   - Or fallback `SLACK_WEBHOOK_URL`
3. Inspect Supabase Edge Function logs for:
   - `Invalid payload`
   - `No Slack credentials configured`
   - Slack API errors (channel not found, invalid_auth, users.lookupByEmail failure)
4. If channel posts succeed but DMs fail, verify `targetEmail` matches an actual Slack user email.
