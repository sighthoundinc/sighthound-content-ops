# My Tasks Page - Design & Admin Assignment Implementation

## Current Behavior

The "My Tasks" page currently works as a **personal task dashboard**:
- Shows blogs where the logged-in user is assigned as **writer** OR **publisher**
- Only shows incomplete tasks (non-archived blogs, status not "completed")
- Filters by task kind (Writer/Publisher), status, and site
- Prioritizes tasks by: Overdue → In Progress/Needs Revision → Not Started (not future) → Scheduled (future) → Waiting for Approval → Completed

**Query logic** (line 254):
```sql
.or(`writer_id.eq.${user.id},publisher_id.eq.${user.id}`)
```

## Proposed Enhancement: Admin Task Assignment

### Problem
Pending review / for approval tasks (approval stages) are currently only visible to the **assigned publisher/writer**. Admins should see these approval tasks by default so they can process them without being explicitly assigned.

### States Requiring Admin Review
1. **Writer Stage**: `pending_review` (Awaiting Editorial Review)
2. **Publisher Stage**: `pending_review` (Awaiting Publishing Approval) OR `publisher_approved` (Publishing Approved - awaiting publisher confirmation)

### Solution Architecture

#### Option 1: Query-Based (Simpler)
Extend the query to include approval tasks for admins:
```sql
-- Current (personal only)
.or(`writer_id.eq.${user.id},publisher_id.eq.${user.id}`)

-- Enhanced (personal + admin approval tasks)
.or(`
  writer_id.eq.${user.id},
  publisher_id.eq.${user.id},
  (
    is_admin.eq.true AND 
    (writer_status.eq.pending_review OR publisher_status.in.(pending_review,publisher_approved))
  )
`)
```

**Pros**: Simple, no schema changes, fast query
**Cons**: Expensive RLS policy, repeats logic

#### Option 2: Task Assignment Table (Recommended)
Create a `task_assignments` junction table to decouple approval workflows from writer/publisher assignments.

**Schema:**
```sql
CREATE TABLE task_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blog_id UUID NOT NULL REFERENCES blogs(id) ON DELETE CASCADE,
  assigned_to_user_id UUID NOT NULL REFERENCES profiles(id),
  task_type ENUM('writer_review', 'publisher_review') NOT NULL,
  assigned_at TIMESTAMPTZ DEFAULT now(),
  assigned_by_user_id UUID REFERENCES profiles(id),
  status ENUM('pending', 'completed', 'reassigned') DEFAULT 'pending',
  completed_at TIMESTAMPTZ,
  
  UNIQUE(blog_id, assigned_to_user_id, task_type)
);
```

**Trigger for Admin Assignment:**
```sql
-- When blog enters pending_review, assign to all active admins
CREATE OR REPLACE FUNCTION assign_approval_task_to_admins()
RETURNS TRIGGER AS $$
BEGIN
  -- If writer_status changed to pending_review
  IF NEW.writer_status = 'pending_review' AND 
     (OLD.writer_status IS NULL OR OLD.writer_status != 'pending_review') THEN
    INSERT INTO task_assignments (blog_id, assigned_to_user_id, task_type, assigned_by_user_id)
    SELECT NEW.id, p.id, 'writer_review', NEW.writer_id
    FROM profiles p
    WHERE p.is_admin = true AND p.is_active = true
    ON CONFLICT DO NOTHING;
  END IF;

  -- If publisher_status changed to pending_review or publisher_approved
  IF (NEW.publisher_status IN ('pending_review', 'publisher_approved')) AND 
     (OLD.publisher_status IS NULL OR OLD.publisher_status NOT IN ('pending_review', 'publisher_approved')) THEN
    INSERT INTO task_assignments (blog_id, assigned_to_user_id, task_type, assigned_by_user_id)
    SELECT NEW.id, p.id, 'publisher_review', NEW.publisher_id
    FROM profiles p
    WHERE p.is_admin = true AND p.is_active = true
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER blog_assign_approval_tasks
AFTER INSERT OR UPDATE ON blogs
FOR EACH ROW
EXECUTE FUNCTION assign_approval_task_to_admins();
```

**Query Change:**
```sql
-- Fetch all assigned tasks + personal tasks
.or(`
  writer_id.eq.${user.id},
  publisher_id.eq.${user.id},
  id.in.(SELECT blog_id FROM task_assignments WHERE assigned_to_user_id = ${user.id})
`)
```

## Implementation Steps

### Step 1: Add `is_admin` Column to Profiles Table (if not exists)
```sql
ALTER TABLE profiles 
ADD COLUMN is_admin BOOLEAN DEFAULT false;

-- Backfill existing admins
UPDATE profiles SET is_admin = true WHERE role = 'admin';
```

