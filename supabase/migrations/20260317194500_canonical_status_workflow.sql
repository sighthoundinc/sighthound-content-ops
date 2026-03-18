-- Align database enums with canonical Writer and Publisher status workflows
-- Writer statuses: not_started -> in_progress -> pending_review -> needs_revision -> completed
-- Publisher statuses: not_started -> in_progress -> pending_review -> publisher_approved -> completed

-- Add missing canonical values to writer status enum
-- Current: not_started, in_progress, needs_revision, completed
-- Target: not_started, in_progress, pending_review, needs_revision, completed
alter type public.writer_stage_status add value if not exists 'pending_review';

-- Add missing canonical values to publisher status enum
-- Current: not_started, in_progress, completed
-- Target: not_started, in_progress, pending_review, publisher_approved, completed
alter type public.publisher_stage_status add value if not exists 'pending_review';
alter type public.publisher_stage_status add value if not exists 'publisher_approved';

-- Ensure overall_blog_status has all canonical values
alter type public.overall_blog_status add value if not exists 'planned';
alter type public.overall_blog_status add value if not exists 'writing';
alter type public.overall_blog_status add value if not exists 'needs_revision';
alter type public.overall_blog_status add value if not exists 'ready_to_publish';
alter type public.overall_blog_status add value if not exists 'published';

-- Create corrected derive function that matches canonical workflow
create or replace function public.derive_overall_status(
  p_writer_status public.writer_stage_status,
  p_publisher_status public.publisher_stage_status
)
returns public.overall_blog_status
language sql
immutable
as $$
  select case
    when p_publisher_status = 'completed'::public.publisher_stage_status
      then 'published'::public.overall_blog_status
    when p_writer_status = 'pending_review'::public.writer_stage_status
      or p_writer_status = 'needs_revision'::public.writer_stage_status
      then 'needs_revision'::public.overall_blog_status
    when p_publisher_status in (
      'in_progress'::public.publisher_stage_status,
      'pending_review'::public.publisher_stage_status,
      'publisher_approved'::public.publisher_stage_status
    )
      then 'writing'::public.overall_blog_status
    when p_writer_status = 'completed'::public.writer_stage_status
      and p_publisher_status = 'not_started'::public.publisher_stage_status
      then 'ready_to_publish'::public.overall_blog_status
    else 'writing'::public.overall_blog_status
  end;
$$;

-- Data migration: Normalize any non-canonical status values in existing data
-- Publisher status mapping: ensure all values are canonical
update public.blogs
set publisher_status = case publisher_status::text
  when 'publishing' then 'in_progress'::public.publisher_stage_status
  when 'pending_review' then 'in_progress'::public.publisher_stage_status
  else publisher_status
end
where publisher_status::text in ('publishing', 'pending_review');

-- Recalculate overall status based on corrected derive function
update public.blogs
set overall_status = public.derive_overall_status(writer_status, publisher_status)
where true;

-- Set canonical defaults
alter table public.blogs
  alter column writer_status set default 'not_started'::public.writer_stage_status,
  alter column publisher_status set default 'not_started'::public.publisher_stage_status,
  alter column overall_status set default 'writing'::public.overall_blog_status;

-- Signal PostgREST to reload schema
notify pgrst, 'reload schema';
