alter type public.social_post_status add value if not exists 'draft';
alter type public.social_post_status add value if not exists 'in_review';
alter type public.social_post_status add value if not exists 'changes_requested';
alter type public.social_post_status add value if not exists 'creative_approved';
alter type public.social_post_status add value if not exists 'ready_to_publish';
alter type public.social_post_status add value if not exists 'awaiting_live_link';

update public.social_posts
set status = case status::text
  when 'idea' then 'draft'::public.social_post_status
  when 'review' then 'in_review'::public.social_post_status
  else status
end
where status::text in ('idea', 'review');

alter table public.social_posts
  add column if not exists editor_user_id uuid references public.profiles (id) on delete set null,
  add column if not exists admin_owner_id uuid references public.profiles (id) on delete set null,
  add column if not exists last_live_link_reminder_at timestamptz;

update public.social_posts
set editor_user_id = created_by
where editor_user_id is null;

create index if not exists social_posts_editor_status_idx
  on public.social_posts (editor_user_id, status, updated_at desc);
create index if not exists social_posts_status_live_link_reminder_idx
  on public.social_posts (status, last_live_link_reminder_at);

create or replace function public.social_post_next_actor(
  p_status public.social_post_status
)
returns text
language sql
immutable
as $$
  select case
    when p_status in (
      'draft'::public.social_post_status,
      'changes_requested'::public.social_post_status,
      'ready_to_publish'::public.social_post_status,
      'awaiting_live_link'::public.social_post_status
    ) then 'editor'
    when p_status in (
      'in_review'::public.social_post_status,
      'creative_approved'::public.social_post_status
    ) then 'admin'
    else 'none'
  end;
$$;

create or replace function public.get_social_transition_reason()
returns text
language sql
stable
as $$
  select nullif(current_setting('app.social_transition_reason', true), '');
$$;

create or replace function public.get_social_transition_actor()
returns uuid
language sql
stable
as $$
  select nullif(current_setting('app.social_transition_actor_id', true), '')::uuid;
$$;

create or replace function public.is_social_brief_reopen_allowed()
returns boolean
language sql
stable
as $$
  select coalesce(
    nullif(current_setting('app.social_brief_reopen', true), '')::boolean,
    false
  );
$$;

create or replace function public.ensure_social_post_actor_defaults()
returns trigger
language plpgsql
as $$
begin
  if new.editor_user_id is null then
    new.editor_user_id := new.created_by;
  end if;
  return new;
end
$$;

drop trigger if exists social_posts_actor_defaults on public.social_posts;
create trigger social_posts_actor_defaults
before insert on public.social_posts
for each row execute function public.ensure_social_post_actor_defaults();

create or replace function public.audit_social_post_changes()
returns trigger
language plpgsql
as $$
declare
  effective_actor uuid;
