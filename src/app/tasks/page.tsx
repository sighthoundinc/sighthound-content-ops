"use client";

import { formatDateInTimezone } from "@/lib/format-date";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { format, parseISO } from "date-fns";

import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/button";
import { DataTable, type DataTableColumn } from "@/components/data-table";
import {
  PublisherStatusBadge,
  SocialPostStatusBadge,
} from "@/components/status-badge";
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
  TableRowLimitSelect,
} from "@/components/table-controls";
import {
  getBlogPublishDate,
  normalizeBlogRows,
} from "@/lib/blog-schema";
import {
  getApiErrorMessage,
  isApiFailure,
  parseApiResponseJson,
} from "@/lib/api-response";
import {
  PUBLISHER_STATUSES,
  PUBLISHER_STATUS_LABELS,
  SOCIAL_POST_NEXT_ACTION_LABELS,
  SOCIAL_POST_STATUSES,
  SOCIAL_POST_STATUS_LABELS,
  WRITER_STATUSES,
  WRITER_STATUS_LABELS,
  getNextActor,
} from "@/lib/status";
import {
  getSocialTaskActionStateFromRow,
  getPublisherTaskActionState,
  getWriterTaskActionState,
  type TaskActionState,
} from "@/lib/task-action-state";
import { createUiPermissionContract } from "@/lib/permissions/uiPermissions";
import { getUserRoles } from "@/lib/roles";
import {
  SEGMENTED_CONTROL_CLASS,
  segmentedControlItemClass,
} from "@/lib/segmented-control";
import { getSiteBadgeClasses, getSiteShortLabel } from "@/lib/site";
import { getDashboardFilterIntent } from "@/lib/dashboard-filter-state";
import {
  DEFAULT_TABLE_ROW_LIMIT,
  getTablePageCount,
  getTablePageRows,
  type TableRowLimit,
} from "@/lib/table";
import {
  getMixedContentLabel,
  MIXED_CONTENT_FILTER_LABELS,
  MIXED_CONTENT_FILTER_OPTIONS,
  matchesMixedContentFilters,
  type MixedContentFilterValue,
} from "@/lib/content-classification";
import type {
  BlogRecord,
  BlogSite,
  PublisherStageStatus,
  SocialPostType,
  SocialPostStatus,
  WriterStageStatus,
} from "@/lib/types";
import { formatDateOnly } from "@/lib/utils";
import { useAuth } from "@/providers/auth-provider";
import { useAlerts } from "@/providers/alerts-provider";
import { markEnd, markStart } from "@/lib/perf-marks";
import { blogNextAction, socialNextAction } from "@/lib/next-action";
import { NextActionCell } from "@/components/next-action";

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
  actionState: TaskActionState;
  // Assignment metadata for admin review tasks
  assignmentInfo?: {
    isAdminAssignment: boolean;
    taskType: 'writer_review' | 'publisher_review';
    assignmentDate: string;
  };
};
type SocialTaskItem = {
  id: string;
  title: string;
  site: BlogSite;
  socialType: SocialPostType | null;
  status: SocialPostStatus;
  scheduledDate: string | null;
  createdAt: string;
  nextActor: ReturnType<typeof getNextActor>;
  nextAction: string;
  actionState: TaskActionState;
};
type TaskPreviewItem = {
  id: string;
  title: string;
  href: string;
  statusLabel: string;
  scheduledDate: string | null;
  createdAt: string;
  actionState: TaskActionState;
};
type UnifiedTaskRow = {
  id: string;
  contentType: "blog" | "social";
  title: string;
  href: string;
  scheduledDate: string | null;
  createdAt: string;
  actionState: TaskActionState;
  site: BlogSite;
  contentLabel: string;
  blogTask: TaskItem | null;
  socialTask: SocialTaskItem | null;
};
type TasksQueueResponse = {
  blogs: Array<Record<string, unknown>>;
  socialRows: Array<Record<string, unknown>>;
  assignments: Array<{
    blogId: string;
    taskType: "writer_review" | "publisher_review";
    assignedAt: string | null;
  }>;
};

type TaskTableColumnKey =
  | "site"
  | "content"
  | "task"
  | "writer_status"
  | "publisher_status"
  | "publish_date"
  | "options";
const TASK_TABLE_COLUMN_VIEW_STORAGE_KEY = "tasks-column-view:v1";
const TASK_TABLE_SORT_FIELDS = [
  "site",
  "content",
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
  "content",
  "task",
  "writer_status",
  "publisher_status",
  "publish_date",
  "options",
];
const DEFAULT_TASK_TABLE_HIDDEN_COLUMNS: TaskTableColumnKey[] = [];
const TASK_TABLE_COLUMN_LABELS: Record<TaskTableColumnKey, string> = {
  site: "Site",
  content: "Content",
  task: "Task",
  writer_status: "Status",
  publisher_status: "Next Action",
  publish_date: "Publish Date",
  options: "Options",
};
const TASK_STATUS_FILTER_OPTIONS: Array<{
  value: WriterStageStatus | PublisherStageStatus;
  label: string;
}> = [
  { value: "not_started", label: "Not Started" },
  { value: "in_progress", label: "In Progress" },
  { value: "pending_review", label: "Pending Review" },
  { value: "needs_revision", label: "Needs Revision" },
  { value: "publisher_approved", label: "Publishing Approved" },
  { value: "completed", label: "Completed" },
];
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

function getDateDifferenceInDays(dateKey: string, todayDateKey: string) {
  return Math.round(
    (parseISO(dateKey).getTime() - parseISO(todayDateKey).getTime()) /
      (24 * 60 * 60 * 1000)
  );
}
function normalizeRelationObject<T>(value: unknown): T | null {
  if (Array.isArray(value)) {
    return (value[0] ?? null) as T | null;
  }
  return (value ?? null) as T | null;
}

