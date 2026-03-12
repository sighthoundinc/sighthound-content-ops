"use client";

import { useEffect, useMemo, useState } from "react";
import { format, parseISO } from "date-fns";

import { AppShell } from "@/components/app-shell";
import { ProtectedPage } from "@/components/protected-page";
import {
  TablePaginationControls,
  TableResultsSummary,
} from "@/components/table-controls";
import {
  BLOG_SELECT_LEGACY,
  BLOG_SELECT_WITH_DATES,
  getBlogPublishDate,
  isMissingBlogDateColumnsError,
  normalizeBlogRows,
} from "@/lib/blog-schema";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import { getTablePageCount, getTablePageRows } from "@/lib/table";
import type { BlogRecord } from "@/lib/types";
import { formatDateInput, toTitleCase } from "@/lib/utils";
import { useAuth } from "@/providers/auth-provider";

type TaskKind = "writer" | "publisher";

type TaskItem = {
  id: string;
  blogId: string;
  title: string;
  kind: TaskKind;
  statusLabel: string;
  scheduledDate: string | null;
  isOverdue: boolean;
  isDueSoon: boolean;
  urgencyScore: number;
};

const FULL_LIST_PAGE_SIZE = 10;

function getStatusUrgency(kind: TaskKind, status: string) {
  if (kind === "writer") {
    if (status === "needs_revision") {
      return 3;
    }
    if (status === "in_progress") {
      return 2;
    }
    return 1;
  }

  if (status === "in_progress") {
    return 3;
  }
  return 1;
}

function getDateDifferenceInDays(dateKey: string, todayDateKey: string) {
  return Math.round(
    (parseISO(dateKey).getTime() - parseISO(todayDateKey).getTime()) /
      (24 * 60 * 60 * 1000)
  );
}

