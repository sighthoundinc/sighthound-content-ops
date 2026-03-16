"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { format, parseISO } from "date-fns";

import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/button";
import { DataTable, type DataTableColumn } from "@/components/data-table";
import { PublisherStatusBadge, WriterStatusBadge } from "@/components/status-badge";
import {
  DataPageEmptyState,
  DataPageFilterPills,
  DataPageHeader,
  DataPageToolbar,
} from "@/components/data-page";
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
import { createUiPermissionContract } from "@/lib/permissions/uiPermissions";
import { getSiteBadgeClasses, getSiteLabel } from "@/lib/site";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import { getTablePageCount, getTablePageRows } from "@/lib/table";
import type {
  BlogRecord,
  BlogSite,
  PublisherStageStatus,
  WriterStageStatus,
} from "@/lib/types";
import { formatDisplayDate, toTitleCase } from "@/lib/utils";
import { useAuth } from "@/providers/auth-provider";
import { useSystemFeedback } from "@/providers/system-feedback-provider";

type TaskKind = "writer" | "publisher";

type TaskItem = {
  id: string;
  blogId: string;
  site: BlogSite;
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
type TaskTableColumnKey =
  | "site"
  | "task"
  | "writer_status"
  | "publisher_status"
  | "publish_date"
  | "options";
type RowDensity = "compact" | "comfortable";
const TASK_TABLE_COLUMN_VIEW_STORAGE_KEY = "tasks-column-view:v1";
const TASK_TABLE_ROW_DENSITY_STORAGE_KEY = "tasks-row-density:v1";
const DEFAULT_TASK_TABLE_COLUMN_ORDER: TaskTableColumnKey[] = [
  "site",
  "task",
  "writer_status",
  "publisher_status",
  "publish_date",
  "options",
];
const DEFAULT_TASK_TABLE_HIDDEN_COLUMNS: TaskTableColumnKey[] = [];
const TASK_TABLE_COLUMN_LABELS: Record<TaskTableColumnKey, string> = {
  site: "Site",
  task: "Task",
  writer_status: "Writer Status",
  publisher_status: "Publisher Status",
  publish_date: "Publish Date",
  options: "Options",
};
const isTaskTableColumnKey = (value: string): value is TaskTableColumnKey =>
  value in TASK_TABLE_COLUMN_LABELS;

const normalizeTaskColumnOrder = (value: unknown): TaskTableColumnKey[] => {
  if (!Array.isArray(value)) {
    return DEFAULT_TASK_TABLE_COLUMN_ORDER;
  }
  const seen = new Set<TaskTableColumnKey>();
  const normalized: TaskTableColumnKey[] = [];
  for (const item of value) {
    if (typeof item !== "string" || !isTaskTableColumnKey(item) || seen.has(item)) {
      continue;
    }
    seen.add(item);
    normalized.push(item);
  }
  for (const defaultColumn of DEFAULT_TASK_TABLE_COLUMN_ORDER) {
    if (!seen.has(defaultColumn)) {
      normalized.push(defaultColumn);
    }
  }
  return normalized;
};

const normalizeTaskHiddenColumns = (value: unknown): TaskTableColumnKey[] => {
  if (!Array.isArray(value)) {
    return DEFAULT_TASK_TABLE_HIDDEN_COLUMNS;
  }
  const hiddenColumns: TaskTableColumnKey[] = [];
  const seen = new Set<TaskTableColumnKey>();
  for (const item of value) {
    if (typeof item !== "string" || !isTaskTableColumnKey(item) || seen.has(item)) {
      continue;
    }
    hiddenColumns.push(item);
    seen.add(item);
  }
  return hiddenColumns;
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
}: {
  isDelayed: boolean;
  statusPriority: number;
}) {
  if (isDelayed) {
    return "⚠ Overdue";
  }
  if (statusPriority === 2) {
    return "Upcoming";
  }
  return "Due Soon";
}

