# Social Post Assignment Event Support - Visual & Implementation Guide

## What is Social Post Assignment?

### Current Social Post Workflow Roles

Social posts have **two role-based actors**:

```
┌─────────────────────────────────────────────────────┐
│          Social Post Workflow Roles                 │
├─────────────────────────────────────────────────────┤
│                                                     │
│  EDITOR (editor_user_id)                           │
│  ├─ Status: draft                                  │
│  ├─ Status: changes_requested                      │
│  ├─ Status: ready_to_publish                       │
│  └─ Status: awaiting_live_link                     │
│                                                     │
│  ADMIN (admin_owner_id)                            │
│  ├─ Status: in_review                              │
│  └─ Status: creative_approved                      │
│                                                     │
│  Both → Status: published                          │
│                                                     │
└─────────────────────────────────────────────────────┘
```

### Database Fields Ready (Already Exist)

```sql
-- These fields are ALREADY in the social_posts table:
ALTER TABLE social_posts ADD COLUMN editor_user_id UUID;     -- Who edits the post
ALTER TABLE social_posts ADD COLUMN admin_owner_id UUID;     -- Who reviews/approves
```

### Audit System Ready (Already Implemented)

```sql
-- When either field changes, this trigger fires automatically:
IF new.editor_user_id IS DISTINCT FROM old.editor_user_id
   OR new.admin_owner_id IS DISTINCT FROM old.admin_owner_id THEN
   -- Logs 'social_post_assignment_changed' event
   -- Triggers notification
END IF;
```

---

## Why We're Not Implementing UI Now

### 1. **No Product Decision Yet**

**Question**: Should social post editors and admins be reassigned?

Currently:
- `editor_user_id` is set to `created_by` (the creator)
- `admin_owner_id` is set when? → **Unclear / Not specified**

**What needs clarity**:
- Can an admin reassign a post to a different editor?
- Can one admin reassign a post to another admin?
- Should this be in a "Details Panel" or "Edit Post" form?
- When in the workflow should this be allowed (e.g., only in draft)?

### 2. **UI Doesn't Exist Yet**

Right now:
- `/social-posts/[id]` = Editor page (no assignment controls)
- `/social-posts` = List view (no assignment controls)
- No detail panel for admins
- No "reassign" button or form

### 3. **Comparison: Blog Assignment (Already Implemented)**

Blogs have this functionality. Let's compare:

#### Blog Assignment Flow (Already Works)

```
Blog Detail Page (/blogs/[id])
│
├─ Right Sidebar "Details" Section
│  ├─ [Select Writer] dropdown → reassign writer
│  ├─ [Select Publisher] dropdown → reassign publisher
│  └─ On change → emits 'blog_assignment_changed' event
│
└─ Notifications sent + Activity logged automatically
```

**Code Reference**: `src/app/blogs/[id]/page.tsx`
```typescript
const handleDetailsSave = async (newWriterId: string) => {
  const { data } = await supabase
    .from('blogs')
    .update({ writer_id: newWriterId })
    .eq('id', blogId)
    .select().single();

  await emitEvent({
    type: 'blog_assignment_changed',
    // ... rest of event data
  });
};
```

#### Social Post Assignment Flow (Doesn't Exist)

```
Social Post Editor (/social-posts/[id])
│
├─ ❌ No "Details" section
├─ ❌ No editor/admin dropdowns
├─ ❌ No reassignment UI
│
└─ ❌ Assignments can't be changed via UI
   (Only via direct database modification)
```

---

## Visual Layout: Where Assignment UI Should Go

### Option 1: Right Sidebar Panel (Like Blogs)

```
┌──────────────────────────────────────────────────────────────┐
│                    Social Post Editor                        │
├──────────────────────────────────────────────────────────────┤
│                                          ┌──────────────────┐ │
│ ┌─ Step 1: Setup ───────────┐           │  DETAILS PANEL   │ │
│ │ Title: [_______________]  │           │  (NEW)           │ │
│ │ Product: [Dropdown]       │           ├──────────────────┤ │
│ │ Type: [Dropdown]          │           │ Editor Assignment│ │
│ │ Platforms: [Checkboxes]   │           │ ├─ Current:      │ │
│ │ Canva URL: [___________]  │           │ │   John Doe     │ │
│ │ Canva Page: [__]          │           │ └─ Change to:    │ │
│ │                           │           │    [Dropdown ▼]  │ │
│ │                           │           │    ├─ John Doe   │ │
│ └─────────────────────────┘           │    ├─ Jane Smith  │ │
│                                         │    └─ Alex Brown  │ │
│ ┌─ Step 2: Link Context ──┐           │                  │ │
│ │ Associated Blog: [Search]│           │ Admin Assignment │ │
│ │ [Link from Ideas]        │           │ ├─ Current:      │ │
│ │ [Convert to Blog]        │           │ │   (None)       │ │
│ └─────────────────────────┘           │ └─ Change to:    │ │
│                                         │    [Dropdown ▼]  │ │
│ ┌─ Step 3: Write Caption ─┐           │    ├─ (None)      │ │
│ │ [Caption Editor Area]   │           │    ├─ Admin User  │ │
│ │                         │           │    └─ Admin User2 │ │
│ │ [Format Toolbar]        │           │                  │ │
│ │ Copy Actions            │           │ Status: Draft    │ │
│ │                         │           ├──────────────────┤ │
│ └─────────────────────────┘           │ [Save] [Cancel]  │ │
│                                         └──────────────────┘ │
└──────────────────────────────────────────────────────────────┘
```

