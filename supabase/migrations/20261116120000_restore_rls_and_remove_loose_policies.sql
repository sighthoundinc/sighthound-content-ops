-- Restore row-level security on public tables and remove policies that
-- grant more than intended.
--
-- Background: production had RLS disabled on 17 of 21 public tables (see the
-- placeholder migration 20260325184300_disable_all_rls) while `anon` and
-- `authenticated` held full table privileges. Policies existed but were
-- inert. This migration is idempotent and safe to re-run.
--
-- Order matters: loose policies are removed and trigger writes are made
-- RLS-safe BEFORE RLS is switched on, all in one transaction.

begin;

-- 1. Anonymous callers never touch application tables. --------------------
revoke all on all tables in schema public from anon;
alter default privileges in schema public revoke all on tables from anon;

-- 2. Remove policies that grant instead of restrict. ----------------------
-- These were written as delete guards but are PERMISSIVE with no role, so
-- they let any caller delete any unpublished row. The remaining delete
-- policies (creator-or-admin, admin-only) already cover legitimate deletes.
drop policy if exists prevent_delete_published_blogs on public.blogs;
drop policy if exists prevent_delete_published_social_posts on public.social_posts;

-- Superseded by the "... by post owner" policies; left in place they let
-- any signed-in user change links on any post.
drop policy if exists "Social post links insertable by authenticated users" on public.social_post_links;
drop policy if exists "Social post links updatable by authenticated users" on public.social_post_links;
drop policy if exists "Social post links deletable by authenticated users" on public.social_post_links;

-- Open insert (`with check (true)`, any role). Assignment rows are written
-- by the SECURITY DEFINER trigger function and by service-role API routes.
drop policy if exists "system_insert_assignments" on public.task_assignments;
-- References a `profiles.is_admin` column that is not part of the schema;
-- admin deletes are covered by "Task assignments deletable by assigned user".
drop policy if exists "admins_manage_assignments" on public.task_assignments;
-- Role-less duplicates of the `authenticated` policies added in 20260401102000.
drop policy if exists "users_view_own_assignments" on public.task_assignments;
drop policy if exists "users_update_own_assignments" on public.task_assignments;

-- 3. Keep browser-side blog edits working once RLS is on. -----------------
-- `audit_blog_changes` runs as the calling user and inserts into
-- `blog_assignment_history`, which has (correctly) no INSERT policy. Run it
-- with definer rights so history stays trigger-written only. `auth.uid()`
-- still resolves to the calling user inside the function.
alter function public.audit_blog_changes() security definer;
alter function public.audit_blog_changes() set search_path = public, pg_temp;

-- 4. Keep "create blog from idea" working for non-creators. ---------------
-- /blogs/new marks the source idea converted from the browser. The existing
-- update policies only allow the idea's creator or an admin.
drop policy if exists "Blog ideas convertible by blog creators" on public.blog_ideas;
create policy "Blog ideas convertible by blog creators"
on public.blog_ideas
for update
to authenticated
using (
  is_converted = false
  and public.has_permission('create_blog')
)
with check (
  converted_blog_id is not null
  and public.has_permission('create_blog')
);

-- 5. Switch RLS back on. --------------------------------------------------
alter table public.app_settings enable row level security;
alter table public.blog_assignment_history enable row level security;
alter table public.blog_comments enable row level security;
alter table public.blog_idea_comments enable row level security;
alter table public.blog_ideas enable row level security;
alter table public.blog_import_logs enable row level security;
alter table public.blogs enable row level security;
alter table public.notification_events enable row level security;
alter table public.notification_preferences enable row level security;
alter table public.permission_audit_logs enable row level security;
alter table public.profiles enable row level security;
alter table public.role_permissions enable row level security;
alter table public.social_post_activity_history enable row level security;
alter table public.social_post_comments enable row level security;
alter table public.social_post_links enable row level security;
alter table public.social_posts enable row level security;
alter table public.task_assignments enable row level security;
-- Already enabled in production; listed so every environment converges.
alter table public.access_logs enable row level security;
alter table public.user_integrations enable row level security;
alter table public.ai_assistant_events enable row level security;
alter table public.ai_assistant_feedback enable row level security;

commit;

notify pgrst, 'reload schema';
