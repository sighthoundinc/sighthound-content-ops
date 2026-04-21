"use client";

import { FormEvent, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { parseRecordDeepLink } from "@/lib/record-deep-link";
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
  addDays,
  addMonths,
  addWeeks,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  formatDistanceToNow,
  isWithinInterval,
  startOfMonth,
  startOfWeek,
  subMonths,
  subWeeks,
} from "date-fns";

import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/button";
import { CalendarControlBar } from "@/components/calendar-control-bar";
import { MarkdownComment } from "@/components/markdown-comment";
import { CalendarGridSurface, CalendarWeekdayHeaderRow } from "@/components/calendar-shell";
import { CalendarTile } from "@/components/calendar-tile";
import { ConfirmationModal } from "@/components/confirmation-modal";
import { DataTable, type DataTableColumn } from "@/components/data-table";
import {
  DATA_PAGE_CONTROL_ACTION_BUTTON_CLASS,
  DATA_PAGE_CONTROL_ACTIONS_CLASS,
  DATA_PAGE_CONTROL_ROW_CLASS,
  DATA_PAGE_CONTROL_STRIP_CLASS,
  DATA_PAGE_STACK_CLASS,
  DATA_PAGE_TABLE_SECTION_CLASS,
  DataPageFilterPills,
  DataPageHeader,
  DataPageToolbar,
} from "@/components/data-page";
import { LinkQuickActions } from "@/components/link-quick-actions";
import { ProtectedPage } from "@/components/protected-page";
import { SocialPostStatusBadge } from "@/components/status-badge";
import { SocialPostStatusInfo } from "@/components/social-post-status-info";
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
import { canUserActOnStatus } from "@/lib/social-post-workflow";
import { socialPostStatusChangedNotification } from "@/lib/notification-helpers";
import { getUserRoles } from "@/lib/roles";
import {
  CHANGE_REQUEST_CATEGORY_OPTIONS,
  CHANGE_REQUEST_CHECKLIST_OPTIONS,
  createEmptyChangeRequestTemplate,
  formatChangeRequestReason,
  getChangeRequestTemplateError,
  type ChangeRequestTemplateState,
} from "@/lib/social-post-change-request";
import {
  getApiErrorMessage,
  isApiFailure,
  parseApiResponseJson,
} from "@/lib/api-response";
import {
  getDateKeyInTimezone,
  getWeekdayLabels,
  normalizeWeekStart,
} from "@/lib/calendar";
import {
  SEGMENTED_CONTROL_CLASS,
  segmentedControlItemClass,
} from "@/lib/segmented-control";
import { MoreIcon } from "@/lib/icons";
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
  SocialPostStatus,
  SocialPostType,
  SocialPostWithRelations as SocialPostWithRelationsType,
} from "@/lib/types";
import { formatDateInput, formatDateOnly, toTitleCase } from "@/lib/utils";
import { formatDateInTimezone } from "@/lib/format-date";
import {
  formatActivityChangeDescription,
  formatActivityEventTitle,
} from "@/lib/activity-history-format";
import { useAuth } from "@/providers/auth-provider";
import { useAlerts } from "@/providers/alerts-provider";
import { useNotifications } from "@/providers/notifications-provider";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";

type SocialPostsView = "board" | "list" | "calendar";
type SocialCalendarMode = "month" | "week";

type BlogLookupResult = {
  id: string;
  title: string;
  slug: string | null;
  site: BlogSite;
};

