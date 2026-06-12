# Task Assignment Table - Design Review

## Executive Summary

This document provides a detailed design review of the Task Assignment Table approach for auto-assigning approval tasks to admins. The approach decouples approval workflows from writer/publisher role assignments, enabling independent task routing while maintaining clean audit trails.

---

## 1. Database Schema Design

### 1.1 Core Table: `task_assignments`

```sql
CREATE TABLE task_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blog_id UUID NOT NULL REFERENCES blogs(id) ON DELETE CASCADE,
  assigned_to_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  task_type TEXT NOT NULL,
  assigned_at TIMESTAMPTZ DEFAULT now(),
  assigned_by_user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'pending',
  completed_at TIMESTAMPTZ,
  notes TEXT,
  
  UNIQUE(blog_id, assigned_to_user_id, task_type),
  CHECK (task_type IN ('writer_review', 'publisher_review')),
  CHECK (status IN ('pending', 'completed', 'reassigned')),
  CHECK (CASE WHEN status = 'completed' THEN completed_at IS NOT NULL ELSE TRUE END)
);
```

### 1.2 Indexes

```sql
-- Primary access pattern: fetch all pending assignments for a user
CREATE INDEX idx_task_assignments_user_status 
ON task_assignments(assigned_to_user_id, status) 
WHERE status = 'pending';

-- Secondary: find all assignments for a blog
CREATE INDEX idx_task_assignments_blog 
ON task_assignments(blog_id);

-- Analytics: assignments by type
CREATE INDEX idx_task_assignments_type 
ON task_assignments(task_type, status);

-- Audit: assignments by assignor
CREATE INDEX idx_task_assignments_assigned_by 
ON task_assignments(assigned_by_user_id);
```

### 1.3 Required Profiles Table Extension

```sql
-- Add is_admin flag if not exists
ALTER TABLE profiles 
ADD COLUMN is_admin BOOLEAN DEFAULT false;

-- Add is_active flag if not exists (to filter inactive admins)
ALTER TABLE profiles 
ADD COLUMN is_active BOOLEAN DEFAULT true;

-- Backfill: assume role='admin' indicates admin users
UPDATE profiles 
SET is_admin = true 
WHERE role = 'admin' OR role ILIKE '%admin%';
```

**Decision Point**: Should we use:
- **Option A**: Separate `is_admin` boolean (current proposal)
- **Option B**: Check `role = 'admin'` directly
- **Option C**: Query permissions table if granular role system exists

**Recommendation**: Option A (simplest, fastest queries)

---

## 2. Assignment Automation: Database Trigger

### 2.1 Trigger Function

```sql
CREATE OR REPLACE FUNCTION assign_approval_tasks_to_admins()
RETURNS TRIGGER AS $$
DECLARE
  admin_user_id UUID;
  task_type_to_assign TEXT;
BEGIN
  -- Handler for writer approval
  IF NEW.writer_status = 'pending_review' AND 
     (OLD.writer_status IS NULL OR OLD.writer_status != 'pending_review') THEN
    
    task_type_to_assign := 'writer_review';
    
    -- Insert assignment for each active admin
    INSERT INTO task_assignments (blog_id, assigned_to_user_id, task_type, assigned_by_user_id)
    SELECT 
      NEW.id,
      p.id,
      task_type_to_assign,
      NEW.writer_id  -- Track who submitted for review
    FROM profiles p
    WHERE p.is_admin = true 
      AND p.is_active = true
    ON CONFLICT (blog_id, assigned_to_user_id, task_type) DO NOTHING;
  
  END IF;

  -- Handler for publisher approval
  IF (NEW.publisher_status IN ('pending_review', 'publisher_approved')) AND 
     (OLD IS NULL OR OLD.publisher_status NOT IN ('pending_review', 'publisher_approved')) THEN
    
    task_type_to_assign := 'publisher_review';
    
    -- Insert assignment for each active admin
    INSERT INTO task_assignments (blog_id, assigned_to_user_id, task_type, assigned_by_user_id)
    SELECT 
      NEW.id,
      p.id,
      task_type_to_assign,
      NEW.publisher_id  -- Track who submitted for review
    FROM profiles p
    WHERE p.is_admin = true 
      AND p.is_active = true
    ON CONFLICT (blog_id, assigned_to_user_id, task_type) DO NOTHING;
  
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER blog_auto_assign_approval_tasks
AFTER INSERT OR UPDATE OF writer_status, publisher_status ON blogs
FOR EACH ROW
EXECUTE FUNCTION assign_approval_tasks_to_admins();
```

### 2.2 Trigger Behavior Analysis