### Option 2: Quick-View Modal (Like Tasks)

```
┌──────────────────────────────┐
│   Edit Post Assignments      │
├──────────────────────────────┤
│                              │
│ Editor Responsible:          │
│ [John Doe          ▼]        │
│                              │
│ Admin Responsible:           │
│ [None Selected     ▼]        │
│                              │
│ Note (optional):             │
│ [________________]           │
│                              │
│ [Update] [Cancel]            │
└──────────────────────────────┘
```

### Option 3: Inline in Social Posts List View

```
┌────────────────────────────────────────────────────────┐
│  Social Posts List                                     │
├────────────────────────────────────────────────────────┤
│ Title │ Status │ Editor │ Admin │ Created │ Updated    │
├────────────────────────────────────────────────────────┤
│ Post A│ Draft  │ [John▼]│[None▼]│ 3/21   │ 3/21       │
│ Post B│ Review │ [Jane▼]│[Admin▼]│ 3/20   │ 3/21       │
│ Post C│ Publish│[Alex▼]│[Admin▼]│ 3/19   │ 3/21       │
└────────────────────────────────────────────────────────┘
```

---

## Implementation Complexity: Is It Difficult?

### Short Answer: **No, Not Difficult** ⭐⭐ (out of 5)

The heavy lifting is already done. You'd be replicating blog patterns that already work.

### Breakdown by Component

#### 1. **Database** (Already Done ✅)
- Fields exist: `editor_user_id`, `admin_owner_id`
- Indexes created for performance
- Audit triggers configured
- Migration already applied

**Effort**: 0 hours (done)

#### 2. **API Endpoint** (30 minutes)
Create or reuse: `PATCH /api/social-posts/[id]/assignments`

```typescript
// Pseudo-code (very simple)
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const { editor_user_id, admin_owner_id } = await req.json();
  
  // Update database
  const { data } = await supabase
    .from('social_posts')
    .update({ editor_user_id, admin_owner_id })
    .eq('id', params.id)
    .select().single();

  // Emit unified event (copied from blog pattern)
  await emitEvent({
    type: 'social_post_assignment_changed',
    contentType: 'social_post',
    contentId: params.id,
    oldValue: { editor_user_id: oldEditor, admin_owner_id: oldAdmin },
    newValue: { editor_user_id, admin_owner_id },
    fieldName: 'assignment',
    actor: userId,
    actorName: userDisplayName,
    contentTitle: data.title,
    metadata: {
      role: 'editor/admin',
      oldAssignee: oldEditorName,
      newAssignee: newEditorName,
    },
    timestamp: new Date(),
  });

  return Response.json({ success: true, post: data });
}
```

**Effort**: 30 minutes (copy + adapt from `/api/blogs/[id]/details`)

#### 3. **UI Component** (1-2 hours)
Add form or dropdown selector to choose editor and admin.

**Option A: Reuse Blog Pattern** (Fastest)
```typescript
// src/components/social-post-assignment-form.tsx
// Copy logic from src/components/blog-details-form.tsx
// Replace 'writer_id/publisher_id' with 'editor_user_id/admin_owner_id'
// Adjust labels and role names
```

**Option B: Quick Modal** (Slower but cleaner)
```typescript
// New file: src/components/social-post-assignment-modal.tsx
// Similar to existing modals in the codebase
// User selects editor and admin
// Calls API endpoint above
```

**Effort**: 1-2 hours (depends on complexity/styling)

#### 4. **Integration into Editor** (30 minutes - 1 hour)
Add the form/modal to `/social-posts/[id]` page.

