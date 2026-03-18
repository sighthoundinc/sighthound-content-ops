-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Add admin tracking columns to profiles if they don't exist
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Note: is_admin backfill is done in a separate migration (20260318150000_backfill_admin_flag.sql)
-- to avoid RLS policy conflicts during the update.

-- Create task_assignments table for auto-assigning approval tasks to admins
CREATE TABLE IF NOT EXISTS task_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blog_id UUID NOT NULL REFERENCES blogs(id) ON DELETE CASCADE,
  assigned_to_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  task_type TEXT NOT NULL,
  assigned_at TIMESTAMPTZ DEFAULT now(),
  assigned_by_user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'pending',
  completed_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  -- Constraints
  UNIQUE(blog_id, assigned_to_user_id, task_type),
  CHECK (task_type IN ('writer_review', 'publisher_review')),
  CHECK (status IN ('pending', 'completed', 'reassigned')),
  CHECK (CASE WHEN status = 'completed' THEN completed_at IS NOT NULL ELSE TRUE END)
);

-- Create indexes for optimal query performance

-- Primary access pattern: fetch all pending assignments for a user
CREATE INDEX IF NOT EXISTS idx_task_assignments_user_status 
ON task_assignments(assigned_to_user_id, status) 
WHERE status = 'pending';

-- Secondary: find all assignments for a blog
CREATE INDEX IF NOT EXISTS idx_task_assignments_blog 
ON task_assignments(blog_id);

-- Analytics: assignments by type
CREATE INDEX IF NOT EXISTS idx_task_assignments_type 
ON task_assignments(task_type, status);

-- Audit: assignments by assignor
CREATE INDEX IF NOT EXISTS idx_task_assignments_assigned_by 
ON task_assignments(assigned_by_user_id);

-- Status and completion tracking
CREATE INDEX IF NOT EXISTS idx_task_assignments_status_completed 
ON task_assignments(status, completed_at);

-- Create function to auto-assign approval tasks to all active admins
CREATE OR REPLACE FUNCTION assign_approval_tasks_to_admins()
RETURNS TRIGGER AS $$
DECLARE
  task_type_to_assign TEXT;
BEGIN
  -- Handler for writer approval: assign when status becomes pending_review
  IF NEW.writer_status = 'pending_review' AND 
     (OLD IS NULL OR OLD.writer_status != 'pending_review') THEN
    
    task_type_to_assign := 'writer_review';
    
    -- Insert assignment for each active admin
    INSERT INTO task_assignments (blog_id, assigned_to_user_id, task_type, assigned_by_user_id)
    SELECT 
      NEW.id,
      p.id,
      task_type_to_assign,
      NEW.writer_id
    FROM profiles p
    WHERE p.is_admin = true 
      AND p.is_active = true
    ON CONFLICT (blog_id, assigned_to_user_id, task_type) DO NOTHING;
  
  END IF;

  -- Handler for publisher approval: assign when status enters pending_review or publisher_approved
  IF (NEW.publisher_status IN ('pending_review', 'publisher_approved')) AND 
     (OLD IS NULL OR OLD.publisher_status NOT IN ('pending_review', 'publisher_approved')) THEN
    
    task_type_to_assign := 'publisher_review';
    
    -- Insert assignment for each active admin
    INSERT INTO task_assignments (blog_id, assigned_to_user_id, task_type, assigned_by_user_id)
    SELECT 
      NEW.id,
      p.id,
      task_type_to_assign,
      NEW.publisher_id
    FROM profiles p
    WHERE p.is_admin = true 
      AND p.is_active = true
    ON CONFLICT (blog_id, assigned_to_user_id, task_type) DO NOTHING;
  
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for auto-assignment
DROP TRIGGER IF EXISTS blog_auto_assign_approval_tasks ON blogs;
CREATE TRIGGER blog_auto_assign_approval_tasks
AFTER INSERT OR UPDATE OF writer_status, publisher_status ON blogs
FOR EACH ROW
EXECUTE FUNCTION assign_approval_tasks_to_admins();

-- Create function to handle admin deactivation
CREATE OR REPLACE FUNCTION reassign_tasks_when_admin_inactive()
RETURNS TRIGGER AS $$
BEGIN
  -- When admin is marked inactive, reassign their pending tasks
  IF NEW.is_active = false AND OLD.is_active = true THEN
    UPDATE task_assignments
    SET status = 'reassigned'
    WHERE assigned_to_user_id = NEW.id 
      AND status = 'pending';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for admin deactivation
DROP TRIGGER IF EXISTS admin_deactivation_reassign_tasks ON profiles;
CREATE TRIGGER admin_deactivation_reassign_tasks
AFTER UPDATE OF is_active ON profiles
FOR EACH ROW
EXECUTE FUNCTION reassign_tasks_when_admin_inactive();

-- Enable RLS if not already enabled
ALTER TABLE task_assignments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for task_assignments

-- Policy 1: Users can view their own assigned tasks
DROP POLICY IF EXISTS "users_view_own_assignments" ON task_assignments;
CREATE POLICY "users_view_own_assignments" ON task_assignments
  FOR SELECT
  USING (assigned_to_user_id = auth.uid());

-- Policy 2: System can insert assignments (trigger runs as SECURITY DEFINER)
DROP POLICY IF EXISTS "system_insert_assignments" ON task_assignments;
CREATE POLICY "system_insert_assignments" ON task_assignments
  FOR INSERT
  WITH CHECK (true);

-- Policy 3: Users can update their own assignments (mark complete, add notes)
DROP POLICY IF EXISTS "users_update_own_assignments" ON task_assignments;
CREATE POLICY "users_update_own_assignments" ON task_assignments
  FOR UPDATE
  USING (assigned_to_user_id = auth.uid())
  WITH CHECK (assigned_to_user_id = auth.uid());

-- Policy 4: Admins can delete assignments (for future reassignment feature)
DROP POLICY IF EXISTS "admins_manage_assignments" ON task_assignments;
CREATE POLICY "admins_manage_assignments" ON task_assignments
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- Add comments to table
COMMENT ON TABLE task_assignments IS 'Auto-assigns approval tasks (pending_review, publisher_approved) to all active admins. Admins see these in My Tasks page with Admin Review badge.';
COMMENT ON COLUMN task_assignments.task_type IS 'Type of review task: writer_review (editorial approval) or publisher_review (publishing approval)';
COMMENT ON COLUMN task_assignments.status IS 'Task status: pending (not yet completed), completed (admin approved/rejected), reassigned (admin went inactive)';
COMMENT ON COLUMN task_assignments.assigned_by_user_id IS 'User who triggered assignment (writer or publisher who submitted for review)';
