# Multi-Role Permissions and Audit Documentation

## Overview

The permission system supports **multi-role users** where a single user can hold multiple roles (e.g., writer + editor, or publisher + admin). Permissions from all assigned roles are combined using a **union** model: a user has a permission if **ANY** of their roles grants it.

## Multi-Role Permission Resolution

### How It Works

**Database Level** (`has_permission()` function in migration `20260313213000_expand_permission_matrix.sql`):

```sql
-- Fetch user's roles (lines 336-341)
caller_roles := coalesce(caller_profile.user_roles, array[]::public.app_role[]);
if cardinality(caller_roles) = 0 then
  caller_roles := array[caller_profile.role];
elsif not (caller_roles @> array[caller_profile.role]::public.app_role[]) then
  caller_roles := array_prepend(caller_profile.role, caller_roles);
end if;

-- Check if admin is in roles (fast path)
if caller_roles @> array['admin'::public.app_role] then
  return true;
end if;

-- Union permission check: ANY role has permission → true
return exists (
  select 1
  from unnest(caller_roles) as role_value
  left join lateral (
    select enabled
    from public.role_permissions rp
    where rp.role = role_value
      and rp.permission_key = p_permission_key
  ) as role_override on true
  where coalesce(
    role_override.enabled,
    p_permission_key = any(public.default_role_permissions(role_value))
  )
);
```

**Frontend Level** (`resolvePermissionsForRoles()` in `src/lib/permissions.ts`):

```typescript
export function resolvePermissionsForRoles(
  roles: AppRole[],
  rolePermissionRows: RolePermissionRow[] = []
) {
  const resolved = new Set<AppPermissionKey>();

  if (roles.includes("admin")) {
    for (const permissionKey of ALL_PERMISSION_KEYS) {
      resolved.add(permissionKey);
    }
  } else {
    // Union: add permissions from ALL roles
    for (const role of roles) {
      const rolePermissionState = getRolePermissionState(role, rolePermissionRows);
      for (const permissionKey of ALL_PERMISSION_KEYS) {
        if (rolePermissionState[permissionKey]) {
          resolved.add(permissionKey);
        }
      }
    }
  }

  return Array.from(resolved);
}
```

### Example Scenarios

**Scenario 1: Writer + Editor**
```
User has roles: [writer, editor]

Default permissions granted:
- Writer: create_blog, edit_blog_title, start_writing, submit_draft, ...
- Editor: edit_blog_metadata, edit_blog_description, request_revision, ...

Effective permissions: Union of both
- ✅ create_blog (from writer)
- ✅ edit_blog_title (from writer)
- ✅ edit_blog_description (from editor)
- ✅ start_writing (from writer)
- ✅ request_revision (from editor)
```

**Scenario 2: Writer + Publisher**
```
User has roles: [writer, publisher]

Default permissions granted:
- Writer: create_blog, edit_blog_title, start_writing, ...
- Publisher: edit_blog_metadata, start_publishing, complete_publishing, ...

Effective permissions: Union of both
- ✅ create_blog (from writer)
- ✅ edit_blog_title (from writer)
- ✅ start_writing (from writer)
- ✅ start_publishing (from publisher)
- ✅ complete_publishing (from publisher)
```

**Scenario 3: With Admin**
```
User has roles: [writer, admin]

Result: ALL 92 permissions (admin fast-path returns true immediately)
```

## Role Customization with Multi-Roles

When you customize permissions for a role via Settings > Permissions, those customizations are **per-role**, not per-user. For multi-role users, customizations apply as follows:

**Example: Custom Writer Role**

Original writer defaults:
- ✅ create_blog
- ✅ edit_blog_title
- ✅ start_writing

Custom override (in `role_permissions` table):
- ✅ create_blog → enabled: true (no change)
- ❌ edit_blog_title → enabled: false (disabled)
- ✅ start_writing → enabled: true (no change)

