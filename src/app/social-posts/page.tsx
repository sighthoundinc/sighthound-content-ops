"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  DndContext,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  formatDistanceToNow,
  isSameDay,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";

import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/button";
import {
  DataPageFilterPills,
  DataPageHeader,
  DataPageToolbar,
} from "@/components/data-page";
import { ProtectedPage } from "@/components/protected-page";
import { SocialPostStatusBadge } from "@/components/status-badge";
import {
  TablePaginationControls,
  TableResultsSummary,
  TableRowLimitSelect,
} from "@/components/table-controls";
import {
  SOCIAL_PLATFORMS,
  SOCIAL_PLATFORM_LABELS,
  SOCIAL_POST_PRODUCTS,
  SOCIAL_POST_PRODUCT_LABELS,
  SOCIAL_POST_STATUSES,
  SOCIAL_POST_STATUS_LABELS,
  SOCIAL_POST_TYPES,
  SOCIAL_POST_TYPE_LABELS,
} from "@/lib/status";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import {
  DEFAULT_TABLE_ROW_LIMIT,
  getTablePageCount,
  getTablePageRows,
  type TableRowLimit,
} from "@/lib/table";
import type {
  BlogSite,
  ProfileRecord,
  SocialPlatform,
  SocialPostActivityRecord,
  SocialPostCommentRecord,
  SocialPostLinkRecord,
  SocialPostProduct,
  SocialPostRecord,
  SocialPostStatus,
  SocialPostType,
} from "@/lib/types";
import { formatDateInput, toTitleCase } from "@/lib/utils";
import { useAuth } from "@/providers/auth-provider";
import { useSystemFeedback } from "@/providers/system-feedback-provider";

type SocialPostsView = "board" | "list" | "calendar";

type BlogLookupResult = {
  id: string;
  title: string;
  slug: string | null;
  site: BlogSite;
};

type SocialPostWithRelations = SocialPostRecord & {
  associated_blog?: BlogLookupResult | null;
  creator?: Pick<ProfileRecord, "id" | "full_name" | "email"> | null;
};

type SocialCommentRecord = SocialPostCommentRecord & {
  author?: Pick<ProfileRecord, "id" | "full_name" | "email"> | null;
};

type SocialActivityRecord = SocialPostActivityRecord & {
  actor?: Pick<ProfileRecord, "id" | "full_name" | "email"> | null;
};

type SocialPostFormState = {
  title: string;
  product: SocialPostProduct;
  type: SocialPostType;
  canva_url: string;
  canva_page: string;
  caption: string;
  platforms: SocialPlatform[];
  scheduled_date: string;
  status: SocialPostStatus;
  associated_blog_id: string | null;
};

const STATUS_DROP_ZONE_PREFIX = "social-status-";

function normalizeRelationObject<T>(value: unknown): T | null {
  if (Array.isArray(value)) {
    return (value[0] ?? null) as T | null;
  }
  return (value ?? null) as T | null;
}

function normalizeSocialPostRows(rows: Array<Record<string, unknown>>) {
  return rows.map((row) => {
    const associatedBlog = normalizeRelationObject<BlogLookupResult>(
      row.associated_blog
    );
    const creator = normalizeRelationObject<
      Pick<ProfileRecord, "id" | "full_name" | "email">
    >(row.creator);
    const platforms = Array.isArray(row.platforms)
      ? row.platforms.filter((platform): platform is SocialPlatform =>
          typeof platform === "string"
        )
      : [];

    return {
      id: String(row.id ?? ""),
      title: String(row.title ?? ""),
      product: (row.product as SocialPostProduct) ?? "general_company",
      type: (row.type as SocialPostType) ?? "image",
      canva_url: typeof row.canva_url === "string" ? row.canva_url : null,
      canva_page:
        typeof row.canva_page === "number"
          ? row.canva_page
          : typeof row.canva_page === "string"
            ? Number(row.canva_page) || null
            : null,
      caption: typeof row.caption === "string" ? row.caption : null,
      platforms,
      scheduled_date:
        typeof row.scheduled_date === "string" ? row.scheduled_date : null,
      status: (row.status as SocialPostStatus) ?? "idea",
      created_by: String(row.created_by ?? ""),
      associated_blog_id:
        typeof row.associated_blog_id === "string" ? row.associated_blog_id : null,
      created_at: String(row.created_at ?? ""),
      updated_at: String(row.updated_at ?? ""),
      associated_blog: associatedBlog,
      creator,
    } satisfies SocialPostWithRelations;
  });
}

function normalizeSocialPostLinkRows(rows: Array<Record<string, unknown>>) {
  return rows.map((row) => {
    return {
      id: String(row.id ?? ""),
      social_post_id: String(row.social_post_id ?? ""),
      platform: (row.platform as SocialPlatform) ?? "linkedin",
      url: String(row.url ?? ""),
      created_by: String(row.created_by ?? ""),
      created_at: String(row.created_at ?? ""),
      updated_at: String(row.updated_at ?? ""),
    } satisfies SocialPostLinkRecord;
  });
}

function normalizeSocialCommentRows(rows: Array<Record<string, unknown>>) {
  return rows.map((row) => {
    const author = normalizeRelationObject<
      Pick<ProfileRecord, "id" | "full_name" | "email">
    >(row.author);
    return {
      id: String(row.id ?? ""),
      social_post_id: String(row.social_post_id ?? ""),
      user_id: String(row.user_id ?? row.created_by ?? ""),
      created_by:
        typeof row.created_by === "string" ? String(row.created_by) : null,
      parent_comment_id:
        typeof row.parent_comment_id === "string" ? row.parent_comment_id : null,
      comment: String(row.comment ?? ""),
      created_at: String(row.created_at ?? ""),
      updated_at: String(row.updated_at ?? ""),
      author,
    } satisfies SocialCommentRecord;
  });
}

function normalizeSocialActivityRows(rows: Array<Record<string, unknown>>) {
  return rows.map((row) => {
    const actor = normalizeRelationObject<
      Pick<ProfileRecord, "id" | "full_name" | "email">
    >(row.actor);
    return {
      id: String(row.id ?? ""),
      social_post_id: String(row.social_post_id ?? ""),
      changed_by:
        typeof row.changed_by === "string" ? String(row.changed_by) : null,
      event_type: String(row.event_type ?? ""),
      field_name: typeof row.field_name === "string" ? row.field_name : null,
      old_value: typeof row.old_value === "string" ? row.old_value : null,
      new_value: typeof row.new_value === "string" ? row.new_value : null,
      metadata:
        row.metadata && typeof row.metadata === "object"
          ? (row.metadata as Record<string, unknown>)
          : {},
      changed_at: String(row.changed_at ?? ""),
      actor,
    } satisfies SocialActivityRecord;
  });
}

