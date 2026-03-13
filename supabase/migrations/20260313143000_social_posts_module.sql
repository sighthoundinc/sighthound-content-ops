do $$
begin
  if not exists (select 1 from pg_type where typname = 'social_post_status') then
    create type public.social_post_status as enum ('idea', 'review', 'published');
  end if;

  if not exists (select 1 from pg_type where typname = 'social_post_product') then
    create type public.social_post_product as enum ('alpr_plus', 'redactor', 'hardware', 'general_company');
  end if;

  if not exists (select 1 from pg_type where typname = 'social_post_type') then
    create type public.social_post_type as enum ('image', 'carousel', 'link', 'video');
  end if;

  if not exists (select 1 from pg_type where typname = 'social_platform') then
    create type public.social_platform as enum ('linkedin', 'facebook', 'instagram');
  end if;
end
$$;

create table if not exists public.social_posts (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  product public.social_post_product not null default 'general_company',
  type public.social_post_type not null default 'image',
  canva_url text,
  canva_page integer,
  caption text,
  platforms public.social_platform[] not null default '{}'::public.social_platform[],
  scheduled_date date,
  status public.social_post_status not null default 'idea',
  created_by uuid not null references public.profiles (id) on delete restrict,
  associated_blog_id uuid references public.blogs (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint social_posts_title_non_empty check (char_length(trim(title)) > 0),
  constraint social_posts_title_length check (char_length(title) <= 200),
  constraint social_posts_canva_url_valid check (canva_url is null or canva_url ~* '^https?://'),
  constraint social_posts_canva_page_valid check (canva_page is null or canva_page >= 1),
  constraint social_posts_platforms_no_null_entries check (array_position(platforms, null) is null)
);

create table if not exists public.social_post_links (
  id uuid primary key default gen_random_uuid(),
  social_post_id uuid not null references public.social_posts (id) on delete cascade,
  platform public.social_platform not null,
  url text not null,
  created_by uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint social_post_links_url_valid check (url ~* '^https?://'),
  constraint social_post_links_url_non_empty check (char_length(trim(url)) > 0),
  constraint social_post_links_unique_per_platform unique (social_post_id, platform)
);

create table if not exists public.social_post_comments (
  id uuid primary key default gen_random_uuid(),
  social_post_id uuid not null references public.social_posts (id) on delete cascade,
  user_id uuid references public.profiles (id) on delete cascade,
  created_by uuid references public.profiles (id) on delete cascade,
  parent_comment_id uuid references public.social_post_comments (id) on delete cascade,
  comment text not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint social_post_comments_comment_non_empty check (char_length(trim(comment)) > 0),
  constraint social_post_comments_comment_length check (char_length(comment) <= 2000)
);

create table if not exists public.social_post_activity_history (
  id uuid primary key default gen_random_uuid(),
  social_post_id uuid not null references public.social_posts (id) on delete cascade,
  changed_by uuid references public.profiles (id) on delete set null,
  event_type text not null,
  field_name text,
  old_value text,
  new_value text,
  metadata jsonb not null default '{}'::jsonb,
  changed_at timestamptz not null default timezone('utc', now())
);

create index if not exists social_posts_status_updated_at_idx
  on public.social_posts (status, updated_at desc);
create index if not exists social_posts_scheduled_date_idx
  on public.social_posts (scheduled_date);
create index if not exists social_posts_associated_blog_id_idx
  on public.social_posts (associated_blog_id);
create index if not exists social_posts_created_by_idx
  on public.social_posts (created_by, created_at desc);

create index if not exists social_post_links_social_post_idx
  on public.social_post_links (social_post_id, platform);

create index if not exists social_post_comments_social_post_created_at_idx
  on public.social_post_comments (social_post_id, created_at asc);
create index if not exists social_post_comments_parent_idx
  on public.social_post_comments (parent_comment_id, created_at asc);
create index if not exists social_post_comments_user_idx
  on public.social_post_comments (user_id, created_at desc);

create index if not exists social_post_activity_history_social_post_idx
  on public.social_post_activity_history (social_post_id, changed_at desc);

create or replace function public.sync_social_post_comment_actor_columns()
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

create or replace function public.log_social_post_activity(
  p_social_post_id uuid,
  p_changed_by uuid,
  p_event_type text,
  p_field_name text,
  p_old_value text,
  p_new_value text,
  p_metadata jsonb default '{}'::jsonb
)
returns void
language plpgsql
as $$
begin
  insert into public.social_post_activity_history (
    social_post_id,
    changed_by,
    event_type,
    field_name,
    old_value,
    new_value,
    metadata
  ) values (
    p_social_post_id,
    p_changed_by,
    p_event_type,
    p_field_name,
    p_old_value,
    p_new_value,
    coalesce(p_metadata, '{}'::jsonb)
  );
end
$$;

create or replace function public.audit_social_post_changes()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' then
    perform public.log_social_post_activity(
      new.id,
      auth.uid(),
      'created',
      'social_post',
      null,
      new.title,
      jsonb_build_object(
        'status', new.status,
        'product', new.product,
        'type', new.type
      )
    );
    return new;
  end if;

  if new.title is distinct from old.title then
    perform public.log_social_post_activity(
      new.id,
      auth.uid(),
      'title_updated',
      'title',
      old.title,
      new.title
    );
  end if;

  if new.status is distinct from old.status then
    perform public.log_social_post_activity(
      new.id,
      auth.uid(),
      'status_changed',
      'status',
      old.status::text,
      new.status::text
    );
  end if;

  if new.caption is distinct from old.caption then
    perform public.log_social_post_activity(
      new.id,
      auth.uid(),
      'caption_edited',
      'caption',
      old.caption,
      new.caption
    );
  end if;

  if new.product is distinct from old.product then
    perform public.log_social_post_activity(
      new.id,
      auth.uid(),
      'field_updated',
      'product',
      old.product::text,
      new.product::text
    );
  end if;

  if new.type is distinct from old.type then
    perform public.log_social_post_activity(
      new.id,
      auth.uid(),
      'field_updated',
      'type',
      old.type::text,
      new.type::text
    );
  end if;

  if new.canva_url is distinct from old.canva_url then
    perform public.log_social_post_activity(
      new.id,
      auth.uid(),
      'field_updated',
      'canva_url',
      old.canva_url,
      new.canva_url
    );
  end if;

  if new.canva_page is distinct from old.canva_page then
    perform public.log_social_post_activity(
      new.id,
      auth.uid(),
      'field_updated',
      'canva_page',
      old.canva_page::text,
      new.canva_page::text
    );
  end if;

  if new.platforms is distinct from old.platforms then
    perform public.log_social_post_activity(
      new.id,
      auth.uid(),
      'field_updated',
      'platforms',
      old.platforms::text,
      new.platforms::text
    );
  end if;

  if new.scheduled_date is distinct from old.scheduled_date then
    perform public.log_social_post_activity(
      new.id,
      auth.uid(),
      'field_updated',
      'scheduled_date',
      old.scheduled_date::text,
      new.scheduled_date::text
    );
  end if;

  if new.associated_blog_id is distinct from old.associated_blog_id then
    perform public.log_social_post_activity(
      new.id,
      auth.uid(),
      case when new.associated_blog_id is null then 'associated_blog_unlinked' else 'associated_blog_linked' end,
      'associated_blog_id',
      old.associated_blog_id::text,
      new.associated_blog_id::text
    );
  end if;

  return new;
end
$$;

create or replace function public.audit_social_post_link_changes()
returns trigger
language plpgsql
as $$
declare
  post_id uuid;
begin
  if tg_op = 'INSERT' then
    post_id := new.social_post_id;
    perform public.log_social_post_activity(
      post_id,
      auth.uid(),
      'links_added',
      new.platform::text,
      null,
      new.url
    );
    return new;
  end if;

  if tg_op = 'UPDATE' then
    post_id := new.social_post_id;
    if new.url is distinct from old.url then
      perform public.log_social_post_activity(
        post_id,
        auth.uid(),
        'links_updated',
        new.platform::text,
        old.url,
        new.url
      );
    end if;
    return new;
  end if;

  post_id := old.social_post_id;
  perform public.log_social_post_activity(
    post_id,
    auth.uid(),
    'links_removed',
    old.platform::text,
    old.url,
    null
  );
  return old;
end
$$;

drop trigger if exists social_posts_touch_updated_at on public.social_posts;
create trigger social_posts_touch_updated_at
before update on public.social_posts
for each row execute function public.touch_updated_at();

drop trigger if exists social_post_links_touch_updated_at on public.social_post_links;
create trigger social_post_links_touch_updated_at
before update on public.social_post_links
for each row execute function public.touch_updated_at();

drop trigger if exists social_post_comments_touch_updated_at on public.social_post_comments;
create trigger social_post_comments_touch_updated_at
before update on public.social_post_comments
for each row execute function public.touch_updated_at();

drop trigger if exists social_post_comments_sync_actor_columns on public.social_post_comments;
create trigger social_post_comments_sync_actor_columns
before insert or update on public.social_post_comments
for each row execute function public.sync_social_post_comment_actor_columns();

drop trigger if exists social_posts_audit_changes on public.social_posts;
create trigger social_posts_audit_changes
after insert or update on public.social_posts
for each row execute function public.audit_social_post_changes();

drop trigger if exists social_post_links_audit_changes on public.social_post_links;
create trigger social_post_links_audit_changes
after insert or update or delete on public.social_post_links
for each row execute function public.audit_social_post_link_changes();

alter table public.social_posts enable row level security;
alter table public.social_post_links enable row level security;
alter table public.social_post_comments enable row level security;
alter table public.social_post_activity_history enable row level security;

drop policy if exists "Social posts readable by authenticated users" on public.social_posts;
create policy "Social posts readable by authenticated users"
on public.social_posts
for select
to authenticated
using (true);

drop policy if exists "Social posts insertable by authenticated users" on public.social_posts;
create policy "Social posts insertable by authenticated users"
on public.social_posts
for insert
to authenticated
with check (created_by = auth.uid());

drop policy if exists "Social posts updatable by authenticated users" on public.social_posts;
create policy "Social posts updatable by authenticated users"
on public.social_posts
for update
to authenticated
using (true)
with check (true);

drop policy if exists "Social posts deletable by owner or admin" on public.social_posts;
create policy "Social posts deletable by owner or admin"
on public.social_posts
for delete
to authenticated
using (created_by = auth.uid() or public.is_admin());

drop policy if exists "Social post links readable by authenticated users" on public.social_post_links;
create policy "Social post links readable by authenticated users"
on public.social_post_links
for select
to authenticated
using (
  exists (
    select 1
    from public.social_posts sp
    where sp.id = social_post_links.social_post_id
  )
);

drop policy if exists "Social post links insertable by authenticated users" on public.social_post_links;
create policy "Social post links insertable by authenticated users"
on public.social_post_links
for insert
to authenticated
with check (
  created_by = auth.uid()
  and exists (
    select 1
    from public.social_posts sp
    where sp.id = social_post_links.social_post_id
  )
);

drop policy if exists "Social post links updatable by authenticated users" on public.social_post_links;
create policy "Social post links updatable by authenticated users"
on public.social_post_links
for update
to authenticated
using (
  exists (
    select 1
    from public.social_posts sp
    where sp.id = social_post_links.social_post_id
  )
)
with check (
  exists (
    select 1
    from public.social_posts sp
    where sp.id = social_post_links.social_post_id
  )
);

drop policy if exists "Social post links deletable by authenticated users" on public.social_post_links;
create policy "Social post links deletable by authenticated users"
on public.social_post_links
for delete
to authenticated
using (
  exists (
    select 1
    from public.social_posts sp
    where sp.id = social_post_links.social_post_id
  )
);

drop policy if exists "Social post comments readable by authenticated users" on public.social_post_comments;
create policy "Social post comments readable by authenticated users"
on public.social_post_comments
for select
to authenticated
using (
  exists (
    select 1
    from public.social_posts sp
    where sp.id = social_post_comments.social_post_id
  )
);

drop policy if exists "Social post comments insertable by authenticated users" on public.social_post_comments;
create policy "Social post comments insertable by authenticated users"
on public.social_post_comments
for insert
to authenticated
with check (
  coalesce(user_id, created_by) = auth.uid()
  and exists (
    select 1
    from public.social_posts sp
    where sp.id = social_post_comments.social_post_id
  )
);

drop policy if exists "Social post comments updatable by comment author" on public.social_post_comments;
create policy "Social post comments updatable by comment author"
on public.social_post_comments
for update
to authenticated
using (
  coalesce(user_id, created_by) = auth.uid()
  and exists (
    select 1
    from public.social_posts sp
    where sp.id = social_post_comments.social_post_id
  )
)
with check (
  coalesce(user_id, created_by) = auth.uid()
  and exists (
    select 1
    from public.social_posts sp
    where sp.id = social_post_comments.social_post_id
  )
);

drop policy if exists "Social post comments deletable by author or admin" on public.social_post_comments;
create policy "Social post comments deletable by author or admin"
on public.social_post_comments
for delete
to authenticated
using (
  (
    coalesce(user_id, created_by) = auth.uid()
    or public.is_admin()
  )
  and exists (
    select 1
    from public.social_posts sp
    where sp.id = social_post_comments.social_post_id
  )
);

drop policy if exists "Social post activity readable by authenticated users" on public.social_post_activity_history;
create policy "Social post activity readable by authenticated users"
on public.social_post_activity_history
for select
to authenticated
using (
  exists (
    select 1
    from public.social_posts sp
    where sp.id = social_post_activity_history.social_post_id
  )
);

drop policy if exists "Social post activity insertable by authenticated users" on public.social_post_activity_history;
create policy "Social post activity insertable by authenticated users"
on public.social_post_activity_history
for insert
to authenticated
with check (
  exists (
    select 1
    from public.social_posts sp
    where sp.id = social_post_activity_history.social_post_id
  )
);

create or replace function public.search_blog_lookup(
  p_query text,
  p_limit integer default 8
)
returns table (
  id uuid,
  title text,
  slug text,
  site public.blog_site
)
language sql
stable
security definer
set search_path = public
as $$
  with normalized as (
    select
      lower(trim(coalesce(p_query, ''))) as query,
      greatest(1, least(coalesce(p_limit, 8), 20)) as row_limit
  )
  select
    b.id,
    b.title,
    b.slug,
    b.site
  from public.blogs b
  cross join normalized n
  where b.is_archived = false
    and (
      n.query = ''
      or lower(b.title) like '%' || n.query || '%'
      or lower(coalesce(b.slug, '')) like '%' || n.query || '%'
    )
  order by
    case
      when lower(b.title) = n.query then 0
      when lower(coalesce(b.slug, '')) = n.query then 1
      when lower(b.title) like n.query || '%' then 2
      when lower(coalesce(b.slug, '')) like n.query || '%' then 3
      else 4
    end,
    b.updated_at desc
  limit (select row_limit from normalized);
$$;

grant execute on function public.search_blog_lookup(text, integer) to authenticated;

notify pgrst, 'reload schema';
