alter table public.blogs
  add column if not exists scheduled_publish_date date,
  add column if not exists published_at timestamptz;
alter table public.blogs disable trigger user;

update public.blogs
set scheduled_publish_date = coalesce(scheduled_publish_date, target_publish_date)
where scheduled_publish_date is null and target_publish_date is not null;

update public.blogs
set published_at = coalesce(
  published_at,
  case
    when live_url is not null and publisher_status = 'completed'::public.publisher_stage_status then
      coalesce(
        (coalesce(scheduled_publish_date, target_publish_date)::timestamp at time zone 'utc'),
        timezone('utc', now())
      )
    else null
  end
)
where published_at is null;

alter table public.blogs enable trigger user;
create index if not exists blogs_scheduled_publish_date_idx on public.blogs (scheduled_publish_date);
create index if not exists blogs_published_at_idx on public.blogs (published_at);

create or replace function public.enforce_blog_update_permissions()
returns trigger
language plpgsql
as $$
declare
  caller_role public.app_role;
begin
  caller_role := public.get_current_role();

  if caller_role is null then
    raise exception 'No active profile found for current user';
  end if;

  if caller_role = 'admin'::public.app_role then
    return new;
  end if;

  if caller_role = 'writer'::public.app_role then
    if old.writer_id is distinct from auth.uid() then
      raise exception 'Writers can only update blogs assigned to themselves';
    end if;

    if new.title is distinct from old.title
      or new.site is distinct from old.site
      or new.slug is distinct from old.slug
      or new.writer_id is distinct from old.writer_id
      or new.publisher_id is distinct from old.publisher_id
      or new.publisher_status is distinct from old.publisher_status
      or new.live_url is distinct from old.live_url
      or new.target_publish_date is distinct from old.target_publish_date
      or new.scheduled_publish_date is distinct from old.scheduled_publish_date
      or new.published_at is distinct from old.published_at
      or new.is_archived is distinct from old.is_archived
      or new.created_by is distinct from old.created_by then
      raise exception 'Writers can only update google_doc_url and writer_status';
    end if;

    return new;
  end if;

  if caller_role = 'publisher'::public.app_role then
    if old.publisher_id is distinct from auth.uid() then
      raise exception 'Publishers can only update blogs assigned to themselves';
    end if;

    if new.title is distinct from old.title
      or new.site is distinct from old.site
      or new.slug is distinct from old.slug
      or new.writer_id is distinct from old.writer_id
      or new.publisher_id is distinct from old.publisher_id
      or new.writer_status is distinct from old.writer_status
      or new.google_doc_url is distinct from old.google_doc_url
      or new.target_publish_date is distinct from old.target_publish_date
      or new.scheduled_publish_date is distinct from old.scheduled_publish_date
      or new.published_at is distinct from old.published_at
      or new.is_archived is distinct from old.is_archived
      or new.created_by is distinct from old.created_by then
      raise exception 'Publishers can only update live_url and publisher_status';
    end if;

    return new;
  end if;

  raise exception 'Unauthorized role for blog update';
end
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

  if tg_op = 'UPDATE' then
    if new.writer_status is distinct from old.writer_status
      or new.publisher_status is distinct from old.publisher_status then
      new.status_updated_at := timezone('utc', now());
    end if;
  end if;

  if new.writer_status in ('in_progress', 'needs_revision', 'completed')
    and new.writer_id is null then
    raise exception 'writer_id is required before changing writer status';
  end if;

  if new.publisher_status in ('in_progress', 'completed')
    and new.publisher_id is null then
    raise exception 'publisher_id is required before changing publisher status';
  end if;

  if new.publisher_status = 'completed'
    and new.writer_status <> 'completed' then
    raise exception 'Cannot complete publishing before writing is complete';
  end if;

  if new.publisher_status = 'completed' and new.live_url is not null then
    if new.published_at is null then
      new.published_at := coalesce(
        (new.scheduled_publish_date::timestamp at time zone 'utc'),
        timezone('utc', now())
      );
    end if;
  elsif new.publisher_status <> 'completed' then
    new.published_at := null;
  end if;

  new.overall_status := public.derive_overall_status(new.writer_status, new.publisher_status);
  new.updated_at := timezone('utc', now());
  return new;
end
$$;

create or replace function public.queue_notification_event(
  p_blog_id uuid,
  p_event_type text,
  p_actor uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  blog_row public.blogs%rowtype;
  actor_name text;
  writer_email text;
  publisher_email text;
begin
  select * into blog_row from public.blogs where id = p_blog_id;
  if not found then
    return;
  end if;

  select full_name into actor_name from public.profiles where id = p_actor;
  select email into writer_email from public.profiles where id = blog_row.writer_id;
  select email into publisher_email from public.profiles where id = blog_row.publisher_id;

  insert into public.notification_events (blog_id, event_type, payload)
  values (
    blog_row.id,
    p_event_type,
    jsonb_build_object(
      'blogId', blog_row.id,
      'title', blog_row.title,
      'site', blog_row.site,
      'actorId', p_actor,
      'actorName', coalesce(actor_name, 'System'),
      'writerEmail', writer_email,
      'publisherEmail', publisher_email,
      'overallStatus', blog_row.overall_status,
      'scheduledPublishDate', blog_row.scheduled_publish_date,
      'publishedAt', blog_row.published_at,
      'targetPublishDate', blog_row.target_publish_date
    )
  );
end
$$;
