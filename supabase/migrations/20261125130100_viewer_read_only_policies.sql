-- Makes "viewer" accounts read-only at the database level.
-- Additive: adds one helper function and RESTRICTIVE policies. Restrictive
-- policies are AND-ed with the existing ones, so nothing changes for any
-- other role, and reads (SELECT) are untouched.

-- True when "viewer" is the only role the signed-in user holds.
-- Mirrors getUserRoles()/isViewOnly() in src/lib/roles.ts.
create or replace function public.is_view_only()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and case
        when cardinality(coalesce(p.user_roles, array[]::public.app_role[])) > 0
          then p.user_roles::text[] <@ array['viewer']
        else p.role::text = 'viewer'
      end
  );
$$;

grant execute on function public.is_view_only() to authenticated;

-- Ownership-based policies (creator / worker / reviewer) would otherwise still
-- let a former contributor edit their old records after being made a viewer.
do $$
declare
  t text;
begin
  foreach t in array array[
    'blogs',
    'blog_comments',
    'blog_ideas',
    'blog_idea_comments',
    'social_posts',
    'social_post_links',
    'social_post_comments',
    'social_post_activity_history',
    'task_assignments'
  ] loop
    execute format('drop policy if exists "Viewers cannot insert" on public.%I', t);
    execute format('drop policy if exists "Viewers cannot update" on public.%I', t);
    execute format('drop policy if exists "Viewers cannot delete" on public.%I', t);
    execute format(
      'create policy "Viewers cannot insert" on public.%I as restrictive for insert to authenticated with check (not public.is_view_only())', t);
    execute format(
      'create policy "Viewers cannot update" on public.%I as restrictive for update to authenticated using (not public.is_view_only()) with check (not public.is_view_only())', t);
    execute format(
      'create policy "Viewers cannot delete" on public.%I as restrictive for delete to authenticated using (not public.is_view_only())', t);
  end loop;
end
$$;

-- The blog import helpers run as SECURITY DEFINER (they skip RLS) and were
-- callable by anyone, signed in or not. Only the import API uses them, through
-- the service role, so limit them to it. Same pattern as 20260908134500.
-- Looked up by name because not every environment has both functions.
do $$
declare
  fn regprocedure;
begin
  for fn in
    select p.oid::regprocedure
    from pg_proc p
    where p.pronamespace = 'public'::regnamespace
      and p.proname in ('update_blog_dates', 'upsert_blog_import')
  loop
    execute format('revoke all on function %s from public, anon, authenticated', fn);
    execute format('grant execute on function %s to service_role', fn);
  end loop;
end
$$;

notify pgrst, 'reload schema';

-- Rollback:
--   drop the "Viewers cannot insert/update/delete" policies on the nine tables
--   above, then: drop function public.is_view_only();
