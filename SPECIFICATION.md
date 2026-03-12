SPECIFICATION.md
PROJECT NAME
Sighthound Content Operations Dashboard
PRODUCT SUMMARY
Sighthound Content Operations is an internal workflow system for planning, writing, publishing, and tracking blog content across:
- sighthound.com
- redactor.com
The product is a coordination and operations tool, not a CMS. It tracks assignments, status, dates, links, comments, and activity history while enforcing role-based access through Supabase RLS and DB triggers.
SCOPE
In Scope
- End-to-end blog production tracking from planning to published state
- Dashboard operations UI with filtering, sorting, pagination, bulk actions, and column controls
- Calendar planning and scheduling experience
- Blog comments and assignment/activity history
- Role-aware permissions with multi-role support
- Slack notifications for key workflow events
- Legacy spreadsheet import for initial data migration
Out of Scope
- Rich text authoring/editing of blog body content
- Public website rendering
- SEO/content optimization tooling
- Asset management pipeline
USERS, ROLES, AND PERMISSIONS
Supported roles
- admin
- writer
- publisher
- editor (supported role value for assignment and authorization model)
Multi-role model
- Users can hold multiple roles via `profiles.user_roles`.
- `profiles.role` remains as the primary role value and is synchronized with `user_roles`.
- Authorization checks are role-set aware (not single-role only).
Permission baseline
- Admin: full operational access across records, settings, and user administration.
- Writer: can work assigned writing records and writing-related fields/actions.
- Publisher: can work assigned publishing records and publishing-related fields/actions.
- Non-admin users cannot perform admin-only reassignment or global management actions.
WORKFLOW MODEL
Stages
1. Writing
2. Publishing
Status enums
- writer_status: `not_started`, `in_progress`, `needs_revision`, `completed`
- publisher_status: `not_started`, `in_progress`, `completed`
- overall_status: `planned`, `writing`, `needs_revision`, `ready_to_publish`, `published`
Overall status derivation
`overall_status` is derived by DB logic and is not user-editable.
Operational constraints
- Publishing cannot be completed before writing is completed.
- Writer/publisher stage transitions require the corresponding assignee.
- Status transitions update `status_updated_at`.
PUBLISHED DATE MODEL
The system distinguishes display scheduling vs actual publish completion:
- `scheduled_publish_date`: planning/scheduling date used by calendar and dashboard ordering
- `display_published_date`: display-friendly published date field for UI
- `actual_published_at`: actual timestamp recorded at publish completion
- `published_at`: maintained in sync with `actual_published_at` for compatibility
Synchronization behavior
- `scheduled_publish_date` and `target_publish_date` are kept aligned.
- Completing publisher status can auto-stamp `actual_published_at` when absent.
CORE PAGES AND UX
Dashboard (`/dashboard`)
- Primary table with search, filters, sort, and row-level actions.
- Main metrics row + secondary delay metrics behind a “More Metrics” toggle.
- Column customization via “Edit Columns” popover (hidden by default).
- Pagination controls at table bottom:
  - rows per page: 10, 20, 50, All
  - Prev/Next navigation
  - Move to Top shortcut
- Bulk updates for selected rows (role-gated where required).
- Stale draft and overdue visibility cues.
Blog detail (`/blogs/[id]`)
- Comments shown before assignment/activity history.
- Assignment and status history visible for traceability.
- Role-aware editing for fields and stage transitions.
- Comments read/write through `public.blog_comments` with RLS.
Add blog (`/blogs/new`)
- Admin-oriented creation flow for new blog records.
- Optional initial comment support on creation, inserted into `blog_comments`.
Calendar (`/calendar`)
- Weekday labels displayed once at the top (no repeated row headers).
- Month jump picker for direct navigation.
- Visual highlight for today and subtle current-week highlighting.
- “No Publish Date” section includes title, status, and reason context.
- “No Publish Date” list supports pagination (10, 20, 50, All).
My Tasks (`/tasks`)
- Personalized queue of writing and publishing assignments.
- Fast links into detail pages.
Settings (`/settings`)
- Timezone selection using IANA-style values.
- User profile name editing (`first_name`, `last_name`, `display_name`):
  - user can edit own profile
  - admin can edit any profile
