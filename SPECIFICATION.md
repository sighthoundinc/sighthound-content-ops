SPECIFICATION.md
PROJECT NAME
Sighthound Content Operations Dashboard
PROJECT PURPOSE
Build a lightweight internal dashboard to manage blog production workflows for two websites:
- sighthound.com
- redactor.com
The system replaces the current Google Sheets content calendar (currently stored in /critical-data/) with a centralized, role-aware operations dashboard.
The system is strictly a coordination and tracking tool.
It is NOT a CMS and MUST NOT generate or edit content bodies.
Primary tracking goals:
- blog assignments
- writing status
- publishing status
- Google Doc draft link
- live blog URL
- publishing schedule
- ownership/assignment history
SCOPE
In Scope
- Blog workflow tracking from creation through publication
- Role-based assignment and updates (Admin, Writer, Publisher)
- Calendar visibility by publish date
- Slack notifications on workflow events
- Authentication and authorization via Supabase
- Frontend deployment via Vercel
Out of Scope
- Content editing or rich text authoring
- SEO analysis tooling
- Asset storage/management beyond links
- Multi-step editorial review workflows beyond Writing/Publishing stages
- Public-facing website rendering
USERS AND ROLES
Admin
Admin users MUST be able to:
- create, edit, archive blog records
- assign/reassign writers and publishers
- edit any editable field on any blog
- override writer/publisher statuses when operationally necessary
- view all records, history, and calendar views
Writer
Writers MUST be able to:
- view blogs assigned to themselves
- update draft (Google Doc) URL on assigned blogs
- update writer status for assigned blogs
- mark writing complete on assigned blogs
Writers MUST NOT:
- modify publisher status (unless also Admin)
- edit assignments (unless also Admin)
Publisher
Publishers MUST be able to:
- view blogs ready for publishing and blogs assigned to themselves
- update live URL on assigned blogs
- update publisher status for assigned blogs
- mark publishing complete on assigned blogs
Publishers MUST NOT:
- modify writer status (unless also Admin)
- edit assignments (unless also Admin)
WORKFLOW MODEL
Each blog progresses through exactly two operational stages:
1. Writing
2. Publishing
Lifecycle
1. Admin creates blog.
2. Writer is assigned.
3. Writer produces draft for review (outside system).
4. Writer marks writing complete.
5. Publisher is notified.
6. Publisher publishes blog and produces title cover image for review (tracked operationally, not stored as asset in v1).
7. Publisher marks publishing complete.
8. Blog is considered Published.
Workflow Diagram (Normative)
Create Blog
   ↓
Assign Writer
   ↓
Writer Status: in_progress
   ↓
Writer Status: completed
   ↓
Overall Status: Ready to Publish
   ↓
Assign Publisher
   ↓
Publisher Status: in_progress
   ↓
Publisher Status: completed
   ↓
Overall Status: Published
Status Model
The workflow is controlled by stage statuses (`writer_status`, `publisher_status`), and `overall_status` is system-derived and MUST NOT be manually editable.
Stage Status Enums
- writer_status: not_started, in_progress, needs_revision, completed
- publisher_status: not_started, in_progress, completed
Supported Workflow Status Labels
- Planned
- Writing
- Needs Revision
- Ready to Publish
- Publishing (operational state when publisher_status = in_progress)
- Published
Overall Status Derivation Rules (Deterministic, Current Implementation)
1. If publisher_status = completed -> overall_status = Published
2. Else if writer_status = needs_revision -> overall_status = Needs Revision
3. Else if writer_status = completed -> overall_status = Ready to Publish
4. Else if writer_status = in_progress OR publisher_status = in_progress -> overall_status = Writing
5. Else -> overall_status = Planned
Publisher Completion Dependency (MUST)
- publisher_status MUST NOT transition to completed unless writer_status = completed.
- This dependency is enforced at the database layer (constraint + trigger), with UI checks as convenience only.
If a writer is unassigned, writer status SHOULD default to not_started.
If publisher is unassigned, publisher status SHOULD default to not_started.
Invalid transitions MUST be prevented at the database level via triggers.
FUNCTIONAL REQUIREMENTS
Blog Management
The system MUST allow Admins to:
- create blog records
- edit blog metadata
- assign writer/publisher
- set target publish date
- view all records with status and ownership
The system MUST allow team members to:
- view assignments
- update task-relevant links/statuses
- mark stage completion as permitted by role
Required Blog Fields
Each blog record MUST contain:
- id
- title
- slug (nullable, unique when present; optional in v1 but SHOULD be stored)
- site
- writer_id
- publisher_id
- writer_status
- publisher_status
- overall_status (derived)
- google_doc_url
- live_url
- scheduled_publish_date (nullable; primary calendar scheduling field)
- published_at (nullable timestamp for published records)
- target_publish_date
- status_updated_at
- is_archived (default false)
- created_at
- updated_at
Site Constraint
site MUST be constrained to:
- sighthound.com
- redactor.com
UI / UX SPECIFICATION
Global UI Requirements
- Responsive layout for desktop-first usage
- Consistent status badges and role-based action visibility
- All date/times SHOULD be displayed in a single configured timezone (default: team timezone)
- Sorting/filtering MUST persist during session
- Empty states and validation errors MUST be explicit and actionable
Page 1: Main Dashboard
Primary tabular view of all blogs (Admin) or permissible blogs (non-admin).
Required Columns
- Title
- Site
- Writer
- Writer Status
- Publisher
- Publisher Status
- Overall Status
- Publish Date
Required Behaviors
- Search by title
- Filter by site, overall status, writer, publisher
- Sort by publish date and updated time
- Row click navigates to Blog Detail
- Dashboard SHOULD visually highlight:
  - blogs where overall_status = Ready to Publish
  - publishing-overdue blogs (target_publish_date has passed and publisher_status != completed)
  - drafts older than X days (X MUST be configurable)
