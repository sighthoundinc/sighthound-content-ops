create table if not exists public.role_permissions (
  role public.app_role not null,
  permission_key text not null,
  enabled boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (role, permission_key),
  constraint role_permissions_permission_key_valid check (
    permission_key = any (
      array[
        'create_blog',
        'edit_blog_metadata',
        'archive_blog',
        'delete_blog',
        'start_writing',
        'submit_writing',
        'request_revision',
        'edit_writing_stage',
        'start_publishing',
        'complete_publishing',
        'edit_publishing_stage',
        'edit_scheduled_publish_date',
        'use_calendar_drag_and_drop',
        'create_comments',
        'edit_own_comments',
        'delete_comments',
        'change_writer_assignment',
        'change_publisher_assignment',
        'export_csv',
        'manage_users',
        'manage_roles',
        'manage_permissions',
        'override_workflow'
      ]::text[]
    )
  ),
  constraint role_permissions_locked_admin_only check (
    role = 'admin'::public.app_role
    or permission_key <> all (
      array[
        'manage_users',
        'manage_roles',
        'manage_permissions',
        'override_workflow',
        'delete_blog'
      ]::text[]
    )
  )
);

create table if not exists public.permission_audit_logs (
  id uuid primary key default gen_random_uuid(),
  role public.app_role not null,
  permission_key text not null,
  old_value boolean not null,
  new_value boolean not null,
  changed_by uuid references public.profiles (id) on delete set null,
  changed_at timestamptz not null default timezone('utc', now()),
  constraint permission_audit_logs_permission_key_valid check (
    permission_key = any (
      array[
        'create_blog',
        'edit_blog_metadata',
        'archive_blog',
        'delete_blog',
        'start_writing',
        'submit_writing',
        'request_revision',
        'edit_writing_stage',
        'start_publishing',
        'complete_publishing',
        'edit_publishing_stage',
        'edit_scheduled_publish_date',
        'use_calendar_drag_and_drop',
        'create_comments',
        'edit_own_comments',
        'delete_comments',
        'change_writer_assignment',
        'change_publisher_assignment',
        'export_csv',
        'manage_users',
        'manage_roles',
        'manage_permissions',
        'override_workflow'
      ]::text[]
    )
  )
);

create index if not exists permission_audit_logs_changed_at_idx
  on public.permission_audit_logs (changed_at desc);

drop trigger if exists role_permissions_touch_updated_at on public.role_permissions;
create trigger role_permissions_touch_updated_at
before update on public.role_permissions
for each row execute function public.touch_updated_at();

create or replace function public.default_role_permissions(p_role public.app_role)
returns text[]
language sql
immutable
as $$
  select case
    when p_role = 'admin'::public.app_role then array[
      'create_blog',
      'edit_blog_metadata',
      'archive_blog',
      'delete_blog',
      'start_writing',
      'submit_writing',
      'request_revision',
      'edit_writing_stage',
      'start_publishing',
      'complete_publishing',
      'edit_publishing_stage',
      'edit_scheduled_publish_date',
      'use_calendar_drag_and_drop',
      'create_comments',
      'edit_own_comments',
      'delete_comments',
      'change_writer_assignment',
      'change_publisher_assignment',
      'export_csv',
      'manage_users',
      'manage_roles',
      'manage_permissions',
      'override_workflow'
    ]::text[]
    when p_role = 'writer'::public.app_role then array[
      'create_blog',
      'edit_blog_metadata',
      'start_writing',
      'submit_writing',
      'request_revision',
      'edit_scheduled_publish_date',
      'use_calendar_drag_and_drop',
      'create_comments',
      'edit_own_comments',
      'export_csv'
    ]::text[]
    when p_role = 'publisher'::public.app_role then array[
      'edit_blog_metadata',
      'start_publishing',
      'complete_publishing',
      'edit_scheduled_publish_date',
      'use_calendar_drag_and_drop',
      'create_comments',
      'edit_own_comments',
      'export_csv'
    ]::text[]
    when p_role = 'editor'::public.app_role then array[
      'edit_blog_metadata',
      'request_revision',
      'create_comments',
      'edit_own_comments'
    ]::text[]
    else array[]::text[]
  end;
$$;

insert into public.role_permissions (role, permission_key, enabled)
select
  role_values.role,
  permission_values.permission_key,
  permission_values.permission_key = any(public.default_role_permissions(role_values.role))
from (
  select unnest(array['writer', 'publisher', 'editor']::public.app_role[]) as role
) as role_values
cross join (
  select unnest(
    array[
      'create_blog',
      'edit_blog_metadata',
      'archive_blog',
      'start_writing',
      'submit_writing',
      'request_revision',
      'edit_writing_stage',
      'start_publishing',
      'complete_publishing',
      'edit_publishing_stage',
      'edit_scheduled_publish_date',
      'use_calendar_drag_and_drop',
      'create_comments',
      'edit_own_comments',
      'delete_comments',
      'change_writer_assignment',
      'change_publisher_assignment',
      'export_csv'
    ]::text[]
  ) as permission_key
) as permission_values
on conflict (role, permission_key) do update
set
  enabled = excluded.enabled,
  updated_at = timezone('utc', now());