- Admin user management with multi-role assignment/removal.
DATA MODEL (CURRENT LOGICAL VIEW)
profiles
- identity + profile metadata
- key fields: `email`, `full_name`, `first_name`, `last_name`, `display_name`, `role`, `user_roles`, `is_active`
- triggers enforce role/name normalization and update permissions
blogs
- canonical workflow record
- key fields:
  - ownership: `writer_id`, `publisher_id`, `created_by`
  - workflow: `writer_status`, `publisher_status`, `overall_status`, `status_updated_at`
  - links: `google_doc_url`, `live_url`
  - scheduling/publish: `scheduled_publish_date`, `display_published_date`, `actual_published_at`, `published_at`, `target_publish_date`
  - lifecycle: `is_archived`, `created_at`, `updated_at`
blog_assignment_history
- append-only activity trail for assignment and status changes
blog_comments
- lightweight collaboration per blog
- key fields: `blog_id`, `created_by`, `comment`, `created_at`, `updated_at`
- constraints:
  - trimmed non-empty comment
  - max length 2000 chars
AUTHENTICATION AND AUTHORIZATION
Authentication
- Supabase Auth for user sessions.
- Supports configured providers (including Google OAuth) and internal account flows.
Authorization
- Enforced primarily through Supabase RLS + trigger-level protections.
- UI checks are non-authoritative convenience only.
- Profile and blog update permissions are validated in DB functions/triggers.
SLACK NOTIFICATION INTEGRATION
Transport
- Supabase Edge Function: `supabase/functions/slack-notify/index.ts`
Supported events
- `writer_assigned`
- `writer_completed`
- `ready_to_publish`
- `published`
Delivery behavior
- Posts to marketing channel.
- Attempts DM delivery when target email can be mapped.
- Supports bot-token mode and webhook fallback mode.
ENVIRONMENT VARIABLES
Frontend
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_APP_URL`
Server/API/import
- `SUPABASE_SERVICE_ROLE_KEY`
- `IMPORT_CREATED_BY_USER_ID` (legacy import attribution)
Optional
- `LEGACY_XLSX_PATH` (legacy import source override)
Slack function secrets
- `SLACK_BOT_TOKEN` (preferred)
- `SLACK_MARKETING_CHANNEL` (optional; default `#marketing`)
- `SLACK_WEBHOOK_URL` (fallback if bot token is not used)
MIGRATIONS AND EVOLUTION
Schema is migration-driven under `supabase/migrations/`.
Notable implemented milestones include:
- initial schema/auth/RLS foundation
- calendar model alignment and publish-date separation
- status pipeline and completion requirements hardening
- publish timestamp + comments table support
- multi-role profiles + name fields + schema cache refresh support
LEGACY DATA IMPORT
One-time importer script:
- `npm run import:legacy`
Source workbook defaults to:
- `critical-data/Blog Content Tracking - Sighthound and Redactor (cleaned).xlsx`
Behavior
- Uses `Calendar View` as canonical historical timeline source.
- Enriches missing values from other sheets.
- Updates matching existing rows to avoid duplicates.
NON-FUNCTIONAL REQUIREMENTS
- Fast day-to-day interaction for internal users.
- Deterministic workflow state and permission enforcement at DB level.
- Auditability for assignment/status evolution.
- Clear, minimal, and consistent UI interaction patterns.
ACCEPTANCE CRITERIA (CURRENT PRODUCT IMAGE)
1. Role-aware access and updates are enforced with DB-backed authorization.
2. Dashboard supports reduced-clutter controls (metrics toggle, edit columns popover, bottom pagination controls).
3. Blog detail provides comments-first collaboration and assignment/activity visibility.
4. Calendar supports top weekday labels, month jump, today/current-week emphasis, and clear no-date handling with pagination.
5. Settings supports timezone control, profile name editing, and admin multi-role management.
6. Comments are persisted via `public.blog_comments` with RLS.
7. Lint and typecheck pass on current codebase.
