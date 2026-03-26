-- Fix wipe_app_clean_data delete safety by adding explicit WHERE predicates.
-- Some environments enforce "DELETE requires a WHERE clause" for destructive statements.

create or replace function public.wipe_app_clean_data(preserved_user_id uuid default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  tables_deleted integer := 0;
  truncated_tables text[] := array[]::text[];
  app_settings_reset boolean := false;
begin
  if auth.role() <> 'service_role' then
    raise exception 'Only service role can execute wipe_app_clean_data.';
  end if;

  begin
    delete from public.social_post_comments where true;
    tables_deleted := tables_deleted + 1;
    truncated_tables := array_append(truncated_tables, 'public.social_post_comments');
  exception when undefined_table then null; when others then raise notice 'Failed to delete social_post_comments: %', sqlerrm;
  end;

  begin
    delete from public.social_post_activity_history where true;
    tables_deleted := tables_deleted + 1;
    truncated_tables := array_append(truncated_tables, 'public.social_post_activity_history');
  exception when undefined_table then null; when others then raise notice 'Failed to delete social_post_activity_history: %', sqlerrm;
  end;

  begin
    delete from public.social_post_links where true;
    tables_deleted := tables_deleted + 1;
    truncated_tables := array_append(truncated_tables, 'public.social_post_links');
  exception when undefined_table then null; when others then raise notice 'Failed to delete social_post_links: %', sqlerrm;
  end;

  begin
    delete from public.blog_comments where true;
    tables_deleted := tables_deleted + 1;
    truncated_tables := array_append(truncated_tables, 'public.blog_comments');
  exception when undefined_table then null; when others then raise notice 'Failed to delete blog_comments: %', sqlerrm;
  end;

  begin
    delete from public.blog_idea_comments where true;
    tables_deleted := tables_deleted + 1;
    truncated_tables := array_append(truncated_tables, 'public.blog_idea_comments');
  exception when undefined_table then null; when others then raise notice 'Failed to delete blog_idea_comments: %', sqlerrm;
  end;

  begin
    delete from public.blog_assignment_history where true;
    tables_deleted := tables_deleted + 1;
    truncated_tables := array_append(truncated_tables, 'public.blog_assignment_history');
  exception when undefined_table then null; when others then raise notice 'Failed to delete blog_assignment_history: %', sqlerrm;
  end;

  begin
    delete from public.permission_audit_logs where true;
    tables_deleted := tables_deleted + 1;
    truncated_tables := array_append(truncated_tables, 'public.permission_audit_logs');
  exception when undefined_table then null; when others then raise notice 'Failed to delete permission_audit_logs: %', sqlerrm;
  end;

  begin
    delete from public.notification_events where true;
    tables_deleted := tables_deleted + 1;
    truncated_tables := array_append(truncated_tables, 'public.notification_events');
  exception when undefined_table then null; when others then raise notice 'Failed to delete notification_events: %', sqlerrm;
  end;

  begin
    delete from public.access_logs where true;
    tables_deleted := tables_deleted + 1;
    truncated_tables := array_append(truncated_tables, 'public.access_logs');
  exception when undefined_table then null; when others then raise notice 'Failed to delete access_logs: %', sqlerrm;
  end;

  begin
    delete from public.blog_import_logs where true;
    tables_deleted := tables_deleted + 1;
    truncated_tables := array_append(truncated_tables, 'public.blog_import_logs');
  exception when undefined_table then null; when others then raise notice 'Failed to delete blog_import_logs: %', sqlerrm;
  end;

  begin
    delete from public.task_assignments where true;
    tables_deleted := tables_deleted + 1;
    truncated_tables := array_append(truncated_tables, 'public.task_assignments');
  exception when undefined_table then null; when others then raise notice 'Failed to delete task_assignments: %', sqlerrm;
  end;

  begin
    delete from public.role_permissions where true;
    tables_deleted := tables_deleted + 1;
    truncated_tables := array_append(truncated_tables, 'public.role_permissions');
  exception when undefined_table then null; when others then raise notice 'Failed to delete role_permissions: %', sqlerrm;
  end;

  begin
    delete from public.notification_preferences where true;
    tables_deleted := tables_deleted + 1;
    truncated_tables := array_append(truncated_tables, 'public.notification_preferences');
  exception when undefined_table then null; when others then raise notice 'Failed to delete notification_preferences: %', sqlerrm;
  end;

  begin
    delete from public.user_integrations where true;
    tables_deleted := tables_deleted + 1;
    truncated_tables := array_append(truncated_tables, 'public.user_integrations');
  exception when undefined_table then null; when others then raise notice 'Failed to delete user_integrations: %', sqlerrm;
  end;

  begin
    delete from public.social_posts where true;
    tables_deleted := tables_deleted + 1;
    truncated_tables := array_append(truncated_tables, 'public.social_posts');
  exception when undefined_table then null; when others then raise notice 'Failed to delete social_posts: %', sqlerrm;
  end;

  begin
    delete from public.blog_ideas where true;
    tables_deleted := tables_deleted + 1;
    truncated_tables := array_append(truncated_tables, 'public.blog_ideas');
  exception when undefined_table then null; when others then raise notice 'Failed to delete blog_ideas: %', sqlerrm;
  end;

  begin
    delete from public.blogs where true;
    tables_deleted := tables_deleted + 1;
    truncated_tables := array_append(truncated_tables, 'public.blogs');
  exception when undefined_table then null; when others then raise notice 'Failed to delete blogs: %', sqlerrm;
  end;

  begin
    if preserved_user_id is null then
      delete from public.profiles where true;
    else
      delete from public.profiles where id <> preserved_user_id;
    end if;
    tables_deleted := tables_deleted + 1;
    truncated_tables := array_append(truncated_tables, 'public.profiles');
  exception when undefined_table then null; when others then raise notice 'Failed to delete profiles: %', sqlerrm;
  end;

  begin
    delete from public.app_settings where true;
    tables_deleted := tables_deleted + 1;
    truncated_tables := array_append(truncated_tables, 'public.app_settings');
  exception when undefined_table then null; when others then raise notice 'Failed to delete app_settings: %', sqlerrm;
  end;

  begin
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
  exception when undefined_table then
    app_settings_reset := false;
  when others then
    raise notice 'Failed to reset app_settings: %', sqlerrm;
    app_settings_reset := false;
  end;

  return jsonb_build_object(
    'truncated_table_count',
    tables_deleted,
    'truncated_tables',
    to_jsonb(truncated_tables),
    'app_settings_reset',
    app_settings_reset,
    'method',
    'DELETE with explicit WHERE predicates'
  );
end;
$$;

revoke all on function public.wipe_app_clean_data(uuid) from public;
revoke all on function public.wipe_app_clean_data(uuid) from anon;
revoke all on function public.wipe_app_clean_data(uuid) from authenticated;
grant execute on function public.wipe_app_clean_data(uuid) to service_role;

notify pgrst, 'reload schema';
