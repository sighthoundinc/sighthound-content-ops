# supabase Rules

Inherit root project rules and apply Deft with a Supabase schema/RLS/functions focus.

Primary references:
- `../deft/main.md`
- `../deft/coding/coding.md`
- `../deft/languages/sql.md`
- `../deft/languages/typescript.md`
- `../deft/interfaces/rest.md`
- `../deft/coding/testing.md`
- `../deft/PROJECT.md`

Context-specific overrides for `supabase/`:
- Treat `supabase/migrations/` as append-only; add new timestamped migrations instead of rewriting applied ones.
- For schema, RLS, permissions, or trigger changes, explicitly call out risk and rollback strategy.
- Keep edge functions in `supabase/functions/**/index.ts` minimal and side-effect-aware.
- Prefer idempotent SQL patterns where possible and avoid destructive operations unless explicitly requested.
- SQL cleanup/wipe routines must use explicit `DELETE ... WHERE` predicates (including full-table cleanup as `WHERE true`) to avoid environment-level safe-delete failures.

## Auth trigger safety (MUST)
- Any trigger/function on `auth.users` that writes to `public` tables must use fully-qualified table references (for example `public.user_integrations`).
- Auth-side trigger functions must be `SECURITY DEFINER` with explicit `search_path`.
- Optional side-effect writes (profile bootstrap, integrations bootstrap, preferences bootstrap) must be exception-safe and must never abort auth user creation.
- If logs show `42P01` or `relation ... does not exist` from auth trigger context, treat it as a migration/qualification regression and patch immediately with a forward migration.

## Wipe/Cleanup SQL safety (MUST)
- For `wipe_app_clean_data` and similar routines, every delete statement must include an explicit predicate.
- Bare full-table deletes are disallowed; use `WHERE true` when the intent is full-table deletion.
- If runtime logs show SQLSTATE `21000` with `DELETE requires a WHERE clause`, patch via a new forward migration immediately (do not rewrite applied migrations).
