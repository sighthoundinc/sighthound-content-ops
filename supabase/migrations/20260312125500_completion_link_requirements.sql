alter table public.blogs
  drop constraint if exists blogs_writer_complete_requires_google_doc_url;

alter table public.blogs
  add constraint blogs_writer_complete_requires_google_doc_url check (
    writer_status <> 'completed'::public.writer_stage_status
    or google_doc_url is not null
  );

alter table public.blogs
  drop constraint if exists blogs_publisher_complete_requires_live_url;

alter table public.blogs
  add constraint blogs_publisher_complete_requires_live_url check (
    publisher_status <> 'completed'::public.publisher_stage_status
    or live_url is not null
  );
