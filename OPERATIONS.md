## Workflow ownership and permissions
- If a writer or publisher owns a blog in the workflow, they can edit workflow-critical URLs and dates without needing separate permission toggles.
- Keep permission toggles focused on optional or privileged actions (exports, archive, admin overrides), not core workflow completion fields.
- Task assignment rows are readable by all authenticated users to improve coordination; mutation remains limited to the assigned user and admins.
# Sighthound Content Ops — Operations Runbook
This runbook is for maintainers and operators.  
It describes how the system runs in practice today (deployment, monitoring, incident response, and admin maintenance).  
For product behavior, see `SPECIFICATION.md`.  
For implementation/build rules, see `AGENTS.md`.  
For end-user manual instructions, see `HOW_TO_USE_APP.md`.

## 1) System overview
- Frontend: Next.js + TypeScript + Tailwind (Phase 4A-4C UI complete)
- Backend: Supabase (Postgres, Auth, RLS, triggers/functions)
- Integration: unified event pipeline with Slack delivery via `supabase/functions/slack-notify`
- Authorization: permission matrix + role templates + DB checks
- Entry routing:
  - signed-out traffic to protected routes is redirected to `/login` by middleware
  - `/login` presents a premium split sign-in layout (brand context + focused auth card)
  - successful login routes authenticated users to `/` workspace home
  - clicking the top-left Sighthound brand in the app shell routes to `/`

Content mutations (blogs, stages, comments, derived status) are DB-authoritative via RLS, triggers, and constraints. Administrative operations are authorized in the application layer (`src/lib/server-permissions.ts`) before executing `service_role` actions. UI checks are UX guardrails.
|Workflow-critical blog status/assignment/date edits from Dashboard and My Tasks are API-authoritative through `POST /api/blogs/[id]/transition` (not direct client `blogs.update(...)` mutations).
|Blog creation is trigger-authoritative for insert permission validation:
|- self-assignment on writer/publisher fields is allowed without `change_*_assignment` permissions
|- assigning another user on insert still requires the matching assignment permission
|- create-form publisher memory is client-only localStorage state and must always be validated against the current selectable users list before prefill
For social execution-stage completion, live links are entered from `/social-posts/[id]` Step 4 (`Review & Publish` → `Live Links`) and persisted in `social_post_links`.
- Social editor progression defaults to the sidebar primary CTA; raw status selector remains under `Advanced transition controls`.
- Social editor sidebar includes `Transition Preflight` to expose missing required fields and jump-to-field remediation.
- Setup form separates required-now vs required-before-approval fields and keeps optional setup fields in an explicit disclosure to reduce form friction.
- Live-link entry supports quick paste with platform auto-detection while preserving per-platform URL controls.
- Snapshot rail must display handoff context (`Assigned to`, `Reviewer`, `Current owner`, `Next owner`) and latest rollback reason when available.
- Social status transition API writes record-level activity using canonical fields (`changed_by`, `event_type`, `field_name`, `old_value`, `new_value`, `metadata`) to avoid schema drift between activity writers and readers.
- Record-level assignment/comments/activity visibility in drawers and full pages is available to all authenticated users; admin-only restrictions apply only to global Settings activity pages.

### Unified notification operations
- Notification emission is centralized through `src/lib/emit-event.ts`.
- Event definitions and notification-type mappings live in `src/lib/unified-events.ts`.
- Slack delivery remains in `src/lib/notifications.ts` and `supabase/functions/slack-notify/index.ts`, but callers should route through unified events instead of direct Slack invokes.
- Current non-status reminder/sweep routes using the unified pipeline:
  - `src/app/api/social-posts/overdue-checks/route.ts`
  - `src/app/api/blogs/overdue-checks/route.ts`
  - `src/app/api/social-posts/reminders/route.ts`
- Current reminder event coverage includes:
  - `social_review_overdue`
  - `social_publish_overdue`
  - `blog_publish_overdue`
  - `social_post_live_link_reminder`
