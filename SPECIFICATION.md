# Sighthound Content Operations — Product Specification
## 1) Product purpose
Sighthound Content Operations is a workflow application for managing content production across:
- `sighthound.com`
- `redactor.com`

It is an operations system (not a CMS). It tracks ownership, workflow stage, scheduling, publication metadata, comments, and audit history.

### Record-level visibility contract
- Blogs and social posts expose assignment, comments, and record-level activity history to all authenticated users in:
  - detail drawers (latest activity shown first)
  - full record pages/editors
- This is read visibility only and does not change mutation permissions.
- Global/system activity history pages under Settings remain admin-only.

## 2) Scope
### In scope
- blog planning/writing/publishing lifecycle
- queue-first execution UX (dashboard/tasks/calendar)
- kanban pipeline execution view (`/blogs/cardboard`)
- role + permission based access control
- assignment and status audit history
- comments and collaboration trail
- ideas + social posts operational modules
- admin test-data cleanup controls for activity history/comments
- admin quick-view session switching into non-admin user context
- Slack workflow notifications
- legacy XLSX import path

### Out of scope
- rich-text drafting/editing
- public rendering of content
- SEO authoring tools
- media/asset pipeline management

## 3) Roles and permissions model
Supported roles:
- `admin`
- `writer`
- `publisher`
- `editor`

Role model:
- multi-role users are supported (`profiles.user_roles`)
- `profiles.role` remains synchronized primary role

Permission model:
- **Total permissions**: 92 (79 delegable + 13 admin-locked)
- **Default role access**:
  - Admin: All 92 permissions
  - Writer: 28 permissions (blog creation, writing workflow, ideas, social posts, collaboration, dashboard)
  - Publisher: 23 permissions (publishing workflow, social posts, collaboration, dashboard)
  - Editor: 17 permissions (blog editing, idea management, collaboration, dashboard)
- canonical permission matrix by role defined in `public.permission_keys()` and `public.default_role_permissions()`
- role templates + configurable subset for managed roles via `role_permissions` table
- admin-locked permissions (13 total) not editable for non-admin roles:
  - User management: `manage_users`, `assign_roles`, `manage_permissions`
  - Destructive: `delete_blog`, `delete_idea`, `delete_social_post`
  - Overrides & Recovery: `reopen_social_post_brief`, `repair_workflow_state`, `override_writer_status`, `override_publisher_status`, `force_publish`
  - System: `manage_environment_settings`, `edit_actual_publish_timestamp`
- permission audit history for changes logged in `permission_audit_logs`
- **Permission categories**: Blog management (15), Writing workflow (6), Publishing workflow (6), Assignment (6), Scheduling (5), Calendar (4), Collaboration (6), Ideas (5), Social Posts (8), Dashboard (8), Visibility (3), Admin tools (8)
- **Critical fixes (April 1, 2026)**:
  - ✅ Fixed `role_permissions` table population for all non-admin roles
  - ✅ Removed `delete_user` permission (not in database schema)
  - ✅ Added `manage_environment_settings` to locked admin permissions
  - ✅ All 92 permissions synchronized between TypeScript and database
  - See `docs/PERMISSION_FIXES_SUMMARY.md` and `docs/BLOG_CREATION_FIX.md` for details
- **Workflow-critical fields follow ownership rules, not permission toggles**:
  - `google_doc_url`, `live_url` → always editable by assigned writer/publisher via RLS
  - `scheduled_publish_date`, `display_published_date` → editable by assigned writer/publisher or explicit permission
  - task_assignments visibility: all users can READ for transparency; assigned user + admin can UPDATE/DELETE
  - These fields cannot be blocked by permission toggles; ownership is the primary control
- key UI mappings (optional/advanced features):
  - `export_csv`, `export_selected_csv` → View/Export actions
  - `view_dashboard`, `view_my_tasks`, `view_notifications` → Dashboard and notification access
  - `create_idea`, `view_ideas`, `edit_own_idea` → Idea management
  - `create_social_post`, `view_social_posts`, `edit_social_post_brief` → Social post workflows
  - `edit_blog_metadata` → Site and other metadata edits (not workflow-critical)

Control plane:
- UI: `/settings/permissions`
- API: `/api/admin/permissions`
- Reference: `docs/PERMISSIONS.md` for complete permission guide

Authorization source of truth:
- content mutations are DB-authorized via policies/functions/triggers (UI is assistive, not authoritative)
- administrative endpoints are authorized in the application layer before `service_role` execution
- tables in PostgREST-exposed schemas (for example `public`) must keep RLS enabled; maintenance flows run through authorized server APIs instead of disabling RLS

## 4) Workflow model
Stages:
1. Writing
2. Publishing

Operational lifecycle labels used in CardBoard and table-filter deep links:
- `Idea → Writing → Reviewing → Publishing → Published`

Enums:
- `writer_status`: `not_started | in_progress | needs_revision | completed`
- `publisher_status`: `not_started | in_progress | completed`
- `overall_status`: `planned | writing | needs_revision | ready_to_publish | published`

Rules:
- publishing cannot complete before writing completes
- assignee must exist for non-default stage progression
- `overall_status` is derived from stage statuses
- `status_updated_at` advances with stage transitions
- Social record-level activity history readers and writers use canonical history keys (`changed_by`, `event_type`, `field_name`, `old_value`, `new_value`, `changed_at`) for consistent formatting across UI surfaces.

