-- Performance indexes for ownership/status-heavy dashboard and task queue queries
-- Keeps summary/snapshot/tasks query latency stable as row counts grow.
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'social_posts'
      and column_name = 'assigned_to_user_id'
  ) then
    execute '
      create index if not exists social_posts_status_owner_assignment_idx
        on public.social_posts (
          status,
          assigned_to_user_id,
          worker_user_id,
          reviewer_user_id,
          created_by
        )';
  else
    execute '
      create index if not exists social_posts_status_owner_legacy_idx
        on public.social_posts (
          status,
          worker_user_id,
          reviewer_user_id,
          created_by
        )';
  end if;
end
$$;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'blogs'
      and column_name = 'scheduled_publish_date'
  ) then
    execute '
      create index if not exists blogs_task_queue_filter_idx
        on public.blogs (
          is_archived,
          overall_status,
          writer_id,
          publisher_id,
          scheduled_publish_date
        )';
  else
    execute '
      create index if not exists blogs_task_queue_filter_legacy_idx
        on public.blogs (
          is_archived,
          overall_status,
          writer_id,
          publisher_id,
          target_publish_date
        )';
  end if;
end
$$;

create index if not exists task_assignments_owner_status_blog_type_idx
  on public.task_assignments (
    assigned_to_user_id,
    status,
    blog_id,
    task_type
  );
