-- STEP 1: Fix Incomplete RLS Policies
-- Issue: Blog comment delete policy was missing ownership check
-- Risk: Non-creator users could attempt deletes, triggering 42501 errors bubbling to UI
-- Fix: Add ownership check to match INSERT/UPDATE policies (creator OR admin)

-- ============================================================================
-- BLOG COMMENTS: Fix missing ownership check in DELETE policy
-- ============================================================================

drop policy if exists "Comments deletable by permission" on public.blog_comments;
create policy "Comments deletable by creator or admin"
on public.blog_comments
for delete
to authenticated
using (
  (coalesce(user_id, created_by) = auth.uid() or public.is_admin())
  and public.has_permission('delete_comments')
);

-- ============================================================================
-- SCHEMA NOTIFICATION
-- ============================================================================

notify pgrst, 'reload schema';
