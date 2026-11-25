-- Blog stage rules, agreed 2026-11-25:
--   * only the assigned writer moves the writing stage, and only the assigned
--     publisher moves the publishing stage;
--   * approving or sending work back needs the review permission
--     (request_revision) and is never done by the person whose work it is;
--   * publishers get their own submit_publishing permission, so they no longer
--     need a writer permission to send publishing for review.
-- Mirrors canTransitionWriterStatus()/canTransitionPublisherStatus() in
-- src/lib/permissions.ts. The functions replaced here were byte-identical in
-- production and in the repository when this was written.

-- 1. New permission keys (existing keys are left in place).
create or replace function public.permission_keys()
returns text[]
language sql
immutable
as $$
  select array[
    'create_blog',
    'edit_blog_metadata',
    'edit_blog_title',
    'archive_blog',
    'restore_archived_blog',
    'delete_blog',
    'duplicate_blog',
    'view_archived_blogs',
    'start_writing',
    'pause_writing',
    'submit_draft',
    'request_revision',
    'edit_writer_status',
    'edit_google_doc_link',
    'assign_writer_self',
    'view_writing_queue',
    'start_publishing',
    'complete_publishing',
    'edit_publisher_status',
    'assign_publisher_self',
    'upload_cover_image',
    'edit_live_url',
    'view_publishing_queue',
    'edit_scheduled_publish_date',
    'edit_display_publish_date',
    'calendar_drag_reschedule',
    'view_calendar',
    'view_actual_publish_calendar',
    'create_comment',
    'edit_own_comment',
    'delete_own_comment',
    'delete_any_comment',
    'view_comment_history',
    'mention_users',
    'change_writer_assignment',
    'change_publisher_assignment',
    'bulk_reassign_blogs',
    'transfer_user_assignments',
    'view_dashboard',
    'view_metrics',
    'view_more_metrics',
    'view_delay_metrics',
    'view_pipeline_metrics',
    'export_csv',
    'export_selected_csv',
    'edit_blog_description',
    'edit_tags',
    'edit_blog_category',
    'edit_internal_notes',
    'edit_external_links',
    'view_month_calendar',
    'view_week_calendar',
    'view_unscheduled_blogs',
    'reschedule_via_calendar',
    'manage_users',
    'edit_user_profile',
    'assign_roles',
    'manage_permissions',
    'view_user_activity',
    'impersonate_user',
    'manage_integrations',
    'manage_notifications',
    'run_data_import',
    'view_system_logs',
    'repair_workflow_state',
    'manage_environment_settings',
    'override_writer_status',
    'override_publisher_status',
    'edit_actual_publish_timestamp',
    'force_publish',
    -- NEW PERMISSIONS (16 total)
    -- Ideas module (5)
    'create_idea',
    'view_ideas',
    'edit_own_idea',
    'edit_idea_description',
    'delete_idea',
    -- Social Posts module (8)
    'create_social_post',
    'view_social_posts',
    'view_social_post_details',
    'edit_social_post_brief',
    'reopen_social_post_brief',
    'transition_social_post',
    'add_social_post_link',
    'delete_social_post',
    -- General visibility (3)
    'view_my_tasks',
    'view_notifications',
    'view_activity_history',
    'submit_publishing',
    'review_social_post'
  ]::text[];
$$;

-- 2. Role defaults: writers no longer review, publishers can submit publishing,
--    editors can review social posts, viewers get the read-only set.
create or replace function public.default_role_permissions(p_role public.app_role)
returns text[]
language sql
immutable
as $$
  select case
    when p_role = 'admin'::public.app_role then public.permission_keys()
    when p_role = 'writer'::public.app_role then array[
      'create_blog',
      'edit_blog_metadata',
      'edit_blog_title',
      'start_writing',
      'submit_draft',
      'edit_google_doc_link',
      'view_writing_queue',
      'edit_scheduled_publish_date',
      'calendar_drag_reschedule',
      'view_calendar',
      'create_comment',
      'edit_own_comment',
      'delete_own_comment',
      'mention_users',
      'view_dashboard',
      'view_metrics',
      'export_csv',
      'create_idea',
      'view_ideas',
      'edit_own_idea',
      'create_social_post',
      'view_social_posts',
      'edit_social_post_brief',
      'transition_social_post',
      'add_social_post_link',
      'view_my_tasks',
      'view_notifications',
      'view_activity_history'
    ]::text[]
    when p_role = 'publisher'::public.app_role then array[
      'edit_blog_metadata',
      'start_publishing',
      'submit_publishing',
      'complete_publishing',
      'edit_live_url',
      'upload_cover_image',
      'view_publishing_queue',
      'edit_scheduled_publish_date',
      'calendar_drag_reschedule',
      'view_calendar',
      'create_comment',
      'edit_own_comment',
      'delete_own_comment',
      'mention_users',
      'view_dashboard',
      'view_metrics',
      'export_csv',
      'view_social_posts',
      'edit_social_post_brief',
      'transition_social_post',
      'add_social_post_link',
      'view_my_tasks',
      'view_notifications',
      'view_activity_history'
    ]::text[]
    when p_role = 'editor'::public.app_role then array[
      'edit_blog_metadata',
      'edit_blog_title',
      'edit_blog_description',
      'request_revision',
      'create_comment',
      'edit_own_comment',
      'delete_own_comment',
      'mention_users',
      'view_calendar',
      'view_dashboard',
      'view_metrics',
      'export_csv',
      'view_ideas',
      'create_idea',
      'review_social_post',
      'view_my_tasks',
      'view_notifications',
      'view_activity_history'
    ]::text[]
    when p_role::text = 'viewer' then array[
      'view_dashboard',
      'view_calendar',
      'view_ideas',
      'view_social_posts',
      'view_my_tasks'
    ]::text[]
    else array[]::text[]
  end;