type SocialPostWithRelations = SocialPostWithRelationsType & {
  associated_blog?: BlogLookupResult | null;
  creator?: Pick<ProfileRecord, "id" | "full_name" | "email"> | null;
  worker?: Pick<ProfileRecord, "id" | "full_name" | "email"> | null;
  reviewer?: Pick<ProfileRecord, "id" | "full_name" | "email"> | null;
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
type PendingDeleteRequest =
  | {
      kind: "single";
      postId: string;
      source: "table" | "panel";
    }
  | {
      kind: "bulk";
      postIds: string[];
      publishedCount: number;
    };
type PendingChangeRequestTransition = {
  postId: string;
  toStatus: SocialPostStatus;
  template: ChangeRequestTemplateState;
};
type SocialPostCreateDefaults = {
  product: SocialPostProduct;
  type: SocialPostType;
  platforms: SocialPlatform[];
};
type SocialPostEditorFocusTarget = "setup" | "review-publish" | "live-links";

const STATUS_DROP_ZONE_PREFIX = "social-status-";
const ASSIGNED_USER_HELPER_TEXT = "Only assigned user can perform this action";
const CREATE_DEFAULTS_STORAGE_KEY = "social-post-create-defaults:v1";
const SOCIAL_POST_LIST_TABLE_VIEW_STORAGE_KEY = "social-posts-list-table-view:v1";
const SOCIAL_POST_LIST_MANDATORY_COLUMNS = [
  "product",
  "type",
  "status",
  "created",
  "scheduled",
  "published",
  "updated",
] as const;
const SOCIAL_POST_LIST_OPTIONAL_COLUMNS = ["platforms", "blog", "actions"] as const;
const SOCIAL_POST_LIST_ALL_COLUMNS = [
  ...SOCIAL_POST_LIST_MANDATORY_COLUMNS,
  ...SOCIAL_POST_LIST_OPTIONAL_COLUMNS,
] as const;
const SOCIAL_POST_LIST_SORT_FIELDS = [
  "title",
  "product",
  "type",
  "status",
  "created",
  "scheduled",
  "published",
  "updated",
] as const;
const DEFAULT_CREATE_DEFAULTS: SocialPostCreateDefaults = {
  product: "general_company",
  type: "image",
  platforms: [],
};
const SOCIAL_POST_CREATE_PRESETS: Array<
  SocialPostCreateDefaults & { id: string; label: string }
> = [
  {
    id: "general-linkedin",
    label: "General LinkedIn",
    product: "general_company",
    type: "image",
    platforms: ["linkedin"],
  },
  {
    id: "alpr-multi-platform",
    label: "ALPR Campaign",
    product: "alpr_plus",
    type: "carousel",
    platforms: ["linkedin", "facebook"],
  },
  {
    id: "redactor-update",
    label: "Redactor Update",
    product: "redactor",
    type: "link",
    platforms: ["linkedin"],
  },
];
const SOCIAL_POST_EDITOR_FOCUS_BY_STATUS: Record<
  SocialPostStatus,
  SocialPostEditorFocusTarget
> = {
  draft: "setup",
  in_review: "review-publish",
  changes_requested: "setup",
  creative_approved: "review-publish",
  ready_to_publish: "review-publish",
  awaiting_live_link: "live-links",
  published: "review-publish",
};

function getSocialPostEditorHref(post: Pick<SocialPostWithRelations, "id" | "status">) {
  const params = new URLSearchParams({
    focus: SOCIAL_POST_EDITOR_FOCUS_BY_STATUS[post.status],
  });
  return `/social-posts/${post.id}?${params.toString()}`;
}

function normalizeRelationObject<T>(value: unknown): T | null {
  if (Array.isArray(value)) {
    return (value[0] ?? null) as T | null;
  }
  return (value ?? null) as T | null;
}
function normalizeCreateDefaults(
  value: unknown
): SocialPostCreateDefaults {
  if (!value || typeof value !== "object") {
    return DEFAULT_CREATE_DEFAULTS;
  }
  const candidate = value as Partial<SocialPostCreateDefaults>;
  const product = SOCIAL_POST_PRODUCTS.includes(candidate.product as SocialPostProduct)
    ? (candidate.product as SocialPostProduct)
    : DEFAULT_CREATE_DEFAULTS.product;
  const type = SOCIAL_POST_TYPES.includes(candidate.type as SocialPostType)
    ? (candidate.type as SocialPostType)
    : DEFAULT_CREATE_DEFAULTS.type;
  const platforms = Array.isArray(candidate.platforms)
    ? candidate.platforms.filter((platform): platform is SocialPlatform =>
        SOCIAL_PLATFORMS.includes(platform as SocialPlatform)
      )
    : DEFAULT_CREATE_DEFAULTS.platforms;
  return {
    product,
    type,
    platforms: Array.from(new Set(platforms)),
  };
}


function normalizeSocialPostRows(rows: Array<Record<string, unknown>>) {
  return rows.map((row) => {
    const associatedBlog = normalizeRelationObject<BlogLookupResult>(
      row.associated_blog
    );
    const creator = normalizeRelationObject<
      Pick<ProfileRecord, "id" | "full_name" | "email">
    >(row.creator);
    const worker = normalizeRelationObject<
      Pick<ProfileRecord, "id" | "full_name" | "email">
    >(row.worker);
    const reviewer = normalizeRelationObject<
      Pick<ProfileRecord, "id" | "full_name" | "email">
    >(row.reviewer);
    const platforms = Array.isArray(row.platforms)
      ? row.platforms.filter((platform): platform is SocialPlatform =>
          typeof platform === "string"
        )
      : [];

    // Derive assigned_to_user_id based on status and ownership model
    const status = (row.status as SocialPostStatus) ?? "draft";
    const workerUserId = typeof row.worker_user_id === "string" ? row.worker_user_id : null;
    const reviewerUserId = typeof row.reviewer_user_id === "string" ? row.reviewer_user_id : null;
    const assigned_to_user_id =
      status === "in_review" || status === "creative_approved"
        ? reviewerUserId
        : workerUserId;

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
      status,
      created_by: String(row.created_by ?? ""),
      worker_user_id: workerUserId,
      reviewer_user_id: reviewerUserId,
      assigned_to_user_id,
      editor_user_id: typeof row.editor_user_id === "string" ? row.editor_user_id : null,
      admin_owner_id: typeof row.admin_owner_id === "string" ? row.admin_owner_id : null,
      last_live_link_reminder_at: typeof row.last_live_link_reminder_at === "string" ? row.last_live_link_reminder_at : null,
      associated_blog_id:
        typeof row.associated_blog_id === "string" ? row.associated_blog_id : null,
      created_at: String(row.created_at ?? ""),
      updated_at: String(row.updated_at ?? ""),
      associated_blog: associatedBlog,
      creator,
      worker,
      reviewer,
      worker_name: worker?.full_name ?? null,
      reviewer_name: reviewer?.full_name ?? null,
      creator_name: creator?.full_name ?? null,
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
  currentUserId,
  canTransition,
}: {
  post: SocialPostWithRelations;
  linkCount: number;
  onOpen: () => void;
  onDelete: (postId: string) => void;
  isDeleting: boolean;
  currentUserId?: string;
  canTransition: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: post.id,
    disabled: !canTransition,
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
      className={`relative rounded-md border border-[color:var(--sh-gray-200)] bg-white shadow-sm transition ${
        isDragging ? "opacity-60" : ""
      }`}
    >
      <button
        type="button"
        className={`block w-full rounded-md p-3 text-left hover:border-[color:var(--sh-gray-200)] hover:bg-blurple-50 ${
          !canTransition ? "cursor-not-allowed" : ""
        }`}
        onClick={onOpen}
        {...attributes}
        {...listeners}
      >
        <div className="flex items-start justify-between gap-2">
          <p className="line-clamp-2 text-sm font-semibold text-ink">{post.title}</p>
          <SocialPostStatusBadge status={post.status} />
        </div>
        <p className="mt-1 text-xs text-navy-500">
          {SOCIAL_POST_PRODUCT_LABELS[post.product]} • {SOCIAL_POST_TYPE_LABELS[post.type]}
        </p>
        <p className="mt-1 text-xs text-navy-500">
          Scheduled: {formatDateOnly(post.scheduled_date) || "Unscheduled"}
        </p>
        <p className="mt-1 text-xs text-navy-500">
          Platforms:{" "}
          {post.platforms.length > 0
            ? post.platforms.map((platform) => SOCIAL_PLATFORM_LABELS[platform]).join(", ")
            : "—"}
        </p>
        {post.associated_blog ? (
          <p className="mt-1 truncate text-xs text-navy-500">
            Blog: {post.associated_blog.title}
          </p>
        ) : null}
        <div className="mt-3">
          <SocialPostStatusInfo
            status={post.status}
            workerUserId={post.worker_user_id}
            workerUserName={post.worker_name}
            reviewerUserId={post.reviewer_user_id}
            reviewerUserName={post.reviewer_name}
            currentUserId={currentUserId}
          />
        </div>
        {!canTransition && post.status !== "published" ? (
          <p className="mt-1 text-[11px] text-amber-700">{ASSIGNED_USER_HELPER_TEXT}</p>
        ) : null}
        <p className="mt-2 text-[11px] text-navy-500/60">{linkCount} published links</p>
      </button>
      <div className="absolute right-2 top-2">
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            setIsMenuOpen(!isMenuOpen);
          }}
          className="inline-flex items-center justify-center rounded px-2 py-1 text-navy-500/70 transition-colors hover:bg-blurple-50 hover:text-ink focus-visible:outline-none focus-visible:shadow-brand-focus"
          aria-label="Open row actions"
        >
          <MoreIcon boxClassName="h-5 w-5" size={16} />
        </button>
        {isMenuOpen ? (
          <div
            className="absolute right-0 top-full z-20 mt-1 w-36 rounded-md border border-[color:var(--sh-gray-200)] bg-white py-1 shadow-lg"
            onClick={(event) => {
              event.stopPropagation();
            }}
          >
            <button
              type="button"
              disabled={isDeleting || post.status === "published"}
              onClick={handleDelete}
              title={post.status === "published" ? "Published posts cannot be deleted" : ""}
              className="block w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:text-navy-500/60"
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
  currentUserId,
  canCurrentUserActOnPost,
}: {
  status: SocialPostStatus;
  posts: SocialPostWithRelations[];
  linksByPost: Record<string, SocialPostLinkRecord[]>;
  onOpenPost: (postId: string) => void;
  onDeletePost: (postId: string) => void;
  isDeletingPost: boolean;
  currentUserId?: string;
  canCurrentUserActOnPost: (post: SocialPostWithRelations) => boolean;
}) {
  const { isOver, setNodeRef } = useDroppable({
    id: `${STATUS_DROP_ZONE_PREFIX}${status}`,
  });

  return (
    <section
      ref={setNodeRef}
      className={`min-h-80 rounded-lg border border-[color:var(--sh-gray-200)] bg-[color:var(--sh-gray)] p-3 ${
        isOver ? "ring-2 ring-blurple-300 ring-offset-1" : ""
      }`}
    >
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-navy-500">
          {SOCIAL_POST_STATUS_LABELS[status]}
        </h3>
        <span className="rounded-full bg-white px-2 py-0.5 text-xs text-navy-500">
          {posts.length}
        </span>
      </div>
      <div className="space-y-2">
        {posts.length === 0 ? (
          <p className="rounded-md border border-dashed border-[color:var(--sh-gray-200)] bg-white px-2 py-3 text-xs text-navy-500/60">
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
              currentUserId={currentUserId}
              canTransition={canCurrentUserActOnPost(post)}
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
  const { showError, showSuccess } = useAlerts();
  const requestedView = searchParams.get("view");
  // Shared ?record=<blog|social>:<id> deep-link: when present on the list,
  // route directly to the matching detail page so shareable URLs work the
  // same everywhere. Keeps the list surface predictable.
  useEffect(() => {
    const deepLink = parseRecordDeepLink(searchParams);
    if (deepLink?.type === "social") {
      router.push(`/social-posts/${deepLink.id}`);
    } else if (deepLink?.type === "blog") {
      router.push(`/blogs/${deepLink.id}`);
    }
  }, [router, searchParams]);
  const shouldOpenCreateModal = searchParams.get("create") === "1";
  const requestedTitle = searchParams.get("title");
  const requestedScheduledDate = searchParams.get("scheduled_date");
  const requestedAssociatedBlog = searchParams.get("associated_blog");
  const [posts, setPosts] = useState<SocialPostWithRelations[]>([]);
  const [postLinks, setPostLinks] = useState<SocialPostLinkRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<SocialPostsView>("list");
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 180);
  const [statusFilter, setStatusFilter] = useState<SocialPostStatus | "all">("all");
  const [associatedBlogFilter, setAssociatedBlogFilter] = useState<string | "all">("all");
  const [activePostId, setActivePostId] = useState<string | null>(null);
  const [activeMonth, setActiveMonth] = useState(new Date());
  const [calendarMode, setCalendarMode] = useState<SocialCalendarMode>("month");
  const [focusedCalendarDateKey, setFocusedCalendarDateKey] = useState<string | null>(null);
  const calendarGridRef = useRef<HTMLDivElement | null>(null);
  const [listRowLimit, setListRowLimit] = useState<TableRowLimit>(DEFAULT_TABLE_ROW_LIMIT);
  const [listCurrentPage, setListCurrentPage] = useState(1);
  const [listSortField, setListSortField] = useState<string>("updated");
  const [listSortDirection, setListSortDirection] = useState<"asc" | "desc">("desc");
  const [listRowDensity, setListRowDensity] = useState<"compact" | "comfortable">(
    "compact"
  );
  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(
    new Set(SOCIAL_POST_LIST_MANDATORY_COLUMNS)
  );

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [hasAppliedCreateQuery, setHasAppliedCreateQuery] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [createDefaults, setCreateDefaults] =
    useState<SocialPostCreateDefaults>(DEFAULT_CREATE_DEFAULTS);
  const [newProduct, setNewProduct] = useState<SocialPostProduct>(
    DEFAULT_CREATE_DEFAULTS.product
  );
  const [newType, setNewType] = useState<SocialPostType>(
    DEFAULT_CREATE_DEFAULTS.type
  );
  const [newPlatforms, setNewPlatforms] = useState<SocialPlatform[]>(
    DEFAULT_CREATE_DEFAULTS.platforms
  );
  const [newScheduledDate, setNewScheduledDate] = useState("");
  const [newWorkerUserId, setNewWorkerUserId] = useState<string | null>(null);
  const [newReviewerUserId, setNewReviewerUserId] = useState<string | null>(null);
  const [newAssociatedBlogId, setNewAssociatedBlogId] = useState<string | null>(null);
  const [createBlogSearchQuery, setCreateBlogSearchQuery] = useState("");
  const [createBlogSearchResults, setCreateBlogSearchResults] = useState<BlogLookupResult[]>([]);
  const [isCreateBlogSearchOpen, setIsCreateBlogSearchOpen] = useState(false);
  const [isCreateBlogSearchLoading, setIsCreateBlogSearchLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [availableUsers, setAvailableUsers] = useState<
    Array<{ id: string; full_name: string; email: string }>
  >([]);

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
  const [pendingChangeRequestTransition, setPendingChangeRequestTransition] =
    useState<PendingChangeRequestTransition | null>(null);
  const [isReopenBriefModalOpen, setIsReopenBriefModalOpen] = useState(false);
  const [reopenBriefReason, setReopenBriefReason] = useState("");

  const [blogSearchQuery, setBlogSearchQuery] = useState("");
  const [blogSearchResults, setBlogSearchResults] = useState<BlogLookupResult[]>([]);
  const [isBlogSearchOpen, setIsBlogSearchOpen] = useState(false);
  const [isBlogSearchLoading, setIsBlogSearchLoading] = useState(false);
  const calendarWeekStart = useMemo(
    () => normalizeWeekStart(profile?.week_start),
    [profile?.week_start]
  );
  const calendarTimezone = profile?.timezone ?? "America/New_York";
  const todayCalendarDateKey = useMemo(
    () => getDateKeyInTimezone(new Date(), calendarTimezone),
    [calendarTimezone]
  );
  const scrollTodayCalendarTileIntoView = useCallback(() => {
    const todayTile = calendarGridRef.current?.querySelector('[data-is-today="true"]');
    if (!todayTile) {
      return;
    }
    const shouldReduceMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    todayTile.scrollIntoView({
      behavior: shouldReduceMotion ? "auto" : "smooth",
      block: "nearest",
    });
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    })
  );
  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const rawDefaults = window.localStorage.getItem(CREATE_DEFAULTS_STORAGE_KEY);
    if (!rawDefaults) {
      return;
    }
    try {
      const parsedDefaults = JSON.parse(rawDefaults) as unknown;
      const normalizedDefaults = normalizeCreateDefaults(parsedDefaults);
      setCreateDefaults(normalizedDefaults);
      setNewProduct(normalizedDefaults.product);
      setNewType(normalizedDefaults.type);
      setNewPlatforms(normalizedDefaults.platforms);
    } catch (storageError) {
      console.error("Failed to parse social post create defaults:", storageError);
    }
  }, []);
  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const stored = window.localStorage.getItem(
      SOCIAL_POST_LIST_TABLE_VIEW_STORAGE_KEY
    );
    if (!stored) {
      return;
    }
    try {
      const parsed = JSON.parse(stored) as {
        visibleColumns?: unknown;
        rowLimit?: unknown;
        sortField?: unknown;
        sortDirection?: unknown;
        rowDensity?: unknown;
      };
      if (Array.isArray(parsed.visibleColumns)) {
        const allowedColumns = new Set<string>(SOCIAL_POST_LIST_ALL_COLUMNS);
        const nextVisible = parsed.visibleColumns.filter(
          (column): column is string =>
            typeof column === "string" && allowedColumns.has(column)
        );
        const mandatoryColumns = new Set<string>(
          SOCIAL_POST_LIST_MANDATORY_COLUMNS
        );
        for (const mandatoryColumn of mandatoryColumns) {
          if (!nextVisible.includes(mandatoryColumn)) {
            nextVisible.push(mandatoryColumn);
          }
        }
        setVisibleColumns(new Set(nextVisible));
      }
      if (
        parsed.rowLimit === "all" ||
        parsed.rowLimit === 10 ||
        parsed.rowLimit === 20 ||
        parsed.rowLimit === 50
      ) {
        setListRowLimit(parsed.rowLimit as TableRowLimit);
      }
      if (
        typeof parsed.sortField === "string" &&
        SOCIAL_POST_LIST_SORT_FIELDS.includes(
          parsed.sortField as (typeof SOCIAL_POST_LIST_SORT_FIELDS)[number]
        )
      ) {
        setListSortField(parsed.sortField);
      }
      if (parsed.sortDirection === "asc" || parsed.sortDirection === "desc") {
        setListSortDirection(parsed.sortDirection);
      }
      if (parsed.rowDensity === "compact" || parsed.rowDensity === "comfortable") {
        setListRowDensity(parsed.rowDensity);
      }
    } catch (storageError) {
      console.error(
        "Failed to parse social posts list table preferences:",
        storageError
      );
    }
  }, []);
  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    window.localStorage.setItem(
      SOCIAL_POST_LIST_TABLE_VIEW_STORAGE_KEY,
      JSON.stringify({
        visibleColumns: Array.from(visibleColumns),
        rowLimit: listRowLimit,
        sortField: listSortField,
        sortDirection: listSortDirection,
        rowDensity: listRowDensity,
      })
    );
  }, [
    listRowDensity,
    listRowLimit,
    listSortDirection,
    listSortField,
    visibleColumns,
  ]);

  const initializeCreateForm = useCallback(() => {
    setNewScheduledDate("");
    setNewWorkerUserId(isAdmin ? null : user?.id ?? null);
    setNewReviewerUserId(null);
    setNewAssociatedBlogId(null);
    setCreateBlogSearchQuery("");
    setCreateBlogSearchResults([]);
    setIsCreateBlogSearchOpen(false);
    setNewTitle("");
    setNewProduct(createDefaults.product);
    setNewType(createDefaults.type);
    setNewPlatforms(createDefaults.platforms);
  }, [createDefaults, isAdmin, user?.id]);
  const closeCreateModal = useCallback(() => {
    initializeCreateForm();
    setIsCreateModalOpen(false);
  }, [initializeCreateForm]);
  const applyCreatePreset = useCallback(
    (preset: SocialPostCreateDefaults) => {
      setNewProduct(preset.product);
      setNewType(preset.type);
      setNewPlatforms(preset.platforms);
    },
    []
  );


  useEffect(() => {
    const loadPosts = async () => {
      const supabase = getSupabaseBrowserClient();
      setIsLoading(true);
      setError(null);

      const [{ data: postsData, error: postsError }, { data: linksData, error: linksError }] =
        await Promise.all([
          supabase
            .from("social_posts")
            .select(
              `id,title,product,type,canva_url,canva_page,caption,platforms,scheduled_date,status,created_by,worker_user_id,reviewer_user_id,created_at,updated_at,associated_blog_id,
              associated_blog:associated_blog_id(id,title,slug,site),
              creator:created_by(id,full_name,email),
              worker:worker_user_id(id,full_name,email),
              reviewer:reviewer_user_id(id,full_name,email)`
            )
            .order("updated_at", { ascending: false }),
          supabase
            .from("social_post_links")
            .select("id,social_post_id,platform,url,created_by,created_at,updated_at")
            .order("created_at", { ascending: true }),
        ]);

      if (postsError) {
        console.error("Social posts load failed:", postsError);
        setError("Couldn't load posts. Please try again.");
        setIsLoading(false);
        return;
      }
      if (linksError) {
        console.error("Social post links load failed:", linksError);
        setError("Couldn't load post links. Please try again.");
        setIsLoading(false);
        return;
      }

      setPosts(normalizeSocialPostRows((postsData ?? []) as Array<Record<string, unknown>>));
      setPostLinks(
        normalizeSocialPostLinkRows((linksData ?? []) as Array<Record<string, unknown>>)
      );
      setIsLoading(false);
    };

    const loadAvailableUsers = async () => {
      const supabase = getSupabaseBrowserClient();
      const { data, error: usersError } = await supabase
        .from("profiles")
        .select("id,full_name,email")
        .order("full_name", { ascending: true });
      if (usersError) {
        console.error("Failed to load users:", usersError);
        showError("Couldn't load users. Please try again.");
        return;
      }
      setAvailableUsers(
        (data ?? []).map((row) => ({
          id: String(row.id ?? ""),
          full_name: String(row.full_name ?? ""),
          email: String(row.email ?? ""),
        }))
      );
    };

    void loadPosts();
    void loadAvailableUsers();
  }, [showError]);

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
    if (requestedAssociatedBlog) {
      setAssociatedBlogFilter(requestedAssociatedBlog);
    }
  }, [requestedAssociatedBlog]);

  useEffect(() => {
    if (!shouldOpenCreateModal) {
      setHasAppliedCreateQuery(false);
      return;
    }
    if (hasAppliedCreateQuery) {
      return;
    }
    initializeCreateForm();
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
    initializeCreateForm,
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
    const normalizedSearch = debouncedSearch.trim().toLowerCase();
    return posts.filter((post) => {
      const matchesStatus = statusFilter === "all" || post.status === statusFilter;
      if (!matchesStatus) {
        return false;
      }

      const matchesAssociatedBlog =
        associatedBlogFilter === "all" ||
        post.associated_blog_id === associatedBlogFilter;
      if (!matchesAssociatedBlog) {
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
  }, [associatedBlogFilter, debouncedSearch, posts, statusFilter]);

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
        case "created":
          comparison = a.created_at.localeCompare(b.created_at);
          break;
        case "published": {
          const aPublishedDate = a.status === "published" ? a.updated_at : "";
          const bPublishedDate = b.status === "published" ? b.updated_at : "";
          comparison = aPublishedDate.localeCompare(bPublishedDate);
          break;
        }
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
  }, [associatedBlogFilter, search, statusFilter, listRowLimit]);

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
  const panelCanEditBrief = activePost
    ? isAdmin || activePost.status === "draft" || activePost.status === "changes_requested"
    : false;
  const canCurrentUserActOnPost = useCallback(
    (post: SocialPostWithRelations) =>
      canUserActOnStatus({
        status: post.status,
        workerUserId: post.worker_user_id,
        reviewerUserId: post.reviewer_user_id,
        userId: user?.id ?? null,
        isAdmin,
      }),
    [isAdmin, user?.id]
  );
  const getUserDisplayNameById = useCallback(
    (userId: string | null | undefined) => {
      if (!userId) {
        return "Team";
      }
      const match = availableUsers.find((entry) => entry.id === userId);
      return match?.full_name?.trim() || "Team";
    },
    [availableUsers]
  );
  const getTargetUserNameForStatus = useCallback(
    (status: SocialPostStatus, post: SocialPostWithRelations) => {
      if (status === "in_review" || status === "creative_approved") {
        return post.reviewer_name || getUserDisplayNameById(post.reviewer_user_id);
      }
      if (status === "published") {
        return "Team";
      }
      return post.worker_name || getUserDisplayNameById(post.worker_user_id);
    },
    [getUserDisplayNameById]
  );

  const loadPanelDetails = useCallback(async (postId: string) => {
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
      console.error("Failed to load comments:", commentsError);
      setPanelError("Couldn't load comments. Please try again.");
      setPanelComments([]);
      setPanelActivity([]);
      setIsPanelLoading(false);
      return;
    }
    if (activityError) {
      console.error("Failed to load activity:", activityError);
      setPanelError("Couldn't load activity history. Please try again.");
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
  }, []);

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
  }, [activePost, linksByPost, loadPanelDetails]);

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
          console.error("Failed to search blogs:", searchError);
          setPanelError("Couldn't search blogs. Please try again.");
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
  useEffect(() => {
    const query = createBlogSearchQuery.trim();
    if (!isCreateModalOpen || !isCreateBlogSearchOpen || query.length === 0) {
      setCreateBlogSearchResults([]);
      setIsCreateBlogSearchLoading(false);
      return;
    }

    const timeout = window.setTimeout(() => {
      void (async () => {
        const supabase = getSupabaseBrowserClient();
        setIsCreateBlogSearchLoading(true);
        const { data, error: searchError } = await supabase.rpc("search_blog_lookup", {
          p_query: query,
          p_limit: 8,
        });
        if (searchError) {
          console.error("Failed to search blogs for create modal:", searchError);
          setError("Couldn't search blogs. Please try again.");
          setCreateBlogSearchResults([]);
          setIsCreateBlogSearchLoading(false);
          return;
        }
        setCreateBlogSearchResults((data ?? []) as BlogLookupResult[]);
        setIsCreateBlogSearchLoading(false);
      })();
    }, 220);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [createBlogSearchQuery, isCreateBlogSearchOpen, isCreateModalOpen]);

  const calendarRange = useMemo(() => {
    if (calendarMode === "month") {
      const monthStart = startOfMonth(activeMonth);
      return {
        start: startOfWeek(monthStart, { weekStartsOn: calendarWeekStart }),
        end: endOfWeek(endOfMonth(activeMonth), { weekStartsOn: calendarWeekStart }),
      };
    }
    const start = startOfWeek(activeMonth, { weekStartsOn: calendarWeekStart });
    return {
      start,
      end: endOfWeek(start, { weekStartsOn: calendarWeekStart }),
    };
  }, [activeMonth, calendarMode, calendarWeekStart]);

  const calendarDays = useMemo(
    () =>
      eachDayOfInterval({
        start: calendarRange.start,
        end: calendarRange.end,
      }),
    [calendarRange.end, calendarRange.start]
  );
  useEffect(() => {
    if (view !== "calendar" || calendarDays.length === 0) {
      return;
    }
    const todayKey = todayCalendarDateKey;
    const isTodayVisible = calendarDays.some((day) => format(day, "yyyy-MM-dd") === todayKey);
    setFocusedCalendarDateKey((previous) => {
      if (
        previous &&
        calendarDays.some((day) => format(day, "yyyy-MM-dd") === previous)
      ) {
        return previous;
      }
      return isTodayVisible ? todayKey : format(calendarDays[0], "yyyy-MM-dd");
    });
  }, [calendarDays, todayCalendarDateKey, view]);
  const weekdayLabels = useMemo(
    () => getWeekdayLabels(calendarWeekStart),
    [calendarWeekStart]
  );
  const todayWeekdayColumnIndex = useMemo(() => {
    const todayDate = new Date(`${todayCalendarDateKey}T00:00:00`);
    return (todayDate.getDay() - calendarWeekStart + 7) % 7;
  }, [calendarWeekStart, todayCalendarDateKey]);

  const calendarPostsByDate = useMemo(() => {
    const postsByDate = filteredPosts.reduce<Record<string, SocialPostWithRelations[]>>(
      (acc, post) => {
        if (!post.scheduled_date) {
          return acc;
        }
        if (!acc[post.scheduled_date]) {
          acc[post.scheduled_date] = [];
        }
        acc[post.scheduled_date].push(post);
        return acc;
      },
      {}
    );
    for (const [dateKey, postsForDay] of Object.entries(postsByDate)) {
      postsByDate[dateKey] = [...postsForDay].sort((left, right) =>
        left.title.localeCompare(right.title)
      );
    }
    return postsByDate;
  }, [filteredPosts]);
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (view !== "calendar") {
        return;
      }
      if (event.key === "Escape") {
        setActivePostId(null);
        return;
      }
      const eventTarget = event.target as HTMLElement | null;
      if (
        eventTarget &&
        (eventTarget.tagName === "INPUT" ||
          eventTarget.tagName === "TEXTAREA" ||
          eventTarget.tagName === "SELECT" ||
          eventTarget.isContentEditable)
      ) {
        return;
      }
      if (event.metaKey || event.ctrlKey || event.altKey) {
        return;
      }
      if (!focusedCalendarDateKey || calendarGridRef.current === null) {
        return;
      }
      const isNavigationKey =
        event.key === "ArrowLeft" ||
        event.key === "ArrowRight" ||
        event.key === "ArrowUp" ||
        event.key === "ArrowDown" ||
        event.key === "j" ||
        event.key === "J" ||
        event.key === "k" ||
        event.key === "K" ||
        event.key === "Enter" ||
        event.key === "Home" ||
        event.key === "PageUp" ||
        event.key === "PageDown";
      if (!isNavigationKey) {
        return;
      }
      event.preventDefault();
      const currentDate = new Date(`${focusedCalendarDateKey}T00:00:00`);
      let nextDate: Date;
      if (event.key === "ArrowLeft" || event.key === "k" || event.key === "K") {
        nextDate = addDays(currentDate, -1);
      } else if (event.key === "ArrowRight" || event.key === "j" || event.key === "J") {
        nextDate = addDays(currentDate, 1);
      } else if (event.key === "ArrowUp") {
        nextDate = addDays(currentDate, -7);
      } else if (event.key === "ArrowDown") {
        nextDate = addDays(currentDate, 7);
      } else if (event.key === "Home") {
        const todayDate = new Date(`${todayCalendarDateKey}T00:00:00`);
        setFocusedCalendarDateKey(todayCalendarDateKey);
        setActiveMonth(todayDate);
        if (typeof window !== "undefined") {
          window.requestAnimationFrame(() => {
            scrollTodayCalendarTileIntoView();
          });
        }
        return;
      } else if (event.key === "PageUp" || event.key === "PageDown") {
        const delta = event.key === "PageDown" ? 1 : -1;
        nextDate =
          calendarMode === "month"
            ? addMonths(currentDate, delta)
            : addWeeks(currentDate, delta);
      } else if (event.key === "Enter") {
        const dayItems = calendarPostsByDate[focusedCalendarDateKey] ?? [];
        if (dayItems.length > 0) {
          setActivePostId(dayItems[0].id);
        }
        return;
      } else {
        return;
      }
      const nextKey = format(nextDate, "yyyy-MM-dd");
      setFocusedCalendarDateKey(nextKey);
      setActiveMonth((previous) => {
        if (calendarMode === "month") {
          if (
            nextDate.getMonth() !== previous.getMonth() ||
            nextDate.getFullYear() !== previous.getFullYear()
          ) {
            return nextDate;
          }
        } else {
          const weekStartDate = startOfWeek(previous, {
            weekStartsOn: calendarWeekStart,
          });
          const weekEndDate = endOfWeek(weekStartDate, {
            weekStartsOn: calendarWeekStart,
          });
          if (!isWithinInterval(nextDate, { start: weekStartDate, end: weekEndDate })) {
            return nextDate;
          }
        }
        return previous;
      });
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [
    calendarMode,
    calendarPostsByDate,
    calendarWeekStart,
    focusedCalendarDateKey,
    scrollTodayCalendarTileIntoView,
    todayCalendarDateKey,
    view,
  ]);

  const unscheduledPosts = useMemo(
    () => filteredPosts.filter((post) => !post.scheduled_date),
    [filteredPosts]
  );
  const activeFilterPills = useMemo(
    () => {
      const associatedBlogTitle =
        associatedBlogFilter !== "all"
          ? posts.find((p) => p.associated_blog_id === associatedBlogFilter)
              ?.associated_blog?.title
          : null;
      return [
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
        associatedBlogFilter !== "all" && associatedBlogTitle
          ? {
              id: "associated_blog",
              label: `Blog: ${associatedBlogTitle}`,
              onRemove: () => {
                setAssociatedBlogFilter("all");
              },
            }
          : null,
      ].filter((pill) => pill !== null);
    },
    [associatedBlogFilter, posts, search, statusFilter]
  );
  const clearAllFilters = () => {
    setSearch("");
    setStatusFilter("all");
    setAssociatedBlogFilter("all");
    setListCurrentPage(1);
  };
  const closeOpenDetailsMenus = useCallback(() => {
    document.querySelectorAll<HTMLDetailsElement>("details[open]").forEach((menu) => {
      menu.open = false;
    });
  }, []);

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
      setError("Please sign in to continue.");
      return;
    }
    if (!session?.access_token) {
      setError("Your session expired. Please sign in again.");
      return;
    }

    const trimmedTitle = newTitle.trim();
    const normalizedPlatforms = Array.from(new Set(newPlatforms));

    const workerUserId = isAdmin ? newWorkerUserId : user.id;
    const reviewerUserId = newReviewerUserId;
    if (!workerUserId) {
      setError("Assigned to is required.");
      return;
    }
    if (!reviewerUserId) {
      setError("Reviewer is required.");
      return;
    }

    setIsCreating(true);
    setError(null);
    const createResponse = await fetch("/api/social-posts", {
      method: "POST",
      headers: {
        authorization: `Bearer ${session.access_token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        title: trimmedTitle,
        product: newProduct,
        type: newType,
        platforms: normalizedPlatforms,
        scheduled_date: newScheduledDate || null,
        worker_user_id: workerUserId,
        reviewer_user_id: reviewerUserId,
        associated_blog_id: newAssociatedBlogId,
      }),
    }).catch(() => null);

    if (!createResponse) {
      setError("Couldn't create post. Please try again.");
      setIsCreating(false);
      return;
    }
    const createPayload = await parseApiResponseJson<Record<string, unknown>>(
      createResponse
    );
    if (isApiFailure(createResponse, createPayload)) {
      setError(getApiErrorMessage(createPayload, "Couldn't create post. Please try again."));
      setIsCreating(false);
      return;
    }
    const createdPostRow =
      typeof createPayload.post === "object" && createPayload.post !== null
        ? (createPayload.post as Record<string, unknown>)
        : null;
    if (!createdPostRow) {
      setError("Couldn't create post. Please try again.");
      setIsCreating(false);
      return;
    }

    const [createdPost] = normalizeSocialPostRows([createdPostRow]);
    if (createdPost) {
      setPosts((previous) => [createdPost, ...previous]);
      router.push(`/social-posts/${createdPost.id}`);
    }
    const nextDefaults: SocialPostCreateDefaults = {
      product: newProduct,
      type: newType,
      platforms: normalizedPlatforms,
    };
    setCreateDefaults(nextDefaults);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(
        CREATE_DEFAULTS_STORAGE_KEY,
        JSON.stringify(nextDefaults)
      );
    }
    closeCreateModal();
    showSuccess("Social post created.");
    setIsCreating(false);
  };

  const transitionPostStatus = useCallback(async (
    {
      post,
      toStatus,
    }: {
      post: SocialPostWithRelations;
      toStatus: SocialPostStatus;
    },
    options?: { changeRequestTemplate?: ChangeRequestTemplateState | null }
  ) => {
    const postId = post.id;
    const title = post.title;
    const currentStatus = post.status;
    if (currentStatus === toStatus) {
      return true;
    }
    if (!canCurrentUserActOnPost(post)) {
      setError(ASSIGNED_USER_HELPER_TEXT);
      return false;
    }
    const allowedTransitions = SOCIAL_POST_ALLOWED_TRANSITIONS[currentStatus] ?? [];
    if (!allowedTransitions.includes(toStatus)) {
      setError(
        `That status change isn’t available from ${SOCIAL_POST_STATUS_LABELS[currentStatus]} to ${SOCIAL_POST_STATUS_LABELS[toStatus]}.`
      );
      return false;
    }
    if (!session?.access_token) {
      setError("Your session expired. Please sign in again.");
      return false;
    }

    let reason: string | null = null;
    if (toStatus === "changes_requested") {
      const template = options?.changeRequestTemplate ?? null;
      if (!template) {
        setPendingChangeRequestTransition({
          postId,
          toStatus,
          template: createEmptyChangeRequestTemplate(),
        });
        return false;
      }
      const templateError = getChangeRequestTemplateError(template);
      if (templateError) {
        setError(templateError);
        return false;
      }
      reason = formatChangeRequestReason(template);
    }
    const requiresRollbackReason =
      toStatus === "changes_requested" &&
      (currentStatus === "ready_to_publish" ||
        currentStatus === "awaiting_live_link");
    if (requiresRollbackReason && !reason) {
      setError("Rollback reason is required.");
      return false;
    }

    const transitionPayload: Record<string, unknown> = { nextStatus: toStatus };
    if (reason) {
      transitionPayload.reason = reason;
    }
    const response = await fetch(`/api/social-posts/${postId}/transition`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${session.access_token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify(transitionPayload),
    }).catch(() => null);
    if (!response) {
      setError("Couldn't change post status.");
      return false;
    }
    const payload = await parseApiResponseJson<Record<string, unknown>>(response);
    if (isApiFailure(response, payload)) {
      setError(getApiErrorMessage(payload, "Couldn't change post status."));
      return false;
    }
    pushNotification(
      socialPostStatusChangedNotification(
        title,
        currentStatus,
        toStatus,
        profile?.full_name ?? null,
        postId,
        getTargetUserNameForStatus(toStatus, post)
      )
    );
    return true;
  }, [
    canCurrentUserActOnPost,
    getTargetUserNameForStatus,
    profile?.full_name,
    pushNotification,
    session?.access_token,
  ]);

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
    if (!canCurrentUserActOnPost(post)) {
      setError(ASSIGNED_USER_HELPER_TEXT);
      return;
    }

    const transitioned = await transitionPostStatus({
      post,
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
    showSuccess(`Status moved to ${SOCIAL_POST_STATUS_LABELS[nextStatus]}.`);
    if (activePostId === post.id) {
      void loadPanelDetails(post.id);
    }
  };

  const handleSavePostDetails = async () => {
    if (!activePost || !panelForm) {
      return;
    }
    const trimmedTitle = panelForm.title.trim();

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
    const canEditBrief = isAdmin || activePost.status === "draft" || activePost.status === "changes_requested";
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

    if (!canEditBrief && briefChanged) {
      setPanelError(
        "Brief details are locked at this stage."
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
        console.error("Failed to save post:", updateError);
        setPanelError("Couldn't save post. Please try again.");
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
        post: activePost,
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
    showSuccess("Post saved.");
    await loadPanelDetails(activePost.id);
    setIsPanelSaving(false);
  };

  const submitReopenBrief = async (reason: string | null) => {
    if (!activePost) {
      return;
    }
    if (!session?.access_token) {
      setPanelError("Your session expired. Please sign in again.");
      return;
    }
    const response = await fetch(`/api/social-posts/${activePost.id}/reopen-brief`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${session.access_token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        reason,
      }),
    }).catch(() => null);
    if (!response) {
      setPanelError("Couldn't reopen brief.");
      return;
    }
    const payload = await parseApiResponseJson<Record<string, unknown>>(response);
    if (isApiFailure(response, payload)) {
      setPanelError(getApiErrorMessage(payload, "Couldn't reopen brief."));
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
        activePost.id,
        getTargetUserNameForStatus("creative_approved", activePost)
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
  const handleReopenBrief = () => {
    setReopenBriefReason("");
    setIsReopenBriefModalOpen(true);
  };
  const confirmPendingChangeRequestTransition = useCallback(async () => {
    if (!pendingChangeRequestTransition) {
      return;
    }
    const templateError = getChangeRequestTemplateError(
      pendingChangeRequestTransition.template
    );
    if (templateError) {
      setError(templateError);
      return;
    }
    const targetPost =
      posts.find(
        (candidate) => candidate.id === pendingChangeRequestTransition.postId
      ) ?? null;
    if (!targetPost) {
      setPendingChangeRequestTransition(null);
      setError("Post no longer available.");
      return;
    }

    const nextStatus = pendingChangeRequestTransition.toStatus;
    const transitionTemplate = pendingChangeRequestTransition.template;
    setPendingChangeRequestTransition(null);
    const transitioned = await transitionPostStatus(
      {
        post: targetPost,
        toStatus: nextStatus,
      },
      {
        changeRequestTemplate: transitionTemplate,
      }
    );
    if (!transitioned) {
      return;
    }

    setPosts((previous) =>
      previous.map((entry) =>
        entry.id === targetPost.id ? { ...entry, status: nextStatus } : entry
      )
    );
    setPanelForm((previous) => (previous ? { ...previous, status: nextStatus } : previous));
    showSuccess(`Status moved to ${SOCIAL_POST_STATUS_LABELS[nextStatus]}.`);
    if (activePostId === targetPost.id) {
      await loadPanelDetails(targetPost.id);
    }
  }, [
    activePostId,
    loadPanelDetails,
    pendingChangeRequestTransition,
    posts,
    showSuccess,
    transitionPostStatus,
  ]);

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
            console.error("Failed to delete link:", deleteError);
            throw new Error("Failed to delete link");
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
          console.error("Failed to save link:", upsertError);
          throw new Error("Failed to save link");
        }
      }

      const { data: linksData, error: linksError } = await supabase
        .from("social_post_links")
        .select("id,social_post_id,platform,url,created_by,created_at,updated_at")
        .eq("social_post_id", activePost.id)
        .order("created_at", { ascending: true });
      if (linksError) {
        console.error("Failed to fetch links:", linksError);
        throw new Error("Failed to fetch links");
      }

      const normalizedLinks = normalizeSocialPostLinkRows(
        (linksData ?? []) as Array<Record<string, unknown>>
      );
      setPostLinks((previous) => [
        ...previous.filter((link) => link.social_post_id !== activePost.id),
        ...normalizedLinks,
      ]);
      await loadPanelDetails(activePost.id);
      showSuccess("Links saved.");
    } catch (saveError) {
      console.error("Error saving links:", saveError);
      setPanelError("Couldn't save links. Please try again.");
    } finally {
      setIsLinksSaving(false);
    }
  };

  const handleAddComment = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!activePost || !user?.id) {
      return;
    }
    if (!session?.access_token) {
      setPanelError("Your session expired. Please sign in again.");
      return;
    }
    const trimmedComment = panelCommentDraft.trim();
    if (!trimmedComment) {
      setPanelError("Comment cannot be empty.");
      return;
    }

    setIsCommentSaving(true);
    setPanelError(null);

    const createResponse = await fetch(`/api/social-posts/${activePost.id}/comments`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${session.access_token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        comment: trimmedComment,
        parent_comment_id: replyToComment?.id ?? null,
      }),
    }).catch(() => null);

    if (!createResponse) {
      setPanelError("Couldn't add comment. Please try again.");
      setIsCommentSaving(false);
      return;
    }
    const createPayload = await parseApiResponseJson<Record<string, unknown>>(createResponse);
    if (isApiFailure(createResponse, createPayload)) {
      setPanelError(getApiErrorMessage(createPayload, "Couldn't add comment. Please try again."));
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

  const [isDeletingPost, setIsDeletingPost] = useState(false);
  const [openRowMenuId, setOpenRowMenuId] = useState<string | null>(null);
  const [selectedRowIndices, setSelectedRowIndices] = useState<Set<number>>(new Set());
  const [pendingDeleteRequest, setPendingDeleteRequest] = useState<PendingDeleteRequest | null>(
    null
  );

  const handleBulkDelete = () => {
    if (selectedRowIndices.size === 0 || !session?.access_token) {
      return;
    }

    const postsToDelete = Array.from(selectedRowIndices).map((idx) => pagedListPosts[idx]);
    const deletablePosts = postsToDelete.filter((p) => p.status !== "published");
    const publishedCount = postsToDelete.length - deletablePosts.length;

    if (deletablePosts.length === 0) {
      showError("Published posts can’t be deleted.");
      return;
    }

    setPendingDeleteRequest({
      kind: "bulk",
      postIds: deletablePosts.map((post) => post.id),
      publishedCount,
    });
  };

  const handleDeletePost = useCallback(
    (postIdParam?: string) => {
      const post = postIdParam ? posts.find((p) => p.id === postIdParam) : activePost;
      if (!post || !session?.access_token) {
        return;
      }
      setPendingDeleteRequest({
        kind: "single",
        postId: post.id,
        source: postIdParam ? "table" : "panel",
      });
    },
    [activePost, posts, session?.access_token]
  );

  const confirmPendingDelete = useCallback(async () => {
    if (!pendingDeleteRequest || !session?.access_token) {
      return;
    }

    setIsDeletingPost(true);
    setPanelError(null);
    setOpenRowMenuId(null);

    if (pendingDeleteRequest.kind === "single") {
      const response = await fetch(`/api/social-posts/${pendingDeleteRequest.postId}`, {
        method: "DELETE",
        headers: {
          authorization: `Bearer ${session.access_token}`,
          "content-type": "application/json",
        },
      });
      const payload = await parseApiResponseJson<Record<string, unknown>>(response);
      if (isApiFailure(response, payload)) {
        const errorMessage = getApiErrorMessage(payload, "Couldn't delete post. Please try again.");
        if (pendingDeleteRequest.source === "panel") {
          setPanelError(errorMessage);
        } else {
          showError(errorMessage);
        }
        setIsDeletingPost(false);
        setPendingDeleteRequest(null);
        return;
      }

      const postId = pendingDeleteRequest.postId;
      setPosts((previous) => previous.filter((post) => post.id !== postId));
      setPostLinks((previous) => previous.filter((link) => link.social_post_id !== postId));
      if (activePost?.id === postId || pendingDeleteRequest.source === "panel") {
        setActivePostId(null);
      }
      showSuccess("Post deleted.");
      setIsDeletingPost(false);
      setPendingDeleteRequest(null);
      return;
    }

    const deleteResults = await Promise.allSettled(
      pendingDeleteRequest.postIds.map(async (postId) => {
        const response = await fetch(`/api/social-posts/${postId}`, {
          method: "DELETE",
          headers: {
            authorization: `Bearer ${session.access_token}`,
            "content-type": "application/json",
          },
        });
        const payload = await parseApiResponseJson<Record<string, unknown>>(response);
        const isFailure = isApiFailure(response, payload);
        return { postId, isFailure } as const;
      })
    );

    const successfulPostIds: string[] = [];
    let failureCount = 0;
    for (const result of deleteResults) {
      if (result.status === "rejected" || result.value.isFailure) {
        failureCount += 1;
        continue;
      }
      successfulPostIds.push(result.value.postId);
    }
    const successCount = successfulPostIds.length;

    if (successfulPostIds.length > 0) {
      const deletedIdSet = new Set(successfulPostIds);
      setPosts((previous) => previous.filter((post) => !deletedIdSet.has(post.id)));
      setPostLinks((previous) =>
        previous.filter((link) => !deletedIdSet.has(link.social_post_id))
      );
      setSelectedRowIndices(new Set());
    }

    let message = "";
    if (successCount > 0) {
      message = `Deleted ${successCount} post${successCount === 1 ? "" : "s"}`;
    }
    if (failureCount > 0) {
      message +=
        (message ? ", " : "") +
        `couldn’t delete ${failureCount} post${failureCount === 1 ? "" : "s"}`;
    }
    if (pendingDeleteRequest.publishedCount > 0) {
      message +=
        (message ? ", " : "") +
        `skipped ${pendingDeleteRequest.publishedCount} published post${
          pendingDeleteRequest.publishedCount === 1 ? "" : "s"
        }`;
    }
    if (!message) {
      message = "No posts were deleted.";
    }

    if (failureCount === 0 && pendingDeleteRequest.publishedCount === 0) {
      showSuccess(message);
    } else {
      showError(message);
    }
    setIsDeletingPost(false);
    setPendingDeleteRequest(null);
  }, [
    activePost?.id,
    pendingDeleteRequest,
    session?.access_token,
    showError,
    showSuccess,
  ]);


  const renderCommentTree = (parentId: string | null, depth: number) => {
    const comments = commentChildren[parentId ?? "root"] ?? [];
    if (comments.length === 0) {
      return null;
    }

    return (
      <ul className={depth === 0 ? "space-y-3" : "mt-3 space-y-3 border-l-2 border-[color:var(--sh-gray-200)] pl-4"}>
        {comments.map((comment) => (
          <li
            key={comment.id}
            className="overflow-hidden rounded-lg border border-[color:var(--sh-gray-200)] bg-white p-4 shadow-sm hover:shadow-md transition-shadow"
          >
            <p className="text-xs font-semibold text-navy-500">
              {comment.author?.full_name ?? "Unknown"}  <span className="font-normal text-navy-500/60">•</span>{" "}
              <time className="font-normal text-navy-500/60">
                {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
              </time>
            </p>
            <div className="mt-2 text-sm text-navy-500">
              <MarkdownComment content={comment.comment} />
            </div>
            <div className="mt-3">
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
        align: "left",
        sortable: true,
        render: (post) => (
          <SocialPostStatusInfo
            status={post.status}
            workerUserId={post.worker_user_id}
            workerUserName={post.worker_name}
            reviewerUserId={post.reviewer_user_id}
            reviewerUserName={post.reviewer_name}
            currentUserId={user?.id}
          />
        ),
      },
      {
        id: "created",
        label: "Created",
        sortable: true,
        render: (post) => formatDateOnly(post.created_at),
      },
      {
        id: "scheduled",
        label: "Scheduled Publish",
        sortable: true,
        render: (post) => formatDateOnly(post.scheduled_date) || "—",
      },
      {
        id: "published",
        label: "Published Date",
        sortable: true,
        // Use `scheduled_date` as the authoritative published date for
        // published posts. `updated_at` drifts on any subsequent edit
        // (e.g. saving a live link), which would silently change the
        // "Published Date" column after publication. `scheduled_date`
        // reflects the agreed-upon publish day and remains stable.
        render: (post) =>
          post.status === "published"
            ? formatDateOnly(post.scheduled_date) || "—"
            : "—",
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
                className="inline-flex items-center justify-center rounded px-2 py-1 text-navy-500 transition-colors hover:bg-blurple-50 hover:text-ink focus-visible:outline-none focus-visible:shadow-brand-focus"
                aria-label="Open row actions"
              >
                <MoreIcon boxClassName="h-5 w-5" size={16} />
              </button>
              {isOpen ? (
                <div
                  className="absolute right-0 top-full z-20 mt-1 w-36 rounded-md border border-[color:var(--sh-gray-200)] bg-white py-1 shadow-lg"
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
                    className="block w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:text-navy-500/60"
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
  const mandatoryColumnSet = useMemo(
    () => new Set<string>(SOCIAL_POST_LIST_MANDATORY_COLUMNS),
    []
  );
  const mandatoryTableColumns = useMemo(
    () => allTableColumns.filter((column) => mandatoryColumnSet.has(column.id)),
    [allTableColumns, mandatoryColumnSet]
  );
  const optionalTableColumns = useMemo(
    () => allTableColumns.filter((column) => !mandatoryColumnSet.has(column.id)),
    [allTableColumns, mandatoryColumnSet]
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
                    initializeCreateForm();
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
              <div className="flex flex-wrap gap-2">
                <select
                  aria-label="Status"
                  value={statusFilter}
                  onChange={(event) => {
                    setStatusFilter(event.target.value as SocialPostStatus | "all");
                  }}
                  className="focus-field rounded-md border border-[color:var(--sh-gray-200)] bg-white px-3 py-2 text-sm text-navy-500"
                >
                  <option value="all">All Statuses</option>
                  {SOCIAL_POST_STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {SOCIAL_POST_STATUS_LABELS[status]}
                    </option>
                  ))}
                </select>
                <select
                  aria-label="Associated Blog"
                  value={associatedBlogFilter}
                  onChange={(event) => {
                    setAssociatedBlogFilter(event.target.value);
                  }}
                  className="focus-field rounded-md border border-[color:var(--sh-gray-200)] bg-white px-3 py-2 text-sm text-navy-500"
                >
                  <option value="all">All Blogs</option>
                  {Array.from(
                    new Map(
                      posts
                        .filter(
                          (post) =>
                            post.associated_blog_id && post.associated_blog
                        )
                        .map((post) => [
                          post.associated_blog_id as string,
                          post.associated_blog?.title,
                        ])
                    )
                  ).map(([blogId, blogTitle]) => (
                    <option key={blogId} value={blogId}>
                      {blogTitle}
                    </option>
                  ))}
                </select>
              </div>
            }
          />
          <DataPageFilterPills pills={activeFilterPills} />


          {isLoading ? (
            <div className="space-y-3 rounded-lg border border-[color:var(--sh-gray-200)] p-4 sm:p-5">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={`skeleton-row-${i}`} className="skeleton h-12 w-full" />
              ))}
            </div>
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
                    currentUserId={user?.id}
                    canCurrentUserActOnPost={canCurrentUserActOnPost}
                  />
                ))}
              </section>
            </DndContext>
          ) : view === "list" ? (
            <section className={DATA_PAGE_TABLE_SECTION_CLASS}>
              <div className={`${DATA_PAGE_CONTROL_STRIP_CLASS} relative`}>
                <div className={DATA_PAGE_CONTROL_ROW_CLASS}>
                  <TableResultsSummary
                    totalRows={filteredPosts.length}
                    currentPage={listCurrentPage}
                    rowLimit={listRowLimit}
                    noun="social posts"
                  />
                  <div className={DATA_PAGE_CONTROL_ACTIONS_CLASS}>
                    <details className="relative">
                      <summary
                        className={`${DATA_PAGE_CONTROL_ACTION_BUTTON_CLASS} cursor-pointer list-none border border-[color:var(--sh-gray-200)] bg-white text-navy-500 hover:bg-blurple-50`}
                      >
                        Customize
                      </summary>
                      <div className="absolute right-0 z-20 mt-1 w-72 rounded-md border border-[color:var(--sh-gray-200)] bg-white p-2 shadow-md">
                        <div className="flex items-center justify-between">
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-navy-500">
                            Show Columns
                          </p>
                          <button
                            type="button"
                            className="pressable rounded border border-[color:var(--sh-gray-200)] bg-white px-2 py-1 text-[11px] font-medium text-navy-500 hover:bg-blurple-50"
                            onClick={() => {
                              setVisibleColumns(
                                new Set(SOCIAL_POST_LIST_MANDATORY_COLUMNS)
                              );
                              setListRowDensity("compact");
                              closeOpenDetailsMenus();
                            }}
                          >
                            Reset Defaults
                          </button>
                        </div>
                        <div className="mt-2 flex items-center justify-between rounded border border-[color:var(--sh-gray-200)] bg-[color:var(--sh-gray)] px-2 py-1.5">
                          <span className="text-[11px] font-semibold uppercase tracking-wide text-navy-500">
                            Density
                          </span>
                          <div className={`${SEGMENTED_CONTROL_CLASS} text-xs`}>
                            <button
                              type="button"
                              className={segmentedControlItemClass({
                                isActive: listRowDensity === "compact",
                                className: "px-2 py-1 text-xs",
                              })}
                              onClick={() => {
                                setListRowDensity("compact");
                              }}
                            >
                              Compact
                            </button>
                            <button
                              type="button"
                              className={segmentedControlItemClass({
                                isActive: listRowDensity === "comfortable",
                                className: "px-2 py-1 text-xs",
                              })}
                              onClick={() => {
                                setListRowDensity("comfortable");
                              }}
                            >
                              Comfortable
                            </button>
                          </div>
                        </div>
                        <div className="mt-3">
                          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-navy-500">
                            Mandatory Columns
                          </p>
                          <div className="space-y-1">
                            {mandatoryTableColumns.map((column) => (
                              <label
                                key={column.id}
                                className="inline-flex w-full items-center justify-between gap-2 rounded px-1 py-1 text-xs text-navy-500"
                              >
                                <span>{column.label}</span>
                                <input
                                  type="checkbox"
                                  checked={true}
                                  disabled
                                  className="cursor-not-allowed"
                                />
                              </label>
                            ))}
                          </div>
                        </div>
                        <div className="mt-3">
                          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-navy-500">
                            Optional Columns
                          </p>
                          <div className="space-y-1">
                            {optionalTableColumns.map((column) => (
                              <label
                                key={column.id}
                                className="inline-flex w-full items-center justify-between gap-2 rounded px-1 py-1 text-xs text-navy-500 hover:bg-blurple-50"
                              >
                                <span>{column.label || "Actions"}</span>
                                <input
                                  type="checkbox"
                                  checked={visibleColumns.has(column.id)}
                                  onChange={(event) => {
                                    const nextVisible = new Set(visibleColumns);
                                    for (const mandatoryColumn of SOCIAL_POST_LIST_MANDATORY_COLUMNS) {
                                      nextVisible.add(mandatoryColumn);
                                    }
                                    if (event.target.checked) {
                                      nextVisible.add(column.id);
                                    } else {
                                      nextVisible.delete(column.id);
                                    }
                                    setVisibleColumns(nextVisible);
                                  }}
                                />
                              </label>
                            ))}
                          </div>
                        </div>
                      </div>
                    </details>
                  </div>
                </div>
              </div>
              {selectedRowIndices.size > 0 ? (
                <div className="mb-3 flex items-center gap-2 rounded-md border border-[color:var(--sh-blurple-100)] bg-blurple-50 px-3 py-2">
                  <span className="text-sm font-medium text-blurple-800">
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
                density={listRowDensity}
                emptyMessage="No social posts found"
                showSelection={true}
                selectedIndices={selectedRowIndices}
                onSelectionChange={setSelectedRowIndices}
              />
              <div className={DATA_PAGE_CONTROL_STRIP_CLASS}>
                <TableRowLimitSelect
                  value={listRowLimit}
                  onChange={(value) => {
                    setListRowLimit(value);
                  }}
                />
                <TablePaginationControls
                  currentPage={listCurrentPage}
                  pageCount={listPageCount}
                  onPageChange={setListCurrentPage}
                />
              </div>
            </section>
          ) : (
            <section className="space-y-3">
              <CalendarControlBar
                periodLabel={
                  calendarMode === "month"
                    ? format(activeMonth, "MMMM yyyy")
                    : `${format(calendarRange.start, "MMM d")} – ${format(
                        calendarRange.end,
                        "MMM d, yyyy"
                      )}`
                }
                mode={calendarMode}
                monthInputValue={format(activeMonth, "yyyy-MM")}
                onPrev={() => {
                  setActiveMonth((previous) =>
                    calendarMode === "month" ? subMonths(previous, 1) : subWeeks(previous, 1)
                  );
                }}
                onToday={() => {
                  const todayDate = new Date(`${todayCalendarDateKey}T00:00:00`);
                  setActiveMonth(todayDate);
                  setFocusedCalendarDateKey(todayCalendarDateKey);
                  if (typeof window !== "undefined") {
                    window.requestAnimationFrame(() => {
                      scrollTodayCalendarTileIntoView();
                    });
                  }
                }}
                onNext={() => {
                  setActiveMonth((previous) =>
                    calendarMode === "month" ? addMonths(previous, 1) : addWeeks(previous, 1)
                  );
                }}
                onMonthInputChange={(nextValue) => {
                  if (!nextValue) {
                    return;
                  }
                  const nextDate = new Date(`${nextValue}-01T00:00:00`);
                  if (!Number.isNaN(nextDate.getTime())) {
                    setActiveMonth(nextDate);
                  }
                }}
                onModeChange={setCalendarMode}
              />
              <CalendarWeekdayHeaderRow
                labels={weekdayLabels}
                todayColumnIndex={todayWeekdayColumnIndex}
              />
              <CalendarGridSurface gridRef={calendarGridRef} containLayout>
                {calendarDays.map((day) => {
                  const key = format(day, "yyyy-MM-dd");
                  const items = calendarPostsByDate[key] ?? [];
                  const compact = calendarMode === "month";
                  const visiblePosts = compact ? items.slice(0, 3) : items;
                  const hiddenItemCount = compact
                    ? Math.max(0, items.length - visiblePosts.length)
                    : 0;
                  const isCurrentMonth = day.getMonth() === activeMonth.getMonth();
                  const isToday = key === todayCalendarDateKey;
                  return (
                    <div key={key} data-is-today={isToday}>
                      <CalendarTile
                        dayLabel={format(day, "d")}
                        isToday={isToday}
                        isCurrentMonth={isCurrentMonth}
                        isFocused={focusedCalendarDateKey === key}
                        className={compact ? "" : "min-h-[18rem]"}
                        bodyScrollable={!compact}
                        bodyClassName="space-y-1"
                        todayContainerClassName="border-blurple-300 bg-blurple-50"
                        todayDayLabelClassName="font-semibold text-blurple-700"
                        dayLabelClassName={!isToday ? "text-navy-500" : undefined}
                      >
                        <div className="space-y-1">
                          {!compact && visiblePosts.length === 0 ? (
                            <p className="text-xs text-navy-500/60">No posts</p>
                          ) : null}
                          {visiblePosts.map((post) => (
                            <button
                              key={post.id}
                              type="button"
                              className="block w-full rounded border border-[color:var(--sh-gray-200)] bg-[color:var(--sh-gray)] px-2 py-1 text-left text-xs text-navy-500 hover:bg-blurple-50"
                              onClick={() => {
                                openPostPanel(post.id);
                              }}
                              onContextMenu={(event) => {
                                event.preventDefault();
                                void handleDeletePost(post.id);
                              }}
                            >
                              <p className="truncate font-medium">{post.title}</p>
                              <p className="text-[10px] text-navy-500">
                                {SOCIAL_POST_STATUS_LABELS[post.status]}
                              </p>
                            </button>
                          ))}
                          {hiddenItemCount > 0 ? (
                            <button
                              type="button"
                              className="w-full rounded-md border border-dashed border-[color:var(--sh-gray-200)] bg-[color:var(--sh-gray)] px-2 py-1 text-[11px] font-medium text-navy-500 transition-colors hover:border-[color:var(--sh-gray-400)] hover:bg-blurple-50"
                              onClick={() => {
                                setCalendarMode("week");
                                setActiveMonth(day);
                                setFocusedCalendarDateKey(key);
                              }}
                            >
                              +{hiddenItemCount} more
                            </button>
                          ) : null}
                        </div>
                      </CalendarTile>
                    </div>
                  );
                })}
              </CalendarGridSurface>
              <section className="space-y-2">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-navy-500">
                  Unscheduled
                </h3>
                {unscheduledPosts.length === 0 ? (
                  <p className="rounded-md border border-[color:var(--sh-gray-200)] bg-[color:var(--sh-gray)] px-3 py-4 text-sm text-navy-500">
                    All visible posts have a scheduled date.
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {unscheduledPosts.map((post) => (
                      <li
                        key={post.id}
                        className="rounded-md border border-[color:var(--sh-gray-200)] px-3 py-2"
                      >
                        <button
                          type="button"
                          className="flex w-full items-center justify-between gap-2 text-left"
                          onClick={() => {
                            openPostPanel(post.id);
                          }}
                        >
                          <span className="font-medium text-ink">{post.title}</span>
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
              className="fixed inset-0 z-30 bg-ink/25"
              onClick={() => {
                setActivePostId(null);
              }}
            />
            <aside className="fixed inset-y-0 right-0 z-40 w-full max-w-2xl overflow-y-auto border-l border-[color:var(--sh-gray-200)] bg-white p-4 shadow-2xl">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold text-ink">{activePost.title}</h3>
              <p className="text-sm text-navy-500">
                    Created {formatDateInTimezone(activePost.created_at, profile?.timezone)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    onClick={() => {
                      router.push(getSocialPostEditorHref(activePost));
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


              <section className="mt-4 space-y-3 rounded-lg border border-[color:var(--sh-gray-200)] p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h4 className="text-sm font-semibold uppercase tracking-wide text-navy-500">
                    Basic Information
                  </h4>
                  <SocialPostStatusBadge status={panelForm.status} />
                </div>
                {!panelCanEditBrief ? (
                  <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                    <span>Brief fields are read-only at this stage for non-admin users.</span>
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
                {panelCanEditBrief && (
                  <div className="space-y-3 rounded-md border border-[color:var(--sh-blurple-100)] bg-blurple-50 p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-blurple-700">Required</p>
                    <div className="grid gap-3 md:grid-cols-2">
                      <label className="block">
                        <span className="mb-1 block text-sm font-medium text-navy-500">Product</span>
                        <select
                          value={panelForm.product}
                          onChange={(event) => {
                            setPanelForm((previous) =>
                              previous
                                ? { ...previous, product: event.target.value as SocialPostProduct }
                                : previous
                            );
                          }}
                          className="w-full rounded-md border border-[color:var(--sh-gray-200)] px-3 py-2 text-sm"
                        >
                          {SOCIAL_POST_PRODUCTS.map((product) => (
                            <option key={product} value={product}>
                              {SOCIAL_POST_PRODUCT_LABELS[product]}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="block">
                        <span className="mb-1 block text-sm font-medium text-navy-500">Type</span>
                        <select
                          value={panelForm.type}
                          onChange={(event) => {
                            setPanelForm((previous) =>
                              previous
                                ? { ...previous, type: event.target.value as SocialPostType }
                                : previous
                            );
                          }}
                          className="w-full rounded-md border border-[color:var(--sh-gray-200)] px-3 py-2 text-sm"
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
                      <span className="mb-1 block text-sm font-medium text-navy-500">Canva URL</span>
                      <input
                        type="url"
                        value={panelForm.canva_url}
                        onChange={(event) => {
                          setPanelForm((previous) =>
                            previous ? { ...previous, canva_url: event.target.value } : previous
                          );
                        }}
                        className="w-full rounded-md border border-[color:var(--sh-gray-200)] px-3 py-2 text-sm"
                        placeholder="https://www.canva.com/..."
                      />
                    </label>
                  </div>
                )}

                {/* OPTIONAL FIELDS (ALWAYS EDITABLE) */}
                <div className="space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-navy-500">Optional</p>
                  <label className="block">
                    <span className="mb-1 block text-sm font-medium text-navy-500">Canva Page</span>
                    <input
                      type="number"
                      min={1}
                      value={panelForm.canva_page}
                      onChange={(event) => {
                        setPanelForm((previous) =>
                          previous ? { ...previous, canva_page: event.target.value } : previous
                        );
                      }}
                      className="w-full rounded-md border border-[color:var(--sh-gray-200)] px-3 py-2 text-sm"
                      disabled={!panelCanEditBrief}
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-sm font-medium text-navy-500">Title</span>
                    <input
                      value={panelForm.title}
                      onChange={(event) => {
                        setPanelForm((previous) =>
                          previous ? { ...previous, title: event.target.value } : previous
                        );
                      }}
                      className="w-full rounded-md border border-[color:var(--sh-gray-200)] px-3 py-2 text-sm"
                      disabled={!panelCanEditBrief}
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-sm font-medium text-navy-500">Caption / Write-up</span>
                    <textarea
                      value={panelForm.caption}
                      onChange={(event) => {
                        setPanelForm((previous) =>
                          previous ? { ...previous, caption: event.target.value } : previous
                        );
                      }}
                      className="min-h-20 w-full rounded-md border border-[color:var(--sh-gray-200)] px-3 py-2 text-sm"
                      placeholder="Main social caption..."
                      disabled={!panelCanEditBrief}
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-sm font-medium text-navy-500">Associated Blog</span>
                    <input
                      value={blogSearchQuery}
                      onFocus={() => {
                        setIsBlogSearchOpen(true);
                      }}
                      onChange={(event) => {
                        setBlogSearchQuery(event.target.value);
                        setIsBlogSearchOpen(true);
                      }}
                      className="w-full rounded-md border border-[color:var(--sh-gray-200)] px-3 py-2 text-sm"
                      placeholder="Search blog title or slug..."
                      disabled={!panelCanEditBrief}
                    />
                    {panelForm.associated_blog_id ? (
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-navy-500">
                        <span>Linked blog ID: {panelForm.associated_blog_id}</span>
                        <button
                          type="button"
                          className="rounded border border-[color:var(--sh-gray-200)] bg-white px-2 py-1 font-medium text-navy-500 hover:bg-blurple-50 disabled:cursor-not-allowed disabled:opacity-60"
                          onClick={() => {
                            setPanelForm((previous) =>
                              previous ? { ...previous, associated_blog_id: null } : previous
                            );
                            setBlogSearchQuery("");
                            setBlogSearchResults([]);
                            setIsBlogSearchOpen(false);
                          }}
                          disabled={!panelCanEditBrief}
                        >
                          Clear
                        </button>
                      </div>
                    ) : null}
                    {isBlogSearchOpen && panelCanEditBrief ? (
                      <div className="mt-2 max-h-52 overflow-y-auto rounded-md border border-[color:var(--sh-gray-200)] bg-white">
                        {isBlogSearchLoading ? (
                          <p className="px-3 py-2 text-sm text-navy-500">Searching blogs…</p>
                        ) : blogSearchResults.length === 0 ? (
                          <p className="px-3 py-2 text-sm text-navy-500">No matching blogs.</p>
                        ) : (
                          blogSearchResults.map((blog) => (
                            <button
                              key={blog.id}
                              type="button"
                              className="block w-full border-b border-[color:var(--sh-gray)] px-3 py-2 text-left last:border-b-0 hover:bg-blurple-50"
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
                              <p className="text-sm font-medium text-ink">{blog.title}</p>
                              <p className="text-xs text-navy-500">
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
                  <p className="text-xs font-semibold uppercase tracking-wide text-navy-500">Schedule</p>
                  <div className="grid gap-3 md:grid-cols-2">
                    <label className="block">
                      <span className="mb-1 block text-sm font-medium text-navy-500">Scheduled Publish Date</span>
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
                        className="w-full rounded-md border border-[color:var(--sh-gray-200)] px-3 py-2 text-sm"
                      />
                    </label>
                    <label className="block">
                      <span className="mb-1 block text-sm font-medium text-navy-500">Published Date</span>
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
                        className="w-full rounded-md border border-[color:var(--sh-gray-200)] px-3 py-2 text-sm"
                      />
                    </label>
                  </div>
                </div>

                {/* PLATFORMS SELECTION */}
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-navy-500">Platforms</span>
                  <div className="flex flex-wrap gap-2">
                    {SOCIAL_PLATFORMS.map((platform) => {
                      const isSelected = panelForm.platforms.includes(platform);
                      return (
                        <button
                          key={platform}
                          type="button"
                          className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                            isSelected
                              ? "border-ink bg-ink text-white"
                              : "border-[color:var(--sh-gray-200)] bg-white text-navy-500 hover:bg-blurple-50"
                          } ${!panelCanEditBrief ? "cursor-not-allowed opacity-60" : ""}`}
                          onClick={() => {
                            if (panelCanEditBrief) {
                              setPanelForm((previous) => {
                                if (!previous) return previous;
                                const nextPlatforms = previous.platforms.includes(platform)
                                  ? previous.platforms.filter((entry) => entry !== platform)
                                  : [...previous.platforms, platform];
                                return { ...previous, platforms: nextPlatforms };
                              });
                            }
                          }}
                          disabled={!panelCanEditBrief}
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
                    disabled={isPanelSaving || !panelCanEditBrief}
                    className="rounded-md bg-ink px-4 py-2 text-sm font-semibold text-white hover:bg-navy-700 disabled:cursor-not-allowed disabled:cursor-not-allowed disabled:opacity-60"
                    onClick={() => {
                      void handleSavePostDetails();
                    }}
                  >
                    {isPanelSaving ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </section>

              <section className="mt-4 rounded-lg border border-[color:var(--sh-gray-200)] p-4">
                <h4 className="text-sm font-semibold uppercase tracking-wide text-navy-500">
                  Assignment
                </h4>
                <div className="mt-3 grid gap-2 md:grid-cols-2">
                  <div className="rounded-md border border-[color:var(--sh-gray-200)] bg-[color:var(--sh-gray)] px-3 py-2">
                    <p className="text-xs font-medium uppercase tracking-wide text-navy-500">
                      Assigned to
                    </p>
                    <p className="mt-1 text-sm text-ink">
                      {activePost.worker?.full_name ?? "Not assigned"}
                    </p>
                  </div>
                  <div className="rounded-md border border-[color:var(--sh-gray-200)] bg-[color:var(--sh-gray)] px-3 py-2">
                    <p className="text-xs font-medium uppercase tracking-wide text-navy-500">
                      Reviewer
                    </p>
                    <p className="mt-1 text-sm text-ink">
                      {activePost.reviewer?.full_name ?? "Not assigned"}
                    </p>
                  </div>
                </div>
              </section>
              <section className="mt-4 rounded-lg border border-[color:var(--sh-gray-200)] p-4">
                <h4 className="text-sm font-semibold uppercase tracking-wide text-navy-500">
                  Comments
                </h4>
                <form className="mt-3 space-y-2" onSubmit={handleAddComment}>
                  {replyToComment ? (
                    <div className="flex items-center justify-between rounded-md border border-[color:var(--sh-blurple-100)] bg-blurple-50 px-3 py-2 text-xs text-blurple-700">
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
                    className="min-h-24 w-full rounded-md border border-[color:var(--sh-gray-200)] px-3 py-2 text-sm"
                    placeholder="Add discussion or feedback..."
                  />
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={isCommentSaving}
                      className="rounded-md bg-ink px-3 py-2 text-sm font-semibold text-white hover:bg-navy-700 disabled:cursor-not-allowed disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isCommentSaving ? "Adding..." : "Add Comment"}
                    </button>
                  </div>
                </form>
                <div className="mt-3">
                  {panelComments.length === 0 ? (
                    <p className="text-sm text-navy-500">No comments yet.</p>
                  ) : (
                    renderCommentTree(null, 0)
                  )}
                </div>
              </section>

              {/* EXECUTION STAGE: LIVE LINKS */}
              {(panelForm.status === "ready_to_publish" || panelForm.status === "awaiting_live_link" || panelForm.status === "published") && (
                <section className="mt-4 space-y-3 rounded-lg border border-[color:var(--sh-gray-200)] p-4">
                  <h4 className="text-sm font-semibold uppercase tracking-wide text-navy-500">Live Links</h4>
                  <div className="space-y-2">
                    {SOCIAL_PLATFORMS.map((platform) => (
                      <label key={platform} className="block">
                        <span className="mb-1 block text-sm font-medium text-navy-500">{SOCIAL_PLATFORM_LABELS[platform]}</span>
                        <input
                          type="url"
                          value={panelLinksDraft[platform] ?? ""}
                          onChange={(event) => {
                            setPanelLinksDraft((previous) => ({
                              ...previous,
                              [platform]: event.target.value,
                            }));
                          }}
                          className="w-full rounded-md border border-[color:var(--sh-gray-200)] px-3 py-2 text-sm"
                          placeholder={`https://${platform}.com/...`}
                        />
                      </label>
                    ))}
                  </div>
                  {activePostLinks.length > 0 ? (
                    <div className="rounded-md border border-[color:var(--sh-gray-200)] bg-[color:var(--sh-gray)] px-3 py-2 text-xs text-navy-500">
                      <p className="font-medium text-navy-500">Saved Links</p>
                      <ul className="mt-2 space-y-2">
                        {activePostLinks.map((link) => (
                          <li key={link.id} className="space-y-1">
                            <p className="font-medium text-navy-500">
                              {SOCIAL_PLATFORM_LABELS[link.platform]}
                            </p>
                            <LinkQuickActions
                              href={link.url}
                              label={`${SOCIAL_PLATFORM_LABELS[link.platform]} live URL`}
                              size="xs"
                            />
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                  <div className="flex justify-end">
                    <button
                      type="button"
                      disabled={isLinksSaving}
                      className="rounded-md border border-[color:var(--sh-gray-200)] bg-white px-4 py-2 text-sm font-medium text-navy-500 hover:bg-blurple-50 disabled:cursor-not-allowed disabled:cursor-not-allowed disabled:opacity-60"
                      onClick={() => {
                        void handleSaveLinks();
                      }}
                    >
                      {isLinksSaving ? "Saving..." : "Save Links"}
                    </button>
                  </div>
                </section>
              )}

              <section className="mt-4 rounded-lg border border-[color:var(--sh-gray-200)] p-4">
                <h4 className="text-sm font-semibold uppercase tracking-wide text-navy-500">
                  Assignment & Changes (latest 5)
                </h4>
                {isPanelLoading ? (
                  <p className="mt-3 text-sm text-navy-500">Loading assignment and status changes…</p>
                ) : panelActivity.length === 0 ? (
                  <p className="mt-3 text-sm text-navy-500">No assignment or status changes yet.</p>
                ) : (
                  <ul className="mt-3 space-y-2">
                    {panelActivity.slice(0, 5).map((entry) => (
                      <li
                        key={entry.id}
                        className="rounded-md border border-[color:var(--sh-gray-200)] bg-[color:var(--sh-gray)] px-3 py-2"
                      >
                        <p className="text-sm font-medium text-ink">
                          {formatActivityEventTitle(entry)}
                        </p>
                        {(() => {
                          const detail = formatActivityChangeDescription(entry, {
                            userNameById: activityUserNameById,
                          });
                          return detail ? (
                            <p className="text-xs text-navy-500">{detail}</p>
                          ) : null;
                        })()}
                        <p className="text-xs text-navy-500/60">
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
        <ConfirmationModal
          isOpen={pendingDeleteRequest !== null}
          title={
            pendingDeleteRequest?.kind === "bulk" ? "Delete selected posts?" : "Delete post?"
          }
          description={
            pendingDeleteRequest?.kind === "bulk"
              ? `Are you sure you want to delete ${pendingDeleteRequest.postIds.length} post${
                  pendingDeleteRequest.postIds.length === 1 ? "" : "s"
                }? This action cannot be undone.${
                  pendingDeleteRequest.publishedCount > 0
                    ? ` ${pendingDeleteRequest.publishedCount} published post${
                        pendingDeleteRequest.publishedCount === 1 ? " will" : "s will"
                      } be skipped.`
                    : ""
                }`
              : "Are you sure you want to delete this post? This action cannot be undone."
          }
          confirmLabel={
            pendingDeleteRequest?.kind === "bulk" ? "Delete selected" : "Delete post"
          }
          tone="danger"
          isConfirming={isDeletingPost}
          onCancel={() => {
            if (!isDeletingPost) {
              setPendingDeleteRequest(null);
            }
          }}
          onConfirm={() => {
            void confirmPendingDelete();
          }}
        />
        <ConfirmationModal
          isOpen={pendingChangeRequestTransition !== null}
          title="Send back to Changes Requested?"
          description="Select a category and checklist so the next revision pass is specific and actionable."
          confirmLabel="Send back"
          isConfirming={isPanelSaving}
          confirmDisabled={
            Boolean(
              pendingChangeRequestTransition &&
                getChangeRequestTemplateError(
                  pendingChangeRequestTransition.template
                )
            )
          }
          onCancel={() => {
            if (!isPanelSaving) {
              setPendingChangeRequestTransition(null);
            }
          }}
          onConfirm={() => {
            void confirmPendingChangeRequestTransition();
          }}
        >
          <div className="space-y-3">
            <label className="space-y-1 text-sm text-navy-500">
              <span className="font-medium">Category</span>
              <select
                value={pendingChangeRequestTransition?.template.category ?? ""}
                onChange={(event) => {
                  setPendingChangeRequestTransition((previous) =>
                    previous
                      ? {
                          ...previous,
                          template: {
                            ...previous.template,
                            category: event.target.value as ChangeRequestTemplateState["category"],
                          },
                        }
                      : previous
                  );
                }}
                className="focus-field w-full rounded-md border border-[color:var(--sh-gray-200)] px-3 py-2 text-sm"
              >
                <option value="">Select category</option>
                {CHANGE_REQUEST_CATEGORY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <fieldset className="space-y-2">
              <legend className="text-sm font-medium text-navy-500">
                Action checklist
              </legend>
              {CHANGE_REQUEST_CHECKLIST_OPTIONS.map((option) => {
                const isChecked = Boolean(
                  pendingChangeRequestTransition?.template.checklist.includes(
                    option.id
                  )
                );
                return (
                  <label
                    key={option.id}
                    className="flex items-start gap-2 text-sm text-navy-500"
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={(event) => {
                        setPendingChangeRequestTransition((previous) => {
                          if (!previous) {
                            return previous;
                          }
                          const nextChecklist = event.target.checked
                            ? [...previous.template.checklist, option.id]
                            : previous.template.checklist.filter(
                                (entry) => entry !== option.id
                              );
                          return {
                            ...previous,
                            template: {
                              ...previous.template,
                              checklist: Array.from(new Set(nextChecklist)),
                            },
                          };
                        });
                      }}
                      className="mt-0.5"
                    />
                    <span>{option.label}</span>
                  </label>
                );
              })}
            </fieldset>
            <label className="space-y-1 text-sm text-navy-500">
              <span className="font-medium">Context (optional)</span>
              <textarea
                value={pendingChangeRequestTransition?.template.note ?? ""}
                onChange={(event) => {
                  setPendingChangeRequestTransition((previous) =>
                    previous
                      ? {
                          ...previous,
                          template: {
                            ...previous.template,
                            note: event.target.value,
                          },
                        }
                      : previous
                  );
                }}
                rows={3}
                className="focus-field w-full rounded-md border border-[color:var(--sh-gray-200)] px-3 py-2 text-sm"
                placeholder="Add implementation context for the next pass..."
              />
            </label>
            {pendingChangeRequestTransition &&
            getChangeRequestTemplateError(
              pendingChangeRequestTransition.template
            ) ? (
              <p className="text-xs text-rose-700">
                {
                  getChangeRequestTemplateError(
                    pendingChangeRequestTransition.template
                  )
                }
              </p>
            ) : null}
          </div>
        </ConfirmationModal>
        <ConfirmationModal
          isOpen={isReopenBriefModalOpen}
          title="Reopen brief to Creative Approved?"
          description="Optionally provide a reason for reopening this post."
          confirmLabel="Reopen brief"
          isConfirming={isPanelSaving}
          onCancel={() => {
            if (!isPanelSaving) {
              setIsReopenBriefModalOpen(false);
              setReopenBriefReason("");
            }
          }}
          onConfirm={() => {
            const reason = reopenBriefReason.trim();
            setIsReopenBriefModalOpen(false);
            setReopenBriefReason("");
            void submitReopenBrief(reason.length > 0 ? reason : null);
          }}
        >
          <label className="space-y-1 text-sm text-navy-500">
            <span className="font-medium">Reason (optional)</span>
            <textarea
              value={reopenBriefReason}
              onChange={(event) => {
                setReopenBriefReason(event.target.value);
              }}
              rows={3}
              className="focus-field w-full rounded-md border border-[color:var(--sh-gray-200)] px-3 py-2 text-sm"
              placeholder="Add context for why this brief is being reopened..."
            />
          </label>
        </ConfirmationModal>

        {isCreateModalOpen ? (
          <div className="fixed inset-0 z-40 flex items-center justify-center p-4">
            <button
              type="button"
              aria-label="Close social post modal"
              className="absolute inset-0 bg-ink/30"
              onClick={() => {
                if (!isCreating) {
                  closeCreateModal();
                }
              }}
            />
            <div className="relative z-10 w-full max-w-lg rounded-lg border border-[color:var(--sh-gray-200)] bg-white p-5 shadow-xl">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-base font-semibold text-ink">New Social Post</h3>
                  <p className="mt-1 text-sm text-navy-500">
                    Create a single card and move it from Draft to Published.
                  </p>
                </div>
                <button
                  type="button"
                  className="rounded-md border border-[color:var(--sh-gray-200)] px-2 py-1 text-sm text-navy-500 hover:bg-blurple-50"
                  onClick={() => {
                    if (!isCreating) {
                      closeCreateModal();
                    }
                  }}
                >
                  Close
                </button>
              </div>
              <form className="mt-4 space-y-4" onSubmit={handleCreatePost}>
                <label className="block">
                  <span className="mb-1 block text-sm font-medium text-navy-500">Title</span>
                  <input
                    value={newTitle}
                    onChange={(event) => {
                      setNewTitle(event.target.value);
                    }}
                    className="w-full rounded-md border border-[color:var(--sh-gray-200)] px-3 py-2 text-sm"
                    maxLength={200}
                  />
                </label>
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-navy-500">
                    Quick Presets
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {SOCIAL_POST_CREATE_PRESETS.map((preset) => {
                      const isActive =
                        newProduct === preset.product &&
                        newType === preset.type &&
                        preset.platforms.length === newPlatforms.length &&
                        preset.platforms.every((platform) =>
                          newPlatforms.includes(platform)
                        );
                      return (
                        <button
                          key={preset.id}
                          type="button"
                          className={`rounded-full border px-3 py-1 text-xs font-medium ${
                            isActive
                              ? "border-ink bg-ink text-white"
                              : "border-[color:var(--sh-gray-200)] bg-white text-navy-500 hover:bg-blurple-50"
                          }`}
                          onClick={() => {
                            applyCreatePreset(preset);
                          }}
                        >
                          {preset.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <label className="block">
                    <span className="mb-1 block text-sm font-medium text-navy-500">
                      Product
                    </span>
                    <select
                      value={newProduct}
                      onChange={(event) => {
                        setNewProduct(event.target.value as SocialPostProduct);
                      }}
                      className="w-full rounded-md border border-[color:var(--sh-gray-200)] px-3 py-2 text-sm"
                    >
                      {SOCIAL_POST_PRODUCTS.map((product) => (
                        <option key={product} value={product}>
                          {SOCIAL_POST_PRODUCT_LABELS[product]}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-sm font-medium text-navy-500">Type</span>
                    <select
                      value={newType}
                      onChange={(event) => {
                        setNewType(event.target.value as SocialPostType);
                      }}
                      className="w-full rounded-md border border-[color:var(--sh-gray-200)] px-3 py-2 text-sm"
                    >
                      {SOCIAL_POST_TYPES.map((type) => (
                        <option key={type} value={type}>
                          {SOCIAL_POST_TYPE_LABELS[type]}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-navy-500">
                    Platforms (optional)
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {SOCIAL_PLATFORMS.map((platform) => {
                      const isSelected = newPlatforms.includes(platform);
                      return (
                        <button
                          key={platform}
                          type="button"
                          className={`rounded-full border px-3 py-1 text-xs font-medium ${
                            isSelected
                              ? "border-ink bg-ink text-white"
                              : "border-[color:var(--sh-gray-200)] bg-white text-navy-500 hover:bg-blurple-50"
                          }`}
                          onClick={() => {
                            setNewPlatforms((previous) =>
                              previous.includes(platform)
                                ? previous.filter((entry) => entry !== platform)
                                : [...previous, platform]
                            );
                          }}
                        >
                          {SOCIAL_PLATFORM_LABELS[platform]}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <label className="block">
                  <span className="mb-1 block text-sm font-medium text-navy-500">
                    Associated Blog (optional)
                  </span>
                  <input
                    value={createBlogSearchQuery}
                    onFocus={() => {
                      setIsCreateBlogSearchOpen(true);
                    }}
                    onChange={(event) => {
                      setCreateBlogSearchQuery(event.target.value);
                      setNewAssociatedBlogId(null);
                      setIsCreateBlogSearchOpen(true);
                    }}
                    className="w-full rounded-md border border-[color:var(--sh-gray-200)] px-3 py-2 text-sm"
                    placeholder="Search blog title or slug..."
                  />
                  {newAssociatedBlogId ? (
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-navy-500">
                      <span>Linked blog ID: {newAssociatedBlogId}</span>
                      <button
                        type="button"
                        className="rounded border border-[color:var(--sh-gray-200)] bg-white px-2 py-1 font-medium text-navy-500 hover:bg-blurple-50"
                        onClick={() => {
                          setNewAssociatedBlogId(null);
                          setCreateBlogSearchQuery("");
                          setCreateBlogSearchResults([]);
                          setIsCreateBlogSearchOpen(false);
                        }}
                      >
                        Clear
                      </button>
                    </div>
                  ) : null}
                  {isCreateBlogSearchOpen ? (
                    <div className="mt-2 max-h-44 overflow-y-auto rounded-md border border-[color:var(--sh-gray-200)] bg-white">
                      {isCreateBlogSearchLoading ? (
                        <p className="px-3 py-2 text-sm text-navy-500">Searching blogs…</p>
                      ) : createBlogSearchQuery.trim().length === 0 ? (
                        <p className="px-3 py-2 text-sm text-navy-500">
                          Type to search blogs.
                        </p>
                      ) : createBlogSearchResults.length === 0 ? (
                        <p className="px-3 py-2 text-sm text-navy-500">No matching blogs.</p>
                      ) : (
                        createBlogSearchResults.map((blog) => (
                          <button
                            key={blog.id}
                            type="button"
                            className="block w-full border-b border-[color:var(--sh-gray)] px-3 py-2 text-left last:border-b-0 hover:bg-blurple-50"
                            onClick={() => {
                              setNewAssociatedBlogId(blog.id);
                              setCreateBlogSearchQuery(blog.title);
                              setCreateBlogSearchResults([]);
                              setIsCreateBlogSearchOpen(false);
                            }}
                          >
                            <p className="text-sm font-medium text-ink">{blog.title}</p>
                            <p className="text-xs text-navy-500">
                              {blog.slug || "no-slug"} • {blog.site}
                            </p>
                          </button>
                        ))
                      )}
                    </div>
                  ) : null}
                </label>
                <div className="grid gap-3 md:grid-cols-2">
                  {isAdmin ? (
                    <label className="block">
                      <span className="mb-1 block text-sm font-medium text-navy-500">Assigned to</span>
                      <select
                        value={newWorkerUserId ?? ""}
                        onChange={(event) => {
                          setNewWorkerUserId(event.target.value || null);
                        }}
                        className="w-full rounded-md border border-[color:var(--sh-gray-200)] px-3 py-2 text-sm"
                      >
                        <option value="">— Select person —</option>
                        {availableUsers.map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.full_name}
                          </option>
                        ))}
                      </select>
                    </label>
                  ) : (
                    <div>
                      <span className="mb-1 block text-sm font-medium text-navy-500">Assigned to</span>
                      <div className="rounded-md border border-[color:var(--sh-gray-200)] bg-[color:var(--sh-gray)] px-3 py-2 text-sm text-navy-500">
                        You
                      </div>
                    </div>
                  )}
                  <label className="block">
                    <span className="mb-1 block text-sm font-medium text-navy-500">Reviewer</span>
                    <select
                      value={newReviewerUserId ?? ""}
                      onChange={(event) => {
                        setNewReviewerUserId(event.target.value || null);
                      }}
                      className="w-full rounded-md border border-[color:var(--sh-gray-200)] px-3 py-2 text-sm"
                    >
                      <option value="">— Select reviewer —</option>
                      {availableUsers.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.full_name}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="submit"
                    disabled={isCreating}
                    className="rounded-md bg-ink px-4 py-2 text-sm font-semibold text-white hover:bg-navy-700 disabled:cursor-not-allowed disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isCreating ? "Creating..." : "Create Social Post"}
                  </button>
                  <button
                    type="button"
                    className="rounded-md border border-[color:var(--sh-gray-200)] px-4 py-2 text-sm font-medium text-navy-500 hover:bg-blurple-50"
                    onClick={() => {
                      if (!isCreating) {
                        closeCreateModal();
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
