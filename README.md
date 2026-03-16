# sighthound-content-ops
Internal content operations platform for Sighthound marketing workflows across `sighthound.com` and `redactor.com`.

## Product snapshot
- Blog lifecycle operations from planning through publishing
- Role + permission based authorization (DB-authoritative, UI-aware)
- Queue-first dashboard for writing/publishing pipelines
- Tasks and Calendar execution/scheduling workflows
- Ideas + Social Posts modules
- Settings + Permissions admin control plane
- Slack workflow notifications via Supabase Edge Function

## Documentation map
- Product behavior: `SPECIFICATION.md`
- End-user guide: `HOW_TO_USE_APP.md`
- Operations runbook: `OPERATIONS.md`

## UX implementation status
### Phase 4A: UI Foundation ✅ COMPLETE
- AppShell layout and navigation
- DataPageHeader, DataPageToolbar, DataPageFilterPills components
- FilterBar system
- StatusBadgeSystem (WriterStatusBadge, PublisherStatusBadge, StageBadges)

### Phase 4B: Command Palette & Global Quick Create ✅ COMPLETE
- Global command palette (⌘K shortcut)
- Quick create modal for workflows
- Navigation and context integration

### Phase 4C: DataTable Migrations ✅ COMPLETE
- Dashboard: DataTable + FilterBar system
- Social Posts: DataTable with sorting, filtering, pagination, inline editing
- Tasks: DataTable with inline status updates, row highlighting
- Blogs: DataTable with row selection, copy utilities, export controls
- All pages unified on DataTable component + consistent column definitions
- Zero dead code, production-ready quality

## Current UX highlights
### Dashboard
- Sidebar navigation split:
  - workflow pages first (`Dashboard`, `My Tasks`, `Calendar`, `Blogs`, `Ideas`, `Social Posts`)
  - divider
  - configuration pages (`Settings`, `Permissions` for admins only)
- Active nav page has stronger visual state (left border + highlighted row)
- Clickable queue/pipeline filters and clickable Today metrics
- Writing queue shortcuts: `Drafting`, `Needs Revision`, `Ready for Publishing`, `Backlog`
- Publishing queue shortcuts: `Not Started`, `In Progress`, `Final Review`, `Published`
- Delayed metric: scheduled publish date is in the past and overall status is not `Published`
- Active filter chips + clear-all behavior
- Scan-friendly table:
  - clamped title rendering
  - SH/RED site badges
  - urgency row tones
  - inline writer/publisher stage controls (permission-gated)
- Export View / Export Selected CSV (permission-gated)
- Edit Columns popover and bottom pagination controls

### Blogs Library (`/blogs`)
- Dedicated reference-first page for title/URL lookup
- Default: published-only, newest-first by display publish date
- Copy-first utilities:
  - row-level title/url copy (hover-revealed controls)
  - copy-all titles / copy-all URLs
- Exports:
  - View Export: CSV + PDF (`export_csv`)
  - Selected Export: CSV (`export_selected_csv`)

### CardBoard (`/blogs/cardboard`)
- Kanban-style pipeline board (`Idea`, `Writing`, `Reviewing`, `Publishing`, `Published`)
- Drag-and-drop stage movement with permission and field validation
- Quick-add from idea lane
- Stage columns deep-link back to table view filters

### Tasks
- Top-3 priority summary + expandable full list
- `⚠ Overdue` / `Due Soon` / `Upcoming` indicators
- Priority sorting by schedule urgency and status state

### Calendar
- Month/week views
- Week-grouped month layout
- Drag-and-drop scheduling (permission-gated)
- Published entries are non-draggable

### Settings and Permissions
- Profile editing
- User role management
- Permission matrix management (`/settings/permissions`)
- Permission audit history
- Admin-only activity history cleanup (global or user-scoped)
- Optional comments cleanup during history purge
- Admin quick-view as non-admin user with return-to-admin workflow

### Social Post Editor (`/social-posts/[id]`)
- Focused single-post workspace
- Autosave + manual save
- Caption formatting/copy utilities and linked-blog lookup

## Tech stack
- Next.js (App Router) + TypeScript + Tailwind
- Supabase (Postgres, Auth, RLS, Functions)
- Vercel deployment target

## Local setup
1. Install dependencies
```bash
npm install
```
2. Create local env
```bash
cp .env.example .env.local
```
3. Set required env values
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_APP_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `IMPORT_CREATED_BY_USER_ID`
- optional: `LEGACY_XLSX_PATH`
4. Start app
```bash
npm run dev
```

## Dev scripts
- `npm run dev` — Next dev server
- `npm run dev:full` — Next dev + TS watch
- `npm run lint` — ESLint
- `npm run typecheck` — TypeScript check
- `npm run check` — lint + typecheck
- `npm run import:legacy` — legacy XLSX import

## API highlights
- `/api/admin/permissions` — role permission read/update/reset
- `/api/admin/reassign-assignments` — controlled assignment transfer
- `/api/admin/activity-history` — admin activity/audit cleanup
- `/api/admin/quick-view` — admin quick-view session switch
- `/api/admin/users` — admin user operations
- `/api/users/profile` — current user profile operations

## Supabase migrations
Apply in timestamp order from `supabase/migrations/`.

Current set:
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

## Slack edge function
Path:
- `supabase/functions/slack-notify/index.ts`

Secrets:
- `SLACK_BOT_TOKEN` (preferred)
- `SLACK_MARKETING_CHANNEL` (optional)
- `SLACK_WEBHOOK_URL` (fallback)

## Quality checks
```bash
npm run lint
npm run typecheck
npm run check
```
