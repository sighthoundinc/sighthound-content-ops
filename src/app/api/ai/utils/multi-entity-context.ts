/**
 * Multi-entity workspace context.
 *
 * When the user asks workspace-wide questions ("what's blocking me this
 * week?"), we aggregate a compact, read-only snapshot of their owned and
 * assigned items across blogs and social posts. RLS is enforced by using
 * the caller's authenticated Supabase client.
 *
 * The snapshot is intentionally small (capped) so Gemini doesn't receive
 * bloated prompts.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

export interface WorkspaceItem {
  kind: "blog" | "social_post";
  id: string;
  title: string;
  site?: string | null;
  status: string;
  scheduledDate?: string | null;
  updatedAt?: string | null;
  ownedByMe: boolean;
  awaitingMe: boolean;
}

export interface WorkspaceSnapshot {
  userId: string;
  blogsCount: number;
  socialCount: number;
  overdueCount: number;
  items: WorkspaceItem[];
}

const MAX_ITEMS = 25;

type BlogRow = {
  id: string;
  title: string | null;
  site: string | null;
  writer_status: string | null;
  publisher_status: string | null;
  writer_id: string | null;
  publisher_id: string | null;
  scheduled_publish_date: string | null;
  updated_at: string | null;
};

type SocialRow = {
  id: string;
  title: string | null;
  status: string | null;
  scheduled_date: string | null;
  updated_at: string | null;
  created_by: string | null;
  assigned_to_user_id: string | null;
  worker_user_id: string | null;
};

function asDate(value: string | null | undefined): number {
  if (!value) return Number.POSITIVE_INFINITY;
  const t = new Date(value).getTime();
  return Number.isNaN(t) ? Number.POSITIVE_INFINITY : t;
}

export async function buildWorkspaceSnapshot(
  supabase: SupabaseClient,
  userId: string
): Promise<WorkspaceSnapshot> {
  // Blogs owned/assigned to the user.
  const { data: blogData } = await supabase
    .from("blogs")
    .select(
      "id, title, site, writer_status, publisher_status, writer_id, publisher_id, scheduled_publish_date, updated_at"
    )
    .or(`writer_id.eq.${userId},publisher_id.eq.${userId}`)
    .neq("publisher_status", "completed")
    .limit(40);

  // Social posts owned by the user.
  const { data: socialData } = await supabase
    .from("social_posts")
    .select(
      "id, title, status, scheduled_date, updated_at, created_by, assigned_to_user_id, worker_user_id"
    )
    .or(
      `assigned_to_user_id.eq.${userId},worker_user_id.eq.${userId},created_by.eq.${userId}`
    )
    .neq("status", "published")
    .limit(40);

  const blogRows = (blogData ?? []) as BlogRow[];
  const socialRows = (socialData ?? []) as SocialRow[];

  const today = Date.now();

  const blogItems: WorkspaceItem[] = blogRows.map((row) => {
    const awaitingWriter =
      row.writer_id === userId && row.writer_status !== "completed";
    const awaitingPublisher =
      row.publisher_id === userId && row.publisher_status !== "completed";
    return {
      kind: "blog",
      id: row.id,
      title: row.title ?? "Untitled blog",
      site: row.site,
      status: row.publisher_status && row.publisher_status !== "not_started"
        ? `publisher:${row.publisher_status}`
        : `writer:${row.writer_status ?? "not_started"}`,
      scheduledDate: row.scheduled_publish_date,
      updatedAt: row.updated_at,
      ownedByMe: row.writer_id === userId || row.publisher_id === userId,
      awaitingMe: awaitingWriter || awaitingPublisher,
    };
  });

  const socialItems: WorkspaceItem[] = socialRows.map((row) => ({
    kind: "social_post",
    id: row.id,
    title: row.title ?? "Untitled post",
    site: null,
    status: row.status ?? "draft",
    scheduledDate: row.scheduled_date,
    updatedAt: row.updated_at,
    ownedByMe:
      row.created_by === userId ||
      row.assigned_to_user_id === userId ||
      row.worker_user_id === userId,
    awaitingMe: row.assigned_to_user_id === userId,
  }));

  const combined = [...blogItems, ...socialItems]
    .sort((a, b) => {
      // Awaiting-me first, then earliest scheduled date.
      if (a.awaitingMe !== b.awaitingMe) return a.awaitingMe ? -1 : 1;
      return asDate(a.scheduledDate) - asDate(b.scheduledDate);
    })
    .slice(0, MAX_ITEMS);

  const overdueCount = combined.filter((item) => {
    if (!item.scheduledDate) return false;
    const t = new Date(item.scheduledDate).getTime();
    return !Number.isNaN(t) && t < today;
  }).length;

  return {
    userId,
    blogsCount: blogItems.length,
    socialCount: socialItems.length,
    overdueCount,
    items: combined,
  };
}
