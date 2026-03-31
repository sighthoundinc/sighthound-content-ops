-- Add explicit permission coverage for Ideas, Social Posts, and visibility features
-- This migration adds 16 new permissions to reach 92 total permissions

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
    'view_activity_history'
  ]::text[];
$$;

create or replace function public.locked_admin_permission_keys()
returns text[]
language sql
immutable
as $$
  select array[
    'manage_users',
    'assign_roles',
    'manage_permissions',
    'delete_blog',
    'repair_workflow_state',
    'override_writer_status',
    'override_publisher_status',
    'edit_actual_publish_timestamp',
    'force_publish',
    'reopen_social_post_brief',
    'delete_idea',
    'delete_social_post'
  ]::text[];
$$;

-- Drop existing constraints before making changes
alter table public.role_permissions
drop constraint if exists role_permissions_permission_key_valid cascade;

alter table public.role_permissions
drop constraint if exists role_permissions_locked_admin_only cascade;

alter table public.permission_audit_logs
drop constraint if exists permission_audit_logs_permission_key_valid cascade;

-- First, disable any conflicting permission rows for non-admin roles before adding new constraints
delete from public.role_permissions
where role <> 'admin'::public.app_role
  and permission_key in (
    'reopen_social_post_brief',
    'delete_idea',
    'delete_social_post'
  );

-- Now re-add constraints with complete permission set
alter table public.role_permissions
add constraint role_permissions_permission_key_valid check (
  permission_key = any(public.permission_keys())
);

alter table public.role_permissions
add constraint role_permissions_locked_admin_only check (
  role = 'admin'::public.app_role
  or permission_key <> all(public.locked_admin_permission_keys())
);

alter table public.permission_audit_logs
add constraint permission_audit_logs_permission_key_valid check (
  permission_key = any(public.permission_keys())
);

-- Update default_role_permissions function
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
      'request_revision',
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
      -- NEW: Ideas (3)
      'create_idea',
      'view_ideas',
      'edit_own_idea',
      -- NEW: Social Posts (5)
      'create_social_post',
      'view_social_posts',
      'edit_social_post_brief',
      'transition_social_post',
      'add_social_post_link',
      -- NEW: Visibility (3)
      'view_my_tasks',
      'view_notifications',
      'view_activity_history'
    ]::text[]
    when p_role = 'publisher'::public.app_role then array[
      'edit_blog_metadata',
      'start_publishing',
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
      -- NEW: Social Posts (4)
      'view_social_posts',
      'edit_social_post_brief',
      'transition_social_post',
      'add_social_post_link',
      -- NEW: Visibility (3)
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
      -- NEW: Ideas (2)
      'view_ideas',
      'create_idea',
      -- NEW: Visibility (3)
      'view_my_tasks',
      'view_notifications',
      'view_activity_history'
    ]::text[]
    else array[]::text[]
  end;
$$;

-- Insert/update role permissions with new defaults
insert into public.role_permissions (role, permission_key, enabled)
select
  role_values.role,
  permission_values.permission_key,
  permission_values.permission_key = any(public.default_role_permissions(role_values.role))
from (
  select unnest(array['writer', 'publisher', 'editor']::public.app_role[]) as role
) as role_values
cross join (
  select unnest(public.permission_keys()) as permission_key
) as permission_values
where permission_values.permission_key <> all(public.locked_admin_permission_keys())
on conflict (role, permission_key) do update
set
  enabled = excluded.enabled,
  updated_at = timezone('utc', now());
