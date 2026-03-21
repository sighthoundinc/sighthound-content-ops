-- Canonical social post workflow:
-- draft -> in_review -> (changes_requested <-> in_review) -> creative_approved
-- -> ready_to_publish -> awaiting_live_link -> published
-- with direct ready_to_publish -> published allowed only when a live link exists.

alter type public.social_post_status add value if not exists 'draft';
alter type public.social_post_status add value if not exists 'in_review';
alter type public.social_post_status add value if not exists 'changes_requested';
alter type public.social_post_status add value if not exists 'creative_approved';
alter type public.social_post_status add value if not exists 'ready_to_publish';
alter type public.social_post_status add value if not exists 'awaiting_live_link';

-- Note: Enum values have been added above; now we migrate data by casting to text first
update public.social_posts
set status = (
  case status::text
    when 'idea' then 'draft'
    when 'review' then 'in_review'
    else status::text
  end
)::public.social_post_status
where status::text in ('idea', 'review');

update public.social_posts sp
set status = 'awaiting_live_link'::text::public.social_post_status
where sp.status::text = 'published'
  and not exists (
    select 1
    from public.social_post_links spl
    where spl.social_post_id = sp.id
      and char_length(trim(coalesce(spl.url, ''))) > 0
  );

alter table public.social_posts
  alter column status set default 'draft'::text::public.social_post_status;

alter table public.social_posts
  drop constraint if exists social_posts_status_canonical;

alter table public.social_posts
  add constraint social_posts_status_canonical
  check (
    status::text in (
      'draft',
      'in_review',
      'changes_requested',
      'creative_approved',
      'ready_to_publish',
      'awaiting_live_link',
      'published'
    )
  );

create or replace function public.assert_published_social_post_has_live_link(
  p_social_post_id uuid
)
returns void
language plpgsql
as $$
declare
  post_status text;
  has_live_link boolean;
begin
  if p_social_post_id is null then
    return;
  end if;

  select sp.status::text
  into post_status
  from public.social_posts sp
  where sp.id = p_social_post_id;

  if not found or post_status <> 'published' then
    return;
  end if;

  select exists (
    select 1
    from public.social_post_links spl
    where spl.social_post_id = p_social_post_id
      and char_length(trim(coalesce(spl.url, ''))) > 0
  )
  into has_live_link;

  if not has_live_link then
    raise exception 'At least one live link is required before marking a social post as Published.';
  end if;
end
$$;

create or replace function public.enforce_social_post_workflow_transition()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' then
    if new.status::text <> 'draft' then
      raise exception 'New social posts must start in Draft.';
    end if;
  elsif new.status is distinct from old.status then
    case old.status::text
      when 'draft' then
        if new.status::text <> 'in_review' then
          raise exception 'Draft posts can only move to In Review.';
        end if;
      when 'in_review' then
        if new.status::text not in ('changes_requested', 'creative_approved') then
          raise exception 'In Review posts can only move to Changes Requested or Creative Approved.';
        end if;
      when 'changes_requested' then
        if new.status::text <> 'in_review' then
          raise exception 'Changes Requested posts can only move back to In Review.';
        end if;
      when 'creative_approved' then
        if new.status::text <> 'ready_to_publish' then
          raise exception 'Creative Approved posts can only move to Ready to Publish.';
        end if;
      when 'ready_to_publish' then
        if new.status::text not in ('awaiting_live_link', 'published') then
          raise exception 'Ready to Publish posts can only move to Awaiting Live Link or Published.';
        end if;
      when 'awaiting_live_link' then
        if new.status::text <> 'published' then
          raise exception 'Awaiting Live Link posts can only move to Published.';
        end if;
      when 'published' then
        raise exception 'Published posts cannot transition to another status.';
      else
        raise exception 'Unsupported social post status transition from % to %.',
          old.status::text,
          new.status::text;
    end case;
  end if;

  perform public.assert_published_social_post_has_live_link(new.id);
  return new;
end
$$;

drop trigger if exists social_posts_enforce_workflow_transition on public.social_posts;
create trigger social_posts_enforce_workflow_transition
before insert or update on public.social_posts
for each row execute function public.enforce_social_post_workflow_transition();

create or replace function public.enforce_social_post_live_link_integrity()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' then
    perform public.assert_published_social_post_has_live_link(new.social_post_id);
    return new;
  end if;

  if tg_op = 'UPDATE' then
    if new.social_post_id is distinct from old.social_post_id then
      perform public.assert_published_social_post_has_live_link(old.social_post_id);
    end if;
    perform public.assert_published_social_post_has_live_link(new.social_post_id);
    return new;
  end if;

  perform public.assert_published_social_post_has_live_link(old.social_post_id);
  return old;
end
$$;

drop trigger if exists social_post_links_enforce_live_link_integrity on public.social_post_links;
create trigger social_post_links_enforce_live_link_integrity
after insert or update or delete on public.social_post_links
for each row execute function public.enforce_social_post_live_link_integrity();

notify pgrst, 'reload schema';
