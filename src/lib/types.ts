export type AppRole = "admin" | "writer" | "publisher" | "editor";

export type BlogSite = "sighthound.com" | "redactor.com";

export type WriterStageStatus =
  | "not_started"
  | "in_progress"
  | "needs_revision"
  | "completed";

export type PublisherStageStatus =
  | "not_started"
  | "in_progress"
  | "completed";

export type OverallBlogStatus =
  | "planned"
  | "writing"
  | "needs_revision"
  | "ready_to_publish"
  | "published";

export type WorkflowStage = "writing" | "ready" | "publishing" | "published";
export type SocialPostStatus = "idea" | "review" | "published";
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
      blog_ideas: {
        Row: BlogIdeaRecord;
        Insert: Partial<BlogIdeaRecord> &
          Pick<BlogIdeaRecord, "title" | "site" | "created_by">;
        Update: Partial<BlogIdeaRecord>;
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
