"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  DndContext,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  addDays,
  addMonths,
  addWeeks,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isWithinInterval,
  startOfMonth,
  startOfWeek,
  subMonths,
  subWeeks,
} from "date-fns";

import { AppShell } from "@/components/app-shell";
import { CalendarControlBar } from "@/components/calendar-control-bar";
import { CalendarGridSurface, CalendarWeekdayHeaderRow } from "@/components/calendar-shell";
import { CalendarTile } from "@/components/calendar-tile";
import { ConfirmationModal } from "@/components/confirmation-modal";
import {
  DATA_PAGE_STACK_CLASS,
  DataPageFilterPills,
  DataPageHeader,
  DataPageToolbar,
} from "@/components/data-page";
import { ProtectedPage } from "@/components/protected-page";
import { WorkflowStageBadge } from "@/components/status-badge";
import { TablePaginationControls, TableRowLimitSelect } from "@/components/table-controls";
import {
  BLOG_SELECT_WITH_DATES,
  BLOG_SELECT_WITH_DATES_WITH_RELATIONS,
  getBlogScheduledDate,
  normalizeBlogRows,
} from "@/lib/blog-schema";
import {
  createUiPermissionContract,
} from "@/lib/permissions/uiPermissions";
import { getDateKeyInTimezone, getWeekdayLabels, normalizeWeekStart } from "@/lib/calendar";
import {
  SEGMENTED_CONTROL_CLASS,
  segmentedControlItemClass,
} from "@/lib/segmented-control";
import {
  SOCIAL_POST_STATUS_LABELS,
  SOCIAL_POST_TYPE_LABELS,
  getWorkflowStage,
} from "@/lib/status";
import { getSiteLabel, getSiteShortLabel } from "@/lib/site";
import { MAIN_CREATE_SHORTCUTS } from "@/lib/shortcuts";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import { AppIcon } from "@/lib/icons";
import {
  DEFAULT_TABLE_ROW_LIMIT,
  getTablePageCount,
  getTablePageRows,
  type TableRowLimit,
} from "@/lib/table";
import type {
  BlogRecord,
  BlogSite,
  ProfileRecord,
  SocialPostRecord,
  SocialPostStatus,
  SocialPostType,
} from "@/lib/types";
import { toTitleCase } from "@/lib/utils";
import { exportToICS, exportToCSV, type CalendarExportItem } from "@/lib/calendar-export";
import { useAuth } from "@/providers/auth-provider";
import { useAlerts } from "@/providers/alerts-provider";

type CalendarMode = "month" | "week";
type CalendarViewScope = "mine" | "all";
type ContentTypeFilter = "blogs" | "social_posts";
type CalendarLegendFilter =
  | "sh_blog"
  | "red_blog"
  | "sh_social_post"
  | "red_social_post";
const CALENDAR_LEGEND_FILTER_ORDER: CalendarLegendFilter[] = [
  "sh_blog",
  "red_blog",
  "sh_social_post",
  "red_social_post",
];
type SocialCalendarPost = Pick<
  SocialPostRecord,
  | "id"
  | "title"
  | "product"
  | "type"
  | "scheduled_date"
  | "status"
  | "created_by"
  | "worker_user_id"
  | "reviewer_user_id"
> & {
  associated_blog_id: string | null;
  associated_blog?: Pick<BlogRecord, "id" | "title" | "site"> | null;
  creator?: Pick<ProfileRecord, "id" | "full_name" | "email"> | null;
  worker?: Pick<ProfileRecord, "id" | "full_name" | "email"> | null;
  reviewer?: Pick<ProfileRecord, "id" | "full_name" | "email"> | null;
  worker_name: string | null;
  reviewer_name: string | null;
};

function formatCalendarDateLabel(dateKey: string) {
  const parsed = new Date(`${dateKey}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) {
    return dateKey;
  }
  return format(parsed, "MMM d");
}

function normalizeRelationObject<T>(value: unknown): T | null {
  if (Array.isArray(value)) {
    return (value[0] ?? null) as T | null;
  }
  return (value ?? null) as T | null;
}

function normalizeSocialCalendarRows(rows: Array<Record<string, unknown>>) {
  return rows.map((row) => {
    const associatedBlog = normalizeRelationObject<
      Pick<BlogRecord, "id" | "title" | "site">
    >(row.associated_blog);
    const creator = normalizeRelationObject<
      Pick<ProfileRecord, "id" | "full_name" | "email">
    >(row.creator);
    const worker = normalizeRelationObject<
      Pick<ProfileRecord, "id" | "full_name" | "email">
    >(row.worker);
    const reviewer = normalizeRelationObject<
      Pick<ProfileRecord, "id" | "full_name" | "email">
    >(row.reviewer);

    return {
      id: String(row.id ?? ""),
      title: String(row.title ?? ""),
      product: (row.product as SocialPostRecord["product"]) ?? "general_company",
      type: (row.type as SocialPostType) ?? "image",
      status: (row.status as SocialPostStatus) ?? "draft",
      scheduled_date:
        typeof row.scheduled_date === "string" ? row.scheduled_date : null,
      created_by: String(row.created_by ?? ""),
      worker_user_id:
        typeof row.worker_user_id === "string" ? row.worker_user_id : null,
      reviewer_user_id:
        typeof row.reviewer_user_id === "string" ? row.reviewer_user_id : null,
      associated_blog_id:
        typeof row.associated_blog_id === "string" ? row.associated_blog_id : null,
      associated_blog: associatedBlog,
      creator,
      worker,
      reviewer,
      worker_name: worker?.full_name ?? null,
      reviewer_name: reviewer?.full_name ?? null,
    } satisfies SocialCalendarPost;
  });
}

function truncateWithEllipsis(value: string, maxLength: number) {
  if (value.length <= maxLength) {
    return value;
  }
  return `${value.slice(0, Math.max(1, maxLength - 1)).trimEnd()}…`;
}

function getBlogBarClass(site: BlogSite) {
  return site === "sighthound.com" ? "bg-blue-500" : "bg-purple-500";
}
function getSocialSite(post: SocialCalendarPost): BlogSite {
  return post.associated_blog?.site === "redactor.com"
    ? "redactor.com"
    : "sighthound.com";
}

function getSocialBarClass(site: BlogSite) {
  return site === "redactor.com" ? "bg-purple-500" : "bg-blue-500";
}

function getSocialBulletClass(site: BlogSite) {
  return site === "redactor.com"
    ? "border-2 border-purple-500 bg-white"
    : "border-2 border-blue-500 bg-white";
}

function getBlogStageDotClass({
  stage,
  isOverdue,
}: {
  stage: ReturnType<typeof getWorkflowStage>;
  isOverdue: boolean;
}) {
  if (isOverdue) {
    return "bg-rose-500";
  }
  if (stage === "published") {
    return "bg-emerald-500";
  }
  if (stage === "publishing") {
    return "bg-blue-500";
  }
  if (stage === "ready") {
    return "bg-indigo-500";
  }
  return "bg-slate-400";
}

function getNoPublishReason(blog: BlogRecord) {
  const workflowStage = getWorkflowStage({
    writerStatus: blog.writer_status,
    publisherStatus: blog.publisher_status,
  });
  return `Stage: ${toTitleCase(workflowStage)} (no scheduled date)`;
}

function DroppableDayCell({
  dateKey,
  className,
  children,
  ...containerProps
}: {
  dateKey: string;
  className: string;
  children: React.ReactNode;
} & React.HTMLAttributes<HTMLDivElement>) {
  const { isOver, setNodeRef } = useDroppable({
    id: `day-${dateKey}`,
  });

  return (
    <div
      ref={setNodeRef}
      className={`${className} ${isOver ? "ring-2 ring-indigo-300 ring-offset-1" : ""}`}
      {...containerProps}
    >
      {children}
    </div>
  );
}

function CalendarBlogEventCard({
  blog,
  canDrag,
  compact,
  onOpen,
  todayDateKey,
}: {
  blog: BlogRecord;
  canDrag: boolean;
  compact: boolean;
  onOpen: () => void;
  todayDateKey: string;
}) {
  const stage = getWorkflowStage({
    writerStatus: blog.writer_status,
    publisherStatus: blog.publisher_status,
  });
  const scheduledDate = getBlogScheduledDate(blog);
  const isOverdue =
    scheduledDate !== null && scheduledDate < todayDateKey && blog.publisher_status !== "completed";
  const maxTitleLength = compact ? 34 : 80;
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `blog-${blog.id}`,
    disabled: !canDrag,
  });

  const dragStyle = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined;

  return (
    <button
      ref={setNodeRef}
      style={dragStyle}
      type="button"
      onClick={onOpen}
      className={`relative flex w-full items-start gap-2 rounded-lg border border-slate-200/90 bg-white/95 px-2 py-1.5 text-left shadow-[0_1px_2px_rgba(15,23,42,0.06)] transition-[background-color,border-color,box-shadow] duration-150 motion-reduce:transition-none ${
        canDrag
          ? "cursor-grab hover:border-slate-300 hover:bg-white hover:shadow-[0_10px_20px_-16px_rgba(15,23,42,0.55)] active:cursor-grabbing"
          : "cursor-default"
      } ${isDragging ? "opacity-55 shadow-[0_14px_30px_-18px_rgba(15,23,42,0.7)]" : ""}`}
      title={`${blog.title}\nWriter · ${blog.writer?.full_name ?? "Unassigned"}\nPublisher · ${
        blog.publisher?.full_name ?? "Unassigned"
      }\nSite · ${getSiteLabel(blog.site)}\nPublish Date · ${scheduledDate ?? "Unscheduled"}\nStatus · ${toTitleCase(stage)}`}
      {...(canDrag ? attributes : {})}
      {...(canDrag ? listeners : {})}
    >
      <span className={`self-stretch w-1 rounded-full ${getBlogBarClass(blog.site)}`} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1 text-[11px] text-slate-600">
          <AppIcon
            name="writing"
            boxClassName="h-4 w-4"
            size={12}
            className="text-slate-500"
          />
          <span className="font-semibold">{getSiteShortLabel(blog.site)} Blog</span>
        </div>
        <p className="mt-0.5 truncate text-[13px] font-medium text-slate-900">
          {truncateWithEllipsis(blog.title, maxTitleLength)}
        </p>
        <p className="mt-0.5 truncate text-[11px] text-slate-500">
          {blog.writer?.full_name ?? "Unassigned"}
        </p>
      </div>
      <span
        className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${getBlogStageDotClass({
          stage,
          isOverdue,
        })}`}
      />
    </button>
  );
}

