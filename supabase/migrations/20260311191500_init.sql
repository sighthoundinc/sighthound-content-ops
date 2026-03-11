create extension if not exists "pgcrypto";

do $$
begin
  if not exists (select 1 from pg_type where typname = 'app_role') then
    create type public.app_role as enum ('admin', 'writer', 'publisher');
  end if;

  if not exists (select 1 from pg_type where typname = 'blog_site') then
    create type public.blog_site as enum ('sighthound.com', 'redactor.com');
  end if;

  if not exists (select 1 from pg_type where typname = 'writer_stage_status') then
    create type public.writer_stage_status as enum ('not_started', 'in_progress', 'needs_revision', 'completed');
  end if;

  if not exists (select 1 from pg_type where typname = 'publisher_stage_status') then
    create type public.publisher_stage_status as enum ('not_started', 'in_progress', 'completed');
  end if;

  if not exists (select 1 from pg_type where typname = 'overall_blog_status') then
    create type public.overall_blog_status as enum ('planned', 'writing', 'needs_revision', 'ready_to_publish', 'published');
  end if;

  if not exists (select 1 from pg_type where typname = 'blog_event_type') then
    create type public.blog_event_type as enum (
      'created',
      'assignment_changed',
      'writer_completed',
      'ready_to_publish',
      'published',
      'needs_revision',
      'link_updated',
      'status_updated'
    );
  end if;
end
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null unique,
  full_name text not null,
  role public.app_role not null default 'writer',
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.blogs (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text unique,
  site public.blog_site not null,
  writer_id uuid references public.profiles (id) on delete set null,
  publisher_id uuid references public.profiles (id) on delete set null,
  writer_status public.writer_stage_status not null default 'not_started',
  publisher_status public.publisher_stage_status not null default 'not_started',
  overall_status public.overall_blog_status not null default 'planned',
  google_doc_url text,
  live_url text,
  target_publish_date date,
  status_updated_at timestamptz not null default timezone('utc', now()),
  is_archived boolean not null default false,
  created_by uuid not null references public.profiles (id) on delete restrict,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint blogs_google_doc_url_valid check (google_doc_url is null or google_doc_url ~* '^https?://'),
  constraint blogs_live_url_valid check (live_url is null or live_url ~* '^https?://'),
  constraint blogs_publisher_complete_requires_writer_complete check (
    publisher_status <> 'completed' or writer_status = 'completed'
  )
);

create table if not exists public.blog_assignment_history (
  id uuid primary key default gen_random_uuid(),
  blog_id uuid not null references public.blogs (id) on delete cascade,
  changed_by uuid references public.profiles (id) on delete set null,
  event_type public.blog_event_type not null,
  field_name text,
  old_value text,
  new_value text,
  metadata jsonb not null default '{}'::jsonb,
  changed_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.notification_events (
  id uuid primary key default gen_random_uuid(),
  blog_id uuid not null references public.blogs (id) on delete cascade,
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'queued',
  created_at timestamptz not null default timezone('utc', now()),
  delivered_at timestamptz,
  last_error text
);

create table if not exists public.app_settings (
  id integer primary key default 1,
  timezone text not null default 'America/Chicago',
  week_start smallint not null default 1,
  stale_draft_days integer not null default 10,
  updated_by uuid references public.profiles (id) on delete set null,
  updated_at timestamptz not null default timezone('utc', now()),
  constraint app_settings_singleton check (id = 1),
  constraint app_settings_week_start_valid check (week_start between 0 and 6),
  constraint app_settings_stale_draft_days_valid check (stale_draft_days between 1 and 120)
);

create index if not exists blogs_target_publish_date_idx on public.blogs (target_publish_date);
create index if not exists blogs_writer_id_idx on public.blogs (writer_id);
create index if not exists blogs_publisher_id_idx on public.blogs (publisher_id);
create index if not exists blogs_overall_status_idx on public.blogs (overall_status);
create index if not exists blogs_is_archived_idx on public.blogs (is_archived);
create index if not exists blogs_status_updated_at_idx on public.blogs (status_updated_at);
create index if not exists blogs_site_idx on public.blogs (site);
create index if not exists blog_assignment_history_blog_id_idx on public.blog_assignment_history (blog_id, changed_at desc);
create index if not exists notification_events_status_idx on public.notification_events (status, created_at desc);

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := timezone('utc', now());
  return new;
end
$$;

create or replace function public.get_current_role()
returns public.app_role
language sql
stable
security definer
set search_path = public
as $$
  select p.role
  from public.profiles p
  where p.id = auth.uid()
    and p.is_active = true
  limit 1;
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.get_current_role() = 'admin'::public.app_role, false);
$$;

