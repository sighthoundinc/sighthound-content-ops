# Sighthound Content Ops — Operations Runbook

This runbook is for engineers/operators maintaining the Sighthound Content Ops dashboard in local, staging, and production environments.
For full product/architecture requirements, workflow rules, and scope boundaries, see `SPECIFICATION.md`.

## 1. System Overview

Sighthound Content Ops is an **internal operations dashboard** used to track blog production workflow (planning, writing, publishing) across `sighthound.com` and `redactor.com`.

Architecture summary:

- **Frontend**
  - Next.js (App Router)
  - TypeScript
  - Tailwind
  - Deployed on Vercel
- **Backend**
  - Supabase
    - PostgreSQL
    - Auth
    - Row Level Security (RLS)
    - Edge Functions
- **Integration**
  - Slack via Supabase Edge Function: `slack-notify`

State/persistence model:

- Next.js holds UI/session state only.
- Durable state (users, roles, blogs, workflow status, history, notification queue data) lives in Supabase.

## 2. Repository Structure

Key paths:

- `src/`  
  Next.js application routes, UI, and client/server logic.
- `supabase/`  
  Database migration and Edge Function assets.
- `supabase/migrations/`  
  SQL schema/state migration files.
- `supabase/functions/`  
  Supabase Edge Functions (including Slack integration).
- `scripts/`  
  Operational scripts (for example, legacy XLSX import).
- `critical-data/`  
  Legacy spreadsheet source used for initial historical migration.
- `.env.example`  
  Local environment variable template.

## 3. Local Development Setup

1. Install dependencies:

```bash
npm install
```

2. Create local env file:

```bash
cp .env.example .env.local
```

3. Set required variables in `.env.local`:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_APP_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `IMPORT_CREATED_BY_USER_ID`
- `LEGACY_XLSX_PATH` (optional override for importer path)

4. Start the development server:

```bash
npm run dev
```

App URL:

- `http://localhost:3000`

## 4. Supabase Setup

1. Create a Supabase project.
2. Apply SQL migrations from `supabase/migrations/` in timestamp order:
   - `20260311191500_init.sql`
   - `20260311203000_calendar_model_alignment.sql`
3. Confirm required tables exist:
   - `profiles`
   - `blogs`
   - `blog_assignment_history`
   - `notification_events` (queue table; sometimes referred to as `notification_queue` in older notes)
4. Verify RLS is enabled on core tables.
5. Confirm role source is `profiles.role`.

Useful SQL checks:

```sql
select table_name
from information_schema.tables
where table_schema = 'public'
  and table_name in ('profiles', 'blogs', 'blog_assignment_history', 'notification_events')
order by table_name;
```

```sql
select tablename, rowsecurity
from pg_tables
where schemaname = 'public'
  and tablename in ('profiles', 'blogs', 'blog_assignment_history', 'notification_events');
```

## 5. Authentication Setup

Auth model:

- **Primary login:** Google Workspace SSO (`@sighthound.com`) via Supabase Auth.
- **Secondary login:** Admin-created email/password accounts in Supabase Auth.
- **Role storage:** `profiles.role` (not `auth.users.role`).

Steps to add a new user:

1. Create the Auth user in Supabase Auth (Google or email/password).
2. Insert/update the corresponding role/profile row in `profiles`.

Example SQL:

```sql
insert into profiles (id, email, full_name, role)
values ('USER_UUID', 'user@sighthound.com', 'User Name', 'writer')
on conflict (id) do update
set email = excluded.email,
    full_name = excluded.full_name,
    role = excluded.role,
    is_active = true,
    updated_at = timezone('utc', now());
```

## 6. Slack Integration

Slack delivery path:

- Frontend workflow action -> Supabase Edge Function `slack-notify` -> Slack webhook/API

Function path:

- `supabase/functions/slack-notify`

Secrets:

- Required minimum: `SLACK_WEBHOOK_URL`
- Optional/recommended for DM + richer delivery:
  - `SLACK_BOT_TOKEN`
  - `SLACK_MARKETING_CHANNEL` (defaults to `#marketing`)

Operational steps:

