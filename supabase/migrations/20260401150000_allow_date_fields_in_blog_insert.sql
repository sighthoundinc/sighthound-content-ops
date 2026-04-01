-- Phase 4: Allow Date Fields in Blog INSERT Trigger
-- When non-admin users create blogs, they need to set initial dates (scheduled_publish_date, display_published_date)
-- The INSERT trigger should allow these fields without requiring explicit permission checks
-- The logic: during creation, users set the dates directly and become the writer/publisher, so they implicitly own them

create or replace function public.enforce_blog_insert_permissions()
returns trigger
language plpgsql
as $$
begin
  if auth.role() = 'service_role' then
    return new;
  end if;

  if not public.has_permission('create_blog') then
    raise exception 'Permission denied: create_blog';
  end if;

  if new.created_by is distinct from auth.uid() then
    raise exception 'created_by must match the authenticated user';
  end if;

  if new.writer_id is not null and not public.has_permission('change_writer_assignment') then
    raise exception 'Permission denied: change_writer_assignment';
  end if;

  if new.publisher_id is not null and not public.has_permission('change_publisher_assignment') then
    raise exception 'Permission denied: change_publisher_assignment';
  end if;

  if coalesce(new.is_archived, false) and not public.has_permission('archive_blog') then
    raise exception 'Permission denied: archive_blog';
  end if;

  if new.writer_status is distinct from 'not_started'::public.writer_stage_status
    and not public.can_transition_writer_status(
      'not_started'::public.writer_stage_status,
      new.writer_status
    ) then
    raise exception 'Permission denied for requested writer stage';
  end if;

  if new.publisher_status is distinct from 'not_started'::public.publisher_stage_status
    and not public.can_transition_publisher_status(
      'not_started'::public.publisher_stage_status,
      new.publisher_status
    ) then
    raise exception 'Permission denied for requested publishing stage';
  end if;

  -- Date fields are allowed during creation without explicit permission checks
  -- Users creating the blog are allowed to set initial dates (scheduled_publish_date, display_published_date, target_publish_date)
  -- No permission validation needed here; the subsequent UPDATE trigger will enforce ownership rules for later edits

  return new;
end;
$$;

notify pgrst, 'reload schema';
