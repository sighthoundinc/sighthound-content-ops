-- Relax RLS SELECT policies for better usability
-- Philosophy: View-only access is open to all authenticated users (transparency)
-- Write operations (INSERT, UPDATE, DELETE) remain moderately restrictive (control)

-- ============================================================================
-- BLOGS TABLE: Open SELECT to all authenticated users
-- ============================================================================

drop policy if exists "Blogs readable by authenticated users" on public.blogs;
create policy "Blogs readable by authenticated users"
on public.blogs
for select
to authenticated
using (true);  -- All authenticated users can VIEW blogs

-- Keep INSERT, UPDATE, DELETE as-is (moderately restrictive based on ownership/roles)

-- ============================================================================
-- SOCIAL_POSTS TABLE: Open SELECT to all authenticated users
-- ============================================================================

drop policy if exists "Social posts readable by authenticated users" on public.social_posts;
create policy "Social posts readable by authenticated users"
on public.social_posts
for select
to authenticated
using (true);  -- All authenticated users can VIEW social posts

-- Keep INSERT, UPDATE, DELETE as-is (moderately restrictive based on ownership/roles)

-- ============================================================================
-- BLOG_COMMENTS TABLE: Open SELECT to all authenticated users
-- ============================================================================

drop policy if exists "Blog comments readable by authenticated users" on public.blog_comments;
create policy "Blog comments readable by authenticated users"
on public.blog_comments
for select
to authenticated
using (true);  -- All authenticated users can VIEW comments

-- Keep INSERT, UPDATE, DELETE as-is (moderately restrictive)

-- ============================================================================
-- SOCIAL_POST_COMMENTS TABLE: Already open to all authenticated users
-- ============================================================================

-- No changes needed - already has: using (true)

-- ============================================================================
-- BLOG_IDEAS TABLE: Open SELECT to all authenticated users
-- ============================================================================

drop policy if exists "Blog ideas readable by authenticated users" on public.blog_ideas;
create policy "Blog ideas readable by authenticated users"
on public.blog_ideas
for select
to authenticated
using (true);  -- All authenticated users can VIEW ideas

-- Keep INSERT, UPDATE, DELETE as-is (moderately restrictive)

-- ============================================================================
-- TASK_ASSIGNMENTS TABLE: Open SELECT to all authenticated users
-- ============================================================================

drop policy if exists "Task assignments readable by authenticated users" on public.task_assignments;
create policy "Task assignments readable by authenticated users"
on public.task_assignments
for select
to authenticated
using (true);  -- All authenticated users can VIEW task assignments (transparency for collaboration)

-- Keep UPDATE, DELETE as moderately restrictive (assigned user + admin only)

-- ============================================================================
-- SOCIAL_POST_LINKS TABLE: Already open to SELECT
-- ============================================================================

-- Verify existing policy allows all authenticated users to read

-- ============================================================================
-- ACTIVITY/AUDIT TABLES: Open SELECT to all authenticated users
-- ============================================================================

-- Blog assignment history
drop policy if exists "Blog assignment history readable" on public.blog_assignment_history;
create policy "Blog assignment history readable"
on public.blog_assignment_history
for select
to authenticated
using (true);  -- All users can VIEW activity history

-- Social post activity history
drop policy if exists "Social post activity history readable" on public.social_post_activity_history;
create policy "Social post activity history readable"
on public.social_post_activity_history
for select
to authenticated
using (true);  -- All users can VIEW activity history

-- ============================================================================
-- SUMMARY OF CHANGES
-- ============================================================================
-- SELECT: Now allows all authenticated users (true) - transparency & usability
-- INSERT: Remains moderately restrictive (role/ownership based)
-- UPDATE: Remains moderately restrictive (role/ownership based)
-- DELETE: Remains moderately restrictive (admin or creator only)
-- This balances transparency with control and fixes query issues
