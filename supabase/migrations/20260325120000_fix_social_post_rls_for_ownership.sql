-- Fix RLS UPDATE policy to match new ownership model (worker_user_id, reviewer_user_id)
-- The previous policy checked editor_user_id and admin_owner_id, which aren't set correctly
-- This update allows:
-- 1. Creator of the post (created_by) to edit
-- 2. Assigned worker (worker_user_id) to edit
-- 3. Assigned reviewer (reviewer_user_id) to edit
-- 4. Admins to edit any post

drop policy if exists "Social posts updatable by owner/editor/admin" on public.social_posts;

create policy "Social posts updatable by creator/worker/reviewer/admin"
on public.social_posts
for update
to authenticated
using (
  created_by = auth.uid()
  or worker_user_id = auth.uid()
  or reviewer_user_id = auth.uid()
  or public.is_admin()
)
with check (
  created_by = auth.uid()
  or worker_user_id = auth.uid()
  or reviewer_user_id = auth.uid()
  or public.is_admin()
);

notify pgrst, 'reload schema';
