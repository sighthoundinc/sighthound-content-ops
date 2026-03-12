alter table public.blogs
  alter column writer_status drop default,
  alter column publisher_status drop default,
  alter column overall_status drop default;

drop function if exists public.derive_overall_status(public.writer_stage_status, public.publisher_stage_status);

create type public.writer_stage_status_next as enum ('assigned', 'writing', 'pending_review', 'completed');
create type public.publisher_stage_status_next as enum ('not_started', 'publishing', 'pending_review', 'completed');
create type public.overall_blog_status_next as enum (
  'writing',
  'writing_review',
  'ready_to_publish',
  'publishing',
  'publishing_review',
  'published'
);

alter table public.blogs
  alter column writer_status type public.writer_stage_status_next
  using (
    case writer_status::text
      when 'not_started' then 'assigned'
      when 'in_progress' then 'writing'
      when 'needs_revision' then 'pending_review'
      else writer_status::text
    end
  )::public.writer_stage_status_next,
  alter column publisher_status type public.publisher_stage_status_next
  using (
    case publisher_status::text
      when 'in_progress' then 'publishing'
      else publisher_status::text
    end
  )::public.publisher_stage_status_next,
  alter column overall_status type public.overall_blog_status_next
  using (
    case overall_status::text
      when 'planned' then 'writing'
      when 'needs_revision' then 'writing_review'
      else overall_status::text
    end
  )::public.overall_blog_status_next;

drop type public.writer_stage_status;
alter type public.writer_stage_status_next rename to writer_stage_status;
drop type public.publisher_stage_status;
alter type public.publisher_stage_status_next rename to publisher_stage_status;
drop type public.overall_blog_status;
alter type public.overall_blog_status_next rename to overall_blog_status;

alter table public.blogs
  alter column writer_status set default 'assigned'::public.writer_stage_status,
  alter column publisher_status set default 'not_started'::public.publisher_stage_status,
  alter column overall_status set default 'writing'::public.overall_blog_status;

update public.blogs
set publisher_status = 'not_started'::public.publisher_stage_status
where writer_status <> 'completed'::public.writer_stage_status
  and publisher_status <> 'not_started'::public.publisher_stage_status;

create or replace function public.derive_overall_status(
  p_writer_status public.writer_stage_status,
  p_publisher_status public.publisher_stage_status
)
returns public.overall_blog_status
language sql
immutable
as $$
  select case
    when p_writer_status <> 'completed'::public.writer_stage_status
      and p_writer_status = 'pending_review'::public.writer_stage_status
      then 'writing_review'::public.overall_blog_status
    when p_writer_status <> 'completed'::public.writer_stage_status
      then 'writing'::public.overall_blog_status
    when p_publisher_status = 'not_started'::public.publisher_stage_status
      then 'ready_to_publish'::public.overall_blog_status
    when p_publisher_status = 'publishing'::public.publisher_stage_status
      then 'publishing'::public.overall_blog_status
    when p_publisher_status = 'pending_review'::public.publisher_stage_status
      then 'publishing_review'::public.overall_blog_status
    else 'published'::public.overall_blog_status
  end;
$$;

create or replace function public.handle_blog_before_write()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' then
    new.status_updated_at := timezone('utc', now());
    new.created_at := coalesce(new.created_at, timezone('utc', now()));
  end if;

  if new.scheduled_publish_date is null then
    new.scheduled_publish_date := new.target_publish_date;
  end if;

  if tg_op = 'UPDATE' then
    if new.scheduled_publish_date is distinct from old.scheduled_publish_date then
      new.target_publish_date := new.scheduled_publish_date;
    elsif new.target_publish_date is distinct from old.target_publish_date then
      new.scheduled_publish_date := new.target_publish_date;
    else
      new.target_publish_date := new.scheduled_publish_date;
    end if;
  else
    new.target_publish_date := new.scheduled_publish_date;
  end if;

  if new.display_published_date is null then
    new.display_published_date := new.scheduled_publish_date;
  end if;

  if new.actual_published_at is null and new.published_at is not null then
    new.actual_published_at := new.published_at;
  end if;

  if new.published_at is null and new.actual_published_at is not null then
    new.published_at := new.actual_published_at;
  end if;

  if tg_op = 'UPDATE' then
    if new.writer_status is distinct from old.writer_status
      or new.publisher_status is distinct from old.publisher_status then
      new.status_updated_at := timezone('utc', now());
    end if;
  end if;

  if new.writer_status in ('writing', 'pending_review', 'completed')
    and new.writer_id is null then
    raise exception 'writer_id is required before changing writer status';
  end if;

  if new.publisher_status in ('publishing', 'pending_review', 'completed')
    and new.publisher_id is null then
    raise exception 'publisher_id is required before changing publisher status';
  end if;

  if new.writer_status <> 'completed'
    and new.publisher_status <> 'not_started' then
    raise exception 'Cannot start publishing before writing is complete';
  end if;

  new.overall_status := public.derive_overall_status(new.writer_status, new.publisher_status);

  if new.overall_status = 'published'::public.overall_blog_status
    and new.actual_published_at is null then
    new.actual_published_at := timezone('utc', now());
  end if;

  if new.published_at is null and new.actual_published_at is not null then
    new.published_at := new.actual_published_at;
  end if;

  new.updated_at := timezone('utc', now());
  return new;
