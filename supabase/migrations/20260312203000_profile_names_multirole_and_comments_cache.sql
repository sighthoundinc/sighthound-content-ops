do $$
begin
  if not exists (
    select 1
    from pg_enum
    where enumlabel = 'editor'
      and enumtypid = 'public.app_role'::regtype
  ) then
    alter type public.app_role add value 'editor';
  end if;
end
$$;

alter table public.profiles
  add column if not exists first_name text,
  add column if not exists last_name text,
  add column if not exists display_name text,
  add column if not exists user_roles public.app_role[];

update public.profiles
set
  first_name = coalesce(nullif(first_name, ''), split_part(full_name, ' ', 1)),
  last_name = coalesce(
    nullif(last_name, ''),
    nullif(regexp_replace(full_name, '^\S+\s*', ''), '')
  ),
  display_name = coalesce(nullif(display_name, ''), full_name),
  user_roles = case
    when user_roles is null or cardinality(user_roles) = 0 then array[role]::public.app_role[]
    else user_roles
  end;

create or replace function public.has_profile_role(p_role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.is_active = true
      and (
        p.role = p_role
        or coalesce(p.user_roles, array[]::public.app_role[]) @> array[p_role]::public.app_role[]
      )
  );
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_profile_role('admin'::public.app_role);
$$;

create or replace function public.enforce_blog_update_permissions()
returns trigger
language plpgsql
as $$
declare
  is_admin_role boolean;
  is_writer_role boolean;
  is_publisher_role boolean;
begin
  is_admin_role := public.has_profile_role('admin'::public.app_role);
  is_writer_role := public.has_profile_role('writer'::public.app_role);
  is_publisher_role := public.has_profile_role('publisher'::public.app_role);

  if is_admin_role then
    return new;
  end if;

  if is_writer_role and old.writer_id = auth.uid() then
    if new.title is distinct from old.title
      or new.site is distinct from old.site
      or new.slug is distinct from old.slug
      or new.writer_id is distinct from old.writer_id
      or new.publisher_id is distinct from old.publisher_id
      or new.publisher_status is distinct from old.publisher_status
      or new.live_url is distinct from old.live_url
      or new.target_publish_date is distinct from old.target_publish_date
      or new.is_archived is distinct from old.is_archived
      or new.created_by is distinct from old.created_by then
      raise exception 'Writers can only update google_doc_url and writer_status';
    end if;
    return new;
  end if;

  if is_publisher_role and old.publisher_id = auth.uid() then
    if new.title is distinct from old.title
      or new.site is distinct from old.site
      or new.slug is distinct from old.slug
      or new.writer_id is distinct from old.writer_id
      or new.publisher_id is distinct from old.publisher_id
      or new.writer_status is distinct from old.writer_status
      or new.google_doc_url is distinct from old.google_doc_url
      or new.target_publish_date is distinct from old.target_publish_date
      or new.is_archived is distinct from old.is_archived
      or new.created_by is distinct from old.created_by then
      raise exception 'Publishers can only update live_url and publisher_status';
    end if;
    return new;
  end if;

  raise exception 'Unauthorized role for blog update';
end
$$;

create or replace function public.sync_profile_name_and_roles()
returns trigger
language plpgsql
as $$
declare
  normalized_roles public.app_role[];
  derived_display_name text;
begin
  normalized_roles := coalesce(new.user_roles, array[]::public.app_role[]);
  if cardinality(normalized_roles) = 0 then
    normalized_roles := array[coalesce(new.role, 'writer'::public.app_role)];
  elsif not (normalized_roles @> array[new.role]::public.app_role[]) then
    normalized_roles := array_prepend(new.role, normalized_roles);
  end if;
  new.user_roles := normalized_roles;
  new.role := normalized_roles[1];

  if new.first_name is not null then
    new.first_name := nullif(trim(new.first_name), '');
  end if;
  if new.last_name is not null then
    new.last_name := nullif(trim(new.last_name), '');
  end if;
  if new.display_name is not null then
    new.display_name := nullif(trim(new.display_name), '');
  end if;

  derived_display_name := coalesce(
    new.display_name,
    nullif(trim(concat_ws(' ', new.first_name, new.last_name)), ''),
    new.full_name
  );
  new.display_name := derived_display_name;
  new.full_name := derived_display_name;
  return new;
end
$$;

create or replace function public.enforce_profile_update_permissions()
returns trigger
language plpgsql
as $$
begin
  if auth.role() = 'service_role' then
    return new;
  end if;

  if public.is_admin() then
    return new;
  end if;

  if old.id is distinct from auth.uid() then
    raise exception 'Users can only update their own profile';
  end if;

  if new.email is distinct from old.email
    or new.role is distinct from old.role
    or new.user_roles is distinct from old.user_roles
    or new.is_active is distinct from old.is_active then
    raise exception 'Users can only edit first_name, last_name, display_name, and full_name';
  end if;

  return new;
end
$$;

drop trigger if exists profiles_sync_name_roles on public.profiles;
create trigger profiles_sync_name_roles
before insert or update on public.profiles
for each row execute function public.sync_profile_name_and_roles();

drop trigger if exists profiles_enforce_update_permissions on public.profiles;
create trigger profiles_enforce_update_permissions
before update on public.profiles
for each row execute function public.enforce_profile_update_permissions();

drop policy if exists "Profiles updatable by admin" on public.profiles;
create policy "Profiles updatable by admin"
on public.profiles
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Profiles updatable by self" on public.profiles;
create policy "Profiles updatable by self"
on public.profiles
for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

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

notify pgrst, 'reload schema';
