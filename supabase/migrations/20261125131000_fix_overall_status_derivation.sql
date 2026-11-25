-- overall_status was wrong in two cases:
--   writer pending_review            -> showed needs_revision (now writing)
--   writing done, publisher working  -> showed writing (now ready_to_publish)
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
    when p_writer_status = 'needs_revision'::public.writer_stage_status
      then 'needs_revision'::public.overall_blog_status
    when p_writer_status = 'completed'::public.writer_stage_status
      then 'ready_to_publish'::public.overall_blog_status
    else 'writing'::public.overall_blog_status
  end;
$$;

-- Re-derive existing rows. Triggers are off for the backfill so it does not
-- write history rows or queue "ready to publish" Slack notifications, and
-- does not touch updated_at.
begin;
alter table public.blogs disable trigger user;
update public.blogs
set overall_status = public.derive_overall_status(writer_status, publisher_status)
where overall_status is distinct from public.derive_overall_status(writer_status, publisher_status);
alter table public.blogs enable trigger user;
commit;
