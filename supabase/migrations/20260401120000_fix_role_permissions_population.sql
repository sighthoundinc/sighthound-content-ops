-- Fix: Ensure role_permissions table is fully populated with correct defaults
-- This migration ensures that all permissions exist in role_permissions table
-- for all non-admin roles with the correct 'enabled' status based on defaults

-- Step 1: Identify any admin role rows and preserve them
-- Step 2: Delete and re-populate role_permissions for non-admin roles
-- Step 3: Ensure all permissions from permission_keys() are present

delete from public.role_permissions
where role <> 'admin'::public.app_role;

-- Re-insert all non-admin role permissions with correct defaults
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

-- Verify the fix: Check that writer role has create_blog enabled
-- This query should return 1 row with enabled=true
-- SELECT * FROM public.role_permissions WHERE role = 'writer'::public.app_role AND permission_key = 'create_blog';
