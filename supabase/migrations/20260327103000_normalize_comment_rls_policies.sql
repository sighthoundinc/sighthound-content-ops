-- Normalize RLS policies for social_post_comments and blog_idea_comments.
--
-- Problem: 20260326100000 replaced the social_post_comments policies from
-- 20260313143000 with weaker versions that dropped the social_post existence
-- subquery, allowing comments to be read/written against deleted posts.
-- It also used "updatable by author" instead of the established
-- "updatable by comment author" name.
--
-- Fix: restore the social_post existence subquery in all four policies and
-- use the canonical policy names consistent with 20260313143000.
--
-- blog_idea_comments: no logic change; drop the stale "updatable by author"
-- variant left by 20260326100000 to ensure exactly one policy per operation.

-- ============================================================================
-- SOCIAL POST COMMENTS: restore existence subquery + canonical names
-- ============================================================================

-- Drop all known name variants to guarantee a clean slate
drop policy if exists "Social post comments readable by authenticated users" on public.social_post_comments;
drop policy if exists "Social post comments insertable by authenticated users" on public.social_post_comments;
drop policy if exists "Social post comments updatable by author" on public.social_post_comments;
drop policy if exists "Social post comments updatable by comment author" on public.social_post_comments;
drop policy if exists "Social post comments deletable by author or admin" on public.social_post_comments;

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

-- ============================================================================
-- BLOG IDEA COMMENTS: drop any stale name variants, confirm definitive set
-- ============================================================================

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
notify pgrst, 'reload schema';
