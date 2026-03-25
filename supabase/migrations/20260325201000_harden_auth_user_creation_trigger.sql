-- Prevent auth user creation from failing when profile or notification sync errors occur.
-- This consolidates auth.users post-insert behavior into a single resilient trigger.

drop trigger if exists notification_preferences_on_auth_user_create on auth.users;
drop trigger if exists on_auth_user_created on auth.users;

create or replace function public.handle_new_auth_user_safe()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  requested_role public.app_role := 'writer'::public.app_role;
  resolved_name text;
begin
  if new.raw_user_meta_data ? 'role' then
    begin
      requested_role := (new.raw_user_meta_data ->> 'role')::public.app_role;
    exception
      when others then
        requested_role := 'writer'::public.app_role;
    end;
  end if;

  resolved_name := coalesce(
    nullif(new.raw_user_meta_data ->> 'full_name', ''),
    split_part(coalesce(new.email, ''), '@', 1),
    'User'
  );

  begin
    insert into public.profiles (
      id,
      email,
      full_name,
      display_name,
      role,
      user_roles,
      is_active
    )
    values (
      new.id,
      coalesce(new.email, ''),
      resolved_name,
      resolved_name,
      requested_role,
      array[requested_role]::public.app_role[],
      true
    )
    on conflict (id) do update
    set
      email = excluded.email,
      full_name = excluded.full_name,
      display_name = excluded.display_name,
      role = excluded.role,
      user_roles = excluded.user_roles,
      is_active = true,
      updated_at = timezone('utc', now());
  exception
    when others then
      raise warning 'handle_new_auth_user_safe profile sync failed for %: %', new.id, sqlerrm;
  end;

  begin
    if to_regclass('public.notification_preferences') is not null then
      insert into public.notification_preferences (user_id)
      values (new.id)
      on conflict (user_id) do nothing;
    end if;
  exception
    when others then
      raise warning 'handle_new_auth_user_safe notification preference sync failed for %: %', new.id, sqlerrm;
  end;

  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_auth_user_safe();

notify pgrst, 'reload schema';
