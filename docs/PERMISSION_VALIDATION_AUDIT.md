# Permission Validation Audit: Missing INSERT Triggers

## Executive Summary

After investigating the "Permission denied: edit_display_publish_date" error during blog creation, a systematic audit reveals that **only the `blogs` table has INSERT permission enforcement**. Several other entities that require permission control are **missing INSERT validation logic**, which could lead to similar permission bypasses or unexpected behavior.

## Issue Discovered & Fixed

### ✅ **Blogs Table** — COMPLETE
- **Status**: ✓ Has `enforce_blog_insert_permissions()` trigger on INSERT
- **Also has**: `enforce_blog_update_permissions()` trigger on UPDATE
- **Recent fix**: Migration `20260401150000` removed redundant date field permission checks from INSERT (dates are allowed during creation; ownership rules enforced on subsequent UPDATEs)
- **Owner**: `created_by` (creator)
- **Critical fields on CREATE**:
  - `create_blog` permission required
  - `created_by` must match authenticated user
  - Assignment permissions checked if `writer_id` or `publisher_id` are set
  - Workflow stage transitions validated
  - **Date fields**: Allowed without explicit permission (no permission check needed)

---

## Tables Missing INSERT Permission Enforcement

### ❌ **Social Posts Table** — MISSING INSERT TRIGGER
- **Current state**: No `enforce_social_post_insert_permissions()` trigger
- **Owner**: `created_by` (creator), later `editor_user_id` (editor)
- **Permissible actions**:
  - Create new social posts
  - Set initial brief (title, product, type, canva_url, etc.)
  - Set scheduled_date on creation
- **Risk**: Non-admin users could potentially bypass permission checks during creation
- **Missing validation**:
  - No `create_social_post` permission check (if this permission exists)
  - No assignment permission checks (if creator assigns to others)
  - No workflow stage validation on initial status
- **Current enforcement**: Only UPDATE trigger `enforce_social_post_workflow_transition()` exists for transitions
- **API endpoint** (if applicable): Check `/api/social-posts` POST route for permission validation

### ❌ **Blog Ideas Table** — MISSING INSERT TRIGGER
- **Current state**: No `enforce_blog_idea_insert_permissions()` trigger
- **Owner**: `created_by` (creator)
- **Permissible actions**:
  - Create ideas
  - Set title, site, description
- **Risk**: Non-admin users could bypass permission checks
- **Missing validation**:
  - No `create_idea` permission check (if this permission exists)
  - No restrictions on idea creation (intentional or oversight?)
- **Current enforcement**: None at database level
- **Note**: Ideas are lightweight; permission enforcement may be intentionally minimal

### ❌ **Blog Comments Table** — MISSING INSERT TRIGGER
- **Current state**: No `enforce_blog_comment_insert_permissions()` trigger
- **Owner**: `user_id` (creator)
- **Permissible actions**:
  - Create comments on blogs
- **Risk**: No database-level enforcement of `create_comment` permission
- **Missing validation**:
  - No `create_comment` permission check
  - No blog access validation (users can comment on any blog)
- **Current enforcement**: RLS policy only (if exists)
- **Likely OK**: Comments are typically open to authenticated users; permission check may be app-level only

### ❌ **Social Post Comments Table** — MISSING INSERT TRIGGER
- **Current state**: No `enforce_social_post_comment_insert_permissions()` trigger
- **Owner**: `user_id` (creator)
- **Permissible actions**:
  - Create comments on social posts
- **Risk**: No database-level enforcement of permission
- **Missing validation**: Similar to blog comments
- **Likely OK**: Comments are typically open; permission check may be app-level only

---

## Tables with Complete Enforcement

### ✓ **Blog Assignment History** — AUDIT ONLY (No permission needed)
- System-generated activity log
- Inserted by triggers only, not user-facing
- No permission enforcement needed

### ✓ **Social Post Activity History** — AUDIT ONLY (No permission needed)
- System-generated activity log
- Inserted by triggers only, not user-facing
- No permission enforcement needed

### ✓ **Blog Import Logs** — AUDIT ONLY (No permission needed)
- System-generated import tracking
- Inserted by API routes, permission enforcement at route level
- No database-level trigger needed