- Operational expectation: one event should drive activity history, in-app notification eligibility, and Slack delivery. Do not add new direct Slack-only branches for workflow events.
- Slack display-layer contract for all Slack-enabled notifications:
  - `Assigned to` and `Assigned by` must use resolved user display names
  - role-only labels (`Writer`, `Editor`, `Publisher`, etc.) must not appear as assignee/actor values
  - unresolved or role-only values fall back to `Team`
  - include `Open link: <app-url>` when content deep link is available

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
- Link target invariant: internal app links open in same tab; external URLs open in new tab with safe rel attributes
- Delete confirmation invariant: all UI delete flows use shared `ConfirmationModal`; browser-native confirms and toast-action confirms are not valid delete confirmation patterns
- Social rollback/reopen reason capture uses in-app modal dialogs; browser `window.prompt` is not used for workflow reasons
- Feedback hooks are direct-only: app routes use `useAlerts` and `useNotifications`; deprecated system-feedback wrappers are removed
- Sidebar toggle includes focus-retention handling: if focus was inside sidebar during toggle, focus is preserved predictably (fallback to toggle control) instead of dropping to document body
- Active nav item in collapsed mode is intentionally high-contrast (dark background + white icon) so state is clear without labels/tooltips
- Collapsed nav item hit area is constrained to ~44px minimum row height with centered icon and full-row click target
- Zero dead code, production-ready quality (TypeScript 0 errors, ESLint 0 errors)
- `/tasks` follows assignment-based visibility:
  - shows all non-published work assigned to the current user (not only currently actionable rows)
  - includes rows waiting on another actor to preserve end-to-end assignment visibility
  - social `Action State` is stage-derived (`draft/changes_requested/ready_to_publish/awaiting_live_link` → worker-owned, `in_review/creative_approved` → reviewer-owned) so handoff stages classify consistently even if assignment metadata lags
  - `Next Tasks` priority list is computed across both blog and social datasets (not blog-only)
  - social list section renders all matching rows for current filters (not capped preview)
  - provides `Action State` filtering (`Required by: <username>` / `Waiting on Others`) for triage
- `/` home page includes `My Tasks Snapshot`:
  - mixed blog + social items (max 8)
  - grouped as `Required by: <username>` and `Waiting on Others`
  - uses the same stage-derived social ownership model as `/tasks` so handoff visibility stays aligned across both surfaces
  - summary buckets include writer-facing social handoff stage `ready_to_publish` in addition to review/live-link stages
- notification bell panel includes actionable task shortcuts sourced from `/api/dashboard/tasks-snapshot` (`requiredByMe` group), keeping navigation shortcuts aligned with the same ownership/action-state contract
- admin quick-view session entry starts on `/tasks?action=action_required` so impersonated workflow checks begin with next-step-required-by-user work
- `/dashboard` overview cards are cross-content and combine blog + social post counts:
  - `Open Work`
  - `Scheduled Next 7 Days`
  - `Awaiting Review`
  - `Ready to Publish`
  - `Awaiting Live Link`
  - `Published Last 7 Days`
- `/dashboard` filter controls are intentionally role-agnostic and rendered as a denser 4-column grid on wide viewports
- `/dashboard` filter groups are explicit:
  - Row 1 (Search Context): `Sites`, `Writers`, `Publishers`, `Stage`
  - Row 2 (Workflow State): `Writer Status`, `Publisher Status`, `Cross Workflow`, `Cross Delivery`
- `/dashboard` uses a single active-filter pill surface and avoids duplicated chip bars
- `/dashboard` bulk panel is selection-driven; permission-restricted mutation controls remain visible but disabled with helper text

### Typography system operations standard
- Primary font: **Inter** (modern, minimalist sans-serif) via Google Fonts
- Monospace font: **JetBrains Mono** (technical text) via Google Fonts
- Both fonts loaded with `display: swap` to prevent layout shift
- Type scale: 12–24px range, intentionally compact and modern
- Font loading: `src/app/layout.tsx` imports and applies via CSS variables
- Core utility classes: `src/app/globals.css` (`.page-title`, `.section-title`, `.body-text`, etc.)
- Reusable constants: `src/lib/typography.ts` (`TYPOGRAPHY.*` constants)
- Weight hierarchy: Normal (400) for body, Medium (500) for labels, Semibold (600) for headings
- Line height optimization: snug (1.2) for headings, 1.5 (leading-6) for body, 1 (leading-4) for meta text
- Letter spacing: tight (-0.015em) for headings, normal for body
- Global body letter-spacing: -0.01em for subtle optical tightening
- Color palette: slate-900 (headings), slate-800 (body), slate-600 (meta), slate-400 (disabled)
- Documentation: `docs/TYPOGRAPHY_SYSTEM.md` (complete guide + examples + testing checklist)
- Build validation: `npm run check` (lint + typecheck) catches any font or class issues
- No manual font overrides: all text should use predefined utility classes or `TYPOGRAPHY.*` constants

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
- `src/app/api/dashboard/summary/` — home standup counts (social counts are assignment-scoped)
- `src/app/api/dashboard/tasks-snapshot/` — grouped mixed-task snapshot for home page
- Dashboard summary/snapshot APIs now read canonical blog date + social ownership columns directly (legacy runtime fallback branches retired).
- `src/app/api/social-posts/[postId]/transition/` — canonical social status transition API
- `src/app/api/blogs/[id]/transition/` — canonical blog transition API for dashboard/task workflow edits
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
|- `20260325201000_harden_auth_user_creation_trigger.sql` (consolidated safe auth-user profile/notification bootstrap trigger)
|- `20260325202500_auth_user_creation_diagnostics.sql` (service-role RPC for auth trigger/constraint inspection)
|- `20260326100000_enforce_comprehensive_rls_policies.sql` (comprehensive CRUD policy normalization)
|- `20260326103000_harden_auth_user_integrations_trigger.sql` (fixes unqualified `user_integrations` insert in auth trigger)
|- `20260326113000_guard_social_post_link_delete_audit.sql` (prevents FK violations when social post delete cascades to live-link audit trigger logging)
|- `20260326123000_fix_wipe_app_clean_preserve_current_admin.sql` (hardens wipe RPC to preserve only signed-in admin profile and wipe all other app data)

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

