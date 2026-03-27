-- Sprint 1, Issue #1: Enforce Comprehensive RLS Policies
-- Fixes: API authorization gaps, permission boundary violations
-- Adds mandatory READ/INSERT/UPDATE/DELETE policies for all content tables
-- Following Permissions Enforcement MUST rule: RLS is source of truth

-- ============================================================================
-- BLOGS TABLE: RLS POLICIES
-- ============================================================================

drop policy if exists "Blogs readable by authenticated users" on public.blogs;
create policy "Blogs readable by authenticated users"
on public.blogs
for select
to authenticated
using (
  created_by = auth.uid()
  or writer_id = auth.uid()
  or publisher_id = auth.uid()
  or public.is_admin()
);

drop policy if exists "Blogs insertable by authenticated users" on public.blogs;
create policy "Blogs insertable by authenticated users"
on public.blogs
for insert
to authenticated
with check (
  created_by = auth.uid()
  and public.has_permission('create_blog')
);

drop policy if exists "Blogs updatable by authorized users" on public.blogs;
create policy "Blogs updatable by authorized users"
on public.blogs
for update
to authenticated
using (
  created_by = auth.uid()
  or writer_id = auth.uid()
  or publisher_id = auth.uid()
  or public.is_admin()
)
with check (
  created_by = auth.uid()
  or writer_id = auth.uid()
  or publisher_id = auth.uid()
  or public.is_admin()
);

drop policy if exists "Blogs deletable by creator or admin" on public.blogs;
create policy "Blogs deletable by creator or admin"
on public.blogs
for delete
to authenticated
using (
  (created_by = auth.uid() or public.is_admin())
  and publisher_status != 'completed'
);

-- ============================================================================
-- SOCIAL POSTS TABLE: RLS POLICIES
-- ============================================================================

drop policy if exists "Social posts readable by authenticated users" on public.social_posts;
create policy "Social posts readable by authenticated users"
on public.social_posts
for select
to authenticated
using (
  created_by = auth.uid()
  or worker_user_id = auth.uid()
  or reviewer_user_id = auth.uid()
  or public.is_admin()
);

drop policy if exists "Social posts insertable by authenticated users" on public.social_posts;
create policy "Social posts insertable by authenticated users"
on public.social_posts
for insert
to authenticated
with check (
  created_by = auth.uid()
);

drop policy if exists "Social posts updatable by authorized users" on public.social_posts;
create policy "Social posts updatable by authorized users"
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

drop policy if exists "Social posts deletable by creator or admin" on public.social_posts;
create policy "Social posts deletable by creator or admin"
on public.social_posts
for delete
to authenticated
using (
  (created_by = auth.uid() or public.is_admin())
  and status != 'published'
);

-- ============================================================================
-- COMMENTS: RLS POLICIES
-- ============================================================================

-- blog_comments: definitive policies set by 20260327101000; only drop stale names here
drop policy if exists "Blog comments readable by authenticated users" on public.blog_comments;
drop policy if exists "Blog comments insertable by authenticated users" on public.blog_comments;
drop policy if exists "Blog comments updatable by author" on public.blog_comments;
drop policy if exists "Blog comments deletable by author or admin" on public.blog_comments;

-- social_post_comments: drop old names from 20260313143000 then create definitive policies
drop policy if exists "Social post comments readable by authenticated users" on public.social_post_comments;
create policy "Social post comments readable by authenticated users"
on public.social_post_comments
for select
to authenticated
using (
  exists (
    select 1 from public.social_posts sp
    where sp.id = social_post_comments.social_post_id
  )
);

drop policy if exists "Social post comments insertable by authenticated users" on public.social_post_comments;
create policy "Social post comments insertable by authenticated users"
on public.social_post_comments
for insert
to authenticated
with check (
  coalesce(user_id, created_by) = auth.uid()
  and exists (
    select 1 from public.social_posts sp
    where sp.id = social_post_comments.social_post_id
  )
);

drop policy if exists "Social post comments updatable by comment author" on public.social_post_comments;
create policy "Social post comments updatable by comment author"
on public.social_post_comments
for update
to authenticated
using (
  coalesce(user_id, created_by) = auth.uid()
  and exists (
    select 1 from public.social_posts sp
    where sp.id = social_post_comments.social_post_id
  )
)
with check (
  coalesce(user_id, created_by) = auth.uid()
  and exists (
    select 1 from public.social_posts sp
    where sp.id = social_post_comments.social_post_id
  )
);

drop policy if exists "Social post comments deletable by author or admin" on public.social_post_comments;
create policy "Social post comments deletable by author or admin"
on public.social_post_comments
for delete
to authenticated
using (
  (
    coalesce(user_id, created_by) = auth.uid()
    or public.is_admin()
  )
  and exists (
    select 1 from public.social_posts sp
    where sp.id = social_post_comments.social_post_id
  )
);

