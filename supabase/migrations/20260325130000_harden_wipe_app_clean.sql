-- Harden wipe_app_clean_data to disable triggers before truncating tables.
-- This prevents row-level workflow triggers (e.g., assert_published_social_post_has_live_link)
-- from firing during cascade deletion, which would block the cleanup operation.

create or replace function public.wipe_app_clean_data()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  public_tables text[];
  public_table_names text[];
  current_table text;
begin
  if auth.role() <> 'service_role' then
    raise exception 'Only service role can execute wipe_app_clean_data.';
  end if;

  -- Collect all public schema tables except spatial references
  select
    array_agg(format('%I.%I', schemaname, tablename) order by tablename),
    array_agg(tablename order by tablename)
  into public_tables, public_table_names
  from pg_catalog.pg_tables
  where schemaname = 'public'
    and tablename <> 'spatial_ref_sys';

  -- Disable all triggers on all tables to prevent constraint checks during truncate
  if coalesce(array_length(public_table_names, 1), 0) > 0 then
    foreach current_table in array public_table_names loop
      execute format('alter table public.%I disable trigger all', current_table);
    end loop;

    -- Truncate with cascade, now safe from trigger constraints
    begin
      execute format(
        'truncate table %s restart identity cascade',
        array_to_string(public_tables, ', ')
      );
    exception
      when others then
        -- Re-enable triggers on error and propagate the exception
        foreach current_table in array public_table_names loop
          execute format('alter table public.%I enable trigger all', current_table);
        end loop;
        raise;
    end;

    -- Re-enable all triggers after successful truncate
    foreach current_table in array public_table_names loop
      execute format('alter table public.%I enable trigger all', current_table);
    end loop;
  end if;

  -- Reset app_settings to defaults
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

  return jsonb_build_object(
    'truncated_table_count',
    coalesce(array_length(public_tables, 1), 0),
    'truncated_tables',
    to_jsonb(coalesce(public_tables, array[]::text[])),
    'app_settings_reset',
    true
  );
end;
$$;

revoke all on function public.wipe_app_clean_data() from public;
revoke all on function public.wipe_app_clean_data() from anon;
revoke all on function public.wipe_app_clean_data() from authenticated;
grant execute on function public.wipe_app_clean_data() to service_role;

notify pgrst, 'reload schema';
