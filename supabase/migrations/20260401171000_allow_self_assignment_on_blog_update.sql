-- Phase 6b: Allow Self-Assignment Changes on Blog UPDATE
-- Consistency with INSERT trigger: allow self-assignment without permission, require permission for assigning to others
-- This enables non-admin users to change their own assignment without admin override

create or replace function public.enforce_blog_update_permissions()
returns trigger
language plpgsql
as $$
begin
  if auth.role() = 'service_role' then
    return new;
  end if;

  if public.has_permission('repair_workflow_state') then
    return new;
  end if;

  if new.created_by is distinct from old.created_by
    or new.slug is distinct from old.slug
    or new.legacy_import_hash is distinct from old.legacy_import_hash then
    raise exception 'Permission denied for system-managed fields';
  end if;

  if (
    new.actual_published_at is distinct from old.actual_published_at
    or new.published_at is distinct from old.published_at
  ) and not (
    public.has_permission('edit_actual_publish_timestamp')
    or public.has_permission('force_publish')
  ) then
    raise exception 'Permission denied: edit_actual_publish_timestamp';
  end if;

  if new.title is distinct from old.title
    and not (
      public.has_permission('edit_blog_title')
      or public.has_permission('edit_blog_metadata')
    ) then
    raise exception 'Permission denied: edit_blog_title';
  end if;

  if new.site is distinct from old.site
    and not public.has_permission('edit_blog_metadata') then
    raise exception 'Permission denied: edit_blog_metadata';
  end if;

  -- Allow self-assignment of writer without permission; require permission for assigning to others
  if new.writer_id is distinct from old.writer_id
    and (new.writer_id is null or new.writer_id is distinct from auth.uid())
    and not public.has_permission('change_writer_assignment') then
    raise exception 'Permission denied: change_writer_assignment';
  end if;

  -- Allow self-assignment of publisher without permission; require permission for assigning to others
  if new.publisher_id is distinct from old.publisher_id
    and (new.publisher_id is null or new.publisher_id is distinct from auth.uid())
    and not public.has_permission('change_publisher_assignment') then
    raise exception 'Permission denied: change_publisher_assignment';
  end if;

  if old.is_archived = false and new.is_archived = true
    and not public.has_permission('archive_blog') then
    raise exception 'Permission denied: archive_blog';
  end if;

  if old.is_archived = true and new.is_archived = false
    and not public.has_permission('restore_archived_blog') then
    raise exception 'Permission denied: restore_archived_blog';
  end if;

  -- Date editing is workflow-critical and tied to assigned role ownership
  -- Writers and publishers can edit dates on their assigned blogs without separate permission
  if (
    new.scheduled_publish_date is distinct from old.scheduled_publish_date
    or new.target_publish_date is distinct from old.target_publish_date
  ) then
    if old.overall_status = 'published'::public.overall_blog_status then
      raise exception 'Cannot drag-reschedule a published blog';
    end if;
    -- Allow date editing for assigned workflow owners (writer_id or publisher_id)
    -- Also allow if user has explicit edit_scheduled_publish_date permission (backward compatible)
    if not (
      new.writer_id = auth.uid()
      or new.publisher_id = auth.uid()
      or public.has_permission('edit_scheduled_publish_date')
    ) then
      raise exception 'Permission denied: edit_scheduled_publish_date';
    end if;
  end if;

  if new.display_published_date is distinct from old.display_published_date then
    -- Allow date editing for assigned workflow owners (writer_id or publisher_id)
    -- Also allow if user has explicit edit_display_publish_date permission (backward compatible)
    if not (
      new.writer_id = auth.uid()
      or new.publisher_id = auth.uid()
      or public.has_permission('edit_display_publish_date')
    ) then
      raise exception 'Permission denied: edit_display_publish_date';
    end if;
  end if;

  if new.writer_status is distinct from old.writer_status
    and not public.can_transition_writer_status(old.writer_status, new.writer_status) then
    raise exception 'Permission denied for requested writer stage';
  end if;

  if new.publisher_status is distinct from old.publisher_status
    and not public.can_transition_publisher_status(old.publisher_status, new.publisher_status) then
    raise exception 'Permission denied for requested publishing stage';
  end if;

  -- URL fields are workflow-critical metadata controlled by ownership (RLS + writer_id/publisher_id checks)
  -- Removed explicit permission checks to prevent workflow blockage
  -- Ownership rules (enforced via RLS and assigned role checks) are sufficient access control

  return new;
end;
$$;

notify pgrst, 'reload schema';
