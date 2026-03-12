alter table public.blogs disable trigger blogs_enforce_role_update;
update public.blogs
set writer_status = 'in_progress'::public.writer_stage_status
where writer_status = 'completed'::public.writer_stage_status
  and google_doc_url is null;

update public.blogs
set publisher_status = 'in_progress'::public.publisher_stage_status
where publisher_status = 'completed'::public.publisher_stage_status
  and live_url is null;

alter table public.blogs enable trigger blogs_enforce_role_update;