function CalendarSocialEventCard({
  post,
  compact,
  onOpen,
}: {
  post: SocialCalendarPost;
  compact: boolean;
  onOpen: () => void;
}) {
  const socialSite = getSocialSite(post);
  const maxTitleLength = compact ? 24 : 64;
  return (
    <button
      type="button"
      onClick={onOpen}
      className="relative flex w-full items-start gap-2 rounded-lg border border-slate-200/90 bg-white/95 px-2 py-1.5 text-left shadow-[0_1px_2px_rgba(15,23,42,0.06)] transition-[background-color,border-color,box-shadow] duration-150 motion-reduce:transition-none hover:border-slate-300 hover:bg-white hover:shadow-[0_10px_20px_-16px_rgba(15,23,42,0.55)]"
      title={`${post.title}\nSite · ${getSiteLabel(socialSite)}\nType · ${SOCIAL_POST_TYPE_LABELS[post.type]}\nStatus · ${SOCIAL_POST_STATUS_LABELS[post.status]}\nScheduled · ${post.scheduled_date ?? "Unscheduled"}`}
    >
      <span className={`self-stretch w-1 rounded-full ${getSocialBarClass(socialSite)}`} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1 text-[11px] text-slate-600">
          <AppIcon
            name="megaphone"
            boxClassName="h-4 w-4"
            size={12}
            className="text-slate-500"
          />
          <span className="font-semibold">{getSiteShortLabel(socialSite)} Social</span>
        </div>
        <p className="mt-0.5 truncate text-[13px] font-medium text-slate-900">
          {SOCIAL_POST_TYPE_LABELS[post.type]}: {truncateWithEllipsis(post.title, maxTitleLength)}
        </p>
        <p className="mt-0.5 truncate text-[11px] text-slate-500">
          {post.creator?.full_name ?? "Unassigned"}
        </p>
      </div>
      <span
        className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${getSocialBulletClass(socialSite)}`}
      />
    </button>
  );
}

export default function CalendarPage() {
  const { hasPermission, profile, user } = useAuth();
  const { showSaving, showError, updateAlert: updateStatus, showSuccess } = useAlerts();
  const permissionContract = useMemo(
    () => createUiPermissionContract(hasPermission),
    [hasPermission]
  );
  const [blogs, setBlogs] = useState<BlogRecord[]>([]);
  const [socialPosts, setSocialPosts] = useState<SocialCalendarPost[]>([]);
  const [viewScope, setViewScope] = useState<CalendarViewScope>("all");
  const [mode, setMode] = useState<CalendarMode>("month");
  const [contentFilters, setContentFilters] = useState<ContentTypeFilter[]>([
    "blogs",
    "social_posts",
  ]);
  const [legendFilters, setLegendFilters] = useState<CalendarLegendFilter[]>(
    CALENDAR_LEGEND_FILTER_ORDER
  );
  const [writerFilter, setWriterFilter] = useState<string>("all");
  const [cursorDate, setCursorDate] = useState(new Date());
  const [weekStart, setWeekStart] = useState(1);
  const [timezone, setTimezone] = useState("America/New_York");
  const [noDateRowLimit, setNoDateRowLimit] = useState<TableRowLimit>(DEFAULT_TABLE_ROW_LIMIT);
  const [noDateCurrentPage, setNoDateCurrentPage] = useState(1);
  const [draggingBlogId, setDraggingBlogId] = useState<string | null>(null);
  const [dragOverDateKey, setDragOverDateKey] = useState<string | null>(null);
  const [quickCreateDateKey, setQuickCreateDateKey] = useState<string | null>(null);
  const [expandedMoreDateKey, setExpandedMoreDateKey] = useState<string | null>(null);
  const [isUnscheduledBlogsExpanded, setIsUnscheduledBlogsExpanded] = useState(false);
  const [isUnscheduledSocialPostsExpanded, setIsUnscheduledSocialPostsExpanded] =
    useState(false);
  const [activeBlogId, setActiveBlogId] = useState<string | null>(null);
  const [activeSocialPostId, setActiveSocialPostId] = useState<string | null>(null);
  const [panelRescheduleDate, setPanelRescheduleDate] = useState("");
  const [focusedDateKey, setFocusedDateKey] = useState<string | null>(null);
  const calendarGridRef = useRef<HTMLDivElement | null>(null);
  const morePopoverRef = useRef<HTMLDivElement | null>(null);
  const [pendingReschedule, setPendingReschedule] = useState<{
    blogId: string;
    blogTitle: string;
    fromDateKey: string | null;
    toDateKey: string;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const normalizedWeekStart = useMemo(() => normalizeWeekStart(weekStart), [weekStart]);
  const todayDateKey = useMemo(
    () => getDateKeyInTimezone(new Date(), timezone),
    [timezone]
  );
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    })
  );
  const canDragCalendarBlogs = permissionContract.canCalendarDragReschedule;
  useEffect(() => {
    setCursorDate((prev) => {
      const currentWeekStart = startOfWeek(new Date(), {
        weekStartsOn: normalizedWeekStart,
      });
      if (prev < currentWeekStart) {
        return currentWeekStart;
      }
      return prev;
    });
  }, [normalizedWeekStart]);
  const loadData = useCallback(async () => {
    const supabase = getSupabaseBrowserClient();
    setIsLoading(true);
    setError(null);
    const fetchBlogs = async () => {
      const { data, error } = await supabase
        .from("blogs")
        .select(BLOG_SELECT_WITH_DATES_WITH_RELATIONS)
        .eq("is_archived", false)
        .order("scheduled_publish_date", { ascending: true, nullsFirst: false });

      return { data, error };
    };
    const fetchSocialPosts = async () =>
      supabase
        .from("social_posts")
        .select(
          "id,title,product,type,scheduled_date,status,created_by,worker_user_id,reviewer_user_id,associated_blog_id,associated_blog:associated_blog_id(id,title,site),creator:created_by(id,full_name,email),worker:worker_user_id(id,full_name,email),reviewer:reviewer_user_id(id,full_name,email)"
        )
        .order("scheduled_date", { ascending: true, nullsFirst: false })
        .order("updated_at", { ascending: false });

    const [
      { data: blogsData, error: blogsError },
      { data: socialPostsData, error: socialPostsError },
      { data: settingsData },
    ] =
      await Promise.all([
        fetchBlogs(),
        fetchSocialPosts(),
        supabase.from("app_settings").select("*").eq("id", 1).maybeSingle(),
      ]);

    if (blogsError) {
      console.error("Calendar blogs load failed:", blogsError);
      setError("Couldn't load calendar. Please try again.");
      setIsLoading(false);
      return;
    }
    if (socialPostsError) {
      console.error("Calendar social posts load failed:", socialPostsError);
      setError("Couldn't load social posts. Please try again.");
      setIsLoading(false);
      return;
    }

    setBlogs(normalizeBlogRows((blogsData ?? []) as Array<Record<string, unknown>>) as BlogRecord[]);
    setSocialPosts(
      normalizeSocialCalendarRows((socialPostsData ?? []) as Array<Record<string, unknown>>)
    );
    if (settingsData) {
      setWeekStart(settingsData.week_start ?? 1);
      setTimezone(profile?.timezone ?? settingsData.timezone ?? "America/New_York");
    }
    setIsLoading(false);
  }, [profile?.timezone]);

  useEffect(() => {

    void loadData();
  }, [loadData]);

  useEffect(() => {
    if (!error) {
      return;
    }
    showError(error);
  }, [error, showError]);


  const hasBlogsEnabled = contentFilters.includes("blogs");
  const hasSocialPostsEnabled = contentFilters.includes("social_posts");
  const hasShBlogsVisible = legendFilters.includes("sh_blog");
  const hasRedBlogsVisible = legendFilters.includes("red_blog");
  const hasShSocialPostsVisible = legendFilters.includes("sh_social_post");
  const hasRedSocialPostsVisible = legendFilters.includes("red_social_post");
  const hasAnyVisibleCategory =
    (hasBlogsEnabled && (hasShBlogsVisible || hasRedBlogsVisible)) ||
    (hasSocialPostsEnabled && (hasShSocialPostsVisible || hasRedSocialPostsVisible));
  const visibleLegendLabels = useMemo(() => {
    const labels: string[] = [];
    if (hasShBlogsVisible) {
      labels.push("SH Blog");
    }
    if (hasRedBlogsVisible) {
      labels.push("RED Blog");
    }
    if (hasShSocialPostsVisible) {
      labels.push("SH Social Post");
    }
    if (hasRedSocialPostsVisible) {
      labels.push("RED Social Post");
    }
    return labels;
  }, [
    hasRedBlogsVisible,
    hasRedSocialPostsVisible,
    hasShBlogsVisible,
    hasShSocialPostsVisible,
  ]);
  const liveLegendSummary = useMemo(() => {
    const contentLabel =
      visibleLegendLabels.length > 0 ? visibleLegendLabels.join(", ") : "No categories";
    const scopeLabel = viewScope === "all" ? "All tasks" : "My tasks";
    return `Showing ${contentLabel}. Scope: ${scopeLabel}.`;
  }, [viewScope, visibleLegendLabels]);
  const toggleLegendFilter = useCallback((filter: CalendarLegendFilter) => {
    setLegendFilters((previous) => {
      const next = previous.includes(filter)
        ? previous.filter((item) => item !== filter)
        : [...previous, filter];
      return CALENDAR_LEGEND_FILTER_ORDER.filter((item) => next.includes(item));
    });
  }, []);
  useEffect(() => {
    if (!expandedMoreDateKey) {
      return;
    }
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (!target) {
        return;
      }
      if (morePopoverRef.current?.contains(target)) {
        return;
      }
      setExpandedMoreDateKey(null);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setExpandedMoreDateKey(null);
      }
    };
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [expandedMoreDateKey]);
  const scopedBlogs = useMemo(() => {
    if (viewScope === "all" || !user?.id) {
      return blogs;
    }
    return blogs.filter((blog) => blog.writer_id === user.id || blog.publisher_id === user.id);
  }, [blogs, user?.id, viewScope]);
  const scopedSocialPosts = useMemo(() => {
    if (viewScope === "all" || !user?.id) {
      return socialPosts;
    }
    return socialPosts.filter(
      (post) =>
        post.created_by === user.id ||
        post.worker_user_id === user.id ||
        post.reviewer_user_id === user.id
    );
  }, [socialPosts, user?.id, viewScope]);
  const writerOptions = useMemo(
    () =>
      Array.from(
        new Map(
          blogs
            .filter(
              (blog): blog is BlogRecord & { writer_id: string; writer: NonNullable<BlogRecord["writer"]> } =>
                typeof blog.writer_id === "string" && Boolean(blog.writer?.full_name)
            )
            .map((blog) => [blog.writer_id, blog.writer.full_name])
        ).entries()
      ).sort((left, right) => left[1].localeCompare(right[1])),
    [blogs]
  );
  const filteredBlogs = useMemo(() => {
    if (!hasBlogsEnabled) {
      return [];
    }
    return scopedBlogs.filter((blog) => {
      if (writerFilter !== "all" && blog.writer_id !== writerFilter) {
        return false;
      }
      if (blog.site === "redactor.com") {
        return hasRedBlogsVisible;
      }
      return hasShBlogsVisible;
    });
  }, [hasBlogsEnabled, hasRedBlogsVisible, hasShBlogsVisible, scopedBlogs, writerFilter]);
  const filteredSocialPosts = useMemo(() => {
    if (!hasSocialPostsEnabled) {
      return [];
    }
    return scopedSocialPosts.filter((post) => {
      const site = getSocialSite(post);
      if (site === "redactor.com") {
        return hasRedSocialPostsVisible;
      }
      return hasShSocialPostsVisible;
    });
  }, [
    hasRedSocialPostsVisible,
    hasShSocialPostsVisible,
    hasSocialPostsEnabled,
    scopedSocialPosts,
  ]);
  const overviewMonthRange = useMemo(() => {
    const currentMonthStart = startOfMonth(new Date(`${todayDateKey}T00:00:00`));
    const prevMonthStart = startOfMonth(subMonths(currentMonthStart, 1));
    const nextMonthEnd = endOfMonth(addMonths(currentMonthStart, 1));
    return {
      start: prevMonthStart,
      end: nextMonthEnd,
    };
  }, [todayDateKey]);
  const overviewItems = useMemo(() => {
    const items: Array<
      | {
          type: "blog";
          key: string;
          date: string;
          dayOfWeek: string;
          blog: BlogRecord;
        }
      | {
          type: "social";
          key: string;
          date: string;
          dayOfWeek: string;
          social: SocialCalendarPost;
        }
    > = [];
    for (const blog of filteredBlogs) {
      const scheduledDate = getBlogScheduledDate(blog);
      if (!scheduledDate) {
        continue;
      }
      const dateObj = new Date(`${scheduledDate}T00:00:00`);
      if (
        !isWithinInterval(dateObj, {
          start: overviewMonthRange.start,
          end: overviewMonthRange.end,
        })
      ) {
        continue;
      }
      items.push({
        type: "blog",
        key: `blog-${blog.id}`,
        date: scheduledDate,
        dayOfWeek: format(dateObj, "EEE"),
        blog,
      });
    }
    for (const post of filteredSocialPosts) {
      if (!post.scheduled_date) {
        continue;
      }
      const dateObj = new Date(`${post.scheduled_date}T00:00:00`);
      if (
        !isWithinInterval(dateObj, {
          start: overviewMonthRange.start,
          end: overviewMonthRange.end,
        })
      ) {
        continue;
      }
      items.push({
        type: "social",
        key: `social-${post.id}`,
        date: post.scheduled_date,
        dayOfWeek: format(dateObj, "EEE"),
        social: post,
      });
    }
    items.sort((left, right) => {
      const dateCompare = left.date.localeCompare(right.date);
      if (dateCompare !== 0) {
        return dateCompare;
      }
      if (left.type !== right.type) {
        return left.type === "blog" ? -1 : 1;
      }
      const leftTitle = left.type === "blog" ? left.blog.title : left.social.title;
      const rightTitle = right.type === "blog" ? right.blog.title : right.social.title;
      return leftTitle.localeCompare(rightTitle);
    });
    return items;
  }, [filteredBlogs, filteredSocialPosts, overviewMonthRange]);
  const exportItems = useMemo(() => {
    return overviewItems.map((item) => ({
      id: item.type === "blog" ? item.blog.id : item.social.id,
      title: item.type === "blog" ? item.blog.title : item.social.title,
      scheduledDate: item.date,
      type: item.type,
      status: item.type === "blog" 
        ? toTitleCase(getWorkflowStage({ writerStatus: item.blog.writer_status, publisherStatus: item.blog.publisher_status }))
        : SOCIAL_POST_STATUS_LABELS[item.social.status],
      site: item.type === "blog" ? item.blog.site : getSocialSite(item.social),
      dayOfWeek: item.dayOfWeek,
    })) as CalendarExportItem[];
  }, [overviewItems]);
  // Phase 2: Wire to toolbar export button
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleExportCSV = useCallback(() => {
    if (exportItems.length === 0) {
      return;
    }
    const monthLabel = format(new Date(`${todayDateKey}T00:00:00`), "yyyy-MM");
    exportToCSV(exportItems, `calendar-overview-${monthLabel}.csv`);
    showSuccess(`Exported ${exportItems.length} items to CSV`);
  }, [exportItems, todayDateKey, showSuccess]);
  // Phase 2: Wire to toolbar export menu
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleExportICS = useCallback(() => {
    if (exportItems.length === 0) {
      return;
    }
    exportToICS(exportItems, timezone, "calendar.ics");
    showSuccess(`Exported ${exportItems.length} events to calendar`);
  }, [exportItems, timezone, showSuccess]);

  const range = useMemo(() => {
    if (mode === "month") {
      const monthStart = startOfMonth(cursorDate);
      return {
        start: startOfWeek(monthStart, { weekStartsOn: normalizedWeekStart }),
        end: endOfWeek(endOfMonth(cursorDate), {
          weekStartsOn: normalizedWeekStart,
        }),
      };
    }

    const start = startOfWeek(cursorDate, {
      weekStartsOn: normalizedWeekStart,
    });
    return {
      start,
      end: endOfWeek(start, { weekStartsOn: normalizedWeekStart }),
    };
  }, [cursorDate, mode, normalizedWeekStart]);
  const currentWeekRange = useMemo(() => {
    const start = startOfWeek(new Date(`${todayDateKey}T00:00:00`), {
      weekStartsOn: normalizedWeekStart,
    });
    return {
      start,
      end: endOfWeek(start, { weekStartsOn: normalizedWeekStart }),
    };
  }, [normalizedWeekStart, todayDateKey]);
  const days = useMemo(
    () =>
      eachDayOfInterval({
        start: range.start,
        end: range.end,
      }),
    [range.end, range.start]
  );
  useEffect(() => {
    if (days.length === 0) {
      return;
    }
    const todayKey = todayDateKey;
    const isTodayVisible = days.some((day) => format(day, "yyyy-MM-dd") === todayKey);
    setFocusedDateKey((previous) => {
      if (previous && days.some((day) => format(day, "yyyy-MM-dd") === previous)) {
        return previous;
      }
      return isTodayVisible ? todayKey : format(days[0], "yyyy-MM-dd");
    });
  }, [days, todayDateKey]);
  const weekdayLabels = useMemo(
    () => getWeekdayLabels(normalizedWeekStart),
    [normalizedWeekStart]
  );
  const todayWeekdayColumnIndex = useMemo(() => {
    const todayDate = new Date(`${todayDateKey}T00:00:00`);
    return (todayDate.getDay() - normalizedWeekStart + 7) % 7;
  }, [normalizedWeekStart, todayDateKey]);
  const scrollTodayTileIntoView = useCallback(() => {
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

  const calendarItemsByDate = useMemo(() => {
    const byDate: Record<
      string,
      Array<
        | { type: "blog"; key: string; blog: BlogRecord }
        | { type: "social"; key: string; social: SocialCalendarPost }
      >
    > = {};

    for (const blog of filteredBlogs) {
      const scheduledDate = getBlogScheduledDate(blog);
      if (!scheduledDate) {
        continue;
      }
      if (!byDate[scheduledDate]) {
        byDate[scheduledDate] = [];
      }
      byDate[scheduledDate].push({ type: "blog", key: `blog-${blog.id}`, blog });
    }
    for (const post of filteredSocialPosts) {
      if (!post.scheduled_date) {
        continue;
      }
      if (!byDate[post.scheduled_date]) {
        byDate[post.scheduled_date] = [];
      }
      byDate[post.scheduled_date].push({
        type: "social",
        key: `social-${post.id}`,
        social: post,
      });
    }
    for (const [dateKey, items] of Object.entries(byDate)) {
      byDate[dateKey] = [...items].sort((left, right) => {
        if (left.type !== right.type) {
          return left.type === "blog" ? -1 : 1;
        }
        const leftTitle = left.type === "blog" ? left.blog.title : left.social.title;
        const rightTitle = right.type === "blog" ? right.blog.title : right.social.title;
        return leftTitle.localeCompare(rightTitle);
      });
    }
    return byDate;
  }, [filteredBlogs, filteredSocialPosts]);
  const weeklySummary = useMemo(() => {
    let blogCount = 0;
    let socialCount = 0;
    let busyDays = 0;
    for (const day of eachDayOfInterval(currentWeekRange)) {
      const key = format(day, "yyyy-MM-dd");
      const items = calendarItemsByDate[key] ?? [];
      if (items.length > 1) {
        busyDays += 1;
      }
      for (const item of items) {
        if (item.type === "blog") {
          blogCount += 1;
        } else {
          socialCount += 1;
        }
      }
    }
    return { blogCount, socialCount, busyDays };
  }, [calendarItemsByDate, currentWeekRange]);
  const daysWithItems = useMemo(() => {
    return Object.keys(calendarItemsByDate).sort();
  }, [calendarItemsByDate]);
  // Keyboard navigation handler
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setActiveBlogId(null);
        setActiveSocialPostId(null);
        setQuickCreateDateKey(null);
        setExpandedMoreDateKey(null);
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
      if (event.key === "m" || event.key === "M") {
        setMode("month");
        return;
      }
      if (event.key === "w" || event.key === "W") {
        setMode("week");
        return;
      }
      if (event.key === "t" || event.key === "T") {
        const todayDate = new Date(`${todayDateKey}T00:00:00`);
        setFocusedDateKey(todayDateKey);
        setCursorDate(todayDate);
        if (typeof window !== "undefined") {
          window.requestAnimationFrame(() => {
            scrollTodayTileIntoView();
          });
        }
        return;
      }
      if (!focusedDateKey || calendarGridRef.current === null) {
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
      const currentDate = new Date(`${focusedDateKey}T00:00:00`);
      let nextDate: Date;
      if (event.key === "ArrowLeft") {
        nextDate = addDays(currentDate, -1);
      } else if (event.key === "ArrowRight") {
        nextDate = addDays(currentDate, 1);
      } else if (event.key === "ArrowUp") {
        nextDate = addDays(currentDate, -7);
      } else if (event.key === "ArrowDown") {
        nextDate = addDays(currentDate, 7);
      } else if (event.key === "k" || event.key === "K") {
        const currentIndex = daysWithItems.indexOf(focusedDateKey);
        if (currentIndex > 0) {
          const nextKey = daysWithItems[currentIndex - 1];
          setFocusedDateKey(nextKey);
          const nextDate_ = new Date(`${nextKey}T00:00:00`);
          setCursorDate((prev) => {
            if (mode === "month" && nextDate_.getMonth() !== prev.getMonth()) {
              return nextDate_;
            }
            if (
              mode === "week" &&
              !isWithinInterval(nextDate_, {
                start: startOfWeek(prev, { weekStartsOn: normalizedWeekStart }),
                end: endOfWeek(prev, { weekStartsOn: normalizedWeekStart }),
              })
            ) {
              return nextDate_;
            }
            return prev;
          });
        }
        return;
      } else if (event.key === "j" || event.key === "J") {
        const currentIndex = daysWithItems.indexOf(focusedDateKey);
        if (currentIndex < daysWithItems.length - 1) {
          const nextKey = daysWithItems[currentIndex + 1];
          setFocusedDateKey(nextKey);
          const nextDate_ = new Date(`${nextKey}T00:00:00`);
          setCursorDate((prev) => {
            if (mode === "month" && nextDate_.getMonth() !== prev.getMonth()) {
              return nextDate_;
            }
            if (
              mode === "week" &&
              !isWithinInterval(nextDate_, {
                start: startOfWeek(prev, { weekStartsOn: normalizedWeekStart }),
                end: endOfWeek(prev, { weekStartsOn: normalizedWeekStart }),
              })
            ) {
              return nextDate_;
            }
            return prev;
          });
        }
        return;
      } else if (event.key === "Home") {
        const todayDate = new Date(`${todayDateKey}T00:00:00`);
        setFocusedDateKey(todayDateKey);
        setCursorDate(todayDate);
        if (typeof window !== "undefined") {
          window.requestAnimationFrame(() => {
            scrollTodayTileIntoView();
          });
        }
        return;
      } else if (event.key === "PageUp" || event.key === "PageDown") {
        const delta = event.key === "PageDown" ? 1 : -1;
        nextDate = mode === "month" ? addMonths(currentDate, delta) : addWeeks(currentDate, delta);
      } else if (event.key === "Enter") {
        const dayItems = calendarItemsByDate[focusedDateKey] ?? [];
        if (dayItems.length > 0) {
          const firstItem = dayItems[0];
          if (firstItem.type === "blog") {
            setActiveBlogId(firstItem.blog.id);
            setActiveSocialPostId(null);
          } else {
            setActiveSocialPostId(firstItem.social.id);
            setActiveBlogId(null);
          }
        }
        return;
      } else {
        return;
      }
      const nextKey = format(nextDate, "yyyy-MM-dd");
      setFocusedDateKey(nextKey);
      setCursorDate((prev) => {
        if (mode === "month") {
          if (nextDate.getMonth() !== prev.getMonth()) {
            return nextDate;
          }
        } else {
          const weekStart_ = startOfWeek(prev, {
            weekStartsOn: normalizedWeekStart,
          });
          const weekEnd_ = endOfWeek(weekStart_, {
            weekStartsOn: normalizedWeekStart,
          });
          if (!isWithinInterval(nextDate, { start: weekStart_, end: weekEnd_ })) {
            return nextDate;
          }
        }
        return prev;
      });
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [
    focusedDateKey,
    mode,
    normalizedWeekStart,
    calendarItemsByDate,
    scrollTodayTileIntoView,
    todayDateKey,
    daysWithItems,
  ]);
  const noPublishDateBlogs = useMemo(
    () => filteredBlogs.filter((blog) => !getBlogScheduledDate(blog)),
    [filteredBlogs]
  );
  const unscheduledSocialPosts = useMemo(
    () => filteredSocialPosts.filter((post) => !post.scheduled_date),
    [filteredSocialPosts]
  );
  const noDatePageCount = useMemo(
    () => getTablePageCount(noPublishDateBlogs.length, noDateRowLimit),
    [noDateRowLimit, noPublishDateBlogs.length]
  );
  useEffect(() => {
    setNoDateCurrentPage((previous) => Math.min(previous, noDatePageCount));
  }, [noDatePageCount]);
  useEffect(() => {
    setNoDateCurrentPage(1);
  }, [noDateRowLimit]);
  const pagedNoPublishDateBlogs = useMemo(
    () => getTablePageRows(noPublishDateBlogs, noDateCurrentPage, noDateRowLimit),
    [noDateCurrentPage, noDateRowLimit, noPublishDateBlogs]
  );

  const activeBlog = useMemo(
    () => blogs.find((blog) => blog.id === activeBlogId) ?? null,
    [activeBlogId, blogs]
  );
  useEffect(() => {
    if (!activeBlog) {
      setPanelRescheduleDate("");
      return;
    }
    setPanelRescheduleDate(getBlogScheduledDate(activeBlog) ?? "");
  }, [activeBlog]);
  const activeSocialPost = useMemo(
    () => socialPosts.find((post) => post.id === activeSocialPostId) ?? null,
    [activeSocialPostId, socialPosts]
  );
  const activeSocialPostOwnerDisplay = useMemo(() => {
    if (!activeSocialPost) {
      return "Unassigned";
    }
    const isReviewStage =
      activeSocialPost.status === "in_review" ||
      activeSocialPost.status === "creative_approved";
    if (isReviewStage) {
      return (
        activeSocialPost.reviewer_name ??
        activeSocialPost.worker_name ??
        activeSocialPost.creator?.full_name ??
        "Unassigned"
      );
    }
    return (
      activeSocialPost.worker_name ??
      activeSocialPost.creator?.full_name ??
      activeSocialPost.reviewer_name ??
      "Unassigned"
    );
  }, [activeSocialPost]);
  const draggingBlog = useMemo(
    () => blogs.find((blog) => blog.id === draggingBlogId) ?? null,
    [draggingBlogId, blogs]
  );
  const dragPreviewMessage = useMemo(() => {
    if (!draggingBlog || !dragOverDateKey) {
      return null;
    }
    return `Moving to ${formatCalendarDateLabel(dragOverDateKey)}`;
  }, [dragOverDateKey, draggingBlog]);


  const updateScheduledDate = async (blogId: string, scheduledDate: string) => {
    if (!canDragCalendarBlogs) {
      showError("You do not have permission to move publish dates on the calendar.");
      return;
    }
    const statusId = showSaving("Saving changes…");
    const supabase = getSupabaseBrowserClient();
    const { data, error: updateError } = await supabase
      .from("blogs")
      .update({
        scheduled_publish_date: scheduledDate,
        target_publish_date: scheduledDate,
      })
      .eq("id", blogId)
      .select(BLOG_SELECT_WITH_DATES)
      .single();

    if (updateError) {
      updateStatus(statusId, {
        type: "error",
        message: "We couldn't save your update.",
        actionLabel: "Retry",
        onAction: () => {
          void updateScheduledDate(blogId, scheduledDate);
        },
      });
      return;
    }

    setBlogs((previous) =>
      normalizeBlogRows(
        previous.map((blog) =>
          blog.id === blogId ? ({ ...blog, ...data } as Record<string, unknown>) : blog
        ) as Array<Record<string, unknown>>
      ) as BlogRecord[]
    );
    updateStatus(statusId, {
      type: "success",
      message: "Status updated.",
      notification: {
        icon: "calendar",
        message: "Calendar event rescheduled",
        href: `/calendar`,
      },
    });
  };

  const handleDragStart = (event: DragStartEvent) => {
    const activeId = String(event.active.id);
    if (!activeId.startsWith("blog-")) {
      return;
    }
    const blogId = activeId.slice(5);
    const nextBlog = scopedBlogs.find((blog) => blog.id === blogId) ?? null;
    if (!nextBlog) {
      return;
    }
    if (!canDragCalendarBlogs || nextBlog.overall_status === "published") {
      return;
    }
    setDraggingBlogId(blogId);
    setDragOverDateKey(getBlogScheduledDate(nextBlog));
  };

  const handleDragOver = (event: DragOverEvent) => {
    if (!draggingBlogId) {
      return;
    }
    const overId = event.over ? String(event.over.id) : null;
    if (!overId || !overId.startsWith("day-")) {
      setDragOverDateKey(null);
      return;
    }
    setDragOverDateKey(overId.slice(4));
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const activeId = String(event.active.id);
    if (!activeId.startsWith("blog-")) {
      return;
    }
    const draggedBlogId = activeId.slice(5);
    const draggedBlog = scopedBlogs.find((blog) => blog.id === draggedBlogId) ?? null;
    const overId = event.over ? String(event.over.id) : null;

    setDraggingBlogId(null);
    setDragOverDateKey(null);

    if (!draggedBlog || !overId || !overId.startsWith("day-")) {
      return;
    }
    if (!canDragCalendarBlogs || draggedBlog.overall_status === "published") {
      return;
    }

    const nextDateKey = overId.slice(4);
    const currentDateKey = getBlogScheduledDate(draggedBlog);
    if (currentDateKey === nextDateKey) {
      return;
    }

    setPendingReschedule({
      blogId: draggedBlogId,
      blogTitle: draggedBlog.title,
      fromDateKey: currentDateKey,
      toDateKey: nextDateKey,
    });
  };

  const handlePanelReschedule = async () => {
    if (!activeBlog) {
      return;
    }
    if (!canDragCalendarBlogs) {
      setError("You do not have permission to reschedule calendar items.");
      return;
    }
    const currentDate = getBlogScheduledDate(activeBlog);
    const normalized = panelRescheduleDate.trim();
    if (!normalized) {
      setError("Select a date before rescheduling.");
      return;
    }
    const isValid = /^\d{4}-\d{2}-\d{2}$/.test(normalized);
    if (!isValid) {
      setError("Use YYYY-MM-DD format for rescheduling.");
      return;
    }
    setPendingReschedule({
      blogId: activeBlog.id,
      blogTitle: activeBlog.title,
      fromDateKey: currentDate,
      toDateKey: normalized,
    });
  };

  const confirmPendingReschedule = async () => {
    if (!pendingReschedule) {
      return;
    }
    const { blogId, toDateKey } = pendingReschedule;
    setPendingReschedule(null);
    await updateScheduledDate(blogId, toDateKey);
  };
  const activeFilterPills = useMemo(
    () =>
      [
        !hasBlogsEnabled
          ? {
              id: "blogs-hidden",
              label: "Blogs: Hidden",
              onRemove: () => {
                setContentFilters((previous) =>
                  previous.includes("blogs") ? previous : [...previous, "blogs"]
                );
              },
            }
          : null,
        !hasSocialPostsEnabled
          ? {
              id: "social-hidden",
              label: "Social Posts: Hidden",
              onRemove: () => {
                setContentFilters((previous) =>
                  previous.includes("social_posts")
                    ? previous
                    : [...previous, "social_posts"]
                );
              },
            }
          : null,
        hasBlogsEnabled && !hasShBlogsVisible
          ? {
              id: "sh-blog-hidden",
              label: "SH Blog: Hidden",
              onRemove: () => {
                setLegendFilters((previous) => {
                  if (previous.includes("sh_blog")) {
                    return previous;
                  }
                  return CALENDAR_LEGEND_FILTER_ORDER.filter(
                    (item) => item === "sh_blog" || previous.includes(item)
                  );
                });
              },
            }
          : null,
        hasBlogsEnabled && !hasRedBlogsVisible
          ? {
              id: "red-blog-hidden",
              label: "RED Blog: Hidden",
              onRemove: () => {
                setLegendFilters((previous) => {
                  if (previous.includes("red_blog")) {
                    return previous;
                  }
                  return CALENDAR_LEGEND_FILTER_ORDER.filter(
                    (item) => item === "red_blog" || previous.includes(item)
                  );
                });
              },
            }
          : null,
        hasSocialPostsEnabled && !hasShSocialPostsVisible
          ? {
              id: "sh-social-hidden",
              label: "SH Social Post: Hidden",
              onRemove: () => {
                setLegendFilters((previous) => {
                  if (previous.includes("sh_social_post")) {
                    return previous;
                  }
                  return CALENDAR_LEGEND_FILTER_ORDER.filter(
                    (item) => item === "sh_social_post" || previous.includes(item)
                  );
                });
              },
            }
          : null,
        hasSocialPostsEnabled && !hasRedSocialPostsVisible
          ? {
              id: "red-social-hidden",
              label: "RED Social Post: Hidden",
              onRemove: () => {
                setLegendFilters((previous) => {
                  if (previous.includes("red_social_post")) {
                    return previous;
                  }
                  return CALENDAR_LEGEND_FILTER_ORDER.filter(
                    (item) => item === "red_social_post" || previous.includes(item)
                  );
                });
              },
            }
          : null,
        writerFilter !== "all"
          ? {
              id: "writer",
              label: `Writer: ${
                writerOptions.find(([id]) => id === writerFilter)?.[1] ?? writerFilter
              }`,
              onRemove: () => {
                setWriterFilter("all");
              },
            }
          : null,
      ].filter((pill) => pill !== null) as Array<{
        id: string;
        label: string;
        onRemove: () => void;
      }>,
    [
      hasBlogsEnabled,
      hasRedBlogsVisible,
      hasRedSocialPostsVisible,
      hasShBlogsVisible,
      hasShSocialPostsVisible,
      hasSocialPostsEnabled,
      writerFilter,
      writerOptions,
    ]
  );

  return (
    <ProtectedPage requiredPermissions={["view_calendar"]}>
      <AppShell>
        <div className={DATA_PAGE_STACK_CLASS}>
          <DataPageHeader
            title="Calendar"
            description={`${timezone} timezone • week starts on ${
              ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][normalizedWeekStart]
            }`}
          />
          <DataPageToolbar
            showSearch={false}
            searchValue=""
            onSearchChange={() => {}}
            searchPlaceholder=""
            actions={
              <div className="ml-auto flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleExportICS}
                  disabled={exportItems.length === 0}
                  className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-1"
                  title="Export calendar to iCalendar format for Outlook, Apple Calendar, or Google Calendar"
                >
                  <AppIcon
                    name="download"
                    boxClassName="h-4 w-4"
                    size={14}
                    className="text-slate-600"
                  />
                  <span>Export to Calendar</span>
                </button>
                <label className="flex items-center gap-2 rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700">
                  <span className="font-medium">View</span>
                  <select
                    value={viewScope}
                    onChange={(event) => {
                      setViewScope(event.target.value as CalendarViewScope);
                    }}
                    className="focus-field rounded border-none bg-transparent p-0 text-sm focus:outline-none"
                  >
                    <option value="mine">My tasks</option>
                    <option value="all">All tasks</option>
                  </select>
                </label>
                <div className={`${SEGMENTED_CONTROL_CLASS} text-sm`}>
                  <button
                    type="button"
                    className={segmentedControlItemClass({ isActive: hasBlogsEnabled })}
                    onClick={() => {
                      setContentFilters((previous) =>
                        previous.includes("blogs")
                          ? previous.filter((item) => item !== "blogs")
                          : [...previous, "blogs"]
                      );
                    }}
                  >
                    <span className="inline-flex items-center gap-1">
                      {hasBlogsEnabled ? (
                        <AppIcon name="success" boxClassName="h-3.5 w-3.5" size={11} />
                      ) : null}
                      Blogs
                    </span>
                  </button>
                  <button
                    type="button"
                    className={segmentedControlItemClass({
                      isActive: hasSocialPostsEnabled,
                    })}
                    onClick={() => {
                      setContentFilters((previous) =>
                        previous.includes("social_posts")
                          ? previous.filter((item) => item !== "social_posts")
                          : [...previous, "social_posts"]
                      );
                    }}
                  >
                    <span className="inline-flex items-center gap-1">
                      {hasSocialPostsEnabled ? (
                        <AppIcon name="success" boxClassName="h-3.5 w-3.5" size={11} />
                      ) : null}
                      Social Posts
                    </span>
                  </button>
                </div>
              </div>
            }
            filters={
              <select
                aria-label="Writer"
                value={writerFilter}
                onChange={(event) => {
                  setWriterFilter(event.target.value);
                }}
                className="focus-field w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700"
              >
                <option value="all">Writers</option>
                {writerOptions.map(([writerId, writerName]) => (
                  <option key={writerId} value={writerId}>
                    {writerName}
                  </option>
                ))}
              </select>
            }
          />
          <DataPageFilterPills pills={activeFilterPills} />
          <CalendarControlBar
            periodLabel={
              mode === "month"
                ? format(cursorDate, "MMMM yyyy")
                : `${format(range.start, "MMM d")} – ${format(range.end, "MMM d, yyyy")}`
            }
            mode={mode}
            monthInputValue={format(cursorDate, "yyyy-MM")}
            onPrev={() => {
              setCursorDate((prev) => (mode === "month" ? subMonths(prev, 1) : subWeeks(prev, 1)));
            }}
            onToday={() => {
              const todayDate = new Date(`${todayDateKey}T00:00:00`);
              setCursorDate(todayDate);
              setFocusedDateKey(todayDateKey);
              if (typeof window !== "undefined") {
                window.requestAnimationFrame(() => {
                  scrollTodayTileIntoView();
                });
              }
            }}
            onNext={() => {
              setCursorDate((prev) => (mode === "month" ? addMonths(prev, 1) : addWeeks(prev, 1)));
            }}
            onMonthInputChange={(nextValue) => {
              if (!nextValue) {
                return;
              }
              const nextDate = new Date(`${nextValue}-01T00:00:00`);
              if (!Number.isNaN(nextDate.getTime())) {
                setCursorDate(nextDate);
              }
            }}
            onModeChange={setMode}
          />

          {isLoading ? (
            <section className="space-y-3 rounded-md border border-slate-200 bg-slate-50 p-4">
              <div className="skeleton h-4 w-40" />
              <div className="grid grid-cols-7 gap-2">
                {Array.from({ length: 14 }).map((_, cellIndex) => (
                  <div key={`calendar-skeleton-cell-${cellIndex}`} className="skeleton h-24 w-full" />
                ))}
              </div>
            </section>
          ) : (
            <>
              <section className="space-y-3">
                {dragPreviewMessage ? (
                  <p className="rounded-md border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs font-medium text-indigo-700">
                    {dragPreviewMessage}
                  </p>
                ) : null}
                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600">
                  {[
                    {
                      id: "sh_blog" as CalendarLegendFilter,
                      label: "SH Blog",
                      markerClassName: "h-2 w-2 rounded-full bg-blue-500",
                      isVisible: hasShBlogsVisible,
                    },
                    {
                      id: "red_blog" as CalendarLegendFilter,
                      label: "RED Blog",
                      markerClassName: "h-2 w-2 rounded-full bg-purple-500",
                      isVisible: hasRedBlogsVisible,
                    },
                    {
                      id: "sh_social_post" as CalendarLegendFilter,
                      label: "SH Social Post",
                      markerClassName: "h-2 w-2 rounded-full border-2 border-blue-500 bg-white",
                      isVisible: hasShSocialPostsVisible,
                    },
                    {
                      id: "red_social_post" as CalendarLegendFilter,
                      label: "RED Social Post",
                      markerClassName: "h-2 w-2 rounded-full border-2 border-purple-500 bg-white",
                      isVisible: hasRedSocialPostsVisible,
                    },
                  ].map((legendItem) => (
                    <button
                      key={legendItem.id}
                      type="button"
                      aria-pressed={legendItem.isVisible}
                      aria-label={`${legendItem.isVisible ? "Hide" : "Show"} ${legendItem.label}`}
                      onClick={() => {
                        toggleLegendFilter(legendItem.id);
                      }}
                      className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 shadow-[0_1px_2px_rgba(15,23,42,0.06)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-1 ${
                        legendItem.isVisible
                          ? "border-slate-200/90 bg-white/90 text-slate-700 hover:border-slate-300 hover:bg-white"
                          : "border-slate-200 bg-slate-100 text-slate-400 hover:border-slate-300 hover:text-slate-600"
                      }`}
                    >
                      <span className={legendItem.markerClassName} />
                      {legendItem.label}
                    </button>
                  ))}
                </div>
                <p className="sr-only" role="status" aria-live="polite">
                  {liveLegendSummary}
                </p>
                <div className="rounded-xl border border-slate-200/90 bg-gradient-to-r from-white via-white to-indigo-50/35 p-3 shadow-[0_1px_2px_rgba(15,23,42,0.06)]">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-600">This Week</h3>
                      <div className="mt-2 flex flex-wrap items-center gap-5 text-sm text-slate-700">
                        <div>
                          <span className="font-semibold tabular-nums">{weeklySummary.blogCount}</span>{" "}
                          <span className="text-slate-500">Blog{weeklySummary.blogCount !== 1 ? "s" : ""}</span>
                        </div>
                        <div>
                          <span className="font-semibold tabular-nums">{weeklySummary.socialCount}</span>{" "}
                          <span className="text-slate-500">Social{weeklySummary.socialCount !== 1 ? "s" : ""}</span>
                        </div>
                        <div>
                          <span className="font-semibold tabular-nums">{weeklySummary.busyDays}</span>{" "}
                          <span className="text-slate-500">Busy Day{weeklySummary.busyDays !== 1 ? "s" : ""}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <CalendarWeekdayHeaderRow
                  labels={weekdayLabels}
                  todayColumnIndex={todayWeekdayColumnIndex}
                />
                {!hasBlogsEnabled && !hasSocialPostsEnabled ? (
                  <p className="rounded-md border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-600">
                    Enable <span className="font-semibold">Blogs</span> or{" "}
                    <span className="font-semibold">Social Posts</span> to populate the calendar.
                  </p>
                ) : !hasAnyVisibleCategory ? (
                  <p className="rounded-md border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-600">
                    Enable at least one legend category to populate the calendar.
                  </p>
                ) : (
                  <DndContext
                    sensors={sensors}
                    onDragStart={handleDragStart}
                    onDragOver={handleDragOver}
                    onDragEnd={(event) => {
                      void handleDragEnd(event);
                    }}
                    onDragCancel={() => {
                      setDraggingBlogId(null);
                      setDragOverDateKey(null);
                    }}
                  >
                    <CalendarGridSurface
                      gridRef={calendarGridRef}
                      containLayout
                    >
                      {days.map((day) => {
                          const key = format(day, "yyyy-MM-dd");
                          const items = calendarItemsByDate[key] ?? [];
                          const compact = mode === "month";
                          const visibleItems = compact ? items.slice(0, 3) : items;
                          const hiddenItems = compact ? items.slice(3) : [];
                          const hiddenItemCount = compact
                            ? Math.max(0, items.length - visibleItems.length)
                            : 0;
                          const isToday = key === todayDateKey;
                          const isCurrentMonth = day.getMonth() === cursorDate.getMonth();
                          const isWeekend = day.getDay() === 0 || day.getDay() === 6;
                          const isMorePopoverOpen = expandedMoreDateKey === key;

                          return (
                            <DroppableDayCell
                              key={key}
                              dateKey={key}
                              className="relative overflow-visible"
                              data-is-today={isToday}
                            >
                              <CalendarTile
                                dayLabel={format(day, "d")}
                                isToday={isToday}
                                isCurrentMonth={isCurrentMonth}
                                hasEvents={false}
                                isFocused={focusedDateKey === key}
                                className={`${compact ? "" : "min-h-[18rem]"}${
                                  isWeekend && !isToday ? " bg-slate-50/70" : ""
                                }`}
                                headerClassName={isWeekend && !isToday ? "bg-slate-100/60" : undefined}
                                todayContainerClassName="border-indigo-400 bg-indigo-50/85 shadow-[0_0_0_1px_rgba(79,70,229,0.24),0_14px_24px_-16px_rgba(79,70,229,0.55)]"
                                bodyScrollable={!compact}
                                headerAction={
                                  <div className="flex items-center gap-1.5">
                                    {items.length > 0 ? (
                                      <span className="inline-flex min-w-[1.25rem] items-center justify-center rounded-full border border-indigo-200 bg-indigo-50 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-700">
                                        {items.length}
                                      </span>
                                    ) : null}
                                    <button
                                      type="button"
                                      className="rounded-md border border-slate-200 bg-white px-1.5 py-0.5 text-[11px] text-slate-600 shadow-sm transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-1"
                                      onClick={(event) => {
                                        event.stopPropagation();
                                        setExpandedMoreDateKey(null);
                                        setQuickCreateDateKey((previous) =>
                                          previous === key ? null : key
                                        );
                                      }}
                                    >
                                      +
                                    </button>
                                  </div>
                                }
                                bodyClassName={compact ? "space-y-1 overflow-visible" : "space-y-1"}
                              >
                                {quickCreateDateKey === key ? (
                                  <div className="absolute right-2 top-8 z-20 w-40 rounded-md border border-slate-200 bg-white p-2 shadow-lg">
                                    <Link
                                      href={`/blogs/new?scheduled_publish_date=${key}`}
                                      className="block rounded px-2 py-1 text-xs text-slate-700 hover:bg-slate-100"
                                      onClick={() => {
                                        setQuickCreateDateKey(null);
                                      }}
                                    >
                                      New Blog
                                    </Link>
                                    <Link
                                      href={`/social-posts?view=calendar&create=1&scheduled_date=${key}`}
                                      className="mt-1 block rounded px-2 py-1 text-xs text-slate-700 hover:bg-slate-100"
                                      onClick={() => {
                                        setQuickCreateDateKey(null);
                                      }}
                                    >
                                      New Social Post
                                    </Link>
                                  </div>
                                ) : null}
                                <div className="space-y-1.5">
                                  {visibleItems.map((item) =>
                                    item.type === "blog" ? (
                                      <CalendarBlogEventCard
                                        key={item.key}
                                        blog={item.blog}
                                        canDrag={
                                          canDragCalendarBlogs && item.blog.overall_status !== "published"
                                        }
                                        compact={compact}
                                        todayDateKey={todayDateKey}
                                        onOpen={() => {
                                          setActiveSocialPostId(null);
                                          setActiveBlogId(item.blog.id);
                                        }}
                                      />
                                    ) : (
                                      <CalendarSocialEventCard
                                        key={item.key}
                                        post={item.social}
                                        compact={compact}
                                        onOpen={() => {
                                          setActiveBlogId(null);
                                          setActiveSocialPostId(item.social.id);
                                        }}
                                      />
                                    )
                                  )}
                                  {hiddenItemCount > 0 ? (
                                    <>
                                      <button
                                        type="button"
                                        className="w-full rounded-md border border-dashed border-slate-300 bg-slate-50 px-2 py-1 text-[11px] font-medium text-slate-600 transition-colors hover:border-slate-400 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-1"
                                        onClick={(event) => {
                                          event.stopPropagation();
                                          if (event.shiftKey) {
                                            setMode("week");
                                            setCursorDate(day);
                                            setFocusedDateKey(key);
                                            setQuickCreateDateKey(null);
                                            setExpandedMoreDateKey(null);
                                            return;
                                          }
                                          setQuickCreateDateKey(null);
                                          setExpandedMoreDateKey((previous) =>
                                            previous === key ? null : key
                                          );
                                        }}
                                      >
                                        +{hiddenItemCount} more
                                      </button>
                                      {isMorePopoverOpen ? (
                                        <div
                                          ref={morePopoverRef}
                                          className="absolute left-2 right-2 top-full z-20 mt-1 rounded-md border border-slate-200 bg-white p-2 shadow-lg"
                                        >
                                          <p className="text-[11px] font-medium text-slate-600">
                                            Hidden on {format(day, "MMM d")}
                                          </p>
                                          <ul className="mt-2 max-h-44 space-y-1 overflow-y-auto pr-1">
                                            {hiddenItems.map((item) => {
                                              const label =
                                                item.type === "blog"
                                                  ? item.blog.title
                                                  : `${SOCIAL_POST_TYPE_LABELS[item.social.type]}: ${item.social.title}`;
                                              const markerClassName =
                                                item.type === "blog"
                                                  ? getBlogBarClass(item.blog.site)
                                                  : getSocialBarClass(getSocialSite(item.social));
                                              return (
                                                <li key={`${item.key}-popover`}>
                                                  <button
                                                    type="button"
                                                    className="flex w-full items-center gap-2 rounded px-2 py-1 text-left text-xs text-slate-700 transition-colors hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-1"
                                                    onClick={() => {
                                                      setExpandedMoreDateKey(null);
                                                      if (item.type === "blog") {
                                                        setActiveSocialPostId(null);
                                                        setActiveBlogId(item.blog.id);
                                                        return;
                                                      }
                                                      setActiveBlogId(null);
                                                      setActiveSocialPostId(item.social.id);
                                                    }}
                                                  >
                                                    <span
                                                      className={`h-2 w-2 shrink-0 rounded-full ${markerClassName}`}
                                                    />
                                                    <span className="truncate">
                                                      {truncateWithEllipsis(label, 56)}
                                                    </span>
                                                  </button>
                                                </li>
                                              );
                                            })}
                                          </ul>
                                          <div className="mt-2 flex justify-end">
                                            <button
                                              type="button"
                                              className="rounded border border-slate-200 px-2 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-1"
                                              onClick={() => {
                                                setMode("week");
                                                setCursorDate(day);
                                                setFocusedDateKey(key);
                                                setQuickCreateDateKey(null);
                                                setExpandedMoreDateKey(null);
                                              }}
                                            >
                                              Open week
                                            </button>
                                          </div>
                                        </div>
                                      ) : null}
                                    </>
                                  ) : null}
                                </div>
                              </CalendarTile>
                            </DroppableDayCell>
                          );
                      })}
                    </CalendarGridSurface>
                  </DndContext>
                )}
              </section>

              {overviewItems.length > 0 ? (
                <section className="space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                      This Month Overview
                    </h3>
                    <button
                      type="button"
                      onClick={handleExportCSV}
                      disabled={exportItems.length === 0}
                      className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-1"
                      title="Export this month's overview as CSV"
                    >
                      <AppIcon
                        name="download"
                        boxClassName="h-3.5 w-3.5"
                        size={12}
                        className="text-slate-600"
                      />
                      <span>Export CSV</span>
                    </button>
                  </div>
                  <div className="rounded-md border border-slate-200/90 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.06)]">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-slate-200/90 bg-slate-50/80">
                          <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">Date</th>
                          <th className="px-2 py-2 text-center text-xs font-semibold text-slate-600 uppercase tracking-wide w-12">Day</th>
                          <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">Type</th>
                          <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide flex-1 min-w-0">Title</th>
                          <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200/90">
                        {overviewItems.map((item) => {
                          const dateObj = new Date(`${item.date}T00:00:00`);
                          const formattedDate = format(dateObj, "d MMM");
                          if (item.type === "blog") {
                            const stage = getWorkflowStage({
                              writerStatus: item.blog.writer_status,
                              publisherStatus: item.blog.publisher_status,
                            });
                            return (
                              <tr
                                key={item.key}
                                className="hover:bg-slate-50/60 transition-colors cursor-pointer"
                                onClick={() => {
                                  setActiveBlogId(item.blog.id);
                                  setActiveSocialPostId(null);
                                }}
                              >
                                <td className="px-3 py-2.5 text-sm font-medium text-slate-700">{formattedDate}</td>
                                <td className="px-2 py-2.5 text-xs text-center text-slate-600">{item.dayOfWeek}</td>
                                <td className="px-3 py-2.5">
                                  <div className="flex items-center gap-1.5 text-xs">
                                    <span className={`h-2 w-2 shrink-0 rounded-full ${getBlogBarClass(item.blog.site)}`} />
                                    <span className="font-medium text-slate-700">{getSiteShortLabel(item.blog.site)} Blog</span>
                                  </div>
                                </td>
                                <td className="px-3 py-2.5 min-w-0 flex-1">
                                  <p className="text-sm text-slate-800 truncate" title={item.blog.title}>
                                    {item.blog.title}
                                  </p>
                                </td>
                                <td className="px-3 py-2.5">
                                  <WorkflowStageBadge stage={stage} />
                                </td>
                              </tr>
                            );
                          } else {
                            const socialSite = getSocialSite(item.social);
                            return (
                              <tr
                                key={item.key}
                                className="hover:bg-slate-50/60 transition-colors cursor-pointer"
                                onClick={() => {
                                  setActiveSocialPostId(item.social.id);
                                  setActiveBlogId(null);
                                }}
                              >
                                <td className="px-3 py-2.5 text-sm font-medium text-slate-700">{formattedDate}</td>
                                <td className="px-2 py-2.5 text-xs text-center text-slate-600">{item.dayOfWeek}</td>
                                <td className="px-3 py-2.5">
                                  <div className="flex items-center gap-1.5 text-xs">
                                    <span className={`h-2 w-2 shrink-0 rounded-full ${getSocialBulletClass(socialSite)}`} />
                                    <span className="font-medium text-slate-700">{getSiteShortLabel(socialSite)} Social</span>
                                  </div>
                                </td>
                                <td className="px-3 py-2.5 min-w-0 flex-1">
                                  <p className="text-sm text-slate-800 truncate" title={`${SOCIAL_POST_TYPE_LABELS[item.social.type]}: ${item.social.title}`}>
                                    <span className="text-slate-500 font-medium">{SOCIAL_POST_TYPE_LABELS[item.social.type]}:</span>{" "}
                                    {item.social.title}
                                  </p>
                                </td>
                                <td className="px-3 py-2.5">
                                  <span className="inline-flex items-center px-2.5 py-1.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                                    {SOCIAL_POST_STATUS_LABELS[item.social.status]}
                                  </span>
                                </td>
                              </tr>
                            );
                          }
                        })}
                      </tbody>
                    </table>
                  </div>
                </section>
              ) : null}

              <section className="space-y-2">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                  Unscheduled Content
                </h3>
                <div className="grid gap-3 xl:grid-cols-2">
                  {hasBlogsEnabled && (hasShBlogsVisible || hasRedBlogsVisible) ? (
                    <div className="space-y-2 rounded-md border border-slate-200 bg-white p-3">
                      <button
                        type="button"
                        aria-expanded={isUnscheduledBlogsExpanded}
                        onClick={() => {
                          setIsUnscheduledBlogsExpanded((previous) => !previous);
                        }}
                        className="flex w-full items-center justify-between rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-left transition-colors hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-1"
                      >
                        <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Unscheduled Blogs ({noPublishDateBlogs.length})
                        </span>
                        <AppIcon
                          name="chevronRight"
                          boxClassName="h-4 w-4"
                          size={14}
                          className={`text-slate-500 transition-transform ${
                            isUnscheduledBlogsExpanded ? "rotate-90" : ""
                          }`}
                        />
                      </button>
                      {isUnscheduledBlogsExpanded ? (
                        noPublishDateBlogs.length === 0 ? (
                          <p className="rounded-md border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-500">
                            All blogs are scheduled.
                          </p>
                        ) : (
                          <>
                            <ul className="space-y-2">
                              {pagedNoPublishDateBlogs.map((blog) => (
                                <li
                                  key={blog.id}
                                  className="rounded-md border border-slate-200 px-3 py-2"
                                >
                                  <Link
                                    href={`/blogs/${blog.id}`}
                                    className="interactive-link font-medium text-slate-800"
                                  >
                                    {blog.title}
                                  </Link>
                                  <p className="mt-1 text-xs text-slate-600">{getNoPublishReason(blog)}</p>
                                  <div className="mt-1">
                                    <WorkflowStageBadge
                                      stage={getWorkflowStage({
                                        writerStatus: blog.writer_status,
                                        publisherStatus: blog.publisher_status,
                                      })}
                                    />
                                  </div>
                                </li>
                              ))}
                            </ul>
                            <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
                              <TableRowLimitSelect
                                value={noDateRowLimit}
                                onChange={(value) => {
                                  setNoDateRowLimit(value);
                                }}
                              />
                              <TablePaginationControls
                                currentPage={noDateCurrentPage}
                                pageCount={noDatePageCount}
                                onPageChange={setNoDateCurrentPage}
                              />
                            </div>
                          </>
                        )
                      ) : (
                        <p className="rounded-md border border-dashed border-slate-200 bg-white px-3 py-3 text-sm text-slate-500">
                          Expand to review unscheduled blogs.
                        </p>
                      )}
                    </div>
                  ) : null}
                  {hasSocialPostsEnabled &&
                  (hasShSocialPostsVisible || hasRedSocialPostsVisible) ? (
                    <div className="space-y-2 rounded-md border border-slate-200 bg-white p-3">
                      <button
                        type="button"
                        aria-expanded={isUnscheduledSocialPostsExpanded}
                        onClick={() => {
                          setIsUnscheduledSocialPostsExpanded((previous) => !previous);
                        }}
                        className="flex w-full items-center justify-between rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-left transition-colors hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-1"
                      >
                        <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Unscheduled Social Posts ({unscheduledSocialPosts.length})
                        </span>
                        <AppIcon
                          name="chevronRight"
                          boxClassName="h-4 w-4"
                          size={14}
                          className={`text-slate-500 transition-transform ${
                            isUnscheduledSocialPostsExpanded ? "rotate-90" : ""
                          }`}
                        />
                      </button>
                      {isUnscheduledSocialPostsExpanded ? (
                        unscheduledSocialPosts.length === 0 ? (
                          <p className="rounded-md border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-500">
                            All social posts are scheduled.
                          </p>
                        ) : (
                          <ul className="space-y-2">
                            {unscheduledSocialPosts.map((post) => (
                              <li
                                key={post.id}
                                className="rounded-md border border-slate-200 px-3 py-2"
                              >
                                <button
                                  type="button"
                                  className="w-full text-left"
                                  onClick={() => {
                                    setActiveBlogId(null);
                                    setActiveSocialPostId(post.id);
                                  }}
                                >
                                  <p className="font-medium text-slate-800">{post.title}</p>
                                  <p className="text-xs text-slate-500">
                                    {SOCIAL_POST_TYPE_LABELS[post.type]} ·{" "}
                                    {SOCIAL_POST_STATUS_LABELS[post.status]}
                                  </p>
                                </button>
                              </li>
                            ))}
                          </ul>
                        )
                      ) : (
                        <p className="rounded-md border border-dashed border-slate-200 bg-white px-3 py-3 text-sm text-slate-500">
                          Expand to review unscheduled social posts.
                        </p>
                      )}
                    </div>
                  ) : null}
                </div>
              </section>
            </>
          )}
          {activeBlog ? (
            <>
              <button
                type="button"
                aria-label="Close calendar blog panel"
                className="fixed inset-0 z-30 bg-slate-900/25"
                onClick={() => {
                  setActiveBlogId(null);
                }}
              />
              <aside className="fixed inset-y-0 right-0 z-40 w-full max-w-lg overflow-y-auto border-l border-slate-200 bg-white p-4 shadow-2xl">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900">{activeBlog.title}</h3>
                    <p className="text-sm text-slate-600">{activeBlog.site}</p>
                  </div>
                  <button
                    type="button"
                    className="pressable rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                    onClick={() => {
                      setActiveBlogId(null);
                    }}
                  >
                    Close
                  </button>
                </div>
                <div className="mt-4 space-y-3 text-sm text-slate-700">
                  <p>
                    Writer ·{" "}
                    <span className="font-medium">{activeBlog.writer?.full_name ?? "Unassigned"}</span>
                  </p>
                  <p>
                    Publisher ·{" "}
                    <span className="font-medium">
                      {activeBlog.publisher?.full_name ?? "Unassigned"}
                    </span>
                  </p>
                  <div className="flex items-center gap-2">
                    <WorkflowStageBadge
                      stage={getWorkflowStage({
                        writerStatus: activeBlog.writer_status,
                        publisherStatus: activeBlog.publisher_status,
                      })}
                    />
                    {(() => {
                      const scheduledDate = getBlogScheduledDate(activeBlog);
                      const isOverdue =
                        scheduledDate !== null &&
                        scheduledDate < todayDateKey &&
                        activeBlog.publisher_status !== "completed";
                      return isOverdue ? (
                        <span className="inline-flex items-center justify-center gap-1 rounded-full bg-rose-100 px-2.5 py-1 text-xs font-medium text-rose-700">
                          <AppIcon
                            name="warning"
                            boxClassName="h-3.5 w-3.5"
                            size={11}
                          />
                          Overdue
                        </span>
                      ) : null;
                    })()}
                  </div>
                  <p>Scheduled: {getBlogScheduledDate(activeBlog) ?? "Unscheduled"}</p>
                </div>
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <Link
                    href={`/blogs/${activeBlog.id}`}
                    className="pressable inline-flex rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Edit
                  </Link>
                  <input
                    type="date"
                    value={panelRescheduleDate}
                    onChange={(event) => {
                      setPanelRescheduleDate(event.target.value);
                    }}
                    className="pressable rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      void handlePanelReschedule();
                    }}
                    className="pressable inline-flex rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Reschedule
                  </button>
                  <Link
                    href={`/blogs/${activeBlog.id}`}
                    className="pressable inline-flex rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Open blog
                  </Link>
                </div>
              </aside>
            </>
          ) : null}
          {activeSocialPost ? (
            <>
              <button
                type="button"
                aria-label="Close calendar social panel"
                className="fixed inset-0 z-30 bg-slate-900/25"
                onClick={() => {
                  setActiveSocialPostId(null);
                }}
              />
              <aside className="fixed inset-y-0 right-0 z-40 w-full max-w-lg overflow-y-auto border-l border-slate-200 bg-white p-4 shadow-2xl">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900">
                      {activeSocialPost.title}
                    </h3>
                    <p className="text-sm text-slate-600">
                      {SOCIAL_POST_TYPE_LABELS[activeSocialPost.type]} ·{" "}
                      {SOCIAL_POST_STATUS_LABELS[activeSocialPost.status]}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="pressable rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                    onClick={() => {
                      setActiveSocialPostId(null);
                    }}
                  >
                    Close
                  </button>
                </div>
                <div className="mt-4 space-y-3 text-sm text-slate-700">
                  <p>
                    Assigned to ·{" "}
                    <span className="font-medium">
                      {activeSocialPostOwnerDisplay}
                    </span>
                  </p>
                  <p>
                    Scheduled ·{" "}
                    <span className="font-medium">
                      {activeSocialPost.scheduled_date ?? "Unscheduled"}
                    </span>
                  </p>
                  {activeSocialPost.associated_blog ? (
                    <p>
                      Linked Blog ·{" "}
                      <span className="font-medium">{activeSocialPost.associated_blog.title}</span>
                    </p>
                  ) : null}
                </div>
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <Link
                    href={`/social-posts/${activeSocialPost.id}`}
                    className="pressable inline-flex rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Open social post
                  </Link>
                </div>
              </aside>
            </>
          ) : null}
          <ConfirmationModal
            isOpen={pendingReschedule !== null}
            title="Confirm reschedule"
            description={
              pendingReschedule
                ? `Reschedule "${pendingReschedule.blogTitle}" from ${
                    pendingReschedule.fromDateKey
                      ? formatCalendarDateLabel(pendingReschedule.fromDateKey)
                      : "Unscheduled"
                  } to ${formatCalendarDateLabel(pendingReschedule.toDateKey)}?`
                : ""
            }
            confirmLabel="Confirm reschedule"
            tone="default"
            onCancel={() => {
              setPendingReschedule(null);
            }}
            onConfirm={() => {
              void confirmPendingReschedule();
            }}
          />
        </div>
      </AppShell>
    </ProtectedPage>
  );
}
