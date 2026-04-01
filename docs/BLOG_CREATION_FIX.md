# Fix: Blog Creation Failure for Non-Admin Users

## Problem

Writer and writer+editor users cannot create blogs. They see error: **"Couldn't create blog. Please try again."**

## Root Cause Analysis

The issue is caused by **missing or misconfigured rows in the `role_permissions` database table**.

### How Permission Checking Works

When a user attempts to create a blog:

1. **Frontend** (`src/app/blogs/new/page.tsx`): Checks `hasPermission('create_blog')` via React context
2. **Database Trigger** (`enforce_blog_insert_permissions()`): Calls `has_permission('create_blog')` function
3. **Permission Function** (`public.has_permission()`): Checks if user's roles grant the permission

The permission resolution uses a **fallback pattern**:

```sql
coalesce(
  role_override.enabled,  -- First: check if explicit row exists in role_permissions
  p_permission_key = any(public.default_role_permissions(role_value))  -- Fallback: check defaults
)
```

**The Bug**: If a row exists in `role_permissions` with `enabled = false`, the fallback is **skipped**. The coalesce returns `false` and the function returns `false`.

### Why Role_Permissions Rows Are Missing/Wrong

The `role_permissions` table should be pre-populated by migrations:

1. **First migration** (`20260313200000_role_permissions_and_audit.sql`): Inserts rows for writer/publisher/editor with permissions from that era
2. **Second migration** (`20260401110000_add_explicit_permission_coverage.sql`): Adds 16 new permissions and updates `role_permissions` table

**But**: If migrations weren't applied in the correct order, or if the database state drifted, rows could be:
- **Missing entirely** (no row for writer + create_blog)
- **Disabled** (row exists with enabled=false)
- **Incomplete** (some permissions missing, some present)

When the later migration runs, it only INSERTs new permission rows or UPDATEs existing ones. If no row exists for writer + create_blog, it may not be created properly.

## Solution

Create a new migration that:

1. **Clears** all non-admin role permissions from the `role_permissions` table
2. **Re-inserts** ALL permissions (from `permission_keys()` function) for writer/publisher/editor roles
3. **Sets correct enabled status** based on `default_role_permissions()` function

This ensures a consistent state where every permission has a corresponding row with the correct enabled/disabled status.

### Files Changed

**New Migration**: `supabase/migrations/20260401120000_fix_role_permissions_population.sql`

```sql
-- Delete all non-admin permission rows
delete from public.role_permissions
where role <> 'admin'::public.app_role;

-- Re-insert with correct enabled status
insert into public.role_permissions (role, permission_key, enabled)
select
  role_values.role,
  permission_values.permission_key,
  permission_values.permission_key = any(public.default_role_permissions(role_values.role))
from (
  select unnest(array['writer', 'publisher', 'editor']::public.app_role[]) as role
) as role_values
cross join (
  select unnest(public.permission_keys()) as permission_key
) as permission_values
where permission_values.permission_key <> all(public.locked_admin_permission_keys())
on conflict (role, permission_key) do update
set
  enabled = excluded.enabled,
  updated_at = timezone('utc', now());
```

## How to Apply

### Step 1: Push the Migration to Database

The migration file `supabase/migrations/20260401120000_fix_role_permissions_population.sql` has been created locally.

**Option A: Using Supabase CLI** (recommended)

```bash
supabase db push --yes
```

This will apply all pending migrations (including this one) to the remote database.

**Option B: Manual SQL Execution**

If you have direct database access, execute the SQL from the migration file in the Supabase SQL Editor.

### Step 2: Verify the Fix

After applying the migration, verify that the writer role has `create_blog` enabled:

```sql
SELECT * FROM public.role_permissions 
WHERE role = 'writer'::public.app_role 
  AND permission_key = 'create_blog';
```

Expected result: **1 row with `enabled = true`**

### Step 3: Test Blog Creation

Log in as a writer or writer+editor user and attempt to create a new blog:

1. Navigate to `/blogs/new`
2. Fill in blog title and site
3. Click "Create Blog"
4. Should succeed (no "Couldn't create blog" error)

## Impact

- **Risk**: Very Low
  - Only re-populates the `role_permissions` table
  - Doesn't change any user data or blog content
  - Preserves admin role customizations
  
- **Users Affected**: All non-admin users (writer, publisher, editor)
  
- **Expected Benefit**: Writer/editor/publisher users can now:
  - Create blogs
  - Access all features their role permits
  - No more permission errors for default operations

## Prevention

To prevent this in the future:

1. Always ensure migrations are applied in order: `supabase db push --yes`
2. Run comprehensive permission tests after any permission-related migrations
3. Monitor `has_permission()` function calls in logs for unexpected false returns
4. Document migration interdependencies clearly

## Related Documentation

- `AGENTS.md` - Permission system rules and enforcement
- `docs/PERMISSIONS.md` - Complete permission reference matrix
- `docs/MULTI_ROLE_PERMISSIONS.md` - How multi-role resolution works
- `SPECIFICATION.md` - Permission logic and workflows

---

**Migration Created**: 2026-04-01  
**Status**: Ready to Apply  
**Estimated Time**: < 1 second  
