create or replace function public.handle_blog_before_write()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' then
    new.status_updated_at := timezone('utc', now());
    new.created_at := coalesce(new.created_at, timezone('utc', now()));
  end if;

  if new.scheduled_publish_date is null then
    new.scheduled_publish_date := new.target_publish_date;
  end if;

  if tg_op = 'UPDATE' then
    if new.scheduled_publish_date is distinct from old.scheduled_publish_date then
      new.target_publish_date := new.scheduled_publish_date;
    elsif new.target_publish_date is distinct from old.target_publish_date then
      new.scheduled_publish_date := new.target_publish_date;
    else
      new.target_publish_date := new.scheduled_publish_date;
    end if;
  else
    new.target_publish_date := new.scheduled_publish_date;
  end if;

  if new.display_published_date is null then
    new.display_published_date := new.scheduled_publish_date;
  end if;

  if new.actual_published_at is null and new.published_at is not null then
    new.actual_published_at := new.published_at;
  end if;

  if tg_op = 'UPDATE' then
    if new.publisher_status = 'completed'::public.publisher_stage_status
      and old.publisher_status <> 'completed'::public.publisher_stage_status
      and new.actual_published_at is not distinct from old.actual_published_at then
      new.actual_published_at := timezone('utc', now());
    end if;
  elsif tg_op = 'INSERT' then
    if new.publisher_status = 'completed'::public.publisher_stage_status
      and new.actual_published_at is null then
      new.actual_published_at := timezone('utc', now());
    end if;
  end if;

  if new.actual_published_at is not null then
    new.published_at := new.actual_published_at;
  elsif new.published_at is not null then
    new.actual_published_at := new.published_at;
  end if;

  if tg_op = 'UPDATE' then
    if new.writer_status is distinct from old.writer_status
      or new.publisher_status is distinct from old.publisher_status then
      new.status_updated_at := timezone('utc', now());
    end if;
  end if;

  if new.writer_status in ('writing', 'pending_review', 'completed')
    and new.writer_id is null then
    raise exception 'writer_id is required before changing writer status';
  end if;

  if new.publisher_status in ('publishing', 'pending_review', 'completed')
    and new.publisher_id is null then
    raise exception 'publisher_id is required before changing publisher status';
  end if;

  if new.writer_status <> 'completed'
    and new.publisher_status <> 'not_started' then
    raise exception 'Cannot start publishing before writing is complete';
  end if;

  new.overall_status := public.derive_overall_status(new.writer_status, new.publisher_status);
  new.updated_at := timezone('utc', now());
  return new;
end
$$;

create table if not exists public.blog_comments (
  id uuid primary key default gen_random_uuid(),
  blog_id uuid not null references public.blogs (id) on delete cascade,
  created_by uuid not null references public.profiles (id) on delete cascade,
  comment text not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint blog_comments_comment_non_empty check (char_length(trim(comment)) > 0),
  constraint blog_comments_comment_length check (char_length(comment) <= 2000)
);

create index if not exists blog_comments_blog_id_created_at_idx
  on public.blog_comments (blog_id, created_at desc);

drop trigger if exists blog_comments_touch_updated_at on public.blog_comments;
create trigger blog_comments_touch_updated_at
before update on public.blog_comments
for each row execute function public.touch_updated_at();

alter table public.blog_comments enable row level security;

drop policy if exists "Comments readable by authorized blog users" on public.blog_comments;
create policy "Comments readable by authorized blog users"
on public.blog_comments
for select
to authenticated
using (
  exists (
    select 1
    from public.blogs b
    where b.id = blog_comments.blog_id
      and (
        public.is_admin()
        or b.writer_id = auth.uid()
        or b.publisher_id = auth.uid()
      )
  )
);

drop policy if exists "Comments insertable by authorized blog users" on public.blog_comments;
create policy "Comments insertable by authorized blog users"
on public.blog_comments
for insert
to authenticated
with check (
  created_by = auth.uid()
  and exists (
    select 1
    from public.blogs b
    where b.id = blog_comments.blog_id
      and (
        public.is_admin()
        or b.writer_id = auth.uid()
        or b.publisher_id = auth.uid()
      )
  )
);
