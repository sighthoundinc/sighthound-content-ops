-- Harden wipe_app_clean_data to drop foreign key constraints before truncating tables.
-- This prevents FK cascades and row-level triggers from blocking cleanup.
-- Constraints are restored after truncation for schema consistency.

create or replace function public.wipe_app_clean_data()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  public_tables text[];
  constraint_list record;
  constraint_count integer := 0;
begin
  if auth.role() <> 'service_role' then
    raise exception 'Only service role can execute wipe_app_clean_data.';
  end if;

  -- Collect all public schema tables except spatial references
  select array_agg(format('%I.%I', schemaname, tablename) order by tablename)
  into public_tables
  from pg_catalog.pg_tables
  where schemaname = 'public'
    and tablename <> 'spatial_ref_sys';

  -- Drop all foreign key constraints to prevent cascade checks during truncate
  for constraint_list in
    select constraint_name, table_name
    from information_schema.table_constraints
    where constraint_type = 'FOREIGN KEY'
      and table_schema = 'public'
    order by table_name
  loop
    execute format(
      'alter table public.%I drop constraint %I',
      constraint_list.table_name,
      constraint_list.constraint_name
    );
    constraint_count := constraint_count + 1;
  end loop;

  -- Truncate all tables with cascade (now safe with no FK constraints)
  if coalesce(array_length(public_tables, 1), 0) > 0 then
    begin
      execute format(
        'truncate table %s restart identity cascade',
        array_to_string(public_tables, ', ')
      );
    exception
      when others then
        raise notice 'TRUNCATE failed: %', sqlerrm;
        raise;
    end;
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
