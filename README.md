# sighthound-content-ops
Internal content operations dashboard for Sighthound marketing workflows across `sighthound.com` and `redactor.com`.

## What the product does
- Tracks the full internal blog pipeline from planning to publication.
- Supports assignment and handoff between writing and publishing stages.
- Provides dashboard, tasks, calendar, blog detail, add-blog, and settings experiences.
- Enforces permissions through Supabase RLS and DB triggers.
- Sends Slack notifications for key workflow milestones.

## Tech stack
- Next.js (App Router) + TypeScript + Tailwind CSS
- Supabase (Postgres, Auth, RLS, Edge Functions)
- Vercel deployment target

## Current feature set
### Dashboard
- Search, filtering, sorting, and customizable visible columns
- “Edit Columns” popover (collapsed by default)
- Bottom-of-table pagination controls:
  - rows per page: `10`, `20`, `50`, `All`
  - `Prev` / `Next`
  - `Move to top`
- Main metrics plus secondary delay metrics behind “More Metrics”
- Bulk update support for selected rows

### Blogs
- Add blog flow (`/blogs/new`) with optional initial comment
- Blog detail (`/blogs/[id]`) with:
  - role-aware edit controls
  - comments section
  - assignment + activity history
  - comments displayed before activity history

### Calendar
- Single weekday header row at top
- Month jump picker
- Highlighting for today and current week
- “No Publish Date” section with reason context and pagination

### Settings and users
- IANA-style timezone selection
- Profile name editing (`first_name`, `last_name`, `display_name`)
- Multi-role users (`user_roles`) with admin role management
- Supported role values: `admin`, `writer`, `publisher`, `editor`

### Integrations and data
- Slack notifications via Supabase Edge Function (`slack-notify`)
- Legacy XLSX import script for initial historical data load

## Local setup
1. Install dependencies:
   - `npm install`
2. Create local env file:
   - `cp .env.example .env.local`
3. Populate `.env.local`:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `NEXT_PUBLIC_APP_URL` (default local: `http://localhost:3000`)
   - `SUPABASE_SERVICE_ROLE_KEY` (required for server/API/import operations)
   - `IMPORT_CREATED_BY_USER_ID` (required for legacy import)
   - optional: `LEGACY_XLSX_PATH`
4. Start dev server:
   - `npm run dev`

## Supabase setup
Apply SQL migrations from `supabase/migrations/` in chronological order.

Current migration set:
- `20260311191500_init.sql`
- `20260311203000_calendar_model_alignment.sql`
- `20260312000100_fix_blog_history_trigger_rls.sql`
- `20260312114000_separate_publish_dates.sql`
- `20260312124500_pipeline_status_model.sql`
- `20260312125500_completion_link_requirements.sql`
- `20260312131500_publish_timestamp_and_comments.sql`
- `20260312203000_profile_names_multirole_and_comments_cache.sql`

## Slack Edge Function
Function path:
- `supabase/functions/slack-notify/index.ts`

Configure secrets:
- `SLACK_BOT_TOKEN` (preferred)
- `SLACK_MARKETING_CHANNEL` (optional, defaults to `#marketing`)
- `SLACK_WEBHOOK_URL` (fallback mode if no bot token)

## Legacy import
Dry run:
- `npm run import:legacy -- --dry-run`

Run import:
- `npm run import:legacy`

Default source workbook:
- `critical-data/Blog Content Tracking - Sighthound and Redactor (cleaned).xlsx`

Importer behavior:
- Uses `Calendar View` as the canonical timeline source.
- Enriches missing fields from other legacy sheets.
- Updates matching existing rows where possible to avoid duplicates.

## Quality checks
- `npm run lint`
- `npm run typecheck`
- `npm run check`
