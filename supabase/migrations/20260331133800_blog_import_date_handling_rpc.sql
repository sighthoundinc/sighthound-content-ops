-- Create RPC function for blog import to handle dates without client-side parsing
create or replace function public.upsert_blog_import(
  p_id uuid DEFAULT NULL,
  p_site text,
  p_title text,
  p_live_url text,
  p_writer_id uuid,
  p_publisher_id uuid,
  p_writer_status text,
  p_publisher_status text,
  p_google_doc_url text,
  p_target_publish_date text,
  p_scheduled_publish_date text,
  p_display_published_date text,
  p_actual_published_at text,
  p_created_by uuid
)
returns table (id uuid, success boolean)
language plpgsql
security definer
set search_path = public
as $$
declare
  new_id uuid;
begin
  if p_id is not null then
    -- Update existing blog
    update public.blogs
    set
      site = p_site,
      title = p_title,
      live_url = p_live_url,
      writer_id = p_writer_id,
      publisher_id = p_publisher_id,
      google_doc_url = p_google_doc_url,
      target_publish_date = p_target_publish_date::date,
      scheduled_publish_date = p_scheduled_publish_date::date,
      display_published_date = p_display_published_date::date,
      actual_published_at = case when p_actual_published_at is not null then p_actual_published_at::timestamptz else null end,
      published_at = case when p_actual_published_at is not null then p_actual_published_at::timestamptz else null end
    where id = p_id;
    return query select p_id, true;
  else
    -- Insert new blog
    insert into public.blogs (
      site,
      title,
      live_url,
      writer_id,
      publisher_id,
      writer_status,
      publisher_status,
      google_doc_url,
      target_publish_date,
      scheduled_publish_date,
      display_published_date,
      actual_published_at,
      published_at,
      created_by
    )
    values (
      p_site,
      p_title,
      p_live_url,
      p_writer_id,
      p_publisher_id,
      p_writer_status::public.writer_stage_status,
      p_publisher_status::public.publisher_stage_status,
      p_google_doc_url,
      p_target_publish_date::date,
      p_scheduled_publish_date::date,
      p_display_published_date::date,
      case when p_actual_published_at is not null then p_actual_published_at::timestamptz else null end,
      case when p_actual_published_at is not null then p_actual_published_at::timestamptz else null end
    )
    returning blogs.id into new_id;
    return query select new_id, true;
  end if;
end
$$;
