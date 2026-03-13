create or replace function public.permission_keys()
returns text[]
language sql
immutable
as $$
  select array[
    'create_blog',
    'edit_blog_metadata',
    'edit_blog_title',
    'archive_blog',
    'restore_archived_blog',
    'delete_blog',
    'duplicate_blog',
    'view_archived_blogs',
    'start_writing',
    'pause_writing',
    'submit_draft',
    'request_revision',
    'edit_writer_status',
    'edit_google_doc_link',
    'assign_writer_self',
    'view_writing_queue',
    'start_publishing',
    'complete_publishing',
    'edit_publisher_status',
    'assign_publisher_self',
    'upload_cover_image',
    'edit_live_url',
    'view_publishing_queue',
    'edit_scheduled_publish_date',
    'edit_display_publish_date',
    'calendar_drag_reschedule',
    'view_calendar',
    'view_actual_publish_calendar',
    'create_comment',
    'edit_own_comment',
    'delete_own_comment',
    'delete_any_comment',
    'view_comment_history',
    'mention_users',
    'change_writer_assignment',
    'change_publisher_assignment',
    'bulk_reassign_blogs',
    'transfer_user_assignments',
    'view_dashboard',
    'view_metrics',
    'view_more_metrics',
    'view_delay_metrics',
    'view_pipeline_metrics',
    'export_csv',
    'export_selected_csv',
    'edit_blog_description',
    'edit_tags',
    'edit_blog_category',
    'edit_internal_notes',
    'edit_external_links',
    'view_month_calendar',
    'view_week_calendar',
    'view_unscheduled_blogs',
    'reschedule_via_calendar',
    'manage_users',
    'edit_user_profile',
    'assign_roles',
    'manage_permissions',
    'view_user_activity',
    'impersonate_user',
    'manage_integrations',
    'manage_notifications',
    'run_data_import',
    'view_system_logs',
    'repair_workflow_state',
    'manage_environment_settings',
    'override_writer_status',
    'override_publisher_status',
    'edit_actual_publish_timestamp',
    'force_publish'
  ]::text[];
$$;

create or replace function public.locked_admin_permission_keys()
returns text[]
language sql
immutable
as $$
  select array[
    'manage_users',
    'assign_roles',
    'manage_permissions',
    'delete_blog',
    'repair_workflow_state',
    'override_writer_status',
    'override_publisher_status',
    'edit_actual_publish_timestamp',
    'force_publish'
  ]::text[];
$$;

with legacy_permission_map as (
  select *
  from (
    values
      ('submit_writing'::text, 'submit_draft'::text),
      ('edit_writing_stage'::text, 'edit_writer_status'::text),
      ('edit_publishing_stage'::text, 'edit_publisher_status'::text),
      ('use_calendar_drag_and_drop'::text, 'calendar_drag_reschedule'::text),
      ('create_comments'::text, 'create_comment'::text),
      ('edit_own_comments'::text, 'edit_own_comment'::text),
      ('delete_comments'::text, 'delete_any_comment'::text),
      ('manage_roles'::text, 'assign_roles'::text),
      ('override_workflow'::text, 'repair_workflow_state'::text)
  ) as mapping(old_key, new_key)
)
insert into public.role_permissions (role, permission_key, enabled)
select
  role_permissions.role,
  legacy_permission_map.new_key,
  role_permissions.enabled
from public.role_permissions
join legacy_permission_map
  on legacy_permission_map.old_key = role_permissions.permission_key
on conflict (role, permission_key) do update
set
  enabled = excluded.enabled,
  updated_at = timezone('utc', now());

insert into public.role_permissions (role, permission_key, enabled)
select
  role,
  override_key,
  enabled
from public.role_permissions,
unnest(
  array[
    'override_writer_status',
    'override_publisher_status',
    'edit_actual_publish_timestamp',
    'force_publish'
  ]::text[]
) as override_key
where permission_key = 'override_workflow'
on conflict (role, permission_key) do update
set
  enabled = excluded.enabled,
  updated_at = timezone('utc', now());

delete from public.role_permissions
where permission_key = any(
  array[
    'submit_writing',
    'edit_writing_stage',
    'edit_publishing_stage',
    'use_calendar_drag_and_drop',
    'create_comments',
    'edit_own_comments',
    'delete_comments',
    'manage_roles',
    'override_workflow'
  ]::text[]
);