| Scenario | Writer Status Change | Trigger Action | Result |
|----------|----------------------|----------------|--------|
| Writer submits for review | `in_progress` → `pending_review` | Assign to all active admins | Admins see task |
| Writer exits review | `pending_review` → `in_progress` | No action (guard clause) | No duplicate assignment |
| Admin reassigns task | N/A | Manual update (future) | Task status = reassigned |
| Blog deleted | N/A | CASCADE delete | Assignments auto-deleted |
| Admin marked inactive | N/A | No effect (trigger already fired) | Existing tasks remain assigned |

**Potential Issue**: When an admin is marked `is_active = false`, existing assignments to that admin remain visible. 

**Solution Options**:
1. **Client-side filter**: Tasks page filters out inactive admin assignments
2. **Deactivation trigger**: Separate trigger marks assignments as `reassigned` when admin deactivated
3. **Accept it**: Existing assignments stick; new submissions won't include that admin

**Recommendation**: Implement option 2 (safest, audit-clean)

```sql
CREATE OR REPLACE FUNCTION reassign_tasks_when_admin_inactive()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_active = false AND OLD.is_active = true THEN
    -- Mark tasks as reassigned when admin goes inactive
    UPDATE task_assignments
    SET status = 'reassigned'
    WHERE assigned_to_user_id = NEW.id AND status = 'pending';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER admin_deactivation_reassign_tasks
AFTER UPDATE ON profiles
FOR EACH ROW
EXECUTE FUNCTION reassign_tasks_when_admin_inactive();
```

---

## 3. Data Flow: Assignment Lifecycle

### 3.1 Normal Flow (Happy Path)

```
Blog Status Change (e.g., writer_status = 'pending_review')
        ↓
Trigger fires: assign_approval_tasks_to_admins()
        ↓
Query all profiles WHERE is_admin=true AND is_active=true
        ↓
INSERT INTO task_assignments for each admin
        ↓
Admin sees task in My Tasks page with "Admin Review" badge
        ↓
Admin clicks to open blog details drawer
        ↓
Admin approves/rejects (updates writer_status or publisher_status)
        ↓
UPDATE task_assignments SET status='completed', completed_at=now()
        ↓
Task disappears from My Tasks (status != 'pending')
```

### 3.2 Edge Cases

**Case 1: Multiple status transitions before admins see task**
```
in_progress → pending_review → in_progress → pending_review
            ↓                 ↓                 ↓
Trigger 1: Assign to admins
Trigger 2: No action (guard: status unchanged)
Trigger 3: No action (guard: status unchanged)
Trigger 4: Attempt insert with ON CONFLICT DO NOTHING
Result: ✅ UNIQUE constraint prevents duplicates
```

**Case 2: New admin added mid-assignment**
```
Blog in pending_review status
New admin marked is_active=true
        ↓
Task_assignments table already has existing admins
New admin NOT added (trigger already fired)
        ↓
Solution: Manual reassign or async backfill job needed
```

**Recommendation**: Document this limitation. In practice, admins are rarely added mid-workflow.

**Case 3: Blog deleted**
```
Blog deleted → ON DELETE CASCADE → task_assignments auto-deleted
Result: ✅ Clean audit trail, no orphaned records
```

---

## 4. Query Impact: Tasks Page Integration

### 4.1 Current Query
```sql
-- Personal tasks only
WHERE 
  writer_id = ${user.id} 
  OR publisher_id = ${user.id}
```

### 4.2 Proposed Query
```sql
-- Personal tasks + admin-assigned tasks
WHERE 
  writer_id = ${user.id}
  OR publisher_id = ${user.id}
  OR blog_id IN (
    SELECT blog_id FROM task_assignments 
    WHERE assigned_to_user_id = ${user.id} 
    AND status = 'pending'
  )
```

**Query Performance**:
- **Index**: `idx_task_assignments_user_status` on `(assigned_to_user_id, status)` 
- **Expected**: < 5ms for typical admin with 10-50 pending tasks
- **Worst case**: 1000 pending tasks across platform → still < 50ms with index

**Alternative (More Complex)**:
Use a LEFT JOIN instead of subquery:
```sql
WHERE 
  writer_id = ${user.id}
  OR publisher_id = ${user.id}
  OR EXISTS (
    SELECT 1 FROM task_assignments ta
    WHERE ta.blog_id = blogs.id 
    AND ta.assigned_to_user_id = ${user.id}
    AND ta.status = 'pending'
  )
```

**Recommendation**: Stick with subquery (clearer, similar performance with index)

### 4.3 TypeScript Implementation