$$;

-- 3. Stored toggles. Production has an explicit row per role and key, so the
--    defaults above only apply once these rows agree.
insert into public.role_permissions (role, permission_key, enabled)
select r.role, k.permission_key,
       k.permission_key = any(public.default_role_permissions(r.role))
from (select unnest(array['writer', 'publisher', 'editor']::public.app_role[]) as role) r
cross join (select unnest(array['submit_publishing', 'review_social_post']) as permission_key) k
on conflict (role, permission_key) do update set enabled = excluded.enabled;

update public.role_permissions
set enabled = false
where role = 'writer'::public.app_role
  and permission_key = 'request_revision';

-- 4. Which permission each stage move needs.
create or replace function public.can_transition_writer_status(
  p_current_status public.writer_stage_status,
  p_next_status public.writer_stage_status
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select case
    when p_current_status = p_next_status then true
    when public.has_permission('repair_workflow_state') then true
    when public.has_permission('override_writer_status') then true
    when public.has_permission('edit_writer_status') then true
    when p_next_status = 'in_progress'::public.writer_stage_status
      then p_current_status in (
          'not_started'::public.writer_stage_status,
          'needs_revision'::public.writer_stage_status
        )
        and public.has_permission('start_writing')
    when p_next_status = 'pending_review'::public.writer_stage_status
      then p_current_status = 'in_progress'::public.writer_stage_status
        and public.has_permission('submit_draft')
    -- Review decisions: send back or approve.
    when p_next_status in (
        'needs_revision'::public.writer_stage_status,
        'completed'::public.writer_stage_status
      )
      then p_current_status = 'pending_review'::public.writer_stage_status
        and public.has_permission('request_revision')
    else false
  end;
$$;

create or replace function public.can_transition_publisher_status(
  p_current_status public.publisher_stage_status,
  p_next_status public.publisher_stage_status
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select case
    when p_current_status = p_next_status then true
    when public.has_permission('repair_workflow_state') then true
    when public.has_permission('override_publisher_status') then true
    when public.has_permission('edit_publisher_status') then true
    when p_next_status = 'in_progress'::public.publisher_stage_status
      then p_current_status = 'not_started'::public.publisher_stage_status
        and public.has_permission('start_publishing')
    when p_next_status = 'pending_review'::public.publisher_stage_status
      then p_current_status = 'in_progress'::public.publisher_stage_status
        and public.has_permission('submit_publishing')
    -- Review decision: approve.
    when p_next_status = 'publisher_approved'::public.publisher_stage_status
      then p_current_status = 'pending_review'::public.publisher_stage_status
        and public.has_permission('request_revision')
    when p_next_status = 'completed'::public.publisher_stage_status
      then p_current_status = 'publisher_approved'::public.publisher_stage_status
        and public.has_permission('complete_publishing')
    else false
  end;
$$;

-- 5. Who may make the move. A separate trigger, so the existing
--    enforce_blog_update_permissions() is left untouched.
create or replace function public.enforce_blog_stage_ownership()
returns trigger
language plpgsql
as $$
begin
  if auth.role() = 'service_role' or public.has_permission('repair_workflow_state') then
    return new;
  end if;

  if new.writer_status is distinct from old.writer_status
    and not (
      public.has_permission('override_writer_status')
      or public.has_permission('edit_writer_status')
    ) then
    if old.writer_status = 'pending_review'::public.writer_stage_status then
      if auth.uid() is not distinct from old.writer_id then
        raise exception 'You cannot review your own writing.';
      end if;
    -- new.writer_id, so assigning yourself and starting in one save still works.
    elsif auth.uid() is distinct from new.writer_id then
      raise exception 'Only the assigned writer can move the writing stage.';
    end if;
  end if;

  if new.publisher_status is distinct from old.publisher_status
    and not (
      public.has_permission('override_publisher_status')
      or public.has_permission('edit_publisher_status')
    ) then
    if old.publisher_status = 'pending_review'::public.publisher_stage_status then
      if auth.uid() is not distinct from old.publisher_id then
        raise exception 'You cannot review your own publishing work.';
      end if;
    elsif auth.uid() is distinct from new.publisher_id then
      raise exception 'Only the assigned publisher can move the publishing stage.';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists blogs_enforce_stage_ownership on public.blogs;
create trigger blogs_enforce_stage_ownership
before update on public.blogs
for each row execute function public.enforce_blog_stage_ownership();

-- 6. Leftover delete rules that were looser than the app. Deleting a blog is
--    admin-only in the app ("Blogs deletable by admin only" stays), and a
--    published social post must not be deletable by its creator
--    ("Social posts deletable by creator or admin" stays; it has the guard).
drop policy if exists "Blogs deletable by creator or admin" on public.blogs;
drop policy if exists "Social posts deletable by owner or admin" on public.social_posts;

notify pgrst, 'reload schema';

-- Rollback: re-run 20260401110000 (permission_keys, default_role_permissions)
-- and 20260401181000 (can_transition_*), then
--   drop trigger blogs_enforce_stage_ownership on public.blogs;
--   drop function public.enforce_blog_stage_ownership();