end
$$;

create or replace function public.audit_blog_changes()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.blog_assignment_history (
      blog_id,
      changed_by,
      event_type,
      field_name,
      new_value,
      metadata
    ) values (
      new.id,
      auth.uid(),
      'created',
      'blog',
      new.title,
      jsonb_build_object('overall_status', new.overall_status, 'site', new.site)
    );

    if new.writer_id is not null then
      perform public.queue_notification_event(new.id, 'writer_assigned', coalesce(auth.uid(), new.created_by));
    end if;
    return new;
  end if;

  if new.writer_id is distinct from old.writer_id then
    insert into public.blog_assignment_history (blog_id, changed_by, event_type, field_name, old_value, new_value)
    values (new.id, auth.uid(), 'assignment_changed', 'writer_id', old.writer_id::text, new.writer_id::text);

    if new.writer_id is not null then
      perform public.queue_notification_event(new.id, 'writer_assigned', auth.uid());
    end if;
  end if;

  if new.publisher_id is distinct from old.publisher_id then
    insert into public.blog_assignment_history (blog_id, changed_by, event_type, field_name, old_value, new_value)
    values (new.id, auth.uid(), 'assignment_changed', 'publisher_id', old.publisher_id::text, new.publisher_id::text);
  end if;

  if new.writer_status is distinct from old.writer_status then
    insert into public.blog_assignment_history (blog_id, changed_by, event_type, field_name, old_value, new_value)
    values (new.id, auth.uid(), 'status_updated', 'writer_status', old.writer_status::text, new.writer_status::text);

    if new.writer_status = 'completed' then
      insert into public.blog_assignment_history (blog_id, changed_by, event_type, field_name, old_value, new_value)
      values (new.id, auth.uid(), 'writer_completed', 'writer_status', old.writer_status::text, new.writer_status::text);
      perform public.queue_notification_event(new.id, 'writer_completed', auth.uid());
    elsif new.writer_status = 'pending_review' then
      insert into public.blog_assignment_history (blog_id, changed_by, event_type, field_name, old_value, new_value)
      values (new.id, auth.uid(), 'needs_revision', 'writer_status', old.writer_status::text, new.writer_status::text);
    end if;
  end if;

  if new.publisher_status is distinct from old.publisher_status then
    insert into public.blog_assignment_history (blog_id, changed_by, event_type, field_name, old_value, new_value)
    values (new.id, auth.uid(), 'status_updated', 'publisher_status', old.publisher_status::text, new.publisher_status::text);

    if new.publisher_status = 'completed' then
      insert into public.blog_assignment_history (blog_id, changed_by, event_type, field_name, old_value, new_value)
      values (new.id, auth.uid(), 'published', 'publisher_status', old.publisher_status::text, new.publisher_status::text);
      perform public.queue_notification_event(new.id, 'published', auth.uid());
    end if;
  end if;

  if new.overall_status is distinct from old.overall_status
    and new.overall_status = 'ready_to_publish' then
    insert into public.blog_assignment_history (blog_id, changed_by, event_type, field_name, old_value, new_value)
    values (new.id, auth.uid(), 'ready_to_publish', 'overall_status', old.overall_status::text, new.overall_status::text);
    perform public.queue_notification_event(new.id, 'ready_to_publish', auth.uid());
  end if;

  if new.google_doc_url is distinct from old.google_doc_url then
    insert into public.blog_assignment_history (blog_id, changed_by, event_type, field_name, old_value, new_value)
    values (new.id, auth.uid(), 'link_updated', 'google_doc_url', old.google_doc_url, new.google_doc_url);
  end if;

  if new.live_url is distinct from old.live_url then
    insert into public.blog_assignment_history (blog_id, changed_by, event_type, field_name, old_value, new_value)
    values (new.id, auth.uid(), 'link_updated', 'live_url', old.live_url, new.live_url);
  end if;

  return new;
end
$$;

alter table public.blogs
  drop constraint if exists blogs_publisher_complete_requires_writer_complete;

alter table public.blogs
  add constraint blogs_publisher_progress_requires_writer_complete check (
    publisher_status = 'not_started'::public.publisher_stage_status
    or writer_status = 'completed'::public.writer_stage_status
  );

grant execute on function public.derive_overall_status(public.writer_stage_status, public.publisher_stage_status) to authenticated;
