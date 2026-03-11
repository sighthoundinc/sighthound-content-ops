import type { PostgrestError } from "@supabase/supabase-js";

import type { BlogRecord } from "@/lib/types";

export const BLOG_SELECT_WITH_DATES =
  "id,title,site,writer_id,publisher_id,writer_status,publisher_status,overall_status,google_doc_url,live_url,scheduled_publish_date,published_at,target_publish_date,status_updated_at,is_archived,created_by,created_at,updated_at";

export const BLOG_SELECT_LEGACY =
  "id,title,site,writer_id,publisher_id,writer_status,publisher_status,overall_status,google_doc_url,live_url,target_publish_date,status_updated_at,is_archived,created_by,created_at,updated_at";

export const BLOG_SELECT_WITH_DATES_WITH_RELATIONS =
  "id,title,slug,site,writer_id,publisher_id,writer_status,publisher_status,overall_status,google_doc_url,live_url,scheduled_publish_date,published_at,target_publish_date,status_updated_at,is_archived,created_by,created_at,updated_at,writer:writer_id(id,full_name,email),publisher:publisher_id(id,full_name,email)";

export const BLOG_SELECT_LEGACY_WITH_RELATIONS =
  "id,title,slug,site,writer_id,publisher_id,writer_status,publisher_status,overall_status,google_doc_url,live_url,target_publish_date,status_updated_at,is_archived,created_by,created_at,updated_at,writer:writer_id(id,full_name,email),publisher:publisher_id(id,full_name,email)";

export function isMissingBlogDateColumnsError(
  error: Pick<PostgrestError, "code" | "message" | "details" | "hint"> | null | undefined
) {
  if (!error) {
    return false;
  }

  const text = `${error.message ?? ""} ${error.details ?? ""} ${error.hint ?? ""}`.toLowerCase();
  return (
    error.code === "42703" &&
    (text.includes("scheduled_publish_date") || text.includes("published_at"))
  );
}

type LooseBlogRow = Partial<BlogRecord> & Record<string, unknown>;

export function normalizeBlogRow<T extends LooseBlogRow>(row: T): BlogRecord & T {
  const targetPublishDate =
    typeof row.target_publish_date === "string" ? row.target_publish_date : null;
  const scheduledPublishDate =
    typeof row.scheduled_publish_date === "string"
      ? row.scheduled_publish_date
      : targetPublishDate;
  const publishedAt = typeof row.published_at === "string" ? row.published_at : null;

  return {
    ...row,
    target_publish_date: targetPublishDate,
    scheduled_publish_date: scheduledPublishDate,
    published_at: publishedAt,
  } as BlogRecord & T;
}

export function normalizeBlogRows(rows: LooseBlogRow[]) {
  return rows.map((row) => normalizeBlogRow(row));
}

export function getBlogPublishDate(
  blog: Pick<BlogRecord, "scheduled_publish_date" | "target_publish_date" | "published_at">
) {
  return (
    blog.scheduled_publish_date ??
    blog.target_publish_date ??
    blog.published_at?.slice(0, 10) ??
    null
  );
}
