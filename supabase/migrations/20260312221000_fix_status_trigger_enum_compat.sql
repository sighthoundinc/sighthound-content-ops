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
      or new.publisher_status is distinct from old.publisher_status then
      new.status_updated_at := timezone('utc', now());
    end if;
  end if;

  writer_status_text := new.writer_status::text;
  publisher_status_text := new.publisher_status::text;

  if writer_status_text in ('in_progress', 'writing', 'needs_revision', 'pending_review', 'completed')
    and new.writer_id is null then
    raise exception 'writer_id is required before changing writer status';
  end if;

  if publisher_status_text in ('in_progress', 'publishing', 'pending_review', 'completed')
    and new.publisher_id is null then
    raise exception 'publisher_id is required before changing publisher status';
  end if;

  if writer_status_text <> 'completed'
    and publisher_status_text <> 'not_started' then
    raise exception 'Cannot start publishing before writing is complete';
  end if;

  new.overall_status := public.derive_overall_status(new.writer_status, new.publisher_status);
  new.updated_at := timezone('utc', now());
  return new;
end
$$;