A **writer + editor** user now has:
- ✅ create_blog (writer: enabled)
- ❌ edit_blog_title (writer: disabled, editor: doesn't have it)
- ✅ start_writing (writer: enabled)
- ✅ edit_blog_description (editor: granted)

The multi-role union still applies: if ANY role has a permission, the user has it.

## Permission Auditing

### Audit Sources

Permission changes are logged in two ways:

#### 1. **Database Audit Trail** (`permission_audit_logs` table)

Automatically logged whenever permissions are modified via the Settings > Permissions UI:

```sql
CREATE TABLE public.permission_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role app_role NOT NULL,
  permission_key text NOT NULL,
  old_enabled boolean,
  new_enabled boolean,
  changed_by uuid NOT NULL REFERENCES public.profiles(id),
  changed_at timestamp DEFAULT timezone('utc', now()),
  reason text
);
```

**What gets logged:**
- Role that was changed
- Permission key
- Old enabled status → New enabled status
- User who made the change
- Timestamp

**Access Control:**
- Admins only can view via `/api/admin/permissions`
- Logged during PATCH updates to role permissions
- Immutable historical record

#### 2. **User Activity Log** (Activity History)

Visible to all authenticated users on the Activity History page (`/settings/access-logs`):

```sql
-- Activity entries include permission changes
SELECT 
  event_type,  -- 'permission_changed'
  user_id,     -- who changed it
  content_id,  -- role that was changed
  field_name,  -- permission_key
  old_value,   -- was enabled/disabled
  new_value,   -- now enabled/disabled
  timestamp
FROM blog_assignment_history  -- or generic activity table
WHERE event_type = 'permission_changed';
```

#### 3. **API Endpoint Audit**

The `PATCH /api/admin/permissions` endpoint:
- Validates permission before applying
- Logs to `permission_audit_logs` with `changed_by = auth.uid()`
- Returns success/failure with audit trail reference
- Triggers `permission_audit_logs` insert via database trigger

### Audit Queries

**All permission changes for a role:**
```sql
SELECT *
FROM public.permission_audit_logs
WHERE role = 'writer'
ORDER BY changed_at DESC;
```

**Permission changes made by a user:**
```sql
SELECT *
FROM public.permission_audit_logs
WHERE changed_by = '12345678-...'
ORDER BY changed_at DESC;
```

**When a specific permission was changed:**
```sql
SELECT *
FROM public.permission_audit_logs
WHERE permission_key = 'create_blog'
ORDER BY changed_at DESC;
```

**Multi-role impact analysis** (who had permission before/after):
```sql
-- Before change: users with this permission via role_permissions
SELECT profiles.*
FROM profiles
JOIN (
  SELECT DISTINCT user_id
  FROM role_permissions rp
  JOIN profiles p ON p.user_roles @> ARRAY[rp.role]::app_role[]
  WHERE permission_key = 'create_blog'
    AND enabled = true
    AND p.user_roles IS NOT NULL  -- multi-role users
) affected ON profiles.id = affected.user_id
ORDER BY profiles.email;
```

## Multi-Role Test Cases

### Test 1: Basic Permission Union
**Setup**: User with roles [writer, editor], no customizations
**Expected**: User can perform both writer AND editor actions
**Verify**:
- Can create blog (writer permission)
- Can request revision (editor permission)
- Cannot start publishing (neither role has this)

### Test 2: Role Customization Impact
**Setup**: User with [writer, editor], writer role has `edit_blog_title` disabled
**Expected**: Customization applies only to writer role
**Verify**:
- Cannot edit blog title (writer: disabled)
- User still has other writer permissions (create_blog, etc.)
- User still has all editor permissions

### Test 3: Admin Fast-Path
**Setup**: User with roles [writer, admin]
**Expected**: All permissions granted (admin fast-path)
**Verify**:
- All 92 permissions available
- No role customization applies (admin overrides all)

### Test 4: Audit Logging
**Setup**: Admin changes writer role `create_blog` from enabled → disabled
**Expected**: Entry logged to `permission_audit_logs`
**Verify**:
- `permission_audit_logs` contains entry
- `changed_by` = admin user ID
- `role` = 'writer'
- `permission_key` = 'create_blog'
- `old_enabled` = true
- `new_enabled` = false

### Test 5: Multi-Role Audit Impact
**Setup**: After test 4, find all multi-role users affected
**Expected**: Multi-role [writer, editor] users are still affected (can still create blogs via editor)
**Verify**:
- User can still create blogs (editor has this permission)
- User with [writer] only cannot (writer customization applies)

## Implementation Checklist

- ✅ Multi-role union in `has_permission()` database function
- ✅ Multi-role union in `resolvePermissionsForRoles()` frontend function
- ✅ Permission audit table (`permission_audit_logs`) with RLS
- ✅ Audit logging on permission changes (trigger or API layer)
- ✅ Audit query examples for support/debugging
- ✅ Activity History visibility for permission change events
- ✅ Admin audit access via `/api/admin/permissions`
- ✅ Test cases covering multi-role scenarios

## See Also

- `AGENTS.md` — Permission System section
- `SPECIFICATION.md` — Roles and Permissions Model (section 3)
- `docs/PERMISSIONS.md` — Complete permission reference
- `src/lib/permissions.ts` — Frontend permission functions