begin
  effective_actor := coalesce(public.get_social_transition_actor(), auth.uid(), new.created_by);

  if tg_op = 'INSERT' then
    perform public.log_social_post_activity(
      new.id,
      effective_actor,
      'social_post_created',
      null,
      null,
      new.title,
      jsonb_build_object(
        'status', new.status,
        'next_actor', public.social_post_next_actor(new.status)
      )
    );
    return new;
  end if;

  if new.status is distinct from old.status then
    perform public.log_social_post_activity(
      new.id,
      effective_actor,
      'social_post_status_changed',
      'status',
      old.status::text,
      new.status::text,
      jsonb_build_object(
        'next_actor', public.social_post_next_actor(new.status),
        'reason', public.get_social_transition_reason()
      )
    );
  end if;

  if new.editor_user_id is distinct from old.editor_user_id
    or new.admin_owner_id is distinct from old.admin_owner_id then
    perform public.log_social_post_activity(
      new.id,
      effective_actor,
      'social_post_assignment_changed',
      null,
      jsonb_build_object(
        'editor_user_id', old.editor_user_id,
        'admin_owner_id', old.admin_owner_id
      )::text,
      jsonb_build_object(
        'editor_user_id', new.editor_user_id,
        'admin_owner_id', new.admin_owner_id
      )::text
    );
  end if;

  if new.title is distinct from old.title
    or new.product is distinct from old.product
    or new.type is distinct from old.type
    or new.canva_url is distinct from old.canva_url
    or new.canva_page is distinct from old.canva_page
    or new.caption is distinct from old.caption
    or new.platforms is distinct from old.platforms
    or new.scheduled_date is distinct from old.scheduled_date
    or new.associated_blog_id is distinct from old.associated_blog_id then
    perform public.log_social_post_activity(
      new.id,
      effective_actor,
      'social_post_brief_updated',
      null,
      null,
      null,
      jsonb_build_object(
        'title_changed', new.title is distinct from old.title,
        'product_changed', new.product is distinct from old.product,
        'type_changed', new.type is distinct from old.type,
        'canva_url_changed', new.canva_url is distinct from old.canva_url,
        'canva_page_changed', new.canva_page is distinct from old.canva_page,
        'caption_changed', new.caption is distinct from old.caption,
        'platforms_changed', new.platforms is distinct from old.platforms,
        'scheduled_date_changed', new.scheduled_date is distinct from old.scheduled_date,
        'associated_blog_id_changed', new.associated_blog_id is distinct from old.associated_blog_id
      )
    );
  end if;

  return new;
end
$$;

create or replace function public.audit_social_post_link_changes()
returns trigger
language plpgsql
as $$
declare
  post_id uuid;
  effective_actor uuid;
begin
  effective_actor := coalesce(public.get_social_transition_actor(), auth.uid());

  if tg_op = 'INSERT' then
    post_id := new.social_post_id;
    perform public.log_social_post_activity(
      post_id,
      effective_actor,
      'social_post_live_link_submitted',
      new.platform::text,
      null,
      new.url
    );
    return new;
  end if;

  if tg_op = 'UPDATE' then
    post_id := new.social_post_id;
    if new.url is distinct from old.url then
      perform public.log_social_post_activity(
        post_id,
        effective_actor,
        'social_post_live_link_submitted',
        new.platform::text,
        old.url,
        new.url
      );
    end if;
    return new;
  end if;

  post_id := old.social_post_id;
  perform public.log_social_post_activity(
    post_id,
    effective_actor,
    'social_post_live_link_removed',
    old.platform::text,
    old.url,
    null
  );
  return old;
end
$$;

create or replace function public.enforce_social_post_workflow_transition()
returns trigger
language plpgsql
as $$
declare
  transition_reason text;
  allow_brief_reopen boolean;
  live_link_count integer;
