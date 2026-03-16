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

create or replace function public.locked_admin_permission_keys()
returns text[]
language sql
immutable
as $$
  select array[
    'manage_users',
    'delete_user',
    'assign_roles',
    'manage_permissions',
    'delete_blog',
    'repair_workflow_state',
    'override_writer_status',
    'override_publisher_status',
    'edit_actual_publish_timestamp',
    'force_publish'
  ]::text[];
$$;

notify pgrst, 'reload schema';
