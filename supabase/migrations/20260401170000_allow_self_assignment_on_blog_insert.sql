-- Phase 6: Allow Self-Assignment on Blog INSERT
-- Non-admin users should be able to assign themselves as the writer without change_writer_assignment permission
-- Only require change_writer_assignment permission when assigning to OTHER users
-- This follows the "remove blockers" principle: users can self-serve, but assigning others needs permission

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

  -- Allow self-assignment of writer without permission; require permission for assigning others
  if new.writer_id is not null 
    and new.writer_id is distinct from auth.uid()
    and not public.has_permission('change_writer_assignment') then
    raise exception 'Permission denied: change_writer_assignment';
  end if;

  -- Allow self-assignment of publisher without permission; require permission for assigning others
  if new.publisher_id is not null 
    and new.publisher_id is distinct from auth.uid()
    and not public.has_permission('change_publisher_assignment') then
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

  return new;
end;
$$;

notify pgrst, 'reload schema';
