# sighthound-content-ops
Content operations platform for Sighthound marketing workflows across `sighthound.com` and `redactor.com`.

## Product snapshot
- Blog lifecycle operations from planning through publishing
- Role + permission based authorization (DB-authoritative, UI-aware)
- Queue-first dashboard for writing/publishing pipelines
- Tasks and Calendar execution/scheduling workflows
- Ideas + Social Posts modules
- Workspace home (`/`) with premium quick-action navigation
- Dedicated premium login (`/login`) with OAuth support (Google + Slack OIDC) and email/password fallback
  - Google login requires @sighthound.com email
  - Slack login requires Sighthound Slack workspace
  - First-time OAuth users auto-provisioned with `writer` role
- Settings + Permissions admin control plane
- Slack workflow notifications via Supabase Edge Function

## Documentation map
- Product behavior: `SPECIFICATION.md`
- End-user manual: `HOW_TO_USE_APP.md`
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
- Sidebar is collapsible with global persistent state:
  - expanded: `240px` (icons + labels)
  - collapsed: `72px` (icons only)
- Collapsed nav labels are provided through the app tooltip component (hover/focus), not `title` attributes
- Sidebar is rendered as a dedicated layout column, so content shifts and never overlays
- Sidebar column is viewport-anchored with `sticky top-0 h-screen` for always-visible navigation
- Sidebar scroll is isolated to the middle nav section (`flex-1 overflow-y-auto`), keeping header/toggle visible
- Optional sidebar footer content remains fixed below the nav scroll region
- Sidebar nav scroll resets to top on route changes for predictable cross-page behavior
- Sidebar respects reduced-motion preferences by disabling toggle/nav transitions (`motion-reduce:transition-none`)
- Tooltip rendering uses a portal + high z-index layer to avoid clipping in table scroll containers and to stay above drawers/modals
- Collapsed sidebar supports keyboard navigation with visible focus ring and focus-triggered tooltips
- CardBoard navigation uses a dedicated kanban icon (not reused blog icon) for clearer recognition in collapsed mode
- Toggling sidebar while focused inside nav preserves focus predictably (fallback to toggle button, no jump to body)
- Active sidebar item remains obvious in collapsed mode via dark background + white icon contrast
- Collapsed nav rows keep a ~44px minimum hit target with centered icons and full-row click area (no dead zones)
- Active nav page has stronger visual state (left border + highlighted row)
- Left sidebar is intentionally clean (no quick-filter groups and no recently-published card)
- Clickable Today metrics
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

### Ideas (`/ideas`)
- Idea cards keep comments/references visible by default
- Idea title/site/comments-references are edited through `Edit Idea` (single edit path)
- Conversion actions include:
  - `Convert to Blog`
  - `Convert to Social Post`

### Tasks
- Top-3 priority summary + expandable full list
- `Overdue` / `Due Soon` / `Upcoming` indicators
- Priority sorting by schedule urgency and status state
- Social task queue with next-action labels and social status filtering

## Icon system standard
- Emoji-based icons are banned from UI iconography.
- The app uses `lucide-react` (open-source) for all operational icons.
- Icon rendering is centralized through `src/lib/icons.tsx` (`AppIcon` + `AppIconName`) to keep:
  - consistent line width and visual roundness
  - fixed bounding-box usage for alignment
  - scalable SVG behavior across densities and font weights
- New icon usage should be added to the shared icon map first, then consumed via `AppIcon`.

### Calendar
- Month/week views
- Week-grouped month layout
- Drag-and-drop scheduling (permission-gated)
- Published entries are non-draggable

### Settings and Permissions
- `My Profile` for all personal preferences (name, timezone, week start, draft attention threshold)
- `Access & Oversight` for quick-view and permissions panel entry
- `Create User Account`, `Reassign User Work`, and `User Directory` for team administration
- Permission matrix management (`/settings/permissions`)
- Permission audit history
- Admin-only activity history cleanup (global or user-scoped)
- Optional comments cleanup during history purge
- Admin quick-view as non-admin user with return-to-admin workflow
- Admin-only `Danger Zone: Wipe App Clean` reset with optional checkbox to remove other admin profiles/accounts (signed-in admin is always preserved)

### Social Post Editor (`/social-posts/[id]`)
- Guided 4-step single-post workflow:
  1. Setup (title, platforms, publish date, Canva link/page, product, type)
  2. Link Context (optional blog lookup + linked blog actions)
  3. Write Caption (UTF-8 editor + formatting + grouped Copy menu + platform guidance)
  4. Review & Publish (checklist validation, status transitions, stage-based final CTA)
- Stage-based final CTA behavior:
  - Draft incomplete → `Save Draft`
  - Draft complete → `Submit for Review`
  - Creative Approved + complete draft → `Move to Ready to Publish`
  - Ready to Publish → `Mark Awaiting Live Link`
  - Awaiting Live Link without links → `Await Live Link`
  - Awaiting Live Link with at least one saved link → `Submit Link` (marks `Published`)
- Step 4 includes a `Live Links` section for per-platform URL entry and save
- Execution-stage authority:
  - `ready_to_publish` and `awaiting_live_link` brief fields are read-only
  - admin-only `Edit Brief` reopens status to `creative_approved`
  - rollback from execution stages to `changes_requested` requires a reason
  - `published` requires at least one valid live link

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
- `/api/admin/wipe-app-clean` — full factory reset with optional other-admin deletion
- `/api/social-posts/[postId]/transition` — canonical social status transitions
- `/api/social-posts/[postId]/reopen-brief` — admin execution-stage brief reopen
- `/api/social-posts/reminders` — awaiting-live-link reminder sweep
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
- `20260320195000_add_activity_history_delete_policies.sql`
- `20260320195100_fix_activity_history_rls.sql`
- `20260321133000_social_workflow_authority_and_event_normalization.sql`

## Slack edge function
Path:
- `supabase/functions/slack-notify/index.ts`

Secrets:
- `SLACK_BOT_TOKEN` (preferred)
- `SLACK_MARKETING_CHANNEL` (optional)
- `SLACK_WEBHOOK_URL` (fallback)

Event coverage includes blog workflow events and social workflow events (`social_submitted_for_review`, `social_changes_requested`, `social_creative_approved`, `social_ready_to_publish`, `social_awaiting_live_link`, `social_published`, `social_live_link_reminder`).

## Quality checks
```bash
npm run lint
npm run typecheck
npm run check
```
