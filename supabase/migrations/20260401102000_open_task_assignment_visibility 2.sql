-- Phase 1: Open Task Assignment Visibility
-- Task assignments are coordination metadata, not sensitive operational data
-- All authenticated users should see who owns each task for transparency and collaboration
-- UPDATE/DELETE remains restricted to assigned user + admin only

drop policy if exists "Task assignments readable by assigned user" on public.task_assignments;
create policy "Task assignments readable by all authenticated users"
on public.task_assignments
for select
to authenticated
using (true);

-- UPDATE and DELETE remain restricted to assigned user + admin
drop policy if exists "Task assignments updatable by assigned user" on public.task_assignments;
create policy "Task assignments updatable by assigned user"
on public.task_assignments
for update
to authenticated
using (assigned_to_user_id = auth.uid() or public.is_admin())
with check (assigned_to_user_id = auth.uid() or public.is_admin());

drop policy if exists "Task assignments deletable by assigned user" on public.task_assignments;
create policy "Task assignments deletable by assigned user"
on public.task_assignments
for delete
to authenticated
using (assigned_to_user_id = auth.uid() or public.is_admin());

notify pgrst, 'reload schema';
