/**
 * Fact Provider (RAG-style grounded context)
 *
 * Retrieves authoritative metadata about a record from Supabase under the
 * caller's RLS, so Ask AI can answer factual questions (title, people,
 * timeline) without hallucinating.
 *
 * Current coverage: blogs. Social posts and ideas can be added by
 * implementing additional fetchers that produce a `FactContext`.
 *
 * Design rules:
 *   - Read-only; never mutates state.
 *   - Uses the caller's authenticated Supabase client (RLS enforced).
 *   - Resolves assignee UUIDs to display names via relational joins.
 *   - Falls back gracefully when optional columns are missing.
 *   - Returns `null` on failure so the rest of the pipeline still works.
 */
import type { PostgrestError, SupabaseClient } from "@supabase/supabase-js";
import {
  BLOG_SELECT_LEGACY_WITH_RELATIONS,
  BLOG_SELECT_WITH_DATES_WITH_RELATIONS,
  isMissingBlogDateColumnsError,
  normalizeBlogRow,
} from "@/lib/blog-schema";
import { getWorkflowStage } from "@/lib/status";
import type { PublisherStageStatus, WriterStageStatus } from "@/lib/types";

export interface BlogFacts {
  kind: "blog";
  id: string;
  title?: string;
  site?: string;
  slug?: string;
  writerName?: string;
  writerEmail?: string;
  publisherName?: string;
  publisherEmail?: string;
  googleDocUrl?: string;
  liveUrl?: string;
  createdAt?: string;
  updatedAt?: string;
  scheduledPublishDate?: string;
  displayPublishedDate?: string;
  actualPublishedAt?: string;
  /** Days between created_at and actual_published_at (or published_at fallback). */
  timeToPublishDays?: number;
  /** Unified lifecycle stage: writing | ready | publishing | published. */
  workflowStage?: string;
  writerStatus?: string;
  publisherStatus?: string;
}

export type FactContext = BlogFacts | null;

type ProfileJoin =
  | { id: string | null; full_name: string | null; email: string | null }
  | null;

type BlogFactsRow = {
  id: string;
  title: string | null;
  slug: string | null;
  site: string | null;
  writer_id: string | null;
  publisher_id: string | null;
  writer_status: string | null;
  publisher_status: string | null;
  overall_status: string | null;
  google_doc_url: string | null;
  live_url: string | null;
  scheduled_publish_date: string | null;
  display_published_date: string | null;
  actual_published_at: string | null;
  published_at: string | null;
  created_at: string | null;
  updated_at: string | null;
  writer: ProfileJoin;
  publisher: ProfileJoin;
};

function profileDisplayName(profile: ProfileJoin): string | undefined {
  if (!profile) return undefined;
  const full = profile.full_name?.trim();
  if (full) return full;
  const email = profile.email?.trim();
  if (email) return email;
  return undefined;
}

function daysBetween(
  start: string | null | undefined,
  end: string | null | undefined
): number | undefined {
  if (!start || !end) return undefined;
  const startMs = new Date(start).getTime();
  const endMs = new Date(end).getTime();
  if (Number.isNaN(startMs) || Number.isNaN(endMs) || endMs < startMs) {
    return undefined;
  }
  return Math.round((endMs - startMs) / (1000 * 60 * 60 * 24));
}

/**
 * Fetch a grounded BlogFacts snapshot for Ask AI under the caller's RLS.
 * Returns `null` when the blog can't be read or the query fails.
 */
export async function fetchBlogFacts(
  supabase: SupabaseClient,
  blogId: string
): Promise<BlogFacts | null> {
  let row: BlogFactsRow | null = null;
  let error: PostgrestError | null = null;

  {
    const result = await supabase
      .from("blogs")
      .select(BLOG_SELECT_WITH_DATES_WITH_RELATIONS)
      .eq("id", blogId)
      .maybeSingle();
    row = result.data as unknown as BlogFactsRow | null;
    error = result.error;
  }

  if (isMissingBlogDateColumnsError(error)) {
    const fallback = await supabase
      .from("blogs")
      .select(BLOG_SELECT_LEGACY_WITH_RELATIONS)
      .eq("id", blogId)
      .maybeSingle();
    row = fallback.data as unknown as BlogFactsRow | null;
    error = fallback.error;
  }

  if (error) {
    console.warn("[AI Assistant Facts] blog fetch failed", {
      code: error.code,
      message: error.message,
    });
    return null;
  }
  if (!row) {
    return null;
  }

  const normalized = normalizeBlogRow(row as unknown as Record<string, unknown>);
  const writerStatus = (row.writer_status || "not_started") as WriterStageStatus;
  const publisherStatus = (row.publisher_status || "not_started") as PublisherStageStatus;
  const workflowStage = getWorkflowStage({ writerStatus, publisherStatus });

  const actualPublishedAt =
    normalized.actual_published_at ?? normalized.published_at ?? undefined;

  return {
    kind: "blog",
    id: row.id,
    title: row.title ?? undefined,
    site: row.site ?? undefined,
    slug: row.slug ?? undefined,
    writerName: profileDisplayName(row.writer),
    writerEmail: row.writer?.email ?? undefined,
    publisherName: profileDisplayName(row.publisher),
    publisherEmail: row.publisher?.email ?? undefined,
    googleDocUrl: row.google_doc_url ?? undefined,
    liveUrl: row.live_url ?? undefined,
    createdAt: normalized.created_at ?? undefined,
    updatedAt: normalized.updated_at ?? undefined,
    scheduledPublishDate: normalized.scheduled_publish_date ?? undefined,
    displayPublishedDate: normalized.display_published_date ?? undefined,
    actualPublishedAt: actualPublishedAt ?? undefined,
    timeToPublishDays: daysBetween(normalized.created_at ?? undefined, actualPublishedAt),
    workflowStage,
    writerStatus: row.writer_status ?? undefined,
    publisherStatus: row.publisher_status ?? undefined,
  };
}
