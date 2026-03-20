-- Update RLS policy to allow users to view their own access logs
-- Admins can still view all logs

-- Drop the old admin-only policy
drop policy if exists "Admin can view all access logs" on access_logs;

-- New policy: Users can view their own logs, admins can view all
create policy "Users can view own access logs, admins can view all"
  on access_logs
  for select
  using (
    -- Users can view their own logs
    user_id = auth.uid()
    or
    -- Admins can view all logs
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
      and profiles.role = 'admin'
    )
  );
