"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
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
import { StatusBadge } from "@/components/status-badge";
import { TablePaginationControls, TableRowLimitSelect } from "@/components/table-controls";
import {
  BLOG_SELECT_LEGACY,
  BLOG_SELECT_WITH_DATES,
  getBlogScheduledDate,
  isMissingBlogDateColumnsError,
  normalizeBlogRows,
} from "@/lib/blog-schema";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import {
  DEFAULT_TABLE_ROW_LIMIT,
  getTablePageCount,
  getTablePageRows,
  type TableRowLimit,
} from "@/lib/table";
import type { BlogRecord } from "@/lib/types";
import { toTitleCase } from "@/lib/utils";

type CalendarMode = "month" | "week";

function getNoPublishReason(blog: BlogRecord) {
  const statusLabel = toTitleCase(blog.overall_status);
  return `Status: ${statusLabel} (no scheduled date)`;
}

export default function CalendarPage() {
  const [blogs, setBlogs] = useState<BlogRecord[]>([]);
  const [mode, setMode] = useState<CalendarMode>("month");
  const [cursorDate, setCursorDate] = useState(new Date());
  const [weekStart, setWeekStart] = useState(1);
  const [timezone, setTimezone] = useState("America/Chicago");
  const [noDateRowLimit, setNoDateRowLimit] = useState<TableRowLimit>(DEFAULT_TABLE_ROW_LIMIT);
  const [noDateCurrentPage, setNoDateCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  return (
    <ProtectedPage>
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
              <section className="space-y-3">
                <div className="grid grid-cols-7 gap-2">
                  {weekdayLabels.map((label) => (
                    <p
                      key={label}
                      className="text-center text-xs font-semibold uppercase tracking-wide text-slate-500"
                    >
                      {label}
                    </p>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-2">
                  {days.map((day) => {
                    const key = format(day, "yyyy-MM-dd");
                    const items = blogsByDate[key] ?? [];
                    const isCurrentMonth = mode === "week" || day.getMonth() === cursorDate.getMonth();
                    const isToday = isSameDay(day, new Date());
                    const isCurrentWeek = isWithinInterval(day, currentWeekRange);
                    return (
                      <article
                        key={key}
                        className={`min-h-28 rounded-md border p-2 ${
                          isCurrentMonth
                            ? "border-slate-200 bg-white"
                            : "border-slate-100 bg-slate-50 text-slate-400"
                        } ${isCurrentWeek ? "bg-blue-50/40" : ""} ${
                          isToday ? "border-blue-500 shadow-sm" : ""
                        }`}
                      >
                        <p className="mb-2 text-sm font-semibold text-slate-700">{format(day, "d")}</p>
                        <div className="space-y-1">
                          {items.length === 0 ? (
                            <p className="text-xs text-slate-400">No blogs</p>
                          ) : (
                            items.map((blog) => (
                              <Link
                                key={blog.id}
                                href={`/blogs/${blog.id}`}
                                className="block rounded border border-slate-200 bg-slate-50 p-1 text-xs hover:bg-slate-100"
                              >
                                <p className="line-clamp-2 font-medium text-slate-700">{blog.title}</p>
                                <div className="mt-1">
                                  <StatusBadge status={blog.overall_status} />
                                </div>
                              </Link>
                            ))
                          )}
                        </div>
                      </article>
                    );
                  })}
                </div>
              </section>

              <section className="space-y-2">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                  No Publish Date
                </h3>
                {noPublishDateBlogs.length === 0 ? (
                  <p className="rounded-md border border-slate-200 bg-slate-50 px-3 py-4 text-sm text-slate-500">
                    All blogs have a target publish date.
                  </p>
                ) : (
                  <>
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
                            <StatusBadge status={blog.overall_status} />
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
        </div>
      </AppShell>
    </ProtectedPage>
  );
}
