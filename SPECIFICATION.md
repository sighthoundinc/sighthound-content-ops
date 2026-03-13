# Sighthound Content Operations — Product Specification
## 1) Product purpose
Sighthound Content Operations is an internal workflow application for managing blog production across:
- `sighthound.com`
- `redactor.com`

The app is an operations/coordination system (not a CMS). It tracks assignments, statuses, dates, links, comments, and workflow history.

## 2) Scope
### In scope
- Blog planning/writing/publishing lifecycle tracking
- Role-aware operations UI (dashboard, tasks, blog detail, calendar, settings)
- Assignment and status history trail
- Blog comments
- Slack notifications for workflow events
- Legacy XLSX import for historical migration

### Out of scope
- Rich-text content authoring
- Public website rendering
- SEO/content optimization tooling
- Asset storage pipeline

## 3) Roles and permissions
Supported roles:
- `admin`
- `writer`
- `publisher`
- `editor`

Role model:
- Multi-role users are supported via `profiles.user_roles`.
- `profiles.role` remains the primary role value and is synchronized.
- Authorization is DB-authoritative (RLS + triggers/functions), with UI checks as convenience.

Permission baseline:
- Admin: full operational control
- Writer: writing-stage work for assigned blogs
- Publisher: publishing-stage work for assigned blogs

## 4) Workflow model
Stages:
1. Writing
2. Publishing

Enums:
- `writer_status`: `not_started | in_progress | needs_revision | completed`
- `publisher_status`: `not_started | in_progress | completed`
- `overall_status`: `planned | writing | needs_revision | ready_to_publish | published`

Rules:
- Publishing cannot be completed before writing is completed.
- Relevant assignee (`writer_id` / `publisher_id`) must exist before stage progression.
- `overall_status` is derived (not directly user-edited).
- `status_updated_at` updates on status changes.

## 5) Date model
Primary fields:
- `scheduled_publish_date` (planning/scheduling)
- `display_published_date` (display-oriented date)
- `actual_published_at` (actual completion timestamp)
- `published_at` (compatibility mirror)
- `target_publish_date` (legacy-compatible companion)

Behavior:
- Schedule fields are synchronized for compatibility.
- Publishing completion can auto-populate actual publish timestamp.

## 6) Core UX and pages
### Dashboard (`/dashboard`)
- Search/filter/sort operations
- Bottom pagination controls
- Edit Columns popover (hidden by default)
- Main metrics + “More Metrics” toggle for secondary delay metrics
- Bulk actions and right-side detail panel

### Tasks (`/tasks`)
- Compact default view: top 3 prioritized pending tasks
- Priority order:
  1) overdue scheduled date
  2) nearest scheduled date
  3) status urgency
- “View all tasks” expands full list
- Full list paginated (10 rows/page, bottom controls)
- Minimal task rows: title, task type, status, scheduled date
- Visual urgency cues:
  - `⚠ Overdue`
  - `Soon` (within 3 days)

### Blog detail (`/blogs/[id]`)
- Role-aware edits and stage actions
- Comments displayed before assignment/activity history
- Comments read/write against `public.blog_comments` with compatibility fallbacks

### Add blog (`/blogs/new`)
- Admin-oriented creation flow
- Optional initial comment

### Calendar (`/calendar`)
- Weekday labels shown once
- Month jump selector
- Today/current-week highlighting
- “No Publish Date” list with status reason and pagination

### Settings (`/settings`)
- Timezone configuration
- Self and admin profile name edits (`first_name`, `last_name`, `display_name`)
- Admin user role management (multi-role)

## 7) Data model (logical)
Core tables:
- `profiles`
- `blogs`
- `blog_assignment_history`
- `blog_comments`

Selected table highlights:
- `profiles`: role + `user_roles`, display/name fields, active state
- `blogs`: workflow fields, assignment fields, scheduling/publish dates, archive flag
- `blog_assignment_history`: activity/audit timeline
- `blog_comments`: per-blog comments with actor compatibility (`user_id` + `created_by`)

## 8) Integrations
Slack integration via Supabase Edge Function:
- `supabase/functions/slack-notify/index.ts`

Event types:
- `writer_assigned`
- `writer_completed`
- `ready_to_publish`
- `published`

Delivery:
- marketing channel
- optional DM lookup by email (bot-token mode)
- webhook fallback mode

## 9) Environment requirements
Frontend:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_APP_URL`

Server/import:
- `SUPABASE_SERVICE_ROLE_KEY`
- `IMPORT_CREATED_BY_USER_ID`
- optional `LEGACY_XLSX_PATH`

Slack secrets:
- `SLACK_BOT_TOKEN` (preferred)
- `SLACK_MARKETING_CHANNEL` (optional)
- `SLACK_WEBHOOK_URL` (fallback)

## 10) Migrations and compatibility state
The project is migration-driven (`supabase/migrations`), with compatibility safeguards for:
- enum/status transition edge cases
- missing/legacy comments actor columns (`user_id` vs `created_by`)
- schema drift in profile role arrays
- remote data backfills required for stricter constraints

## 11) Non-functional requirements
- Fast daily operation for internal users
- Deterministic workflow invariants at DB layer
- Strong traceability (history + comments)
- Clear, minimal, action-oriented UX

## 12) Acceptance criteria (current)
1. Role-aware workflows function with DB-enforced authorization.
2. Dashboard and Tasks views are minimal and scan-friendly.
3. Blog comments and activity history function with compatibility fallbacks.
4. Calendar and no-date workflows are clear and paginated where applicable.
5. Settings supports profile edits, role management, and timezone configuration.
6. Lint/typecheck and migration flow are operationally stable.
