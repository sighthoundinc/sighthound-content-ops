# Sighthound Content Ops — Operations Runbook

This runbook is for maintainers and operators.  
For product behavior and requirements, see `SPECIFICATION.md`.  
For end-user instructions, see `HOW_TO_USE_APP.md`.

## 1) System overview
- Frontend: Next.js + TypeScript + Tailwind
- Backend: Supabase (Postgres, Auth, RLS, Edge Functions)
- Integration: Slack via `supabase/functions/slack-notify`
- Durable state lives in Supabase; frontend manages UI/session only.

## 2) Key directories
- `src/` — app routes/components/libs
- `supabase/migrations/` — schema/history migrations
- `supabase/functions/` — edge functions
- `scripts/` — operational scripts (legacy import)
- `critical-data/` — legacy workbook input

## 3) Local setup
```bash
npm install
cp .env.example .env.local
npm run dev
```

Required env:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_APP_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `IMPORT_CREATED_BY_USER_ID`
- optional `LEGACY_XLSX_PATH`

## 4) Dev workflows
- `npm run dev` — app only
- `npm run dev:full` — app + `tsc --watch`
- `npm run lint` — `next lint`
- `npm run typecheck` — `tsc --noEmit`
- `npm run check` — lint + typecheck in parallel

Pre-commit:
- Husky is enabled (`prepare` script).
- `.husky/pre-commit` runs `npx lint-staged`.
- `lint-staged` runs `next lint --fix` for staged `*.ts`/`*.tsx`.

## 5) Supabase migration operations

### List migration state
```bash
supabase --workdir "/absolute/path/to/sighthound-content-ops" migration list
```

### Push migrations
```bash
supabase --workdir "/absolute/path/to/sighthound-content-ops" db push --yes
```

### Current migration set
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

### Notes on compatibility hardening
Recent migration hardening includes:
- enum/status trigger compatibility during legacy transitions
- backfill migration for completion-link constraints
- comments actor column compatibility (`user_id` + `created_by`)
- profile role-array compatibility fallbacks

## 6) Slack operations
Function:
- `supabase/functions/slack-notify/index.ts`

Secrets:
- `SLACK_BOT_TOKEN` (preferred)
- `SLACK_MARKETING_CHANNEL` (optional)
- `SLACK_WEBHOOK_URL` (fallback)

Deploy/update:
```bash
supabase functions deploy slack-notify --project-ref <PROJECT_REF>
```

## 7) Legacy import
Dry run:
```bash
npm run import:legacy -- --dry-run
```

Execute:
```bash
npm run import:legacy
```

Canonical source: `Calendar View` sheet in the cleaned legacy workbook.

## 8) Troubleshooting quick map
### “Comments table is missing from schema cache”
1. Run latest migrations (`db push`)
2. Confirm `blog_comments` exists
3. Ensure migration includes `notify pgrst, 'reload schema'`

### “Active profile not found”
1. Confirm requester has active row in `profiles`
2. Confirm `is_active = true`
3. Ensure latest profile compatibility migration applied

### Enum/status mismatch during writes
1. Confirm latest status-trigger compatibility migration is applied
2. Re-run `migration list` and verify local/remote alignment

### General runtime issue
1. Run `npm run check`
2. Validate env vars
3. Check Supabase logs and Next runtime logs

## 9) Deployment baseline
- Deploy frontend on Vercel
- Ensure env vars are set in deployment environment
- Ensure Supabase migration history is in sync before release
- Run `npm run check` before merge/release