begin
  transition_reason := public.get_social_transition_reason();
  allow_brief_reopen := public.is_social_brief_reopen_allowed();

  if old.status in (
    'ready_to_publish'::public.social_post_status,
    'awaiting_live_link'::public.social_post_status
  ) and new.status = old.status and (
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
    raise exception 'Brief fields cannot be edited in execution stages. Use Edit Brief.';
  end if;

  if new.status is not distinct from old.status then
    return new;
  end if;

  if old.status = 'draft'::public.social_post_status
    and new.status = 'in_review'::public.social_post_status then
    return new;
  end if;
  if old.status = 'in_review'::public.social_post_status
    and new.status in (
      'changes_requested'::public.social_post_status,
      'creative_approved'::public.social_post_status
    ) then
    return new;
  end if;
  if old.status = 'changes_requested'::public.social_post_status
    and new.status = 'in_review'::public.social_post_status then
    return new;
  end if;
  if old.status = 'creative_approved'::public.social_post_status
    and new.status = 'ready_to_publish'::public.social_post_status then
    return new;
  end if;
  if old.status = 'ready_to_publish'::public.social_post_status
    and new.status = 'awaiting_live_link'::public.social_post_status then
    return new;
  end if;
  if old.status = 'awaiting_live_link'::public.social_post_status
    and new.status = 'published'::public.social_post_status then
    select count(*)
    into live_link_count
    from public.social_post_links
    where social_post_id = new.id
      and nullif(trim(url), '') is not null;
    if coalesce(live_link_count, 0) < 1 then
      raise exception 'Published requires at least one valid live link.';
    end if;
    return new;
  end if;

  if old.status in (
      'ready_to_publish'::public.social_post_status,
      'awaiting_live_link'::public.social_post_status
    )
    and new.status = 'changes_requested'::public.social_post_status then
    if transition_reason is null then
      raise exception 'Reason is required when moving execution stages back to Changes Requested.';
    end if;
    return new;
  end if;

  if allow_brief_reopen
    and old.status in (
      'ready_to_publish'::public.social_post_status,
      'awaiting_live_link'::public.social_post_status
    )
    and new.status = 'creative_approved'::public.social_post_status then
    return new;
  end if;

  raise exception 'Invalid social status transition: % -> %', old.status, new.status;
end
$$;

drop trigger if exists social_posts_enforce_workflow_transition on public.social_posts;
create trigger social_posts_enforce_workflow_transition
before update on public.social_posts
for each row execute function public.enforce_social_post_workflow_transition();

create or replace function public.transition_social_post_status(
  p_social_post_id uuid,
  p_to_status public.social_post_status,
  p_actor_id uuid,
  p_reason text default null
)
returns public.social_posts
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_post public.social_posts;
begin
  perform set_config('app.social_transition_actor_id', coalesce(p_actor_id::text, ''), true);
  perform set_config('app.social_transition_reason', coalesce(p_reason, ''), true);
  perform set_config('app.social_brief_reopen', 'false', true);

  update public.social_posts
  set status = p_to_status
  where id = p_social_post_id
  returning * into updated_post;

  if updated_post.id is null then
    raise exception 'Social post not found';
  end if;

  return updated_post;
end;
$$;

create or replace function public.reopen_social_post_for_brief_edit(
  p_social_post_id uuid,
  p_actor_id uuid,
  p_reason text default null
)
returns public.social_posts
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_post public.social_posts;
begin
  perform set_config('app.social_transition_actor_id', coalesce(p_actor_id::text, ''), true);
  perform set_config('app.social_transition_reason', coalesce(p_reason, ''), true);
  perform set_config('app.social_brief_reopen', 'true', true);

  update public.social_posts
  set status = 'creative_approved'::public.social_post_status
  where id = p_social_post_id
    and status in (
      'ready_to_publish'::public.social_post_status,
      'awaiting_live_link'::public.social_post_status
    )
  returning * into updated_post;

  if updated_post.id is null then
    raise exception 'Only execution-stage posts can be reopened for brief edits';
  end if;

  perform public.log_social_post_activity(
    updated_post.id,
    p_actor_id,
    'social_post_brief_reopened',
    'status',
    null,
    'creative_approved',
    jsonb_build_object('reason', p_reason)
  );

  return updated_post;
end;
$$;

drop policy if exists "Social posts updatable by authenticated users" on public.social_posts;
create policy "Social posts updatable by owner/editor/admin"
on public.social_posts
for update
to authenticated
using (
  created_by = auth.uid()
  or editor_user_id = auth.uid()
  or admin_owner_id = auth.uid()
  or public.is_admin()
)
with check (
  created_by = auth.uid()
  or editor_user_id = auth.uid()
  or admin_owner_id = auth.uid()
  or public.is_admin()
);

grant execute on function public.social_post_next_actor(public.social_post_status) to authenticated;
grant execute on function public.transition_social_post_status(uuid, public.social_post_status, uuid, text) to authenticated;
grant execute on function public.reopen_social_post_for_brief_edit(uuid, uuid, text) to authenticated;

notify pgrst, 'reload schema';
