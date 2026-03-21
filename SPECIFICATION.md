# Sighthound Content Operations — Product Specification
## 1) Product purpose
Sighthound Content Operations is a workflow application for managing content production across:
- `sighthound.com`
- `redactor.com`

It is an operations system (not a CMS). It tracks ownership, workflow stage, scheduling, publication metadata, comments, and audit history.

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
- canonical permission matrix by role
- role templates + configurable subset for managed roles
- admin-locked permissions not editable in role matrix
- permission audit history for changes
- key UI mappings:
  - `edit_scheduled_publish_date` → Scheduled Publish Date fields + calendar reschedule
  - `edit_display_publish_date` → Display Publish Date fields
  - `export_csv` → View Export actions
  - `export_selected_csv` → Selected Export actions

Control plane:
- UI: `/settings/permissions`
- API: `/api/admin/permissions`

Authorization source of truth:
- content mutations are DB-authorized via policies/functions/triggers (UI is assistive, not authoritative)
- administrative endpoints are authorized in the application layer before `service_role` execution

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

## 5) Date model
Primary fields:
- `scheduled_publish_date`
- `display_published_date`
- `actual_published_at`
- `published_at` (compatibility mirror)
- `target_publish_date` (legacy compatibility companion)

Behavior:
- scheduling fields remain compatible with legacy consumers
- publish completion can set publish timestamp

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
- **Data source**: `/api/dashboard/summary` endpoint (see APIs section below)

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
### Dashboard (`/dashboard`)
Primary operations page.

Key behavior:
- navigation separates workflow vs configuration pages
- permissions navigation visible only for admin users
- active nav link uses stronger visual state (highlight + indicator)
- left sidebar stays intentionally clean (no quick filter groups and no recently published block)
- today strip (scheduled this week / ready / delayed) with clickable metric filtering
- delayed definition: scheduled publish date passed while `overall_status != published`
- active filter chips and clear-all control
- action-led empty states:
  - filtered no-results: clear filters / open import
  - no data yet: add new blog / open import
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
- full list expansion with pagination
- urgency tags (`Overdue`, `Due Soon`, `Upcoming`)

### Calendar (`/calendar`)
- month/week views
- month layout grouped by week with weekly blog lines
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
- allowed backward transitions are locked to:
  - `ready_to_publish` → `changes_requested`
  - `awaiting_live_link` → `changes_requested`
- execution-stage rollback to `changes_requested` requires a reason
- moving a social post to `published` requires at least one saved live link (`social_post_links`)

### Social Post Editor (`/social-posts/[id]`)
- guided dedicated editor with 4-step workflow:
  1. Setup (title, platforms, publish date, Canva link/page, product, type)
  2. Link Context (optional associated blog lookup + linked blog actions)
  3. Write Caption (UTF-8 editor focus, formatting tools, grouped copy actions, character guidance)
  4. Review & Publish (checklist validation, role-aware status transition controls, stage-based final action)
- autosave plus explicit stage action in Step 4:
  - draft incomplete → `Save Draft`
  - draft complete → `Submit for Review`
  - creative approved + required fields complete → `Move to Ready to Publish`
  - ready to publish → `Mark Awaiting Live Link`
  - awaiting live link → `Await Live Link` (live links are added in links management surfaces)
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
  - always preserves currently signed-in admin account
  - optional checkbox can remove all other admin profiles/accounts
  - when unchecked, other admin profiles are preserved

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
- **Notification bell integration**: top 5 recent activity notifications with "View History" link and "Clear All" button
- **Data sources**:
  - `access_logs` table (login and dashboard visit events)
  - `blog_assignment_history` table (blog writer/publisher status transitions and assignment changes)
  - `social_post_activity_history` table (social post status transitions and assignment changes)

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
- Admins and those with appropriate roles see their respective queues
- Counts reflect actual assignments (not admin overviews)

## 11) Admin control APIs (logical)
|- `/api/admin/permissions` — permission matrix read/update/reset
|- `/api/admin/reassign-assignments` — assignment transfer
|- `/api/admin/activity-history` — activity cleanup, optional comments cleanup
|- `/api/admin/quick-view` — admin quick-view token generation/session switch support
|- `/api/admin/wipe-app-clean` — full factory reset with optional other-admin deletion flag
## 11) Integrations
Slack via Supabase Edge Function:
- `supabase/functions/slack-notify/index.ts`

Event examples:
- writer assigned/completed
- ready to publish
- published
- social submitted for review / changes requested / creative approved
- social ready to publish / awaiting live link / published
- social live-link reminder

Delivery:
- configured channel
- optional DM resolution by email
- webhook fallback
## 11b) Unified Events System
The application uses a unified event emission system that consolidates notifications and activity history recording into single `emitEvent()` calls. This ensures a single source of truth for workflow events.
### Architecture
- **Event type definition**: `src/lib/unified-events.ts` defines supported event types (e.g., `blog_writer_status_changed`, `blog_publisher_status_changed`, `blog_writer_assigned`)
- **Emission service**: `src/lib/emit-event.ts` handles both notification emission and activity history recording
- **Preference enforcement**: Notifications respect user preferences via `src/lib/notification-helpers.ts`
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
## 17) Blog import name resolution (Step 1.75) (MUST)
This step is mandatory for blog import and exists to prevent duplicate profile creation.
### Functional behavior
- After Step 1.5 (column selection), name resolution runs automatically in the background.
- Resolution processes only valid rows (rows without validation errors).
- Writer and publisher names are deduplicated before resolution request.
- A confirmation modal displays auto-resolved mappings and alternatives.
- Import remains blocked until the user confirms/accepts resolutions.
### Matching fields and priority
Matching attempts against active profiles use this priority:
1. exact `full_name` (100)
2. exact `display_name` (100)
3. exact `username` (100)
4. first+last name match (95)
5. first-name only (70)
6. last-name only (60)
7. none (fallback to create new)
### Data contract updates
- `POST /api/users/resolve-names`
  - input: `{ names: string[] }`
  - output: `{ resolutions: NameResolutionResult[] }`
- `POST /api/blogs/import`
  - accepts `nameResolutions`:
    - `{ [name]: { action: 'use_existing' | 'create_new', userId?: string } }`
### DB support
- `profiles.username` added as unique indexed column for matching.
- Existing profiles can be backfilled from email local-part during migration.

### UI & UX
- UI reflects correct loading/success/error states
- no silent failures in any user flow
- inline validation implemented for all required inputs
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