- Archived records (is_archived = true) MUST be excluded from default dashboard views.
Page 2: Calendar View
Calendar UI is a derived view over the `blogs` table (not a separate dataset/table).
Required Behaviors
- Monthly and weekly modes MUST be supported
- Clicking an item opens Blog Detail
- Visual differentiation by overall_status
- Calendar items SHOULD include blogs with `scheduled_publish_date`, or published blogs with a date (`published_at` / fallback date).
- Items without publish date SHOULD be excluded from calendar grid and surfaced in a "No Publish Date" list
Page 3: Blog Detail Page
Single-record page with view/edit controls.
Editable Fields (role-constrained)
- Title
- Site
- Writer
- Publisher
- Google Doc Link
- Live URL
- Publish Date
Actions
- Mark Writing Complete
- Mark Publishing Complete
Required UX Rules
- Disabled actions when role is unauthorized
- Confirmation prompt for completion actions
- Display assignment history and recent activity log
- Show computed overall_status as read-only
Page 4: Add Blog Page
Admin-only creation form.
Required Inputs
- Title (required)
- Site (required enum)
- Writer (optional at creation)
- Publisher (optional at creation)
- Google Doc URL (optional)
- Target Publish Date (optional)
Required Validation
- Title MUST be non-empty
- URLs MUST be valid URL format when provided
- Site MUST match allowed enum
Page 5: My Tasks Page
Personalized task queue for logged-in user.
Required Sections
- Writing Tasks (assigned where writer_status != completed)
- Publishing Tasks (assigned where publisher_status != completed)
- Recently Completed
Required Behaviors
- Quick links to Blog Detail
- Status quick-view
- Publish date visibility for prioritization
SLACK INTEGRATION SPECIFICATION
Slack notifications MUST be sent through the Supabase Edge Function `slack-notify` using server-side secrets.
Notification Events (MUST)
1. Writer assigned to blog
2. Writer marks draft complete
3. Blog becomes ready for publishing
4. Publisher marks publishing complete
Message Requirements
Messages MUST include:
- event type
- blog title
- site
- actor display name
- direct link to blog detail page
Example Formats
- Writer assigned: "Ali has been assigned a blog: Campus Vehicle Tracking"
- Draft complete: "Blog ready for publishing: Campus Vehicle Tracking"
- Published: "Blog published: Campus Vehicle Tracking"
Delivery Architecture
- Required integration path: Frontend -> Supabase Edge Function (`slack-notify`) -> Slack webhook.
- Slack notifications MUST be triggered by server-side logic only (Supabase Edge Function, database trigger, or equivalent).
- Slack webhook URL MUST be stored only in server-side secret configuration.
- Frontend MUST NOT directly invoke Slack webhook or emit Slack notifications itself.
- Notifications SHOULD target assignees via DM when possible and also support channel delivery to `#marketing`.
Notification failures SHOULD be logged and retriable.
TECHNICAL ARCHITECTURE
Frontend
- Next.js (App Router)
- TypeScript
- Tailwind CSS
- Deployment target: Vercel
Frontend Responsibilities
- render role-aware UI
- perform authenticated Supabase queries/mutations
- enforce UX-level permission visibility (non-authoritative)
- never send Slack notifications directly; rely on server-side notification logic tied to workflow mutations
- Next.js application state is UI/session state only; no persistent server state is owned by the Next.js app.
- All durable persistence (blogs, profiles, workflow state, history, auth identities) lives in Supabase.
Backend (Supabase)
- PostgreSQL database
- Supabase Auth (Google Workspace SSO + email/password)
- Row Level Security policies
- Edge Functions for Slack delivery and privileged workflows
Authority Model
- Database + RLS MUST be source of truth for access control
- Frontend checks are convenience only and MUST NOT be trusted as sole enforcement
DATA MODEL (LOGICAL SQL SCHEMA)
Table: profiles
Purpose: application user profile and role mapping (linked to Supabase Auth users).
Columns
- id (UUID, PK; matches auth user id)
- email (text, unique, required)
- full_name (text, required)
- role (enum: admin, writer, publisher; required)
- is_active (boolean, default true)
- created_at (timestamp with timezone, required)
- updated_at (timestamp with timezone, required)
Constraints
- email MUST be unique
- role MUST be one of allowed enums
Table: blogs
Purpose: canonical workflow record.
Columns
- id (UUID, PK)
- title (text, required)
- slug (text, nullable, unique)
- site (enum: sighthound.com, redactor.com, required)
- writer_id (UUID, nullable, FK -> profiles.id)
- publisher_id (UUID, nullable, FK -> profiles.id)
- writer_status (enum, required, default not_started)
- publisher_status (enum, required, default not_started)
- overall_status (enum: planned, writing, needs_revision, ready_to_publish, published; derived via trigger)
- google_doc_url (text, nullable)
- live_url (text, nullable)
- scheduled_publish_date (date, nullable)
- published_at (timestamp with timezone, nullable)
- target_publish_date (date, nullable)
- status_updated_at (timestamp with timezone, required)
- is_archived (boolean, required, default false)
- created_by (UUID, FK -> profiles.id, required)
- created_at (timestamp with timezone, required)
- updated_at (timestamp with timezone, required)
Constraints
- writer_status enum: not_started, in_progress, needs_revision, completed
- publisher_status enum: not_started, in_progress, completed
- overall_status MUST be non-editable by clients
- slug MUST be unique when non-null
- publisher_status MUST NOT be set to completed unless writer_status = completed (enforced by app logic and/or DB constraint/trigger)
- status_updated_at MUST be updated on every writer_status or publisher_status transition
- is_archived MUST default to false; dashboards MUST filter archived rows by default
- URL fields SHOULD be validated to URL format
- live_url SHOULD be nullable until publication
Supporting Table: blog_assignment_history (RECOMMENDED for ownership history)
Purpose: preserve assignment and status change audit trail.
Columns
- id (UUID, PK)
- blog_id (UUID, FK -> blogs.id, required)
- changed_by (UUID, FK -> profiles.id, nullable)
- event_type (enum/text, required)
- field_name (text, nullable; e.g., writer_id, publisher_id, writer_status, publisher_status)
- old_value (text, nullable)
- new_value (text, nullable)
- metadata (json/jsonb, required, default empty object)
- changed_at (timestamp with timezone, required)
Requirement
System MUST record assignment changes and stage completion events for traceability.
Indexing Requirements
The database SHOULD index:
- blogs.target_publish_date
- blogs.writer_id
- blogs.publisher_id
- blogs.overall_status
- blogs.slug
- blogs.is_archived
- blogs.status_updated_at
- blogs.site
- blog_assignment_history.blog_id
- blog_assignment_history.changed_at
AUTHENTICATION & AUTHORIZATION
Authentication
- Supabase Auth is the authentication authority.
- Primary login MUST support Google OAuth via Supabase Auth (restricted to `@sighthound.com` Google Workspace identities).
- Secondary login MUST support admin-created email/password accounts stored in Supabase Auth.
- Only authenticated users MAY access application routes.
- Sessions SHOULD expire per Supabase defaults unless stricter policy is required.
- Roles MUST be stored in `profiles.role` and not depend on auth metadata.
- Roles MUST NOT be modeled in `auth.users.role`.
Authorization
RLS policies MUST enforce:
- Admin: full read/write on all blog records.
- Writer: read assigned blogs; update only permitted writer fields on assigned blogs.
- Publisher: read assigned/ready blogs; update only permitted publisher fields on assigned blogs.
- Non-admins MUST NOT reassign users.
Policy enforcement MUST occur at database/API level (authoritative via RLS), not only in UI.
UI visibility and enabled/disabled controls are convenience checks only (non-authoritative).
WORKFLOW LOGIC AND STATE TRANSITIONS
Allowed Transitions
Writer Stage
- not_started -> in_progress
- in_progress -> completed
- writer_id MUST be non-null before transition to in_progress (enforced by app logic and/or DB constraint/trigger)
- Admin MAY set any valid writer status for operational correction
Publisher Stage
- not_started -> in_progress
- in_progress -> completed
- publisher_id MUST be non-null before transition to in_progress (enforced by app logic and/or DB constraint/trigger)
- Publisher MUST NOT mark completed unless writer stage is completed (enforced by app logic and/or DB constraint/trigger)
- Admin MAY override for correction
Completion Semantics
- Mark Writing Complete MUST set writer_status = completed
- Mark Publishing Complete MUST set publisher_status = completed
- On any status update, status_updated_at MUST be updated and overall_status MUST be recalculated automatically
Idempotency
Repeated completion actions SHOULD be safely idempotent (no duplicate side effects).
API / INTEGRATION CONTRACT (HIGH LEVEL)
The frontend will use Supabase client APIs for CRUD operations.
Required Operation Groups
- Auth: sign in, sign out, session retrieval
- Blogs: list, filter, create, update field subsets
- Tasks: fetch by current user role and assignment
- Calendar: fetch by date range
- Notifications: server-side only Slack dispatch (Edge Function or DB trigger); no frontend-direct Slack calls
- History: fetch assignment/status audit records for detail page
All mutating operations MUST write updated_at and produce audit history entries where relevant.
DEPLOYMENT MODEL
Frontend Deployment
- MUST deploy to Vercel
- Build artifacts MUST be environment-specific (e.g., prod Supabase project URL/key)
Backend Deployment
- Supabase project hosts DB/Auth/RLS and optional Edge Functions
- Migrations MUST be version-controlled
Environment Variables
Frontend
- NEXT_PUBLIC_SUPABASE_URL (required)
- NEXT_PUBLIC_SUPABASE_ANON_KEY (required)
- NEXT_PUBLIC_APP_URL (required)
Server-side (Supabase Edge Functions / secrets)
- SLACK_WEBHOOK_URL (required, secret)
- SUPABASE_SERVICE_ROLE_KEY (required for privileged server-side operations/import/scripts)
- SUPABASE_PROJECT_ID (optional; used in some CLI/deployment workflows)
Importer / migration scripts
- IMPORT_CREATED_BY_USER_ID (required for legacy import)
- LEGACY_XLSX_PATH (optional override; defaults to `critical-data/Blog Content Tracking - Sighthound and Redactor (cleaned).xlsx`)
SLACK_WEBHOOK_URL MUST NOT be exposed in client bundles.