### Step 2: Create Task Assignments Table
```sql
CREATE TABLE task_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blog_id UUID NOT NULL REFERENCES blogs(id) ON DELETE CASCADE,
  assigned_to_user_id UUID NOT NULL REFERENCES profiles(id),
  task_type TEXT NOT NULL CHECK (task_type IN ('writer_review', 'publisher_review')),
  assigned_at TIMESTAMPTZ DEFAULT now(),
  assigned_by_user_id UUID REFERENCES profiles(id),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'reassigned')),
  completed_at TIMESTAMPTZ,
  notes TEXT,
  
  UNIQUE(blog_id, assigned_to_user_id, task_type)
);

CREATE INDEX idx_task_assignments_user ON task_assignments(assigned_to_user_id);
CREATE INDEX idx_task_assignments_blog ON task_assignments(blog_id);
CREATE INDEX idx_task_assignments_status ON task_assignments(status);
```

### Step 3: Create Assignment Trigger
Add the trigger function shown above to automatically assign approval tasks to admins.

### Step 4: Update Tasks Page Query
Modify `loadTasks()` in `src/app/tasks/page.tsx`:

```typescript
const loadTasks = useCallback(async () => {
  if (!user?.id) {
    return;
  }
  const supabase = getSupabaseBrowserClient();
  setIsLoading(true);
  setError(null);

  // Fetch task assignments for current user
  const { data: assignments, error: assignmentsError } = await supabase
    .from("task_assignments")
    .select("blog_id")
    .eq("assigned_to_user_id", user.id)
    .eq("status", "pending");

  const assignedBlogIds = assignments?.map(a => a.blog_id) ?? [];

  // Fetch blogs where user is writer/publisher OR assigned as reviewer
  let { data, error: tasksError } = await supabase
    .from("blogs")
    .select(BLOG_SELECT_WITH_DATES)
    .eq("is_archived", false)
    .or(`writer_id.eq.${user.id},publisher_id.eq.${user.id},id.in.(${assignedBlogIds.join(',')})`);

  // ... rest of error handling and data normalization
}, [user?.id]);
```

### Step 5: Update Task Item Rendering
Enhance TaskItem type to include assignment metadata:

```typescript
type TaskItem = {
  id: string;
  blogId: string;
  // ... existing fields
  assignmentInfo?: {
    taskType: 'writer_review' | 'publisher_review';
    isAdminAssignment: boolean;
    assignmentDate: string;
  };
};
```

Add visual indicator for admin assignments:
```tsx
{task.assignmentInfo?.isAdminAssignment && (
  <span className="text-[11px] font-medium bg-amber-100 text-amber-800 rounded px-1 py-0.5">
    Admin Review
  </span>
)}
```

## UI/UX Considerations

### Task Visibility
- **Personal Tasks**: Writer/Publisher assignments (current behavior)
- **Approval Tasks**: For admins only, auto-assigned when blog enters approval stage
- **Visual Distinction**: Mark admin-assigned tasks with badge or color

### Task Filtering
Add filter for task type:
- "My Assignments" (writer/publisher role)
- "Admin Reviews" (approval assignments)
- "All My Tasks" (default, both types)

### Task Completion
When admin approves/rejects:
1. Update blog status (`writer_status`, `publisher_status`)
2. Mark task_assignment as `completed`
3. Clear admin assignment (task no longer appears)
4. Route back to assigned writer/publisher if revision needed

## Database Permissions (RLS)

If using RLS, add policies:
```sql
-- Users can see their assigned tasks
CREATE POLICY "users_can_view_assigned_tasks" ON task_assignments
  FOR SELECT USING (assigned_to_user_id = auth.uid());

-- Allow trigger to insert assignments
CREATE POLICY "system_can_assign_tasks" ON task_assignments
  FOR INSERT WITH CHECK (true);

-- Users can update their own task status
CREATE POLICY "users_can_update_task_status" ON task_assignments
  FOR UPDATE USING (assigned_to_user_id = auth.uid());
```

## Alternative: Lightweight Query-Based Approach

If schema changes are not possible, update the query to:

```typescript
// In tasks/page.tsx, modify the data fetch
const { data, error: tasksError } = await supabase
  .from("blogs")
  .select(BLOG_SELECT_WITH_DATES)
  .eq("is_archived", false)
  .or(
    `writer_id.eq.${user.id},publisher_id.eq.${user.id}` +
    `${userIsAdmin ? `,writer_status.eq.pending_review,publisher_status.in.(pending_review,publisher_approved)` : ''}`
  );
```

Then filter client-side to show:
- All personal tasks
- If admin: all approval tasks regardless of assignment

**Trade-off**: Fetches all approval tasks (might be heavy), no granular control over who sees what.

## Summary Table

| Aspect | Query-Only | Task Assignment Table |
|--------|-----------|----------------------|
| Schema Changes | None | Add `task_assignments` table |
| Complexity | Low | Medium |
| Scalability | Poor (fetches all) | Excellent (indexed queries) |
| Granularity | None | Per-user, per-task |
| Auto-Assignment | Manual (business logic) | Automatic (trigger) |
| Recommended | Small teams | Production systems |

## Recommendation

**For your use case**: Implement the **Task Assignment Table** approach because:
1. You want automatic assignment to admins
2. You need audit trail (who assigned, when)
3. Multiple admins should see same approval tasks
4. Scalable to many blogs & admins
5. Allows for task routing/escalation later

Start with Step 1-4, then gather feedback before Step 5 (UI enhancements).
