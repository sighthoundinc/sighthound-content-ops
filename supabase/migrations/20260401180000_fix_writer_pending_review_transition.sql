-- Fix: Add pending_review transition support to can_transition_writer_status()
-- Bug: Writer couldn't transition from in_progress to pending_review because the
-- database function didn't handle this valid status transition
-- This aligns the database function with the TypeScript permissions model

create or replace function public.can_transition_writer_status(
  p_current_status public.writer_stage_status,
  p_next_status public.writer_stage_status
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select case
    when p_current_status = p_next_status then true
    when public.has_permission('override_workflow') then true
    when public.has_permission('edit_writing_stage') then true
    when p_next_status = 'in_progress'::public.writer_stage_status
      then public.has_permission('start_writing')
    when p_next_status = 'pending_review'::public.writer_stage_status
      then p_current_status = 'in_progress'::public.writer_stage_status
        and public.has_permission('submit_draft')
    when p_next_status = 'completed'::public.writer_stage_status
      then public.has_permission('submit_writing')
    when p_next_status = 'needs_revision'::public.writer_stage_status
      then public.has_permission('request_revision')
    else false
  end;
$$;

notify pgrst, 'reload schema';
