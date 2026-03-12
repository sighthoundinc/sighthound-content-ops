# sighthound-content-ops
Internal content operations dashboard for the Sighthound marketing team.

## Stack
- Next.js + TypeScript + Tailwind
- Supabase (Postgres + Auth + RLS + Edge Functions)
- Vercel deployment target

## Features implemented
- Role-aware dashboard (`admin`, `writer`, `publisher`)
- Add Blog, Blog Detail workflow actions, My Tasks, Calendar, Settings
- Google SSO + email/password login
- Admin internal user provisioning API
- Supabase SQL migration with:
  - blog workflow schema
  - constraints + status derivation trigger
  - assignment history + notification queue
  - RLS policies
- Supabase Edge Function for Slack channel + DM notifications
- One-time XLSX import script from `critical-data/`

## Local setup
1. Install dependencies:
   - `npm install`
2. Copy env template:
   - `cp .env.example .env.local`
3. Fill required env vars in `.env.local`:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (server/API/import only)
   - `NEXT_PUBLIC_APP_URL` (for Slack deep links)
4. Start dev server:
   - `npm run dev`

## Supabase setup
1. Apply migration:
   - run SQL in `supabase/migrations/20260311191500_init.sql` through Supabase SQL editor or CLI workflow.
2. Enable Google provider in Supabase Auth.
3. Deploy Edge Function:
   - function path: `supabase/functions/slack-notify/index.ts`
4. Configure function secrets:
   - `SLACK_BOT_TOKEN` (recommended)
   - `SLACK_MARKETING_CHANNEL` (defaults to `#marketing`)
   - Optional fallback: `SLACK_WEBHOOK_URL`

## Legacy data import
Use the one-time importer:
- Dry run:
  - `npm run import:legacy -- --dry-run`
- Real import:
  - `npm run import:legacy`

Importer behavior:
- `Calendar View` is treated as the canonical historical source.
- Other legacy sheets are used only to enrich missing fields.
- Existing `blogs` rows are updated in place when matched (instead of creating duplicates).
- Rows with a live URL default to published completion statuses unless explicit status hints are present.
- Calendar dates are written to `scheduled_publish_date` (and mirrored to legacy `target_publish_date`).

Required env for import:
- `IMPORT_CREATED_BY_USER_ID` (must match an existing `profiles.id`)

## Quality checks
- `npm run lint`
- `npm run typecheck`
- `npm run check`
