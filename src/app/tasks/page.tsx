"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
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
import { PUBLISHER_STATUSES, WRITER_STATUSES } from "@/lib/status";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import { getTablePageCount, getTablePageRows } from "@/lib/table";
import type { BlogRecord, PublisherStageStatus, WriterStageStatus } from "@/lib/types";
import { formatDateInput, toTitleCase } from "@/lib/utils";
import { useAuth } from "@/providers/auth-provider";
import { useSystemFeedback } from "@/providers/system-feedback-provider";

type TaskKind = "writer" | "publisher";

type TaskItem = {
  id: string;
  blogId: string;
  title: string;
  kind: TaskKind;
  createdAt: string;
  scheduledDate: string | null;
  isDelayed: boolean;
  statusLabel: string;
  statusValue: WriterStageStatus | PublisherStageStatus;
  statusPriority: number;
  liveUrl: string | null;
  writerStatus: WriterStageStatus;
  publisherStatus: PublisherStageStatus;
  reason: string | null;
};

const FULL_LIST_PAGE_SIZE = 10;

function getDateDifferenceInDays(dateKey: string, todayDateKey: string) {
  return Math.round(
    (parseISO(dateKey).getTime() - parseISO(todayDateKey).getTime()) /
      (24 * 60 * 60 * 1000)
  );
}

function getTaskStatusPriority(
  statusValue: WriterStageStatus | PublisherStageStatus,
  scheduledDate: string | null,
  todayDateKey: string
) {
  const isFutureScheduled = scheduledDate !== null && scheduledDate > todayDateKey;
  if (statusValue === "in_progress" || statusValue === "needs_revision") {
    return 0;
  }
  if (statusValue === "not_started" && !isFutureScheduled) {
    return 1;
  }
  if (statusValue === "not_started" && isFutureScheduled) {
    return 2;
  }
  return 3;
}

function comparePublishDatesAsc(leftDate: string | null, rightDate: string | null) {
  if (leftDate && rightDate) {
    return leftDate.localeCompare(rightDate);
  }
  if (leftDate && !rightDate) {
    return -1;
  }
  if (!leftDate && rightDate) {
    return 1;
  }
  return 0;
}

function getTaskReason({
  isDelayed,
  statusPriority,
  scheduledDate,
  todayDateKey,
}: {
  isDelayed: boolean;
  statusPriority: number;
  scheduledDate: string | null;
  todayDateKey: string;
}) {
  if (isDelayed) {
    return "Delayed";
  }
  if (statusPriority === 0) {
    return "In Progress";
  }
  if (scheduledDate && scheduledDate <= todayDateKey) {
    return "Closest publish date";
  }
  if (statusPriority === 1) {
    return "Newly assigned";
  }
  if (statusPriority === 2) {
    return "Future scheduled";
  }
  return null;
}

