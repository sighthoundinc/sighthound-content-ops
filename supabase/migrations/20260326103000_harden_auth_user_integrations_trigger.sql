-- Harden auth.users integrations trigger so user creation does not fail on integration sync issues.
-- This protects auth admin create/invite flows and import paths that provision users on demand.

create or replace function public.create_default_user_integrations()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  begin
    if to_regclass('public.user_integrations') is not null then
      insert into public.user_integrations (user_id)
      values (new.id)
      on conflict (user_id) do nothing;
    end if;
  exception
    when others then
      raise warning 'create_default_user_integrations failed for %: %', new.id, sqlerrm;
  end;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created_integrations on auth.users;
create trigger on_auth_user_created_integrations
after insert on auth.users
for each row
execute function public.create_default_user_integrations();

notify pgrst, 'reload schema';
