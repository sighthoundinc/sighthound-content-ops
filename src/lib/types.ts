export type AppRole = "admin" | "writer" | "publisher" | "editor";
export type CanonicalAppPermissionKey =
  | "create_blog"
  | "edit_blog_metadata"
  | "edit_blog_title"
  | "archive_blog"
  | "restore_archived_blog"
  | "delete_blog"
  | "duplicate_blog"
  | "view_archived_blogs"
  | "start_writing"
  | "pause_writing"
  | "submit_draft"
  | "request_revision"
  | "edit_writer_status"
  | "edit_google_doc_link"
  | "assign_writer_self"
  | "view_writing_queue"
  | "start_publishing"
  | "complete_publishing"
  | "edit_publisher_status"
  | "assign_publisher_self"
  | "upload_cover_image"
  | "edit_live_url"
  | "view_publishing_queue"
  | "edit_scheduled_publish_date"
  | "edit_display_publish_date"
  | "calendar_drag_reschedule"
  | "view_calendar"
  | "view_actual_publish_calendar"
  | "create_comment"
  | "edit_own_comment"
  | "delete_own_comment"
  | "delete_any_comment"
  | "view_comment_history"
  | "mention_users"
  | "change_writer_assignment"
  | "change_publisher_assignment"
  | "bulk_reassign_blogs"
  | "transfer_user_assignments"
  | "view_dashboard"
  | "view_metrics"
  | "view_more_metrics"
  | "view_delay_metrics"
  | "view_pipeline_metrics"
  | "export_csv"
  | "export_selected_csv"
  | "edit_blog_description"
  | "edit_tags"
  | "edit_blog_category"
  | "edit_internal_notes"
  | "edit_external_links"
  | "view_month_calendar"
  | "view_week_calendar"
  | "view_unscheduled_blogs"
  | "reschedule_via_calendar"
  | "manage_users"
  | "delete_user"
  | "edit_user_profile"
  | "assign_roles"
  | "manage_permissions"
  | "view_user_activity"
  | "impersonate_user"
  | "manage_integrations"
  | "manage_notifications"
  | "run_data_import"
  | "view_system_logs"
  | "repair_workflow_state"
  | "manage_environment_settings"
  | "override_writer_status"
  | "override_publisher_status"
  | "edit_actual_publish_timestamp"
  | "force_publish";
export type LegacyAppPermissionKey =
  | "submit_writing"
  | "edit_writing_stage"
  | "edit_publishing_stage"
  | "use_calendar_drag_and_drop"
  | "create_comments"
  | "edit_own_comments"
  | "delete_comments"
  | "manage_roles"
  | "override_workflow";
export type AppPermissionKey = CanonicalAppPermissionKey | LegacyAppPermissionKey;

export type BlogSite = "sighthound.com" | "redactor.com";

export type WriterStageStatus =
  | "not_started"
  | "in_progress"
  | "pending_review"
  | "needs_revision"
  | "completed";

export type PublisherStageStatus =
  | "not_started"
  | "in_progress"
  | "pending_review"
  | "publisher_approved"
  | "completed";

export type OverallBlogStatus =
  | "planned"
  | "writing"
  | "needs_revision"
  | "ready_to_publish"
  | "published";

export type WorkflowStage = "writing" | "ready" | "publishing" | "published";
export type SocialPostStatus =
  | "draft"
  | "in_review"
  | "changes_requested"
  | "creative_approved"
  | "ready_to_publish"
  | "awaiting_live_link"
  | "published";
export type SocialNextActor = "editor" | "admin" | "none";
export type SocialPostProduct =
  | "alpr_plus"
  | "redactor"
  | "hardware"
  | "general_company";
export type SocialPostType = "image" | "carousel" | "link" | "video";
export type SocialPlatform = "linkedin" | "facebook" | "instagram";