update public.permission_audit_logs
set permission_key = case permission_key
  when 'submit_writing' then 'submit_draft'
  when 'edit_writing_stage' then 'edit_writer_status'
  when 'edit_publishing_stage' then 'edit_publisher_status'
  when 'use_calendar_drag_and_drop' then 'calendar_drag_reschedule'
  when 'create_comments' then 'create_comment'
  when 'edit_own_comments' then 'edit_own_comment'
  when 'delete_comments' then 'delete_any_comment'
  when 'manage_roles' then 'assign_roles'
  when 'override_workflow' then 'repair_workflow_state'
  else permission_key
end
where permission_key = any(
  array[
    'submit_writing',
    'edit_writing_stage',
    'edit_publishing_stage',
    'use_calendar_drag_and_drop',
    'create_comments',
    'edit_own_comments',
    'delete_comments',
    'manage_roles',
    'override_workflow'
  ]::text[]
);

alter table public.role_permissions
drop constraint if exists role_permissions_permission_key_valid;

alter table public.role_permissions
drop constraint if exists role_permissions_locked_admin_only;

alter table public.permission_audit_logs
drop constraint if exists permission_audit_logs_permission_key_valid;

alter table public.role_permissions
add constraint role_permissions_permission_key_valid check (
  permission_key = any(public.permission_keys())
);

alter table public.role_permissions
add constraint role_permissions_locked_admin_only check (
  role = 'admin'::public.app_role
  or permission_key <> all(public.locked_admin_permission_keys())
);

alter table public.permission_audit_logs
add constraint permission_audit_logs_permission_key_valid check (
  permission_key = any(public.permission_keys())
);

