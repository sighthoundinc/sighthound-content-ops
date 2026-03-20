# Sighthound Content Operations — Product Specification
## 1) Product purpose
Sighthound Content Operations is an internal workflow application for managing content production across:
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
### Dashboard (`/dashboard`)
Primary operations page.

Key behavior:
- navigation separates workflow vs configuration pages
- permissions navigation visible only for admin users
- active nav link uses stronger visual state (highlight + indicator)
- clickable queue filters and pipeline chips (filter-only behavior)
- writing queue labels: `Drafting`, `Needs Revision`, `Ready for Publishing`, `Backlog`
- publishing queue labels: `Not Started`, `In Progress`, `Final Review`, `Published`
- today strip (scheduled this week / ready / delayed) with clickable metric filtering
- delayed definition: scheduled publish date passed while `overall_status != published`
- active filter chips and clear-all control
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
- urgency tags (`⚠ Overdue`, `Due Soon`, `Upcoming`)

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

### Social Post Editor (`/social-posts/[id]`)
- guided dedicated editor with 4-step workflow:
  1. Setup (title, platforms, publish date, Canva link/page, product, type)
  2. Link Context (optional associated blog lookup + linked blog actions)
  3. Write Caption (UTF-8 editor focus, formatting tools, grouped copy actions, character guidance)
  4. Review & Publish (checklist validation, status transition controls, stage-based final action)
- autosave plus explicit stage action in Step 4:
  - draft incomplete → `Save Draft`
  - draft complete → `Move to Review`
  - in review complete → `Mark Published`

### Settings (`/settings`)
- profile fields
- admin user/role management
- timezone configuration
- admin-only activity history cleanup (global or user-scoped)
- optional comments cleanup during history purge
- admin quick-view as non-admin user, with return-to-admin flow

### Permissions (`/settings/permissions`)
- role-level configurable permission matrix
- reset managed role to defaults
- permission audit log

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

Additional modules:
- `blog_ideas`
- `social_posts` and supporting social tables

Highlights:
- profiles support multi-role representation
- blogs carry stage, ownership, and schedule/publish fields
- history/comments support operational traceability
- permission tables drive effective capability resolution
- quick-view state is client-side snapshot state (browser local storage), not persisted in DB

## 10) Admin control APIs (logical)
- `/api/admin/permissions` — permission matrix read/update/reset
- `/api/admin/reassign-assignments` — assignment transfer
- `/api/admin/activity-history` — activity cleanup, optional comments cleanup
- `/api/admin/quick-view` — admin quick-view token generation/session switch support
## 11) Integrations
Slack via Supabase Edge Function:
- `supabase/functions/slack-notify/index.ts`

Event examples:
- writer assigned/completed
- ready to publish
- published

Delivery:
- configured channel
- optional DM resolution by email
- webhook fallback
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
- comments actor compatibility (`user_id` / `created_by`)
- import collision prevention via deterministic hash
- permission matrix introduction + expansion migrations
## 14) Non-functional requirements
- fast internal workflow execution
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