create or replace function public.derive_overall_status(
  p_writer_status public.writer_stage_status,
  p_publisher_status public.publisher_stage_status
)
returns public.overall_blog_status
language sql
immutable
as $$
  select case
    when p_publisher_status = 'completed' then 'published'::public.overall_blog_status
    when p_writer_status = 'needs_revision' then 'needs_revision'::public.overall_blog_status
    when p_writer_status = 'completed' then 'ready_to_publish'::public.overall_blog_status
    when p_writer_status = 'in_progress' or p_publisher_status = 'in_progress' then 'writing'::public.overall_blog_status
    else 'planned'::public.overall_blog_status
  end;
$$;

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  requested_role public.app_role;
begin
  if new.raw_user_meta_data ? 'role' then
    begin
      requested_role := (new.raw_user_meta_data ->> 'role')::public.app_role;
    exception
      when others then requested_role := 'writer'::public.app_role;
    end;
  else
    requested_role := 'writer'::public.app_role;
  end if;

  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(nullif(new.raw_user_meta_data ->> 'full_name', ''), split_part(coalesce(new.email, ''), '@', 1)),
    requested_role
  )
  on conflict (id) do update
  set email = excluded.email,
      full_name = excluded.full_name,
      role = excluded.role,
      updated_at = timezone('utc', now());

  return new;
end
$$;

create or replace function public.enforce_blog_update_permissions()
returns trigger
language plpgsql
as $$
declare
  caller_role public.app_role;
begin
  caller_role := public.get_current_role();

  if caller_role is null then
    raise exception 'No active profile found for current user';
  end if;

  if caller_role = 'admin'::public.app_role then
    return new;
  end if;

  if caller_role = 'writer'::public.app_role then
    if old.writer_id is distinct from auth.uid() then
      raise exception 'Writers can only update blogs assigned to themselves';
    end if;

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

  if caller_role = 'publisher'::public.app_role then
    if old.publisher_id is distinct from auth.uid() then
      raise exception 'Publishers can only update blogs assigned to themselves';
    end if;

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

create or replace function public.handle_blog_before_write()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' then
    new.status_updated_at := timezone('utc', now());
    new.created_at := coalesce(new.created_at, timezone('utc', now()));
  end if;

  if tg_op = 'UPDATE' then
    if new.writer_status is distinct from old.writer_status
      or new.publisher_status is distinct from old.publisher_status then
      new.status_updated_at := timezone('utc', now());
    end if;
  end if;

  if new.writer_status in ('in_progress', 'needs_revision', 'completed')
    and new.writer_id is null then
    raise exception 'writer_id is required before changing writer status';
  end if;

  if new.publisher_status in ('in_progress', 'completed')
    and new.publisher_id is null then
    raise exception 'publisher_id is required before changing publisher status';
  end if;

  if new.publisher_status = 'completed'
    and new.writer_status <> 'completed' then
    raise exception 'Cannot complete publishing before writing is complete';
  end if;

  new.overall_status := public.derive_overall_status(new.writer_status, new.publisher_status);
  new.updated_at := timezone('utc', now());
  return new;
end
$$;

