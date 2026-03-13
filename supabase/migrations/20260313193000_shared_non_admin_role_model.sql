create or replace function public.enforce_blog_update_permissions()
returns trigger
language plpgsql
as $$
declare
  is_admin_role boolean;
  is_ops_role boolean;
  is_writer_assignee boolean;
  is_publisher_assignee boolean;
begin
  is_admin_role := public.has_profile_role('admin'::public.app_role);
  is_ops_role := public.has_profile_role('writer'::public.app_role)
    or public.has_profile_role('publisher'::public.app_role)
    or public.has_profile_role('editor'::public.app_role);
  is_writer_assignee := old.writer_id = auth.uid();
  is_publisher_assignee := old.publisher_id = auth.uid();

  if is_admin_role then
    return new;
  end if;

  if not is_ops_role then
    raise exception 'Unauthorized role for blog update';
  end if;

  if new.writer_id is distinct from old.writer_id
    or new.publisher_id is distinct from old.publisher_id
    or new.is_archived is distinct from old.is_archived
    or new.created_by is distinct from old.created_by
    or new.slug is distinct from old.slug then
    raise exception 'Only admins can change assignments, archive state, or system-managed fields';
  end if;

  if new.actual_published_at is distinct from old.actual_published_at
    or new.published_at is distinct from old.published_at then
    raise exception 'Only admins can change actual published timestamps';
  end if;

  if old.publisher_status::text = 'completed'
    and (
      new.scheduled_publish_date is distinct from old.scheduled_publish_date
      or new.display_published_date is distinct from old.display_published_date
      or new.target_publish_date is distinct from old.target_publish_date
    ) then
    raise exception 'Only admins can change scheduled/display publish dates after publishing is completed';
  end if;

  if new.writer_status is distinct from old.writer_status
    and not is_writer_assignee then
    raise exception 'Only the assigned writer can change writer stage status';
  end if;

  if new.publisher_status is distinct from old.publisher_status
    and not is_publisher_assignee then
    raise exception 'Only the assigned publisher can change publisher stage status';
  end if;

  return new;
end
$$;

create or replace function public.enforce_blog_insert_permissions()
returns trigger
language plpgsql
as $$
declare
  is_admin_role boolean;
  is_ops_role boolean;
begin
  if auth.role() = 'service_role' then
    return new;
  end if;

  is_admin_role := public.has_profile_role('admin'::public.app_role);
  is_ops_role := is_admin_role
    or public.has_profile_role('writer'::public.app_role)
    or public.has_profile_role('publisher'::public.app_role)
    or public.has_profile_role('editor'::public.app_role);

  if not is_ops_role then
    raise exception 'Unauthorized role for blog insert';
  end if;

  if new.created_by is distinct from auth.uid() then
    raise exception 'created_by must match the authenticated user';
  end if;

  if not is_admin_role then
    if new.writer_id is not null and new.writer_id <> auth.uid() then
      raise exception 'Non-admin users can only self-assign as writer on insert';
    end if;

    if new.publisher_id is not null and new.publisher_id <> auth.uid() then
      raise exception 'Non-admin users can only self-assign as publisher on insert';
    end if;

    if coalesce(new.is_archived, false) then
      raise exception 'Only admins can create archived blogs';
    end if;
  end if;

  return new;
end
$$;

drop trigger if exists blogs_enforce_insert_permissions on public.blogs;
create trigger blogs_enforce_insert_permissions
before insert on public.blogs
for each row execute function public.enforce_blog_insert_permissions();

drop policy if exists "Profiles readable by self or admin" on public.profiles;
drop policy if exists "Profiles readable by authenticated users" on public.profiles;
create policy "Profiles readable by authenticated users"
on public.profiles
for select
to authenticated
using (true);

drop policy if exists "Blogs readable by assigned users and admin" on public.blogs;
drop policy if exists "Blogs readable by authenticated users" on public.blogs;
create policy "Blogs readable by authenticated users"
on public.blogs
for select
to authenticated
using (true);

drop policy if exists "Blogs insertable by admin only" on public.blogs;
drop policy if exists "Blogs insertable by ops roles" on public.blogs;
create policy "Blogs insertable by ops roles"
on public.blogs
for insert
to authenticated
with check (
  created_by = auth.uid()
  and (
    public.has_profile_role('admin'::public.app_role)
    or public.has_profile_role('writer'::public.app_role)
    or public.has_profile_role('publisher'::public.app_role)
    or public.has_profile_role('editor'::public.app_role)
  )
);

drop policy if exists "Blogs updatable by assigned roles and admin" on public.blogs;
drop policy if exists "Blogs updatable by ops roles" on public.blogs;
create policy "Blogs updatable by ops roles"
on public.blogs
for update
to authenticated
using (
  public.has_profile_role('admin'::public.app_role)
  or public.has_profile_role('writer'::public.app_role)
  or public.has_profile_role('publisher'::public.app_role)
  or public.has_profile_role('editor'::public.app_role)
)
with check (
  public.has_profile_role('admin'::public.app_role)
  or public.has_profile_role('writer'::public.app_role)
  or public.has_profile_role('publisher'::public.app_role)
  or public.has_profile_role('editor'::public.app_role)
);

drop policy if exists "History readable by authorized blog users" on public.blog_assignment_history;
drop policy if exists "History readable by authenticated users" on public.blog_assignment_history;
create policy "History readable by authenticated users"
on public.blog_assignment_history
for select
to authenticated
using (true);

drop policy if exists "Comments readable by authorized blog users" on public.blog_comments;
drop policy if exists "Comments readable by authenticated users" on public.blog_comments;
create policy "Comments readable by authenticated users"
on public.blog_comments
for select
to authenticated
using (true);

drop policy if exists "Comments insertable by authorized blog users" on public.blog_comments;
drop policy if exists "Comments insertable by authenticated users" on public.blog_comments;
create policy "Comments insertable by authenticated users"
on public.blog_comments
for insert
to authenticated
with check (
  coalesce(user_id, created_by) = auth.uid()
);

drop policy if exists "Comments updatable by owner or admin" on public.blog_comments;
create policy "Comments updatable by owner or admin"
on public.blog_comments
for update
to authenticated
using (
  public.is_admin()
  or coalesce(user_id, created_by) = auth.uid()
)
with check (
  public.is_admin()
  or coalesce(user_id, created_by) = auth.uid()
);

drop policy if exists "Comments deletable by owner or admin" on public.blog_comments;
create policy "Comments deletable by owner or admin"
on public.blog_comments
for delete
to authenticated
using (
  public.is_admin()
  or coalesce(user_id, created_by) = auth.uid()
);

notify pgrst, 'reload schema';