create or replace function public.default_role_permissions(p_role public.app_role)
returns text[]
language sql
immutable
as $$
  select case
    when p_role = 'admin'::public.app_role then public.permission_keys()
    when p_role = 'writer'::public.app_role then array[
      'create_blog',
      'edit_blog_metadata',
      'edit_blog_title',
      'start_writing',
      'submit_draft',
      'request_revision',
      'edit_google_doc_link',
      'view_writing_queue',
      'edit_scheduled_publish_date',
      'calendar_drag_reschedule',
      'view_calendar',
      'create_comment',
      'edit_own_comment',
      'delete_own_comment',
      'mention_users',
      'view_dashboard',
      'view_metrics',
      'export_csv'
    ]::text[]
    when p_role = 'publisher'::public.app_role then array[
      'edit_blog_metadata',
      'start_publishing',
      'complete_publishing',
      'edit_live_url',
      'upload_cover_image',
      'view_publishing_queue',
      'edit_scheduled_publish_date',
      'calendar_drag_reschedule',
      'view_calendar',
      'create_comment',
      'edit_own_comment',
      'delete_own_comment',
      'mention_users',
      'view_dashboard',
      'view_metrics',
      'export_csv'
    ]::text[]
    when p_role = 'editor'::public.app_role then array[
      'edit_blog_metadata',
      'edit_blog_title',
      'edit_blog_description',
      'request_revision',
      'create_comment',
      'edit_own_comment',
      'delete_own_comment',
      'mention_users',
      'view_calendar',
      'view_dashboard',
      'view_metrics',
      'export_csv'
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
  select unnest(public.permission_keys()) as permission_key
) as permission_values
where permission_values.permission_key <> all(public.locked_admin_permission_keys())
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
begin
  if auth.role() = 'service_role' then
    return true;
  end if;

  if auth.uid() is null or p_permission_key is null or p_permission_key = '' then
    return false;
  end if;

  if p_permission_key <> all(public.permission_keys()) then
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

  if p_permission_key = any(public.locked_admin_permission_keys()) then
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
    when public.has_permission('repair_workflow_state') then true
    when public.has_permission('override_writer_status') then true
    when public.has_permission('edit_writer_status') then true
    when p_next_status = 'in_progress'::public.writer_stage_status
      then public.has_permission('start_writing')
    when p_next_status = 'completed'::public.writer_stage_status
      then public.has_permission('submit_draft')
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
    when public.has_permission('repair_workflow_state') then true
    when public.has_permission('override_publisher_status') then true
    when public.has_permission('edit_publisher_status') then true
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

  if new.writer_id is not null then
    if new.writer_id = auth.uid() then
      if not (
        public.has_permission('assign_writer_self')
        or public.has_permission('change_writer_assignment')
      ) then
        raise exception 'Permission denied: assign_writer_self';
      end if;
    elsif not public.has_permission('change_writer_assignment') then
      raise exception 'Permission denied: change_writer_assignment';
    end if;
  end if;

  if new.publisher_id is not null then
    if new.publisher_id = auth.uid() then
      if not (
        public.has_permission('assign_publisher_self')
        or public.has_permission('change_publisher_assignment')
      ) then
        raise exception 'Permission denied: assign_publisher_self';
      end if;
    elsif not public.has_permission('change_publisher_assignment') then
      raise exception 'Permission denied: change_publisher_assignment';
    end if;
  end if;

  if coalesce(new.is_archived, false) and not public.has_permission('archive_blog') then
    raise exception 'Permission denied: archive_blog';
  end if;

  if new.scheduled_publish_date is not null
    and not public.has_permission('edit_scheduled_publish_date') then
    raise exception 'Permission denied: edit_scheduled_publish_date';
  end if;

  if new.display_published_date is not null
    and not public.has_permission('edit_display_publish_date') then
    raise exception 'Permission denied: edit_display_publish_date';
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

  if public.has_permission('repair_workflow_state') then
    return new;
  end if;

  if new.created_by is distinct from old.created_by
    or new.slug is distinct from old.slug
    or new.legacy_import_hash is distinct from old.legacy_import_hash then
    raise exception 'Permission denied for system-managed fields';
  end if;

  if (
    new.actual_published_at is distinct from old.actual_published_at
    or new.published_at is distinct from old.published_at
  ) and not (
    public.has_permission('edit_actual_publish_timestamp')
    or public.has_permission('force_publish')
  ) then
    raise exception 'Permission denied: edit_actual_publish_timestamp';
  end if;

  if new.title is distinct from old.title
    and not (
      public.has_permission('edit_blog_title')
      or public.has_permission('edit_blog_metadata')
    ) then
    raise exception 'Permission denied: edit_blog_title';
  end if;

  if new.site is distinct from old.site
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

  if old.is_archived = false and new.is_archived = true
    and not public.has_permission('archive_blog') then
    raise exception 'Permission denied: archive_blog';
  end if;

  if old.is_archived = true and new.is_archived = false
    and not public.has_permission('restore_archived_blog') then
    raise exception 'Permission denied: restore_archived_blog';
  end if;

  if (
    new.scheduled_publish_date is distinct from old.scheduled_publish_date
    or new.target_publish_date is distinct from old.target_publish_date
  ) then
    if old.overall_status = 'published'::public.overall_blog_status then
      raise exception 'Cannot drag-reschedule a published blog';
    end if;
    if not public.has_permission('edit_scheduled_publish_date') then
      raise exception 'Permission denied: edit_scheduled_publish_date';
    end if;
  end if;

  if new.display_published_date is distinct from old.display_published_date
    and not public.has_permission('edit_display_publish_date') then
    raise exception 'Permission denied: edit_display_publish_date';
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
      public.has_permission('edit_google_doc_link')
      or public.has_permission('edit_writer_status')
      or public.has_permission('start_writing')
      or public.has_permission('submit_draft')
      or public.has_permission('request_revision')
    ) then
    raise exception 'Permission denied: edit_google_doc_link';
  end if;

  if new.live_url is distinct from old.live_url
    and not (
      public.has_permission('edit_live_url')
      or public.has_permission('edit_publisher_status')
      or public.has_permission('start_publishing')
      or public.has_permission('complete_publishing')
    ) then
    raise exception 'Permission denied: edit_live_url';
  end if;

  return new;
end;
$$;

drop policy if exists "Comments insertable by authenticated users" on public.blog_comments;
create policy "Comments insertable by authenticated users"
on public.blog_comments
for insert
to authenticated
with check (
  coalesce(user_id, created_by) = auth.uid()
  and public.has_permission('create_comment')
);

drop policy if exists "Comments updatable by permission" on public.blog_comments;
create policy "Comments updatable by permission"
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

drop policy if exists "Comments deletable by permission" on public.blog_comments;
create policy "Comments deletable by permission"
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

grant execute on function public.permission_keys() to authenticated;
grant execute on function public.locked_admin_permission_keys() to authenticated;
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
