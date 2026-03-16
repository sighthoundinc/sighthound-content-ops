-- Add audit trail fields to blogs table for tracking approvals
alter table public.blogs
add column if not exists writer_submitted_at timestamptz,
add column if not exists writer_reviewed_by uuid references public.profiles(id) on delete set null,
add column if not exists writer_reviewed_at timestamptz,
add column if not exists publisher_submitted_at timestamptz,
add column if not exists publisher_reviewed_by uuid references public.profiles(id) on delete set null,
add column if not exists publisher_reviewed_at timestamptz;

-- Ensure new status values exist in enums (idempotent)
alter type public.writer_stage_status add value if not exists 'pending_review';
alter type public.publisher_stage_status add value if not exists 'pending_review';
alter type public.publisher_stage_status add value if not exists 'publisher_approved';

-- Trigger to populate writer audit trail when moving to pending_review
create or replace function public.audit_writer_submission()
returns trigger
language plpgsql
as $$
begin
  if new.writer_status = 'pending_review'::public.writer_stage_status
    and old.writer_status <> 'pending_review'::public.writer_stage_status then
    new.writer_submitted_at := timezone('utc', now());
  end if;

  if new.writer_status = 'completed'::public.writer_stage_status
    and old.writer_status = 'pending_review'::public.writer_stage_status then
    new.writer_reviewed_by := auth.uid();
    new.writer_reviewed_at := timezone('utc', now());
  end if;

  if new.writer_status = 'needs_revision'::public.writer_stage_status
    and old.writer_status = 'pending_review'::public.writer_stage_status then
    new.writer_reviewed_by := auth.uid();
    new.writer_reviewed_at := timezone('utc', now());
  end if;

  return new;
end;
$$;

-- Trigger to populate publisher audit trail when moving to pending_review
create or replace function public.audit_publisher_submission()
returns trigger
language plpgsql
as $$
begin
  if new.publisher_status = 'pending_review'::public.publisher_stage_status
    and old.publisher_status <> 'pending_review'::public.publisher_stage_status then
    new.publisher_submitted_at := timezone('utc', now());
  end if;

  if new.publisher_status = 'completed'::public.publisher_stage_status
    and old.publisher_status = 'pending_review'::public.publisher_stage_status then
    new.publisher_reviewed_by := auth.uid();
    new.publisher_reviewed_at := timezone('utc', now());
  end if;

  return new;
end;
$$;

-- Drop old audit triggers if they exist and recreate with audit logic
drop trigger if exists audit_writer_submission_trigger on public.blogs;
drop trigger if exists audit_publisher_submission_trigger on public.blogs;

create trigger audit_writer_submission_trigger
before update on public.blogs
for each row
execute function public.audit_writer_submission();

create trigger audit_publisher_submission_trigger
before update on public.blogs
for each row
execute function public.audit_publisher_submission();

-- Update derive_overall_status to handle pending_review states
create or replace function public.derive_overall_status(
  p_writer_status public.writer_stage_status,
  p_publisher_status public.publisher_stage_status
)
returns public.overall_blog_status
language sql
immutable
as $$
  with normalized as (
    select
      p_writer_status::text as writer_status_text,
      p_publisher_status::text as publisher_status_text
  )
  select case
    when publisher_status_text = 'completed' then 'published'::public.overall_blog_status
    when writer_status_text in ('needs_revision', 'pending_review')
      then 'needs_revision'::public.overall_blog_status
    when writer_status_text in ('not_started', 'assigned')
      and publisher_status_text = 'not_started'
      then 'planned'::public.overall_blog_status
    when writer_status_text = 'completed'
      and publisher_status_text = 'not_started'
      then 'ready_to_publish'::public.overall_blog_status
    when publisher_status_text in ('in_progress', 'pending_review', 'publisher_approved')
      then 'publishing'::public.overall_blog_status
    else 'writing'::public.overall_blog_status
  end
  from normalized;
$$;

grant execute on function public.audit_writer_submission() to authenticated;
grant execute on function public.audit_publisher_submission() to authenticated;

notify pgrst, 'reload schema';