## 8.3) Social post transition field gates
- Social post creation requires `product`, `type`, and `reviewer_user_id`; title may be empty.
- Transition requirement checkpoints:
  - `draft` → `in_review`: `product`, `type`, `canva_url`
  - `in_review` → `creative_approved`: `product`, `type`, `canva_url`, `platforms`, `caption`, `scheduled_date`
  - `awaiting_live_link` → `published`: at least one saved live link in `social_post_links`
- Guardrails:
  - non-admin writers can edit brief fields in `draft` and `changes_requested`
  - admins can edit brief fields in any stage
  - in `awaiting_live_link`, non-admin users are restricted to live-link submission
- Stage transition payloads include `associated_blog_id` to prevent linked blog context loss during status moves.

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
- `blog_created`, `social_post_created`
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
Matches are scored by confidence level, then tie-broken by match priority:
1. **Exact full name** (100%) - normalized case-insensitive comparison
2. **Exact display name** (100%) - if user has a custom display name
3. **Exact username** (100%) - if imported name matches user account username
4. **Exact email** (100%) - if imported value equals profile email
5. **Exact email local-part** (96%) - imported value matches profile email prefix before `@`
6. **First + Last name match** (95%) - imported first/last name matches `profiles.first_name`/`profiles.last_name` (or derived name parts when those fields are empty)
7. **Contains full/display/username/email-prefix** (~66-92%) - loose contains matching in either direction with ratio-based confidence
8. **Token overlap** (~55-88%) - partial shared-token similarity across identity fields
9. **First name only** (70%) - first token matches first-name candidates
10. **Last name only** (60%) - last token matches last-name candidates
11. **No match** - system marks for new user creation

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
   - Import accepts both `userId` and `selectedUserId` in resolution payloads for compatibility and normalizes internally
   - `Draft Doc Link` and `Actual Publish Date` remain optional; when present, format checks still apply
   - Fallback fill is applied before server validation/upsert:
     - missing `liveUrl` gets site base URL (`https://www.sighthound.com/blog/` or `https://www.redactor.com/blog/`)
     - missing selected `draftDocLink` defaults to `https://docs.google.com/`
     - missing selected `actualPublishDate` inherits `displayPublishDate`
   - Existing records matched by canonical live URL are overwritten with imported core fields and selected optional values (including fallback-filled values).

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
- Input includes: `nameResolutions: Record<string, { action: 'use_existing' | 'create_new', userId?: string, selectedUserId?: string }>`
- Backend uses provided resolutions instead of re-matching
- For unmatched names, backend creates placeholder user profiles using unique `@sighthound.com` email aliases

