# Sighthound Content Ops — Operations Runbook
This runbook is for maintainers and operators.  
For product behavior, see `SPECIFICATION.md`.  
For end-user instructions, see `HOW_TO_USE_APP.md`.

## 1) System overview
- Frontend: Next.js + TypeScript + Tailwind
- Backend: Supabase (Postgres, Auth, RLS, triggers/functions)
- Integration: Slack via `supabase/functions/slack-notify`
- Authorization: permission matrix + role templates + DB checks

Durable state and authorization decisions are DB-authoritative. UI checks are UX guardrails.

## 2) Key directories
- `src/` — app routes/components/libs
- `src/lib/permissions.ts` — permission definitions/templates/helpers
- `src/lib/server-permissions.ts` — server-side permission resolution
- `src/app/settings/permissions/` — permission management UI
- `src/app/api/admin/permissions/` — permission CRUD/reset APIs
- `src/app/api/admin/reassign-assignments/` — assignment transfer API
- `src/app/api/admin/activity-history/` — admin audit/history cleanup API
- `src/app/api/admin/quick-view/` — admin quick-view user session switch API
- `src/lib/quick-view.ts` — quick-view snapshot storage helpers
- `supabase/migrations/` — schema/history migrations
- `supabase/functions/` — edge functions
- `scripts/` — operational scripts (legacy import)

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
- `npm run dev:full` — app + TypeScript watch
- `npm run lint` — `next lint`
- `npm run typecheck` — `tsc --noEmit`
- `npm run check` — lint + typecheck in parallel
- `npm run import:legacy` — legacy import

Pre-commit:
- Husky enabled via `prepare`
- `.husky/pre-commit` runs `lint-staged`
- staged TS/TSX files run `eslint --fix`

## 5) Supabase migration operations
### List migration state
```bash
supabase --workdir "/absolute/path/to/sighthound-content-ops" migration list
```

### Push migrations
```bash
supabase --workdir "/absolute/path/to/sighthound-content-ops" db push --yes
```

### Sanity sequence (recommended)
```bash
supabase --workdir "/absolute/path/to/sighthound-content-ops" migration list
supabase --workdir "/absolute/path/to/sighthound-content-ops" db push --yes
supabase --workdir "/absolute/path/to/sighthound-content-ops" migration list
npm run check
```

### Migration note: `20260313213000_expand_permission_matrix.sql`
- this migration remaps legacy permission keys into the expanded keyset
- if permission-key check constraints are still legacy at runtime, remap inserts can fail
- ensure constraint drops occur before remap inserts (already reflected in current migration file)

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
- `20260313193000_shared_non_admin_role_model.sql`
- `20260313200000_role_permissions_and_audit.sql`
- `20260313213000_expand_permission_matrix.sql`

## 6) Permission operations
Primary control plane:
- UI: `/settings/permissions`
- API: `/api/admin/permissions`

Behavior:
- role-level permission toggles by configurable permission keys
- reset selected role to default template
- permission change audit log
- admin-locked permissions remain non-configurable

When debugging access:
1. verify role assignment (`profiles.role`, `profiles.user_roles`)
2. verify `role_permissions` rows for role
3. confirm permission key naming (canonical vs legacy aliases)
4. refresh profile/session permissions cache

## 7) Assignment transfer operations
API:
- `/api/admin/reassign-assignments`

Use this to move writer/publisher assignments safely between users, instead of manual SQL updates.

## 8) Admin maintenance operations
Activity history cleanup API:
- `/api/admin/activity-history` (`DELETE`)

Capabilities:
- delete all activity history (global)
- delete history scoped to selected users
- optional comments cleanup (`blog_comments`, `social_post_comments`) with same scope rules

Operational notes:
- endpoint is hard-gated to admin role
- destructive operation; no restore path
- intended for test-data cleanup and environment hygiene

## 9) Quick-view as user operations
Quick-view session switch API:
- `/api/admin/quick-view` (`POST`)

Behavior:
- admin chooses active non-admin target user
- system generates one-time auth flow and switches browser session
- while quick-view is active, all reads/writes run as selected user
- audit trail and action attribution follow the selected user context

Return flow:
- quick-view snapshot is stored in browser local storage
- “Return to Admin” restores original admin session
- sign-out clears quick-view snapshot state
## 10) Slack operations
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

## 11) Legacy import operations
Dry run:
```bash
npm run import:legacy -- --dry-run
```

Execute:
```bash
npm run import:legacy
```

Canonical source is the cleaned workbook (`Calendar View` sheet).

## 12) Troubleshooting quick map
### “Comments table is missing from schema cache”
1. run latest migrations
2. confirm `blog_comments` exists
3. confirm schema reload notify executed

### “Permission denied for action”
1. verify user role(s)
2. verify permission matrix rows for role
3. verify required permission key for that action
4. re-login or refresh permission cache

### “Migration 20260313213000 fails with `role_permissions_permission_key_valid`”
1. confirm local migration file includes early constraint drops before legacy remap insert
2. rerun `supabase ... db push --yes`
3. verify local/remote parity with `supabase ... migration list`

### “Queue sections empty unexpectedly”
1. verify assignment (`writer_id` / `publisher_id`)
2. verify current queue filter and stage state
3. confirm `view_writing_queue` / `view_publishing_queue` permission

### “Actions are being logged under unexpected user”
1. check whether quick-view mode is active in UI banner
2. run Return to Admin flow
3. if restore fails, re-authenticate admin user and verify local snapshot clear

### “Enum/status mismatch during writes”
1. verify latest status compatibility migrations are applied
2. verify local/remote migration alignment

### General runtime issue
1. run `npm run check`
2. verify env vars
3. check Supabase logs + Next runtime logs
## 13) Deployment baseline
- deploy frontend on Vercel
- set env vars in deployment target
- ensure migrations are fully applied before release
- run `npm run check` before merge/release
