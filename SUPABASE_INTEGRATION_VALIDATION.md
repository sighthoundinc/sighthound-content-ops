# Supabase RLS Integration - Validation Plan

**Status**: Integrated ✅  
**Date**: 2026-04-16  
**Phase**: Step 1 - Database Integration

---

## What Changed

### Before (Mock Data)
```typescript
async function getMockEntityState(entityType: string, entityId: string) {
  const mockEntities = { "blog-123": {...} }
}
```

### After (Real Supabase RLS)
```typescript
async function getEntityState(entityType: string, entityId: string, userId: string): Promise<EntityState> {
  const supabase = createClient(...)
  // Query blogs/social_posts with RLS enforcement
  // Map DB fields to DetectorInput format
  // Handle not found / RLS denial errors
}
```

---

## Integration Details

### File Updated
- `src/app/api/ai/assistant/route.ts`

### Changes Made

1. **Added Supabase Client Import**
   ```typescript
   import { createClient } from "@supabase/supabase-js";
   ```

2. **New EntityState Interface**
   ```typescript
   interface EntityState {
     status: string;
     fields: Record<string, boolean>;
     ownerId: string;
     reviewerId?: string;
   }
   ```

3. **Replaced Mock DB Function**
   - Old: `getMockEntityState(entityType, entityId)`
   - New: `getEntityState(entityType, entityId, userId)`
   - Includes RLS enforcement via Supabase anon key
   - Handles both `blogs` and `social_posts` tables

4. **Field Mapping**
   - **Blogs**: title, writer_id, draft_doc_link, publisher_id, scheduled_publish_date
   - **Social Posts**: product, type, canva_url, caption, platforms, scheduled_publish_date, title

5. **Error Handling**
   - RLS denial → `403 UNAUTHORIZED`
   - Not found → `404 NOT_FOUND`
   - Other errors → `500 INTERNAL_ERROR`

6. **Quality Checking Now Real**
   - Fetches actual blog title for quality evaluation
   - Fetches actual social post caption/platforms for quality evaluation

---

## Validation Checklist

### Prerequisites
- [x] Supabase project configured
- [x] `.env.local` has `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [x] RLS policies enabled on `blogs` and `social_posts` tables
- [x] TypeScript compilation: 0 errors ✅

### Test Case 1: Blog Exists + User Has Access
**Setup**: 
- Create test blog in draft status
- Assign to test writer user

**API Call**:
```json
{
  "entityType": "blog",
  "entityId": "test-blog-id",
  "userId": "test-writer-id",
  "userRole": "writer"
}
```

**Expected Result**:
- ✅ 200 OK
- ✅ `canProceed: false` (if missing required fields)
- ✅ Blockers list accurate
- ✅ Quality score reflects real title length

### Test Case 2: Social Post Exists + User Has Access
**Setup**:
- Create test social post in in_review status
- Assign creator and editor

**API Call**:
```json
{
  "entityType": "social_post",
  "entityId": "test-social-id",
  "userId": "test-creator-id",
  "userRole": "writer"
}
```

**Expected Result**:
- ✅ 200 OK
- ✅ Current status: "in_review"
- ✅ Quality issues include caption length check (real data)
- ✅ Ownership enforced

### Test Case 3: RLS Denial (Non-Owner Access)
**Setup**:
- Blog owned by user-A
- Try to access as user-B

**API Call**:
```json
{
  "entityType": "blog",
  "entityId": "blog-owned-by-a",
  "userId": "user-b",
  "userRole": "writer"
}
```

**Expected Result**:
- ✅ 403 UNAUTHORIZED
- ✅ Error message: "You do not have access to this content"
- ✅ RLS denied the query at database level

### Test Case 4: Content Not Found
**API Call**:
```json
{
  "entityType": "blog",
  "entityId": "nonexistent-id",
  "userId": "test-user",
  "userRole": "writer"
}
```

**Expected Result**:
- ✅ 404 NOT_FOUND
- ✅ Error message: "Content not found"

---

## Next Steps After Validation

### ✅ If All Tests Pass
1. Deploy to staging/production
2. Proceed to Step 2: UI Integration
   - Add "Ask AI" button to blog/social editors
   - Display response in modal/panel

### ⚠️ If Tests Fail
1. Check `.env.local` configuration
2. Verify RLS policies on tables
3. Ensure test user has proper assignments
4. Check Supabase auth session
5. Review error messages in API response

---

## RLS Policy Requirements

### Blogs Table RLS
```sql
-- Users can read blogs they own (as writer)
SELECT * FROM blogs WHERE auth.uid() = writer_id;

-- Users can read blogs assigned to them (as publisher)
SELECT * FROM blogs WHERE auth.uid() = publisher_id;

-- Users assigned as reviewers can read
SELECT * FROM blogs WHERE auth.uid() IN (SELECT reviewer_id FROM blog_assignments WHERE blog_id = blogs.id);
```

### Social Posts Table RLS
```sql
-- Users can read posts they created
SELECT * FROM social_posts WHERE auth.uid() = created_by;

-- Users assigned as editor can read
SELECT * FROM social_posts WHERE auth.uid() = editor_id;

-- Users assigned to the post can read
SELECT * FROM social_posts WHERE auth.uid() IN (SELECT user_id FROM social_post_assignments WHERE post_id = social_posts.id);
```

---

## Field Mappings Reference

### Blog Fields
| DB Column | Detector Field | Presence Check |
|-----------|----------------|----------------|
| title | title | !!data.title |
| writer_id | writer_id | !!data.writer_id |
| draft_doc_link | draft_doc_link | !!data.draft_doc_link |
| publisher_id | publisher_id | !!data.publisher_id |
| scheduled_publish_date | scheduled_publish_date | !!data.scheduled_publish_date |

### Social Post Fields
| DB Column | Detector Field | Presence Check |
|-----------|----------------|----------------|
| product | product | !!data.product |
| type | type | !!data.type |
| canva_url | canva_url | !!data.canva_url |
| canva_page | canva_page | !!data.canva_page |
| caption | caption | !!data.caption |
| platforms | platforms | !!data.platforms |
| scheduled_publish_date | scheduled_publish_date | !!data.scheduled_publish_date |
| title | title | !!data.title |
| associated_blog_id | associated_blog_id | !!data.associated_blog_id |

---

## Rollback Instructions

If needed, revert to mock data:
```typescript
// Revert route.ts to use getMockEntityState instead of getEntityState
// Remove Supabase imports
// Restore mock entities object
```

---

## Success Criteria

✅ All 4 test cases pass  
✅ TypeScript strict mode: 0 errors  
✅ RLS policies enforced correctly  
✅ Quality checks use real data  
✅ Error handling works for edge cases  
✅ Ready for UI integration (Step 2)

---

**Status**: Ready for Live Validation  
**Next**: Run test cases against Supabase, then proceed to Step 2 (UI Integration)