LEGACY DATA MIGRATION
Legacy spreadsheet migration is handled via one-time XLSX import script.
Primary source of truth for historical records:
- `Calendar View` sheet in the legacy workbook
Workbook path (default):
- `critical-data/Blog Content Tracking - Sighthound and Redactor (cleaned).xlsx`
Migration behavior:
- `Calendar View` is treated as canonical historical publish data.
- Other sheets may enrich missing fields.
- Imported rows remain fully editable in dashboard workflows.
- Blogs with valid live URLs are automatically treated as published unless explicit sheet status indicates otherwise.
- Re-imports update matching existing `blogs` records instead of creating duplicates where possible.

IMPLEMENTATION NOTES
- Next.js App Router is used for frontend routing and page structure.
- Supabase SQL migrations are source-controlled and define schema, triggers, and RLS policies.
- Authorization is enforced primarily with RLS policies.
- Slack delivery is implemented through Supabase Edge Function (`slack-notify`).
- Legacy data migration uses a one-time XLSX importer script targeting historical spreadsheet data.
OBSERVABILITY & OPERATIONS
- Application SHOULD log critical workflow events and integration failures.
- Slack delivery failures SHOULD include retry metadata and dead-letter visibility.
- Audit history MUST provide traceability for assignment and status changes.
- Basic health checks SHOULD exist for API reachability and notification function.
NON-FUNCTIONAL REQUIREMENTS
- Usability: common actions (status updates, link updates) SHOULD require <= 3 interactions.
- Performance: dashboard list loads SHOULD complete in under 2 seconds for normal internal dataset sizes.
- Reliability: state transitions MUST be atomic; partial updates MUST NOT leave inconsistent status.
- Security: least-privilege access with RLS; no secret leakage in client artifacts.
TESTING STRATEGY
Unit Tests
- Status derivation logic
- Role permission utility logic
- Form validation utilities
- Notification payload formatting
Integration Tests
- Supabase CRUD with RLS policy assertions
- Auth flow and route protection
- Blog lifecycle transitions end-to-end
- Slack notification trigger flow (mocked endpoint)
User Workflow Tests
- Admin creates and assigns blog
- Writer completes writing and updates draft URL
- Publisher sees ready task, publishes, adds live URL, completes task
- Calendar reflects scheduled/published date updates derived from blogs
- Unauthorized edits are rejected
Regression Coverage
Each release SHOULD include regression tests for:
- status derivation invariants
- permission boundaries
- audit history creation
- notification trigger accuracy
PHASED IMPLEMENTATION PLAN
Phase 1: Project Scaffolding
- Initialize repository structure
- Set up Next.js + TypeScript + Tailwind project
- Configure linting/formatting/testing baseline
- Configure Vercel build pipeline (without production publish yet)
Dependencies
None
Phase 2: Supabase Foundation
- Create Supabase project environments
- Define schema for profiles, blogs, and supporting history table
- Implement enums, constraints, and indexes
- Configure auth (Google Workspace SSO + admin-created email/password)
- Seed initial admin users
Dependencies
Phase 1 complete
Phase 3: Authorization and Security Baseline
- Implement RLS policies for Admin/Writer/Publisher
- Validate read/write boundaries per role
- Add policy tests
Dependencies
Phase 2 complete
Phase 4: Core UI Shell and Navigation
- Implement application layout and navigation
- Add protected routing and session handling
- Build Main Dashboard base table with filters/sorting
Dependencies
Phases 1–3 complete
Phase 5: Blog CRUD and Detail Workflow
- Implement Add Blog page
- Implement Blog Detail page editing controls
- Implement role-aware action buttons
- Implement My Tasks page
Dependencies
Phase 4 complete
Phase 6: Workflow State Engine
- Enforce valid status transitions
- Implement automatic overall_status derivation
- Implement history event recording for assignments/status changes
- Add idempotent completion actions
Dependencies
Phase 5 complete
Phase 7: Calendar View
- Implement monthly/weekly views
- Add date-range queries
- Support click-through to blog detail
Dependencies
Phase 5 complete
Phase 8: Slack Integration
- Implement secure server-side notification endpoint/function
- Trigger notifications on required events
- Add retries/logging for failed deliveries
Dependencies
Phase 6 complete
Phase 9: Deployment Hardening
- Configure production env vars and secrets
- Deploy frontend to Vercel
- Validate Supabase connectivity and auth in production
- Run smoke tests
Dependencies
Phases 2–8 complete
Phase 10: Final Validation and Handover
- Run full test suite (unit/integration/workflow)
- Execute UAT checklist with representative users
- Publish operations runbook and known limitations
- Freeze v1 scope and backlog v1.1 improvements
Dependencies
Phase 9 complete
ACCEPTANCE CRITERIA (V1)
The release is accepted only if all are true:
1. Admin can create and assign blog entries for both sites.
2. Writers and publishers can only edit authorized fields on assigned records.
3. Overall status is auto-derived and not manually editable.
4. Calendar view supports weekly and monthly display derived from blogs publish dates (`scheduled_publish_date` and published-date fallback).
5. Slack notifications are delivered for all required lifecycle events.
6. Ownership/assignment history is visible and auditable.
7. Frontend is live on Vercel and connected to Supabase production.
8. Security policies (RLS) prevent unauthorized write operations.
9. Legacy data import has been executed successfully from the canonical `Calendar View` source and imported records are editable in the dashboard.
FUTURE ENHANCEMENTS (NON-BLOCKING)
- Editorial review sub-stage between writing and publishing
- Commenting/approval annotations
- Reminder digests via Slack
- CSV import from legacy Google Sheets
- Metrics dashboard (lead time, throughput, SLA compliance)
- Add `source` lineage field (e.g., `legacy` | `dashboard`) for import provenance tracking
