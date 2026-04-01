-- Phase 5: Add INSERT Permission Enforcement for Social Posts & Blog Ideas
-- Based on SPECIFICATION.md, both `create_social_post` and `create_idea` are delegable permissions
-- These should be enforced at the database level (authority layer) to prevent permission bypasses
-- Following the same pattern as blogs: INSERT triggers validate permissions before allowing creation

-- ============================================================================
-- SOCIAL POSTS INSERT ENFORCEMENT
-- ============================================================================

create or replace function public.enforce_social_post_insert_permissions()
returns trigger
language plpgsql
as $$
begin
  if auth.role() = 'service_role' then
    return new;
  end if;

  if not public.has_permission('create_social_post') then
    raise exception 'Permission denied: create_social_post';
  end if;

  if new.created_by is distinct from auth.uid() then
    raise exception 'created_by must match the authenticated user';
  end if;

  return new;
end;
$$;

drop trigger if exists social_posts_enforce_insert_permissions on public.social_posts;
create trigger social_posts_enforce_insert_permissions
before insert on public.social_posts
for each row execute function public.enforce_social_post_insert_permissions();

-- ============================================================================
-- BLOG IDEAS INSERT ENFORCEMENT
-- ============================================================================

create or replace function public.enforce_blog_idea_insert_permissions()
returns trigger
language plpgsql
as $$
begin
  if auth.role() = 'service_role' then
    return new;
  end if;

  if not public.has_permission('create_idea') then
    raise exception 'Permission denied: create_idea';
  end if;

  if new.created_by is distinct from auth.uid() then
    raise exception 'created_by must match the authenticated user';
  end if;

  return new;
end;
$$;

drop trigger if exists blog_ideas_enforce_insert_permissions on public.blog_ideas;
create trigger blog_ideas_enforce_insert_permissions
before insert on public.blog_ideas
for each row execute function public.enforce_blog_idea_insert_permissions();

notify pgrst, 'reload schema';