1. Create a Slack webhook for `#marketing` (or provide bot token/channel).
2. Set secrets in Supabase.
3. Deploy Edge Function.

```bash
supabase secrets set SLACK_WEBHOOK_URL="https://hooks.slack.com/services/..." --project-ref <PROJECT_REF>
supabase functions deploy slack-notify --project-ref <PROJECT_REF>
```

Notifications are triggered for:

- blog assignment
- writing completion
- blog ready for publishing
- blog published

## 7. Legacy Data Import

The project includes a one-time historical importer for legacy spreadsheet data.

Default source file:

- `critical-data/Blog Content Tracking - Sighthound and Redactor (cleaned).xlsx`

Run importer:

Dry run:

```bash
npm run import:legacy -- --dry-run
```

Actual import:

```bash
npm run import:legacy
```

Notes:

- Importer treats the **Calendar View** sheet as canonical historical source data.
- Imported records are written into `blogs` and remain editable in the dashboard.
- Re-runs attempt to update existing matching records instead of duplicating them.

## 8. Deployment

Deployment platform: **Vercel**

Steps:

1. Push repository to GitHub.
2. Connect repository in Vercel.
3. Configure environment variables in Vercel project settings.
4. Deploy.

Vercel rebuild behavior:

- Pushes to `main` trigger automatic redeploys (assuming default Vercel Git integration).

Production URL example:

- `https://content.sighthound.com`

Recommended pre-deploy check:

```bash
npm run check
```

## 9. Common Maintenance Tasks

### Add a new writer/publisher

1. Create Auth user.
2. Set role in `profiles`.

```sql
update profiles
set role = 'publisher',
    is_active = true,
    updated_at = timezone('utc', now())
where email = 'user@sighthound.com';
```

### Fix incorrect blog assignments

Preferred: update assignments in dashboard UI as admin.

Direct SQL fallback:

```sql
update blogs
set writer_id = 'WRITER_UUID',
    publisher_id = 'PUBLISHER_UUID',
    updated_at = timezone('utc', now())
where id = 'BLOG_UUID';
```

### Update Slack webhook

```bash
supabase secrets set SLACK_WEBHOOK_URL="https://hooks.slack.com/services/..." --project-ref <PROJECT_REF>
supabase functions deploy slack-notify --project-ref <PROJECT_REF>
```

### Re-run legacy importer

```bash
npm run import:legacy -- --dry-run
npm run import:legacy
```

Workflow integrity note:

- Workflow status transitions and `overall_status` derivation are enforced at the database layer (constraints/triggers + RLS), not just by UI controls.

## 10. Troubleshooting

### Login failure

Checks:

- User exists in Supabase Auth.
- Matching `profiles` row exists with valid role.
- User/domain is allowed for Google provider config.

Useful SQL:

```sql
select id, email, role, is_active
from profiles
where email = 'user@sighthound.com';
```

### Supabase connection errors

Checks:

- `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are set correctly.
- `SUPABASE_SERVICE_ROLE_KEY` is set for server-side/import paths.
- Restart dev server after env changes.

```bash
npm run dev
```

### Slack notifications not firing

Checks:

- `slack-notify` function is deployed.
- Slack secrets are present (`SLACK_WEBHOOK_URL` or bot-token configuration).
- Function logs show successful sends.

```bash
supabase functions logs slack-notify --project-ref <PROJECT_REF>
```

Queue/event diagnostics:

```sql
select id, event_type, status, created_at, delivered_at, last_error
from notification_events
order by created_at desc
limit 50;
```

### Importer parsing errors

Checks:

- XLSX file path exists and is readable.
- Workbook/sheet format is unchanged.
- `IMPORT_CREATED_BY_USER_ID` matches an existing `profiles.id`.

Retry with dry-run first:

```bash
npm run import:legacy -- --dry-run
```

Log locations:

- Supabase project logs (database + functions)
- Vercel deployment/build/runtime logs

## 11. Future Enhancements

Potential improvements (not part of v1 scope):

- analytics dashboard
- editorial review stage
- Slack reminder/scheduled jobs
- throughput and cycle-time metrics
