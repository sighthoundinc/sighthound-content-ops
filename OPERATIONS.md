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

### UI Architecture (Phase 4A-4C)
**Phase 4A**: Core UI components (AppShell, DataPageHeader, FilterBar, StatusBadgeSystem)
**Phase 4B**: Global command palette + quick create modal  
**Phase 4C**: Unified DataTable system for Dashboard, Tasks, Blogs, Social Posts
- All pages use consistent DataTable component for sorting, filtering, pagination
- Column definitions defined at page level with type safety
- StatusBadgeSystem used throughout for status rendering
- Dashboard left sidebar is intentionally minimal (quick filters and recently published panel removed)
- Zero dead code, production-ready quality (TypeScript 0 errors, ESLint 0 errors)

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
- `src/app/settings/permissions/` — permission management UI
- `src/app/settings/access-logs/` — activity history page UI
- `src/app/api/admin/permissions/` — permission CRUD/reset APIs
- `src/app/api/admin/reassign-assignments/` — assignment transfer API
- `src/app/api/admin/access-logs/` — activity history retrieval API
- `src/app/api/admin/activity-history/` — admin audit/history cleanup API
- `src/app/api/admin/quick-view/` — admin quick-view user session switch API
- `src/app/api/admin/users/[userId]/password/` — admin password reset API
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

## 5.5) User preferences
Per-user preferences are stored in `profiles`:
- `timezone` (default: `America/New_York`) for all date/time display
- `week_start` (default: 1 = Monday) for calendar views
- `stale_draft_days` (default: 10) for dashboard draft flagging
All are editable via Settings → My Profile.

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
- RLS is disabled on activity history maintenance tables to allow service-role cleanup (`20260320195000` and `20260320195100`)
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
## 11) Slack operations
Function:
- `supabase/functions/slack-notify/index.ts`

Secrets:
- `SLACK_BOT_TOKEN` (preferred)
- `SLACK_MARKETING_CHANNEL` (optional)
- `SLACK_WEBHOOK_URL` (fallback)

Deploy/update:
```bash
supabase functions deploy slack-notify --project-ref <PROJECT_REF>
```

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

### “Actions are being logged under unexpected user”
1. check whether quick-view mode is active in UI banner
2. run Return to Admin flow
3. if restore fails, re-authenticate admin user and verify local snapshot clear

### “Enum/status mismatch during writes”
1. verify latest status compatibility migrations are applied
2. verify local/remote migration alignment

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

## 19) Slack integration behavior and debugging
### Current behavior
- Caller: `src/lib/notifications.ts` invokes Supabase function `slack-notify`.
- Events currently sent:
  - `writer_assigned`
  - `writer_completed`
  - `ready_to_publish`
  - `published`
- Delivery order:
  1. if `SLACK_BOT_TOKEN` exists → post to channel (`SLACK_MARKETING_CHANNEL` or `#marketing`) and optionally DM `targetEmail`
  2. else if `SLACK_WEBHOOK_URL` exists → webhook post
  3. else function returns configuration error
- Notification send is best-effort; app flow continues even if Slack send fails.

### Deployment and debug checklist
1. confirm function deployment:
   - `supabase functions deploy slack-notify --project-ref <PROJECT_REF>`
2. verify secrets exist and are valid:
   - `SLACK_BOT_TOKEN` and optional `SLACK_MARKETING_CHANNEL`
   - or fallback `SLACK_WEBHOOK_URL`
3. inspect Supabase Edge Function logs for:
   - `Invalid payload`
   - `No Slack credentials configured`
   - Slack API errors (for example channel not found / invalid_auth / users.lookupByEmail failure)
4. if channel posts succeed but DMs fail, verify `targetEmail` matches an actual Slack user email.
