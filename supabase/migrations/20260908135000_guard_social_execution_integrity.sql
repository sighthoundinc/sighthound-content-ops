-- Syntactic validation only; no network request or visibility claim.
create or replace function public.is_valid_social_live_link(p_platform text, p_url text)
returns boolean
language sql
immutable
set search_path = public
as $$
  select coalesce(
    p_url ~* (
      '^https://([a-z0-9_-]+\.)*' ||
      case p_platform
        when 'linkedin' then 'linkedin\.com'
        when 'facebook' then 'facebook\.com'
        when 'instagram' then 'instagram\.com'
        else null
      end ||
      '(:443)?/[^?#[:space:]][^[:space:]]*$'
    ), false
  );
$$;

create or replace function public.guard_social_execution_integrity()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'UPDATE' then
    if old.status::text in ('ready_to_publish', 'awaiting_live_link') and (
      new.title is distinct from old.title
      or new.product is distinct from old.product
      or new.type is distinct from old.type
      or new.canva_url is distinct from old.canva_url
      or new.canva_page is distinct from old.canva_page
      or new.caption is distinct from old.caption
      or new.platforms is distinct from old.platforms
      or new.scheduled_date is distinct from old.scheduled_date
      or new.associated_blog_id is distinct from old.associated_blog_id
    ) then
      raise exception using errcode = '23514',
        message = 'Brief fields are locked during execution. Reopen the brief before editing.';
    end if;
  end if;

  if new.status::text = 'published' and not exists (
    select 1 from public.social_post_links
    where social_post_id = new.id
      and public.is_valid_social_live_link(platform::text, url)
  ) then
    raise exception using errcode = '23514',
      message = 'Published requires a valid stored social live link.';
  end if;
  return new;
end;
$$;

create trigger social_posts_guard_execution_integrity
before insert or update on public.social_posts
for each row execute function public.guard_social_execution_integrity();

-- Link mutations and publication acquire the same parent-row lock. Lock both
-- parents in ID order if a link is moved. No production data is backfilled.
create or replace function public.lock_social_link_parents()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  parent_ids uuid[];
begin
  if tg_op = 'INSERT' then
    parent_ids := array[new.social_post_id];
  elsif tg_op = 'DELETE' then
    parent_ids := array[old.social_post_id];
  else
    parent_ids := array[old.social_post_id, new.social_post_id];
  end if;
  perform id from public.social_posts
  where id = any(parent_ids)
  order by id for update;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

create trigger social_post_links_lock_parents
before insert or update or delete on public.social_post_links
for each row execute function public.lock_social_link_parents();

-- Preserve the existing after-mutation guard, but require valid platform/URL
-- pairs rather than merely nonempty text. Parent deletion cascades still work.
create or replace function public.assert_published_social_post_has_live_link(p_social_post_id uuid)
returns void
language plpgsql
set search_path = public
as $$
begin
  if exists (
    select 1 from public.social_posts
    where id = p_social_post_id and status::text = 'published'
  ) and not exists (
    select 1 from public.social_post_links
    where social_post_id = p_social_post_id
      and public.is_valid_social_live_link(platform::text, url)
  ) then
    raise exception using errcode = '23514',
      message = 'Published requires a valid stored social live link.';
  end if;
end;
$$;

notify pgrst, 'reload schema';