```typescript
const loadTasks = useCallback(async () => {
  if (!user?.id) return;
  const supabase = getSupabaseBrowserClient();
  setIsLoading(true);
  setError(null);

  // Fetch pending task assignments for current user
  const { data: assignments, error: assignmentError } = await supabase
    .from("task_assignments")
    .select("blog_id, task_type")
    .eq("assigned_to_user_id", user.id)
    .eq("status", "pending");

  if (assignmentError) {
    setError(assignmentError.message);
    setIsLoading(false);
    return;
  }

  const assignedBlogIds = assignments?.map(a => a.blog_id) ?? [];
  const taskTypesByBlogId = new Map(
    assignments?.map(a => [a.blog_id, a.task_type]) ?? []
  );

  // Fetch blogs
  let { data, error: blogsError } = await supabase
    .from("blogs")
    .select(BLOG_SELECT_WITH_DATES)
    .eq("is_archived", false)
    .or(
      `writer_id.eq.${user.id},publisher_id.eq.${user.id}` +
      (assignedBlogIds.length > 0 
        ? `,id.in.(${assignedBlogIds.join(',')})` 
        : '')
    );

  if (blogsError) {
    setError(blogsError.message);
    setIsLoading(false);
    return;
  }

  const blogs = normalizeBlogRows(data ?? []);
  setBlogs(blogs);
  
  // Store assignment metadata for UI rendering
  setTaskAssignments(taskTypesByBlogId);
  setIsLoading(false);
}, [user?.id]);
```

---

## 5. UI/UX Design Implications

### 5.1 Task Item Structure (Enhanced)

```typescript
type TaskItem = {
  id: string;                    // Existing
  blogId: string;                // Existing
  site: BlogSite;                // Existing
  title: string;                 // Existing
  kind: TaskKind;                // Existing: 'writer' | 'publisher'
  createdAt: string;             // Existing
  scheduledDate: string | null;  // Existing
  isDelayed: boolean;            // Existing
  statusLabel: string;           // Existing
  statusValue: WriterStageStatus | PublisherStageStatus;  // Existing
  statusPriority: number;        // Existing
  liveUrl: string | null;        // Existing
  reason: string | null;         // Existing
  
  // NEW: Assignment metadata
  assignmentInfo?: {
    isAdminAssignment: boolean;  // true if from task_assignments table
    taskType: 'writer_review' | 'publisher_review';
    assignmentDate: string;
  };
};
```

### 5.2 Visual Indicators

**Option A: Badge**
```tsx
{task.assignmentInfo?.isAdminAssignment && (
  <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800">
    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
      {/* Shield icon */}
    </svg>
    Admin Review
  </span>
)}
```

**Option B: Highlight Row**
```tsx
className={cn(
  'border-l-4',
  task.assignmentInfo?.isAdminAssignment 
    ? 'border-l-amber-500 bg-amber-50' 
    : 'border-l-transparent'
)}
```

**Option C: Combination (Recommended)**
- Row highlight (visual hierarchy)
- Badge (clear label)
- Tooltip on hover ("Auto-assigned approval task")

### 5.3 Task Filtering

**Current Filters**:
- Task Kind: Writer, Publisher, All
- Status: All, Specific Status
- Site: Sighthound, Redactor, All

**Enhanced Filters**:
Add:
- Assignment Type: "My Tasks", "Admin Reviews", "All"

```tsx
<div className="flex items-center gap-2">
  <label className="text-xs font-medium text-slate-700">Show:</label>
  <select 
    value={assignmentFilter} 
    onChange={(e) => setAssignmentFilter(e.target.value)}
    className="text-xs border border-slate-300 rounded px-2 py-1"
  >
    <option value="all">All Tasks</option>
    <option value="personal">My Assignments Only</option>
    <option value="admin">Admin Reviews Only</option>
  </select>
</div>
```

---

## 6. Permissions & RLS Policies

### 6.1 Row-Level Security (if enabled)

```sql
-- Users can SELECT their own assignments
CREATE POLICY "users_view_own_assignments" ON task_assignments
  FOR SELECT
  USING (assigned_to_user_id = auth.uid());

-- Trigger can INSERT (runs as SECURITY DEFINER)
CREATE POLICY "system_insert_assignments" ON task_assignments
  FOR INSERT
  WITH CHECK (true);

-- Users can UPDATE only their own assignments (mark complete, add notes)
CREATE POLICY "users_update_own_assignments" ON task_assignments
  FOR UPDATE
  USING (assigned_to_user_id = auth.uid())
  WITH CHECK (assigned_to_user_id = auth.uid());

-- Admins can DELETE assignments (reassign)
CREATE POLICY "admins_manage_assignments" ON task_assignments
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND is_admin = true
    )
  );
```

