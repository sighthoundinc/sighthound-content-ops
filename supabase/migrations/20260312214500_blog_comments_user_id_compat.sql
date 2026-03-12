create table if not exists public.blog_comments (
  id uuid primary key default gen_random_uuid(),
  blog_id uuid not null references public.blogs (id) on delete cascade,
  user_id uuid references public.profiles (id) on delete cascade,
  created_by uuid references public.profiles (id) on delete cascade,
  comment text not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint blog_comments_comment_non_empty check (char_length(trim(comment)) > 0),
  constraint blog_comments_comment_length check (char_length(comment) <= 2000)
);

alter table public.blog_comments
  add column if not exists user_id uuid references public.profiles (id) on delete cascade;

alter table public.blog_comments
  add column if not exists created_by uuid references public.profiles (id) on delete cascade;

update public.blog_comments
set user_id = created_by
where user_id is null
  and created_by is not null;

update public.blog_comments
set created_by = user_id
where created_by is null
  and user_id is not null;

do $$
begin
  if exists (
    select 1
    from public.blog_comments
    where user_id is null
  ) then
    raise exception 'blog_comments.user_id cannot be null';
  end if;
end
$$;

alter table public.blog_comments
  alter column user_id set not null;

create index if not exists blog_comments_user_id_created_at_idx
  on public.blog_comments (user_id, created_at desc);

create or replace function public.sync_blog_comment_actor_columns()
returns trigger
language plpgsql
as $$
begin
  new.user_id := coalesce(new.user_id, new.created_by);
  new.created_by := coalesce(new.created_by, new.user_id);
  if new.user_id is null then
    raise exception 'user_id is required';
  end if;
  return new;
end
$$;

drop trigger if exists blog_comments_sync_actor_columns on public.blog_comments;
create trigger blog_comments_sync_actor_columns
before insert or update on public.blog_comments
for each row execute function public.sync_blog_comment_actor_columns();

drop policy if exists "Comments insertable by authorized blog users" on public.blog_comments;
create policy "Comments insertable by authorized blog users"
on public.blog_comments
for insert
to authenticated
with check (
  coalesce(user_id, created_by) = auth.uid()
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

notify pgrst, 'reload schema';
