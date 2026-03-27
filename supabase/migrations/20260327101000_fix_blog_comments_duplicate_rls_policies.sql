-- Fix: Duplicate RLS policies on blog_comments bypass permission checks
--
-- Root cause: migration 20260326100000 created new policies with DIFFERENT names
-- than 20260313213000, without dropping the originals. Both sets coexist.
-- PostgreSQL ORs permissive policies for the same operation, so the set
-- WITHOUT has_permission() checks always wins — making create_comment,
-- edit_own_comment, delete_own_comment, and delete_any_comment unenforced.
--
-- Fix: Drop ALL 8 existing policies, create 4 definitive ones that combine
-- ownership checks with permission enforcement.

-- ============================================================================
-- DROP ALL EXISTING POLICIES (both sets)
-- ============================================================================

-- SELECT (2 duplicates)
drop policy if exists "Comments readable by authenticated users" on public.blog_comments;
drop policy if exists "Blog comments readable by authenticated users" on public.blog_comments;

-- INSERT (2 duplicates — one with permission check, one without)
drop policy if exists "Comments insertable by authenticated users" on public.blog_comments;
drop policy if exists "Blog comments insertable by authenticated users" on public.blog_comments;

-- UPDATE (2 duplicates — one with permission check, one without)
drop policy if exists "Comments updatable by permission" on public.blog_comments;
drop policy if exists "Blog comments updatable by author" on public.blog_comments;

-- DELETE (2 duplicates �� one with permission check, one without)
drop policy if exists "Comments deletable by permission" on public.blog_comments;
drop policy if exists "Blog comments deletable by author or admin" on public.blog_comments;

-- Also drop any leftover policies from earlier migrations (belt-and-suspenders)
drop policy if exists "Comments readable by authorized blog users" on public.blog_comments;
drop policy if exists "Comments insertable by authorized blog users" on public.blog_comments;
drop policy if exists "Comments updatable by owner or admin" on public.blog_comments;
drop policy if exists "Comments deletable by owner or admin" on public.blog_comments;

-- ============================================================================
-- CREATE DEFINITIVE POLICIES (exactly 1 per operation)
-- ============================================================================

-- SELECT: All authenticated users can read all comments (unchanged behavior)
create policy "Blog comments readable by authenticated users"
on public.blog_comments
for select
to authenticated
using (true);

-- INSERT: Author must match AND must have create_comment permission
create policy "Blog comments insertable by permitted users"
on public.blog_comments
for insert
to authenticated
with check (
  coalesce(user_id, created_by) = auth.uid()
  and public.has_permission('create_comment')
);

-- UPDATE: Author must match AND must have edit_own_comment permission
create policy "Blog comments updatable by permitted author"
on public.blog_comments
for update
to authenticated
using (
  coalesce(user_id, created_by) = auth.uid()
  and public.has_permission('edit_own_comment')
)
with check (
  coalesce(user_id, created_by) = auth.uid()
  and public.has_permission('edit_own_comment')
);

-- DELETE: Own comment (author + delete_own_comment) OR any comment (delete_any_comment)
create policy "Blog comments deletable by permitted users"
on public.blog_comments
for delete
to authenticated
using (
  (
    coalesce(user_id, created_by) = auth.uid()
    and public.has_permission('delete_own_comment')
  )
  or public.has_permission('delete_any_comment')
);

-- ============================================================================
notify pgrst, 'reload schema';
