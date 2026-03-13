create table if not exists public.blog_ideas (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  site public.blog_site not null,
  description text,
  created_by uuid not null references public.profiles (id) on delete restrict,
  created_at timestamptz not null default timezone('utc', now()),
  is_converted boolean not null default false,
  converted_blog_id uuid references public.blogs (id) on delete set null,
  constraint blog_ideas_title_non_empty check (char_length(trim(title)) > 0),
  constraint blog_ideas_conversion_consistency check (
    (is_converted = false and converted_blog_id is null)
    or (is_converted = true and converted_blog_id is not null)
  )
);

create index if not exists blog_ideas_created_at_idx
  on public.blog_ideas (created_at desc);

create index if not exists blog_ideas_site_idx
  on public.blog_ideas (site);

create index if not exists blog_ideas_is_converted_idx
  on public.blog_ideas (is_converted, created_at desc);

create unique index if not exists blog_ideas_converted_blog_id_unique
  on public.blog_ideas (converted_blog_id)
  where converted_blog_id is not null;

alter table public.blog_ideas enable row level security;

drop policy if exists "Ideas readable by authenticated users" on public.blog_ideas;
create policy "Ideas readable by authenticated users"
on public.blog_ideas
for select
to authenticated
using (true);

drop policy if exists "Ideas insertable by authenticated users" on public.blog_ideas;
create policy "Ideas insertable by authenticated users"
on public.blog_ideas
for insert
to authenticated
with check (created_by = auth.uid());

drop policy if exists "Ideas updatable by admin only" on public.blog_ideas;
create policy "Ideas updatable by admin only"
on public.blog_ideas
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Ideas deletable by admin only" on public.blog_ideas;
create policy "Ideas deletable by admin only"
on public.blog_ideas
for delete
to authenticated
using (public.is_admin());

notify pgrst, 'reload schema';