---

## 7. Audit & Observability

### 7.1 Audit Trail

The schema naturally provides audit trail:
- **assigned_at**: When task created
- **assigned_by_user_id**: Who triggered the assignment (writer/publisher who submitted)
- **completed_at**: When admin finished
- **status**: Current state (pending/completed/reassigned)
- **notes**: Optional context

### 7.2 Queries for Analytics

```sql
-- Tasks pending admin review
SELECT COUNT(*) FROM task_assignments 
WHERE status = 'pending' 
AND task_type = 'publisher_review';

-- Average time to complete approval
SELECT 
  AVG(EXTRACT(EPOCH FROM (completed_at - assigned_at)) / 3600) as avg_hours
FROM task_assignments 
WHERE status = 'completed' AND task_type = 'writer_review';

-- Which admins complete most reviews
SELECT 
  assigned_to_user_id,
  COUNT(*) as completed_count
FROM task_assignments 
WHERE status = 'completed'
GROUP BY assigned_to_user_id
ORDER BY completed_count DESC;
```

---

## 8. Implementation Rollout Strategy

### Phase 1: Schema & Data (Reversible)
```
✅ Add columns to profiles (is_admin, is_active)
✅ Create task_assignments table
✅ Create indexes
✅ Create trigger function (enabled)
```
**Risk**: Low (no UI changes, no user impact)
**Rollback**: Simple DROP TABLE + ALTER TABLE removal

### Phase 2: Frontend Integration (Tested)
```
✅ Update loadTasks query
✅ Add assignmentInfo to TaskItem type
✅ Add UI badge/highlight
✅ Add assignment filter
```
**Risk**: Medium (visible to users, may confuse)
**Rollback**: Revert loadTasks query, keep badge code behind feature flag

### Phase 3: Monitoring & Iteration
```
✅ Monitor query performance
✅ Gather admin feedback
✅ Adjust trigger logic if needed
✅ Add more filters/views as needed
```

---

## 9. Decision Checklist

- [ ] **Admin Identification**: Use `is_admin` boolean or existing role column?
- [ ] **Auto-Assignment Scope**: Only `pending_review`, or include other states?
- [ ] **Inactive Admin Handling**: Reassign, deactivate, or accept?
- [ ] **Completion Flow**: How does admin mark task complete? (Status update? Separate action?)
- [ ] **Reassignment**: Can admins manually reassign to each other? (Not in this spec)
- [ ] **Notifications**: Should admins be notified when task assigned? (Future)
- [ ] **Audit Retention**: Keep completed tasks forever or archive? (Forever recommended)

---

## 10. Risk Assessment

### High Priority
- ✅ **Circular Assignment**: Writer A assigns to admin, admin rejects to writer B. **Mitigation**: Writer-to-admin only (not writer-to-writer via task_assignments).
- ✅ **Trigger Performance**: Assigning to 10 admins on each status change. **Mitigation**: Batch insert, indexed table, typical volume << query load.
- ✅ **Dead Assignments**: Admins become inactive but tasks remain. **Mitigation**: Deactivation trigger + client filter.

### Medium Priority
- ⚠️ **Stale Data**: Admin added after blog enters pending_review. **Mitigation**: Document, low frequency in practice.
- ⚠️ **Query Complexity**: Subquery in WHERE clause. **Mitigation**: Index on (assigned_to_user_id, status), tested performance.

### Low Priority
- ℹ️ **Naming Ambiguity**: `task_type` could be confused with blog task type. **Mitigation**: Clear naming in code comments.
- ℹ️ **Future Features**: Reassignment, delegation, escalation. **Mitigation**: Schema extensible (add reassigned_to_user_id later).

---

## 11. Success Metrics

After implementation, measure:
1. **Adoption**: % of admins using My Tasks to see admin review items
2. **Performance**: Query latency < 50ms for typical admin
3. **Correctness**: No orphaned task_assignments after blog deletions
4. **UX**: Admin feedback on clarity of "Admin Review" badge
5. **Completeness**: % of admin review tasks marked complete within 24hrs

---

## Summary

**The Task Assignment Table approach is:**
- ✅ **Scalable**: Indexed queries, trigger-based auto-assignment
- ✅ **Auditable**: Full trail of assignments, completions, actors
- ✅ **Reversible**: Easy to roll back if needed
- ✅ **Extensible**: Foundation for reassignment, delegation, escalation
- ⚠️ **Requires coordination**: Schema changes + code changes
- ⚠️ **Database-dependent**: Relies on trigger performance

**Recommendation**: Proceed with Phase 1 (schema) after addressing decision checklist. Phase 2 can wait for feedback on Phase 1.
