-- Add delete_idea and delete_social_post permission keys
-- These are NOT admin-locked: creators with the permission can delete their own content.
-- The API routes still enforce ownership (creator or admin) as defense-in-depth.

-- ============================================================================
-- 1. Update permission_keys() to include new keys
-- ============================================================================

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
    'delete_idea',
    'delete_social_post',
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
    'delete_user',
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
    'force_publish'
  ]::text[];
$$;

-- locked_admin_permission_keys() is unchanged: delete_idea and delete_social_post
-- are NOT admin-locked (all roles can have them).

-- ============================================================================
-- 2. Re-apply constraints (they reference permission_keys())
-- ============================================================================

alter table public.role_permissions
drop constraint if exists role_permissions_permission_key_valid;

alter table public.role_permissions
add constraint role_permissions_permission_key_valid check (
  permission_key = any(public.permission_keys())
);

alter table public.permission_audit_logs
drop constraint if exists permission_audit_logs_permission_key_valid;

alter table public.permission_audit_logs
add constraint permission_audit_logs_permission_key_valid check (
  permission_key = any(public.permission_keys())
);

-- ============================================================================
-- 3. Seed the new keys for non-admin roles (enabled by default)
-- ============================================================================

insert into public.role_permissions (role, permission_key, enabled)
select
  role_values.role,
  new_keys.permission_key,
  true
from (
  select unnest(array['writer', 'publisher', 'editor']::public.app_role[]) as role
) as role_values
cross join (
  select unnest(array['delete_idea', 'delete_social_post']::text[]) as permission_key
) as new_keys
on conflict (role, permission_key) do update
set
  enabled = excluded.enabled,
  updated_at = timezone('utc', now());

-- ============================================================================
-- 4. Update has_permission() — it calls permission_keys() internally,
--    so it automatically recognizes the new keys. No change needed.
-- ============================================================================

notify pgrst, 'reload schema';