### Troubleshooting
**"Names don't match expected users"**
1. Check that `profiles.username` is populated
2. Verify user full_name, display_name, and username values
3. Verify profile email values for users expected to match email-based imports
4. Ensure imported names are not misspelled (e.g., \"John Doe\" vs \"Jon Doe\")
5. Try Re-run Resolution to see fresh candidates

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

### "Couldn't create blog. Please try again." (blog creation fails)
1. verify form has valid title, site, and other required fields
2. confirm you have `create_blog` permission (check `/settings/permissions` if admin)
3. date fields (scheduled and display) are freely editable by all users on create and do not require special permissions
4. if sync checkbox behavior seems broken, verify browser console for form submission errors
5. confirm Supabase is reachable and DB trigger `enforce_blog_insert_permissions` is applied (check migration `20260313213000`)

### “Migration 20260313213000 fails with `role_permissions_permission_key_valid`”
1. confirm local migration file includes early constraint drops before legacy remap insert
2. rerun `supabase ... db push --yes`
3. verify local/remote parity with `supabase ... migration list`

### “relation `user_integrations` does not exist” during user create/invite/import
1. confirm migration `20260326103000_harden_auth_user_integrations_trigger.sql` is applied
2. verify auth trigger function writes to `public.user_integrations` (not unqualified `user_integrations`)
3. re-run auth diagnostic create-user check and confirm trigger no longer aborts transaction

### “duplicate key value violates unique constraint `user_integrations_user_id_key`” during provider reconnect
1. verify route `PATCH /api/users/integrations` uses atomic upsert on `user_id` (idempotent reconnect writes)
2. pull latest app code and redeploy API route if environment is behind
3. re-run provider connect from Settings and confirm final persisted status in Connected Services

### “duplicate key value violates unique constraint ... `notification_preferences`” during preference saves
1. verify route `PATCH /api/users/notification-preferences` uses atomic upsert on `user_id`
2. pull latest app code and redeploy API route if environment is behind
3. retry preference save; expected behavior is idempotent upsert without duplicate row inserts

### Duplicate overdue/reminder notifications from overlapping scheduler/manual runs
1. verify current routes are deployed with atomic claim-before-emit logic:
   - `POST /api/social-posts/reminders`
   - `POST /api/social-posts/overdue-checks`
   - `POST /api/blogs/overdue-checks`
2. confirm timestamp columns advance only for rows successfully claimed by the current run
3. if duplicates persist, inspect invocation overlap (scheduler + manual triggers)

### “Concurrent modification detected. Refresh and retry.” from transition APIs
1. this indicates optimistic concurrency guard prevented a stale write
2. refresh data and reapply the intended transition on latest record state
3. verify clients are not issuing duplicate transition requests for the same record

### “Queue sections empty unexpectedly”
1. verify assignment (`writer_id` / `publisher_id`)
2. verify current queue filter and stage state
3. confirm `view_writing_queue` / `view_publishing_queue` permission
### “Dashboard row click opened a different surface than expected”
1. verify `content_type` for the row (`blog` vs `social_post`)
2. expected behavior: blog row opens drawer; social row navigates to `/social-posts/[id]`
3. if selection/bulk appears inconsistent, confirm selection mix:
   - mixed row selection is allowed (blogs + social)
   - blog mutation controls are disabled whenever social rows are selected
### “Dashboard filters seem to affect the wrong content type”
1. verify which filter group is active:
   - Cross-Content Scope affects both blogs and social rows
   - Blog Filters affect blogs only
   - Social Filters affect social rows only
2. check active filter pills for scoped labels (`Blog ...`, `Social ...`, `Workflow (All Content)`, `Delivery (All Content)`)
3. use `Clear all filters` to reset staged filter groups quickly during triage

### “Open/Copy link controls missing on workflow URL fields”
1. verify the surface uses shared `LinkQuickActions` instead of ad-hoc links/buttons
2. check URL value is present (empty values intentionally render disabled controls)
3. confirm alert provider is mounted so copy success/error feedback appears
### “Dashboard export/copy output looks incomplete”
1. confirm whether selected rows include social posts (mixed selected export is supported in Phase A)
2. confirm visible columns in Customize panel (exports follow visible column order)
3. note: URL copy currently exports blog live URLs only by design

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
  - preserves only currently signed-in admin auth/profile context
  - deletes all other auth users, including other admins
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
  | `blog_created` | `blog_created` | Blog created |
  | `writer_assigned` | `writer_assigned` | Writer assigned to blog |
  | `writer_completed` | `writer_completed` | Writer finished draft |
  | `ready_to_publish` | `ready_to_publish` | Blog ready for publishing |
  | `published` | `published` | Blog went live |
  | `social_post_created` | `social_post_created` | Social post created |
  | `social_submitted_for_review` | `social_submitted_for_review` | Social post submitted |
  | `social_changes_requested` | `social_changes_requested` | Changes requested on social post |
  | `social_creative_approved` | `social_creative_approved` | Social creative approved |
  | `social_ready_to_publish` | `social_ready_to_publish` | Social post ready to publish |
  | `social_awaiting_live_link` | `social_awaiting_live_link` | Waiting for live link |
  | `social_published` | `social_published` | Social post published |
  | `social_live_link_reminder` | `social_live_link_reminder` | Reminder to submit live link |

### Channel and DM configuration

**Channel notifications**:
- Default channel: `#content-ops-alerts`
- Configurable via `SLACK_MARKETING_CHANNEL` env var
- Message format (line-based):
  - `[Blog|Social] <Title> (<Site>)`
  - `Action: <action text>`
  - `Assigned to: <name(s) | Team>`
  - `Assigned by: <name | Team>`
  - `Open link: <app-url>` (when content ID exists)

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
   - Attempts channel post (`SLACK_MARKETING_CHANNEL` or `#content-ops-alerts`)
   - Attempts DM to `targetEmail` if configured (even when channel post fails)
   - Uses `chat.postMessage` API
2. **Webhook method** (fallback):
   - Used if bot-token deliveries did not succeed
   - Posts to webhook URL's configured channel
   - No DM capability
3. **No credentials**:
   - Returns delivery/configuration error
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
- Legacy DB toggle columns (`notify_on_*`) are normalized to canonical event keys by API/cache compatibility logic
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
