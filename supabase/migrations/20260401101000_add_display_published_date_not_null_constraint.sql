-- Sprint 1: Display Published Date NOT NULL Constraint with Fallback
-- Ensures display_published_date is never NULL; defaults to scheduled_publish_date
-- Includes activity logging for explicit user overrides and updates

-- Step 1: Backfill existing NULL display_published_date with scheduled_publish_date or today
UPDATE public.blogs
SET display_published_date = COALESCE(scheduled_publish_date, CURRENT_DATE)
WHERE display_published_date IS NULL;

-- Step 2: Add NOT NULL constraint to prevent future NULLs
ALTER TABLE public.blogs
ADD CONSTRAINT display_published_date_not_null CHECK (display_published_date IS NOT NULL);

-- Step 3: Update handle_blog_before_write trigger to apply fallback on INSERT
-- This ensures display_published_date is never NULL before it reaches the database
CREATE OR REPLACE FUNCTION public.handle_blog_before_write()
RETURNS trigger
LANGUAGE plpgsql
AS $$
begin
  if tg_op = 'INSERT' then
    new.status_updated_at := timezone('utc', now());
    new.created_at := coalesce(new.created_at, timezone('utc', now()));
    -- Ensure display_published_date is never NULL: fallback to scheduled_publish_date or today
    new.display_published_date := coalesce(new.display_published_date, new.scheduled_publish_date, current_date);
  end if;

  if tg_op = 'UPDATE' then
    if new.writer_status is distinct from old.writer_status
      or new.publisher_status is distinct from old.publisher_status then
      new.status_updated_at := timezone('utc', now());
    end if;
    
    -- On UPDATE: prevent NULL display_published_date by falling back to scheduled_publish_date
    if new.display_published_date is null then
      new.display_published_date := coalesce(new.scheduled_publish_date, current_date);
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

  new.overall_status := public.derive_overall_status(new.writer_status, new.publisher_status);
  new.updated_at := timezone('utc', now());
  return new;
end
$$;

-- Step 4: Update audit_blog_changes trigger to log display_published_date changes
-- Logs explicit overrides on INSERT and all changes on UPDATE
CREATE OR REPLACE FUNCTION public.audit_blog_changes()
RETURNS trigger
LANGUAGE plpgsql
AS $$
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

    -- Log if user explicitly set display_published_date different from scheduled_publish_date (not default fallback)
    if new.display_published_date is distinct from new.scheduled_publish_date then
      insert into public.blog_assignment_history (blog_id, changed_by, event_type, field_name, new_value)
      values (new.id, auth.uid(), 'display_date_override', 'display_published_date', new.display_published_date::text);
    end if;

    if new.writer_id is not null then
      perform public.queue_notification_event(new.id, 'writer_assigned', coalesce(auth.uid(), new.created_by));
    end if;
    return new;
  end if;

  -- Log all display_published_date changes on UPDATE
  if new.display_published_date is distinct from old.display_published_date then
    insert into public.blog_assignment_history (blog_id, changed_by, event_type, field_name, old_value, new_value)
    values (new.id, auth.uid(), 'display_date_changed', 'display_published_date', old.display_published_date::text, new.display_published_date::text);
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
    elsif new.writer_status = 'needs_revision' then
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

-- Step 5: Notify schema reload for PostgREST
notify pgrst, 'reload schema';
