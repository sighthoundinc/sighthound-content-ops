"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { format, parseISO } from "date-fns";

import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/button";
import { DataTable, type DataTableColumn } from "@/components/data-table";
import { PublisherStatusBadge, WriterStatusBadge } from "@/components/status-badge";
import {
  DATA_PAGE_CONTROL_ACTION_BUTTON_CLASS,
  DATA_PAGE_CONTROL_ACTIONS_CLASS,
  DATA_PAGE_CONTROL_ROW_CLASS,
  DATA_PAGE_CONTROL_STRIP_CLASS,
  DATA_PAGE_STACK_CLASS,
  DATA_PAGE_TABLE_SECTION_CLASS,
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
import { PUBLISHER_STATUSES, PUBLISHER_STATUS_LABELS, WRITER_STATUSES, WRITER_STATUS_LABELS } from "@/lib/status";
import { createUiPermissionContract } from "@/lib/permissions/uiPermissions";
import {
  SEGMENTED_CONTROL_CLASS,
  segmentedControlItemClass,
} from "@/lib/segmented-control";
import { getSiteBadgeClasses, getSiteShortLabel } from "@/lib/site";
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
  // Assignment metadata for admin review tasks
  assignmentInfo?: {
    isAdminAssignment: boolean;
    taskType: 'writer_review' | 'publisher_review';
    assignmentDate: string;
  };
};
type TaskTableColumnKey =
  | "site"
  | "task"
  | "writer_status"
  | "publisher_status"
  | "publish_date"
  | "options";
