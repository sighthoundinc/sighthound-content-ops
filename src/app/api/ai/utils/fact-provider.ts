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
import { isMissingSocialOwnershipColumnsError } from "@/lib/social-post-schema";
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
  /** True when writer_id is present but the profile row wasn't readable (RLS). */
  writerUnavailable?: boolean;
  publisherName?: string;
  publisherEmail?: string;
  publisherUnavailable?: boolean;
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

export interface SocialPostFacts {
  kind: "social_post";
  id: string;
  title?: string;
  type?: string;
  status?: string;
  product?: string;
  canvaUrl?: string;
  canvaPage?: number;
  caption?: string;
  platforms?: string[];
  scheduledDate?: string;
  createdAt?: string;
  updatedAt?: string;
  creatorName?: string;
  creatorUnavailable?: boolean;
  reviewerName?: string;
  reviewerUnavailable?: boolean;
  assignedToName?: string;
  assignedToUnavailable?: boolean;
  associatedBlogId?: string;
  associatedBlogTitle?: string;
  associatedBlogSite?: string;
  liveLinks?: string[];
}

export interface IdeaFacts {
  kind: "idea";
  id: string;
  title?: string;
  site?: string;
  description?: string;
  creatorName?: string;
  creatorUnavailable?: boolean;
  createdAt?: string;
  isConverted?: boolean;
  convertedBlogId?: string;
}

export type FactContext = BlogFacts | SocialPostFacts | IdeaFacts | null;

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

/**
 * Returns true when an assignee UUID is present on the row but the joined
 * profile row is missing — typically because RLS clipped it.
 */