export default function MyTasksPage() {
  const { user } = useAuth();
  const { showSaving, showSuccess, showError, updateStatus } = useSystemFeedback();
  const [blogs, setBlogs] = useState<BlogRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [todayDateKey] = useState(() => format(new Date(), "yyyy-MM-dd"));
  const [currentPage, setCurrentPage] = useState(1);
  const [highlightedTaskId, setHighlightedTaskId] = useState<string | null>(null);
  const [savingTaskId, setSavingTaskId] = useState<string | null>(null);
  const taskRowRefs = useRef<Record<string, HTMLTableRowElement | null>>({});

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


  useEffect(() => {
    if (!highlightedTaskId) {
      return;
    }
    const timeout = window.setTimeout(() => {
      const row = taskRowRefs.current[highlightedTaskId];
      row?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 30);
    return () => {
      window.clearTimeout(timeout);
    };
  }, [highlightedTaskId, currentPage]);

  useEffect(() => {
    if (!highlightedTaskId) {
      return;
    }
    const timeout = window.setTimeout(() => {
      setHighlightedTaskId(null);
    }, 2000);
    return () => {
      window.clearTimeout(timeout);
    };
  }, [highlightedTaskId]);

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
      const isDelayed = diffDays !== null && diffDays < 0;

      if (blog.writer_id === user.id && blog.writer_status !== "completed") {
        const statusPriority = getTaskStatusPriority(
          blog.writer_status,
          scheduledDate,
          todayDateKey
        );
        items.push({
          id: `${blog.id}:writer`,
          blogId: blog.id,
          title: blog.title,
          kind: "writer",
          createdAt: blog.created_at,
          scheduledDate,
          isDelayed,
          statusLabel: toTitleCase(blog.writer_status),
          statusValue: blog.writer_status,
          statusPriority,
          liveUrl: blog.live_url,
          writerStatus: blog.writer_status,
          publisherStatus: blog.publisher_status,
          reason: getTaskReason({
            isDelayed,
            statusPriority,
            scheduledDate,
            todayDateKey,
          }),
        });
      }

      if (blog.publisher_id === user.id && blog.publisher_status !== "completed") {
        const statusPriority = getTaskStatusPriority(
          blog.publisher_status,
          scheduledDate,
          todayDateKey
        );
        items.push({
          id: `${blog.id}:publisher`,
          blogId: blog.id,
          title: blog.title,
          kind: "publisher",
          createdAt: blog.created_at,
          scheduledDate,
          isDelayed,
          statusLabel:
            blog.writer_status === "completed" && blog.publisher_status === "not_started"
              ? "Ready to publish"
              : toTitleCase(blog.publisher_status),
          statusValue: blog.publisher_status,
          statusPriority,
          liveUrl: blog.live_url,
          writerStatus: blog.writer_status,
          publisherStatus: blog.publisher_status,
          reason: getTaskReason({
            isDelayed,
            statusPriority,
            scheduledDate,
            todayDateKey,
          }),
        });
      }
    }

    return items.sort((left, right) => {
      if (left.isDelayed !== right.isDelayed) {
        return left.isDelayed ? -1 : 1;
      }

      const publishDateCompare = comparePublishDatesAsc(left.scheduledDate, right.scheduledDate);
      if (publishDateCompare !== 0) {
        return publishDateCompare;
      }

      if (left.statusPriority !== right.statusPriority) {
        return left.statusPriority - right.statusPriority;
      }

      const createdDateCompare = left.createdAt.localeCompare(right.createdAt);
      if (createdDateCompare !== 0) {
        return createdDateCompare;
      }

      return left.title.localeCompare(right.title);
    });
  }, [blogs, todayDateKey, user?.id]);

  const nextTasks = useMemo(() => taskItems.slice(0, 3), [taskItems]);

  const pageCount = useMemo(
    () => getTablePageCount(taskItems.length, FULL_LIST_PAGE_SIZE),
    [taskItems.length]
  );
  const pagedTasks = useMemo(
    () => getTablePageRows(taskItems, currentPage, FULL_LIST_PAGE_SIZE),
    [currentPage, taskItems]
  );

  useEffect(() => {
    setCurrentPage((previous) => Math.min(previous, pageCount));
  }, [pageCount]);

  const focusTaskRow = (taskId: string) => {
    const taskIndex = taskItems.findIndex((task) => task.id === taskId);
    if (taskIndex >= 0) {
      setCurrentPage(Math.floor(taskIndex / FULL_LIST_PAGE_SIZE) + 1);
    }
    setHighlightedTaskId(taskId);
  };

  const copyTaskValue = async (
    task: TaskItem,
    field: "title" | "url"
  ) => {
    const value = field === "title" ? task.title : task.liveUrl;
    if (!value) {
      showError("No publish URL available to copy.");
      return;
    }
    try {
      await navigator.clipboard.writeText(value);
      showSuccess("Copied to clipboard");
    } catch {
      showError("Could not copy to clipboard.");
    }
  };

  const updateTaskStatus = async (
    task: TaskItem,
    nextStatus: WriterStageStatus | PublisherStageStatus
  ) => {
    if (task.kind === "writer" && !WRITER_STATUSES.includes(nextStatus as WriterStageStatus)) {
      return;
    }
    if (
      task.kind === "publisher" &&
      !PUBLISHER_STATUSES.includes(nextStatus as PublisherStageStatus)
    ) {
      return;
    }

    const updates: Partial<BlogRecord> =
      task.kind === "writer"
        ? { writer_status: nextStatus as WriterStageStatus }
        : { publisher_status: nextStatus as PublisherStageStatus };

    const supabase = getSupabaseBrowserClient();
    const statusId = showSaving("Saving changes…");
    setSavingTaskId(task.id);

    let { data, error: updateError } = await supabase
      .from("blogs")
      .update(updates)
      .eq("id", task.blogId)
      .select(BLOG_SELECT_WITH_DATES)
      .single();

    if (isMissingBlogDateColumnsError(updateError)) {
      const fallback = await supabase
        .from("blogs")
        .update(updates)
        .eq("id", task.blogId)
        .select(BLOG_SELECT_LEGACY)
        .single();
      data = fallback.data as typeof data;
      updateError = fallback.error;
    }

    if (updateError) {
      updateStatus(statusId, {
        type: "error",
        message: "Failed to save changes.",
        actionLabel: "Retry",
        onAction: () => {
          void updateTaskStatus(task, nextStatus);
        },
      });
      setSavingTaskId(null);
      return;
    }

    setBlogs((previous) =>
      normalizeBlogRows(
        previous.map((blog) =>
          blog.id === task.blogId ? ({ ...blog, ...data } as Record<string, unknown>) : blog
        ) as Array<Record<string, unknown>>
      ) as BlogRecord[]
    );
    setSavingTaskId(null);

    const isPublishCompletion =
      task.kind === "publisher" && (nextStatus as PublisherStageStatus) === "completed";
    const notification = isPublishCompletion
      ? {
          icon: "✅",
          message: `Blog published: ${task.title}`,
          href: `/blogs/${task.blogId}`,
        }
      : task.kind === "publisher"
        ? {
            icon: "📝",
            message: `Publishing status updated: ${task.title}`,
            href: `/blogs/${task.blogId}`,
          }
        : {
            icon: "📝",
            message: `Writing status updated: ${task.title}`,
            href: `/blogs/${task.blogId}`,
          };
    updateStatus(statusId, {
      type: "success",
      message: "Status updated.",
      notification,
    });
  };

  return (
    <ProtectedPage>
      <AppShell>
        <div className="space-y-6">
          <header>
            <h2 className="text-xl font-semibold text-slate-900">My Tasks</h2>
            <p className="mt-1 text-sm text-slate-500">
              Prioritized writing and publishing assignments, sorted by urgency.
            </p>
          </header>

          {error ? (
            <p className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error}
            </p>
          ) : null}

          {isLoading ? (
            <p className="rounded-md border border-slate-200 bg-slate-50 px-4 py-5 text-sm text-slate-500">
              Loading tasks…
            </p>
          ) : (
            <>
              <section className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-600">
                  Next Tasks
                </h3>
                {nextTasks.length === 0 ? (
                  <p className="text-sm text-slate-500">No pending tasks.</p>
                ) : (
                  <ol className="space-y-2">
                    {nextTasks.map((task, index) => (
                      <li key={task.id}>
                        <button
                          type="button"
                          onClick={() => {
                            focusTaskRow(task.id);
                          }}
                          className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-left hover:bg-slate-100"
                        >
                          <p className="font-medium text-slate-900">
                            {index + 1}. {task.title}
                          </p>
                          <p className="mt-1 text-xs text-slate-600">
                            Status: {task.kind === "writer" ? "Writing" : "Publishing"} ·{" "}
                            {task.statusLabel}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            Publish Date: {formatDateInput(task.scheduledDate) || "Not scheduled"}
                          </p>
                          {task.reason ? (
                            <p className="mt-1 text-xs font-medium text-slate-700">
                              Reason: {task.reason}
                            </p>
                          ) : null}
                        </button>
                      </li>
                    ))}
                  </ol>
                )}
              </section>

              <section className="space-y-3 rounded-lg border border-slate-200 p-4">
                <div className="overflow-auto rounded-lg border border-slate-200">
                  <table className="min-w-full divide-y divide-slate-200 text-sm">
                    <thead className="sticky top-0 z-10 bg-slate-100 text-left text-xs uppercase tracking-wide text-slate-600">
                      <tr>
                        <th className="px-3 py-2">#</th>
                        <th className="px-3 py-2">Task</th>
                        <th className="px-3 py-2">Writer Status</th>
                        <th className="px-3 py-2">Publisher Status</th>
                        <th className="px-3 py-2">Publish Date</th>
                        <th className="px-3 py-2">Utilities</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {pagedTasks.length === 0 ? (
                        <tr>
                          <td className="px-3 py-5 text-center text-slate-500" colSpan={6}>
                            No tasks to display.
                          </td>
                        </tr>
                      ) : (
                        pagedTasks.map((task, index) => {
                          const globalIndex = (currentPage - 1) * FULL_LIST_PAGE_SIZE + index + 1;
                          const isSaving = savingTaskId === task.id;
                          const isHighlighted = highlightedTaskId === task.id;
                          return (
                            <tr
                              key={task.id}
                              ref={(node) => {
                                taskRowRefs.current[task.id] = node;
                              }}
                              className={`group ${
                                isHighlighted ? "bg-indigo-50" : "hover:bg-slate-50"
                              }`}
                            >
                              <td className="px-3 py-2 align-top text-slate-600">{globalIndex}</td>
                              <td className="px-3 py-2 align-top">
                                <Link
                                  href={`/blogs/${task.blogId}`}
                                  className="font-medium text-slate-900 hover:underline"
                                >
                                  {task.title}
                                </Link>
                                <p className="mt-1 text-xs text-slate-500">
                                  {task.kind === "writer" ? "Writer task" : "Publisher task"}
                                  {task.isDelayed ? " · Delayed" : ""}
                                </p>
                              </td>
                              <td className="px-3 py-2 align-top">
                                {task.kind === "writer" ? (
                                  <select
                                    value={task.writerStatus}
                                    disabled={isSaving}
                                    onChange={(event) => {
                                      void updateTaskStatus(
                                        task,
                                        event.target.value as WriterStageStatus
                                      );
                                    }}
                                    className="rounded-md border border-slate-300 px-2 py-1 text-xs disabled:cursor-not-allowed disabled:bg-slate-100"
                                  >
                                    {WRITER_STATUSES.map((status) => (
                                      <option key={status} value={status}>
                                        {toTitleCase(status)}
                                      </option>
                                    ))}
                                  </select>
                                ) : (
                                  <span className="text-xs text-slate-700">
                                    {toTitleCase(task.writerStatus)}
                                  </span>
                                )}
                              </td>
                              <td className="px-3 py-2 align-top">
                                {task.kind === "publisher" ? (
                                  <select
                                    value={task.publisherStatus}
                                    disabled={isSaving}
                                    onChange={(event) => {
                                      void updateTaskStatus(
                                        task,
                                        event.target.value as PublisherStageStatus
                                      );
                                    }}
                                    className="rounded-md border border-slate-300 px-2 py-1 text-xs disabled:cursor-not-allowed disabled:bg-slate-100"
                                  >
                                    {PUBLISHER_STATUSES.map((status) => (
                                      <option key={status} value={status}>
                                        {toTitleCase(status)}
                                      </option>
                                    ))}
                                  </select>
                                ) : (
                                  <span className="text-xs text-slate-700">
                                    {toTitleCase(task.publisherStatus)}
                                  </span>
                                )}
                              </td>
                              <td className="px-3 py-2 align-top text-slate-600">
                                {formatDateInput(task.scheduledDate) || "Not scheduled"}
                              </td>
                              <td className="px-3 py-2 align-top">
                                <div className="inline-flex items-center gap-1 opacity-0 transition group-hover:opacity-100">
                                  <button
                                    type="button"
                                    title="Copy title"
                                    className="rounded border border-slate-300 bg-white px-1.5 py-0.5 text-xs text-slate-700 hover:bg-slate-100"
                                    onClick={() => {
                                      void copyTaskValue(task, "title");
                                    }}
                                  >
                                    📋
                                  </button>
                                  <button
                                    type="button"
                                    title="Copy publish URL"
                                    className="rounded border border-slate-300 bg-white px-1.5 py-0.5 text-xs text-slate-700 hover:bg-slate-100"
                                    onClick={() => {
                                      void copyTaskValue(task, "url");
                                    }}
                                  >
                                    🔗
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                  <TableResultsSummary
                    totalRows={taskItems.length}
                    currentPage={currentPage}
                    rowLimit={FULL_LIST_PAGE_SIZE}
                    noun="tasks"
                  />
                  <TablePaginationControls
                    currentPage={currentPage}
                    pageCount={pageCount}
                    onPageChange={setCurrentPage}
                  />
                </div>
              </section>
            </>
          )}
        </div>
      </AppShell>
    </ProtectedPage>
  );
}

