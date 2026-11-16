-- Attribute blog history rows to the acting user on service-role writes.
--
-- Problem: public.audit_blog_changes() records changed_by = auth.uid().
-- API routes write blogs with the service-role client, where auth.uid() is
-- null, so history rows are stored with no actor and the UI shows "System".
--
-- Fix: the API now sends the signed-in user's id in the
-- `x-content-relay-actor` request header on every service-role request.
-- PostgREST exposes request headers to SQL inside the same transaction as the
-- write, so a BEFORE INSERT trigger on the history table can fill changed_by.
--
-- Safety:
--   * Only fills changed_by when it is null; rows written with a real
--     auth.uid() are never touched.
--   * Only honours the header on service-role requests. A browser client
--     cannot use it to attribute a change to someone else.
--   * Ignores values that are not a uuid of an existing profile.
--   * Never raises: any failure leaves changed_by null (today's behaviour),
--     so a blog write can never be blocked by this trigger.
--   * Additive only. No existing function, trigger, or row is changed, and
--     existing history is not backfilled.
--
-- Rollback:
--   drop trigger if exists blog_history_fill_actor on public.blog_assignment_history;
--   drop function if exists public.blog_history_fill_actor();

create or replace function public.blog_history_fill_actor()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  header_value text;
  actor_id uuid;
begin
  if new.changed_by is not null then
    return new;
  end if;

  begin
    if auth.role() is distinct from 'service_role' then
      return new;
    end if;

    header_value :=
      nullif(current_setting('request.headers', true), '')::json ->> 'x-content-relay-actor';

    if header_value is null
       or header_value !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
      return new;
    end if;

    actor_id := header_value::uuid;

    if exists (select 1 from public.profiles p where p.id = actor_id) then
      new.changed_by := actor_id;
    end if;
  exception when others then
    -- Attribution is best effort; never block the underlying write.
    return new;
  end;

  return new;
end;
$$;

revoke all on function public.blog_history_fill_actor() from public;

drop trigger if exists blog_history_fill_actor on public.blog_assignment_history;
create trigger blog_history_fill_actor
before insert on public.blog_assignment_history
for each row execute function public.blog_history_fill_actor();
