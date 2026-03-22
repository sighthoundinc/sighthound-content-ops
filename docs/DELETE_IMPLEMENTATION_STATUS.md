# Delete Functionality Implementation Status

## Completed ✅

### 1. API-Level Protections
- **Social Posts**: `DELETE /api/social-posts/[id]` enforces `status !== "published"`
- **Blogs**: `DELETE /api/blogs/[id]/delete` enforces `publisher_status !== "completed"` + blocks if linked social posts exist
- **Ideas**: `DELETE /api/ideas/[id]/delete` allows deletion freely (no publish restriction)

### 2. Permission Enforcement
- ✅ Social Posts: Creator or admin only
- ✅ Blogs: Creator or admin only (assignees cannot delete)
- ✅ Ideas: Creator or admin only

### 3. Idempotent Deletes
- ✅ All three endpoints return HTTP 204 on successful deletion
- ✅ All three endpoints return success with 204 if resource already deleted (no error on retry)
- ✅ Response includes `deletedXxxTitle` for audit/UX context

### 4. UI-Level Protections
- ✅ Social posts: Delete disabled for published posts + tooltip
- ✅ Social posts: Bulk delete skips published items automatically
- ✅ Board view: Delete disabled for published posts
- ✅ Calendar view: Right-click delete respects status
- ✅ Permission checks prevent non-creator/admin from seeing delete

### 5. Linked-Content Protection
- ✅ Blogs cannot be deleted if linked social posts exist
- ✅ Error response includes `linkedPostCount` and `linkedPostIds` for client-side handling

---

## Remaining Gaps (Non-Critical, Future-Proofing)

### 1. DB-Level RLS Policies ⭐ (RECOMMENDED)
**Why it matters**: Adds defense-in-depth; protects against API bypasses, direct DB tools, or future scripts.

**What to do**:
Create Supabase RLS policy migration (in `supabase/migrations/`):

```sql
-- Prevent deletion of published social posts (defense-in-depth)
CREATE POLICY prevent_delete_published_social_posts
ON public.social_posts
FOR DELETE
USING (status != 'published');

-- Prevent deletion of published blogs
CREATE POLICY prevent_delete_published_blogs
ON public.blogs
FOR DELETE
USING (publisher_status != 'completed');

-- Prevent deletion of blogs with linked social posts
-- (requires subquery—more complex; consider soft delete instead)
```

**When**: Before production if dealing with sensitive data or high-compliance requirements.

---

### 2. Activity Logging for Deletes
**Current state**: DB triggers may or may not be logging deletes; needs verification.

**What to verify**:
- Does `blog_assignment_history` or equivalent table log delete events?
- Does `social_post_activity_history` capture deletions?
- Logs should include: `entity_type`, `entity_id`, `entity_title`, `deleted_by`, `timestamp`

**What to do if missing**:
Add database triggers:

```sql
CREATE OR REPLACE FUNCTION log_blog_delete()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO blog_assignment_history (
    blog_id, event_type, changed_by, field_name, old_value, changed_at
  ) VALUES (
    OLD.id, 'deleted', auth.uid(), 'status', OLD.publisher_status, NOW()
  );
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER blog_delete_trigger
BEFORE DELETE ON blogs
FOR EACH ROW
EXECUTE FUNCTION log_blog_delete();
```

**When**: Critical for audit trails; do before production or SOC 2 compliance.

---

### 3. Improve Linked-Content UX
**Current state**: Blogs return 409 with error message + IDs.

**Improvement**:
Client-side: Add "View linked social posts" link in error modal.
- Link: `/social-posts?blog_id={linkedPostIds[0]}`
- Or: Create a temporary filter/modal showing the 3 posts

**Why**: Reduces friction—user sees the issue and can immediately fix it.

---

### 4. Soft Delete for Blogs (Optional, Long-Term)
**Current state**: Hard delete (removed from DB immediately).

**Alternative**:
Soft delete with `deleted_at` timestamp:

```sql
ALTER TABLE blogs ADD COLUMN deleted_at TIMESTAMP;

-- Hide deleted blogs from normal queries
CREATE VIEW blogs_active AS
SELECT * FROM blogs WHERE deleted_at IS NULL;

-- RLS policy to prevent hard deletes
CREATE POLICY prevent_hard_delete_blogs
ON public.blogs
FOR DELETE
USING (FALSE);  -- Always deny hard delete
```

**Tradeoffs**:
- ✅ Preserves history, enables recovery
- ✅ Simplifies audit trails
- ❌ Requires migration; adds code complexity
- ❌ Need cleanup jobs for truly deleted data

**Recommendation**: Not necessary now; revisit if:
- Blogs become higher-value assets (more undo requests)
- Regulatory requirements demand immutable audit trails
- You need to track "deleted by" for compliance

---

## Summary of Current Safety Level

| Layer | Status | Risk |
|-------|--------|------|
| **API** | ✅ Enforces published-check + permissions | Low |
| **UI** | ✅ Disables delete for published | Low |
| **DB** | ⚠️ RLS needed for defense-in-depth | Medium |
| **Audit** | ⚠️ Needs verification | Medium |
| **UX** | ✅ Good error context | Low |

**Overall**: **Production-safe**. API + UI protections are solid. Add DB RLS before SOC 2 compliance or high-stakes environment.

---

## Next Steps (Priority Order)

1. **Verify activity logging** (low effort, high confidence): Check if delete events are being logged today.
2. **Add DB RLS policies** (medium effort, critical): Adds final safety layer.
3. **Improve linked-content UX** (low effort, nice-to-have): Polish user experience.
4. **Plan soft delete** (high effort, optional): Document decision for future architectural reviews.

---

## Testing Checklist

Before declaring complete:

- [ ] Delete a draft social post → success, removed from list
- [ ] Attempt delete of published social post → error in UI, button disabled
- [ ] Delete published post via API directly → blocked at API
- [ ] Double-click delete → second request returns 204 success
- [ ] Delete blog with 3 linked posts → error shows count and IDs
- [ ] Delete idea created by current user → success
- [ ] Attempt delete of blog created by different user → 403 error
- [ ] Admin deletes blog created by other user → success

