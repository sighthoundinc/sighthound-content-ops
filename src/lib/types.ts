export type AppRole = "admin" | "writer" | "publisher";

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

export interface ProfileRecord {
  id: string;
  email: string;
  full_name: string;
  role: AppRole;
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
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      app_role: AppRole;
      blog_site: BlogSite;
      writer_stage_status: WriterStageStatus;
      publisher_stage_status: PublisherStageStatus;
      overall_blog_status: OverallBlogStatus;
    };
  };
}
