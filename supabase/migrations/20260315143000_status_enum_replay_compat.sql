alter type public.writer_stage_status add value if not exists 'not_started';
alter type public.writer_stage_status add value if not exists 'in_progress';
alter type public.writer_stage_status add value if not exists 'needs_revision';
alter type public.writer_stage_status add value if not exists 'assigned';
alter type public.writer_stage_status add value if not exists 'writing';
alter type public.writer_stage_status add value if not exists 'pending_review';

alter type public.publisher_stage_status add value if not exists 'in_progress';
alter type public.publisher_stage_status add value if not exists 'publishing';
alter type public.publisher_stage_status add value if not exists 'pending_review';

alter type public.overall_blog_status add value if not exists 'planned';
alter type public.overall_blog_status add value if not exists 'needs_revision';
alter type public.overall_blog_status add value if not exists 'writing_review';
alter type public.overall_blog_status add value if not exists 'publishing';
alter type public.overall_blog_status add value if not exists 'publishing_review';

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
    else 'writing'::public.overall_blog_status
  end
  from normalized;
$$;

update public.blogs
set writer_status = case writer_status::text
  when 'assigned' then 'not_started'::public.writer_stage_status
  when 'writing' then 'in_progress'::public.writer_stage_status
  when 'pending_review' then 'needs_revision'::public.writer_stage_status
  else writer_status
end
where writer_status::text in ('assigned', 'writing', 'pending_review');

update public.blogs
set publisher_status = case publisher_status::text
  when 'publishing' then 'in_progress'::public.publisher_stage_status
  when 'pending_review' then 'in_progress'::public.publisher_stage_status
  else publisher_status
end
where publisher_status::text in ('publishing', 'pending_review');

update public.blogs
set overall_status = public.derive_overall_status(writer_status, publisher_status)
where overall_status is distinct from public.derive_overall_status(
  writer_status,
  publisher_status
);

alter table public.blogs
  alter column writer_status set default 'not_started'::public.writer_stage_status,
  alter column publisher_status set default 'not_started'::public.publisher_stage_status,
  alter column overall_status set default 'planned'::public.overall_blog_status;

notify pgrst, 'reload schema';
