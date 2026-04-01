-- Comprehensive Fix: Align DB transition functions with TypeScript permission model
-- Bug: Multiple transition handlers were missing in can_transition_writer_status() 
-- and can_transition_publisher_status(), blocking valid workflow state changes
-- 
-- TypeScript Model (Source of Truth):
-- Writer: not_started → in_progress ↔ needs_revision → pending_review → completed
-- Publisher: not_started → in_progress → pending_review → publisher_approved → completed
--
-- All transitions must be explicitly handled to match TypeScript + UI expectations

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
    when public.has_permission('repair_workflow_state') then true
    when public.has_permission('override_writer_status') then true
    when public.has_permission('edit_writer_status') then true
    -- Start writing: not_started → in_progress OR needs_revision → in_progress
    when p_next_status = 'in_progress'::public.writer_stage_status
      then (
        (p_current_status = 'not_started'::public.writer_stage_status 
         or p_current_status = 'needs_revision'::public.writer_stage_status)
        and public.has_permission('start_writing')
      )
    -- Submit for review: in_progress → pending_review
    when p_next_status = 'pending_review'::public.writer_stage_status
      then p_current_status = 'in_progress'::public.writer_stage_status
        and public.has_permission('submit_draft')
    -- Request revision: pending_review → needs_revision
    when p_next_status = 'needs_revision'::public.writer_stage_status
      then p_current_status = 'pending_review'::public.writer_stage_status
        and public.has_permission('request_revision')
    -- Mark complete: pending_review → completed
    when p_next_status = 'completed'::public.writer_stage_status
      then p_current_status = 'pending_review'::public.writer_stage_status
        and public.has_permission('submit_draft')
    else false
  end;
$$;

create or replace function public.can_transition_publisher_status(
  p_current_status public.publisher_stage_status,
  p_next_status public.publisher_stage_status
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select case
    when p_current_status = p_next_status then true
    when public.has_permission('repair_workflow_state') then true
    when public.has_permission('override_publisher_status') then true
    when public.has_permission('edit_publisher_status') then true
    -- Start publishing: not_started → in_progress
    when p_next_status = 'in_progress'::public.publisher_stage_status
      then p_current_status = 'not_started'::public.publisher_stage_status
        and public.has_permission('start_publishing')
    -- Submit for review: in_progress → pending_review
    when p_next_status = 'pending_review'::public.publisher_stage_status
      then p_current_status = 'in_progress'::public.publisher_stage_status
        and public.has_permission('submit_draft')
    -- Approve: pending_review → publisher_approved
    when p_next_status = 'publisher_approved'::public.publisher_stage_status
      then p_current_status = 'pending_review'::public.publisher_stage_status
        and public.has_permission('submit_draft')
    -- Mark complete: publisher_approved → completed
    when p_next_status = 'completed'::public.publisher_stage_status
      then p_current_status = 'publisher_approved'::public.publisher_stage_status
        and public.has_permission('complete_publishing')
    else false
  end;
$$;

notify pgrst, 'reload schema';
