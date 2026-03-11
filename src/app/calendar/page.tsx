"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  addMonths,
  addWeeks,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  startOfMonth,
  startOfWeek,
  subMonths,
  subWeeks,
} from "date-fns";

import { AppShell } from "@/components/app-shell";
import { ProtectedPage } from "@/components/protected-page";
import { StatusBadge } from "@/components/status-badge";
import {
  BLOG_SELECT_LEGACY,
  BLOG_SELECT_WITH_DATES,
  getBlogPublishDate,
  isMissingBlogDateColumnsError,
  normalizeBlogRows,
} from "@/lib/blog-schema";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import type { BlogRecord } from "@/lib/types";

type CalendarMode = "month" | "week";

export default function CalendarPage() {
  const [blogs, setBlogs] = useState<BlogRecord[]>([]);
  const [mode, setMode] = useState<CalendarMode>("month");
  const [cursorDate, setCursorDate] = useState(new Date());
  const [weekStart, setWeekStart] = useState(1);
  const [timezone, setTimezone] = useState("America/Chicago");
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

  const days = useMemo(
    () =>
      eachDayOfInterval({
        start: range.start,
        end: range.end,
      }),
    [range.end, range.start]
  );

  const blogsByDate = useMemo(() => {
    return blogs.reduce<Record<string, BlogRecord[]>>((acc, blog) => {
      const publishDate = getBlogPublishDate(blog);
      if (!publishDate) {
        return acc;
      }
      const key = publishDate;
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(blog);
      return acc;
    }, {});
  }, [blogs]);

  const noPublishDateBlogs = useMemo(
    () =>
      blogs.filter(
        (blog) =>
          !blog.scheduled_publish_date &&
          !blog.target_publish_date &&
          !blog.published_at
      ),
    [blogs]
  );

  return (
    <ProtectedPage>
      <AppShell>
        <div className="space-y-5">
          <header className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">Calendar</h2>
              <p className="text-sm text-slate-600">
                {timezone} timezone • week starts on{" "}
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][weekStart]}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                className="rounded-md border border-slate-300 px-3 py-2 text-sm"
                onClick={() => {
                  setCursorDate((prev) =>
                    mode === "month" ? subMonths(prev, 1) : subWeeks(prev, 1)
                  );
                }}
              >
                Previous
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
              <section className="grid grid-cols-7 gap-2">
                {days.map((day) => {
                  const key = format(day, "yyyy-MM-dd");
                  const items = blogsByDate[key] ?? [];
                  const isCurrentMonth = mode === "week" || day.getMonth() === cursorDate.getMonth();
                  return (
                    <article
                      key={key}
                      className={`min-h-28 rounded-md border p-2 ${
                        isCurrentMonth
                          ? "border-slate-200 bg-white"
                          : "border-slate-100 bg-slate-50 text-slate-400"
                      }`}
                    >
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wide">
                        {format(day, "EEE d")}
                      </p>
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
                              <p className="line-clamp-2 font-medium text-slate-700">
                                {blog.title}
                              </p>
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
                  <ul className="space-y-2">
                    {noPublishDateBlogs.map((blog) => (
                      <li
                        key={blog.id}
                        className="flex flex-wrap items-center justify-between rounded-md border border-slate-200 px-3 py-2"
                      >
                        <div>
                          <Link
                            href={`/blogs/${blog.id}`}
                            className="font-medium text-slate-900 hover:underline"
                          >
                            {blog.title}
                          </Link>
                          <p className="text-xs text-slate-500">{blog.site}</p>
                        </div>
                        <StatusBadge status={blog.overall_status} />
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </>
          )}
        </div>
      </AppShell>
    </ProtectedPage>
  );
}