create or replace function public.has_permission(p_permission_key text)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  caller_profile public.profiles%rowtype;
  caller_roles public.app_role[];
  permission_known boolean;
begin
  if auth.role() = 'service_role' then
    return true;
  end if;

  if auth.uid() is null or p_permission_key is null or p_permission_key = '' then
    return false;
  end if;

  permission_known := p_permission_key = any(
    array[
      'create_blog',
      'edit_blog_metadata',
      'archive_blog',
      'delete_blog',
      'start_writing',
      'submit_writing',
      'request_revision',
      'edit_writing_stage',
      'start_publishing',
      'complete_publishing',
      'edit_publishing_stage',
      'edit_scheduled_publish_date',
      'use_calendar_drag_and_drop',
      'create_comments',
      'edit_own_comments',
      'delete_comments',
      'change_writer_assignment',
      'change_publisher_assignment',
      'export_csv',
      'manage_users',
      'manage_roles',
      'manage_permissions',
      'override_workflow'
    ]::text[]
  );

  if not permission_known then
    return false;
  end if;

  select *
  into caller_profile
  from public.profiles
  where id = auth.uid()
    and is_active = true
  limit 1;

  if not found then
    return false;
  end if;

  caller_roles := coalesce(caller_profile.user_roles, array[]::public.app_role[]);
  if cardinality(caller_roles) = 0 then
    caller_roles := array[caller_profile.role];
  elsif not (caller_roles @> array[caller_profile.role]::public.app_role[]) then
    caller_roles := array_prepend(caller_profile.role, caller_roles);
  end if;

  if caller_roles @> array['admin'::public.app_role] then
    return true;
  end if;

  if p_permission_key = any(
    array[
      'manage_users',
      'manage_roles',
      'manage_permissions',
      'override_workflow',
      'delete_blog'
    ]::text[]
  ) then
    return false;
  end if;

  return exists (
    select 1
    from unnest(caller_roles) as role_value
    left join lateral (
      select enabled
      from public.role_permissions rp
      where rp.role = role_value
        and rp.permission_key = p_permission_key
      limit 1
    ) as role_override on true
    where coalesce(
      role_override.enabled,
      p_permission_key = any(public.default_role_permissions(role_value))
    )
  );
end;
$$;

