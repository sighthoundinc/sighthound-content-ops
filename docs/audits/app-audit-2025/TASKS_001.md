# Non-assigned users can view all team tasks (should see only own)

**Module**: Tasks
**Rule violated**: Permissions Enforcement (MUST)
**Priority**: High

## What happened
Tasks page shows all team member tasks to all users. Writers should only see their own assigned tasks, not other writers' tasks. Only admins should see all tasks.

## Expected behavior
Per Permissions Enforcement rule: Define who can view. Writers should see only their own tasks in My Tasks. RLS policy must filter results by user assignment.

## Steps to reproduce
   1. Log in as Writer A
   2. Navigate to Tasks
   3. Observe tasks assigned to Writer B are visible
   4. Should only show tasks assigned to Writer A

## Impact
Privacy/information leak - users see others' work visibility

## Additional context
Requires RLS policy on tasks table to filter by assigned_user_id
