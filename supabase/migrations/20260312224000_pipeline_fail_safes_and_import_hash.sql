alter table public.blogs
  add column if not exists legacy_import_hash text;

create index if not exists blogs_legacy_import_hash_idx
  on public.blogs (legacy_import_hash);

update public.blogs
set legacy_import_hash = md5(
  lower(regexp_replace(coalesce(site::text, ''), '[^a-z0-9]+', '', 'g')) || '|' ||
  lower(regexp_replace(coalesce(title, ''), '[^a-z0-9]+', '', 'g')) || '|' ||
  coalesce(scheduled_publish_date::text, target_publish_date::text, 'unscheduled')
)
where legacy_import_hash is null;

create or replace function public.enforce_blog_update_permissions()
returns trigger
language plpgsql
as $$
declare
  is_admin_role boolean;
  is_writer_role boolean;
  is_publisher_role boolean;
begin
  is_admin_role := public.has_profile_role('admin'::public.app_role);
  is_writer_role := public.has_profile_role('writer'::public.app_role);
  is_publisher_role := public.has_profile_role('publisher'::public.app_role);

  if is_admin_role then
    return new;
  end if;

  if old.publisher_status::text = 'completed'
    and (
      new.scheduled_publish_date is distinct from old.scheduled_publish_date
      or new.display_published_date is distinct from old.display_published_date
    ) then
    raise exception 'Only admins can change scheduled/display publish dates after publishing is completed';
  end if;

  if is_writer_role and old.writer_id = auth.uid() then
    if new.title is distinct from old.title
      or new.site is distinct from old.site
      or new.slug is distinct from old.slug
      or new.writer_id is distinct from old.writer_id
      or new.publisher_id is distinct from old.publisher_id
      or new.publisher_status is distinct from old.publisher_status
      or new.live_url is distinct from old.live_url
      or new.target_publish_date is distinct from old.target_publish_date
      or new.scheduled_publish_date is distinct from old.scheduled_publish_date
      or new.display_published_date is distinct from old.display_published_date
      or new.actual_published_at is distinct from old.actual_published_at
      or new.published_at is distinct from old.published_at
      or new.is_archived is distinct from old.is_archived
      or new.created_by is distinct from old.created_by
      or new.legacy_import_hash is distinct from old.legacy_import_hash then
      raise exception 'Writers can only update google_doc_url and writer_status';
    end if;
    return new;
  end if;

  if is_publisher_role and old.publisher_id = auth.uid() then
    if new.title is distinct from old.title
      or new.site is distinct from old.site
      or new.slug is distinct from old.slug
      or new.writer_id is distinct from old.writer_id
      or new.publisher_id is distinct from old.publisher_id
      or new.writer_status is distinct from old.writer_status
      or new.google_doc_url is distinct from old.google_doc_url
      or new.target_publish_date is distinct from old.target_publish_date
      or new.scheduled_publish_date is distinct from old.scheduled_publish_date
      or new.display_published_date is distinct from old.display_published_date
      or new.actual_published_at is distinct from old.actual_published_at
      or new.published_at is distinct from old.published_at
      or new.is_archived is distinct from old.is_archived
      or new.created_by is distinct from old.created_by
      or new.legacy_import_hash is distinct from old.legacy_import_hash then
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
declare
  writer_status_text text;
  publisher_status_text text;
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

  if tg_op = 'UPDATE' then
    if new.publisher_status::text = 'completed'
      and old.publisher_status::text <> 'completed'
      and new.actual_published_at is not distinct from old.actual_published_at then
      new.actual_published_at := timezone('utc', now());
    end if;
  elsif tg_op = 'INSERT' then
    if new.publisher_status::text = 'completed'
      and new.actual_published_at is null then
      new.actual_published_at := timezone('utc', now());
    end if;
  end if;

  if new.actual_published_at is not null then
    new.published_at := new.actual_published_at;
  elsif new.published_at is not null then
    new.actual_published_at := new.published_at;
  end if;

  if tg_op = 'UPDATE' then
    if new.writer_status is distinct from old.writer_status
      or new.publisher_status is distinct from old.publisher_status
      or new.writer_id is distinct from old.writer_id
      or new.publisher_id is distinct from old.publisher_id then
      new.status_updated_at := timezone('utc', now());
    end if;
  end if;

  if new.writer_id is null then
    begin
      new.writer_status := 'not_started'::public.writer_stage_status;
    exception when others then
      new.writer_status := 'assigned'::public.writer_stage_status;
    end;
  end if;

  writer_status_text := new.writer_status::text;
  publisher_status_text := new.publisher_status::text;

  if writer_status_text <> 'completed'
    and publisher_status_text <> 'not_started' then
    new.publisher_status := 'not_started'::public.publisher_stage_status;
    publisher_status_text := 'not_started';
  end if;

  if new.publisher_id is null then
    new.publisher_status := 'not_started'::public.publisher_stage_status;
    publisher_status_text := 'not_started';
  end if;

  if writer_status_text in ('in_progress', 'writing', 'needs_revision', 'pending_review', 'completed')
    and new.writer_id is null then
    raise exception 'writer_id is required before changing writer status';
  end if;

  if publisher_status_text in ('in_progress', 'publishing', 'pending_review', 'completed')
    and new.publisher_id is null then
    raise exception 'publisher_id is required before changing publisher status';
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

  if exists (
    select 1
    from public.notification_events ne
    where ne.blog_id = p_blog_id
      and ne.event_type = p_event_type
      and ne.created_at >= timezone('utc', now()) - interval '30 seconds'
  ) then
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
      'displayPublishedDate', blog_row.display_published_date,
      'actualPublishedAt', blog_row.actual_published_at,
      'publishedAt', coalesce(blog_row.actual_published_at, blog_row.published_at),
      'targetPublishDate', blog_row.target_publish_date
    )
  );
end
$$;

notify pgrst, 'reload schema';
