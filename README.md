# sighthound-content-ops
Internal content operations dashboard for Sighthound marketing workflows across `sighthound.com` and `redactor.com`.

## Product snapshot
- Blog workflow operations from planning to publication
- Role-aware assignment and status controls
- Dashboard, Tasks, Calendar, Blog Detail, Add Blog, and Settings pages
- Supabase-backed authorization (RLS + DB functions/triggers)
- Slack notifications via Supabase Edge Function

For full behavior/spec details:
- `SPECIFICATION.md`
- End-user guide: `HOW_TO_USE_APP.md`
- Ops runbook: `OPERATIONS.md`

## Current UX highlights
### Dashboard
- “More Metrics” toggle for secondary delay metrics
- “Edit Columns” popover
- Bottom pagination controls (`Rows per page`, `Prev`, `Next`, `Move to top`)

### Tasks
- Compact default view with top 3 prioritized pending tasks
- Priority indicators (`⚠ Overdue`, `Soon`)
- Expandable full list with 10-row pagination
- Task click opens detail slide-over

### Blogs
- Blog detail comments-first layout
- Assignment/activity history
- Comments compatibility handling for legacy schema variations

### Settings
- Profile name editing
- Multi-role user management for admins
- Timezone configuration

## Tech stack
- Next.js (App Router) + TypeScript + Tailwind
- Supabase (Postgres, Auth, RLS, Edge Functions)
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
- `npm run dev:full` — Next dev + TS watch in parallel
- `npm run lint` — Next ESLint runner
- `npm run typecheck` — TypeScript noEmit check
- `npm run check` — lint + typecheck in parallel
- `npm run import:legacy` — legacy XLSX import

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

## Slack Edge Function
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
