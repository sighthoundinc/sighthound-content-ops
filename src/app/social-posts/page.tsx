"use client";

import { FormEvent, Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
import { CalendarTile } from "@/components/calendar-tile";
import { DataTable, type DataTableColumn } from "@/components/data-table";
import {
  DATA_PAGE_CONTROL_STRIP_CLASS,
  DATA_PAGE_STACK_CLASS,
  DATA_PAGE_TABLE_SECTION_CLASS,
  DataPageFilterPills,
  DataPageHeader,
  DataPageToolbar,
} from "@/components/data-page";
import { ExternalLink } from "@/components/external-link";
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
  SOCIAL_POST_ALLOWED_TRANSITIONS,
  SOCIAL_POST_PRODUCTS,
  SOCIAL_POST_PRODUCT_LABELS,
  SOCIAL_POST_STATUSES,
  SOCIAL_POST_STATUS_LABELS,
  SOCIAL_POST_TYPES,
  SOCIAL_POST_TYPE_LABELS,
} from "@/lib/status";
import { socialPostStatusChangedNotification } from "@/lib/notification-helpers";
import { getUserRoles } from "@/lib/roles";
import {
  SEGMENTED_CONTROL_CLASS,
  segmentedControlItemClass,
} from "@/lib/segmented-control";
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
import { formatDateInput, formatDisplayDate, toTitleCase } from "@/lib/utils";
import { formatDateInTimezone } from "@/lib/format-date";
import {
  formatActivityChangeDescription,
  formatActivityEventTitle,
} from "@/lib/activity-history-format";
import { useAuth } from "@/providers/auth-provider";
import { useNotifications } from "@/providers/notifications-provider";
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

function isExecutionStage(status: SocialPostStatus) {
  return status === "ready_to_publish" || status === "awaiting_live_link";
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
      status: (row.status as SocialPostStatus) ?? "draft",
      created_by: String(row.created_by ?? ""),
      editor_user_id: typeof row.editor_user_id === "string" ? row.editor_user_id : null,
      admin_owner_id: typeof row.admin_owner_id === "string" ? row.admin_owner_id : null,
      last_live_link_reminder_at: typeof row.last_live_link_reminder_at === "string" ? row.last_live_link_reminder_at : null,
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
  onDelete,
  isDeleting,
}: {
  post: SocialPostWithRelations;
  linkCount: number;
  onOpen: () => void;
  onDelete: (postId: string) => void;
  isDeleting: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: post.id,
  });
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const dragStyle = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined;

  const handleDelete = (event: React.MouseEvent) => {
    event.stopPropagation();
    setIsMenuOpen(false);
    onDelete(post.id);
  };

  return (
    <div
      ref={setNodeRef}
      style={dragStyle}
      className={`relative rounded-md border border-slate-200 bg-white shadow-sm transition ${
        isDragging ? "opacity-60" : ""
      }`}
    >
      <button
        type="button"
        className="block w-full rounded-md p-3 text-left hover:border-slate-300 hover:bg-slate-50"
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
          Scheduled: {formatDisplayDate(post.scheduled_date) || "Unscheduled"}
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
      <div className="absolute right-2 top-2">
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            setIsMenuOpen(!isMenuOpen);
          }}
          className="rounded px-2 py-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          aria-label="Open row actions"
        >
          <span className="text-lg leading-none">⋯</span>
        </button>
        {isMenuOpen ? (
          <div
            className="absolute right-0 top-full z-20 mt-1 w-36 rounded-md border border-slate-200 bg-white py-1 shadow-lg"
            onClick={(event) => {
              event.stopPropagation();
            }}
          >
            <button
              type="button"
              disabled={isDeleting || post.status === "published"}
              onClick={handleDelete}
              title={post.status === "published" ? "Published posts cannot be deleted" : ""}
              className="block w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:text-slate-400"
            >
              {isDeleting ? "Deleting…" : "Delete"}
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default function SocialPostsPage() {
  return (
    <Suspense fallback={null}>
      <SocialPostsPageContent />
    </Suspense>
  );
}

function SocialStatusColumn({
  status,
  posts,
  linksByPost,
  onOpenPost,
  onDeletePost,
  isDeletingPost,
}: {
  status: SocialPostStatus;
  posts: SocialPostWithRelations[];
  linksByPost: Record<string, SocialPostLinkRecord[]>;
  onOpenPost: (postId: string) => void;
  onDeletePost: (postId: string) => void;
  isDeletingPost: boolean;
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
              onDelete={onDeletePost}
              isDeleting={isDeletingPost}
            />
          ))
        )}
      </div>
    </section>
  );
}

function SocialPostsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { profile, session, user } = useAuth();
  const { pushNotification } = useNotifications();
  const userRoles = useMemo(() => getUserRoles(profile), [profile]);
  const isAdmin = userRoles.includes("admin");
  const { showError, showSuccess } = useSystemFeedback();
  const requestedView = searchParams.get("view");
  const shouldOpenCreateModal = searchParams.get("create") === "1";
  const requestedTitle = searchParams.get("title");
  const requestedScheduledDate = searchParams.get("scheduled_date");
  const [posts, setPosts] = useState<SocialPostWithRelations[]>([]);
  const [postLinks, setPostLinks] = useState<SocialPostLinkRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<SocialPostsView>("list");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<SocialPostStatus | "all">("all");
  const [activePostId, setActivePostId] = useState<string | null>(null);
  const [activeMonth, setActiveMonth] = useState(new Date());
  const [listRowLimit, setListRowLimit] = useState<TableRowLimit>(DEFAULT_TABLE_ROW_LIMIT);
  const [listCurrentPage, setListCurrentPage] = useState(1);
  const [listSortField, setListSortField] = useState<string>("updated");
  const [listSortDirection, setListSortDirection] = useState<"asc" | "desc">("desc");
  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(
    new Set(["product", "type", "status", "created", "scheduled", "published", "updated"])
  );
  const [isEditColumnsOpen, setIsEditColumnsOpen] = useState(false);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [hasAppliedCreateQuery, setHasAppliedCreateQuery] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newProduct, setNewProduct] = useState<SocialPostProduct>("general_company");
  const [newType, setNewType] = useState<SocialPostType>("image");
  const [newScheduledDate, setNewScheduledDate] = useState("");
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
      setError(`Couldn't load posts. ${postsError.message}`);
      setIsLoading(false);
      return;
    }
    if (linksError) {
      setError(`Couldn't load links. ${linksError.message}`);
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

  useEffect(() => {
    if (!error) {
      return;
    }
    showError(error);
  }, [error, showError]);

  useEffect(() => {
    if (requestedView === "board" || requestedView === "list" || requestedView === "calendar") {
      setView(requestedView);
    }
  }, [requestedView]);

  useEffect(() => {
    if (!shouldOpenCreateModal) {
      setHasAppliedCreateQuery(false);
      return;
    }
    if (hasAppliedCreateQuery) {
      return;
    }
    setIsCreateModalOpen(true);
    if (requestedTitle?.trim()) {
      setNewTitle(requestedTitle.trim());
    }
    if (
      requestedScheduledDate &&
      /^\d{4}-\d{2}-\d{2}$/.test(requestedScheduledDate)
    ) {
      setNewScheduledDate(requestedScheduledDate);
    }
    setHasAppliedCreateQuery(true);
  }, [
    hasAppliedCreateQuery,
    requestedTitle,
    requestedScheduledDate,
    shouldOpenCreateModal,
  ]);

  useEffect(() => {
    if (!panelError) {
      return;
    }
    showError(panelError);
  }, [panelError, showError]);

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
        draft: [],
        in_review: [],
        changes_requested: [],
        creative_approved: [],
        ready_to_publish: [],
        awaiting_live_link: [],
        published: [],
      }
    );
  }, [filteredPosts]);

  const sortedListPosts = useMemo(() => {
    const sorted = [...filteredPosts];
    sorted.sort((a, b) => {
      let comparison = 0;
      switch (listSortField) {
        case "title":
          comparison = a.title.localeCompare(b.title);
          break;
        case "status":
          comparison = a.status.localeCompare(b.status);
          break;
        case "product":
          comparison = a.product.localeCompare(b.product);
          break;
        case "type":
          comparison = a.type.localeCompare(b.type);
          break;
        case "scheduled":
          comparison = (a.scheduled_date ?? "").localeCompare(b.scheduled_date ?? "");
          break;
        case "updated":
        default:
          comparison = a.updated_at.localeCompare(b.updated_at);
      }
      return listSortDirection === "asc" ? comparison : -comparison;
    });
    return sorted;
  }, [filteredPosts, listSortField, listSortDirection]);

  const listPageCount = useMemo(
    () => getTablePageCount(sortedListPosts.length, listRowLimit),
    [sortedListPosts.length, listRowLimit]
  );
  const pagedListPosts = useMemo(
    () => getTablePageRows(sortedListPosts, listCurrentPage, listRowLimit),
    [sortedListPosts, listCurrentPage, listRowLimit]
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
  const activityUserNameById = useMemo(() => {
    const entries: Array<[string, string]> = [];
    for (const post of posts) {
      if (post.creator?.id && post.creator.full_name) {
        entries.push([post.creator.id, post.creator.full_name]);
      }
    }
    for (const entry of panelActivity) {
      if (entry.actor?.id && entry.actor.full_name) {
        entries.push([entry.actor.id, entry.actor.full_name]);
      }
    }
    return Object.fromEntries(entries);
  }, [panelActivity, posts]);
  const panelExecutionLocked = activePost ? isExecutionStage(activePost.status) : false;

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
  const clearAllFilters = () => {
    setSearch("");
    setStatusFilter("all");
    setListCurrentPage(1);
  };

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
        scheduled_date: newScheduledDate || null,
        status: "draft",
        platforms: [],
        created_by: user.id,
      })
      .select(
        "id,title,product,type,canva_url,canva_page,caption,platforms,scheduled_date,status,created_by,created_at,updated_at,associated_blog_id,associated_blog:associated_blog_id(id,title,slug,site),creator:created_by(id,full_name,email)"
      )
      .single();

    if (insertError) {
      setError(`Couldn't create post. ${insertError.message}`);
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
    setNewScheduledDate("");
    setIsCreateModalOpen(false);
    showSuccess("Social post created");
    setIsCreating(false);
  };

  const transitionPostStatus = async ({
    postId,
    title,
    currentStatus,
    toStatus,
  }: {
    postId: string;
    title: string;
    currentStatus: SocialPostStatus;
    toStatus: SocialPostStatus;
  }) => {
    if (currentStatus === toStatus) {
      return true;
    }
    const allowedTransitions = SOCIAL_POST_ALLOWED_TRANSITIONS[currentStatus] ?? [];
    if (!allowedTransitions.includes(toStatus)) {
      setError(
        `Invalid status transition from ${SOCIAL_POST_STATUS_LABELS[currentStatus]} to ${SOCIAL_POST_STATUS_LABELS[toStatus]}`
      );
      return false;
    }
    if (!session?.access_token) {
      setError("Session expired. Refresh and try again.");
      return false;
    }

    const requiresRollbackReason =
      toStatus === "changes_requested" &&
      (currentStatus === "ready_to_publish" ||
        currentStatus === "awaiting_live_link");
    let reason: string | null = null;
    if (requiresRollbackReason) {
      const raw = window.prompt(
        "Provide a reason for sending this post back to Changes Requested:"
      );
      if (!raw || raw.trim().length === 0) {
        setError("Rollback reason is required.");
        return false;
      }
      reason = raw.trim();
    }

    const response = await fetch(`/api/social-posts/${postId}/transition`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${session.access_token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ toStatus, reason }),
    });
    if (!response.ok) {
      const payload = (await response.json().catch(() => ({}))) as {
        error?: string;
      };
      setError(payload.error ?? "Couldn't change post status.");
      return false;
    }
    pushNotification(
      socialPostStatusChangedNotification(
        title,
        currentStatus,
        toStatus,
        profile?.full_name ?? null,
        postId
      )
    );
    return true;
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

    const transitioned = await transitionPostStatus({
      postId: post.id,
      title: post.title,
      currentStatus: post.status,
      toStatus: nextStatus,
    });
    if (!transitioned) {
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
    showSuccess(`Moved to ${SOCIAL_POST_STATUS_LABELS[nextStatus]}`);
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

    const canvaUrlTrimmed = panelForm.canva_url.trim();
    const canvaUrl = canvaUrlTrimmed.length > 0 ? canvaUrlTrimmed : null;
    if (canvaUrl && !/^https?:\/\//i.test(canvaUrl)) {
      setPanelError("Canva URL must start with http:// or https://");
      setIsPanelSaving(false);
      return;
    }

    const canvaPageRaw = panelForm.canva_page.trim();
    const canvaPage =
      canvaPageRaw.length > 0 && !Number.isNaN(Number(canvaPageRaw))
        ? Math.max(1, Number(canvaPageRaw))
        : null;
    const normalizedPlatforms = Array.from(new Set(panelForm.platforms));
    const executionLocked = isExecutionStage(activePost.status);
    const statusChanged = panelForm.status !== activePost.status;
    const briefChanged =
      trimmedTitle !== activePost.title ||
      panelForm.product !== activePost.product ||
      panelForm.type !== activePost.type ||
      canvaUrl !== activePost.canva_url ||
      canvaPage !== activePost.canva_page ||
      (panelForm.caption.trim() || null) !== activePost.caption ||
      panelForm.scheduled_date !== formatDateInput(activePost.scheduled_date) ||
      panelForm.associated_blog_id !== activePost.associated_blog_id ||
      normalizedPlatforms.join(",") !== activePost.platforms.join(",");

    if (executionLocked && briefChanged) {
      setPanelError(
        "Execution-stage brief fields are read-only. Use Edit Brief to reopen this post."
      );
      setIsPanelSaving(false);
      return;
    }
    const supabase = getSupabaseBrowserClient();
    if (briefChanged) {
      const { data, error: updateError } = await supabase
        .from("social_posts")
        .update({
          title: trimmedTitle,
          product: panelForm.product,
          type: panelForm.type,
          canva_url: canvaUrl,
          canva_page: canvaPage,
          caption: panelForm.caption.trim() || null,
          platforms: normalizedPlatforms,
          scheduled_date: panelForm.scheduled_date || null,
          associated_blog_id: panelForm.associated_blog_id,
        })
        .eq("id", activePost.id)
        .select(
          "id,title,product,type,canva_url,canva_page,caption,platforms,scheduled_date,status,created_by,created_at,updated_at,associated_blog_id,associated_blog:associated_blog_id(id,title,slug,site),creator:created_by(id,full_name,email)"
        )
        .single();

      if (updateError) {
        setPanelError(`Couldn't save post. ${updateError.message}`);
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
    }

    if (statusChanged) {
      const transitioned = await transitionPostStatus({
        postId: activePost.id,
        title: activePost.title,
        currentStatus: activePost.status,
        toStatus: panelForm.status,
      });
      if (!transitioned) {
        setIsPanelSaving(false);
        return;
      }
      setPosts((previous) =>
        previous.map((entry) =>
          entry.id === activePost.id ? { ...entry, status: panelForm.status } : entry
        )
      );
    }
    showSuccess("Post saved");
    await loadPanelDetails(activePost.id);
    setIsPanelSaving(false);
  };

  const handleReopenBrief = async () => {
    if (!activePost) {
      return;
    }
    if (!session?.access_token) {
      setPanelError("Session expired. Refresh and try again.");
      return;
    }
    const reasonInput = window.prompt(
      "Optional reason for reopening this post to Creative Approved:"
    );
    const response = await fetch(`/api/social-posts/${activePost.id}/reopen-brief`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${session.access_token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        reason:
          typeof reasonInput === "string" && reasonInput.trim().length > 0
            ? reasonInput.trim()
            : null,
      }),
    });
    if (!response.ok) {
      const payload = (await response.json().catch(() => ({}))) as {
        error?: string;
      };
      setPanelError(payload.error ?? "Couldn't reopen brief.");
      return;
    }
    setPosts((previous) =>
      previous.map((entry) =>
        entry.id === activePost.id
          ? { ...entry, status: "creative_approved" as SocialPostStatus }
          : entry
      )
    );
    pushNotification(
      socialPostStatusChangedNotification(
        activePost.title,
        activePost.status,
        "creative_approved",
        profile?.full_name ?? null,
        activePost.id
      )
    );
    setPanelForm((previous) =>
      previous
        ? { ...previous, status: "creative_approved" as SocialPostStatus }
        : previous
    );
    showSuccess("Post reopened to Creative Approved for brief edits.");
    await loadPanelDetails(activePost.id);
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
      showSuccess("Links saved");
    } catch (saveError) {
      setPanelError(
        saveError instanceof Error ? `Couldn't save links. ${saveError.message}` : "Couldn't save links. Try again."
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
      setPanelError(`Couldn't add comment. ${insertError.message}`);
      setIsCommentSaving(false);
      return;
    }

    setPanelCommentDraft("");
    setReplyToComment(null);
    await loadPanelDetails(activePost.id);
    showSuccess("Comment added");
    setIsCommentSaving(false);
  };

  const openPostPanel = (postId: string) => {
    setActivePostId(postId);
    setPanelError(null);
  };

  const [isDeletingPost, setIsDeletingPost] = useState(false);
  const [openRowMenuId, setOpenRowMenuId] = useState<string | null>(null);
  const [selectedRowIndices, setSelectedRowIndices] = useState<Set<number>>(new Set());

  const handleBulkDelete = async () => {
    if (selectedRowIndices.size === 0 || !session?.access_token) {
      return;
    }

    const postsToDelete = Array.from(selectedRowIndices).map((idx) => pagedListPosts[idx]);
    const deletablePosts = postsToDelete.filter((p) => p.status !== "published");
    const publishedCount = postsToDelete.length - deletablePosts.length;

    if (deletablePosts.length === 0) {
      showError("Cannot delete published posts");
      return;
    }

    const postCount = deletablePosts.length;
    const confirmed = window.confirm(
      `Are you sure you want to delete ${postCount} post${postCount === 1 ? "" : "s"}? This action cannot be undone.${publishedCount > 0 ? `\n\n${publishedCount} published post${publishedCount === 1 ? " will" : "s will"} be skipped.` : ""}`
    );
    if (!confirmed) {
      return;
    }

    setIsDeletingPost(true);

    let successCount = 0;
    let failureCount = 0;
    const failedPostIds: string[] = [];

    for (const post of deletablePosts) {
      const response = await fetch(`/api/social-posts/${post.id}`, {
        method: "DELETE",
        headers: {
          authorization: `Bearer ${session.access_token}`,
          "content-type": "application/json",
        },
      });

      if (response.ok) {
        successCount++;
      } else {
        failureCount++;
        failedPostIds.push(post.title);
      }
    }

    setPosts((previous) =>
      previous.filter((p) => !deletablePosts.some((d) => d.id === p.id))
    );
    setPostLinks((previous) =>
      previous.filter(
        (link) => !deletablePosts.some((d) => d.id === link.social_post_id)
      )
    );
    setSelectedRowIndices(new Set());
    setIsDeletingPost(false);

    let message = "";
    if (successCount > 0) {
      message = `Deleted ${successCount} post${successCount === 1 ? "" : "s"}`;
    }
    if (failureCount > 0) {
      message += (message ? ", " : "") + `failed to delete ${failureCount} post${failureCount === 1 ? "" : "s"}`;
    }
    if (publishedCount > 0) {
      message += (message ? ", " : "") + `skipped ${publishedCount} published post${publishedCount === 1 ? "" : "s"}`;
    }

    if (failureCount === 0 && publishedCount === 0) {
      showSuccess(message);
    } else {
      showError(message);
    }
  };

  const handleDeletePost = useCallback(
    async (postIdParam?: string) => {
      const postId = postIdParam ?? activePost?.id;
      const post = postIdParam ? posts.find((p) => p.id === postIdParam) : activePost;
      if (!post || !session?.access_token) {
        return;
      }
      const confirmed = window.confirm(
        `Are you sure you want to delete "${post.title}"? This action cannot be undone.`
      );
      if (!confirmed) {
        return;
      }
      setIsDeletingPost(true);
      setPanelError(null);
      setOpenRowMenuId(null);

      const response = await fetch(`/api/social-posts/${postId}`, {
        method: "DELETE",
        headers: {
          authorization: `Bearer ${session.access_token}`,
          "content-type": "application/json",
        },
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as { error?: string };
        if (postIdParam) {
          showError(payload.error ?? "Failed to delete post.");
        } else {
          setPanelError(payload.error ?? "Failed to delete post.");
        }
        setIsDeletingPost(false);
        return;
      }
      setPosts((previous) => previous.filter((p) => p.id !== postId));
      setPostLinks((previous) => previous.filter((link) => link.social_post_id !== postId));
      if (activePost?.id === postId) {
        setActivePostId(null);
      }
      setActivePostId(null);
      showSuccess("Post deleted successfully");
      setIsDeletingPost(false);
    },
    [activePost, posts, session?.access_token, showError, showSuccess]
  );


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

  const allTableColumns = useMemo(
    (): DataTableColumn<SocialPostWithRelations>[] => [
      // Mandatory columns in specified order
      {
        id: "product",
        label: "Product",
        sortable: true,
        className: "max-w-[10rem]",
        render: (post) => SOCIAL_POST_PRODUCT_LABELS[post.product],
      },
      {
        id: "type",
        label: "Type",
        sortable: true,
        className: "max-w-[10rem]",
        render: (post) => SOCIAL_POST_TYPE_LABELS[post.type],
      },
      {
        id: "status",
        label: "Status",
        align: "center",
        sortable: true,
        render: (post) => <SocialPostStatusBadge status={post.status} />,
      },
      {
        id: "created",
        label: "Created",
        sortable: true,
        render: (post) => formatDisplayDate(post.created_at),
      },
      {
        id: "scheduled",
        label: "Scheduled Publish",
        sortable: true,
        render: (post) => formatDisplayDate(post.scheduled_date) || "—",
      },
      {
        id: "published",
        label: "Published Date",
        sortable: true,
        render: (post) => post.status === "published" ? formatDisplayDate(post.updated_at) : "—",
      },
      {
        id: "updated",
        label: "Updated",
        sortable: true,
        render: (post) =>
          formatDistanceToNow(new Date(post.updated_at), { addSuffix: true }),
      },
      // Optional columns
      {
        id: "platforms",
        label: "Platforms",
        sortable: false,
        className: "max-w-[16rem]",
        render: (post) =>
          post.platforms.length > 0
            ? post.platforms.map((p) => SOCIAL_PLATFORM_LABELS[p]).join(", ")
            : "—",
      },
      {
        id: "blog",
        label: "Associated Blog",
        sortable: false,
        className: "max-w-[18rem]",
        render: (post) => post.associated_blog?.title ?? "—",
      },
      {
        id: "actions",
        label: "",
        sortable: false,
        align: "center",
        className: "w-12",
        render: (post) => {
          const isOpen = openRowMenuId === post.id;
          const canDelete =
            !isDeletingPost &&
            (post.created_by === user?.id || isAdmin) &&
            post.status !== "published";
          const isPublished = post.status === "published";
          return (
            <div className="relative">
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  setOpenRowMenuId(isOpen ? null : post.id);
                }}
                className="rounded px-2 py-1 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                aria-label="Open row actions"
              >
                <span className="text-lg leading-none">⋯</span>
              </button>
              {isOpen ? (
                <div
                  className="absolute right-0 top-full z-20 mt-1 w-36 rounded-md border border-slate-200 bg-white py-1 shadow-lg"
                  onClick={(event) => {
                    event.stopPropagation();
                  }}
                >
                  <button
                    type="button"
                    disabled={!canDelete}
                    onClick={() => {
                      void handleDeletePost(post.id);
                    }}
                    title={isPublished ? "Published posts cannot be deleted" : ""}
                    className="block w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:text-slate-400"
                  >
                    {isDeletingPost ? "Deleting…" : "Delete"}
                  </button>
                </div>
              ) : null}
            </div>
          );
        },
      },
    ],
    [handleDeletePost, isAdmin, isDeletingPost, openRowMenuId, user?.id]
  );

  const listTableColumns = useMemo(
    () => allTableColumns.filter((col) => visibleColumns.has(col.id)),
    [allTableColumns, visibleColumns]
  );

  return (
    <ProtectedPage>
      <AppShell>
        <div className={DATA_PAGE_STACK_CLASS}>
          <DataPageHeader
            title="Social Posts"
            description="Keep each social post in one card from Draft to Published."
            primaryAction={
              <div className="flex flex-wrap items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="primary"
                  size="md"
                  onClick={() => {
                    setNewScheduledDate("");
                    setIsCreateModalOpen(true);
                  }}
                >
                  New Social Post
                </Button>
                <div className={SEGMENTED_CONTROL_CLASS}>
                  {(["board", "list", "calendar"] as SocialPostsView[]).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      className={segmentedControlItemClass({ isActive: view === mode })}
                      onClick={() => {
                        setView(mode);
                      }}
                    >
                      {toTitleCase(mode)}
                    </button>
                  ))}
                </div>
              </div>
            }
          />

          <DataPageToolbar
            searchValue={search}
            onSearchChange={setSearch}
            searchPlaceholder="Search title, caption, blog..."
            actions={
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={clearAllFilters}
              >
                Clear all filters
              </Button>
            }
            filters={
              <select
                aria-label="Status"
                value={statusFilter}
                onChange={(event) => {
                  setStatusFilter(event.target.value as SocialPostStatus | "all");
                }}
                className="focus-field w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700"
              >
                <option value="all">All Statuses</option>
                {SOCIAL_POST_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {SOCIAL_POST_STATUS_LABELS[status]}
                  </option>
                ))}
              </select>
            }
          />
          <DataPageFilterPills pills={activeFilterPills} />


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
                    onDeletePost={(postId) => void handleDeletePost(postId)}
                    isDeletingPost={isDeletingPost}
                  />
                ))}
              </section>
            </DndContext>
          ) : view === "list" ? (
            <section className={DATA_PAGE_TABLE_SECTION_CLASS}>
              <div className={DATA_PAGE_CONTROL_STRIP_CLASS}>
                <TableResultsSummary
                  totalRows={filteredPosts.length}
                  currentPage={listCurrentPage}
                  rowLimit={listRowLimit}
                  noun="social posts"
                />
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      setIsEditColumnsOpen(!isEditColumnsOpen);
                    }}
                  >
                    Edit Columns
                  </Button>
                  <TableRowLimitSelect
                    value={listRowLimit}
                    onChange={(value) => {
                      setListRowLimit(value);
                    }}
                  />
                </div>
              </div>
              {isEditColumnsOpen ? (
                <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
                  <div className="space-y-4">
                    <div>
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-600">Mandatory Columns</p>
                      <div className="space-y-2">
                        {allTableColumns.slice(0, 7).map((col) => (
                          <div key={col.id} className="flex items-center gap-2 text-sm text-slate-700">
                            <input
                              type="checkbox"
                              checked={true}
                              disabled
                              className="cursor-not-allowed"
                            />
                            <span>{col.label}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-600">Optional Columns</p>
                      <div className="space-y-2">
                        {allTableColumns.slice(7).map((col) => (
                          <label key={col.id} className="flex items-center gap-2 text-sm">
                            <input
                              type="checkbox"
                              checked={visibleColumns.has(col.id)}
                              onChange={(event) => {
                                const newVisible = new Set(visibleColumns);
                                if (event.target.checked) {
                                  newVisible.add(col.id);
                                } else {
                                  newVisible.delete(col.id);
                                }
                                setVisibleColumns(newVisible);
                              }}
                              className="cursor-pointer"
                            />
                            <span className="cursor-pointer">{col.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}
              {selectedRowIndices.size > 0 ? (
                <div className="mb-3 flex items-center gap-2 rounded-md border border-blue-200 bg-blue-50 px-3 py-2">
                  <span className="text-sm font-medium text-blue-900">
                    {selectedRowIndices.size} selected
                  </span>
                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    onClick={() => void handleBulkDelete()}
                    disabled={isDeletingPost}
                  >
                    {isDeletingPost ? "Deleting..." : "Delete Selected"}
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => setSelectedRowIndices(new Set())}
                    disabled={isDeletingPost}
                  >
                    Cancel
                  </Button>
                </div>
              ) : null}
              <DataTable
                data={pagedListPosts}
                columns={listTableColumns}
                sortField={listSortField}
                sortDirection={listSortDirection}
                onSort={(field, direction) => {
                  setListSortField(field);
                  setListSortDirection(direction);
                }}
                onRowClick={(post) => openPostPanel(post.id)}
                activeIndex={pagedListPosts.findIndex((p) => p.id === activePostId)}
                density="comfortable"
                emptyMessage="No social posts found"
                showSelection={true}
                selectedIndices={selectedRowIndices}
                onSelectionChange={setSelectedRowIndices}
              />
              <div className={`${DATA_PAGE_CONTROL_STRIP_CLASS} justify-end`}>
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
                    <CalendarTile
                      key={key}
                      dayLabel={format(day, "d")}
                      isToday={isToday}
                      isCurrentMonth={isCurrentMonth}
                      todayContainerClassName="border-blue-300 bg-blue-50"
                      todayDayLabelClassName="font-semibold text-blue-700"
                      dayLabelClassName={!isToday ? "text-slate-700" : undefined}
                    >
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
                              onContextMenu={(event) => {
                                event.preventDefault();
                                void handleDeletePost(post.id);
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
                    </CalendarTile>
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
                    Created {formatDateInTimezone(activePost.created_at, profile?.timezone)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    onClick={() => {
                      router.push(`/social-posts/${activePost.id}`);
                    }}
                  >
                    Work in Full View
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    disabled={isDeletingPost}
                    onClick={() => {
                      void handleDeletePost();
                    }}
                  >
                    {isDeletingPost ? "Deleting…" : "Delete"}
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


              <section className="mt-4 space-y-3 rounded-lg border border-slate-200 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h4 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                    Basic Information
                  </h4>
                  <SocialPostStatusBadge status={panelForm.status} />
                </div>
                {panelExecutionLocked ? (
                  <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                    <span>Read-only. Work in Full View to edit.</span>
                    {isAdmin ? (
                      <Button
                        type="button"
                        variant="secondary"
                        size="xs"
                        onClick={() => {
                          void handleReopenBrief();
                        }}
                      >
                        Edit Brief
                      </Button>
                    ) : null}
                  </div>
                ) : null}

                {/* STAGE 1: EDITOR CREATES */}
                {!panelExecutionLocked && (
                  <div className="space-y-3 rounded-md border border-blue-200 bg-blue-50 p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">Required</p>
                    <div className="grid gap-3 md:grid-cols-2">
                      <label className="block">
                        <span className="mb-1 block text-sm font-medium text-slate-700">Product</span>
                        <select
                          value={panelForm.product}
                          onChange={(event) => {
                            setPanelForm((previous) =>
                              previous
                                ? { ...previous, product: event.target.value as SocialPostProduct }
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
                                ? { ...previous, type: event.target.value as SocialPostType }
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
                    <label className="block">
                      <span className="mb-1 block text-sm font-medium text-slate-700">Canva URL</span>
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
                  </div>
                )}

                {/* OPTIONAL FIELDS (ALWAYS EDITABLE) */}
                <div className="space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Optional</p>
                  <label className="block">
                    <span className="mb-1 block text-sm font-medium text-slate-700">Canva Page</span>
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
                      disabled={panelExecutionLocked}
                    />
                  </label>
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
                      disabled={panelExecutionLocked}
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-sm font-medium text-slate-700">Caption / Write-up</span>
                    <textarea
                      value={panelForm.caption}
                      onChange={(event) => {
                        setPanelForm((previous) =>
                          previous ? { ...previous, caption: event.target.value } : previous
                        );
                      }}
                      className="min-h-20 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                      placeholder="Main social caption..."
                      disabled={panelExecutionLocked}
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-sm font-medium text-slate-700">Associated Blog</span>
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
                      disabled={panelExecutionLocked}
                    />
                    {panelForm.associated_blog_id ? (
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-600">
                        <span>Linked blog ID: {panelForm.associated_blog_id}</span>
                        <button
                          type="button"
                          className="rounded border border-slate-300 bg-white px-2 py-1 font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-60"
                          onClick={() => {
                            setPanelForm((previous) =>
                              previous ? { ...previous, associated_blog_id: null } : previous
                            );
                            setBlogSearchQuery("");
                            setBlogSearchResults([]);
                            setIsBlogSearchOpen(false);
                          }}
                          disabled={panelExecutionLocked}
                        >
                          Clear
                        </button>
                      </div>
                    ) : null}
                    {isBlogSearchOpen && !panelExecutionLocked ? (
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
                </div>

                {/* SCHEDULING */}
                <div className="space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Schedule</p>
                  <div className="grid gap-3 md:grid-cols-2">
                    <label className="block">
                      <span className="mb-1 block text-sm font-medium text-slate-700">Scheduled Publish Date</span>
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
                      <span className="mb-1 block text-sm font-medium text-slate-700">Published Date</span>
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
                  </div>
                </div>

                {/* PLATFORMS SELECTION */}
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-slate-700">Platforms</span>
                  <div className="flex flex-wrap gap-2">
                    {SOCIAL_PLATFORMS.map((platform) => {
                      const isSelected = panelForm.platforms.includes(platform);
                      return (
                        <button
                          key={platform}
                          type="button"
                          className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                            isSelected
                              ? "border-slate-900 bg-slate-900 text-white"
                              : "border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
                          } ${panelExecutionLocked ? "cursor-not-allowed opacity-60" : ""}`}
                          onClick={() => {
                            if (!panelExecutionLocked) {
                              setPanelForm((previous) => {
                                if (!previous) return previous;
                                const nextPlatforms = previous.platforms.includes(platform)
                                  ? previous.platforms.filter((entry) => entry !== platform)
                                  : [...previous.platforms, platform];
                                return { ...previous, platforms: nextPlatforms };
                              });
                            }
                          }}
                          disabled={panelExecutionLocked}
                        >
                          {SOCIAL_PLATFORM_LABELS[platform]}
                        </button>
                      );
                    })}
                  </div>
                </label>

                <div className="flex justify-end">
                  <button
                    type="button"
                    disabled={isPanelSaving || panelExecutionLocked}
                    className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
                    onClick={() => {
                      void handleSavePostDetails();
                    }}
                  >
                    {isPanelSaving ? "Saving..." : "Save Details"}
                  </button>
                </div>
              </section>

              {/* EXECUTION STAGE: LIVE LINKS */}
              {(panelForm.status === "ready_to_publish" || panelForm.status === "awaiting_live_link" || panelForm.status === "published") && (
                <section className="mt-4 space-y-3 rounded-lg border border-slate-200 p-4">
                  <h4 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Live Links</h4>
                  <div className="space-y-2">
                    {SOCIAL_PLATFORMS.map((platform) => (
                      <label key={platform} className="block">
                        <span className="mb-1 block text-sm font-medium text-slate-700">{SOCIAL_PLATFORM_LABELS[platform]}</span>
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
                  </div>
                  {activePostLinks.length > 0 ? (
                    <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
                      <p className="font-medium text-slate-700">Saved Links</p>
                      <ul className="mt-1 space-y-1">
                        {activePostLinks.map((link) => (
                          <li key={link.id} className="truncate">
                            {SOCIAL_PLATFORM_LABELS[link.platform]}: <ExternalLink href={link.url} className="text-blue-600 underline">{link.url}</ExternalLink>
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
              )}

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
                  Recent Changes
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
                          {formatActivityEventTitle(entry)}
                        </p>
                        {(() => {
                          const detail = formatActivityChangeDescription(entry, {
                            userNameById: activityUserNameById,
                          });
                          return detail ? (
                            <p className="text-xs text-slate-500">{detail}</p>
                          ) : null;
                        })()}
                        <p className="text-xs text-slate-400">
                          {entry.actor?.full_name ?? "System"} •{" "}
                          {formatDateInTimezone(entry.changed_at, profile?.timezone)}
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
                  setNewScheduledDate("");
                  setIsCreateModalOpen(false);
                }
              }}
            />
            <div className="relative z-10 w-full max-w-lg rounded-lg border border-slate-200 bg-white p-5 shadow-xl">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-base font-semibold text-slate-900">New Social Post</h3>
                  <p className="mt-1 text-sm text-slate-600">
                    Create a single card and move it from Draft to Published.
                  </p>
                </div>
                <button
                  type="button"
                  className="rounded-md border border-slate-300 px-2 py-1 text-sm text-slate-700 hover:bg-slate-50"
                  onClick={() => {
                    if (!isCreating) {
                      setNewScheduledDate("");
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
                        setNewScheduledDate("");
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