## 5) Date model
Primary fields:
- `scheduled_publish_date` — when the content is planned to be published
- `display_published_date` — the date shown to readers (can differ from scheduled date)
- `actual_published_at` — server timestamp when actually published
- `published_at` (compatibility mirror)
- `target_publish_date` (legacy compatibility companion)

Behavior:
- `display_published_date` is **never NULL**; it always defaults to `scheduled_publish_date` if not explicitly set
- scheduling fields remain compatible with legacy consumers
- publish completion can set publish timestamp
- workflow-critical blog fields follow ownership:
  - assigned writers and publishers can edit `google_doc_url` and `live_url` on their assigned blogs
  - assigned writers and publishers can edit `scheduled_publish_date` and `display_published_date` on their assigned blogs
  - explicit date permissions remain backward-compatible, but ownership is the primary control
- blog creation date behavior:
  - both `scheduled_publish_date` and `display_published_date` can be set freely by any user (no permission gating on insert)
  - UI defaults `scheduled_publish_date` to today
  - UI defaults `display_published_date` to match `scheduled_publish_date` via a sync checkbox
  - sync checkbox allows users to manually override display date while creating
  - when checkbox is checked: display date auto-syncs with scheduled date
  - when checkbox is unchecked: display date becomes independently editable
  - if user unchecks sync, changes scheduled date, then rechecks sync: display date returns to sync with scheduled
  - permission gating applies only to updates after creation (not on initial insert)
- display date fallback rules (handled by database triggers):
  - on INSERT: if `display_published_date` is NULL, silently set to `scheduled_publish_date` or today
  - on UPDATE: if user attempts to set NULL, silently reset to `scheduled_publish_date` instead of rejecting
  - activity logging: silent fallback on default creation; explicit event logged if user manually sets display ≠ scheduled