### ✓ **Role Permissions** — ADMIN-ONLY (Different permission model)
- Admin-only table for managing permissions
- No standard INSERT trigger; protected by RLS policy
- Permission model is `manage_permissions` (admin-locked)

### ✓ **Permission Audit Logs** — ADMIN-ONLY (System-generated)
- System-generated activity log for permission changes
- Inserted by triggers only
- Protected by RLS (admin-only)

---

## Risk Assessment

### **High Priority**

**`social_posts` — Consider adding INSERT trigger if:**
- Non-admins should have permission checks when creating posts
- Specific role/permission requirements exist (e.g., only editors can create)
- Field restrictions exist on creation (e.g., certain fields must be unset)

**Action**: Review permission requirements in SPECIFICATION.md. If `create_social_post` permission exists or will exist, add `enforce_social_post_insert_permissions()` trigger.

### **Medium Priority**

**`blog_ideas` — Consider adding INSERT trigger if:**
- Idea creation should be restricted to specific roles
- Permission `create_idea` is defined or planned
- Idea creation is currently unrestricted but should be controlled

**Action**: Review business rules. If ideas require permission control, add trigger. Otherwise, document why creation is unrestricted.

### **Low Priority**

**`blog_comments` and `social_post_comments` — Review only:**
- Comments are typically open to authenticated users
- Permission enforcement may be intentional (unrestricted collaboration)
- RLS policies may already prevent unauthorized access

**Action**: Verify with RLS policy review. Document intentional design choice.

---

## Recommended Actions

### 1. **Immediate** (If social post creation should be permission-controlled)
Create migration `20260401160000_add_social_post_insert_enforcement.sql`:
```sql
create or replace function public.enforce_social_post_insert_permissions()
returns trigger
language plpgsql
as $$
begin
  if auth.role() = 'service_role' then
    return new;
  end if;

  -- Add permission checks as needed
  if not public.has_permission('create_social_post') then
    raise exception 'Permission denied: create_social_post';
  end if;

  if new.created_by is distinct from auth.uid() then
    raise exception 'created_by must match the authenticated user';
  end if;

  -- Add assignment and workflow validation as needed

  return new;
end;
$$;

-- Attach trigger
drop trigger if exists social_posts_enforce_insert_permissions on public.social_posts;
create trigger social_posts_enforce_insert_permissions
before insert on public.social_posts
for each row execute function public.enforce_social_post_insert_permissions();
```

### 2. **Review** (Blog ideas and comments)
- Clarify whether idea/comment creation should be restricted
- Document intentional unrestricted creation (if applicable)
- Add triggers if permission control is needed

### 3. **Documentation**
- Update AGENTS.md with permission enforcement patterns
- Document which tables have INSERT vs UPDATE permission checks
- Create a matrix: `TABLE | INSERT CHECK | UPDATE CHECK | RLS POLICY`

---

## Pattern for Future Implementations

When creating new entities that require permission control:

1. **Define permission key** in `public.permission_keys()` function (e.g., `create_entity`)
2. **Create INSERT trigger** `enforce_entity_insert_permissions()`:
   - Check `has_permission('create_entity')`
   - Validate `created_by` matches authenticated user
   - Check assignment permissions if applicable
   - Validate workflow stage if applicable
3. **Create UPDATE trigger** `enforce_entity_update_permissions()`:
   - Check field-level permissions
   - Validate ownership for critical fields
   - Enforce workflow transitions (if applicable)
4. **Add RLS policies** for SELECT/UPDATE/DELETE
5. **Document in SPECIFICATION.md** what operations are permission-gated

---

## Related Issues

- [Blog Creation Fix] Migration `20260401150000` — Allowed date fields in blog INSERT without permission checks (ownership-based approach)
- [AGENTS.md] "Workflow-Critical Field Ownership (MUST)" — Date fields controlled by ownership, not permissions

---

## Sign-off

**Status**: Audit complete. Recommendations documented.
**Date**: 2026-04-01
**Risk level**: Medium (potential permission bypasses in social_posts and blog_ideas if permission checks are required but missing)
**Next step**: Review SPECIFICATION.md to confirm permission requirements, then implement enforcement for high-priority tables.