create or replace function public.queue_notification_event(
  p_blog_id uuid,
  p_event_type text,
  p_actor uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  blog_row public.blogs%rowtype;
  actor_name text;
  writer_email text;
  publisher_email text;
begin
  select * into blog_row from public.blogs where id = p_blog_id;
  if not found then
    return;
  end if;

  select full_name into actor_name from public.profiles where id = p_actor;
  select email into writer_email from public.profiles where id = blog_row.writer_id;
  select email into publisher_email from public.profiles where id = blog_row.publisher_id;

  insert into public.notification_events (blog_id, event_type, payload)
  values (
    blog_row.id,
    p_event_type,
    jsonb_build_object(
      'blogId', blog_row.id,
      'title', blog_row.title,
      'site', blog_row.site,
      'actorId', p_actor,
      'actorName', coalesce(actor_name, 'System'),
      'writerEmail', writer_email,
      'publisherEmail', publisher_email,
      'overallStatus', blog_row.overall_status,
      'targetPublishDate', blog_row.target_publish_date
    )
  );
end
$$;

create or replace function public.audit_blog_changes()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.blog_assignment_history (
      blog_id,
      changed_by,
      event_type,
      field_name,
      new_value,
      metadata
    ) values (
      new.id,
      auth.uid(),
      'created',
      'blog',
      new.title,
      jsonb_build_object('overall_status', new.overall_status, 'site', new.site)
    );

    if new.writer_id is not null then
      perform public.queue_notification_event(new.id, 'writer_assigned', coalesce(auth.uid(), new.created_by));
    end if;
    return new;
  end if;

  if new.writer_id is distinct from old.writer_id then
    insert into public.blog_assignment_history (blog_id, changed_by, event_type, field_name, old_value, new_value)
    values (new.id, auth.uid(), 'assignment_changed', 'writer_id', old.writer_id::text, new.writer_id::text);

    if new.writer_id is not null then
      perform public.queue_notification_event(new.id, 'writer_assigned', auth.uid());
    end if;
  end if;

  if new.publisher_id is distinct from old.publisher_id then
    insert into public.blog_assignment_history (blog_id, changed_by, event_type, field_name, old_value, new_value)
    values (new.id, auth.uid(), 'assignment_changed', 'publisher_id', old.publisher_id::text, new.publisher_id::text);
  end if;

  if new.writer_status is distinct from old.writer_status then
    insert into public.blog_assignment_history (blog_id, changed_by, event_type, field_name, old_value, new_value)
    values (new.id, auth.uid(), 'status_updated', 'writer_status', old.writer_status::text, new.writer_status::text);

    if new.writer_status = 'completed' then
      insert into public.blog_assignment_history (blog_id, changed_by, event_type, field_name, old_value, new_value)
      values (new.id, auth.uid(), 'writer_completed', 'writer_status', old.writer_status::text, new.writer_status::text);
      perform public.queue_notification_event(new.id, 'writer_completed', auth.uid());
    elsif new.writer_status = 'needs_revision' then
      insert into public.blog_assignment_history (blog_id, changed_by, event_type, field_name, old_value, new_value)
      values (new.id, auth.uid(), 'needs_revision', 'writer_status', old.writer_status::text, new.writer_status::text);
    end if;
  end if;

  if new.publisher_status is distinct from old.publisher_status then
    insert into public.blog_assignment_history (blog_id, changed_by, event_type, field_name, old_value, new_value)
    values (new.id, auth.uid(), 'status_updated', 'publisher_status', old.publisher_status::text, new.publisher_status::text);

    if new.publisher_status = 'completed' then
      insert into public.blog_assignment_history (blog_id, changed_by, event_type, field_name, old_value, new_value)
      values (new.id, auth.uid(), 'published', 'publisher_status', old.publisher_status::text, new.publisher_status::text);
      perform public.queue_notification_event(new.id, 'published', auth.uid());
    end if;
  end if;

  if new.overall_status is distinct from old.overall_status
    and new.overall_status = 'ready_to_publish' then
    insert into public.blog_assignment_history (blog_id, changed_by, event_type, field_name, old_value, new_value)
    values (new.id, auth.uid(), 'ready_to_publish', 'overall_status', old.overall_status::text, new.overall_status::text);
    perform public.queue_notification_event(new.id, 'ready_to_publish', auth.uid());
  end if;

  if new.google_doc_url is distinct from old.google_doc_url then
    insert into public.blog_assignment_history (blog_id, changed_by, event_type, field_name, old_value, new_value)
    values (new.id, auth.uid(), 'link_updated', 'google_doc_url', old.google_doc_url, new.google_doc_url);
  end if;

  if new.live_url is distinct from old.live_url then
    insert into public.blog_assignment_history (blog_id, changed_by, event_type, field_name, old_value, new_value)
    values (new.id, auth.uid(), 'link_updated', 'live_url', old.live_url, new.live_url);
  end if;

  return new;
end
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_auth_user();

drop trigger if exists profiles_touch_updated_at on public.profiles;
create trigger profiles_touch_updated_at
before update on public.profiles
for each row execute function public.touch_updated_at();

drop trigger if exists app_settings_touch_updated_at on public.app_settings;
create trigger app_settings_touch_updated_at
before update on public.app_settings
for each row execute function public.touch_updated_at();

drop trigger if exists blogs_enforce_role_update on public.blogs;
create trigger blogs_enforce_role_update
before update on public.blogs
for each row execute function public.enforce_blog_update_permissions();

drop trigger if exists blogs_handle_before_write on public.blogs;
create trigger blogs_handle_before_write
before insert or update on public.blogs
for each row execute function public.handle_blog_before_write();

drop trigger if exists blogs_audit_changes on public.blogs;
create trigger blogs_audit_changes
after insert or update on public.blogs
for each row execute function public.audit_blog_changes();

insert into public.app_settings (id, timezone, week_start, stale_draft_days)
values (1, 'America/Chicago', 1, 10)
on conflict (id) do nothing;

alter table public.profiles enable row level security;
alter table public.blogs enable row level security;
alter table public.blog_assignment_history enable row level security;
alter table public.notification_events enable row level security;
alter table public.app_settings enable row level security;

drop policy if exists "Profiles readable by self or admin" on public.profiles;
create policy "Profiles readable by self or admin"
on public.profiles
for select
to authenticated
using (id = auth.uid() or public.is_admin());

drop policy if exists "Profiles updatable by admin" on public.profiles;
create policy "Profiles updatable by admin"
on public.profiles
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Profiles insertable by admin" on public.profiles;
create policy "Profiles insertable by admin"
on public.profiles
for insert
to authenticated
with check (public.is_admin());

drop policy if exists "Blogs readable by assigned users and admin" on public.blogs;
create policy "Blogs readable by assigned users and admin"
on public.blogs
for select
to authenticated
using (
  public.is_admin()
  or writer_id = auth.uid()
  or publisher_id = auth.uid()
);

drop policy if exists "Blogs insertable by admin only" on public.blogs;
create policy "Blogs insertable by admin only"
on public.blogs
for insert
to authenticated
with check (public.is_admin() and created_by = auth.uid());

drop policy if exists "Blogs updatable by assigned roles and admin" on public.blogs;
create policy "Blogs updatable by assigned roles and admin"
on public.blogs
for update
to authenticated
using (
  public.is_admin()
  or writer_id = auth.uid()
  or publisher_id = auth.uid()
)
with check (
  public.is_admin()
  or writer_id = auth.uid()
  or publisher_id = auth.uid()
);

drop policy if exists "Blogs deletable by admin only" on public.blogs;
create policy "Blogs deletable by admin only"
on public.blogs
for delete
to authenticated
using (public.is_admin());

drop policy if exists "History readable by authorized blog users" on public.blog_assignment_history;
create policy "History readable by authorized blog users"
on public.blog_assignment_history
for select
to authenticated
using (
  exists (
    select 1
    from public.blogs b
    where b.id = blog_assignment_history.blog_id
      and (
        public.is_admin()
        or b.writer_id = auth.uid()
        or b.publisher_id = auth.uid()
      )
  )
);

drop policy if exists "Settings readable by authenticated users" on public.app_settings;
create policy "Settings readable by authenticated users"
on public.app_settings
for select
to authenticated
using (true);

drop policy if exists "Settings writable by admin" on public.app_settings;
create policy "Settings writable by admin"
on public.app_settings
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Notification events readable by admin" on public.notification_events;
create policy "Notification events readable by admin"
on public.notification_events
for select
to authenticated
using (public.is_admin());

grant execute on function public.get_current_role() to authenticated;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.derive_overall_status(public.writer_stage_status, public.publisher_stage_status) to authenticated;
grant execute on function public.queue_notification_event(uuid, text, uuid) to authenticated;
