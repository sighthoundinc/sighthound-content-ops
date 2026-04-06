-- Auto-capture actual_published_at when blog transitions to published
-- When publisher_status transitions to 'completed', automatically set actual_published_at 
-- to current timestamp if not already set. Admins can still edit it later via 
-- edit_actual_publish_timestamp permission.

create or replace function public.auto_capture_publish_timestamp()
returns trigger
language plpgsql
as $$
begin
  -- Only auto-capture if transitioning to completed AND timestamp is not already set
  if (
    new.publisher_status = 'completed'::public.publisher_stage_status
    and old.publisher_status != 'completed'::public.publisher_stage_status
    and new.actual_published_at is null
  ) then
    new.actual_published_at := now();
  end if;

  return new;
end;
$$;

-- Create trigger on blogs table to run BEFORE enforce_blog_update_permissions
-- This ensures timestamp is captured before permission checks
drop trigger if exists auto_capture_publish_timestamp_trigger on public.blogs;
create trigger auto_capture_publish_timestamp_trigger
before update on public.blogs
for each row
execute function public.auto_capture_publish_timestamp();

notify pgrst, 'reload schema';
