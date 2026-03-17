-- Create blog_idea_comments table for comments and reference links on ideas
create table if not exists public.blog_idea_comments (
  id uuid primary key default gen_random_uuid(),
  idea_id uuid not null references public.blog_ideas (id) on delete cascade,
  comment text not null,
  created_by uuid not null references public.profiles (id) on delete restrict,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint blog_idea_comments_comment_non_empty check (char_length(trim(comment)) > 0)
);

create index if not exists blog_idea_comments_idea_id_idx
  on public.blog_idea_comments (idea_id, created_at desc);

create index if not exists blog_idea_comments_created_by_idx
  on public.blog_idea_comments (created_by);

-- Enable RLS
alter table public.blog_idea_comments enable row level security;

-- Comments readable by authenticated users
drop policy if exists "Comments readable by authenticated users" on public.blog_idea_comments;
create policy "Comments readable by authenticated users"
on public.blog_idea_comments
for select
to authenticated
using (true);

-- Comments insertable by authenticated users
drop policy if exists "Comments insertable by authenticated users" on public.blog_idea_comments;
create policy "Comments insertable by authenticated users"
on public.blog_idea_comments
for insert
to authenticated
with check (created_by = auth.uid());

-- Comments updatable by creator only
drop policy if exists "Comments updatable by creator only" on public.blog_idea_comments;
create policy "Comments updatable by creator only"
on public.blog_idea_comments
for update
to authenticated
using (created_by = auth.uid())
with check (created_by = auth.uid());

-- Comments deletable by creator or admin
drop policy if exists "Comments deletable by creator or admin" on public.blog_idea_comments;
create policy "Comments deletable by creator or admin"
on public.blog_idea_comments
for delete
to authenticated
using (created_by = auth.uid() or public.is_admin());

-- Update blog_ideas RLS policy to allow creators to edit their own ideas
drop policy if exists "Ideas updatable by admin only" on public.blog_ideas;
create policy "Ideas updatable by creator or admin"
on public.blog_ideas
for update
to authenticated
using (created_by = auth.uid() or public.is_admin())
with check (created_by = auth.uid() or public.is_admin());

notify pgrst, 'reload schema';