export interface ProfileRecord {
  id: string;
  email: string;
  full_name: string;
  first_name: string | null;
  last_name: string | null;
  display_name: string | null;
  timezone: string;
  week_start: number;
  stale_draft_days: number;
  role: AppRole;
  user_roles: AppRole[] | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface BlogRecord {
  id: string;
  title: string;
  slug: string | null;
  site: BlogSite;
  writer_id: string | null;
  publisher_id: string | null;
  writer_status: WriterStageStatus;
  publisher_status: PublisherStageStatus;
  overall_status: OverallBlogStatus;
  google_doc_url: string | null;
  live_url: string | null;
  scheduled_publish_date: string | null;
  display_published_date: string | null;
  actual_published_at: string | null;
  published_at: string | null;
  target_publish_date: string | null;
  status_updated_at: string;
  writer_submitted_at: string | null;
  writer_reviewed_by: string | null;
  writer_reviewed_at: string | null;
  publisher_submitted_at: string | null;
  publisher_reviewed_by: string | null;
  publisher_reviewed_at: string | null;
  is_archived: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
  writer?: Pick<ProfileRecord, "id" | "full_name" | "email"> | null;
  publisher?: Pick<ProfileRecord, "id" | "full_name" | "email"> | null;
}

export interface BlogHistoryRecord {
  id: string;
  blog_id: string;
  changed_by: string | null;
  event_type: string;
  field_name: string | null;
  old_value: string | null;
  new_value: string | null;
  metadata: Record<string, unknown>;
  changed_at: string;
}

export interface AppSettingsRecord {
  id: number;
  timezone: string;
  week_start: number;
  stale_draft_days: number;
  updated_by: string | null;
  updated_at: string;
}

export interface UserIntegrations {
  id: string;
  user_id: string;
  google_connected: boolean;
  google_connected_at: string | null;
  slack_connected: boolean;
  slack_connected_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface RolePermissionRecord {
  role: AppRole;
  permission_key: AppPermissionKey;
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface PermissionAuditLogRecord {
  id: string;
  role: AppRole;
  permission_key: AppPermissionKey;
  old_value: boolean;
  new_value: boolean;
  changed_by: string | null;
  changed_at: string;
}
export interface BlogIdeaRecord {
  id: string;
  title: string;
  site: BlogSite;
  description: string | null;
  created_by: string;
  created_at: string;
  is_converted: boolean;
  converted_blog_id: string | null;
}

export interface IdeaCommentRecord {
  id: string;
  idea_id: string;
  comment: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface SocialPostRecord {
  id: string;
  title: string;
  product: SocialPostProduct;
  type: SocialPostType;
  canva_url: string | null;
  canva_page: number | null;
  caption: string | null;
  platforms: SocialPlatform[];
  scheduled_date: string | null;
  status: SocialPostStatus;
  created_by: string;
  editor_user_id: string | null;
  admin_owner_id: string | null;
  last_live_link_reminder_at: string | null;
  associated_blog_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface SocialPostLinkRecord {
  id: string;
  social_post_id: string;
  platform: SocialPlatform;
  url: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface SocialPostCommentRecord {
  id: string;
  social_post_id: string;
  user_id: string;
  created_by: string | null;
  parent_comment_id: string | null;
  comment: string;
  created_at: string;
  updated_at: string;
}

export interface SocialPostActivityRecord {
  id: string;
  social_post_id: string;
  changed_by: string | null;
  event_type: string;
  field_name: string | null;
  old_value: string | null;
  new_value: string | null;
  metadata: Record<string, unknown>;
  changed_at: string;
}

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: ProfileRecord;
        Insert: Partial<ProfileRecord> & Pick<ProfileRecord, "id" | "email" | "full_name" | "role">;
        Update: Partial<ProfileRecord>;
      };
      blogs: {
        Row: BlogRecord;
        Insert: Partial<BlogRecord> &
          Pick<BlogRecord, "title" | "site" | "created_by">;
        Update: Partial<BlogRecord>;
      };
      blog_assignment_history: {
        Row: BlogHistoryRecord;
        Insert: Partial<BlogHistoryRecord> &
          Pick<BlogHistoryRecord, "blog_id" | "event_type">;
        Update: Partial<BlogHistoryRecord>;
      };
      app_settings: {
        Row: AppSettingsRecord;
        Insert: Partial<AppSettingsRecord>;
        Update: Partial<AppSettingsRecord>;
      };
      role_permissions: {
        Row: RolePermissionRecord;
        Insert: Partial<RolePermissionRecord> &
          Pick<RolePermissionRecord, "role" | "permission_key" | "enabled">;
        Update: Partial<RolePermissionRecord>;
      };
      permission_audit_logs: {
        Row: PermissionAuditLogRecord;
        Insert: Partial<PermissionAuditLogRecord> &
          Pick<
            PermissionAuditLogRecord,
            "role" | "permission_key" | "old_value" | "new_value"
          >;
        Update: Partial<PermissionAuditLogRecord>;
      };
      blog_ideas: {
        Row: BlogIdeaRecord;
        Insert: Partial<BlogIdeaRecord> &
          Pick<BlogIdeaRecord, "title" | "site" | "created_by">;
        Update: Partial<BlogIdeaRecord>;
      };
      blog_idea_comments: {
        Row: IdeaCommentRecord;
        Insert: Partial<IdeaCommentRecord> &
          Pick<IdeaCommentRecord, "idea_id" | "comment" | "created_by">;
        Update: Partial<IdeaCommentRecord>;
      };
      social_posts: {
        Row: SocialPostRecord;
        Insert: Partial<SocialPostRecord> &
          Pick<SocialPostRecord, "title" | "created_by">;
        Update: Partial<SocialPostRecord>;
      };
      social_post_links: {
        Row: SocialPostLinkRecord;
        Insert: Partial<SocialPostLinkRecord> &
          Pick<
            SocialPostLinkRecord,
            "social_post_id" | "platform" | "url" | "created_by"
          >;
        Update: Partial<SocialPostLinkRecord>;
      };
      social_post_comments: {
        Row: SocialPostCommentRecord;
        Insert: Partial<SocialPostCommentRecord> &
          Pick<SocialPostCommentRecord, "social_post_id" | "comment" | "user_id">;
        Update: Partial<SocialPostCommentRecord>;
      };
      social_post_activity_history: {
        Row: SocialPostActivityRecord;
        Insert: Partial<SocialPostActivityRecord> &
          Pick<SocialPostActivityRecord, "social_post_id" | "event_type">;
        Update: Partial<SocialPostActivityRecord>;
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      app_role: AppRole;
      blog_site: BlogSite;
      writer_stage_status: WriterStageStatus;
      publisher_stage_status: PublisherStageStatus;
      overall_blog_status: OverallBlogStatus;
      social_post_status: SocialPostStatus;
      social_post_product: SocialPostProduct;
      social_post_type: SocialPostType;
      social_platform: SocialPlatform;
    };
  };
}
