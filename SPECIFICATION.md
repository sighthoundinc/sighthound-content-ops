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

Control plane:
- UI: `/settings/permissions`
- API: `/api/admin/permissions`

Authorization source of truth:
- database policies/functions/triggers (UI is assistive, not authoritative)

## 4) Workflow model
Stages:
1. Writing
2. Publishing

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
- today strip (scheduled this week / ready / delayed) with clickable metric filtering
- delayed definition: scheduled date passed while publisher stage is not completed
- active filter chips and clear-all control
- table optimized for scanability:
  - two-line clamped titles
  - site badges (`SH`, `RED`)
  - urgency/state row tones
  - inline writer/publisher stage controls (permission-gated)
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
- row-level and bulk copy actions for title/url
- export view/selected data as CSV or PDF

### CardBoard (`/blogs/cardboard`)
- kanban board with stages (`Idea`, `Writing`, `Reviewing`, `Publishing`, `Published`)
- drag-and-drop transitions with permission checks and required-field validation
- fast idea creation directly in board lane
- table-view deep-linking by stage filter

### Tasks (`/tasks`)
- top-3 priority items first
- full list expansion with pagination
- urgency tags (`⚠ Overdue`, `Soon`)

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
- conversion path toward blog workflow

### Social Posts (`/social-posts`)
- social workflow operations connected to content planning

### Social Post Editor (`/social-posts/[id]`)
- focused single-record editor
- autosave plus manual save option
- caption helper tools, copy actions, and linked-blog lookup

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

## 7) Data model (logical)
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

## 8) Admin control APIs (logical)
- `/api/admin/permissions` — permission matrix read/update/reset
- `/api/admin/reassign-assignments` — assignment transfer
- `/api/admin/activity-history` — activity cleanup, optional comments cleanup
- `/api/admin/quick-view` — admin quick-view token generation/session switch support
## 9) Integrations
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
## 10) Environment requirements
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
## 11) Migration and compatibility status
The project is migration-driven (`supabase/migrations`) with compatibility layers for:
- legacy/expanded role model transitions
- status trigger and enum transition safety
- comments actor compatibility (`user_id` / `created_by`)
- import collision prevention via deterministic hash
- permission matrix introduction + expansion migrations
## 12) Non-functional requirements
- fast internal workflow execution
- deterministic DB-level invariants for workflow integrity
- high traceability (history + comments + permission audits)
- low-cognitive-load UI for operational scanning
- predictable filter/search behavior with immediate visual state feedback
## 13) Acceptance criteria (current)
1. Permission-guarded workflows execute with DB-authoritative enforcement.
2. Dashboard queues/pipelines are actionable and scan-friendly.
3. Tasks and Calendar prioritize execution clarity.
4. Comments/history and permission audit logs are available for traceability.
5. Settings and Permissions pages support operational administration.
6. Admin quick-view runs actions in selected non-admin user context and supports clean return flow.
7. Admin cleanup controls can purge activity history with optional comments cleanup.
8. Migration, lint, and typecheck workflows remain stable.
