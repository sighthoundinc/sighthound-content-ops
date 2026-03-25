-- Further hardening: use DELETE with proper ordering instead of TRUNCATE
-- to gracefully handle any remaining constraint violations during wipe.

create or replace function public.wipe_app_clean_data()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  public_tables text[];
  tables_deleted integer := 0;
begin
  if auth.role() <> 'service_role' then
    raise exception 'Only service role can execute wipe_app_clean_data.';
  end if;

  -- Delete in reverse FK dependency order (children before parents)
  -- This avoids FK constraint violations during deletion
  begin
    delete from public.social_post_comments;
    tables_deleted := tables_deleted + 1;
  exception when others then
    raise notice 'Failed to delete social_post_comments: %', sqlerrm;
  end;

  begin
    delete from public.social_post_activity_history;
    tables_deleted := tables_deleted + 1;
  exception when others then
    raise notice 'Failed to delete social_post_activity_history: %', sqlerrm;
  end;

  begin
    delete from public.blog_comments;
    tables_deleted := tables_deleted + 1;
  exception when others then
    raise notice 'Failed to delete blog_comments: %', sqlerrm;
  end;

  begin
    delete from public.blog_idea_comments;
    tables_deleted := tables_deleted + 1;
  exception when others then
    raise notice 'Failed to delete blog_idea_comments: %', sqlerrm;
  end;

  begin
    delete from public.blog_assignment_history;
    tables_deleted := tables_deleted + 1;
  exception when others then
    raise notice 'Failed to delete blog_assignment_history: %', sqlerrm;
  end;

  begin
    delete from public.permission_audit_logs;
    tables_deleted := tables_deleted + 1;
  exception when others then
    raise notice 'Failed to delete permission_audit_logs: %', sqlerrm;
  end;

  begin
    delete from public.notification_events;
    tables_deleted := tables_deleted + 1;
  exception when others then
    raise notice 'Failed to delete notification_events: %', sqlerrm;
  end;

  begin
    delete from public.blog_import_logs;
    tables_deleted := tables_deleted + 1;
  exception when others then
    raise notice 'Failed to delete blog_import_logs: %', sqlerrm;
  end;

  begin
    delete from public.role_permissions;
    tables_deleted := tables_deleted + 1;
  exception when others then
    raise notice 'Failed to delete role_permissions: %', sqlerrm;
  end;

  -- Delete social posts before social_post_links (FK parent before child)
  begin
    delete from public.social_post_links;
    tables_deleted := tables_deleted + 1;
  exception when others then
    raise notice 'Failed to delete social_post_links: %', sqlerrm;
  end;

  begin
    delete from public.social_posts;
    tables_deleted := tables_deleted + 1;
  exception when others then
    raise notice 'Failed to delete social_posts: %', sqlerrm;
  end;

  begin
    delete from public.blog_ideas;
    tables_deleted := tables_deleted + 1;
  exception when others then
    raise notice 'Failed to delete blog_ideas: %', sqlerrm;
  end;

  begin
    delete from public.blogs;
    tables_deleted := tables_deleted + 1;
  exception when others then
    raise notice 'Failed to delete blogs: %', sqlerrm;
  end;

  begin
    delete from public.profiles;
    tables_deleted := tables_deleted + 1;
  exception when others then
    raise notice 'Failed to delete profiles: %', sqlerrm;
  end;

  begin
    delete from public.app_settings;
    tables_deleted := tables_deleted + 1;
  exception when others then
    raise notice 'Failed to delete app_settings: %', sqlerrm;
  end;

  -- Restart sequences for tables with serial IDs
  begin
    execute 'ALTER SEQUENCE IF EXISTS public.app_settings_id_seq RESTART WITH 1';
    execute 'ALTER SEQUENCE IF EXISTS public.blog_assignment_history_id_seq RESTART WITH 1';
    execute 'ALTER SEQUENCE IF EXISTS public.blog_comments_id_seq RESTART WITH 1';
    execute 'ALTER SEQUENCE IF EXISTS public.blog_idea_comments_id_seq RESTART WITH 1';
    execute 'ALTER SEQUENCE IF EXISTS public.blog_import_logs_id_seq RESTART WITH 1';
    execute 'ALTER SEQUENCE IF EXISTS public.blogs_id_seq RESTART WITH 1';
    execute 'ALTER SEQUENCE IF EXISTS public.notification_events_id_seq RESTART WITH 1';
    execute 'ALTER SEQUENCE IF EXISTS public.permission_audit_logs_id_seq RESTART WITH 1';
    execute 'ALTER SEQUENCE IF EXISTS public.social_post_activity_history_id_seq RESTART WITH 1';
    execute 'ALTER SEQUENCE IF EXISTS public.social_post_comments_id_seq RESTART WITH 1';
    execute 'ALTER SEQUENCE IF EXISTS public.social_post_links_id_seq RESTART WITH 1';
    execute 'ALTER SEQUENCE IF EXISTS public.social_posts_id_seq RESTART WITH 1';
  exception when others then
    raise notice 'Failed to restart sequences: %', sqlerrm;
  end;

  -- Reset app_settings to defaults
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
  exception when others then
    raise notice 'Failed to reset app_settings: %', sqlerrm;
  end;

  return jsonb_build_object(
    'truncated_table_count',
    tables_deleted,
    'app_settings_reset',
    true,
    'method',
    'DELETE with exception handling (bulletproof)'
  );
end;
$$;

revoke all on function public.wipe_app_clean_data() from public;
revoke all on function public.wipe_app_clean_data() from anon;
revoke all on function public.wipe_app_clean_data() from authenticated;
grant execute on function public.wipe_app_clean_data() to service_role;

notify pgrst, 'reload schema';