function isProfileClippedByRls(
  assigneeId: string | null | undefined,
  joinedProfile: ProfileJoin
): boolean {
  return !!assigneeId && !joinedProfile;
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
 * Derive a public live URL for a published blog when the explicit
 * `live_url` column is empty. Only returns a value when the blog has
 * clearly been published (publisher stage completed or actual publish
 * timestamp present) and both a site + slug are on record.
 */
function deriveBlogLiveUrl(
  site: string | null | undefined,
  slug: string | null | undefined,
  published: { publisherStatus?: string | null; actualPublishedAt?: string | null }
): string | undefined {
  if (!slug) return undefined;
  const isPublished =
    published.publisherStatus === "completed" || !!published.actualPublishedAt;
  if (!isPublished) return undefined;
  if (site === "sighthound.com") return `https://www.sighthound.com/blog/${slug}`;
  if (site === "redactor.com") return `https://www.redactor.com/blog/${slug}`;
  return undefined;
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

  // Prefer the stored live_url, but derive one from site + slug when the
  // record is clearly published and the column is empty. This keeps Ask AI
  // useful for older imports that never had live_url backfilled.
  const liveUrl =
    row.live_url ??
    deriveBlogLiveUrl(row.site, row.slug, {
      publisherStatus: row.publisher_status,
      actualPublishedAt,
    }) ??
    undefined;

  return {
    kind: "blog",
    id: row.id,
    title: row.title ?? undefined,
    site: row.site ?? undefined,
    slug: row.slug ?? undefined,
    writerName: profileDisplayName(row.writer),
    writerEmail: row.writer?.email ?? undefined,
    writerUnavailable: isProfileClippedByRls(row.writer_id, row.writer),
    publisherName: profileDisplayName(row.publisher),
    publisherEmail: row.publisher?.email ?? undefined,
    publisherUnavailable: isProfileClippedByRls(row.publisher_id, row.publisher),
    googleDocUrl: row.google_doc_url ?? undefined,
    liveUrl,
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

type SocialFactsRow = {
  id: string;
  title: string | null;
  type: string | null;
  status: string | null;
  product: string | null;
  canva_url: string | null;
  canva_page: number | null;
  caption: string | null;
  platforms: unknown;
  scheduled_date: string | null;
  created_at: string | null;
  updated_at: string | null;
  created_by: string | null;
  worker_user_id: string | null;
  reviewer_user_id: string | null;
  assigned_to_user_id: string | null;
  associated_blog_id: string | null;
  creator: ProfileJoin;
  reviewer: ProfileJoin;
  assignedTo: ProfileJoin;
  associated_blog:
    | { id: string | null; title: string | null; site: string | null }
    | null;
};

type SocialLinkRow = { url: string | null };

const SOCIAL_FACTS_SELECT_WITH_OWNERSHIP = `
  id, title, type, status, product, canva_url, canva_page, caption,
  platforms, scheduled_date, created_at, updated_at, created_by,
  worker_user_id, reviewer_user_id, assigned_to_user_id, associated_blog_id,
  creator:created_by(id,full_name,email),
  reviewer:reviewer_user_id(id,full_name,email),
  assignedTo:assigned_to_user_id(id,full_name,email),
  associated_blog:associated_blog_id(id,title,site)
`;

const SOCIAL_FACTS_SELECT_LEGACY = `
  id, title, type, status, product, canva_url, canva_page, caption,
  platforms, scheduled_date, created_at, updated_at, created_by,
  worker_user_id, reviewer_user_id, associated_blog_id,
  creator:created_by(id,full_name,email),
  reviewer:reviewer_user_id(id,full_name,email),
  associated_blog:associated_blog_id(id,title,site)
`;

/**
 * Fetch a grounded SocialPostFacts snapshot for Ask AI under the caller's RLS.
 */
export async function fetchSocialPostFacts(
  supabase: SupabaseClient,
  postId: string
): Promise<SocialPostFacts | null> {
  let row: SocialFactsRow | null = null;
  let error: PostgrestError | null = null;

  {
    const result = await supabase
      .from("social_posts")
      .select(SOCIAL_FACTS_SELECT_WITH_OWNERSHIP)
      .eq("id", postId)
      .maybeSingle();
    row = result.data as unknown as SocialFactsRow | null;
    error = result.error;
  }

  if (isMissingSocialOwnershipColumnsError(error)) {
    const fallback = await supabase
      .from("social_posts")
      .select(SOCIAL_FACTS_SELECT_LEGACY)
      .eq("id", postId)
      .maybeSingle();
    row = fallback.data as unknown as SocialFactsRow | null;
    error = fallback.error;
  }

  if (error) {
    console.warn("[AI Assistant Facts] social post fetch failed", {
      code: error.code,
      message: error.message,
    });
    return null;
  }
  if (!row) return null;

  // Fetch live links (best-effort; ignore errors)
  let liveLinks: string[] = [];
  try {
    const { data: linkRows } = await supabase
      .from("social_post_links")
      .select("url")
      .eq("social_post_id", postId)
      .limit(5);
    liveLinks = (linkRows as SocialLinkRow[] | null)
      ?.map((linkRow) => linkRow.url?.trim())
      .filter((url): url is string => !!url) ?? [];
  } catch {
    // non-fatal
  }

  const platforms = Array.isArray(row.platforms)
    ? (row.platforms.filter((p) => typeof p === "string") as string[])
    : undefined;

  return {
    kind: "social_post",
    id: row.id,
    title: row.title ?? undefined,
    type: row.type ?? undefined,
    status: row.status ?? undefined,
    product: row.product ?? undefined,
    canvaUrl: row.canva_url ?? undefined,
    canvaPage: typeof row.canva_page === "number" ? row.canva_page : undefined,
    caption: row.caption ?? undefined,
    platforms,
    scheduledDate: row.scheduled_date ?? undefined,
    createdAt: row.created_at ?? undefined,
    updatedAt: row.updated_at ?? undefined,
    creatorName: profileDisplayName(row.creator),
    creatorUnavailable: isProfileClippedByRls(row.created_by, row.creator),
    reviewerName: profileDisplayName(row.reviewer),
    reviewerUnavailable: isProfileClippedByRls(row.reviewer_user_id, row.reviewer),
    assignedToName: profileDisplayName(row.assignedTo),
    assignedToUnavailable: isProfileClippedByRls(
      row.assigned_to_user_id,
      row.assignedTo
    ),
    associatedBlogId: row.associated_blog_id ?? undefined,
    associatedBlogTitle: row.associated_blog?.title ?? undefined,
    associatedBlogSite: row.associated_blog?.site ?? undefined,
    liveLinks: liveLinks.length > 0 ? liveLinks : undefined,
  };
}

type IdeaFactsRow = {
  id: string;
  title: string | null;
  site: string | null;
  description: string | null;
  created_at: string | null;
  created_by: string | null;
  is_converted: boolean | null;
  converted_blog_id: string | null;
  creator: ProfileJoin;
};

/**
 * Fetch a grounded IdeaFacts snapshot for Ask AI under the caller's RLS.
 */
export async function fetchIdeaFacts(
  supabase: SupabaseClient,
  ideaId: string
): Promise<IdeaFacts | null> {
  const { data, error } = await supabase
    .from("blog_ideas")
    .select(
      "id,title,site,description,created_at,created_by,is_converted,converted_blog_id,creator:created_by(id,full_name,email)"
    )
    .eq("id", ideaId)
    .maybeSingle();

  if (error) {
    console.warn("[AI Assistant Facts] idea fetch failed", {
      code: error.code,
      message: error.message,
    });
    return null;
  }
  if (!data) return null;
  const row = data as unknown as IdeaFactsRow;

  return {
    kind: "idea",
    id: row.id,
    title: row.title ?? undefined,
    site: row.site ?? undefined,
    description: row.description ?? undefined,
    creatorName: profileDisplayName(row.creator),
    creatorUnavailable: isProfileClippedByRls(row.created_by, row.creator),
    createdAt: row.created_at ?? undefined,
    isConverted: row.is_converted ?? undefined,
    convertedBlogId: row.converted_blog_id ?? undefined,
  };
}

/**
 * Unified fact fetcher that dispatches by entity type.
 * Never throws; returns `null` when facts cannot be retrieved.
 */
export async function fetchFacts(
  supabase: SupabaseClient,
  entityType: "blog" | "social_post" | "idea",
  entityId: string
): Promise<FactContext> {
  try {
    if (entityType === "blog") return await fetchBlogFacts(supabase, entityId);
    if (entityType === "social_post")
      return await fetchSocialPostFacts(supabase, entityId);
    if (entityType === "idea") return await fetchIdeaFacts(supabase, entityId);
    return null;
  } catch (err) {
    console.warn(
      "[AI Assistant Facts] fetchFacts failed",
      err instanceof Error ? err.message : err
    );
    return null;
  }
}