export default function MyTasksPage() {
  const { user } = useAuth();
  const [blogs, setBlogs] = useState<BlogRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [todayDateKey] = useState(() => format(new Date(), "yyyy-MM-dd"));
  const [showAllTasks, setShowAllTasks] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id) {
      return;
    }

    const loadTasks = async () => {
      const supabase = getSupabaseBrowserClient();
      setIsLoading(true);
      setError(null);
      let { data, error: tasksError } = await supabase
        .from("blogs")
        .select(BLOG_SELECT_WITH_DATES)
        .eq("is_archived", false)
        .or(`writer_id.eq.${user.id},publisher_id.eq.${user.id}`)
        .order("scheduled_publish_date", { ascending: true, nullsFirst: false })
        .order("updated_at", { ascending: false });

      if (isMissingBlogDateColumnsError(tasksError)) {
        const fallback = await supabase
          .from("blogs")
          .select(BLOG_SELECT_LEGACY)
          .eq("is_archived", false)
          .or(`writer_id.eq.${user.id},publisher_id.eq.${user.id}`)
          .order("target_publish_date", { ascending: true, nullsFirst: false })
          .order("updated_at", { ascending: false });
        data = fallback.data as typeof data;
        tasksError = fallback.error;
      }

      if (tasksError) {
        setError(tasksError.message);
        setIsLoading(false);
        return;
      }

      setBlogs(
        normalizeBlogRows((data ?? []) as Array<Record<string, unknown>>) as BlogRecord[]
      );
      setIsLoading(false);
    };

    void loadTasks();
  }, [user?.id]);

  const taskItems = useMemo(() => {
    if (!user?.id) {
      return [] as TaskItem[];
    }

    const items: TaskItem[] = [];
    for (const blog of blogs) {
      const scheduledDate = getBlogPublishDate(blog);
      const diffDays =
        scheduledDate !== null
          ? getDateDifferenceInDays(scheduledDate, todayDateKey)
          : null;
      const isOverdue = diffDays !== null && diffDays < 0;
      const isDueSoon = diffDays !== null && diffDays >= 0 && diffDays <= 3;

      if (blog.writer_id === user.id && blog.writer_status !== "completed") {
        items.push({
          id: `${blog.id}:writer`,
          blogId: blog.id,
          title: blog.title,
          kind: "writer",
          statusLabel: toTitleCase(blog.writer_status),
          scheduledDate,
          isOverdue,
          isDueSoon,
          urgencyScore: getStatusUrgency("writer", blog.writer_status),
        });
      }

      if (blog.publisher_id === user.id && blog.publisher_status !== "completed") {
        items.push({
          id: `${blog.id}:publisher`,
          blogId: blog.id,
          title: blog.title,
          kind: "publisher",
          statusLabel:
            blog.writer_status === "completed" && blog.publisher_status === "not_started"
              ? "Ready to publish"
              : toTitleCase(blog.publisher_status),
          scheduledDate,
          isOverdue,
          isDueSoon,
          urgencyScore: getStatusUrgency("publisher", blog.publisher_status),
        });
      }
    }

    return items.sort((left, right) => {
      if (left.isOverdue !== right.isOverdue) {
        return left.isOverdue ? -1 : 1;
      }

      if (left.scheduledDate && right.scheduledDate) {
        const dateCompare = left.scheduledDate.localeCompare(right.scheduledDate);
        if (dateCompare !== 0) {
          return dateCompare;
        }
      } else if (left.scheduledDate && !right.scheduledDate) {
        return -1;
      } else if (!left.scheduledDate && right.scheduledDate) {
        return 1;
      }

      if (left.urgencyScore !== right.urgencyScore) {
        return right.urgencyScore - left.urgencyScore;
      }

      return left.title.localeCompare(right.title);
    });
  }, [blogs, todayDateKey, user?.id]);

  const topTasks = useMemo(() => taskItems.slice(0, 3), [taskItems]);
  const pageCount = useMemo(
    () => getTablePageCount(taskItems.length, FULL_LIST_PAGE_SIZE),
    [taskItems.length]
  );
  const pagedTasks = useMemo(
    () => getTablePageRows(taskItems, currentPage, FULL_LIST_PAGE_SIZE),
    [currentPage, taskItems]
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [showAllTasks, taskItems.length]);

  useEffect(() => {
    setCurrentPage((previous) => Math.min(previous, pageCount));
  }, [pageCount]);

  const activeTask = useMemo(
    () => taskItems.find((task) => task.id === activeTaskId) ?? null,
    [activeTaskId, taskItems]
  );

  const renderTaskRow = (task: TaskItem) => (
    <button
      key={task.id}
      type="button"
      onClick={() => {
        setActiveTaskId(task.id);
      }}
      className="w-full rounded-md border border-slate-200 p-3 text-left transition hover:border-slate-300 hover:bg-slate-50"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <p className="font-medium text-slate-900">{task.title}</p>
        {task.isOverdue ? (
          <span className="inline-flex items-center justify-center rounded-full bg-rose-100 px-2.5 py-1 text-xs font-medium text-rose-700">
            ⚠ Overdue
          </span>
        ) : task.isDueSoon ? (
          <span className="inline-flex items-center justify-center rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-700">
            Soon
          </span>
        ) : null}
      </div>
      <p className="mt-1 text-sm text-slate-600">
        {task.kind === "writer" ? "Writer task" : "Publisher task"} · {task.statusLabel}
      </p>
      <p className="mt-1 text-xs text-slate-500">
        Scheduled: {formatDateInput(task.scheduledDate) || "Not scheduled"}
      </p>
    </button>
  );

  return (
    <ProtectedPage>
      <AppShell>
        <div className="space-y-6">
          <header>
            <h2 className="text-xl font-semibold text-slate-900">
              Tasks assigned to you as writer or publisher
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Your pending writing and publishing assignments.
            </p>
          </header>

          {isLoading ? (
            <p className="rounded-md border border-slate-200 bg-slate-50 px-4 py-5 text-sm text-slate-500">
              Loading tasks…
            </p>
          ) : error ? (
            <p className="rounded-md border border-rose-200 bg-rose-50 px-4 py-5 text-sm text-rose-700">
              {error}
            </p>
          ) : (
            <div className="space-y-4">
              <section className="space-y-2">
                {topTasks.length === 0 ? (
                  <p className="rounded-md border border-slate-200 bg-slate-50 px-3 py-4 text-sm text-slate-500">
                    No pending tasks.
                  </p>
                ) : (
                  <div className="space-y-2">{topTasks.map(renderTaskRow)}</div>
                )}
              </section>

              {taskItems.length > 3 ? (
                <div>
                  <button
                    type="button"
                    className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                    onClick={() => {
                      setShowAllTasks((previous) => !previous);
                    }}
                  >
                    {showAllTasks ? "Hide full task list" : "View all tasks"}
                  </button>
                </div>
              ) : null}

              {showAllTasks ? (
                <section className="space-y-3 rounded-lg border border-slate-200 p-4">
                  {pagedTasks.length === 0 ? (
                    <p className="text-sm text-slate-500">No tasks to display.</p>
                  ) : (
                    <div className="space-y-2">{pagedTasks.map(renderTaskRow)}</div>
                  )}
                  <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <span className="font-medium text-slate-700">Rows per page:</span>
                      <span className="rounded border border-slate-300 bg-white px-2 py-1 text-sm text-slate-700">
                        10
                      </span>
                    </div>
                    <TableResultsSummary
                      totalRows={taskItems.length}
                      currentPage={currentPage}
                      rowLimit={10}
                      noun="tasks"
                    />
                    <TablePaginationControls
                      currentPage={currentPage}
                      pageCount={pageCount}
                      onPageChange={setCurrentPage}
                    />
                  </div>
                </section>
              ) : null}
            </div>
          )}
        </div>

        {activeTask ? (
          <div className="fixed inset-0 z-40 flex">
            <button
              type="button"
              className="h-full w-full bg-slate-900/30"
              aria-label="Close task detail panel"
              onClick={() => {
                setActiveTaskId(null);
              }}
            />
            <aside className="h-full w-full max-w-md border-l border-slate-200 bg-white p-5 shadow-xl">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-base font-semibold text-slate-900">{activeTask.title}</h3>
                  <p className="mt-1 text-sm text-slate-600">
                    {activeTask.kind === "writer" ? "Writer task" : "Publisher task"} ·{" "}
                    {activeTask.statusLabel}
                  </p>
                </div>
                <button
                  type="button"
                  className="rounded-md border border-slate-300 px-2 py-1 text-sm text-slate-700 hover:bg-slate-50"
                  onClick={() => {
                    setActiveTaskId(null);
                  }}
                >
                  Close
                </button>
              </div>
              <div className="mt-4 space-y-2 rounded-md border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
                <p>
                  <span className="font-medium text-slate-900">Status:</span>{" "}
                  {activeTask.statusLabel}
                </p>
                <p>
                  <span className="font-medium text-slate-900">Scheduled:</span>{" "}
                  {formatDateInput(activeTask.scheduledDate) || "Not scheduled"}
                </p>
                {activeTask.isOverdue ? (
                  <p className="font-medium text-rose-700">⚠ Overdue</p>
                ) : activeTask.isDueSoon ? (
                  <p className="font-medium text-amber-700">Soon</p>
                ) : null}
              </div>
              <div className="mt-4">
                <a
                  href={`/blogs/${activeTask.blogId}`}
                  className="inline-flex rounded-md bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-700"
                >
                  Open full blog details
                </a>
              </div>
            </aside>
          </div>
        ) : null}
      </AppShell>
    </ProtectedPage>
  );
}