function SocialPostCard({
  post,
  linkCount,
  onOpen,
}: {
  post: SocialPostWithRelations;
  linkCount: number;
  onOpen: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: post.id,
  });

  const dragStyle = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined;

  return (
    <button
      ref={setNodeRef}
      style={dragStyle}
      type="button"
      className={`w-full rounded-md border border-slate-200 bg-white p-3 text-left shadow-sm transition hover:border-slate-300 hover:bg-slate-50 ${
        isDragging ? "opacity-60" : ""
      }`}
      onClick={onOpen}
      {...attributes}
      {...listeners}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="line-clamp-2 text-sm font-semibold text-slate-900">{post.title}</p>
        <SocialPostStatusBadge status={post.status} />
      </div>
      <p className="mt-1 text-xs text-slate-600">
        {SOCIAL_POST_PRODUCT_LABELS[post.product]} • {SOCIAL_POST_TYPE_LABELS[post.type]}
      </p>
      <p className="mt-1 text-xs text-slate-500">
        Scheduled: {formatDateInput(post.scheduled_date) || "Unscheduled"}
      </p>
      <p className="mt-1 text-xs text-slate-500">
        Platforms:{" "}
        {post.platforms.length > 0
          ? post.platforms.map((platform) => SOCIAL_PLATFORM_LABELS[platform]).join(", ")
          : "—"}
      </p>
      {post.associated_blog ? (
        <p className="mt-1 truncate text-xs text-slate-500">
          Blog: {post.associated_blog.title}
        </p>
      ) : null}
      <p className="mt-2 text-[11px] text-slate-400">{linkCount} published links</p>
    </button>
  );
}

function SocialStatusColumn({
  status,
  posts,
  linksByPost,
  onOpenPost,
}: {
  status: SocialPostStatus;
  posts: SocialPostWithRelations[];
  linksByPost: Record<string, SocialPostLinkRecord[]>;
  onOpenPost: (postId: string) => void;
}) {
  const { isOver, setNodeRef } = useDroppable({
    id: `${STATUS_DROP_ZONE_PREFIX}${status}`,
  });

  return (
    <section
      ref={setNodeRef}
      className={`min-h-80 rounded-lg border border-slate-200 bg-slate-50 p-3 ${
        isOver ? "ring-2 ring-blue-300 ring-offset-1" : ""
      }`}
    >
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-600">
          {SOCIAL_POST_STATUS_LABELS[status]}
        </h3>
        <span className="rounded-full bg-white px-2 py-0.5 text-xs text-slate-500">
          {posts.length}
        </span>
      </div>
      <div className="space-y-2">
        {posts.length === 0 ? (
          <p className="rounded-md border border-dashed border-slate-300 bg-white px-2 py-3 text-xs text-slate-400">
            No posts
          </p>
        ) : (
          posts.map((post) => (
            <SocialPostCard
              key={post.id}
              post={post}
              linkCount={linksByPost[post.id]?.length ?? 0}
              onOpen={() => {
                onOpenPost(post.id);
              }}
            />
          ))
        )}
      </div>
    </section>
  );
}