const TASK_TABLE_COLUMN_VIEW_STORAGE_KEY = "tasks-column-view:v1";
const TASK_TABLE_SORT_FIELDS = [
  "site",
  "task",
  "writer_status",
  "publisher_status",
  "publish_date",
] as const;
const isTaskTableSortField = (value: unknown): value is (typeof TASK_TABLE_SORT_FIELDS)[number] =>
  typeof value === "string" &&
  TASK_TABLE_SORT_FIELDS.includes(value as (typeof TASK_TABLE_SORT_FIELDS)[number]);
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
  if (statusValue === "pending_review" || statusValue === "publisher_approved") {
    return 3;
  }
  return 4;
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
  const canRunDataImport = hasPermission("run_data_import");
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
    "all" | WriterStageStatus | PublisherStageStatus
  >("all");
  const [siteFilter, setSiteFilter] = useState<"all" | "sighthound.com" | "redactor.com">("all");
  const [taskSortField, setTaskSortField] = useState<string>("publish_date");
  const [taskSortDirection, setTaskSortDirection] = useState<"asc" | "desc">("asc");
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
  const [rowDensity, setRowDensity] = useState<"compact" | "comfortable">("compact");
  const [assignmentFilter, setAssignmentFilter] = useState<"all" | "personal" | "admin">("all");
  const [taskAssignments, setTaskAssignments] = useState<Map<string, { taskType: 'writer_review' | 'publisher_review'; assignedAt: string }>>(new Map());
  const taskRowRefs = useRef<Record<string, HTMLTableRowElement | null>>({});
  const loadTasks = useCallback(async () => {
    if (!user?.id) {
      return;
    }
    const supabase = getSupabaseBrowserClient();
    setIsLoading(true);
    setError(null);

    // Fetch pending task assignments for current user
    const { data: assignments, error: assignmentError } = await supabase
      .from("task_assignments")
      .select("blog_id, task_type, assigned_at")
      .eq("assigned_to_user_id", user.id)
      .eq("status", "pending");

    const assignmentMap = new Map<string, { taskType: 'writer_review' | 'publisher_review'; assignedAt: string }>();
    const assignedBlogIds: string[] = [];
    
    // If task_assignments table doesn't exist yet (schema cache delay), continue without assignments
    if (assignmentError && !assignmentError.message.includes('task_assignments')) {
      setError(assignmentError.message);
      setIsLoading(false);
      return;
    }

    if (assignments && assignments.length > 0) {
      for (const assignment of assignments) {
        if (typeof assignment.blog_id === 'string' && typeof assignment.task_type === 'string' && typeof assignment.assigned_at === 'string') {
          assignmentMap.set(assignment.blog_id, {
            taskType: assignment.task_type as 'writer_review' | 'publisher_review',
            assignedAt: assignment.assigned_at
          });
          assignedBlogIds.push(assignment.blog_id);
        }
      }
    }
    setTaskAssignments(assignmentMap);

    // Build query to fetch personal tasks + assigned tasks
    let query = supabase
      .from("blogs")
      .select(BLOG_SELECT_WITH_DATES)
      .eq("is_archived", false);

    if (assignedBlogIds.length > 0) {
      query = query.or(`writer_id.eq.${user.id},publisher_id.eq.${user.id},id.in.(${assignedBlogIds.join(',')})`)
    } else {
      query = query.or(`writer_id.eq.${user.id},publisher_id.eq.${user.id}`);
    }

    let { data, error: tasksError } = await query
      .order("scheduled_publish_date", { ascending: true, nullsFirst: false })
      .order("updated_at", { ascending: false });

    if (isMissingBlogDateColumnsError(tasksError)) {
      let fallbackQuery = supabase
        .from("blogs")
        .select(BLOG_SELECT_LEGACY)
        .eq("is_archived", false);

      if (assignedBlogIds.length > 0) {
        fallbackQuery = fallbackQuery.or(`writer_id.eq.${user.id},publisher_id.eq.${user.id},id.in.(${assignedBlogIds.join(',')})`);
      } else {
        fallbackQuery = fallbackQuery.or(`writer_id.eq.${user.id},publisher_id.eq.${user.id}`);
      }

      const fallback = await fallbackQuery
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
        sortField?: unknown;
        sortDirection?: unknown;
        density?: unknown;
      };
      setColumnOrder(normalizeTaskColumnOrder(parsed.order));
      setHiddenColumns(normalizeTaskHiddenColumns(parsed.hidden));
      if (isTaskTableSortField(parsed.sortField)) {
        setTaskSortField(parsed.sortField);
      }
      if (parsed.sortDirection === "asc" || parsed.sortDirection === "desc") {
        setTaskSortDirection(parsed.sortDirection);
      }
      if (parsed.density === "compact" || parsed.density === "comfortable") {
        setRowDensity(parsed.density);
      }
    } catch {
      setColumnOrder(DEFAULT_TASK_TABLE_COLUMN_ORDER);
      setHiddenColumns(DEFAULT_TASK_TABLE_HIDDEN_COLUMNS);
      setTaskSortField("publish_date");
      setTaskSortDirection("asc");
      setRowDensity("compact");
    }
  }, []);
  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    window.localStorage.setItem(
      TASK_TABLE_COLUMN_VIEW_STORAGE_KEY,
      JSON.stringify({
        order: columnOrder,
        hidden: hiddenColumns,
        sortField: taskSortField,
        sortDirection: taskSortDirection,
        density: rowDensity,
      })
    );
  }, [columnOrder, hiddenColumns, rowDensity, taskSortDirection, taskSortField]);

  const taskItems = useMemo(() => {
    if (!user?.id) {
      return [] as TaskItem[];
    }

    const items: TaskItem[] = [];
    const processedBlogIds = new Set<string>();

    for (const blog of blogs) {
      const scheduledDate = getBlogPublishDate(blog);
      const diffDays =
        scheduledDate !== null
          ? getDateDifferenceInDays(scheduledDate, todayDateKey)
          : null;
      const isDelayed = diffDays !== null && diffDays < 0;
      const assignment = taskAssignments.get(blog.id);
      const isAdminAssignment = assignment !== undefined;

      // Personal writer task
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
          statusLabel: WRITER_STATUS_LABELS[blog.writer_status],
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
        processedBlogIds.add(blog.id);
      }

      // Personal publisher task
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
              : PUBLISHER_STATUS_LABELS[blog.publisher_status],
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
        processedBlogIds.add(blog.id);
      }

      // Admin-assigned task (if not already added as personal task)
      if (isAdminAssignment && !processedBlogIds.has(blog.id)) {
        const taskKind: TaskKind = assignment.taskType === 'writer_review' ? 'writer' : 'publisher';
        const blogStatus = taskKind === 'writer' ? blog.writer_status : blog.publisher_status;
        const statusPriority = getTaskStatusPriority(
          blogStatus,
          scheduledDate,
          todayDateKey
        );
        items.push({
          id: `${blog.id}:${taskKind}:admin`,
          blogId: blog.id,
          site: blog.site,
          title: blog.title,
          kind: taskKind,
          createdAt: blog.created_at,
          scheduledDate,
          isDelayed,
          statusLabel: taskKind === 'writer' ? WRITER_STATUS_LABELS[blog.writer_status] : PUBLISHER_STATUS_LABELS[blog.publisher_status],
          statusValue: blogStatus,
          statusPriority,
          liveUrl: blog.live_url,
          writerStatus: blog.writer_status,
          publisherStatus: blog.publisher_status,
          reason: getTaskReason({
            isDelayed,
            statusPriority,
          }),
          assignmentInfo: {
            isAdminAssignment: true,
            taskType: assignment.taskType,
            assignmentDate: assignment.assignedAt,
          },
        });
        processedBlogIds.add(blog.id);
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
  }, [blogs, todayDateKey, user?.id, taskAssignments]);

  const filteredTaskItems = useMemo(() => {
    const normalizedSearch = searchQuery.trim().toLowerCase();
    return taskItems.filter((task) => {
      // Filter by assignment type
      if (assignmentFilter === "personal" && task.assignmentInfo?.isAdminAssignment) {
        return false;
      }
      if (assignmentFilter === "admin" && !task.assignmentInfo?.isAdminAssignment) {
        return false;
      }
      
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
  }, [assignmentFilter, kindFilter, searchQuery, siteFilter, statusFilter, taskItems]);

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
  const getTaskExportCellValue = useCallback((task: TaskItem, column: TaskTableColumnKey) => {
    if (column === "site") {
      return getSiteShortLabel(task.site);
    }
    if (column === "task") {
      return task.title;
    }
    if (column === "writer_status") {
      return WRITER_STATUS_LABELS[task.writerStatus];
    }
    if (column === "publisher_status") {
      return PUBLISHER_STATUS_LABELS[task.publisherStatus];
    }
    if (column === "publish_date") {
      return formatDisplayDate(task.scheduledDate) || "Not scheduled";
    }
    return "View options";
  }, []);
  const closeOpenDetailsMenus = () => {
    document.querySelectorAll("details[open]").forEach((el) => {
      (el as HTMLDetailsElement).open = false;
    });
  };
  const resetTaskFilters = useCallback(() => {
    setSearchQuery("");
    setKindFilter("all");
    setStatusFilter("all");
    setSiteFilter("all");
    setAssignmentFilter("all");
    setCurrentPage(1);
  }, []);
  const copyAllTasks = async (field: "title" | "url") => {
    const values =
      field === "title"
        ? sortedTaskItems.map((task) => task.title)
        : sortedTaskItems
            .map((task) => task.liveUrl ?? "")
            .filter((value) => value.length > 0);
    if (values.length === 0) {
      showError(`No task ${field === "title" ? "titles" : "URLs"} to copy`);
      return;
    }
    try {
      await navigator.clipboard.writeText(values.join("\n"));
    } catch {
      showError("Copy failed. Try again");
    }
  };

  const escapeCsvValue = (value: string) => `"${value.replaceAll("\"", "\"\"")}"`;
  const escapeHtmlValue = (value: string) =>
    value
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll("\"", "&quot;")
      .replaceAll("'", "&#39;");

  const exportTaskCsv = useCallback(() => {
    if (!canExportCsv) {
      showError("Permission denied for task export");
      return;
    }
    if (filteredTaskItems.length === 0) {
      showError("No tasks to export");
      return;
    }
    const exportableColumns = visibleColumnOrder.filter((column) => column !== "options");
    if (exportableColumns.length === 0) {
      showError("Select at least one column to export");
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
    showSuccess("Task export complete");
  }, [
    canExportCsv,
    filteredTaskItems,
    getTaskExportCellValue,
    showError,
    showSuccess,
    visibleColumnOrder,
  ]);

  const exportTaskPdf = () => {
    if (!canExportCsv) {
      showError("Permission denied for task export");
      return;
    }
    if (filteredTaskItems.length === 0) {
      showError("No tasks to export");
      return;
    }
    const exportableColumns = visibleColumnOrder.filter((column) => column !== "options");
    if (exportableColumns.length === 0) {
      showError("Select at least one column to export");
      return;
    }

    const popup = window.open("", "_blank", "width=1100,height=800");
    if (!popup) {
      showError("Popup blocked. Allow popups to export PDF");
      return;
    }
    const generatedAt = format(new Date(), "MMM d yyyy, h:mm a");

    const headerMarkup = exportableColumns
      .map((column) => `<th>${escapeHtmlValue(TASK_TABLE_COLUMN_LABELS[column])}</th>`)
      .join("");
    const rowsMarkup = filteredTaskItems
      .map((task) => {
        const cellMarkup = exportableColumns
          .map((column) => `<td>${escapeHtmlValue(getTaskExportCellValue(task, column))}</td>`)
          .join("");
        return `<tr>${cellMarkup}</tr>`;
      })
      .join("");
    popup.document.open();
    popup.document.write(`<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>My Tasks Export</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; color: #0f172a; padding: 24px; }
    h1 { margin: 0 0 12px 0; font-size: 20px; }
    p { margin: 0 0 18px 0; color: #475569; font-size: 13px; }
    table { border-collapse: collapse; width: 100%; font-size: 12px; }
    th, td { border: 1px solid #cbd5e1; padding: 8px; text-align: left; vertical-align: top; word-break: break-word; }
    th { background: #f8fafc; font-weight: 600; }
  </style>
</head>
<body>
  <h1>My Tasks Export</h1>
  <p>Generated ${escapeHtmlValue(generatedAt)}</p>
  <table>
    <thead>
      <tr>
        ${headerMarkup}
      </tr>
    </thead>
    <tbody>${rowsMarkup}</tbody>
  </table>
</body>
</html>`);
    popup.document.close();

    const triggerPrintWhenReady = () => {
      if (popup.closed) {
        return;
      }
      const isReady = popup.document.readyState === "complete";
      const hasBody = Boolean(popup.document.body?.childElementCount);
      if (!isReady || !hasBody) {
        window.setTimeout(triggerPrintWhenReady, 120);
        return;
      }
      popup.focus();
      popup.print();
    };

    window.setTimeout(triggerPrintWhenReady, 180);
    showSuccess("PDF ready. Use print dialog to save");
  };
  useEffect(() => {
    const handlePaletteAction = (event: Event) => {
      const actionId = (event as CustomEvent<{ actionId?: string }>).detail?.actionId;
      if (actionId === "clear_all_filters") {
        resetTaskFilters();
        return;
      }
      if (actionId === "export_current_view") {
        exportTaskCsv();
      }
    };
    window.addEventListener("command-palette-action", handlePaletteAction as EventListener);
    return () => {
      window.removeEventListener(
        "command-palette-action",
        handlePaletteAction as EventListener
      );
    };
  }, [exportTaskCsv, resetTaskFilters]);

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
        assignmentFilter !== "all"
          ? {
              id: "assignment",
              label: `Assignment: ${assignmentFilter === "personal" ? "My Tasks" : "Admin Reviews"}`,
              onRemove: () => {
                setAssignmentFilter("all");
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
              label: `Status: ${WRITER_STATUS_LABELS[statusFilter as WriterStageStatus] || PUBLISHER_STATUS_LABELS[statusFilter as PublisherStageStatus]}`,
              onRemove: () => {
                setStatusFilter("all");
              },
            }
          : null,
        siteFilter !== "all"
          ? {
              id: "site",
              label: `Site: ${getSiteShortLabel(siteFilter)}`,
              onRemove: () => {
                setSiteFilter("all");
              },
            }
          : null,
      ].filter((pill) => pill !== null),
    [assignmentFilter, kindFilter, searchQuery, siteFilter, statusFilter]
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
        message: `Couldn't save. ${updateError.message}`,
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
          {getSiteShortLabel(task.site)}
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
                {WRITER_STATUS_LABELS[status]}
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
                {PUBLISHER_STATUS_LABELS[status]}
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
        <div className={DATA_PAGE_STACK_CLASS}>
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
              <Button
                type="button"
                onClick={resetTaskFilters}
                variant="secondary"
                size="sm"
              >
                Clear all filters
              </Button>
            }
            filters={
              <>
                <select
                  aria-label="Assignment Type"
                  value={assignmentFilter}
                  onChange={(event) => {
                    setAssignmentFilter(event.target.value as "all" | "personal" | "admin");
                    setCurrentPage(1);
                  }}
                  className="focus-field w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700"
                >
                  <option value="all">All Tasks</option>
                  <option value="personal">My Tasks</option>
                  <option value="admin">Admin Reviews</option>
                </select>
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
                  <option value="all">Sites</option>
                  <option value="sighthound.com">SH</option>
                  <option value="redactor.com">RED</option>
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

              <section className={DATA_PAGE_TABLE_SECTION_CLASS}>
                <div className={`${DATA_PAGE_CONTROL_STRIP_CLASS} relative`}>
                  <div className={DATA_PAGE_CONTROL_ROW_CLASS}>
                    <TableResultsSummary
                      totalRows={filteredTaskItems.length}
                      currentPage={currentPage}
                      rowLimit={FULL_LIST_PAGE_SIZE}
                      noun="tasks"
                    />
                    <div className={DATA_PAGE_CONTROL_ACTIONS_CLASS}>
                      <details className="relative">
                        <summary
                          className={`${DATA_PAGE_CONTROL_ACTION_BUTTON_CLASS} cursor-pointer list-none border border-slate-300 bg-white text-slate-700 hover:bg-slate-100`}
                        >
                          Copy
                        </summary>
                        <div className="absolute right-0 z-20 mt-1 w-44 rounded-md border border-slate-200 bg-white p-1 shadow-md">
                          <button
                            type="button"
                            disabled={sortedTaskItems.length === 0}
                            className="block w-full rounded px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                            onClick={() => {
                              closeOpenDetailsMenus();
                              void copyAllTasks("title");
                            }}
                          >
                            All titles
                          </button>
                          <button
                            type="button"
                            disabled={sortedTaskItems.length === 0}
                            className="block w-full rounded px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                            onClick={() => {
                              closeOpenDetailsMenus();
                              void copyAllTasks("url");
                            }}
                          >
                            All URLs
                          </button>
                        </div>
                      </details>
                      <details className="relative">
                        <summary
                          className={`${DATA_PAGE_CONTROL_ACTION_BUTTON_CLASS} cursor-pointer list-none border border-slate-300 bg-white text-slate-700 hover:bg-slate-100`}
                        >
                          Customize
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
                          <div className="mt-2 flex items-center justify-between rounded border border-slate-200 bg-slate-50 px-2 py-1.5">
                            <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                              Density
                            </span>
                            <div className={`${SEGMENTED_CONTROL_CLASS} text-xs`}>
                              <button
                                type="button"
                                className={segmentedControlItemClass({
                                  isActive: rowDensity === "compact",
                                  className: "px-2 py-1 text-xs",
                                })}
                                onClick={() => {
                                  setRowDensity("compact");
                                }}
                              >
                                Compact
                              </button>
                              <button
                                type="button"
                                className={segmentedControlItemClass({
                                  isActive: rowDensity === "comfortable",
                                  className: "px-2 py-1 text-xs",
                                })}
                                onClick={() => {
                                  setRowDensity("comfortable");
                                }}
                              >
                                Comfortable
                              </button>
                            </div>
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
                      {canRunDataImport ? (
                        <Link
                          href="/blogs?import=1"
                          className={`${DATA_PAGE_CONTROL_ACTION_BUTTON_CLASS} border border-slate-900 bg-slate-900 text-white hover:bg-slate-700`}
                        >
                          Import
                        </Link>
                      ) : null}
                      <details className="relative">
                        <summary
                          className={`${DATA_PAGE_CONTROL_ACTION_BUTTON_CLASS} cursor-pointer list-none border border-slate-900 bg-slate-900 text-white hover:bg-slate-700`}
                        >
                          Export
                        </summary>
                        <div className="absolute right-0 z-20 mt-1 rounded-md border border-slate-200 bg-white shadow-md">
                          <button
                            type="button"
                            disabled={sortedTaskItems.length === 0}
                            onClick={() => {
                              exportTaskCsv();
                              closeOpenDetailsMenus();
                            }}
                            className="block w-full px-3 py-1.5 text-left text-sm text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400"
                          >
                            As .CSV file
                          </button>
                          <button
                            type="button"
                            disabled={sortedTaskItems.length === 0}
                            onClick={() => {
                              exportTaskPdf();
                              closeOpenDetailsMenus();
                            }}
                            className="block w-full px-3 py-1.5 text-left text-sm text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400"
                          >
                            As .PDF file
                          </button>
                        </div>
                      </details>
                    </div>
                  </div>
                </div>
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
                  density={rowDensity}
                  emptyMessage="You have no assigned tasks. You're all caught up."
                />
                <div className={`${DATA_PAGE_CONTROL_STRIP_CLASS} justify-end`}>
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

