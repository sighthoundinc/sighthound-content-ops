create or replace function public.wipe_app_clean_data(
  preserved_user_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  wipe_order text[] := array[
    'social_post_comments',
    'social_post_activity_history',
    'social_post_links',
    'social_posts',
    'blog_comments',
    'blog_idea_comments',
    'blog_assignment_history',
    'notification_events',
    'task_assignments',
    'permission_audit_logs',
    'access_logs',
    'blog_import_logs',
    'blog_ideas',
    'blogs',
    'notification_preferences',
    'user_integrations',
    'role_permissions',
    'app_settings'
  ];
  table_name text;
  wiped_tables text[] := array[]::text[];
  wiped_table_count integer := 0;
  app_settings_reset boolean := false;
begin
  if auth.role() <> 'service_role' then
    raise exception 'Only service role can execute wipe_app_clean_data.';
  end if;

  if preserved_user_id is null then
    raise exception 'preserved_user_id is required.';
  end if;

  if to_regclass('public.profiles') is not null and not exists (
    select 1
    from public.profiles
    where id = preserved_user_id
  ) then
    raise exception 'Preserved user profile % does not exist.', preserved_user_id;
  end if;

  foreach table_name in array wipe_order loop
    if to_regclass(format('public.%s', table_name)) is null then
      continue;
    end if;

    execute format('delete from public.%I where true', table_name);
    wiped_tables := array_append(wiped_tables, table_name);
    wiped_table_count := wiped_table_count + 1;
  end loop;

  if to_regclass('public.profiles') is not null then
    delete from public.profiles
    where id <> preserved_user_id;
    wiped_tables := array_append(wiped_tables, 'profiles');
    wiped_table_count := wiped_table_count + 1;
  end if;

  if to_regclass('public.app_settings') is not null then
    insert into public.app_settings (
      id,
      timezone,
      week_start,
      stale_draft_days,
      updated_by
    )
    values (
      1,
      'America/Chicago',
      1,
      10,
      null
    )
    on conflict (id) do update
    set
      timezone = excluded.timezone,
      week_start = excluded.week_start,
      stale_draft_days = excluded.stale_draft_days,
      updated_by = null,
      updated_at = timezone('utc', now());
    app_settings_reset := true;
  end if;

  return jsonb_build_object(
    'truncated_table_count',
    wiped_table_count,
    'truncated_tables',
    to_jsonb(wiped_tables),
    'app_settings_reset',
    app_settings_reset,
    'preserved_user_id',
    preserved_user_id
  );
end;
$$;

revoke all on function public.wipe_app_clean_data(uuid) from public;
revoke all on function public.wipe_app_clean_data(uuid) from anon;
revoke all on function public.wipe_app_clean_data(uuid) from authenticated;
grant execute on function public.wipe_app_clean_data(uuid) to service_role;

notify pgrst, 'reload schema';