- edge case: if `display_published_date` is already set and `scheduled_publish_date` changes, the display date **remains unchanged** (user's explicit choice is respected)

## 6) Core UX and pages
### Workspace Home (`/`)
Daily standup dashboard showing personalized work queue at a glance.

Key behavior:
- **Header**: personalized greeting with user name + role badge (top right)
- **Main section**: actionable work buckets showing only items assigned to current user:
  - Writer queue items (not started, in progress, awaiting revision, approved)
  - Publisher queue items (awaiting review, in progress, published)
  - Social post items (awaiting action, in review)
- **High-priority items** (revisions, awaiting approval) highlighted with red background
- **Bucket interactions**: clicking a bucket navigates to `My Tasks` with that filter pre-applied (one-time only, clears on refresh)
- **Empty state**: "All work is on track" with summary when no items pending
- **Bottom buttons**: persistent quick links to `Dashboard` and `Calendar` for context switching
- **My Tasks Snapshot**:
  - shows top mixed assigned items (blogs + social, max 8)
  - grouped into `Required by: <username>` and `Waiting on Others`
  - includes `View all` action to `/tasks`
- **Notification shortcuts alignment**:
  - bell drawer includes `Required by: <username>` shortcut rows sourced from the same tasks-snapshot ownership model
  - shortcut rows deep-link directly to the relevant blog/social detail page
- **Data sources**:
  - `/api/dashboard/summary` for standup counts
  - `/api/dashboard/tasks-snapshot` for grouped mixed-task snapshot

### Login (`/login`)
Primary authentication entry for signed-out users.

Key behavior:
- **OAuth providers** (OIDC):
  - `Continue with Google` (Google Workspace with @sighthound.com email required)
  - `Continue with Slack` (Sighthound Slack workspace required)
- **Fallback**: email/password sign-in (admin-managed accounts)
- **Access restriction**: Login copy clearly states "Use your @sighthound.com account to get started"
- **User provisioning**: First-time OAuth users are auto-created in profiles table with default role `writer`
- **Layout**: Premium split layout with Sighthound logo on left, focused authentication card on right
- **Redirect behavior**:
  - unauthenticated requests to protected routes → /login (via middleware)
  - successful sign-in → workspace home (`/`)
  - app header brand click → workspace home (`/`)

### Connected Services management (`/settings`)
Allows logged-in users to manage provider (Google/Slack) account linking.

Key behavior:
- **OAuth connect flow**:
  - User clicks `Connect` for Google or Slack in Settings
  - App directly initiates `signInWithOAuth()` without leaving Settings
  - Provider login opens in browser (Google Workspace or Slack workspace required)
  - After auth completes, user is redirected back to `/settings?reconnect=provider`
  - Post-OAuth handler detects the reconnect parameter and marks provider as connected via API
  - UI updates immediately with `Connected` badge and `Disconnect` button
- **OAuth disconnect flow**:
  - User clicks `Disconnect` for a provider
  - App sends PATCH request to mark provider as disconnected
  - UI updates with `Connect` button restored
- **Status persistence**:
  - Integration state (google_connected, slack_connected) is fetched on component mount
  - State is cached in local component state during user's Settings session
  - `PATCH /api/users/integrations` persists provider state using atomic upsert on `user_id` so repeated reconnect callbacks remain idempotent
  - Note: This is independent of sign-in method; connecting a provider does not affect how user logs in next time
- **Connection independence**:
  - Logging in with Google does not automatically mark Google as "connected" in Settings
  - Users control which providers show as connected via explicit Settings actions
  - This respects user privacy and avoids forcing provider linkage when they may not want notifications/integrations from that provider
### Dashboard (`/dashboard`)
Primary operations page.

Key behavior:
- navigation separates workflow vs configuration pages
- permissions navigation visible only for admin users
- active nav link uses stronger visual state (highlight + indicator)
- app shell sidebar supports two persistent states:
  - expanded `240px` (icon + label)
  - collapsed `72px` (icon-only)
- sidebar and content are rendered in separate columns so toggling sidebar state shifts content instead of overlaying it
- sidebar root is viewport-anchored (`sticky top-0 h-screen`) to keep navigation visible
- sidebar uses a fixed header/toggle row and optional fixed footer row
- only the middle nav region scrolls (`flex-1 overflow-y-auto`); root sidebar must not scroll
- sidebar nav scroll resets intentionally to top on route pathname changes
- when `prefers-reduced-motion` is enabled, sidebar toggle/nav transitions are disabled while layout updates remain immediate
- collapsed nav labels must be shown with application tooltips on hover/focus
- collapsed sidebar label affordance must not rely on browser `title` attributes
- tooltip rendering must be portal-based, viewport-aware, and layered above drawer/modal surfaces
- collapsed sidebar must support keyboard tab navigation with:
  - visible focus ring on each focused nav item
  - tooltip label display on focus
- toggling sidebar while focus is inside sidebar must preserve focus predictably:
  - no focus jump to `document.body`
  - fallback target is the sidebar toggle control
- collapsed active item must remain visually obvious without text:
  - dark background highlight
  - high-contrast icon color
- collapsed nav click target must remain usable:
  - minimum ~40–44px row height
  - icon centered inside full-row clickable target
  - no dead zones around icon (row remains clickable)
- icon-only recognition must avoid reused ambiguous icons (CardBoard uses dedicated kanban icon)
- left sidebar stays intentionally clean (no quick filter groups and no recently published block)
- overview strip uses cross-content cards with clickable filtering:
  - `Open Work`
  - `Scheduled Next 7 Days`
  - `Awaiting Review`
  - `Ready to Publish`
  - `Awaiting Live Link`
  - `Published Last 7 Days`
- filter surface is role-agnostic (all users get the same dashboard filters)
- filter grid scales to a 4-column layout on large screens
- filter groups are explicit:
  - Row 1 (Search Context): `Sites`, `Writers`, `Publishers`, `Stage`
  - Row 2 (Workflow State): `Writer Status`, `Publisher Status`, `Cross Workflow`, `Cross Delivery`
- active filters are rendered via a single canonical pill surface (no duplicate chip bars)
- bulk panel appears whenever rows are selected; mutation controls stay permission-gated but visible in disabled state with helper text
- delayed definition: scheduled publish date passed while `overall_status != published`
- active filter chips and clear-all control
- action-led empty states:
  - filtered no-results: clear filters / open import
  - no data yet: add new blog / open import
- delete confirmation contract:
  - all delete actions use shared in-app confirmation modal
  - browser `window.confirm` is not used for delete UX
  - toast/alert action buttons are not used as primary delete confirmations
- **Phase 4C**: Unified DataTable with:
  - two-line clamped titles
  - site badges (`SH`, `RED`)
  - urgency/state row tones
  - inline writer/publisher stage controls (permission-gated)
  - click-to-sort on column headers
  - consistent pagination and density controls
- export controls (permission-gated)
- edit columns popover
- bulk actions (permission-gated)
- right-side detail panel
- bottom pagination controls

### Blog Library (`/blogs`)
Reference-first index for historical and published content lookup.

Key behavior:
- default dataset: published records, newest first by `display_published_date`
- lightweight table for copy/paste and lookup workflows
- searchable by title/url
- stage/site/status filters
- row-level (hover-revealed) and bulk copy actions for title/url
- export scope behavior:
  - View Export: CSV + PDF
  - Selected Export: CSV

### CardBoard (`/blogs/cardboard`)
- kanban board with stages (`Idea`, `Writing`, `Reviewing`, `Publishing`, `Published`)
- drag-and-drop transitions with permission checks and required-field validation
- fast idea creation directly in board lane
- table-view deep-linking by stage filter

### Tasks (`/tasks`)
- top-3 priority items first
- top-3 priority list is mixed across blogs + social posts
- full list expansion with pagination
- urgency tags (`Overdue`, `Due Soon`, `Upcoming`)
- assignment-based visibility:
  - show all non-published items assigned to the current user
  - include rows even when next action is currently owned by another user
- social action ownership is stage-derived for action-state classification:
  - `draft`, `changes_requested`, `ready_to_publish`, `awaiting_live_link` → worker-owned
  - `in_review`, `creative_approved` → reviewer-owned
- action-state controls:
  - `All Action States`
  - `Required by: <username>`
  - `Waiting on Others`
- social tasks section reflects all rows that match current filters (not capped preview-only subset)

### Calendar (`/calendar`)
- month/week views
- month layout grouped by week with compact per-day cards
- month day tiles show up to 3 visible items and use a `+N more` overflow affordance
- selecting `+N more` switches to week view focused on that date
- month rendering avoids nested per-tile scroll regions to reduce wheel jitter/flicker
- drag-and-drop rescheduling (permission-gated)
- published blogs non-draggable
- unscheduled bucket with pagination

### Blog detail (`/blogs/[id]`)
- role-aware edits
- comments + activity timeline
- assignment and stage management with permission checks

### Ideas (`/ideas`)
- idea intake and management
- comments/references remain visible by default on idea cards
- single edit path through the `Edit Idea` modal (title/site/comments-references)
- creator/admin-gated delete action on idea cards with destructive-action confirmation
- conversion paths toward:
  - blog workflow (`Convert to Blog`)
  - social post workflow (`Convert to Social Post`)

### Social Posts (`/social-posts`)
- social workflow operations connected to content planning
- canonical social status model:
  - `draft`
  - `in_review`
  - `changes_requested`
  - `creative_approved`
  - `ready_to_publish`
  - `awaiting_live_link`
  - `published`
- board drag/drop and side-panel status edits are restricted to valid stage transitions
- status transitions are API-authoritative (`POST /api/social-posts/[postId]/transition`)
- transition endpoint returns conflict when concurrent writes modify the same post before update commit
- allowed backward transitions are locked to:
  - `ready_to_publish` → `changes_requested`
  - `awaiting_live_link` → `changes_requested`
- execution-stage rollback to `changes_requested` requires a reason
- rollback/reopen reason capture uses in-app modal dialogs (no browser prompt flows)
- moving a social post to `published` requires at least one saved live link (`social_post_links`)
- deleting a social post is idempotent and safe when live links exist; link-removal activity logging is best-effort and skipped if the parent post is already removed by cascade delete

### Social Post Editor (`/social-posts/[id]`)
- guided dedicated editor with 4-step workflow:
  1. Setup (title, platforms, publish date, Canva link/page, product, type)
  2. Link Context (optional associated blog lookup + linked blog actions)
  3. Write Caption (UTF-8 editor focus, formatting tools, grouped copy actions, character guidance)
  4. Review & Publish (checklist validation, role-aware status transition controls, live-link URL management, stage-based final action)
- autosave plus explicit stage action in Step 4:
  - draft incomplete → `Save Draft`
  - draft complete → `Submit for Review`
  - creative approved + required fields complete → `Move to Ready to Publish`
  - ready to publish → `Mark Awaiting Live Link`
  - awaiting live link without links → `Await Live Link`
  - awaiting live link with at least one saved link → `Submit Link` (transitions to `published`)
- execution-stage brief lock:
  - `ready_to_publish` and `awaiting_live_link` are read-only for brief fields
  - admin-only `Edit Brief` action calls `POST /api/social-posts/[postId]/reopen-brief`
  - reopen always returns status to `creative_approved`
- `published` transition is DB-enforced and requires at least one valid live link

### Settings (`/settings`)
- `My Profile` section for all personal preferences:
  - first name, last name, display name
  - personal timezone (default: US Eastern)
  - week start day
  - draft attention threshold (days)
- `Access & Oversight` section for quick-view session switching and permissions panel entry
- team administration sections:
  - `Create User Account`
  - `Reassign User Work`
  - `User Directory` with role and status filters
- `Activity History` page:
  - Non-admins view their own dashboard visits only
  - Admins can filter by event type (All/Login/Dashboard) and user (All Users or specific user)
  - Timestamps shown in user timezone (non-admin) or UTC (admin)
- admin-only activity history cleanup (global or user-scoped)
- optional comments cleanup during history purge
- admin-only wipe app clean (full factory reset)
  - preserves only currently signed-in admin account
  - removes all other auth users, including other admins
- quick-view entry behavior:
  - admin quick-view mode redirects impersonated sessions to `/tasks?action=action_required`
  - this ensures quick-view sessions begin on next-step-required-by-user workload

### Activity History (`/settings/access-logs`)
Admin-accessible unified activity history page for tracking all operational events across the system.

Key behavior:
- **Admin-only access**: non-admins cannot view this page
- **Multi-select filtering**:
  - Activity Type Filter: Checkboxes for selecting multiple activity types (`login`, `dashboard_visit`, `blog_writer_status_changed`, `blog_publisher_status_changed`, `blog_assignment_changed`, `social_post_status_changed`, `social_post_assignment_changed`)
  - User Filter: Checkboxes for selecting multiple users (all selected by default on page load)
  - Filter logic: OR within activity types, AND across activity types and users
- **Timestamps**: displayed in user's configured timezone (admins default to UTC for consistency)
- **Table columns**: Category (login/dashboard/blog activity/social post activity), Action (event description), Content (blog/post title, or "—" for access logs), User, Email, Timestamp
- **Content links**: Blog activities link to blog detail page; social post activities link to social post page
- **Message language**: action titles and change summaries are operator-friendly and avoid raw field keys, enum values, and UUID exposure
- **Notification bell integration**: top 5 recent activity notifications with "View History" link and "Clear All" button
- **Data sources**:
  - `access_logs` table (login and dashboard visit events)
  - `blog_assignment_history` table (blog writer/publisher status transitions and assignment changes)
  - `social_post_activity_history` table (social post status transitions and assignment changes)

## Notification architecture
- Notification generation is event-driven and centralized.
- Workflow events are defined in `src/lib/unified-events.ts`.
- `emitEvent()` is the shared entry point for recording activity history and validating downstream notification generation.
- Slack is a delivery channel, not a separate workflow source of truth.
- Reminder and overdue APIs emit unified events rather than sending direct Slack-only notifications.
- Reminder/overdue routes claim target rows atomically before event emission to avoid duplicate notifications from overlapping runs.
- User preference writes (`PATCH /api/users/notification-preferences`) are idempotent through atomic upsert on `user_id`.
- Connector status writes (`PATCH /api/users/integrations`) are idempotent through atomic upsert on `user_id`.

Covered reminder/overdue events:
- `social_review_overdue`
- `social_publish_overdue`
- `blog_publish_overdue`
- `social_post_live_link_reminder`

Expected behavior:
- activity history and notification delivery stay aligned for the same workflow event
- user notification preferences apply consistently to in-app and Slack notifications
- new workflow notifications should extend the unified event system instead of adding route-level Slack-specific logic

### Password Reset (Test-Only)
Admin-only feature at Settings → User Directory → Edit User → Reset Password section.

Key behavior:
- visible only to admins
- password must be minimum 8 characters
- uses Supabase admin auth to set password
- user can then log in with new password immediately
- **Important**: this feature is temporary and for testing purposes only; will be removed before production

### Permissions (`/settings/permissions`)
- role-level configurable permission matrix
- reset managed role to defaults
- permission audit log

## 6.4) Timezone and Date Display (MUST)
All timestamps and date displays throughout the app must respect the logged-in user's timezone preference from `profiles.timezone`.
- **Default timezone**: US Eastern (`America/New_York`) if user has not set a preference
- **Non-admin users**: All timestamps display in their personal timezone
- **Admin users viewing other users**: Timestamps may display in UTC for consistency when appropriate
- **Implementation**: Use centralized timezone-aware formatting utility (`formatDateInTimezone`, `formatShortDateInTimezone`, `formatTimeInTimezone` from `src/lib/format-date.ts`)
- **Examples**: Blog creation timestamps, activity history, calendar dates, comment timestamps, history entry timestamps

## 6.5) Iconography and visual consistency (MUST)
- UI iconography uses a single open-source line icon set (`lucide-react`)
- emoji-based icons are not used for controls, statuses, or notifications
- icon rendering is centralized via shared app mapping (`AppIcon` + `AppIconName`)
- icons must render in explicit bounding boxes for stable alignment in tables, lists, and controls
- icon stroke/size should remain visually consistent across comparable surfaces

## 7) Error Handling & Edge Cases (MUST)
Defines how the system behaves outside the happy path. Applies to all modules.

### Error categories
Validation errors
- shown inline at field level
- must clearly state what is wrong and how to fix it
- must block submission until resolved

System errors
- shown via toast with fallback message
- must not expose raw errors or stack traces
- must not break UI layout or navigation

Permission errors
- must clearly indicate lack of access
- must not silently fail or hide action outcomes

### Mutation failure behavior
- failed mutations must not leave UI in partial or inconsistent state
- UI must revert or remain unchanged if mutation fails
- all failures must produce visible feedback

### Edge cases (MUST be handled)
- empty states (no blogs, no tasks, no results)
- invalid inputs (dates, URLs, required fields)
- permission denial mid-action
- network/API failure
- bulk action partial failures (must return row-level results)

### Loading states
- all async actions must show visible loading state
- inputs/actions must be disabled during processing
- no duplicate submissions allowed

## 8) Search & Filter Consistency (MUST)
Defines consistent behavior across all searchable/filterable modules:
- Blogs
- Social Posts
- Ideas
- Dashboard tables
- Blog linking in Social Posts

### Search behavior
- case-insensitive matching
- partial match support
- real-time results with debounce
- search must work on:
  - title
  - URL/slug (where applicable)

### Filter behavior
Filters must:
- update results immediately
- reflect active state visually
- combine logically when multiple filters are selected (AND behavior)
- support a clear-all action that resets to default dataset

### Persistence
- filters and sorting persist within session
- navigation between pages should not unintentionally reset filters

### Empty results
- show clear no-results-found state
- never show blank or broken UI

## 8.5) Contract-Driven Engineering Baseline (MUST)
All behavior-critical interfaces are treated as explicit contracts to prevent drift and silent regressions.

### API contract baseline
- All API routes under `src/app/api/**/route.ts` are normalized through `src/lib/api-contract.ts`.
- Success responses include `success: true`.
- Error responses include:
  - `success: false`
  - `error` (human-readable)
  - `errorCode` (machine-readable, stable)
- Contract version is exposed in `x-api-contract-version` response header.
- Request bodies are validated at route boundaries (schema-first).
- Frontend consumers must parse API responses through `src/lib/api-response.ts` and treat either `!response.ok` or `success: false` as failures.
- User-facing and logged error paths should read normalized `error` and `errorCode` instead of raw transport text.
- Non-JSON and edge responses (file downloads, streaming responses, redirects, `204/205/304` no-body responses) are explicit pass-through responses and are not force-wrapped into JSON envelopes.
- Frontend parsing for these edge responses must remain safe (`parseApiResponseJson` returns an empty object for non-JSON/no-body responses).

### Component contract baseline
- Reusable components are treated as API surfaces.
- `DataTable` contract invariants:
  - fixed row heights by density
  - plain-text cells always single-line truncate with tooltip fallback
  - pagination compatibility via shared table controls/utilities (`src/lib/table.ts`, `src/components/table-controls.tsx`)

### Workflow contract baseline
- Workflow transitions and required-field gates remain centralized and authoritative.
- UI cannot bypass transition constraints.
- Social transition authority remains API-first via `/api/social-posts/[postId]/transition`.
- Social transition field contract:
  - create (`draft`): requires `product`, `type`, `reviewer_user_id`; `title` is optional
  - `draft` → `in_review`: requires `product`, `type`, `canva_url`
  - `in_review` → `creative_approved`: requires `product`, `type`, `canva_url`, `platforms`, `caption`, `scheduled_date`
  - `awaiting_live_link` → `published`: requires at least one persisted live link
  - non-admin writers can edit brief fields in `draft` and `changes_requested`
  - admins can edit brief fields in any stage
  - in `awaiting_live_link`, non-admin users are restricted to live-link submission
  - transition payloads persist `associated_blog_id` to avoid linked-blog value loss between stages

### No-bypass mutation rule
- Operational state mutations must flow through contract boundaries:
  - client action → validated API route → DB mutation
- Direct/bypass mutation paths are not allowed for workflow state changes.

## 9) Data model (logical)
Core tables:
- `profiles`
- `blogs`
- `blog_assignment_history`
- `blog_comments`
- `role_permissions`
- `permission_audit_logs`
- `social_post_activity_history`
- `social_post_comments`
- `access_logs` (user login and dashboard visit tracking)

Additional modules:
- `blog_ideas`
- `social_posts` and supporting social tables

Highlights:
- profiles support multi-role representation
- blogs carry stage, ownership, and schedule/publish fields
- history/comments support operational traceability
- permission tables drive effective capability resolution
- access_logs table is immutable and tracks login/dashboard visits for audit
- quick-view state is client-side snapshot state (browser local storage), not persisted in DB

## 10) Dashboard & Standup APIs
### GET `/api/dashboard/summary`
Returns aggregated work counts for the daily standup home page.

**Authorization**: requires `view_writing_queue` permission

**Response**:
```
{
  writerCounts: {
    not_started: number,
    in_progress: number,
    needs_revision: number,
    completed: number
  },
  publisherCounts: {
    not_started: number,
    in_progress: number,
    completed: number
  },
  socialPostCounts: {
    awaiting_live_link: number,
    in_review: number
  },
  userRoles: string[]
}
```

**Filtering logic**:
- **Writer counts**: blogs where `writer_id = current_user.id` AND `overall_status != "published"`
- **Publisher counts**: blogs where `publisher_id = current_user.id` AND `writer_status = "completed"` AND `overall_status != "published"`
- **Social post counts**: social posts where `status IN ["awaiting_live_link", "in_review"]`
- **Social post scope**: social counts are assignment-scoped to current user ownership/relevance (not global)
- Admins and those with appropriate roles see their respective queues
- Counts reflect actual assignments (not admin overviews)

## 11) Admin control APIs (logical)
|- `/api/admin/permissions` — permission matrix read/update/reset
|- `/api/admin/reassign-assignments` — assignment transfer
|- `/api/admin/activity-history` — activity cleanup, optional comments cleanup
|- `/api/admin/quick-view` — admin quick-view token generation/session switch support
|- `/api/admin/wipe-app-clean` — full factory reset preserving only the signed-in admin account
## 11) Integrations
Slack via Supabase Edge Function:
- `supabase/functions/slack-notify/index.ts`

Event examples:
- blog created
- social post created
- writer assigned/completed
- ready to publish
- published
- social submitted for review / changes requested / creative approved
- social ready to publish / awaiting live link / published
- social live-link reminder

Delivery:
- configured channel (default `#content-ops-alerts` unless overridden by `SLACK_MARKETING_CHANNEL`)
- optional DM resolution by email (attempted even if channel post fails)
- webhook fallback when bot-token deliveries do not succeed
- connected-services bootstrap rows in `user_integrations` are created by an auth trigger path that must not block user provisioning
- Slack display contract for all Slack-enabled notifications:
  - line 1: `[Blog|Social] <Title> (<Site>)`
  - line 2: `Action: <action text>`
  - line 3: `Assigned to: <resolved user name(s) | Team>`
  - line 4: `Assigned by: <resolved actor name | Team>`
  - line 5 (optional): `Open link: <app-url>` when a deep link is available
  - role labels are display-invalid for assignee/actor lines and must be normalized to user names or `Team`
## 11b) Unified Events System
The application uses a unified event emission system that consolidates notifications and activity history recording into single `emitEvent()` calls. This ensures a single source of truth for workflow events.
### Architecture
- **Event type definition**: `src/lib/unified-events.ts` defines supported event types (e.g., `blog_writer_status_changed`, `blog_publisher_status_changed`, `blog_writer_assigned`)
- **Emission service**: `src/lib/emit-event.ts` handles both notification emission and activity history recording
- **Preference enforcement**: Notifications respect user preferences via `src/lib/notification-helpers.ts`
- **Preference compatibility normalization**: API/cache normalize legacy DB `notify_on_*` fields into canonical keys (`task_assigned`, `stage_changed`, `awaiting_action`, `mention`, `submitted_for_review`, `published`, `assignment_changed`)
- **React components**: Dynamic imports of `emitEvent()` in handlers (React context requires async imports)
### Event Types (Blog Workflow)
- `blog_writer_status_changed` — Writer stage transition (triggers `stage_changed` notification type)
- `blog_publisher_status_changed` — Publisher stage transition (triggers `stage_changed` notification type)
- `blog_writer_assigned` — Writer assignment change (triggers `task_assigned` notification type)
- `blog_publisher_assigned` — Publisher assignment change (triggers `task_assigned` notification type)
### Implementation Example (Blog Detail Page)
```typescript
const unifiedEvent = {
  type: "blog_writer_status_changed",
  contentType: "blog",
  contentId: blog.id,
  oldValue: previousStatus,
  newValue: form.writer_status,
  fieldName: "writer_status",
  actor: user?.id ?? "",
  actorName: profile?.full_name ?? undefined,
  contentTitle: blog.title,
  timestamp: Date.now(),
};

const { emitEvent } = await import("@/lib/emit-event");
const { getNotificationFromEvent } = await import("@/lib/emit-event");

await emitEvent(unifiedEvent);  // Records activity history + validates notification
pushNotification(getNotificationFromEvent(unifiedEvent));  // Emits in-app notification
```
### Activity History Recording
All unified events are automatically recorded to `blog_assignment_history` or `social_post_activity_history` tables via `/api/events/record-activity` endpoint. This provides a complete audit trail without requiring separate logging logic.
### Migration Path
Legacy `pushNotification()` calls continue working. New code adopts `emitEvent()` incrementally. See `docs/UNIFIED_EVENTS_MIGRATION.md` for detailed migration guide and examples.
## 11c) Dashboard Unified Content Table Contract
The dashboard list surface is a unified cross-content table driven by a shared row contract (`DashboardContentRow`) that merges blog and social records.
### Core row fields (required)
- `content_type`
- `site`
- `id`
- `title`
- `status_display`
- `lifecycle_bucket`
- `scheduled_date`
- `published_date`
- `owner_display`
- `updated_at`
### Optional fields
- `product` (social-focused, customizable column)
### Interaction contract
- Blog row click opens blog details drawer.
- Social row click navigates to `/social-posts/[id]`.
- Phase A enables mixed checkbox selection across blogs and social rows.
- Blog mutation actions remain gated to blog-only selections; controls disable when social rows are included.
- Social bulk mutations are intentionally deferred and not executed in Phase A.
### Staged filter rollout contract
- Stage 1 (UI + safety): explicit grouped headings and renamed scoped labels for cross-content/blog/social filter sets.
- Stage 1 (scope safety): blog-only filters are pass-through for social rows, and social-only filters are pass-through for blog rows.
- Stage 2 (social-aware wiring): social-specific predicates are active for `Social Status` and `Social Product` when filtering unified dashboard rows.
### Export/copy contract
- CSV/PDF export runs on the unified visible column model.
- URL copy is blog-only (social rows contribute no blog live URL values).
## 12) Environment requirements
Frontend:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_APP_URL`

Server/import:
- `SUPABASE_SERVICE_ROLE_KEY`
- `IMPORT_CREATED_BY_USER_ID`
- optional `LEGACY_XLSX_PATH`

Slack:
- `SLACK_BOT_TOKEN`
- `SLACK_MARKETING_CHANNEL`
- `SLACK_WEBHOOK_URL`
## 13) Migration and compatibility status
The project is migration-driven (`supabase/migrations`) with compatibility layers for:
- legacy/expanded role model transitions
- status trigger and enum transition safety
- social workflow authority + event normalization (`20260321133000_social_workflow_authority_and_event_normalization.sql`)
- comments actor compatibility (`user_id` / `created_by`)
- import collision prevention via deterministic hash
- permission matrix introduction + expansion migrations
- public-table RLS hardening + import-log policies (`20260325111500_enable_public_table_rls.sql`)
- auth-user creation trigger hardening (`20260325201000_harden_auth_user_creation_trigger.sql`)
- auth-user trigger diagnostics RPC (`20260325202500_auth_user_creation_diagnostics.sql`)
- comprehensive RLS normalization (`20260326100000_enforce_comprehensive_rls_policies.sql`)
- auth integrations trigger hardening (`20260326103000_harden_auth_user_integrations_trigger.sql`) to prevent `relation "user_integrations" does not exist` failures from aborting auth user creation
- social-link delete audit guard (`20260326113000_guard_social_post_link_delete_audit.sql`) to prevent FK failures during cascade deletes
- wipe cleanup hardening (`20260326123000_fix_wipe_app_clean_preserve_current_admin.sql`) to preserve only signed-in admin while deleting all other app data
- runtime compatibility retirement:
  - dashboard/task/blog runtime routes now target canonical blog date columns directly (no legacy date-column fallback branch)
  - blog comment runtime reads/writes use canonical `blog_comments.user_id` (legacy `created_by` runtime fallback retired)
  - dashboard summary/snapshot APIs use canonical social ownership fields (`assigned_to_user_id`, `worker_user_id`, `reviewer_user_id`, `created_by`) without legacy ownership fallback branches
## 14) Non-functional requirements
- fast workflow execution
- deterministic DB-level invariants for workflow integrity
- high traceability (history + comments + permission audits)
- low-cognitive-load UI for operational scanning
- predictable filter/search behavior with immediate visual state feedback
## 15) Implementation phases
### Phase 4A: UI Foundation ✅ COMPLETE
1. AppShell layout and navigation patterns
2. DataPageHeader, DataPageToolbar, DataPageFilterPills reusable components
3. FilterBar system for consistent filtering across pages
4. StatusBadgeSystem (WriterStatusBadge, PublisherStatusBadge, StageBadges)

### Phase 4B: Command Palette & Global Quick Create ✅ COMPLETE
1. Global command palette (⌘K shortcut)
2. Quick create modal for workflows
3. Navigation integration and context awareness

### Phase 4C: DataTable Migrations ✅ COMPLETE
1. Dashboard migrated to unified DataTable + FilterBar system
2. Social Posts migrated with sorting, filtering, pagination, inline editing
3. Tasks migrated with inline status updates and row highlighting
4. Blogs migrated with row selection, copy utilities, and export controls
5. All four pages use consistent DataTable component and column definitions
6. Zero dead code, production-ready code quality
7. TypeScript 0 errors, ESLint 0 errors on migrated pages

## 16) Definition of Done (MUST)
A feature is considered complete only if all of the following are satisfied:

### Data & backend
- database schema and constraints updated (if required)
- all workflow rules enforced at DB level
- API validates input data and permissions
- all mutations are atomic (no partial updates)

### Permissions
- Supabase RLS policies implemented and verified
- access rules enforced independently of UI
- no PostgREST-exposed `public` table is left with RLS disabled
## 17) Blog import name resolution (Step 1.75) (MUST)
This step is mandatory for blog import and exists to prevent duplicate profile creation.
### Functional behavior
- After Step 1.5 (column selection), name resolution runs automatically in the background.
- Resolution processes only valid rows (rows without validation errors).
- Writer and publisher names are deduplicated before resolution request.
- A confirmation modal displays auto-resolved mappings and alternatives.
- Import remains blocked until the user confirms/accepts resolutions.
- `draftDocLink` and `actualPublishDate` are optional import fields; when present, they must pass URL/date format checks.
- Deterministic fallback fill is applied before validation/upsert:
  - Missing `liveUrl` + SH/sighthound site aliases → `https://www.sighthound.com/blog/`
  - Missing `liveUrl` + RED/redactor site aliases → `https://www.redactor.com/blog/`
  - Missing `draftDocLink` when selected → `https://docs.google.com/`
  - Missing `actualPublishDate` when selected → copy `displayPublishDate`
- Existing blog rows (matched by canonical live URL) are updated by overwriting imported core fields and applying selected optional-field values/fallbacks.
### Matching fields and priority
Matching attempts against active profiles are confidence-scored first, then tie-broken by this priority:
1. exact `full_name` (100)
2. exact `display_name` (100)
3. exact `username` (100)
4. exact `email` (100)
5. exact email local-part (before `@`) (96)
6. first+last name match via `first_name`/`last_name` (or derived name parts) (95)
7. loose contains match across full/display/username/email-local (~66-92)
8. token-overlap similarity (~55-88)
9. first-name only (70)
10. last-name only (60)
11. none (fallback to create new)
### Data contract updates
- `POST /api/users/resolve-names`
  - input: `{ names: string[] }`
  - output: `{ resolutions: NameResolutionResult[] }`
- `POST /api/blogs/import`
  - accepts `nameResolutions`:
    - `{ [name]: { action: 'use_existing' | 'create_new', userId?: string, selectedUserId?: string } }`
  - both `userId` and `selectedUserId` are accepted for compatibility
  - unmatched names are provisioned as placeholder users with unique `@sighthound.com` emails
  - applies import fallbacks server-side prior to validation:
    - site-based fallback `liveUrl` base
    - selected-column fallback for missing `draftDocLink`
    - selected-column fallback for missing `actualPublishDate`
### DB support
- `profiles.username` added as unique indexed column for matching.
- Existing profiles can be backfilled from email local-part during migration.

### UI & UX
- UI reflects correct loading/success/error states
- no silent failures in any user flow
- inline validation implemented for all required inputs
- high-value workflow URLs use shared in-place `Open` + `Copy` actions (`LinkQuickActions`) with global feedback and disabled-empty states
- edge cases handled:
  - empty states
  - invalid input
  - permission denial
  - API failure

### Tables, search, and interaction
- tables follow layout invariants (fixed height, truncation, pagination)
- search and filters follow consistency rules
- bulk actions provide per-row success/failure results

### Documentation
Documentation updated:
- `AGENTS.md` (if rules affected)
- `SPECIFICATION.md` (this document)
- `HOW_TO_USE_APP.md`
- `OPERATIONS.md`
- `README.md` (if applicable)

### Validation
- feature passes manual workflow validation:
  - Create → Assign → Progress → Complete → Publish (if applicable)