```typescript
// In src/app/social-posts/[id]/page.tsx

// Add state
const [assignmentModalOpen, setAssignmentModalOpen] = useState(false);

// Add button
<Button onClick={() => setAssignmentModalOpen(true)}>
  Manage Assignments
</Button>

// Add modal
{assignmentModalOpen && (
  <SocialPostAssignmentModal
    postId={postId}
    onClose={() => setAssignmentModalOpen(false)}
    onSave={refreshPost}
  />
)}
```

**Effort**: 30 mins - 1 hour

### Total Implementation Time: **2-3 hours** (Start to finish)

For context:
- Blog assignment feature: ~4 hours (built from scratch)
- Social post assignment: ~2-3 hours (copying proven pattern)

### Why It's Not "Difficult"

1. ✅ Database schema exists and is correct
2. ✅ Audit/logging system already works
3. ✅ Event mapping already configured
4. ✅ Similar feature (blogs) exists to copy from
5. ✅ Unified events system is proven

**Only missing**: UI buttons/forms and one API endpoint

---

## Implementation Checklist (If You Decide to Build)

```
Frontend (UI Components)
□ Create src/components/social-post-assignment-form.tsx
  ├─ Editor dropdown (query available users)
  ├─ Admin dropdown (query available users)
  ├─ Save button (calls API)
  └─ Error/success handling

□ Integrate into /social-posts/[id]/page.tsx
  ├─ Add "Manage Assignments" button
  ├─ Show current assignments
  └─ Open form/modal on click

Backend (API & Events)
□ Create src/app/api/social-posts/[id]/assignments/route.ts
  ├─ PATCH handler for assignment updates
  ├─ Validate user has permission
  ├─ Update database
  └─ Call emitEvent() for notifications

□ Add to src/lib/unified-events.ts (if not already there)
  ├─ Map 'social_post_assignment_changed' to 'task_assigned'
  └─ Verify notification preferences work

Testing
□ Manual test: Assign editor, verify notification appears
□ Manual test: Reassign to different user, verify event logs
□ Manual test: Admin can view assignment change in Activity History
□ Permission test: Only admins can reassign posts

Documentation
□ Add example to UNIFIED_EVENTS_MIGRATION.md (already done!)
□ Update SPECIFICATION.md with assignment UI location
□ Add to HOW_TO_USE_APP.md (user guide)
```

---

## Why Decision is Needed Before Implementation

### Question 1: **Should This Feature Exist?**

Current state:
- Posts are created by a user (creator)
- That user becomes the editor
- Can this be reassigned? Should it be?

**Decision needed**:
- "Yes, allow reassignment" → Build it
- "No, posts belong to creator" → Skip entirely

### Question 2: **Where Should It Be?**

Options:
- In editor sidebar (Option 1 above)
- In modal dialog (Option 2 above)
- In list view (Option 3 above)
- Somewhere else?

**Design question**: Where does it fit the workflow best?

### Question 3: **When Should It Be Allowed?**

Options:
- Any time (post is in any status)
- Only in draft/changes_requested (before admin review)
- Only admins can do it
- Only creator or admin can do it?

**Permission question**: What's the business rule?

---

## Quick Comparison Table

| Aspect | Blog Assignment | Social Post Assignment |
| --- | --- | --- |
| DB Fields | ✅ writer_id, publisher_id | ✅ editor_user_id, admin_owner_id |
| Audit Triggers | ✅ Implemented | ✅ Implemented |
| Event Type | ✅ blog_assignment_changed | ✅ social_post_assignment_changed |
| Notification Mapping | ✅ Maps to task_assigned | ✅ Maps to task_assigned |
| UI Component | ✅ Exists | ❌ Doesn't exist |
| API Endpoint | ✅ PATCH /api/blogs/[id]/details | ❌ Need to create |
| Integration | ✅ In /blogs/[id] sidebar | ❌ Not integrated anywhere |
| **Summary** | **100% Complete** | **70% Complete (UI pending)** |

---

## Bottom Line

**Social post assignment support** = The ability to reassign who edits and who approves a social post.

**Why not implementing now**:
1. ✅ Backend is ready (DB, audit, events)
2. ❌ UI doesn't exist (just needs UI + 1 API endpoint)
3. ❓ Product hasn't decided if this feature is needed
4. ❓ Design hasn't specified where UI should be
5. ❓ Business rules aren't clear (who can assign? when?)

**If product says YES**: Can build in 2-3 hours using blog pattern as template.

**If product says NO**: Leave as-is. Assignments can still be changed via database if admin ever needs to do it manually.

---

## Next Steps to Unblock

Ask product/design:
1. "Should social posts support reassignment?"
2. "If yes, where in the UI (sidebar, modal, list)?"
3. "When should it be allowed (any status, draft only, etc)?"
4. "Who can do it (admin only, creator, anyone)?"

Once answered → Easy 2-3 hour build.