export default function MyTasksPage() {
  const { user, hasPermission } = useAuth();
  const { showSaving, showSuccess, showError, updateStatus } = useSystemFeedback();
  const permissionContract = useMemo(
    () => createUiPermissionContract(hasPermission),
    [hasPermission]
  );
  const canExportCsv = permissionContract.canExportCsv;
  const [blogs, setBlogs] = useState<BlogRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [todayDateKey] = useState(() => format(new Date(), "yyyy-MM-dd"));
  const [currentPage, setCurrentPage] = useState(1);
  const [highlightedTaskId, setHighlightedTaskId] = useState<string | null>(null);
  const [savingTaskId, setSavingTaskId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [kindFilter, setKindFilter] = useState<TaskKind | "all">("all");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "in_progress" | "not_started" | "needs_revision"
  >("all");
  const [siteFilter, setSiteFilter] = useState<"all" | "sighthound.com" | "redactor.com">("all");
  const [taskSortField, setTaskSortField] = useState<string>("publish_date");
  const [taskSortDirection, setTaskSortDirection] = useState<"asc" | "desc">("asc");
  const [rowDensity, setRowDensity] = useState<RowDensity>("comfortable");
  const [copiedCell, setCopiedCell] = useState<{
    taskId: string;
    field: "title" | "url";
  } | null>(null);
  const [columnOrder, setColumnOrder] = useState<TaskTableColumnKey[]>(
    DEFAULT_TASK_TABLE_COLUMN_ORDER
  );
  const [hiddenColumns, setHiddenColumns] = useState<TaskTableColumnKey[]>(
    DEFAULT_TASK_TABLE_HIDDEN_COLUMNS
  );
  const taskRowRefs = useRef<Record<string, HTMLTableRowElement | null>>({});
  const loadTasks = useCallback(async () => {
    if (!user?.id) {
      return;
    }
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

    setBlogs(normalizeBlogRows((data ?? []) as Array<Record<string, unknown>>) as BlogRecord[]);
    setIsLoading(false);
  }, [user?.id]);

  useEffect(() => {

    void loadTasks();
  }, [loadTasks]);


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
    if (!error) {
      return;
    }
    showError(error);
  }, [error, showError]);

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

  useEffect(() => {
    if (!copiedCell) {
      return;
    }
    const timeout = window.setTimeout(() => {
      setCopiedCell(null);
    }, 1000);
    return () => {
      window.clearTimeout(timeout);
    };
  }, [copiedCell]);
  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const stored = window.localStorage.getItem(TASK_TABLE_COLUMN_VIEW_STORAGE_KEY);
    if (!stored) {
      return;
    }
    try {
      const parsed = JSON.parse(stored) as {
        order?: unknown;
        hidden?: unknown;
      };
      setColumnOrder(normalizeTaskColumnOrder(parsed.order));
      setHiddenColumns(normalizeTaskHiddenColumns(parsed.hidden));
    } catch {
      setColumnOrder(DEFAULT_TASK_TABLE_COLUMN_ORDER);
      setHiddenColumns(DEFAULT_TASK_TABLE_HIDDEN_COLUMNS);
    }
  }, []);
  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    window.localStorage.setItem(
      TASK_TABLE_COLUMN_VIEW_STORAGE_KEY,
      JSON.stringify({ order: columnOrder, hidden: hiddenColumns })
    );
  }, [columnOrder, hiddenColumns]);
  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const storedDensity = window.localStorage.getItem(TASK_TABLE_ROW_DENSITY_STORAGE_KEY);
    if (storedDensity === "compact" || storedDensity === "comfortable") {
      setRowDensity(storedDensity);
    }
  }, []);
  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    window.localStorage.setItem(TASK_TABLE_ROW_DENSITY_STORAGE_KEY, rowDensity);
  }, [rowDensity]);

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
          site: blog.site,
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
          site: blog.site,
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

  const filteredTaskItems = useMemo(() => {
    const normalizedSearch = searchQuery.trim().toLowerCase();
    return taskItems.filter((task) => {
      if (kindFilter !== "all" && task.kind !== kindFilter) {
        return false;
      }
      if (statusFilter !== "all" && task.statusValue !== statusFilter) {
        return false;
      }
      if (siteFilter !== "all" && task.site !== siteFilter) {
        return false;
      }
      if (!normalizedSearch) {
        return true;
      }
      const searchText = `${task.title} ${task.liveUrl ?? ""}`.toLowerCase();
      return searchText.includes(normalizedSearch);
    });
  }, [kindFilter, searchQuery, siteFilter, statusFilter, taskItems]);

  const sortedTaskItems = useMemo(() => {
    const sorted = [...filteredTaskItems];
    sorted.sort((a, b) => {
      let comparison = 0;
      switch (taskSortField) {
        case "site":
          comparison = a.site.localeCompare(b.site);
          break;
        case "task":
          comparison = a.title.localeCompare(b.title);
          break;
        case "writer_status":
          comparison = String(a.statusPriority).localeCompare(String(b.statusPriority));
          break;
        case "publisher_status":
          comparison = String(a.statusPriority).localeCompare(String(b.statusPriority));
          break;
        case "publish_date":
        default:
          comparison = comparePublishDatesAsc(a.scheduledDate, b.scheduledDate);
      }
      return taskSortDirection === "asc" ? comparison : -comparison;
    });
    return sorted;
  }, [filteredTaskItems, taskSortField, taskSortDirection]);

  const nextTasks = useMemo(() => sortedTaskItems.slice(0, 3), [sortedTaskItems]);

  const pageCount = useMemo(
    () => getTablePageCount(sortedTaskItems.length, FULL_LIST_PAGE_SIZE),
    [sortedTaskItems.length]
  );
  const pagedTasks = useMemo(
    () => getTablePageRows(sortedTaskItems, currentPage, FULL_LIST_PAGE_SIZE),
    [currentPage, sortedTaskItems]
  );
  const hiddenColumnSet = useMemo(() => new Set(hiddenColumns), [hiddenColumns]);
  const visibleColumnOrder = useMemo(
    () => {
      const visibleColumns = columnOrder.filter((column) => !hiddenColumnSet.has(column));
      return visibleColumns.length > 0 ? visibleColumns : [DEFAULT_TASK_TABLE_COLUMN_ORDER[0]];
    },
    [columnOrder, hiddenColumnSet]
  );

  const toggleColumnVisibility = (column: TaskTableColumnKey) => {
    setHiddenColumns((previous) => {
      if (previous.includes(column)) {
        return previous.filter((hiddenColumn) => hiddenColumn !== column);
      }
      const currentlyVisibleColumns = columnOrder.filter(
        (columnKey) => !previous.includes(columnKey)
      );
      if (currentlyVisibleColumns.length <= 1) {
        return previous;
      }
      return [...previous, column];
    });
  };
  const resetColumnVisibility = () => {
    setColumnOrder(DEFAULT_TASK_TABLE_COLUMN_ORDER);
    setHiddenColumns(DEFAULT_TASK_TABLE_HIDDEN_COLUMNS);
  };
  const getTaskExportCellValue = (task: TaskItem, column: TaskTableColumnKey) => {
    if (column === "site") {
      return getSiteLabel(task.site);
    }
    if (column === "task") {
      return task.title;
    }
    if (column === "writer_status") {
      return toTitleCase(task.writerStatus);
    }
    if (column === "publisher_status") {
      return toTitleCase(task.publisherStatus);
    }
    if (column === "publish_date") {
      return formatDisplayDate(task.scheduledDate) || "Not scheduled";
    }
    return "View options";
  };
  const escapeCsvValue = (value: string) => `"${value.replaceAll("\"", "\"\"")}"`;
  const exportTaskCsv = () => {
    if (!canExportCsv) {
      showError("You do not have permission to export tasks.");
      return;
    }
    if (filteredTaskItems.length === 0) {
      showError("No tasks to export.");
      return;
    }
    const exportableColumns = visibleColumnOrder.filter((column) => column !== "options");
    if (exportableColumns.length === 0) {
      showError("Select at least one data column before exporting.");
      return;
    }
    const headerRow = exportableColumns
      .map((column) => escapeCsvValue(TASK_TABLE_COLUMN_LABELS[column]))
      .join(",");
    const dataRows = filteredTaskItems.map((task) =>
      exportableColumns
        .map((column) => escapeCsvValue(getTaskExportCellValue(task, column)))
        .join(",")
    );
    const csvContent = `\uFEFF${[headerRow, ...dataRows].join("\n")}`;
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const downloadUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = downloadUrl;
    link.download = `my-tasks-${format(new Date(), "yyyyMMdd-HHmm")}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(downloadUrl);
    showSuccess("Task export complete.");
  };

  useEffect(() => {
    setCurrentPage((previous) => Math.min(previous, pageCount));
  }, [pageCount]);

  const focusTaskRow = (taskId: string) => {
    const taskIndex = filteredTaskItems.findIndex((task) => task.id === taskId);
    if (taskIndex >= 0) {
      setCurrentPage(Math.floor(taskIndex / FULL_LIST_PAGE_SIZE) + 1);
    }
    setHighlightedTaskId(taskId);
  };
  const activeFilterPills = useMemo(
    () =>
      [
        searchQuery.trim().length > 0
          ? {
              id: "search",
              label: `Search: ${searchQuery.trim()}`,
              onRemove: () => {
                setSearchQuery("");
              },
            }
          : null,
        kindFilter !== "all"
          ? {
              id: "kind",
              label: `Task Type: ${toTitleCase(kindFilter)}`,
              onRemove: () => {
                setKindFilter("all");
              },
            }
          : null,
        statusFilter !== "all"
          ? {
              id: "status",
              label: `Status: ${toTitleCase(statusFilter)}`,
              onRemove: () => {
                setStatusFilter("all");
              },
            }
          : null,
        siteFilter !== "all"
          ? {
              id: "site",
              label: `Site: ${getSiteLabel(siteFilter)}`,
              onRemove: () => {
                setSiteFilter("all");
              },
            }
          : null,
      ].filter((pill) => pill !== null),
    [kindFilter, searchQuery, siteFilter, statusFilter]
  );


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

  const taskTableColumns: DataTableColumn<TaskItem>[] = [
    {
      id: "site",
      label: "Site",
      sortable: true,
      render: (task) => (
        <span
          className={`inline-flex items-center justify-center rounded-full border px-2 py-0.5 text-xs font-medium ${
            getSiteBadgeClasses(task.site)
          }`}
        >
          {getSiteLabel(task.site)}
        </span>
      ),
    },
    {
      id: "task",
      label: "Task",
      sortable: true,
      render: (task) => (
        <div>
          <Link
            href={`/blogs/${task.blogId}`}
            title={task.title}
            className="interactive-link block max-w-[28rem] truncate font-medium text-slate-800"
          >
            {task.title}
          </Link>
          <p className="mt-1 text-xs text-slate-500">
            {task.kind === "writer" ? "Writer task" : "Publisher task"}
            {task.isDelayed ? " · ⚠ Overdue" : ""}
          </p>
        </div>
      ),
    },
    {
      id: "writer_status",
      label: "Writer Status",
      sortable: true,
      render: (task) =>
        task.kind === "writer" ? (
          <select
            value={task.writerStatus}
            disabled={savingTaskId === task.id}
            onChange={(event) => {
              void updateTaskStatus(
                task,
                event.target.value as WriterStageStatus
              );
            }}
            className="focus-field rounded-md border border-slate-300 px-2 py-1 text-xs disabled:cursor-not-allowed disabled:bg-slate-100"
          >
            {WRITER_STATUSES.map((status) => (
              <option key={status} value={status}>
                {toTitleCase(status)}
              </option>
            ))}
          </select>
        ) : (
          <WriterStatusBadge status={task.writerStatus} />
        ),
    },
    {
      id: "publisher_status",
      label: "Publisher Status",
      sortable: true,
      render: (task) =>
        task.kind === "publisher" ? (
          <select
            value={task.publisherStatus}
            disabled={savingTaskId === task.id}
            onChange={(event) => {
              void updateTaskStatus(
                task,
                event.target.value as PublisherStageStatus
              );
            }}
            className="focus-field rounded-md border border-slate-300 px-2 py-1 text-xs disabled:cursor-not-allowed disabled:bg-slate-100"
          >
            {PUBLISHER_STATUSES.map((status) => (
              <option key={status} value={status}>
                {toTitleCase(status)}
              </option>
            ))}
          </select>
        ) : (
          <PublisherStatusBadge status={task.publisherStatus} />
        ),
    },
    {
      id: "publish_date",
      label: "Publish Date",
      sortable: true,
      render: (task) => formatDisplayDate(task.scheduledDate) || "Not scheduled",
    },
  ];

  return (
    <ProtectedPage>
      <AppShell>
        <div className="space-y-6">
          <DataPageHeader
            title="Tasks"
            description="Prioritized writing and publishing assignments, sorted by urgency."
          />
          <DataPageToolbar
            searchValue={searchQuery}
            onSearchChange={(value) => {
              setSearchQuery(value);
              setCurrentPage(1);
            }}
            searchPlaceholder="Search task title or URL"
            actions={
              <>
                <details className="relative">
                  <summary className="cursor-pointer list-none rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-100">
                    Edit Columns
                  </summary>
                  <div className="absolute right-0 z-20 mt-1 w-64 rounded-md border border-slate-200 bg-white p-2 shadow-md">
                    <div className="flex items-center justify-between">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                        Show Columns
                      </p>
                      <button
                        type="button"
                        className="pressable rounded border border-slate-300 bg-white px-2 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-100"
                        onClick={() => {
                          resetColumnVisibility();
                        }}
                      >
                        Reset
                      </button>
                    </div>
                    <div className="mt-2 space-y-1">
                      {columnOrder.map((column) => (
                        <label
                          key={column}
                          className="inline-flex w-full items-center justify-between gap-2 rounded px-1 py-1 text-xs text-slate-700 hover:bg-slate-50"
                        >
                          <span>{TASK_TABLE_COLUMN_LABELS[column]}</span>
                          <input
                            type="checkbox"
                            checked={!hiddenColumnSet.has(column)}
                            disabled={
                              !hiddenColumnSet.has(column) &&
                              visibleColumnOrder.length <= 1
                            }
                            onChange={() => {
                              toggleColumnVisibility(column);
                            }}
                          />
                        </label>
                      ))}
                    </div>
                  </div>
                </details>
                <div className="inline-flex overflow-hidden rounded-md border border-slate-300 bg-white">
                  <button
                    type="button"
                    className={`px-2.5 py-1.5 text-xs font-medium ${
                      rowDensity === "compact"
                        ? "bg-slate-900 text-white"
                        : "text-slate-700 hover:bg-slate-100"
                    }`}
                    onClick={() => {
                      setRowDensity("compact");
                    }}
                  >
                    Compact
                  </button>
                  <button
                    type="button"
                    className={`border-l border-slate-300 px-2.5 py-1.5 text-xs font-medium ${
                      rowDensity === "comfortable"
                        ? "bg-slate-900 text-white"
                        : "text-slate-700 hover:bg-slate-100"
                    }`}
                    onClick={() => {
                      setRowDensity("comfortable");
                    }}
                  >
                    Comfortable
                  </button>
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  disabled={!canExportCsv || filteredTaskItems.length === 0}
                  onClick={exportTaskCsv}
                >
                  Export
                </Button>
              </>
            }
            filters={
              <>
                <select
                  aria-label="Task Status"
                  value={statusFilter}
                  onChange={(event) => {
                    setStatusFilter(
                      event.target.value as "all" | "in_progress" | "not_started" | "needs_revision"
                    );
                    setCurrentPage(1);
                  }}
                  className="focus-field w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700"
                >
                  <option value="all">All Statuses</option>
                  <option value="in_progress">In Progress</option>
                  <option value="not_started">Not Started</option>
                  <option value="needs_revision">Needs Revision</option>
                </select>
                <select
                  aria-label="Task Type"
                  value={kindFilter}
                  onChange={(event) => {
                    setKindFilter(event.target.value as TaskKind | "all");
                    setCurrentPage(1);
                  }}
                  className="focus-field w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700"
                >
                  <option value="all">All Task Types</option>
                  <option value="writer">Writer</option>
                  <option value="publisher">Publisher</option>
                </select>
                <select
                  aria-label="Task Site"
                  value={siteFilter}
                  onChange={(event) => {
                    setSiteFilter(event.target.value as "all" | "sighthound.com" | "redactor.com");
                    setCurrentPage(1);
                  }}
                  className="focus-field w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700"
                >
                  <option value="all">All Sites</option>
                  <option value="sighthound.com">Sighthound</option>
                  <option value="redactor.com">Redactor</option>
                </select>
              </>
            }
          />
          <DataPageFilterPills pills={activeFilterPills} />


          {isLoading ? (
            <>
              <section className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
                <div className="skeleton h-4 w-24" />
                <div className="space-y-2">
                  <div className="skeleton h-12 w-full" />
                  <div className="skeleton h-12 w-full" />
                  <div className="skeleton h-12 w-full" />
                </div>
              </section>
              <section className="space-y-3 rounded-lg border border-slate-200 p-4">
                <div className="space-y-2">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="skeleton h-12 w-full" />
                  ))}
                </div>
              </section>
            </>
          ) : (
            <>
              <section className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-600">
                  Next Tasks
                </h3>
                {nextTasks.length === 0 ? (
                  <DataPageEmptyState
                    title="No tasks found."
                    description="No tasks match your current filters."
                  />
                ) : (
                  <ol className="space-y-2">
                    {nextTasks.map((task, index) => (
                      <li key={task.id}>
                        <button
                          type="button"
                          onClick={() => {
                            focusTaskRow(task.id);
                          }}
                          className="pressable w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-left hover:bg-slate-100"
                        >
                          <p className="font-medium text-slate-900">
                            {index + 1}. {task.title}
                          </p>
                          <p className="mt-1 text-xs text-slate-600">
                            Status: {task.kind === "writer" ? "Writing" : "Publishing"} ·{" "}
                            {task.statusLabel}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            Publish Date: {formatDisplayDate(task.scheduledDate) || "Not scheduled"}
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
                <DataTable
                  data={pagedTasks}
                  columns={taskTableColumns}
                  sortField={taskSortField}
                  sortDirection={taskSortDirection}
                  onSort={(field, direction) => {
                    setTaskSortField(field);
                    setTaskSortDirection(direction);
                  }}
                  onRowClick={(task) => {
                    focusTaskRow(task.id);
                  }}
                  activeIndex={pagedTasks.findIndex(
                    (t) => t.id === highlightedTaskId
                  )}
                  density="comfortable"
                  emptyMessage="You have no assigned tasks. You're all caught up."
                />
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                  <TableResultsSummary
                    totalRows={filteredTaskItems.length}
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

