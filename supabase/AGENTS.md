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
|- For `wipe_app_clean_data` and similar routines, every delete statement must include an explicit predicate.
|- Bare full-table deletes are disallowed; use `WHERE true` when the intent is full-table deletion.
|- If runtime logs show SQLSTATE `21000` with `DELETE requires a WHERE clause`, patch via a new forward migration immediately (do not rewrite applied migrations).

## INSERT Permission Enforcement Pattern (MUST)

**Authority principle**: All delegable creation permissions must be enforced at the database layer (INSERT triggers), not just UI checks.

### When to add an INSERT trigger:
1. Entity has a delegable `create_<entity>` permission defined in `public.permission_keys()`
2. The permission is not admin-locked (can be toggled per role)
3. Non-admin users should be able to create the entity based on their role permissions

### Current implementations:
- ✅ `blogs` — `enforce_blog_insert_permissions()` validates `create_blog` permission
- ✅ `social_posts` — `enforce_social_post_insert_permissions()` validates `create_social_post` permission
- ✅ `blog_ideas` — `enforce_blog_idea_insert_permissions()` validates `create_idea` permission

### Trigger implementation template:
```sql
create or replace function public.enforce_<entity>_insert_permissions()
returns trigger
language plpgsql
as $$
begin
  -- Bypass for service role (admin API calls)
  if auth.role() = 'service_role' then
    return new;
  end if;

  -- Check creation permission
  if not public.has_permission('create_<entity>') then
    raise exception 'Permission denied: create_<entity>';
  end if;

  -- Validate created_by matches authenticated user
  if new.created_by is distinct from auth.uid() then
    raise exception 'created_by must match the authenticated user';
  end if;

  -- Add entity-specific validation if needed (e.g., assignments, workflow state)

  return new;
end;
$$;

drop trigger if exists <entity>_enforce_insert_permissions on public.<entity>;
create trigger <entity>_enforce_insert_permissions
before insert on public.<entity>
for each row execute function public.enforce_<entity>_insert_permissions();
```

### Additional field validation (optional):
- **Assignment validation**: If creator assigns ownership (e.g., `writer_id` in blogs), check `change_<role>_assignment` permission
- **Workflow validation**: If initial status is non-default, validate via `can_transition_<role>_status()` function
- **Field-level restrictions**: If certain fields must be unset on creation, add explicit checks

### Update triggers (separate):
All INSERT-enforced entities should also have UPDATE triggers to validate field-level edits (handled separately; see `enforce_<entity>_update_permissions()` pattern).

### Related considerations:
- **Date fields on CREATE**: Workflow-critical dates (e.g., `scheduled_publish_date`) are allowed on creation without explicit permission checks (ownership rules enforced on UPDATE)
- **Comments & audit tables**: No INSERT trigger needed (system-generated or open to authenticated users)
- **Backward compatibility**: Explicit permission checks in triggers remain compatible with ownership-based RLS rules

### Testing INSERT enforcement:
1. Test with user having `create_<entity>` permission → insert succeeds
2. Test with user lacking `create_<entity>` permission → raises "Permission denied: create_<entity>"
3. Test with `created_by` not matching authenticated user → raises "created_by must match the authenticated user"
4. Test with service role (admin API) → bypasses checks, insert succeeds
5. Verify UI properly catches permission errors and displays actionable messages