create or replace function public.can_transition_writer_status(
  p_current_status public.writer_stage_status,
  p_next_status public.writer_stage_status
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select case
    when p_current_status = p_next_status then true
    when public.has_permission('override_workflow') then true
    when public.has_permission('edit_writing_stage') then true
    when p_next_status = 'in_progress'::public.writer_stage_status
      then public.has_permission('start_writing')
    when p_next_status = 'completed'::public.writer_stage_status
      then public.has_permission('submit_writing')
    when p_next_status = 'needs_revision'::public.writer_stage_status
      then public.has_permission('request_revision')
    else false
  end;
$$;

create or replace function public.can_transition_publisher_status(
  p_current_status public.publisher_stage_status,
  p_next_status public.publisher_stage_status
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select case
    when p_current_status = p_next_status then true
    when public.has_permission('override_workflow') then true
    when public.has_permission('edit_publishing_stage') then true
    when p_next_status = 'in_progress'::public.publisher_stage_status
      then public.has_permission('start_publishing')
    when p_next_status = 'completed'::public.publisher_stage_status
      then public.has_permission('complete_publishing')
    else false
  end;
$$;

create or replace function public.enforce_blog_insert_permissions()
returns trigger
language plpgsql
as $$
begin
  if auth.role() = 'service_role' then
    return new;
  end if;

  if not public.has_permission('create_blog') then
    raise exception 'Permission denied: create_blog';
  end if;

  if new.created_by is distinct from auth.uid() then
    raise exception 'created_by must match the authenticated user';
  end if;

  if new.writer_id is not null and not public.has_permission('change_writer_assignment') then
    raise exception 'Permission denied: change_writer_assignment';
  end if;

  if new.publisher_id is not null and not public.has_permission('change_publisher_assignment') then
    raise exception 'Permission denied: change_publisher_assignment';
  end if;

  if coalesce(new.is_archived, false) and not public.has_permission('archive_blog') then
    raise exception 'Permission denied: archive_blog';
  end if;

  if new.writer_status is distinct from 'not_started'::public.writer_stage_status
    and not public.can_transition_writer_status(
      'not_started'::public.writer_stage_status,
      new.writer_status
    ) then
    raise exception 'Permission denied for requested writer stage';
  end if;

  if new.publisher_status is distinct from 'not_started'::public.publisher_stage_status
    and not public.can_transition_publisher_status(
      'not_started'::public.publisher_stage_status,
      new.publisher_status
    ) then
    raise exception 'Permission denied for requested publishing stage';
  end if;

  return new;
end;
$$;

create or replace function public.enforce_blog_update_permissions()
returns trigger
language plpgsql
as $$
begin
  if auth.role() = 'service_role' then
    return new;
  end if;

  if public.has_permission('override_workflow') then
    return new;
  end if;

  if new.created_by is distinct from old.created_by
    or new.slug is distinct from old.slug
    or new.legacy_import_hash is distinct from old.legacy_import_hash
    or new.actual_published_at is distinct from old.actual_published_at
    or new.published_at is distinct from old.published_at then
    raise exception 'Only workflow override can change system-managed fields';
  end if;

  if (new.title is distinct from old.title or new.site is distinct from old.site)
    and not public.has_permission('edit_blog_metadata') then
    raise exception 'Permission denied: edit_blog_metadata';
  end if;

  if new.writer_id is distinct from old.writer_id
    and not public.has_permission('change_writer_assignment') then
    raise exception 'Permission denied: change_writer_assignment';
  end if;

  if new.publisher_id is distinct from old.publisher_id
    and not public.has_permission('change_publisher_assignment') then
    raise exception 'Permission denied: change_publisher_assignment';
  end if;

  if new.is_archived is distinct from old.is_archived
    and not public.has_permission('archive_blog') then
    raise exception 'Permission denied: archive_blog';
  end if;

  if (
    new.scheduled_publish_date is distinct from old.scheduled_publish_date
    or new.display_published_date is distinct from old.display_published_date
    or new.target_publish_date is distinct from old.target_publish_date
  ) and not public.has_permission('edit_scheduled_publish_date') then
    raise exception 'Permission denied: edit_scheduled_publish_date';
  end if;

  if new.writer_status is distinct from old.writer_status
    and not public.can_transition_writer_status(old.writer_status, new.writer_status) then
    raise exception 'Permission denied for requested writer stage';
  end if;

  if new.publisher_status is distinct from old.publisher_status
    and not public.can_transition_publisher_status(old.publisher_status, new.publisher_status) then
    raise exception 'Permission denied for requested publishing stage';
  end if;

  if new.google_doc_url is distinct from old.google_doc_url
    and not (
      public.has_permission('edit_writing_stage')
      or public.has_permission('start_writing')
      or public.has_permission('submit_writing')
      or public.has_permission('request_revision')
    ) then
    raise exception 'Permission denied for writing document updates';
  end if;

  if new.live_url is distinct from old.live_url
    and not (
      public.has_permission('edit_publishing_stage')
      or public.has_permission('start_publishing')
      or public.has_permission('complete_publishing')
    ) then
    raise exception 'Permission denied for publishing link updates';
  end if;

  return new;
end;
$$;

alter table public.role_permissions enable row level security;
alter table public.permission_audit_logs enable row level security;

drop policy if exists "Role permissions readable by authenticated users" on public.role_permissions;
create policy "Role permissions readable by authenticated users"
on public.role_permissions
for select
to authenticated
using (true);

drop policy if exists "Role permissions writable by permission admins" on public.role_permissions;
create policy "Role permissions writable by permission admins"
on public.role_permissions
for all
to authenticated
using (public.has_permission('manage_permissions'))
with check (public.has_permission('manage_permissions'));

drop policy if exists "Permission audit logs readable by permission admins" on public.permission_audit_logs;
create policy "Permission audit logs readable by permission admins"
on public.permission_audit_logs
for select
to authenticated
using (public.has_permission('manage_permissions'));

drop policy if exists "Permission audit logs insertable by permission admins" on public.permission_audit_logs;
create policy "Permission audit logs insertable by permission admins"
on public.permission_audit_logs
for insert
to authenticated
with check (
  public.has_permission('manage_permissions')
  and coalesce(changed_by, auth.uid()) = auth.uid()
);

drop policy if exists "Comments insertable by authenticated users" on public.blog_comments;
create policy "Comments insertable by authenticated users"
on public.blog_comments
for insert
to authenticated
with check (
  coalesce(user_id, created_by) = auth.uid()
  and public.has_permission('create_comments')
);

drop policy if exists "Comments updatable by owner or admin" on public.blog_comments;
create policy "Comments updatable by permission"
on public.blog_comments
for update
to authenticated
using (
  coalesce(user_id, created_by) = auth.uid()
  and public.has_permission('edit_own_comments')
)
with check (
  coalesce(user_id, created_by) = auth.uid()
  and public.has_permission('edit_own_comments')
);

drop policy if exists "Comments deletable by owner or admin" on public.blog_comments;
create policy "Comments deletable by permission"
on public.blog_comments
for delete
to authenticated
using (public.has_permission('delete_comments'));

grant execute on function public.default_role_permissions(public.app_role) to authenticated;
grant execute on function public.has_permission(text) to authenticated;
grant execute on function public.can_transition_writer_status(
  public.writer_stage_status,
  public.writer_stage_status
) to authenticated;
grant execute on function public.can_transition_publisher_status(
  public.publisher_stage_status,
  public.publisher_stage_status
) to authenticated;

notify pgrst, 'reload schema';
