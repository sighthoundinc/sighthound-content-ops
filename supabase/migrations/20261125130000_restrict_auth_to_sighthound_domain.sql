-- Only @sighthound.com accounts may exist. Applies to every sign-up path
-- (Google, Slack, email, admin-created) and to later email changes.
-- Unlike the sync triggers on auth.users, this one is meant to abort.
create or replace function public.enforce_sighthound_email_domain()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'UPDATE' and new.email is not distinct from old.email then
    return new;
  end if;
  if new.email is null or lower(new.email) not like '%@sighthound.com' then
    raise exception 'Only @sighthound.com accounts can sign in to Content Relay.';
  end if;
  return new;
end;
$$;

drop trigger if exists enforce_sighthound_email_domain on auth.users;
create trigger enforce_sighthound_email_domain
before insert or update of email on auth.users
for each row
execute function public.enforce_sighthound_email_domain();

-- Rollback: drop trigger enforce_sighthound_email_domain on auth.users;