-- blog_idea_comments: drop old generic names from 20260317141728 then create definitive policies
drop policy if exists "Comments readable by authenticated users" on public.blog_idea_comments;
drop policy if exists "Comments insertable by authenticated users" on public.blog_idea_comments;
drop policy if exists "Comments updatable by creator only" on public.blog_idea_comments;
drop policy if exists "Comments deletable by creator or admin" on public.blog_idea_comments;
drop policy if exists "Blog idea comments readable by authenticated users" on public.blog_idea_comments;
drop policy if exists "Blog idea comments insertable by authenticated users" on public.blog_idea_comments;
drop policy if exists "Blog idea comments updatable by creator" on public.blog_idea_comments;
drop policy if exists "Blog idea comments deletable by creator or admin" on public.blog_idea_comments;

create policy "Blog idea comments readable by authenticated users"
on public.blog_idea_comments
for select
to authenticated
using (true);

create policy "Blog idea comments insertable by authenticated users"
on public.blog_idea_comments
for insert
to authenticated
with check (created_by = auth.uid());

create policy "Blog idea comments updatable by creator"
on public.blog_idea_comments
for update
to authenticated
using (created_by = auth.uid())
with check (created_by = auth.uid());

create policy "Blog idea comments deletable by creator or admin"
on public.blog_idea_comments
for delete
to authenticated
using (created_by = auth.uid() or public.is_admin());

-- ============================================================================
-- TASK ASSIGNMENTS: PRIVACY BOUNDARY
-- ============================================================================

drop policy if exists "Task assignments readable by assigned user" on public.task_assignments;
create policy "Task assignments readable by assigned user"
on public.task_assignments
for select
to authenticated
using (assigned_to_user_id = auth.uid() or public.is_admin());

drop policy if exists "Task assignments updatable by assigned user" on public.task_assignments;
create policy "Task assignments updatable by assigned user"
on public.task_assignments
for update
to authenticated
using (assigned_to_user_id = auth.uid() or public.is_admin())
with check (assigned_to_user_id = auth.uid() or public.is_admin());

-- ============================================================================
-- SOCIAL POST LINKS: OWNERSHIP
-- ============================================================================

drop policy if exists "Social post links readable by authenticated users" on public.social_post_links;
create policy "Social post links readable by authenticated users"
on public.social_post_links
for select
to authenticated
using (true);

drop policy if exists "Social post links insertable by post owner" on public.social_post_links;
create policy "Social post links insertable by post owner"
on public.social_post_links
for insert
to authenticated
with check (
  exists (
    select 1 from public.social_posts
    where id = social_post_links.social_post_id
    and (created_by = auth.uid() or worker_user_id = auth.uid() or reviewer_user_id = auth.uid() or public.is_admin())
  )
);

drop policy if exists "Social post links updatable by post owner" on public.social_post_links;
create policy "Social post links updatable by post owner"
on public.social_post_links
for update
to authenticated
using (
  exists (
    select 1 from public.social_posts
    where id = social_post_links.social_post_id
    and (created_by = auth.uid() or worker_user_id = auth.uid() or reviewer_user_id = auth.uid() or public.is_admin())
  )
)
with check (
  exists (
    select 1 from public.social_posts
    where id = social_post_links.social_post_id
    and (created_by = auth.uid() or worker_user_id = auth.uid() or reviewer_user_id = auth.uid() or public.is_admin())
  )
);

drop policy if exists "Social post links deletable by post owner" on public.social_post_links;
create policy "Social post links deletable by post owner"
on public.social_post_links
for delete
to authenticated
using (
  exists (
    select 1 from public.social_posts
    where id = social_post_links.social_post_id
    and (created_by = auth.uid() or worker_user_id = auth.uid() or reviewer_user_id = auth.uid() or public.is_admin())
  )
);

-- ============================================================================
-- BLOG IDEAS: SHARED VISIBILITY
-- ============================================================================

drop policy if exists "Blog ideas readable by authenticated users" on public.blog_ideas;
create policy "Blog ideas readable by authenticated users"
on public.blog_ideas
for select
to authenticated
using (true);

drop policy if exists "Blog ideas insertable by authenticated users" on public.blog_ideas;
create policy "Blog ideas insertable by authenticated users"
on public.blog_ideas
for insert
to authenticated
with check (created_by = auth.uid());

drop policy if exists "Blog ideas updatable by creator or admin" on public.blog_ideas;
create policy "Blog ideas updatable by creator or admin"
on public.blog_ideas
for update
to authenticated
using (created_by = auth.uid() or public.is_admin())
with check (created_by = auth.uid() or public.is_admin());

-- ============================================================================
-- SCHEMA NOTIFICATION
-- ============================================================================
notify pgrst, 'reload schema';
