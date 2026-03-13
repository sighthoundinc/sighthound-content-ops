"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
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
  isSameDay,
  isWithinInterval,
  startOfMonth,
  startOfWeek,
  subMonths,
  subWeeks,
} from "date-fns";

import { AppShell } from "@/components/app-shell";
import { ProtectedPage } from "@/components/protected-page";
import { WorkflowStageBadge } from "@/components/status-badge";
import { TablePaginationControls, TableRowLimitSelect } from "@/components/table-controls";
import {
  BLOG_SELECT_LEGACY,
  BLOG_SELECT_WITH_DATES,
  getBlogScheduledDate,
  isMissingBlogDateColumnsError,
  normalizeBlogRows,
} from "@/lib/blog-schema";
import { hasWorkflowOverridePermission } from "@/lib/permissions";
import { getWorkflowStage } from "@/lib/status";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import {
  DEFAULT_TABLE_ROW_LIMIT,
  getTablePageCount,
  getTablePageRows,
  type TableRowLimit,
} from "@/lib/table";
import type { BlogRecord } from "@/lib/types";
import { toTitleCase } from "@/lib/utils";
import { useAuth } from "@/providers/auth-provider";

type CalendarMode = "month" | "week";

function formatCalendarDateLabel(dateKey: string) {
  const parsed = new Date(`${dateKey}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) {
    return dateKey;
  }
  return format(parsed, "MMM d");
}

function getSiteTag(site: BlogRecord["site"]) {
  return site === "sighthound.com" ? "SH" : "RED";
}

function getSiteTagClasses(site: BlogRecord["site"]) {
  return site === "sighthound.com"
    ? "bg-blue-50 text-blue-700 border-blue-100"
    : "bg-orange-50 text-orange-700 border-orange-100";
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
}: {
  dateKey: string;
  className: string;
  children: React.ReactNode;
}) {
  const { isOver, setNodeRef } = useDroppable({
    id: `day-${dateKey}`,
  });

  return (
    <article
      ref={setNodeRef}
      className={`${className} ${isOver ? "ring-2 ring-indigo-300 ring-offset-1" : ""}`}
    >
      {children}
    </article>
  );
}

function DraggableCalendarBlogLine({
  blog,
  canDrag,
  onOpen,
}: {
  blog: BlogRecord;
  canDrag: boolean;
  onOpen: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: blog.id,
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
      className={`flex w-full items-center gap-2 rounded border border-slate-200 bg-white px-2 py-1.5 text-left text-xs transition-colors duration-150 ${
        canDrag ? "cursor-grab hover:bg-neutral-50 active:cursor-grabbing" : "cursor-default"
      } ${isDragging ? "opacity-60" : ""}`}
      {...(canDrag ? attributes : {})}
      {...(canDrag ? listeners : {})}
    >
      <span
        className={`inline-flex items-center justify-center rounded border px-1.5 py-0.5 text-[10px] font-semibold ${getSiteTagClasses(
          blog.site
        )}`}
      >
        {getSiteTag(blog.site)}
      </span>
      <span className="shrink-0 text-slate-600">
        {formatCalendarDateLabel(getBlogScheduledDate(blog) ?? "")}
      </span>
      <span className="text-slate-600">—</span>
      <span className="min-w-0 truncate font-medium text-slate-800">{blog.title}</span>
      {blog.overall_status === "published" ? (
        <span className="text-[10px] text-slate-400" aria-label="Published and fixed schedule">
          🔒
        </span>
      ) : null}
    </button>
  );
}

function DraggableCalendarBlogCard({
  blog,
  canDrag,
  isOverdue,
  onOpen,
}: {
  blog: BlogRecord;
  canDrag: boolean;
  isOverdue: boolean;
  onOpen: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: blog.id,
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
      className={`block w-full rounded border border-slate-200 bg-slate-50 p-1 text-left text-xs transition-colors duration-150 ${
        canDrag ? "cursor-grab hover:bg-neutral-100 active:cursor-grabbing" : "cursor-default"
      } ${
        blog.overall_status === "published" ? "opacity-90" : ""
      } ${
        isDragging ? "opacity-60" : ""
      }`}
      title={`${blog.title}\nWriter · ${blog.writer?.full_name ?? "Unassigned"}\nStage · ${toTitleCase(
        getWorkflowStage({
          writerStatus: blog.writer_status,
          publisherStatus: blog.publisher_status,
        })
      )}\nScheduled · ${getBlogScheduledDate(blog) ?? "Unscheduled"}`}
      {...(canDrag ? attributes : {})}
      {...(canDrag ? listeners : {})}
    >
      <p className="line-clamp-2 font-medium text-slate-700">{blog.title}</p>
      <div className="mt-1 flex items-center gap-1">
        <WorkflowStageBadge
          stage={getWorkflowStage({
            writerStatus: blog.writer_status,
            publisherStatus: blog.publisher_status,
          })}
        />
        {isOverdue ? (
          <span className="inline-flex items-center justify-center rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-medium text-rose-700">
            ⚠ Overdue
          </span>
        ) : null}
        <span className="text-[10px] text-slate-500">
          {blog.writer?.full_name ?? "Unassigned"}
        </span>
        {blog.overall_status === "published" ? (
          <span className="text-[10px] text-slate-400" aria-label="Published and fixed schedule">
            🔒
          </span>
        ) : null}
      </div>
    </button>
  );
}

export default function CalendarPage() {
  const { hasPermission } = useAuth();
  const [blogs, setBlogs] = useState<BlogRecord[]>([]);
  const [mode, setMode] = useState<CalendarMode>("month");
  const [cursorDate, setCursorDate] = useState(new Date());
  const [weekStart, setWeekStart] = useState(1);
  const [timezone, setTimezone] = useState("America/Chicago");
  const [noDateRowLimit, setNoDateRowLimit] = useState<TableRowLimit>(DEFAULT_TABLE_ROW_LIMIT);
  const [noDateCurrentPage, setNoDateCurrentPage] = useState(1);
  const [draggingBlogId, setDraggingBlogId] = useState<string | null>(null);
  const [dragOverDateKey, setDragOverDateKey] = useState<string | null>(null);
  const [activeBlogId, setActiveBlogId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [todayDateKey] = useState(() => format(new Date(), "yyyy-MM-dd"));
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    })
  );
  const canWorkflowOverride = hasWorkflowOverridePermission(hasPermission);
  const canDragCalendarBlogs =
    hasPermission("calendar_drag_reschedule") ||
    hasPermission("reschedule_via_calendar") ||
    canWorkflowOverride;

  useEffect(() => {
    const loadData = async () => {
      const supabase = getSupabaseBrowserClient();
      setIsLoading(true);
      setError(null);
      const fetchBlogs = async () => {
        let { data, error } = await supabase
          .from("blogs")
          .select(BLOG_SELECT_WITH_DATES)
          .eq("is_archived", false)
          .order("scheduled_publish_date", { ascending: true, nullsFirst: false });

        if (isMissingBlogDateColumnsError(error)) {
          const fallback = await supabase
            .from("blogs")
            .select(BLOG_SELECT_LEGACY)
            .eq("is_archived", false)
            .order("target_publish_date", { ascending: true, nullsFirst: false });
          data = fallback.data as typeof data;
          error = fallback.error;
        }

        return { data, error };
      };

      const [{ data: blogsData, error: blogsError }, { data: settingsData }] =
        await Promise.all([
          fetchBlogs(),
          supabase.from("app_settings").select("*").eq("id", 1).maybeSingle(),
        ]);

      if (blogsError) {
        setError(blogsError.message);
        setIsLoading(false);
        return;
      }

      setBlogs(
        normalizeBlogRows((blogsData ?? []) as Array<Record<string, unknown>>) as BlogRecord[]
      );
      if (settingsData) {
        setWeekStart(settingsData.week_start ?? 1);
        setTimezone(settingsData.timezone ?? "America/Chicago");
      }
      setIsLoading(false);
    };

    void loadData();
  }, []);

  const range = useMemo(() => {
    if (mode === "month") {
      const monthStart = startOfMonth(cursorDate);
      return {
        start: startOfWeek(monthStart, { weekStartsOn: weekStart as 0 | 1 | 2 | 3 | 4 | 5 | 6 }),
        end: endOfWeek(endOfMonth(cursorDate), {
          weekStartsOn: weekStart as 0 | 1 | 2 | 3 | 4 | 5 | 6,
        }),
      };
    }

    const start = startOfWeek(cursorDate, {
      weekStartsOn: weekStart as 0 | 1 | 2 | 3 | 4 | 5 | 6,
    });
    return {
      start,
      end: endOfWeek(start, { weekStartsOn: weekStart as 0 | 1 | 2 | 3 | 4 | 5 | 6 }),
    };
  }, [cursorDate, mode, weekStart]);

  const currentWeekRange = useMemo(() => {
    const start = startOfWeek(new Date(), {
      weekStartsOn: weekStart as 0 | 1 | 2 | 3 | 4 | 5 | 6,
    });
    return {
      start,
      end: endOfWeek(start, { weekStartsOn: weekStart as 0 | 1 | 2 | 3 | 4 | 5 | 6 }),
    };
  }, [weekStart]);

  const days = useMemo(
    () =>
      eachDayOfInterval({
        start: range.start,
        end: range.end,
      }),
    [range.end, range.start]
  );

  const weekdayLabels = useMemo(() => {
    const baseStart = startOfWeek(new Date(), {
      weekStartsOn: weekStart as 0 | 1 | 2 | 3 | 4 | 5 | 6,
    });
    return Array.from({ length: 7 }, (_, index) => format(addDays(baseStart, index), "EEE"));
  }, [weekStart]);

  const todayWeekdayColumnIndex = useMemo(
    () => (new Date().getDay() - weekStart + 7) % 7,
    [weekStart]
  );

  const blogsByDate = useMemo(() => {
    return blogs.reduce<Record<string, BlogRecord[]>>((acc, blog) => {
      const scheduledDate = getBlogScheduledDate(blog);
      if (!scheduledDate) {
        return acc;
      }
      const key = scheduledDate;
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(blog);
      return acc;
    }, {});
  }, [blogs]);

  const weeks = useMemo(() => {
    if (mode !== "month") {
      return [];
    }
    const chunked: Date[][] = [];
    for (let index = 0; index < days.length; index += 7) {
      chunked.push(days.slice(index, index + 7));
    }
    return chunked;
  }, [days, mode]);

  const blogsByWeekStart = useMemo(() => {
    if (mode !== "month") {
      return {};
    }
    return weeks.reduce<Record<string, BlogRecord[]>>((acc, weekDays) => {
      const weekStartKey = format(weekDays[0], "yyyy-MM-dd");
      const weekEnd = weekDays[6];
      const weeklyBlogs = blogs
        .filter((blog) => {
          const scheduledDate = getBlogScheduledDate(blog);
          if (!scheduledDate) {
            return false;
          }
          const scheduled = new Date(`${scheduledDate}T00:00:00`);
          if (Number.isNaN(scheduled.getTime())) {
            return false;
          }
          return scheduled >= weekDays[0] && scheduled <= weekEnd;
        })
        .sort((left, right) => {
          const leftDate = getBlogScheduledDate(left) ?? "";
          const rightDate = getBlogScheduledDate(right) ?? "";
          if (leftDate === rightDate) {
            return left.title.localeCompare(right.title);
          }
          return leftDate.localeCompare(rightDate);
        });
      acc[weekStartKey] = weeklyBlogs;
      return acc;
    }, {});
  }, [blogs, mode, weeks]);

  const noPublishDateBlogs = useMemo(
    () => blogs.filter((blog) => !getBlogScheduledDate(blog)),
    [blogs]
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

  const draggingBlog = useMemo(
    () => blogs.find((blog) => blog.id === draggingBlogId) ?? null,
    [blogs, draggingBlogId]
  );

  const dragPreviewMessage = useMemo(() => {
    if (!draggingBlog || !dragOverDateKey) {
      return null;
    }
    return `Moving to ${formatCalendarDateLabel(dragOverDateKey)}`;
  }, [dragOverDateKey, draggingBlog]);

  useEffect(() => {
    if (!toastMessage) {
      return;
    }
    const timeout = window.setTimeout(() => {
      setToastMessage(null);
    }, 2200);
    return () => {
      window.clearTimeout(timeout);
    };
  }, [toastMessage]);

  const updateScheduledDate = async (blogId: string, scheduledDate: string) => {
    if (!canDragCalendarBlogs) {
      setError("You do not have permission to move publish dates on the calendar.");
      return;
    }
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

    if (isMissingBlogDateColumnsError(updateError)) {
      const fallback = await supabase
        .from("blogs")
        .update({
          target_publish_date: scheduledDate,
        })
        .eq("id", blogId)
        .select(BLOG_SELECT_LEGACY)
        .single();

      if (fallback.error) {
        setError(fallback.error.message);
        return;
      }

      setBlogs((previous) =>
        normalizeBlogRows(
          previous.map((blog) =>
            blog.id === blogId ? ({ ...blog, ...fallback.data } as Record<string, unknown>) : blog
          ) as Array<Record<string, unknown>>
        ) as BlogRecord[]
      );
      setSuccessMessage("Scheduled date updated.");
      setError(null);
      return;
    }

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setBlogs((previous) =>
      normalizeBlogRows(
        previous.map((blog) =>
          blog.id === blogId ? ({ ...blog, ...data } as Record<string, unknown>) : blog
        ) as Array<Record<string, unknown>>
      ) as BlogRecord[]
    );
    setSuccessMessage("Scheduled date updated.");
    setError(null);
  };

  const handleDragStart = (event: DragStartEvent) => {
    const blogId = String(event.active.id);
    const nextBlog = blogs.find((blog) => blog.id === blogId) ?? null;
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
    const draggedBlogId = String(event.active.id);
    const draggedBlog = blogs.find((blog) => blog.id === draggedBlogId) ?? null;
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

    await updateScheduledDate(draggedBlogId, nextDateKey);
    setToastMessage(`Moved to ${formatCalendarDateLabel(nextDateKey)}`);
  };

  return (
    <ProtectedPage requiredPermissions={["view_calendar"]}>
      <AppShell>
        <div className="space-y-6">
          <header className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">Calendar</h2>
              <p className="text-sm text-slate-600">
                {timezone} timezone • week starts on{" "}
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][weekStart]}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                className="rounded-md border border-slate-300 px-3 py-2 text-sm"
                onClick={() => {
                  setCursorDate((prev) =>
                    mode === "month" ? subMonths(prev, 1) : subWeeks(prev, 1)
                  );
                }}
              >
                Prev
              </button>
              <button
                type="button"
                className="rounded-md border border-slate-300 px-3 py-2 text-sm"
                onClick={() => {
                  setCursorDate(new Date());
                }}
              >
                Today
              </button>
              <button
                type="button"
                className="rounded-md border border-slate-300 px-3 py-2 text-sm"
                onClick={() => {
                  setCursorDate((prev) =>
                    mode === "month" ? addMonths(prev, 1) : addWeeks(prev, 1)
                  );
                }}
              >
                Next
              </button>
              <label className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700">
                <span className="sr-only">Jump to month</span>
                <input
                  type="month"
                  value={format(cursorDate, "yyyy-MM")}
                  onChange={(event) => {
                    const nextValue = event.target.value;
                    if (!nextValue) {
                      return;
                    }
                    const nextDate = new Date(`${nextValue}-01T00:00:00`);
                    if (!Number.isNaN(nextDate.getTime())) {
                      setCursorDate(nextDate);
                    }
                  }}
                  className="border-none p-0 text-sm focus:outline-none"
                />
              </label>
              <select
                value={mode}
                onChange={(event) => {
                  setMode(event.target.value as CalendarMode);
                }}
                className="rounded-md border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="month">Month</option>
                <option value="week">Week</option>
              </select>
            </div>
          </header>

          <p className="text-sm font-medium text-slate-700">
            {mode === "month"
              ? format(cursorDate, "MMMM yyyy")
              : `${format(range.start, "MMM d")} – ${format(range.end, "MMM d, yyyy")}`}
          </p>

          {isLoading ? (
            <p className="rounded-md border border-slate-200 bg-slate-50 px-4 py-5 text-sm text-slate-500">
              Loading calendar…
            </p>
          ) : error ? (
            <p className="rounded-md border border-rose-200 bg-rose-50 px-4 py-5 text-sm text-rose-700">
              {error}
            </p>
          ) : (
            <>
              {successMessage ? (
                <p className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                  {successMessage}
                </p>
              ) : null}
              <section className="space-y-3">
                {dragPreviewMessage ? (
                  <p className="rounded-md border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs font-medium text-indigo-700">
                    {dragPreviewMessage}
                  </p>
                ) : null}
                <div className="grid grid-cols-7 gap-2">
                  {weekdayLabels.map((label, index) => (
                    <div
                      key={label}
                      className="flex flex-col items-center justify-center gap-1"
                    >
                      {index === todayWeekdayColumnIndex ? (
                        <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
                      ) : (
                        <span className="h-1.5 w-1.5 rounded-full bg-transparent" />
                      )}
                      <p className="text-center text-xs font-semibold uppercase tracking-wide text-slate-500">
                        {label}
                      </p>
                    </div>
                  ))}
                </div>
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
                  {mode === "month" ? (
                    <div className="space-y-3">
                      {weeks.map((weekDays) => {
                        const weekStartKey = format(weekDays[0], "yyyy-MM-dd");
                        const weekBlogs = blogsByWeekStart[weekStartKey] ?? [];
                        return (
                          <section
                            key={weekStartKey}
                            className="rounded-md border border-slate-200 bg-white p-2"
                          >
                            <div className="grid grid-cols-7 gap-2">
                              {weekDays.map((day) => {
                                const key = format(day, "yyyy-MM-dd");
                                const isCurrentMonth = day.getMonth() === cursorDate.getMonth();
                                const isToday = isSameDay(day, new Date());
                                const isCurrentWeek = isWithinInterval(day, currentWeekRange);
                                return (
                                  <DroppableDayCell
                                    key={key}
                                    dateKey={key}
                                    className={`min-h-14 rounded-md border px-2 py-1.5 ${
                                      isCurrentMonth
                                        ? "border-neutral-100 bg-white"
                                        : "border-neutral-100 bg-neutral-50 text-neutral-400"
                                    } ${!isToday && isCurrentWeek ? "bg-neutral-50" : ""} ${
                                      isToday ? "bg-indigo-50 border-indigo-400 shadow-sm" : ""
                                    }`}
                                  >
                                    <p
                                      className={`text-sm ${
                                        isToday
                                          ? "font-medium text-indigo-700"
                                          : isCurrentMonth
                                            ? "font-normal text-neutral-900"
                                            : "font-normal text-neutral-400"
                                      }`}
                                    >
                                      {format(day, "d")}
                                    </p>
                                  </DroppableDayCell>
                                );
                              })}
                            </div>
                            {weekBlogs.length > 0 ? (
                              <div className="mt-2 space-y-1.5 rounded-md border border-slate-100 bg-slate-50 p-2">
                                {weekBlogs.map((blog) => {
                                  const canDragThisBlog =
                                    canDragCalendarBlogs && blog.overall_status !== "published";
                                  return (
                                    <DraggableCalendarBlogLine
                                      key={blog.id}
                                      blog={blog}
                                      canDrag={canDragThisBlog}
                                      onOpen={() => {
                                        setActiveBlogId(blog.id);
                                      }}
                                    />
                                  );
                                })}
                              </div>
                            ) : null}
                          </section>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="grid grid-cols-7 gap-2">
                      {days.map((day) => {
                        const key = format(day, "yyyy-MM-dd");
                        const items = blogsByDate[key] ?? [];
                        const isToday = isSameDay(day, new Date());
                        const isCurrentWeek = isWithinInterval(day, currentWeekRange);
                        return (
                          <DroppableDayCell
                            key={key}
                            dateKey={key}
                            className={`min-h-28 rounded-md border border-neutral-100 bg-white p-2 ${
                              !isToday && isCurrentWeek ? "bg-neutral-50" : ""
                            } ${isToday ? "bg-indigo-50 border-indigo-400 shadow-sm" : ""}`}
                          >
                            <p
                              className={`mb-2 text-sm ${
                                isToday
                                  ? "font-medium text-indigo-700"
                                  : "font-normal text-neutral-900"
                              }`}
                            >
                              {format(day, "d")}
                            </p>
                            <div className="space-y-1">
                              {items.length === 0 ? (
                                <p className="text-xs text-slate-400">No blogs</p>
                              ) : (
                                items.map((blog) => {
                                  const scheduledDate = getBlogScheduledDate(blog);
                                  const isOverdue =
                                    scheduledDate !== null &&
                                    scheduledDate < todayDateKey &&
                                    blog.publisher_status !== "completed";
                                  const canDragThisBlog =
                                    canDragCalendarBlogs && blog.overall_status !== "published";

                                  return (
                                    <DraggableCalendarBlogCard
                                      key={blog.id}
                                      blog={blog}
                                      canDrag={canDragThisBlog}
                                      isOverdue={isOverdue}
                                      onOpen={() => {
                                        setActiveBlogId(blog.id);
                                      }}
                                    />
                                  );
                                })
                              )}
                            </div>
                          </DroppableDayCell>
                        );
                      })}
                    </div>
                  )}
                </DndContext>
              </section>

              <section className="space-y-2">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                  No Publish Date
                </h3>
                {noPublishDateBlogs.length === 0 ? (
                  <p className="rounded-md border border-slate-200 bg-slate-50 px-3 py-4 text-sm text-slate-500">
                    All blogs are scheduled. Great job keeping the calendar planned.
                  </p>
                ) : (
                  <>
                    <p className="rounded-md border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-600">
                      These blogs do not have a scheduled publish date yet. Possible reasons include
                      ongoing drafting, no editorial date assignment, or imported legacy records.
                      Assign a scheduled publish date to move them into the calendar.
                    </p>
                    <ul className="space-y-3">
                      {pagedNoPublishDateBlogs.map((blog) => (
                        <li
                          key={blog.id}
                          className="rounded-md border border-slate-200 px-3 py-2"
                        >
                          <Link
                            href={`/blogs/${blog.id}`}
                            className="font-medium text-slate-900 hover:underline"
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
                )}
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
                    className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
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
                        <span className="inline-flex items-center justify-center rounded-full bg-rose-100 px-2.5 py-1 text-xs font-medium text-rose-700">
                          ⚠ Overdue
                        </span>
                      ) : null;
                    })()}
                  </div>
                  <p>Scheduled: {getBlogScheduledDate(activeBlog) ?? "Unscheduled"}</p>
                </div>
                <div className="mt-4">
                  <Link
                    href={`/blogs/${activeBlog.id}`}
                    className="inline-flex rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Open full blog page
                  </Link>
                </div>
              </aside>
            </>
          ) : null}
        </div>
        {toastMessage ? (
          <div className="pointer-events-none fixed bottom-5 right-5 z-50 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700 shadow-sm">
            {toastMessage}
          </div>
        ) : null}
      </AppShell>
    </ProtectedPage>
  );
}