export default function SocialPostsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { showSuccess } = useSystemFeedback();
  const [posts, setPosts] = useState<SocialPostWithRelations[]>([]);
  const [postLinks, setPostLinks] = useState<SocialPostLinkRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<SocialPostsView>("board");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<SocialPostStatus | "all">("all");
  const [activePostId, setActivePostId] = useState<string | null>(null);
  const [activeMonth, setActiveMonth] = useState(new Date());
  const [listRowLimit, setListRowLimit] = useState<TableRowLimit>(DEFAULT_TABLE_ROW_LIMIT);
  const [listCurrentPage, setListCurrentPage] = useState(1);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newProduct, setNewProduct] = useState<SocialPostProduct>("general_company");
  const [newType, setNewType] = useState<SocialPostType>("image");
  const [isCreating, setIsCreating] = useState(false);

  const [panelForm, setPanelForm] = useState<SocialPostFormState | null>(null);
  const [panelLinksDraft, setPanelLinksDraft] = useState<Record<SocialPlatform, string>>({
    linkedin: "",
    facebook: "",
    instagram: "",
  });
  const [isPanelSaving, setIsPanelSaving] = useState(false);
  const [isLinksSaving, setIsLinksSaving] = useState(false);
  const [panelComments, setPanelComments] = useState<SocialCommentRecord[]>([]);
  const [panelActivity, setPanelActivity] = useState<SocialActivityRecord[]>([]);
  const [panelError, setPanelError] = useState<string | null>(null);
  const [isPanelLoading, setIsPanelLoading] = useState(false);
  const [panelCommentDraft, setPanelCommentDraft] = useState("");
  const [replyToComment, setReplyToComment] = useState<SocialCommentRecord | null>(null);
  const [isCommentSaving, setIsCommentSaving] = useState(false);

  const [blogSearchQuery, setBlogSearchQuery] = useState("");
  const [blogSearchResults, setBlogSearchResults] = useState<BlogLookupResult[]>([]);
  const [isBlogSearchOpen, setIsBlogSearchOpen] = useState(false);
  const [isBlogSearchLoading, setIsBlogSearchLoading] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    })
  );

  const loadPosts = async () => {
    const supabase = getSupabaseBrowserClient();
    setIsLoading(true);
    setError(null);

    const [{ data: postsData, error: postsError }, { data: linksData, error: linksError }] =
      await Promise.all([
        supabase
          .from("social_posts")
          .select(
            "id,title,product,type,canva_url,canva_page,caption,platforms,scheduled_date,status,created_by,created_at,updated_at,associated_blog_id,associated_blog:associated_blog_id(id,title,slug,site),creator:created_by(id,full_name,email)"
          )
          .order("updated_at", { ascending: false }),
        supabase
          .from("social_post_links")
          .select("id,social_post_id,platform,url,created_by,created_at,updated_at")
          .order("created_at", { ascending: true }),
      ]);

    if (postsError) {
      setError(postsError.message);
      setIsLoading(false);
      return;
    }
    if (linksError) {
      setError(linksError.message);
      setIsLoading(false);
      return;
    }

    setPosts(normalizeSocialPostRows((postsData ?? []) as Array<Record<string, unknown>>));
    setPostLinks(
      normalizeSocialPostLinkRows((linksData ?? []) as Array<Record<string, unknown>>)
    );
    setIsLoading(false);
  };

  useEffect(() => {
    void loadPosts();
  }, []);

  const linksByPost = useMemo(() => {
    return postLinks.reduce<Record<string, SocialPostLinkRecord[]>>((acc, link) => {
      if (!acc[link.social_post_id]) {
        acc[link.social_post_id] = [];
      }
      acc[link.social_post_id].push(link);
      return acc;
    }, {});
  }, [postLinks]);

  const filteredPosts = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    return posts.filter((post) => {
      const matchesStatus = statusFilter === "all" || post.status === statusFilter;
      if (!matchesStatus) {
        return false;
      }

      if (!normalizedSearch) {
        return true;
      }

      const haystack = [
        post.title,
        post.caption ?? "",
        post.associated_blog?.title ?? "",
        post.associated_blog?.slug ?? "",
        SOCIAL_POST_PRODUCT_LABELS[post.product],
        SOCIAL_POST_TYPE_LABELS[post.type],
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(normalizedSearch);
    });
  }, [posts, search, statusFilter]);

  const postsByStatus = useMemo(() => {
    return SOCIAL_POST_STATUSES.reduce<Record<SocialPostStatus, SocialPostWithRelations[]>>(
      (acc, status) => {
        acc[status] = filteredPosts
          .filter((post) => post.status === status)
          .sort((left, right) => right.updated_at.localeCompare(left.updated_at));
        return acc;
      },
      {
        idea: [],
        review: [],
        published: [],
      }
    );
  }, [filteredPosts]);

  const listPageCount = useMemo(
    () => getTablePageCount(filteredPosts.length, listRowLimit),
    [filteredPosts.length, listRowLimit]
  );
  const pagedListPosts = useMemo(
    () =>
      getTablePageRows(
        [...filteredPosts].sort((left, right) => right.updated_at.localeCompare(left.updated_at)),
        listCurrentPage,
        listRowLimit
      ),
    [filteredPosts, listCurrentPage, listRowLimit]
  );

  useEffect(() => {
    setListCurrentPage((previous) => Math.min(previous, listPageCount));
  }, [listPageCount]);

  useEffect(() => {
    setListCurrentPage(1);
  }, [search, statusFilter, listRowLimit]);

  const activePost = useMemo(
    () => posts.find((post) => post.id === activePostId) ?? null,
    [activePostId, posts]
  );

  const loadPanelDetails = async (postId: string) => {
    const supabase = getSupabaseBrowserClient();
    setIsPanelLoading(true);
    setPanelError(null);

    const [{ data: commentsData, error: commentsError }, { data: activityData, error: activityError }] =
      await Promise.all([
        supabase
          .from("social_post_comments")
          .select(
            "id,social_post_id,user_id,created_by,parent_comment_id,comment,created_at,updated_at,author:user_id(id,full_name,email)"
          )
          .eq("social_post_id", postId)
          .order("created_at", { ascending: true }),
        supabase
          .from("social_post_activity_history")
          .select(
            "id,social_post_id,changed_by,event_type,field_name,old_value,new_value,metadata,changed_at,actor:changed_by(id,full_name,email)"
          )
          .eq("social_post_id", postId)
          .order("changed_at", { ascending: false })
          .limit(100),
      ]);

    if (commentsError) {
      setPanelError(commentsError.message);
      setPanelComments([]);
      setPanelActivity([]);
      setIsPanelLoading(false);
      return;
    }
    if (activityError) {
      setPanelError(activityError.message);
      setPanelComments([]);
      setPanelActivity([]);
      setIsPanelLoading(false);
      return;
    }

    setPanelComments(
      normalizeSocialCommentRows((commentsData ?? []) as Array<Record<string, unknown>>)
    );
    setPanelActivity(
      normalizeSocialActivityRows((activityData ?? []) as Array<Record<string, unknown>>)
    );
    setIsPanelLoading(false);
  };

  useEffect(() => {
    if (!activePost) {
      setPanelForm(null);
      setPanelLinksDraft({
        linkedin: "",
        facebook: "",
        instagram: "",
      });
      setPanelComments([]);
      setPanelActivity([]);
      setPanelError(null);
      setPanelCommentDraft("");
      setReplyToComment(null);
      setBlogSearchQuery("");
      setBlogSearchResults([]);
      setIsBlogSearchOpen(false);
      return;
    }

    setPanelForm({
      title: activePost.title,
      product: activePost.product,
      type: activePost.type,
      canva_url: activePost.canva_url ?? "",
      canva_page:
        typeof activePost.canva_page === "number" ? String(activePost.canva_page) : "",
      caption: activePost.caption ?? "",
      platforms: activePost.platforms,
      scheduled_date: formatDateInput(activePost.scheduled_date),
      status: activePost.status,
      associated_blog_id: activePost.associated_blog_id,
    });

    const linksForPost = linksByPost[activePost.id] ?? [];
    const linkDraftState: Record<SocialPlatform, string> = {
      linkedin: "",
      facebook: "",
      instagram: "",
    };
    for (const link of linksForPost) {
      linkDraftState[link.platform] = link.url;
    }
    setPanelLinksDraft(linkDraftState);
    setBlogSearchQuery(
      activePost.associated_blog?.title ??
        activePost.associated_blog?.slug ??
        ""
    );
    setIsBlogSearchOpen(false);
    void loadPanelDetails(activePost.id);
  }, [activePost, linksByPost]);

  useEffect(() => {
    const query = blogSearchQuery.trim();
    if (!isBlogSearchOpen || query.length === 0) {
      setBlogSearchResults([]);
      return;
    }

    const timeout = window.setTimeout(() => {
      void (async () => {
        const supabase = getSupabaseBrowserClient();
        setIsBlogSearchLoading(true);
        const { data, error: searchError } = await supabase.rpc("search_blog_lookup", {
          p_query: query,
          p_limit: 8,
        });
        if (searchError) {
          setPanelError(searchError.message);
          setBlogSearchResults([]);
          setIsBlogSearchLoading(false);
          return;
        }
        setBlogSearchResults((data ?? []) as BlogLookupResult[]);
        setIsBlogSearchLoading(false);
      })();
    }, 220);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [blogSearchQuery, isBlogSearchOpen]);

  const calendarRange = useMemo(() => {
    const monthStart = startOfMonth(activeMonth);
    return {
      start: startOfWeek(monthStart, { weekStartsOn: 1 }),
      end: endOfWeek(endOfMonth(activeMonth), { weekStartsOn: 1 }),
    };
  }, [activeMonth]);

  const calendarDays = useMemo(
    () =>
      eachDayOfInterval({
        start: calendarRange.start,
        end: calendarRange.end,
      }),
    [calendarRange.end, calendarRange.start]
  );

  const calendarPostsByDate = useMemo(() => {
    return filteredPosts.reduce<Record<string, SocialPostWithRelations[]>>((acc, post) => {
      if (!post.scheduled_date) {
        return acc;
      }
      if (!acc[post.scheduled_date]) {
        acc[post.scheduled_date] = [];
      }
      acc[post.scheduled_date].push(post);
      return acc;
    }, {});
  }, [filteredPosts]);

  const unscheduledPosts = useMemo(
    () => filteredPosts.filter((post) => !post.scheduled_date),
    [filteredPosts]
  );
  const activeFilterPills = useMemo(
    () =>
      [
        search.trim().length > 0
          ? {
              id: "search",
              label: `Search: ${search.trim()}`,
              onRemove: () => {
                setSearch("");
              },
            }
          : null,
        statusFilter !== "all"
          ? {
              id: "status",
              label: `Status: ${SOCIAL_POST_STATUS_LABELS[statusFilter]}`,
              onRemove: () => {
                setStatusFilter("all");
              },
            }
          : null,
      ].filter((pill) => pill !== null),
    [search, statusFilter]
  );

  const activePostLinks = useMemo(
    () => (activePost ? linksByPost[activePost.id] ?? [] : []),
    [activePost, linksByPost]
  );

  const commentChildren = useMemo(() => {
    return panelComments.reduce<Record<string, SocialCommentRecord[]>>((acc, comment) => {
      const key = comment.parent_comment_id ?? "root";
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(comment);
      return acc;
    }, {});
  }, [panelComments]);

  const handleCreatePost = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!user?.id) {
      setError("You must be logged in.");
      return;
    }

    const trimmedTitle = newTitle.trim();
    if (!trimmedTitle) {
      setError("Title is required.");
      return;
    }

    setIsCreating(true);
    setError(null);

    const supabase = getSupabaseBrowserClient();
    const { data, error: insertError } = await supabase
      .from("social_posts")
      .insert({
        title: trimmedTitle,
        product: newProduct,
        type: newType,
        status: "idea",
        platforms: [],
        created_by: user.id,
      })
      .select(
        "id,title,product,type,canva_url,canva_page,caption,platforms,scheduled_date,status,created_by,created_at,updated_at,associated_blog_id,associated_blog:associated_blog_id(id,title,slug,site),creator:created_by(id,full_name,email)"
      )
      .single();

    if (insertError) {
      setError(insertError.message);
      setIsCreating(false);
      return;
    }

    const [createdPost] = normalizeSocialPostRows([
      (data ?? {}) as Record<string, unknown>,
    ]);
    if (createdPost) {
      setPosts((previous) => [createdPost, ...previous]);
      router.push(`/social-posts/${createdPost.id}`);
    }
    setNewTitle("");
    setNewProduct("general_company");
    setNewType("image");
    setIsCreateModalOpen(false);
    showSuccess("Social post created.");
    setIsCreating(false);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const overId = event.over ? String(event.over.id) : null;
    if (!overId || !overId.startsWith(STATUS_DROP_ZONE_PREFIX)) {
      return;
    }
    const nextStatus = overId.replace(
      STATUS_DROP_ZONE_PREFIX,
      ""
    ) as SocialPostStatus;
    const postId = String(event.active.id);
    const post = posts.find((entry) => entry.id === postId);
    if (!post || post.status === nextStatus) {
      return;
    }

    const supabase = getSupabaseBrowserClient();
    const { error: updateError } = await supabase
      .from("social_posts")
      .update({ status: nextStatus })
      .eq("id", post.id);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setPosts((previous) =>
      previous.map((entry) =>
        entry.id === post.id ? { ...entry, status: nextStatus } : entry
      )
    );
    setPanelForm((previous) =>
      previous ? { ...previous, status: nextStatus } : previous
    );
    showSuccess(`Moved post to ${SOCIAL_POST_STATUS_LABELS[nextStatus]}.`);
    if (activePostId === post.id) {
      void loadPanelDetails(post.id);
    }
  };

  const handleSavePostDetails = async () => {
    if (!activePost || !panelForm) {
      return;
    }
    const trimmedTitle = panelForm.title.trim();
    if (!trimmedTitle) {
      setPanelError("Title is required.");
      return;
    }

    setIsPanelSaving(true);
    setPanelError(null);
    setError(null);

    const canvaPageRaw = panelForm.canva_page.trim();
    const canvaPage =
      canvaPageRaw.length > 0 && !Number.isNaN(Number(canvaPageRaw))
        ? Math.max(1, Number(canvaPageRaw))
        : null;
    const normalizedPlatforms = Array.from(new Set(panelForm.platforms));
    const supabase = getSupabaseBrowserClient();

    const { data, error: updateError } = await supabase
      .from("social_posts")
      .update({
        title: trimmedTitle,
        product: panelForm.product,
        type: panelForm.type,
        canva_url: panelForm.canva_url.trim() || null,
        canva_page: canvaPage,
        caption: panelForm.caption.trim() || null,
        platforms: normalizedPlatforms,
        scheduled_date: panelForm.scheduled_date || null,
        status: panelForm.status,
        associated_blog_id: panelForm.associated_blog_id,
      })
      .eq("id", activePost.id)
      .select(
        "id,title,product,type,canva_url,canva_page,caption,platforms,scheduled_date,status,created_by,created_at,updated_at,associated_blog_id,associated_blog:associated_blog_id(id,title,slug,site),creator:created_by(id,full_name,email)"
      )
      .single();

    if (updateError) {
      setPanelError(updateError.message);
      setIsPanelSaving(false);
      return;
    }

    const [updatedPost] = normalizeSocialPostRows([
      (data ?? {}) as Record<string, unknown>,
    ]);
    if (updatedPost) {
      setPosts((previous) =>
        previous.map((entry) => (entry.id === updatedPost.id ? updatedPost : entry))
      );
    }
    showSuccess("Social post details saved.");
    await loadPanelDetails(activePost.id);
    setIsPanelSaving(false);
  };

  const handleSaveLinks = async () => {
    if (!activePost || !user?.id) {
      return;
    }
    setIsLinksSaving(true);
    setPanelError(null);

    const existingByPlatform = new Map<SocialPlatform, SocialPostLinkRecord>(
      activePostLinks.map((link) => [link.platform, link])
    );
    const supabase = getSupabaseBrowserClient();

    try {
      for (const platform of SOCIAL_PLATFORMS) {
        const nextUrl = (panelLinksDraft[platform] ?? "").trim();
        const existing = existingByPlatform.get(platform) ?? null;

        if (!nextUrl && existing) {
          const { error: deleteError } = await supabase
            .from("social_post_links")
            .delete()
            .eq("id", existing.id);
          if (deleteError) {
            throw new Error(deleteError.message);
          }
          continue;
        }

        if (!nextUrl) {
          continue;
        }

        const { error: upsertError } = await supabase
          .from("social_post_links")
          .upsert(
            {
              social_post_id: activePost.id,
              platform,
              url: nextUrl,
              created_by: user.id,
            },
            { onConflict: "social_post_id,platform" }
          );
        if (upsertError) {
          throw new Error(upsertError.message);
        }
      }

      const { data: linksData, error: linksError } = await supabase
        .from("social_post_links")
        .select("id,social_post_id,platform,url,created_by,created_at,updated_at")
        .eq("social_post_id", activePost.id)
        .order("created_at", { ascending: true });
      if (linksError) {
        throw new Error(linksError.message);
      }

      const normalizedLinks = normalizeSocialPostLinkRows(
        (linksData ?? []) as Array<Record<string, unknown>>
      );
      setPostLinks((previous) => [
        ...previous.filter((link) => link.social_post_id !== activePost.id),
        ...normalizedLinks,
      ]);
      await loadPanelDetails(activePost.id);
      showSuccess("Published links saved.");
    } catch (saveError) {
      setPanelError(
        saveError instanceof Error ? saveError.message : "Failed to save links."
      );
    } finally {
      setIsLinksSaving(false);
    }
  };

  const handleAddComment = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!activePost || !user?.id) {
      return;
    }
    const trimmedComment = panelCommentDraft.trim();
    if (!trimmedComment) {
      setPanelError("Comment cannot be empty.");
      return;
    }

    setIsCommentSaving(true);
    setPanelError(null);

    const supabase = getSupabaseBrowserClient();
    const { error: insertError } = await supabase.from("social_post_comments").insert({
      social_post_id: activePost.id,
      comment: trimmedComment,
      user_id: user.id,
      parent_comment_id: replyToComment?.id ?? null,
    });

    if (insertError) {
      setPanelError(insertError.message);
      setIsCommentSaving(false);
      return;
    }

    setPanelCommentDraft("");
    setReplyToComment(null);
    await loadPanelDetails(activePost.id);
    showSuccess("Comment added.");
    setIsCommentSaving(false);
  };

  const openPostPanel = (postId: string) => {
    setActivePostId(postId);
    setPanelError(null);
  };

  const renderCommentTree = (parentId: string | null, depth: number) => {
    const comments = commentChildren[parentId ?? "root"] ?? [];
    if (comments.length === 0) {
      return null;
    }

    return (
      <ul className={depth === 0 ? "space-y-2" : "mt-2 space-y-2 border-l border-slate-200 pl-3"}>
        {comments.map((comment) => (
          <li
            key={comment.id}
            className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2"
          >
            <p className="text-xs font-semibold text-slate-600">
              {comment.author?.full_name ?? "Unknown"} —{" "}
              {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
            </p>
            <p className="mt-1 whitespace-pre-wrap text-sm text-slate-800">
              {comment.comment}
            </p>
            <div className="mt-2">
              <Button
                type="button"
                variant="secondary"
                size="xs"
                onClick={() => {
                  setReplyToComment(comment);
                }}
              >
                Reply
              </Button>
            </div>
            {renderCommentTree(comment.id, depth + 1)}
          </li>
        ))}
      </ul>
    );
  };

  return (
    <ProtectedPage>
      <AppShell>
        <div className="space-y-5">
          <DataPageHeader
            title="Social Posts"
            description="Keep each social post in one card from idea to published links."
            primaryAction={
              <Button
                type="button"
                variant="primary"
                size="md"
                onClick={() => {
                  setIsCreateModalOpen(true);
                }}
              >
                New Social Post
              </Button>
            }
          />

          <DataPageToolbar
            searchValue={search}
            onSearchChange={setSearch}
            searchPlaceholder="Search title, caption, blog..."
            actions={
              <div className="inline-flex items-center rounded-md border border-slate-300 bg-white p-0.5">
                {(["board", "list", "calendar"] as SocialPostsView[]).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    className={`rounded px-3 py-1.5 text-sm font-medium ${
                      view === mode
                        ? "bg-slate-900 text-white"
                        : "text-slate-700 hover:bg-slate-100"
                    }`}
                    onClick={() => {
                      setView(mode);
                    }}
                  >
                    {toTitleCase(mode)}
                  </button>
                ))}
              </div>
            }
            filters={
              <label className="space-y-1 text-xs font-medium uppercase tracking-wide text-slate-500">
                Status
                <select
                  value={statusFilter}
                  onChange={(event) => {
                    setStatusFilter(event.target.value as SocialPostStatus | "all");
                  }}
                  className="focus-field w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-normal normal-case tracking-normal text-slate-700"
                >
                  <option value="all">All Statuses</option>
                  {SOCIAL_POST_STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {SOCIAL_POST_STATUS_LABELS[status]}
                    </option>
                  ))}
                </select>
              </label>
            }
          />
          <DataPageFilterPills pills={activeFilterPills} />

          {error ? (
            <p className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {error}
            </p>
          ) : null}

          {isLoading ? (
            <p className="rounded-md border border-slate-200 bg-slate-50 px-4 py-5 text-sm text-slate-500">
              Loading social posts…
            </p>
          ) : view === "board" ? (
            <DndContext sensors={sensors} onDragEnd={(event) => void handleDragEnd(event)}>
              <section className="grid gap-3 xl:grid-cols-3">
                {SOCIAL_POST_STATUSES.map((status) => (
                  <SocialStatusColumn
                    key={status}
                    status={status}
                    posts={postsByStatus[status]}
                    linksByPost={linksByPost}
                    onOpenPost={openPostPanel}
                  />
                ))}
              </section>
            </DndContext>
          ) : view === "list" ? (
            <section className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
                <TableResultsSummary
                  totalRows={filteredPosts.length}
                  currentPage={listCurrentPage}
                  rowLimit={listRowLimit}
                  noun="social posts"
                />
                <TableRowLimitSelect
                  value={listRowLimit}
                  onChange={(value) => {
                    setListRowLimit(value);
                  }}
                />
              </div>
              <div className="overflow-auto rounded-lg border border-slate-200">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead className="bg-slate-100 text-left text-xs uppercase tracking-wide text-slate-600">
                    <tr>
                      <th className="px-3 py-2">Title</th>
                      <th className="px-3 py-2 text-center">Status</th>
                      <th className="px-3 py-2">Product</th>
                      <th className="px-3 py-2">Type</th>
                      <th className="px-3 py-2">Scheduled</th>
                      <th className="px-3 py-2">Platforms</th>
                      <th className="px-3 py-2">Associated Blog</th>
                      <th className="px-3 py-2">Updated</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {pagedListPosts.length === 0 ? (
                      <tr>
                        <td className="px-3 py-4 text-center text-slate-500" colSpan={8}>
                          No social posts found.
                        </td>
                      </tr>
                    ) : (
                      pagedListPosts.map((post) => (
                        <tr
                          key={post.id}
                          className="cursor-pointer hover:bg-slate-50"
                          onClick={() => {
                            openPostPanel(post.id);
                          }}
                        >
                          <td className="px-3 py-2 font-medium text-slate-900">{post.title}</td>
                          <td className="px-3 py-2 text-center">
                            <SocialPostStatusBadge status={post.status} />
                          </td>
                          <td className="px-3 py-2 text-slate-700">
                            {SOCIAL_POST_PRODUCT_LABELS[post.product]}
                          </td>
                          <td className="px-3 py-2 text-slate-700">
                            {SOCIAL_POST_TYPE_LABELS[post.type]}
                          </td>
                          <td className="px-3 py-2 text-slate-700">
                            {formatDateInput(post.scheduled_date) || "—"}
                          </td>
                          <td className="px-3 py-2 text-slate-700">
                            {post.platforms.length > 0
                              ? post.platforms
                                  .map((platform) => SOCIAL_PLATFORM_LABELS[platform])
                                  .join(", ")
                              : "—"}
                          </td>
                          <td className="px-3 py-2 text-slate-700">
                            {post.associated_blog?.title ?? "—"}
                          </td>
                          <td className="px-3 py-2 text-slate-500">
                            {formatDistanceToNow(new Date(post.updated_at), {
                              addSuffix: true,
                            })}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              <div className="flex justify-end rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
                <TablePaginationControls
                  currentPage={listCurrentPage}
                  pageCount={listPageCount}
                  onPageChange={setListCurrentPage}
                />
              </div>
            </section>
          ) : (
            <section className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-medium text-slate-700">
                  {format(activeMonth, "MMMM yyyy")}
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    size="md"
                    onClick={() => {
                      setActiveMonth((previous) => subMonths(previous, 1));
                    }}
                  >
                    Prev
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    size="md"
                    onClick={() => {
                      setActiveMonth(new Date());
                    }}
                  >
                    Today
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    size="md"
                    onClick={() => {
                      setActiveMonth((previous) => addMonths(previous, 1));
                    }}
                  >
                    Next
                  </Button>
                </div>
              </div>
              <div className="grid grid-cols-7 gap-2">
                {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((label) => (
                  <p
                    key={label}
                    className="text-center text-xs font-semibold uppercase tracking-wide text-slate-500"
                  >
                    {label}
                  </p>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-2">
                {calendarDays.map((day) => {
                  const key = format(day, "yyyy-MM-dd");
                  const items = calendarPostsByDate[key] ?? [];
                  const isCurrentMonth = day.getMonth() === activeMonth.getMonth();
                  const isToday = isSameDay(day, new Date());
                  return (
                    <article
                      key={key}
                      className={`min-h-28 rounded-md border p-2 ${
                        isCurrentMonth
                          ? "border-slate-200 bg-white"
                          : "border-slate-100 bg-slate-50"
                      } ${isToday ? "border-blue-300 bg-blue-50" : ""}`}
                    >
                      <p
                        className={`text-sm ${
                          isToday ? "font-semibold text-blue-700" : "text-slate-700"
                        }`}
                      >
                        {format(day, "d")}
                      </p>
                      <div className="mt-2 space-y-1">
                        {items.length === 0 ? (
                          <p className="text-xs text-slate-400">No posts</p>
                        ) : (
                          items.map((post) => (
                            <button
                              key={post.id}
                              type="button"
                              className="block w-full rounded border border-slate-200 bg-slate-50 px-2 py-1 text-left text-xs text-slate-700 hover:bg-slate-100"
                              onClick={() => {
                                openPostPanel(post.id);
                              }}
                            >
                              <p className="truncate font-medium">{post.title}</p>
                              <p className="text-[10px] text-slate-500">
                                {SOCIAL_POST_STATUS_LABELS[post.status]}
                              </p>
                            </button>
                          ))
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
              <section className="space-y-2">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                  Unscheduled
                </h3>
                {unscheduledPosts.length === 0 ? (
                  <p className="rounded-md border border-slate-200 bg-slate-50 px-3 py-4 text-sm text-slate-500">
                    All visible posts have a scheduled date.
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {unscheduledPosts.map((post) => (
                      <li
                        key={post.id}
                        className="rounded-md border border-slate-200 px-3 py-2"
                      >
                        <button
                          type="button"
                          className="flex w-full items-center justify-between gap-2 text-left"
                          onClick={() => {
                            openPostPanel(post.id);
                          }}
                        >
                          <span className="font-medium text-slate-900">{post.title}</span>
                          <SocialPostStatusBadge status={post.status} />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </section>
          )}
        </div>

        {activePost && panelForm ? (
          <>
            <button
              type="button"
              aria-label="Close social post panel"
              className="fixed inset-0 z-30 bg-slate-900/25"
              onClick={() => {
                setActivePostId(null);
              }}
            />
            <aside className="fixed inset-y-0 right-0 z-40 w-full max-w-2xl overflow-y-auto border-l border-slate-200 bg-white p-4 shadow-2xl">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">{activePost.title}</h3>
                  <p className="text-sm text-slate-600">
                    Created {format(new Date(activePost.created_at), "PPp")}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      router.push(`/social-posts/${activePost.id}`);
                    }}
                  >
                    Open dedicated page
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      setActivePostId(null);
                    }}
                  >
                    Close
                  </Button>
                </div>
              </div>

              {panelError ? (
                <p className="mt-4 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                  {panelError}
                </p>
              ) : null}

              <section className="mt-4 space-y-3 rounded-lg border border-slate-200 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h4 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                    Social Post Details
                  </h4>
                  <SocialPostStatusBadge status={panelForm.status} />
                </div>

                <label className="block">
                  <span className="mb-1 block text-sm font-medium text-slate-700">Title</span>
                  <input
                    value={panelForm.title}
                    onChange={(event) => {
                      setPanelForm((previous) =>
                        previous ? { ...previous, title: event.target.value } : previous
                      );
                    }}
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  />
                </label>

                <div className="grid gap-3 md:grid-cols-3">
                  <label className="block">
                    <span className="mb-1 block text-sm font-medium text-slate-700">Status</span>
                    <select
                      value={panelForm.status}
                      onChange={(event) => {
                        setPanelForm((previous) =>
                          previous
                            ? {
                                ...previous,
                                status: event.target.value as SocialPostStatus,
                              }
                            : previous
                        );
                      }}
                      className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                    >
                      {SOCIAL_POST_STATUSES.map((status) => (
                        <option key={status} value={status}>
                          {SOCIAL_POST_STATUS_LABELS[status]}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-sm font-medium text-slate-700">
                      Product
                    </span>
                    <select
                      value={panelForm.product}
                      onChange={(event) => {
                        setPanelForm((previous) =>
                          previous
                            ? {
                                ...previous,
                                product: event.target.value as SocialPostProduct,
                              }
                            : previous
                        );
                      }}
                      className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                    >
                      {SOCIAL_POST_PRODUCTS.map((product) => (
                        <option key={product} value={product}>
                          {SOCIAL_POST_PRODUCT_LABELS[product]}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-sm font-medium text-slate-700">Type</span>
                    <select
                      value={panelForm.type}
                      onChange={(event) => {
                        setPanelForm((previous) =>
                          previous
                            ? {
                                ...previous,
                                type: event.target.value as SocialPostType,
                              }
                            : previous
                        );
                      }}
                      className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                    >
                      {SOCIAL_POST_TYPES.map((type) => (
                        <option key={type} value={type}>
                          {SOCIAL_POST_TYPE_LABELS[type]}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <label className="block">
                    <span className="mb-1 block text-sm font-medium text-slate-700">
                      Canva URL
                    </span>
                    <input
                      type="url"
                      value={panelForm.canva_url}
                      onChange={(event) => {
                        setPanelForm((previous) =>
                          previous ? { ...previous, canva_url: event.target.value } : previous
                        );
                      }}
                      className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                      placeholder="https://www.canva.com/..."
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-sm font-medium text-slate-700">
                      Canva Page Number
                    </span>
                    <input
                      type="number"
                      min={1}
                      value={panelForm.canva_page}
                      onChange={(event) => {
                        setPanelForm((previous) =>
                          previous ? { ...previous, canva_page: event.target.value } : previous
                        );
                      }}
                      className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                    />
                  </label>
                </div>

                <label className="block">
                  <span className="mb-1 block text-sm font-medium text-slate-700">Platforms</span>
                  <div className="flex flex-wrap gap-2">
                    {SOCIAL_PLATFORMS.map((platform) => {
                      const isSelected = panelForm.platforms.includes(platform);
                      return (
                        <button
                          key={platform}
                          type="button"
                          className={`rounded-full border px-3 py-1 text-xs font-medium ${
                            isSelected
                              ? "border-slate-900 bg-slate-900 text-white"
                              : "border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
                          }`}
                          onClick={() => {
                            setPanelForm((previous) => {
                              if (!previous) {
                                return previous;
                              }
                              const nextPlatforms = previous.platforms.includes(platform)
                                ? previous.platforms.filter((entry) => entry !== platform)
                                : [...previous.platforms, platform];
                              return { ...previous, platforms: nextPlatforms };
                            });
                          }}
                        >
                          {SOCIAL_PLATFORM_LABELS[platform]}
                        </button>
                      );
                    })}
                  </div>
                </label>

                <label className="block">
                  <span className="mb-1 block text-sm font-medium text-slate-700">
                    Scheduled Date
                  </span>
                  <input
                    type="date"
                    value={panelForm.scheduled_date}
                    onChange={(event) => {
                      setPanelForm((previous) =>
                        previous
                          ? { ...previous, scheduled_date: event.target.value }
                          : previous
                      );
                    }}
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  />
                </label>

                <label className="block">
                  <span className="mb-1 block text-sm font-medium text-slate-700">
                    Caption / Write-up
                  </span>
                  <textarea
                    value={panelForm.caption}
                    onChange={(event) => {
                      setPanelForm((previous) =>
                        previous ? { ...previous, caption: event.target.value } : previous
                      );
                    }}
                    className="min-h-28 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                    placeholder="Main social caption..."
                  />
                </label>

                <label className="block">
                  <span className="mb-1 block text-sm font-medium text-slate-700">
                    Associated Blog
                  </span>
                  <input
                    value={blogSearchQuery}
                    onFocus={() => {
                      setIsBlogSearchOpen(true);
                    }}
                    onChange={(event) => {
                      setBlogSearchQuery(event.target.value);
                      setIsBlogSearchOpen(true);
                    }}
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                    placeholder="Search blog title or slug..."
                  />
                  {panelForm.associated_blog_id ? (
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-600">
                      <span>Linked blog ID: {panelForm.associated_blog_id}</span>
                      <button
                        type="button"
                        className="rounded border border-slate-300 bg-white px-2 py-1 font-medium text-slate-700 hover:bg-slate-100"
                        onClick={() => {
                          setPanelForm((previous) =>
                            previous ? { ...previous, associated_blog_id: null } : previous
                          );
                          setBlogSearchQuery("");
                          setBlogSearchResults([]);
                          setIsBlogSearchOpen(false);
                        }}
                      >
                        Clear
                      </button>
                    </div>
                  ) : null}
                  {isBlogSearchOpen ? (
                    <div className="mt-2 max-h-52 overflow-y-auto rounded-md border border-slate-200 bg-white">
                      {isBlogSearchLoading ? (
                        <p className="px-3 py-2 text-sm text-slate-500">Searching blogs…</p>
                      ) : blogSearchResults.length === 0 ? (
                        <p className="px-3 py-2 text-sm text-slate-500">No matching blogs.</p>
                      ) : (
                        blogSearchResults.map((blog) => (
                          <button
                            key={blog.id}
                            type="button"
                            className="block w-full border-b border-slate-100 px-3 py-2 text-left last:border-b-0 hover:bg-slate-50"
                            onClick={() => {
                              setPanelForm((previous) =>
                                previous
                                  ? { ...previous, associated_blog_id: blog.id }
                                  : previous
                              );
                              setBlogSearchQuery(blog.title);
                              setBlogSearchResults([]);
                              setIsBlogSearchOpen(false);
                            }}
                          >
                            <p className="text-sm font-medium text-slate-900">{blog.title}</p>
                            <p className="text-xs text-slate-500">
                              {blog.slug || "no-slug"} • {blog.site}
                            </p>
                          </button>
                        ))
                      )}
                    </div>
                  ) : null}
                </label>

                <div className="flex justify-end">
                  <button
                    type="button"
                    disabled={isPanelSaving}
                    className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
                    onClick={() => {
                      void handleSavePostDetails();
                    }}
                  >
                    {isPanelSaving ? "Saving..." : "Save Details"}
                  </button>
                </div>
              </section>

              <section className="mt-4 space-y-3 rounded-lg border border-slate-200 p-4">
                <h4 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                  Published Links
                </h4>
                {SOCIAL_PLATFORMS.map((platform) => (
                  <label key={platform} className="block">
                    <span className="mb-1 block text-sm font-medium text-slate-700">
                      {SOCIAL_PLATFORM_LABELS[platform]}
                    </span>
                    <input
                      type="url"
                      value={panelLinksDraft[platform] ?? ""}
                      onChange={(event) => {
                        setPanelLinksDraft((previous) => ({
                          ...previous,
                          [platform]: event.target.value,
                        }));
                      }}
                      className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                      placeholder={`https://${platform}.com/...`}
                    />
                  </label>
                ))}
                {activePostLinks.length > 0 ? (
                  <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
                    <p className="font-medium text-slate-700">Current links</p>
                    <ul className="mt-1 space-y-1">
                      {activePostLinks.map((link) => (
                        <li key={link.id} className="truncate">
                          {SOCIAL_PLATFORM_LABELS[link.platform]}:{" "}
                          <Link
                            href={link.url}
                            target="_blank"
                            className="text-blue-600 underline"
                          >
                            {link.url}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                <div className="flex justify-end">
                  <button
                    type="button"
                    disabled={isLinksSaving}
                    className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                    onClick={() => {
                      void handleSaveLinks();
                    }}
                  >
                    {isLinksSaving ? "Saving..." : "Save Links"}
                  </button>
                </div>
              </section>

              <section className="mt-4 rounded-lg border border-slate-200 p-4">
                <h4 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                  Comments
                </h4>
                <form className="mt-3 space-y-2" onSubmit={handleAddComment}>
                  {replyToComment ? (
                    <div className="flex items-center justify-between rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-700">
                      <span>
                        Replying to {replyToComment.author?.full_name ?? "comment"}
                      </span>
                      <button
                        type="button"
                        className="font-semibold"
                        onClick={() => {
                          setReplyToComment(null);
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  ) : null}
                  <textarea
                    value={panelCommentDraft}
                    onChange={(event) => {
                      setPanelCommentDraft(event.target.value);
                    }}
                    className="min-h-24 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                    placeholder="Add discussion or feedback..."
                  />
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={isCommentSaving}
                      className="rounded-md bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isCommentSaving ? "Adding..." : "Add Comment"}
                    </button>
                  </div>
                </form>
                <div className="mt-3">
                  {panelComments.length === 0 ? (
                    <p className="text-sm text-slate-500">No comments yet.</p>
                  ) : (
                    renderCommentTree(null, 0)
                  )}
                </div>
              </section>

              <section className="mt-4 rounded-lg border border-slate-200 p-4">
                <h4 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                  Activity History
                </h4>
                {isPanelLoading ? (
                  <p className="mt-3 text-sm text-slate-500">Loading activity…</p>
                ) : panelActivity.length === 0 ? (
                  <p className="mt-3 text-sm text-slate-500">No activity yet.</p>
                ) : (
                  <ul className="mt-3 space-y-2">
                    {panelActivity.map((entry) => (
                      <li
                        key={entry.id}
                        className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2"
                      >
                        <p className="text-sm font-medium text-slate-800">
                          {toTitleCase(entry.event_type)}
                        </p>
                        <p className="text-xs text-slate-500">
                          {entry.field_name ? `${entry.field_name}: ` : ""}
                          {entry.old_value ?? "—"} → {entry.new_value ?? "—"}
                        </p>
                        <p className="text-xs text-slate-400">
                          {entry.actor?.full_name ?? "System"} •{" "}
                          {format(new Date(entry.changed_at), "PPp")}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </aside>
          </>
        ) : null}

        {isCreateModalOpen ? (
          <div className="fixed inset-0 z-40 flex items-center justify-center p-4">
            <button
              type="button"
              aria-label="Close social post modal"
              className="absolute inset-0 bg-slate-900/30"
              onClick={() => {
                if (!isCreating) {
                  setIsCreateModalOpen(false);
                }
              }}
            />
            <div className="relative z-10 w-full max-w-lg rounded-lg border border-slate-200 bg-white p-5 shadow-xl">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-base font-semibold text-slate-900">New Social Post</h3>
                  <p className="mt-1 text-sm text-slate-600">
                    Create a single card and move it from Idea to Published.
                  </p>
                </div>
                <button
                  type="button"
                  className="rounded-md border border-slate-300 px-2 py-1 text-sm text-slate-700 hover:bg-slate-50"
                  onClick={() => {
                    if (!isCreating) {
                      setIsCreateModalOpen(false);
                    }
                  }}
                >
                  Close
                </button>
              </div>
              <form className="mt-4 space-y-4" onSubmit={handleCreatePost}>
                <label className="block">
                  <span className="mb-1 block text-sm font-medium text-slate-700">Title</span>
                  <input
                    value={newTitle}
                    onChange={(event) => {
                      setNewTitle(event.target.value);
                    }}
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                    required
                    maxLength={200}
                  />
                </label>
                <div className="grid gap-3 md:grid-cols-2">
                  <label className="block">
                    <span className="mb-1 block text-sm font-medium text-slate-700">
                      Product
                    </span>
                    <select
                      value={newProduct}
                      onChange={(event) => {
                        setNewProduct(event.target.value as SocialPostProduct);
                      }}
                      className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                    >
                      {SOCIAL_POST_PRODUCTS.map((product) => (
                        <option key={product} value={product}>
                          {SOCIAL_POST_PRODUCT_LABELS[product]}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-sm font-medium text-slate-700">Type</span>
                    <select
                      value={newType}
                      onChange={(event) => {
                        setNewType(event.target.value as SocialPostType);
                      }}
                      className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                    >
                      {SOCIAL_POST_TYPES.map((type) => (
                        <option key={type} value={type}>
                          {SOCIAL_POST_TYPE_LABELS[type]}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="submit"
                    disabled={isCreating}
                    className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isCreating ? "Creating..." : "Create Post"}
                  </button>
                  <button
                    type="button"
                    className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                    onClick={() => {
                      if (!isCreating) {
                        setIsCreateModalOpen(false);
                      }
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        ) : null}
      </AppShell>
    </ProtectedPage>
  );
}