function normalizeRecordRows(rows: unknown): Array<Record<string, unknown>> {
  if (!Array.isArray(rows)) {
    return [];
  }
  return rows.filter(
    (row): row is Record<string, unknown> =>
      typeof row === "object" && row !== null && !Array.isArray(row)
  );
}

export default function MyTasksPage() {
  return (
    <Suspense fallback={<div className="p-4 text-sm text-navy-500">Loading your work…</div>}>
      <MyTasksPageContent />
    </Suspense>
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
  actionState,
}: {
  isDelayed: boolean;
  statusPriority: number;
  actionState: TaskActionState;
}) {
  if (actionState === "waiting_on_others") {
    return "Waiting on others";
  }
  if (isDelayed) {
    return "Overdue";
  }
  if (statusPriority === 2) {
    return "Upcoming";
  }
  return "Due Soon";
}


function MyTasksPageContent() {
  const searchParams = useSearchParams();
  const { user, session, hasPermission, profile } = useAuth();
  const requiredByLabel = profile?.display_name || profile?.full_name || "You";
  const { showSaving, showSuccess, showError, updateAlert } = useAlerts();
  const permissionContract = useMemo(
    () => createUiPermissionContract(hasPermission),
    [hasPermission]
  );
  const userRoles = useMemo(() => getUserRoles(profile), [profile]);
  const isAdmin = userRoles.includes("admin");
  const canExportCsv = permissionContract.canExportCsv;
  const canRunDataImport = hasPermission("run_data_import");
  const [blogs, setBlogs] = useState<BlogRecord[]>([]);
  const [socialTasks, setSocialTasks] = useState<SocialTaskItem[]>([]);
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
  const [socialStatusFilter, setSocialStatusFilter] = useState<
    "all" | SocialPostStatus
  >("all");
  const [siteFilter, setSiteFilter] = useState<"all" | "sighthound.com" | "redactor.com">("all");
  const [contentFilter, setContentFilter] = useState<"all" | MixedContentFilterValue>("all");
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
  const [rowLimit, setRowLimit] = useState<TableRowLimit>(DEFAULT_TABLE_ROW_LIMIT);
  const [rowDensity, setRowDensity] = useState<"compact" | "comfortable">("compact");
  const [assignmentFilter, setAssignmentFilter] = useState<"all" | "personal" | "admin">("all");
  const [actionFilter, setActionFilter] = useState<"all" | TaskActionState>("all");
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [taskAssignments, setTaskAssignments] = useState<
    Map<
      string,
      Array<{
        taskType: "writer_review" | "publisher_review";
        assignedAt: string | null;
      }>
    >
  >(new Map());
  const taskRowRefs = useRef<Record<string, HTMLTableRowElement | null>>({});
  const loadTasks = useCallback(async () => {
    if (!user?.id || !session?.access_token) {
      return;
    }
    setIsLoading(true);
    setError(null);
    const queueResponse = await fetch("/api/tasks/queue", {
      headers: {
        authorization: `Bearer ${session.access_token}`,
      },
    }).catch(() => null);
    if (!queueResponse) {
      setError("Couldn't load tasks. Please try again.");
      setIsLoading(false);
      return;
    }
    const queuePayload = await parseApiResponseJson<TasksQueueResponse>(queueResponse);
    if (isApiFailure(queueResponse, queuePayload)) {
      setError(getApiErrorMessage(queuePayload, "Couldn't load tasks. Please try again."));
      setIsLoading(false);
      return;
    }

    setBlogs(normalizeBlogRows(normalizeRecordRows(queuePayload.blogs)) as BlogRecord[]);
    const assignmentMap = new Map<
      string,
      Array<{
        taskType: "writer_review" | "publisher_review";
        assignedAt: string | null;
      }>
    >();
    for (const assignment of queuePayload.assignments ?? []) {
      if (
        typeof assignment.blogId === "string" &&
        typeof assignment.taskType === "string"
      ) {
        const entries = assignmentMap.get(assignment.blogId) ?? [];
        entries.push({
          taskType: assignment.taskType,
          assignedAt:
            typeof assignment.assignedAt === "string" ? assignment.assignedAt : null,
        });
        assignmentMap.set(assignment.blogId, entries);
      }
    }
    setTaskAssignments(assignmentMap);

    const normalizedSocialRows = normalizeRecordRows(queuePayload.socialRows);
    const derivedSocialTasks = normalizedSocialRows
      .map((row) => {
        const status = row.status as SocialPostStatus;
        if (!(status in SOCIAL_POST_STATUS_LABELS)) {
          return null;
        }
        const normalizedSocialType =
          row.type === "image" ||
          row.type === "carousel" ||
          row.type === "video" ||
          row.type === "link"
            ? (row.type as SocialPostType)
            : null;
        const associatedBlog = normalizeRelationObject<{ site?: unknown }>(
          row.associated_blog
        );
        const socialSite: BlogSite =
          associatedBlog?.site === "redactor.com" || associatedBlog?.site === "sighthound.com"
            ? associatedBlog.site
            : "sighthound.com";
        const nextActor = getNextActor(status);
        const actionState = getSocialTaskActionStateFromRow({
          row,
          userId: user.id,
          isAdmin,
        });
        if (!actionState) {
          return null;
        }
        return {
          id: String(row.id ?? ""),
          title: String(row.title ?? "Untitled social post"),
          site: socialSite,
          socialType: normalizedSocialType,
          status,
          scheduledDate:
            typeof row.scheduled_date === "string" ? row.scheduled_date : null,
          createdAt: String(row.created_at ?? ""),
          nextActor,
          nextAction: SOCIAL_POST_NEXT_ACTION_LABELS[status],
          actionState,
        } satisfies SocialTaskItem;
      })
      .filter((item): item is SocialTaskItem => item !== null)
      .sort((left, right) => {
        const dateCompare = comparePublishDatesAsc(left.scheduledDate, right.scheduledDate);
        if (dateCompare !== 0) {
          return dateCompare;
        }
        return left.createdAt.localeCompare(right.createdAt);
      });
    setSocialTasks(derivedSocialTasks);
    setIsLoading(false);
  }, [isAdmin, session?.access_token, user?.id]);

  useEffect(() => {
    markStart("tasks:tti");
    void loadTasks();
  }, [loadTasks]);

  useEffect(() => {
    if (!isLoading) {
      markEnd("tasks:tti");
    }
  }, [isLoading]);

  useEffect(() => {
    const intent = getDashboardFilterIntent();
    if (!intent) {
      return;
    }
    if (
      intent.type === "writer_status" &&
      WRITER_STATUSES.includes(intent.value as WriterStageStatus)
    ) {
      setStatusFilter(intent.value as WriterStageStatus);
      setCurrentPage(1);
      return;
    }
    if (
      intent.type === "publisher_status" &&
      PUBLISHER_STATUSES.includes(intent.value as PublisherStageStatus)
    ) {
      setStatusFilter(intent.value as PublisherStageStatus);
      setCurrentPage(1);
      return;
    }
    if (
      intent.type === "social_status" &&
      SOCIAL_POST_STATUSES.includes(intent.value as SocialPostStatus)
    ) {
      setSocialStatusFilter(intent.value as SocialPostStatus);
      setCurrentPage(1);
    }
  }, []);
  useEffect(() => {
    const action = searchParams.get("action");
    if (action === "action_required" || action === "waiting_on_others") {
      setActionFilter(action);
      setCurrentPage(1);
    }
  }, [searchParams]);


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
        rowLimit?: unknown;
        sortField?: unknown;
        sortDirection?: unknown;
        density?: unknown;
      };
      setColumnOrder(normalizeTaskColumnOrder(parsed.order));
      setHiddenColumns(normalizeTaskHiddenColumns(parsed.hidden));
      if (parsed.rowLimit === "all") {
        setRowLimit("all");
      } else if (
        typeof parsed.rowLimit === "number" &&
        [10, 20, 50].includes(parsed.rowLimit)
      ) {
        setRowLimit(parsed.rowLimit as TableRowLimit);
      }
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
      setRowLimit(DEFAULT_TABLE_ROW_LIMIT);
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
        rowLimit,
        sortField: taskSortField,
        sortDirection: taskSortDirection,
        density: rowDensity,
      })
    );
  }, [columnOrder, hiddenColumns, rowDensity, rowLimit, taskSortDirection, taskSortField]);

  const taskItems = useMemo(() => {
    if (!user?.id) {
      return [] as TaskItem[];
    }

    const items: TaskItem[] = [];
    const compareCandidatePriority = (
      left: TaskItem & { association: "writer" | "publisher" | "admin_assignment" },
      right: TaskItem & { association: "writer" | "publisher" | "admin_assignment" }
    ) => {
      const actionPriority: Record<TaskActionState, number> = {
        action_required: 2,
        waiting_on_others: 1,
      };
      if (actionPriority[left.actionState] !== actionPriority[right.actionState]) {
        return actionPriority[right.actionState] - actionPriority[left.actionState];
      }
      const associationPriority: Record<
        "writer" | "publisher" | "admin_assignment",
        number
      > = {
        admin_assignment: 3,
        publisher: 2,
        writer: 1,
      };
      if (associationPriority[left.association] !== associationPriority[right.association]) {
        return (
          associationPriority[right.association] - associationPriority[left.association]
        );
      }
      return left.statusPriority - right.statusPriority;
    };

    for (const blog of blogs) {
      if (blog.overall_status === "published") {
        continue;
      }
      const scheduledDate = getBlogPublishDate(blog);
      const diffDays =
        scheduledDate !== null
          ? getDateDifferenceInDays(scheduledDate, todayDateKey)
          : null;
      const isDelayed = diffDays !== null && diffDays < 0;
      const assignmentEntries = taskAssignments.get(blog.id) ?? [];
      const candidates: Array<
        TaskItem & { association: "writer" | "publisher" | "admin_assignment" }
      > = [];

      // Personal writer task
      if (blog.writer_id === user.id) {
        const actionState = getWriterTaskActionState(blog.writer_status);
        const statusPriority = getTaskStatusPriority(
          blog.writer_status,
          scheduledDate,
          todayDateKey
        );
        candidates.push({
          association: "writer",
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
          actionState,
          reason: getTaskReason({
            isDelayed,
            statusPriority,
            actionState,
          }),
        });
      }

      // Personal publisher task
      if (blog.publisher_id === user.id) {
        const actionState = getPublisherTaskActionState(
          blog.writer_status,
          blog.publisher_status
        );
        const statusPriority = getTaskStatusPriority(
          blog.publisher_status,
          scheduledDate,
          todayDateKey
        );
        candidates.push({
          association: "publisher",
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
          actionState,
          reason: getTaskReason({
            isDelayed,
            statusPriority,
            actionState,
          }),
        });
      }

      // Admin-assigned review tasks for current user
      for (const assignment of assignmentEntries) {
        const taskKind: TaskKind =
          assignment.taskType === "writer_review" ? "writer" : "publisher";
        const blogStatus =
          taskKind === "writer" ? blog.writer_status : blog.publisher_status;
        const actionState =
          assignment.taskType === "writer_review"
            ? blog.writer_status === "pending_review"
              ? "action_required"
              : "waiting_on_others"
            : blog.publisher_status === "pending_review"
              ? "action_required"
              : "waiting_on_others";
        const statusPriority = getTaskStatusPriority(
          blogStatus,
          scheduledDate,
          todayDateKey
        );
        candidates.push({
          association: "admin_assignment",
          id: `${blog.id}:${taskKind}:admin:${assignment.assignedAt ?? "pending"}`,
          blogId: blog.id,
          site: blog.site,
          title: blog.title,
          kind: taskKind,
          createdAt: blog.created_at,
          scheduledDate,
          isDelayed,
          statusLabel:
            taskKind === "writer"
              ? WRITER_STATUS_LABELS[blog.writer_status]
              : PUBLISHER_STATUS_LABELS[blog.publisher_status],
          statusValue: blogStatus,
          statusPriority,
          liveUrl: blog.live_url,
          writerStatus: blog.writer_status,
          publisherStatus: blog.publisher_status,
          actionState,
          reason: getTaskReason({
            isDelayed,
            statusPriority,
            actionState,
          }),
          assignmentInfo: {
            isAdminAssignment: true,
            taskType: assignment.taskType,
            assignmentDate: assignment.assignedAt ?? "",
          },
        });
      }

      if (candidates.length === 0) {
        continue;
      }

      const selected = [...candidates].sort(compareCandidatePriority)[0];
      if (!selected) {
        continue;
      }
      const selectedTask: TaskItem = selected;
      items.push(selectedTask);
    }

    return items.sort((left, right) => {
      if (left.actionState !== right.actionState) {
        return left.actionState === "action_required" ? -1 : 1;
      }
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
      if (actionFilter !== "all" && task.actionState !== actionFilter) {
        return false;
      }
      if (contentFilter !== "all" && contentFilter !== "blog") {
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
  }, [actionFilter, assignmentFilter, contentFilter, kindFilter, searchQuery, siteFilter, statusFilter, taskItems]);

  const filteredSocialTasks = useMemo(() => {
    const normalizedSearch = searchQuery.trim().toLowerCase();
    return socialTasks.filter((task) => {
      if (siteFilter !== "all" && task.site !== siteFilter) {
        return false;
      }
      if (socialStatusFilter !== "all" && task.status !== socialStatusFilter) {
        return false;
      }
      if (actionFilter !== "all" && task.actionState !== actionFilter) {
        return false;
      }
      if (
        contentFilter !== "all" &&
        !matchesMixedContentFilters({
          selectedFilters: [contentFilter],
          contentType: "social_post",
          socialType: task.socialType,
        })
      ) {
        return false;
      }
      if (!normalizedSearch) {
        return true;
      }
      const haystack = `${task.title} ${task.nextAction}`.toLowerCase();
      return haystack.includes(normalizedSearch);
    });
  }, [actionFilter, contentFilter, searchQuery, siteFilter, socialStatusFilter, socialTasks]);
  const combinedTaskRows = useMemo(() => {
    const blogRows: UnifiedTaskRow[] = filteredTaskItems.map((task) => ({
      id: task.id,
      contentType: "blog",
      title: task.title,
      href: `/blogs/${task.blogId}`,
      scheduledDate: task.scheduledDate,
      createdAt: task.createdAt,
      actionState: task.actionState,
      site: task.site,
      contentLabel: getMixedContentLabel({ contentType: "blog" }),
      blogTask: task,
      socialTask: null,
    }));
    const socialRows: UnifiedTaskRow[] = filteredSocialTasks.map((task) => ({
      id: `social:${task.id}`,
      contentType: "social",
      title: task.title,
      href: `/social-posts/${task.id}`,
      scheduledDate: task.scheduledDate,
      createdAt: task.createdAt,
      actionState: task.actionState,
      site: task.site,
      contentLabel: getMixedContentLabel({
        contentType: "social_post",
        socialType: task.socialType,
      }),
      blogTask: null,
      socialTask: task,
    }));
    const rows = [...blogRows, ...socialRows];
    const collator = new Intl.Collator(undefined, { sensitivity: "base" });
    const compareBySortField = (left: UnifiedTaskRow, right: UnifiedTaskRow) => {
      if (taskSortField === "site") {
        const leftSite = getSiteShortLabel(left.site);
        const rightSite = getSiteShortLabel(right.site);
        return collator.compare(leftSite, rightSite);
      }
      if (taskSortField === "content") {
        return collator.compare(left.contentLabel, right.contentLabel);
      }
      if (taskSortField === "task") {
        return collator.compare(left.title, right.title);
      }
      if (taskSortField === "writer_status") {
        const leftStatus =
          left.contentType === "blog" && left.blogTask
            ? left.blogTask.statusLabel
            : left.socialTask
              ? SOCIAL_POST_STATUS_LABELS[left.socialTask.status]
              : "";
        const rightStatus =
          right.contentType === "blog" && right.blogTask
            ? right.blogTask.statusLabel
            : right.socialTask
              ? SOCIAL_POST_STATUS_LABELS[right.socialTask.status]
              : "";
        return collator.compare(leftStatus, rightStatus);
      }
      if (taskSortField === "publisher_status") {
        const leftNextAction =
          left.contentType === "blog" && left.blogTask
            ? left.blogTask.reason ?? ""
            : left.socialTask?.nextAction ?? "";
        const rightNextAction =
          right.contentType === "blog" && right.blogTask
            ? right.blogTask.reason ?? ""
            : right.socialTask?.nextAction ?? "";
        return collator.compare(leftNextAction, rightNextAction);
      }
      return comparePublishDatesAsc(left.scheduledDate, right.scheduledDate);
    };

    return rows.sort((left, right) => {
      const baseComparison = compareBySortField(left, right);
      if (baseComparison !== 0) {
        return taskSortDirection === "asc" ? baseComparison : -baseComparison;
      }
      if (left.actionState !== right.actionState) {
        return left.actionState === "action_required" ? -1 : 1;
      }
      return left.createdAt.localeCompare(right.createdAt);
    });
  }, [filteredSocialTasks, filteredTaskItems, taskSortDirection, taskSortField]);

  const nextTasks = useMemo(() => {
    const previews: TaskPreviewItem[] = combinedTaskRows.map((task) => ({
      id: task.id,
      title: task.title,
      href: task.href,
      statusLabel:
        task.contentType === "blog" && task.blogTask
          ? task.blogTask.statusLabel
          : task.socialTask
            ? SOCIAL_POST_STATUS_LABELS[task.socialTask.status]
            : "",
      scheduledDate: task.scheduledDate,
      createdAt: task.createdAt,
      actionState: task.actionState,
    }));
    return previews
      .sort((left, right) => {
        if (left.actionState !== right.actionState) {
          return left.actionState === "action_required" ? -1 : 1;
        }
        const publishDateCompare = comparePublishDatesAsc(
          left.scheduledDate,
          right.scheduledDate
        );
        if (publishDateCompare !== 0) {
          return publishDateCompare;
        }
        return left.createdAt.localeCompare(right.createdAt);
      })
      .slice(0, 3);
  }, [combinedTaskRows]);

  const pageCount = useMemo(
    () => getTablePageCount(combinedTaskRows.length, rowLimit),
    [combinedTaskRows.length, rowLimit]
  );
  const pagedTasks = useMemo(
    () => getTablePageRows(combinedTaskRows, currentPage, rowLimit),
    [combinedTaskRows, currentPage, rowLimit]
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
  const getTaskExportCellValue = useCallback(
    (task: UnifiedTaskRow, column: TaskTableColumnKey) => {
      if (column === "site") {
        return getSiteShortLabel(task.site);
      }
      if (column === "content") {
        return task.contentLabel;
      }
      if (column === "task") {
        return task.title;
      }
      if (column === "writer_status") {
        if (task.contentType === "blog" && task.blogTask) {
          return task.blogTask.kind === "writer"
            ? WRITER_STATUS_LABELS[task.blogTask.writerStatus]
            : PUBLISHER_STATUS_LABELS[task.blogTask.publisherStatus];
        }
        if (task.socialTask) {
          return SOCIAL_POST_STATUS_LABELS[task.socialTask.status];
        }
        return "";
      }
      if (column === "publisher_status") {
        if (task.contentType === "blog" && task.blogTask) {
          return task.blogTask.reason ?? "";
        }
        return task.socialTask?.nextAction ?? "";
      }
      if (column === "publish_date") {
        return formatDateOnly(task.scheduledDate) || "Not scheduled";
      }
      return task.href;
    },
    []
  );
  const closeOpenDetailsMenus = () => {
    document.querySelectorAll("details[open]").forEach((el) => {
      (el as HTMLDetailsElement).open = false;
    });
  };
  const activeAdvancedFilterCount = useMemo(
    () =>
      [
        socialStatusFilter !== "all",
        kindFilter !== "all",
        siteFilter !== "all",
        contentFilter !== "all",
      ].filter(Boolean).length,
    [contentFilter, kindFilter, siteFilter, socialStatusFilter]
  );
  const resetTaskFilters = useCallback(() => {
    setSearchQuery("");
    setKindFilter("all");
    setContentFilter("all");
    setStatusFilter("all");
    setSocialStatusFilter("all");
    setSiteFilter("all");
    setAssignmentFilter("all");
    setActionFilter("all");
    setShowAdvancedFilters(false);
    setCurrentPage(1);
  }, []);
  const copyAllTasks = async (field: "title" | "url") => {
    const values =
      field === "title"
        ? combinedTaskRows.map((task) => task.title)
        : combinedTaskRows
            .map((task) =>
              task.contentType === "blog"
                ? task.blogTask?.liveUrl ?? ""
                : task.href
            )
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
    if (combinedTaskRows.length === 0) {
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
    const dataRows = combinedTaskRows.map((task) =>
      exportableColumns
        .map((column) => escapeCsvValue(getTaskExportCellValue(task, column)))
        .join(",")
    );
    const csvContent = `\uFEFF${[headerRow, ...dataRows].join("\n")}`;
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const downloadUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = downloadUrl;
    link.download = `my-tasks-${formatDateInTimezone(new Date().toISOString(), profile?.timezone, "yyyyMMdd-HHmm")}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(downloadUrl);
    showSuccess("Task export completed.");
  }, [
    canExportCsv,
    combinedTaskRows,
    getTaskExportCellValue,
    profile?.timezone,
    showError,
    showSuccess,
    visibleColumnOrder,
  ]);

  const exportTaskPdf = () => {
    if (!canExportCsv) {
      showError("Permission denied for task export");
      return;
    }
    if (combinedTaskRows.length === 0) {
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
    const generatedAt = formatDateInTimezone(new Date().toISOString(), profile?.timezone, "MMM d yyyy, h:mm a");

    const headerMarkup = exportableColumns
      .map((column) => `<th>${escapeHtmlValue(TASK_TABLE_COLUMN_LABELS[column])}</th>`)
      .join("");
    const rowsMarkup = combinedTaskRows
      .map((task) => {
        const cellMarkup = exportableColumns
          .map((column) => `<td>${escapeHtmlValue(getTaskExportCellValue(task, column))}</td>`)
          .join("");
        return `<tr>${cellMarkup}</tr>`;
      })
      .join("");
    popup.document.open();
    // Print popup runs in an isolated document; Sighthound design tokens are
    // inlined as hex because --sh-* / --color-* CSS vars are not available
    // in the new window. Values below mirror the brand palette.
    popup.document.write(`<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>My Tasks Export</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Lexend:wght@400;500;600&display=swap" />
  <style>
    body { font-family: "Lexend", -apple-system, BlinkMacSystemFont, "Segoe UI", Verdana, sans-serif; color: #1a1d38; padding: 24px; letter-spacing: -0.01em; }
    h1 { margin: 0 0 12px 0; font-size: 20px; font-weight: 600; }
    p { margin: 0 0 18px 0; color: #4b4f73; font-size: 13px; }
    table { border-collapse: collapse; width: 100%; font-size: 12px; }
    th, td { border: 1px solid #d9dfe6; padding: 8px; text-align: left; vertical-align: top; word-break: break-word; }
    th { background: #eff3f7; font-weight: 600; }
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
    showSuccess("PDF prepared.");
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
    const taskIndex = combinedTaskRows.findIndex((task) => task.id === taskId);
    if (taskIndex >= 0) {
      if (rowLimit === "all") {
        setCurrentPage(1);
      } else {
        setCurrentPage(Math.floor(taskIndex / rowLimit) + 1);
      }
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
        actionFilter !== "all"
          ? {
              id: "action",
              label:
                actionFilter === "action_required"
                  ? `Action: Required by: ${requiredByLabel}`
                  : "Action: Waiting on Others",
              onRemove: () => {
                setActionFilter("all");
              },
            }
          : null,
        kindFilter !== "all"
          ? {
              id: "kind",
              label:
                kindFilter === "writer"
                  ? "Task Type: Writing"
                  : "Task Type: Publishing",
              onRemove: () => {
                setKindFilter("all");
              },
            }
          : null,
        contentFilter !== "all"
          ? {
              id: "content",
              label: `Content: ${MIXED_CONTENT_FILTER_LABELS[contentFilter]}`,
              onRemove: () => {
                setContentFilter("all");
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
        socialStatusFilter !== "all"
          ? {
              id: "social-status",
              label: `Social Status: ${SOCIAL_POST_STATUS_LABELS[socialStatusFilter]}`,
              onRemove: () => {
                setSocialStatusFilter("all");
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
    [actionFilter, assignmentFilter, contentFilter, kindFilter, requiredByLabel, searchQuery, siteFilter, socialStatusFilter, statusFilter]
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

    if (!session?.access_token) {
      showError("Couldn't save changes. Please sign in again.");
      return;
    }
    setSavingTaskId(task.id);
    const statusId = showSaving("Saving changes…");
    const response = await fetch(`/api/blogs/${task.blogId}/transition`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${session.access_token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify(updates),
    });
    const payload = await parseApiResponseJson<{ blog?: Record<string, unknown> }>(
      response
    );
    if (isApiFailure(response, payload)) {
      const errorMessage = getApiErrorMessage(payload, "Couldn't save changes.");
      updateAlert(statusId, {
        type: "error",
        message: errorMessage,
        actionLabel: "Retry",
        onAction: () => {
          void updateTaskStatus(task, nextStatus);
        },
      });
      setSavingTaskId(null);
      return;
    }
    const data =
      payload.blog && typeof payload.blog === "object" ? payload.blog : null;
    if (!data) {
      updateAlert(statusId, {
        type: "error",
        message: "We couldn't save your changes.",
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

    updateAlert(statusId, {
      type: "success",
      message: "Status updated.",
    });
  };

  const taskTableColumns: DataTableColumn<UnifiedTaskRow>[] = [
    {
      id: "site",
      label: "Site",
      sortable: true,
      render: (task) => (
        task.site ? (
          <span
            className={`inline-flex items-center justify-center rounded-full border px-2 py-0.5 text-xs font-medium ${
              getSiteBadgeClasses(task.site)
            }`}
          >
            {getSiteShortLabel(task.site)}
          </span>
        ) : (
          "—"
        )
      ),
    },
    {
      id: "content",
      label: "Content",
      sortable: true,
      render: (task) => <span className="text-xs text-navy-500">{task.contentLabel}</span>,
    },
    {
      id: "task",
      label: "Task",
      sortable: true,
      render: (task) => (
        <div>
          <Link
            href={task.href}
            title={task.title}
            className="interactive-link block max-w-[28rem] truncate font-medium text-ink"
          >
            {task.title}
          </Link>
          <p className="mt-1 text-xs text-navy-500">
            {task.contentType === "blog" && task.blogTask
              ? task.blogTask.kind === "writer"
                ? "Writing task"
                : "Publishing task"
              : "Social task"}
            {task.contentType === "blog" && task.blogTask?.isDelayed ? " · Overdue" : ""}
            {task.actionState === "action_required"
              ? " · Action required by you"
              : " · Waiting on others"}
          </p>
        </div>
      ),
    },
    {
      id: "writer_status",
      label: "Status",
      sortable: true,
      render: (task) => {
        if (task.contentType === "blog" && task.blogTask) {
          const blogTask = task.blogTask;
          if (blogTask.kind === "writer") {
            return (
              <select
                value={blogTask.writerStatus}
                disabled={savingTaskId === blogTask.id}
                onChange={(event) => {
                  void updateTaskStatus(
                    blogTask,
                    event.target.value as WriterStageStatus
                  );
                }}
                className="focus-field rounded-md border border-[color:var(--sh-gray-200)] px-2 py-1 text-xs disabled:cursor-not-allowed disabled:bg-blurple-50 disabled:text-navy-500"
              >
                {WRITER_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {WRITER_STATUS_LABELS[status]}
                  </option>
                ))}
              </select>
            );
          }
          return <PublisherStatusBadge status={blogTask.publisherStatus} />;
        }
        if (task.socialTask) {
          return <SocialPostStatusBadge status={task.socialTask.status} />;
        }
        return "—";
      },
    },
    {
      id: "publisher_status",
      label: "Next Action",
      sortable: true,
      render: (task) => {
        if (task.contentType === "blog" && task.blogTask) {
          const blogTask = task.blogTask;
          const descriptor = blogNextAction({
            writerStatus: blogTask.writerStatus,
            publisherStatus: blogTask.publisherStatus,
            writerId: blogTask.kind === "writer" ? user?.id ?? null : null,
            publisherId: blogTask.kind === "publisher" ? user?.id ?? null : null,
            writerName: blogTask.kind === "writer" ? requiredByLabel : null,
            publisherName: blogTask.kind === "publisher" ? requiredByLabel : null,
            userId: user?.id ?? null,
            isAdmin,
          });
          return <NextActionCell descriptor={descriptor} />;
        }
        if (task.socialTask) {
          const socialDescriptor = socialNextAction({
            status: task.socialTask.status,
            ownerId: task.actionState === "action_required" ? user?.id ?? null : null,
            ownerName: task.actionState === "action_required" ? requiredByLabel : null,
            userId: user?.id ?? null,
            isAdmin,
          });
          return <NextActionCell descriptor={socialDescriptor} />;
        }
        return "—";
      },
    },
    {
      id: "publish_date",
      label: "Publish Date",
      sortable: true,
      render: (task) => formatDateOnly(task.scheduledDate) || "Not scheduled",
    },
  ];

  return (
    <ProtectedPage>
      <AppShell>
        <div className={DATA_PAGE_STACK_CLASS}>
          <DataPageHeader
            title="My Tasks"
            description="Unified blog and social queue for what needs your action and what is waiting on others."
          />
          <DataPageToolbar
            searchValue={searchQuery}
            onSearchChange={(value) => {
              setSearchQuery(value);
              setCurrentPage(1);
            }}
            searchPlaceholder="Search blog and social tasks"
            actions={
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setShowAdvancedFilters((previous) => !previous);
                  }}
                >
                  {showAdvancedFilters
                    ? "Hide advanced filters"
                    : activeAdvancedFilterCount > 0
                      ? `More filters (${activeAdvancedFilterCount})`
                      : "More filters"}
                </Button>
                <Button
                  type="button"
                  onClick={resetTaskFilters}
                  variant="secondary"
                  size="sm"
                >
                  Clear all filters
                </Button>
              </div>
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
                  className="focus-field w-full rounded-md border border-[color:var(--sh-gray-200)] bg-white px-3 py-2 text-sm text-navy-500"
                >
                  <option value="all">All Tasks</option>
                  <option value="personal">My Tasks</option>
                  <option value="admin">Admin Reviews</option>
                </select>
                <select
                  aria-label="Task Action State"
                  value={actionFilter}
                  onChange={(event) => {
                    setActionFilter(event.target.value as "all" | TaskActionState);
                    setCurrentPage(1);
                  }}
                  className="focus-field w-full rounded-md border border-[color:var(--sh-gray-200)] bg-white px-3 py-2 text-sm text-navy-500"
                >
                  <option value="all">All Action States</option>
                  <option value="action_required">Required by: {requiredByLabel}</option>
                  <option value="waiting_on_others">Waiting on Others</option>
                </select>
                <select
                  aria-label="Task Status"
                  value={statusFilter}
                  onChange={(event) => {
                    setStatusFilter(event.target.value as "all" | WriterStageStatus | PublisherStageStatus);
                    setCurrentPage(1);
                  }}
                  className="focus-field w-full rounded-md border border-[color:var(--sh-gray-200)] bg-white px-3 py-2 text-sm text-navy-500"
                >
                  <option value="all">All Statuses</option>
                  {TASK_STATUS_FILTER_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                {showAdvancedFilters ? (
                  <>
                    <select
                      aria-label="Social Task Status"
                      value={socialStatusFilter}
                      onChange={(event) => {
                        setSocialStatusFilter(event.target.value as "all" | SocialPostStatus);
                        setCurrentPage(1);
                      }}
                      className="focus-field w-full rounded-md border border-[color:var(--sh-gray-200)] bg-white px-3 py-2 text-sm text-navy-500"
                    >
                      <option value="all">All Social Statuses</option>
                      {SOCIAL_POST_STATUSES.map((status) => (
                        <option key={status} value={status}>
                          {SOCIAL_POST_STATUS_LABELS[status]}
                        </option>
                      ))}
                    </select>
                    <select
                      aria-label="Task Type"
                      value={kindFilter}
                      onChange={(event) => {
                        setKindFilter(event.target.value as TaskKind | "all");
                        setCurrentPage(1);
                      }}
                      className="focus-field w-full rounded-md border border-[color:var(--sh-gray-200)] bg-white px-3 py-2 text-sm text-navy-500"
                    >
                      <option value="all">All Task Types</option>
                      <option value="writer">Writing</option>
                      <option value="publisher">Publishing</option>
                    </select>
                    <select
                      aria-label="Task Site"
                      value={siteFilter}
                      onChange={(event) => {
                        setSiteFilter(event.target.value as "all" | "sighthound.com" | "redactor.com");
                        setCurrentPage(1);
                      }}
                      className="focus-field w-full rounded-md border border-[color:var(--sh-gray-200)] bg-white px-3 py-2 text-sm text-navy-500"
                    >
                      <option value="all">All Sites</option>
                      <option value="sighthound.com">Sighthound (SH)</option>
                      <option value="redactor.com">Redactor (RED)</option>
                    </select>
                    <select
                      aria-label="Content Type"
                      value={contentFilter}
                      onChange={(event) => {
                        setContentFilter(event.target.value as "all" | MixedContentFilterValue);
                        setCurrentPage(1);
                      }}
                      className="focus-field w-full rounded-md border border-[color:var(--sh-gray-200)] bg-white px-3 py-2 text-sm text-navy-500"
                    >
                      <option value="all">All Content</option>
                      {MIXED_CONTENT_FILTER_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </>
                ) : null}
              </>
            }
          />
          <DataPageFilterPills pills={activeFilterPills} />


          {isLoading ? (
            <>
              <section className="space-y-3 rounded-lg border border-[color:var(--sh-gray-200)] bg-[color:var(--sh-gray)] p-4">
                <div className="skeleton h-4 w-24" />
                <div className="space-y-2">
                  <div className="skeleton h-12 w-full" />
                  <div className="skeleton h-12 w-full" />
                  <div className="skeleton h-12 w-full" />
                </div>
              </section>
              <section className="space-y-3 rounded-lg border border-[color:var(--sh-gray-200)] p-4">
                <div className="space-y-2">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="skeleton h-12 w-full" />
                  ))}
                </div>
              </section>
            </>
          ) : (
            <>
              <section className="space-y-3 rounded-lg border border-[color:var(--sh-gray-200)] bg-[color:var(--sh-gray)] p-4">
                <h3 className="text-sm font-semibold text-navy-500">
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
                        <Link
                          href={task.href}
                          className="pressable block w-full rounded-md border border-[color:var(--sh-gray-200)] bg-white px-3 py-2 text-left hover:bg-blurple-50"
                        >
                          <p className="font-medium text-ink">
                            {index + 1}. {task.title}
                          </p>
                          <p className="mt-1 text-xs text-navy-500">
                            Status: {task.statusLabel}
                          </p>
                          <p className="mt-1 text-xs text-navy-500">
                            Publish Date: {formatDateOnly(task.scheduledDate) || "Not scheduled"}
                          </p>
                        </Link>
                      </li>
                    ))}
                  </ol>
                )}
              </section>

              <section className={DATA_PAGE_TABLE_SECTION_CLASS}>
                <div className={`${DATA_PAGE_CONTROL_STRIP_CLASS} relative`}>
                  <div className={DATA_PAGE_CONTROL_ROW_CLASS}>
                    <TableResultsSummary
                      totalRows={combinedTaskRows.length}
                      currentPage={currentPage}
                      rowLimit={rowLimit}
                      noun="tasks"
                    />
                    <div className={DATA_PAGE_CONTROL_ACTIONS_CLASS}>
                      <details className="relative">
                        <summary
                          className={`${DATA_PAGE_CONTROL_ACTION_BUTTON_CLASS} cursor-pointer list-none border border-[color:var(--sh-gray-200)] bg-white text-navy-500 hover:bg-blurple-50`}
                        >
                          Copy
                        </summary>
                        <div className="absolute right-0 z-20 mt-1 w-44 rounded-md border border-[color:var(--sh-gray-200)] bg-white p-1 shadow-md">
                          <button
                            type="button"
                            disabled={combinedTaskRows.length === 0}

                            className="block w-full rounded px-3 py-2 text-left text-sm text-navy-500 hover:bg-blurple-50 disabled:cursor-not-allowed disabled:opacity-50"
                            onClick={() => {
                              closeOpenDetailsMenus();
                              void copyAllTasks("title");
                            }}
                          >
                            All titles
                          </button>
                          <button
                            type="button"
                            disabled={combinedTaskRows.length === 0}
                            className="block w-full rounded px-3 py-2 text-left text-sm text-navy-500 hover:bg-blurple-50 disabled:cursor-not-allowed disabled:opacity-50"
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
                          className={`${DATA_PAGE_CONTROL_ACTION_BUTTON_CLASS} cursor-pointer list-none border border-[color:var(--sh-gray-200)] bg-white text-navy-500 hover:bg-blurple-50`}
                        >
                          Customize
                        </summary>
                        <div className="absolute right-0 z-20 mt-1 w-64 rounded-md border border-[color:var(--sh-gray-200)] bg-white p-2 shadow-md">
                          <div className="flex items-center justify-between">
                            <p className="text-[11px] font-medium text-navy-500">
                              Show Columns
                            </p>
                            <button
                              type="button"
                              className="pressable rounded border border-[color:var(--sh-gray-200)] bg-white px-2 py-1 text-[11px] font-medium text-navy-500 hover:bg-blurple-50"
                              onClick={() => {
                                resetColumnVisibility();
                              }}
                            >
                              Reset Defaults
                            </button>
                          </div>
                          <div className="mt-2 flex items-center justify-between rounded border border-[color:var(--sh-gray-200)] bg-[color:var(--sh-gray)] px-2 py-1.5">
                            <span className="text-[11px] font-medium text-navy-500">
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
                                className="inline-flex w-full items-center justify-between gap-2 rounded px-1 py-1 text-xs text-navy-500 hover:bg-blurple-50"
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
                          className={`${DATA_PAGE_CONTROL_ACTION_BUTTON_CLASS} border border-brand bg-brand text-white hover:bg-blurple-700`}
                        >
                          Import
                        </Link>
                      ) : null}
                      <details className="relative">
                        <summary
                          className={`${DATA_PAGE_CONTROL_ACTION_BUTTON_CLASS} cursor-pointer list-none border border-brand bg-brand text-white hover:bg-blurple-700`}
                        >
                          Export
                        </summary>
                        <div className="absolute right-0 z-20 mt-1 rounded-md border border-[color:var(--sh-gray-200)] bg-white shadow-md">
                          <button
                            type="button"
                            disabled={combinedTaskRows.length === 0}
                            onClick={() => {
                              exportTaskCsv();
                              closeOpenDetailsMenus();
                            }}
                            className="block w-full px-3 py-1.5 text-left text-sm text-navy-500 hover:bg-blurple-50 disabled:cursor-not-allowed disabled:bg-[color:var(--sh-gray)] disabled:text-navy-500/60"
                          >
                            As .CSV file
                          </button>
                          <button
                            type="button"
                            disabled={combinedTaskRows.length === 0}
                            onClick={() => {
                              exportTaskPdf();
                              closeOpenDetailsMenus();
                            }}
                            className="block w-full px-3 py-1.5 text-left text-sm text-navy-500 hover:bg-blurple-50 disabled:cursor-not-allowed disabled:bg-[color:var(--sh-gray)] disabled:text-navy-500/60"
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
                  emptyMessage="No tasks match your current filters."
                />
                <div className={DATA_PAGE_CONTROL_STRIP_CLASS}>
                  <TableRowLimitSelect
                    value={rowLimit}
                    onChange={(value) => {
                      setRowLimit(value);
                    }}
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

