"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { format, formatDistanceToNow, isBefore, parseISO } from "date-fns";

import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/button";
import { DashboardSidebar } from "@/components/dashboard-sidebar";
import { CheckboxMultiSelect } from "@/components/checkbox-multi-select";
import {
  DataPageFilterPills,
  DataPageHeader,
  DataPageToolbar,
} from "@/components/data-page";
import { KbdShortcut } from "@/components/kbd-shortcut";
import { ExternalLink } from "@/components/external-link";
import { ProtectedPage } from "@/components/protected-page";
import {
  PublisherStatusBadge,
  StatusBadge,
  WorkflowStageBadge,
  WriterStatusBadge,
} from "@/components/status-badge";
import {
  TablePaginationControls,
  TableResultsSummary,
  TableRowLimitSelect,
} from "@/components/table-controls";
import {
  BLOG_SELECT_LEGACY_WITH_RELATIONS,
  BLOG_SELECT_WITH_DATES_WITH_RELATIONS,
  getBlogPublishDate,
  getBlogScheduledDate,
  isMissingBlogDateColumnsError,
  normalizeBlogRow,
  normalizeBlogRows,
} from "@/lib/blog-schema";
import {
  canTransitionPublisherStatus,
  canTransitionWriterStatus,
} from "@/lib/permissions";
import { createUiPermissionContract } from "@/lib/permissions/uiPermissions";
import {
  OVERALL_STATUSES,
  PUBLISHER_STATUS_LABELS,
  PUBLISHER_STATUSES,
  SITES,
  STATUS_LABELS,
  getWorkflowStage,
  WRITER_STATUS_LABELS,
  WRITER_STATUSES,
} from "@/lib/status";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import {
  DEFAULT_TABLE_ROW_LIMIT,
  TABLE_ROW_LIMIT_OPTIONS,
  getTablePageCount,
  getTablePageRows,
  type SortDirection,
  type TableRowLimit,
} from "@/lib/table";
import { getSiteBadgeClasses, getSiteLabel } from "@/lib/site";
import type {
  BlogSite,
  BlogHistoryRecord,
  BlogRecord,
  OverallBlogStatus,
  ProfileRecord,
  PublisherStageStatus,
  WriterStageStatus,
} from "@/lib/types";
import { formatDateInput, formatDisplayDate, toTitleCase } from "@/lib/utils";
import { useAuth } from "@/providers/auth-provider";
import { useSystemFeedback } from "@/providers/system-feedback-provider";

type BlogCommentRecord = {
  id: string;
  blog_id: string;
  comment: string;
  created_by: string;
  created_at: string;
  author?: Pick<ProfileRecord, "id" | "full_name" | "email"> | null;
};
type BlogCompletionTiming = {
  writerCompletedAt: string | null;
  publisherCompletedAt: string | null;
};

function normalizeCommentRows(rows: Array<Record<string, unknown>>) {
  return rows.map((row) => {
    const authorValue = row.author;
    const author = Array.isArray(authorValue)
      ? ((authorValue[0] ?? null) as BlogCommentRecord["author"])
      : ((authorValue ?? null) as BlogCommentRecord["author"]);

    return {
      id: String(row.id ?? ""),
      blog_id: String(row.blog_id ?? ""),
      comment: String(row.comment ?? ""),
      created_by: String(row.user_id ?? row.created_by ?? ""),
      created_at: String(row.created_at ?? ""),
      author,
    } satisfies BlogCommentRecord;
  });
}

function isMissingBlogCommentUserIdColumnError(error: {
  code?: string | null;
  message?: string | null;
  details?: string | null;
  hint?: string | null;
} | null) {
  if (!error) {
    return false;
  }
  const code = (error.code ?? "").toUpperCase();
  const text =
    `${error.message ?? ""} ${error.details ?? ""} ${error.hint ?? ""}`.toLowerCase();
  return code === "42703" && text.includes("user_id");
}

function isMissingBlogCommentsTableError(error: {
  code?: string | null;
  message?: string | null;
  details?: string | null;
  hint?: string | null;
} | null) {
  if (!error) {
    return false;
  }
  const code = (error.code ?? "").toUpperCase();
  const text =
    `${error.message ?? ""} ${error.details ?? ""} ${error.hint ?? ""}`.toLowerCase();
  return (
    (code === "42P01" || code === "PGRST204" || code === "PGRST205") &&
    (text.includes("blog_comments") ||
      text.includes("schema cache") ||
      text.includes("could not find"))
  );
}


const WRITER_STATUS_ORDER = new Map(
  WRITER_STATUSES.map((status, index) => [status, index])
);
const PUBLISHER_STATUS_ORDER = new Map(
  PUBLISHER_STATUSES.map((status, index) => [status, index])
);
const OVERALL_STATUS_ORDER = new Map(
  OVERALL_STATUSES.map((status, index) => [status, index])
);

type DashboardSortField =
  | "publish_date"
  | "title"
  | "writer"
  | "publisher"
  | "overall_status"
  | "writer_status"
  | "publisher_status";
type RowDensity = "compact" | "comfortable";
type DashboardColumnKey =
  | "title"
  | "site"
  | "writer"
  | "writer_status"
  | "publisher"
  | "publisher_status"
  | "overall_status"
  | "publish_date";

const DASHBOARD_COLUMN_LABELS: Record<DashboardColumnKey, string> = {
  title: "Title",
  site: "Site",
  writer: "Writer",
  writer_status: "Writer Status",
  publisher: "Publisher",
  publisher_status: "Publisher Status",
  overall_status: "Stage",
  publish_date: "Publish Date",
};
const CENTER_ALIGNED_DASHBOARD_COLUMNS: DashboardColumnKey[] = [
  "writer_status",
  "publisher_status",
  "overall_status",
];
const DEFAULT_DASHBOARD_HIDDEN_COLUMNS: DashboardColumnKey[] = ["overall_status"];

const DEFAULT_DASHBOARD_COLUMN_ORDER: DashboardColumnKey[] = [
  "site",
  "title",
  "writer",
  "writer_status",
  "publisher",
  "publisher_status",
  "publish_date",
  "overall_status",
];
const REQUIRED_DASHBOARD_COLUMNS: DashboardColumnKey[] = [
  "site",
  "title",
  "writer",
  "writer_status",
  "publisher",
  "publisher_status",
  "publish_date",
];
const REQUIRED_DASHBOARD_COLUMN_SET = new Set<DashboardColumnKey>(
  REQUIRED_DASHBOARD_COLUMNS
);

const DASHBOARD_COLUMN_VIEW_STORAGE_KEY = "dashboard-column-view:v1";
const DASHBOARD_COLUMN_HIDDEN_STORAGE_KEY = "dashboard-column-hidden:v1";
const DASHBOARD_ROW_DENSITY_STORAGE_KEY = "dashboard-row-density:v1";

const isDashboardColumnKey = (value: string): value is DashboardColumnKey =>
  value in DASHBOARD_COLUMN_LABELS;
const escapeCsvValue = (value: string) => `"${value.replaceAll("\"", "\"\"")}"`;

const normalizeDashboardColumnOrder = (value: unknown): DashboardColumnKey[] => {
  if (!Array.isArray(value)) {
    return DEFAULT_DASHBOARD_COLUMN_ORDER;
  }

  const seen = new Set<DashboardColumnKey>();
  const normalized: DashboardColumnKey[] = [];

  for (const item of value) {
    if (typeof item !== "string" || !isDashboardColumnKey(item) || seen.has(item)) {
      continue;
    }
    seen.add(item);
    normalized.push(item);
  }

  for (const column of DEFAULT_DASHBOARD_COLUMN_ORDER) {
    if (!seen.has(column)) {
      normalized.push(column);
    }
  }

  return normalized;
};

const normalizeDashboardHiddenColumns = (value: unknown): DashboardColumnKey[] => {
  if (!Array.isArray(value)) {
    return DEFAULT_DASHBOARD_HIDDEN_COLUMNS;
  }

  const hiddenColumns: DashboardColumnKey[] = [];
  const seen = new Set<DashboardColumnKey>();
  for (const item of value) {
    if (
      typeof item !== "string" ||
      !isDashboardColumnKey(item) ||
      seen.has(item) ||
      REQUIRED_DASHBOARD_COLUMN_SET.has(item)
    ) {
      continue;
    }
    hiddenColumns.push(item);
    seen.add(item);
  }
  return hiddenColumns;
};

const DASHBOARD_SORT_OPTIONS: Array<{ value: DashboardSortField; label: string }> = [
  { value: "publish_date", label: "Publish Date" },
  { value: "title", label: "Title" },
  { value: "writer", label: "Writer" },
  { value: "publisher", label: "Publisher" },
  { value: "overall_status", label: "Stage" },
  { value: "writer_status", label: "Writer Status" },
  { value: "publisher_status", label: "Publisher Status" },
];
const WRITER_STAGE_DISPLAY_LABELS: Record<WriterStageStatus, string> = {
  not_started: "Draft",
  in_progress: "Writing",
  needs_revision: "Needs Revision",
  completed: "Ready for Publishing",
};
const PUBLISHER_STAGE_DISPLAY_LABELS: Record<PublisherStageStatus, string> = {
  not_started: "Scheduled",
  in_progress: "Publishing",
  completed: "Published",
};
type MetricFilterKey = "scheduled_this_week" | "ready_to_publish" | "delayed";

type DashboardFilterState = {
  search: string;
  siteFilters: BlogSite[];
  statusFilters: OverallBlogStatus[];
  writerFilters: string[];
  publisherFilters: string[];
  writerStatusFilters: WriterStageStatus[];
  publisherStatusFilters: PublisherStageStatus[];
  sortField: DashboardSortField;
  sortDirection: SortDirection;
  rowLimit: TableRowLimit;
};

type SavedDashboardView = {
  id: string;
  name: string;
  state: DashboardFilterState;
  columnOrder: DashboardColumnKey[];
  createdAt: string;
  updatedAt: string;
};
export type QuickQueueKey =
  | "writer_not_started"
  | "writer_in_progress"
  | "writer_needs_revision"
  | "writer_completed_waiting_publish"
  | "backlog_unscheduled"
  | "publisher_not_started"
  | "publisher_in_progress"
  | "publisher_final_review"
  | "publisher_published";

const DASHBOARD_FILTER_STATE_STORAGE_KEY = "dashboard-filter-state:v1";
const DASHBOARD_SAVED_VIEWS_STORAGE_KEY = "dashboard-saved-views:v1";
const DASHBOARD_ACTIVE_SAVED_VIEW_STORAGE_KEY = "dashboard-active-saved-view:v1";
const buildUserScopedStorageKey = (baseKey: string, userId: string | null | undefined) =>
  `${baseKey}:${userId ?? "anonymous"}`;

const DASHBOARD_SORT_FIELD_SET = new Set<DashboardSortField>(
  DASHBOARD_SORT_OPTIONS.map((option) => option.value)
);
const SITE_SET = new Set<BlogSite>(SITES);
const OVERALL_STATUS_SET = new Set<OverallBlogStatus>(OVERALL_STATUSES);
const WRITER_STATUS_SET = new Set<WriterStageStatus>(WRITER_STATUSES);
const PUBLISHER_STATUS_SET = new Set<PublisherStageStatus>(PUBLISHER_STATUSES);
const ROW_LIMIT_SET = new Set<TableRowLimit>(TABLE_ROW_LIMIT_OPTIONS);

const DEFAULT_DASHBOARD_FILTER_STATE: DashboardFilterState = {
  search: "",
  siteFilters: [],
  statusFilters: [],
  writerFilters: [],
  publisherFilters: [],
  writerStatusFilters: [],
  publisherStatusFilters: [],
  sortField: "publish_date",
  sortDirection: "asc",
  rowLimit: DEFAULT_TABLE_ROW_LIMIT,
};

const isSortDirection = (value: unknown): value is SortDirection =>
  value === "asc" || value === "desc";

const normalizeStringArray = (value: unknown) => {
  if (!Array.isArray(value)) {
    return [];
  }
  return Array.from(
    new Set(value.filter((entry): entry is string => typeof entry === "string"))
  );
};

const normalizeDashboardFilterState = (value: unknown): DashboardFilterState => {
  if (!value || typeof value !== "object") {
    return DEFAULT_DASHBOARD_FILTER_STATE;
  }

  const state = value as Partial<DashboardFilterState>;
  const search = typeof state.search === "string" ? state.search : "";
  const siteFilters = normalizeStringArray(state.siteFilters).filter((site): site is BlogSite =>
    SITE_SET.has(site as BlogSite)
  );
  const statusFilters = normalizeStringArray(state.statusFilters).filter(
    (status): status is OverallBlogStatus =>
      OVERALL_STATUS_SET.has(status as OverallBlogStatus)
  );
  const writerFilters = normalizeStringArray(state.writerFilters);
  const publisherFilters = normalizeStringArray(state.publisherFilters);
  const writerStatusFilters = normalizeStringArray(state.writerStatusFilters).filter(
    (status): status is WriterStageStatus =>
      WRITER_STATUS_SET.has(status as WriterStageStatus)
  );
  const publisherStatusFilters = normalizeStringArray(state.publisherStatusFilters).filter(
    (status): status is PublisherStageStatus =>
      PUBLISHER_STATUS_SET.has(status as PublisherStageStatus)
  );

  const sortField =
    typeof state.sortField === "string" &&
    DASHBOARD_SORT_FIELD_SET.has(state.sortField as DashboardSortField)
      ? (state.sortField as DashboardSortField)
      : DEFAULT_DASHBOARD_FILTER_STATE.sortField;

  const sortDirection = isSortDirection(state.sortDirection)
    ? state.sortDirection
    : DEFAULT_DASHBOARD_FILTER_STATE.sortDirection;

  const rowLimit = ROW_LIMIT_SET.has(state.rowLimit as TableRowLimit)
    ? (state.rowLimit as TableRowLimit)
    : DEFAULT_DASHBOARD_FILTER_STATE.rowLimit;

  return {
    search,
    siteFilters,
    statusFilters,
    writerFilters,
    publisherFilters,
    writerStatusFilters,
    publisherStatusFilters,
    sortField,
    sortDirection,
    rowLimit,
  };
};

const normalizeSavedViews = (value: unknown): SavedDashboardView[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  const seenIds = new Set<string>();
  const normalizedViews: SavedDashboardView[] = [];

  for (const entry of value) {
    if (!entry || typeof entry !== "object") {
      continue;
    }
    const candidate = entry as Partial<SavedDashboardView>;
    if (typeof candidate.id !== "string" || candidate.id.trim() === "") {
      continue;
    }
    if (seenIds.has(candidate.id)) {
      continue;
    }
    const name =
      typeof candidate.name === "string" && candidate.name.trim().length > 0
        ? candidate.name.trim()
        : "Untitled View";

    normalizedViews.push({
      id: candidate.id,
      name,
      state: normalizeDashboardFilterState(candidate.state),
      columnOrder: normalizeDashboardColumnOrder(candidate.columnOrder),
      createdAt:
        typeof candidate.createdAt === "string"
          ? candidate.createdAt
          : new Date().toISOString(),
      updatedAt:
        typeof candidate.updatedAt === "string"
          ? candidate.updatedAt
          : new Date().toISOString(),
    });
    seenIds.add(candidate.id);
  }

  return normalizedViews.slice(0, 50);
};

export default function DashboardPage() {
  const router = useRouter();
  const { hasPermission, profile, user } = useAuth();
  const { showError, showSuccess, showWarning } = useSystemFeedback();
  const permissionContract = useMemo(
    () => createUiPermissionContract(hasPermission),
    [hasPermission]
  );
  const canCreateBlog = permissionContract.canCreateBlog;
  const canExportCsv = permissionContract.canExportCsv;
  const canExportSelectedCsv = permissionContract.canExportSelectedCsv;
  const canChangeWriterAssignment = permissionContract.canChangeWriterAssignment;
  const canChangePublisherAssignment = permissionContract.canChangePublisherAssignment;
  const canEditScheduledDate = permissionContract.canEditScheduledPublishDate;
  const canEditDisplayDate = permissionContract.canEditDisplayPublishDate;
  const canEditWritingStage = permissionContract.canEditWriterWorkflow;
  const canEditPublishingStage = permissionContract.canEditPublisherWorkflow;
  const canDeleteBlog = permissionContract.canDeleteBlog;
  const canCreateComments = permissionContract.canCreateComment;
  const canRunBulkActions =
    canChangeWriterAssignment ||
    canChangePublisherAssignment ||
    canEditWritingStage ||
    canEditPublishingStage ||
    canDeleteBlog;
  const canSelectRows = canRunBulkActions || canExportSelectedCsv;
  const [blogs, setBlogs] = useState<BlogRecord[]>([]);
  const [assignableUsers, setAssignableUsers] = useState<
    Array<Pick<ProfileRecord, "id" | "full_name" | "email">>
  >([]);
  const [search, setSearch] = useState("");
  const [siteFilters, setSiteFilters] = useState<BlogSite[]>([]);
  const [statusFilters, setStatusFilters] = useState<OverallBlogStatus[]>([]);
  const [writerFilters, setWriterFilters] = useState<string[]>([]);
  const [publisherFilters, setPublisherFilters] = useState<string[]>([]);
  const [writerStatusFilters, setWriterStatusFilters] = useState<WriterStageStatus[]>([]);
  const [publisherStatusFilters, setPublisherStatusFilters] = useState<
    PublisherStageStatus[]
  >([]);
  const [sortField, setSortField] = useState<DashboardSortField>("publish_date");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [columnOrder, setColumnOrder] = useState<DashboardColumnKey[]>(
    DEFAULT_DASHBOARD_COLUMN_ORDER
  );
  const [hiddenColumns, setHiddenColumns] = useState<DashboardColumnKey[]>(
    DEFAULT_DASHBOARD_HIDDEN_COLUMNS
  );
  const [savedViews, setSavedViews] = useState<SavedDashboardView[]>([]);
  const [activeSavedViewId, setActiveSavedViewId] = useState<string | null>(null);
  const [rowDensity, setRowDensity] = useState<RowDensity>("comfortable");
  const [rowLimit, setRowLimit] = useState<TableRowLimit>(DEFAULT_TABLE_ROW_LIMIT);
  const [currentPage, setCurrentPage] = useState(1);
  const [staleDraftDays, setStaleDraftDays] = useState(10);
  const [now] = useState(() => new Date());
  const [isLoading, setIsLoading] = useState(true);
  const [isBulkSaving, setIsBulkSaving] = useState(false);
  const [selectedBlogIds, setSelectedBlogIds] = useState<string[]>([]);
  const [bulkWriterId, setBulkWriterId] = useState("");
  const [bulkPublisherId, setBulkPublisherId] = useState("");
  const [bulkWriterStatus, setBulkWriterStatus] = useState<WriterStageStatus | "">("");
  const [bulkPublisherStatus, setBulkPublisherStatus] = useState<PublisherStageStatus | "">("");
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [activeBlogId, setActiveBlogId] = useState<string | null>(null);
  const [panelHistory, setPanelHistory] = useState<BlogHistoryRecord[]>([]);
  const [panelComments, setPanelComments] = useState<BlogCommentRecord[]>([]);
  const [panelCommentDraft, setPanelCommentDraft] = useState("");
  const [panelError, setPanelError] = useState<string | null>(null);
  const [isPanelLoading, setIsPanelLoading] = useState(false);
  const [isPanelCommentSaving, setIsPanelCommentSaving] = useState(false);
  const [activeQuickQueue, setActiveQuickQueue] = useState<QuickQueueKey | null>(null);
  const [activeMetricFilter, setActiveMetricFilter] = useState<MetricFilterKey | null>(null);
  const [isApplyingFilterFeedback, setIsApplyingFilterFeedback] = useState(false);
  const [isEditColumnsOpen, setIsEditColumnsOpen] = useState(false);
  const [hasLoadedLocalState, setHasLoadedLocalState] = useState(false);
  const [, setCompletionTimingsByBlog] = useState<
    Record<string, BlogCompletionTiming>
  >({});
  const columnEditorRef = useRef<HTMLDivElement | null>(null);
  const tableContainerRef = useRef<HTMLDivElement | null>(null);
  const filterStateStorageKey = useMemo(
    () => buildUserScopedStorageKey(DASHBOARD_FILTER_STATE_STORAGE_KEY, profile?.id),
    [profile?.id]
  );
  const savedViewsStorageKey = useMemo(
    () => buildUserScopedStorageKey(DASHBOARD_SAVED_VIEWS_STORAGE_KEY, profile?.id),
    [profile?.id]
  );
  const activeSavedViewStorageKey = useMemo(
    () => buildUserScopedStorageKey(DASHBOARD_ACTIVE_SAVED_VIEW_STORAGE_KEY, profile?.id),
    [profile?.id]
  );
  const columnViewStorageKey = useMemo(
    () => buildUserScopedStorageKey(DASHBOARD_COLUMN_VIEW_STORAGE_KEY, profile?.id),
    [profile?.id]
  );
  const columnHiddenStorageKey = useMemo(
    () => buildUserScopedStorageKey(DASHBOARD_COLUMN_HIDDEN_STORAGE_KEY, profile?.id),
    [profile?.id]
  );
  const rowDensityStorageKey = useMemo(
    () => buildUserScopedStorageKey(DASHBOARD_ROW_DENSITY_STORAGE_KEY, profile?.id),
    [profile?.id]
  );
  const closeOpenDashboardMenus = useCallback(() => {
    document.querySelectorAll<HTMLDetailsElement>("details[open]").forEach((menu) => {
      menu.open = false;
    });
  }, []);

  useEffect(() => {
    if (!error) {
      return;
    }
    showError(error);
  }, [error, showError]);

  useEffect(() => {
    if (!successMessage) {
      return;
    }
    showSuccess(successMessage);
  }, [showSuccess, successMessage]);

  useEffect(() => {
    if (!panelError) {
      return;
    }
    showError(panelError);
  }, [panelError, showError]);

  const applyFilterState = useCallback((nextState: DashboardFilterState) => {
    setSearch(nextState.search);
    setSiteFilters(nextState.siteFilters);
    setStatusFilters(nextState.statusFilters);
    setWriterFilters(nextState.writerFilters);
    setPublisherFilters(nextState.publisherFilters);
    setWriterStatusFilters(nextState.writerStatusFilters);
    setPublisherStatusFilters(nextState.publisherStatusFilters);
    setSortField(nextState.sortField);
    setSortDirection(nextState.sortDirection);
    setRowLimit(nextState.rowLimit);
    setCurrentPage(1);
  }, []);

  const buildCurrentFilterState = useCallback(
    (): DashboardFilterState => ({
      search,
      siteFilters,
      statusFilters,
      writerFilters,
      publisherFilters,
      writerStatusFilters,
      publisherStatusFilters,
      sortField,
      sortDirection,
      rowLimit,
    }),
    [
      publisherFilters,
      publisherStatusFilters,
      rowLimit,
      search,
      siteFilters,
      sortDirection,
      sortField,
      statusFilters,
      writerFilters,
      writerStatusFilters,
    ]
  );

  const loadData = useCallback(async () => {
    const supabase = getSupabaseBrowserClient();
    setIsLoading(true);
    setError(null);
    const fetchBlogs = async () => {
      let { data, error } = await supabase
        .from("blogs")
        .select(BLOG_SELECT_WITH_DATES_WITH_RELATIONS)
        .eq("is_archived", false)
        .order("scheduled_publish_date", { ascending: true, nullsFirst: false })
        .order("updated_at", { ascending: false });
      if (isMissingBlogDateColumnsError(error)) {
        const fallback = await supabase
          .from("blogs")
          .select(BLOG_SELECT_LEGACY_WITH_RELATIONS)
          .eq("is_archived", false)
          .order("target_publish_date", { ascending: true, nullsFirst: false })
          .order("updated_at", { ascending: false });
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

    const nextBlogs = normalizeBlogRows(
      (blogsData ?? []) as Array<Record<string, unknown>>
    ) as BlogRecord[];
    setBlogs(nextBlogs);

    const nextBlogIds = nextBlogs.map((blog) => blog.id);
    if (nextBlogIds.length > 0) {
      const { data: completionEvents, error: completionEventsError } = await supabase
        .from("blog_assignment_history")
        .select("blog_id,field_name,new_value,changed_at")
        .in("blog_id", nextBlogIds)
        .in("field_name", ["writer_status", "publisher_status"])
        .eq("new_value", "completed");

      if (!completionEventsError) {
        const completionMap: Record<string, BlogCompletionTiming> = {};
        for (const row of (completionEvents ?? []) as Array<Record<string, unknown>>) {
          const blogId = typeof row.blog_id === "string" ? row.blog_id : null;
          const fieldName = typeof row.field_name === "string" ? row.field_name : null;
          const changedAt = typeof row.changed_at === "string" ? row.changed_at : null;
          if (!blogId || !fieldName || !changedAt) {
            continue;
          }

          const existing = completionMap[blogId] ?? {
            writerCompletedAt: null,
            publisherCompletedAt: null,
          };
          if (
            fieldName === "writer_status" &&
            (!existing.writerCompletedAt || changedAt < existing.writerCompletedAt)
          ) {
            existing.writerCompletedAt = changedAt;
          }
          if (
            fieldName === "publisher_status" &&
            (!existing.publisherCompletedAt || changedAt < existing.publisherCompletedAt)
          ) {
            existing.publisherCompletedAt = changedAt;
          }
          completionMap[blogId] = existing;
        }
        setCompletionTimingsByBlog(completionMap);
      } else {
        setCompletionTimingsByBlog({});
      }
    } else {
      setCompletionTimingsByBlog({});
    }
    if (settingsData?.stale_draft_days) {
      setStaleDraftDays(settingsData.stale_draft_days);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  useEffect(() => {
    if (!canChangeWriterAssignment && !canChangePublisherAssignment) {
      setAssignableUsers([]);
      return;
    }

    const loadUsers = async () => {
      const supabase = getSupabaseBrowserClient();
      const { data, error: usersError } = await supabase
        .from("profiles")
        .select("id,full_name,email")
        .eq("is_active", true)
        .order("full_name", { ascending: true });

      if (usersError) {
        setError(usersError.message);
        return;
      }
      setAssignableUsers((data ?? []) as Array<Pick<ProfileRecord, "id" | "full_name" | "email">>);
    };

    void loadUsers();
  }, [canChangePublisherAssignment, canChangeWriterAssignment]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const savedColumnView = window.localStorage.getItem(columnViewStorageKey);
    if (savedColumnView) {
      try {
        const parsedColumnOrder = JSON.parse(savedColumnView) as unknown;
        setColumnOrder(normalizeDashboardColumnOrder(parsedColumnOrder));
      } catch {
        setColumnOrder(DEFAULT_DASHBOARD_COLUMN_ORDER);
      }
    }
    const savedRowDensity = window.localStorage.getItem(rowDensityStorageKey);
    if (savedRowDensity === "compact" || savedRowDensity === "comfortable") {
      setRowDensity(savedRowDensity);
    }

    const savedHiddenColumns = window.localStorage.getItem(columnHiddenStorageKey);
    if (savedHiddenColumns) {
      try {
        const parsedHiddenColumns = JSON.parse(savedHiddenColumns) as unknown;
        setHiddenColumns(normalizeDashboardHiddenColumns(parsedHiddenColumns));
      } catch {
        setHiddenColumns(DEFAULT_DASHBOARD_HIDDEN_COLUMNS);
      }
    }
  }, [columnHiddenStorageKey, columnViewStorageKey, rowDensityStorageKey]);
  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    window.localStorage.setItem(rowDensityStorageKey, rowDensity);
  }, [rowDensity, rowDensityStorageKey]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const savedFilterState = window.localStorage.getItem(filterStateStorageKey);
    if (savedFilterState) {
      try {
        const parsedFilterState = JSON.parse(savedFilterState) as unknown;
        applyFilterState(normalizeDashboardFilterState(parsedFilterState));
      } catch {
        applyFilterState(DEFAULT_DASHBOARD_FILTER_STATE);
      }
    }

    const savedViewsRaw = window.localStorage.getItem(savedViewsStorageKey);
    if (savedViewsRaw) {
      try {
        const parsedSavedViews = JSON.parse(savedViewsRaw) as unknown;
        setSavedViews(normalizeSavedViews(parsedSavedViews));
      } catch {
        setSavedViews([]);
      }
    }

    const activeSavedViewIdRaw = window.localStorage.getItem(activeSavedViewStorageKey);
    if (activeSavedViewIdRaw) {
      setActiveSavedViewId(activeSavedViewIdRaw);
    }
    setHasLoadedLocalState(true);
  }, [activeSavedViewStorageKey, applyFilterState, filterStateStorageKey, savedViewsStorageKey]);

  useEffect(() => {
    if (!hasLoadedLocalState) {
      return;
    }
    if (typeof window === "undefined") {
      return;
    }
    window.localStorage.setItem(
      filterStateStorageKey,
      JSON.stringify(buildCurrentFilterState())
    );
  }, [buildCurrentFilterState, filterStateStorageKey, hasLoadedLocalState]);

  useEffect(() => {
    if (!hasLoadedLocalState) {
      return;
    }
    if (typeof window === "undefined") {
      return;
    }
    window.localStorage.setItem(
      savedViewsStorageKey,
      JSON.stringify(savedViews)
    );
  }, [hasLoadedLocalState, savedViews, savedViewsStorageKey]);

  useEffect(() => {
    if (!hasLoadedLocalState) {
      return;
    }
    if (typeof window === "undefined") {
      return;
    }
    if (!activeSavedViewId) {
      window.localStorage.removeItem(activeSavedViewStorageKey);
      return;
    }
    window.localStorage.setItem(
      activeSavedViewStorageKey,
      activeSavedViewId
    );
  }, [activeSavedViewStorageKey, activeSavedViewId, hasLoadedLocalState]);

  useEffect(() => {
    if (!activeSavedViewId) {
      return;
    }
    if (!savedViews.some((view) => view.id === activeSavedViewId)) {
      setActiveSavedViewId(null);
    }
  }, [activeSavedViewId, savedViews]);

  useEffect(() => {
    const existingIds = new Set(blogs.map((blog) => blog.id));
    setSelectedBlogIds((previous) => previous.filter((id) => existingIds.has(id)));
  }, [blogs]);

  const quickQueueCounts = useMemo(() => {
    const countBy = (predicate: (blog: BlogRecord) => boolean) =>
      blogs.filter(predicate).length;

    return {
      writerNotStarted: countBy((blog) => blog.writer_status === "not_started"),
      writerInProgress: countBy((blog) => blog.writer_status === "in_progress"),
      writerNeedsRevision: countBy((blog) => blog.writer_status === "needs_revision"),
      writerCompletedWaitingPublishing: countBy(
        (blog) =>
          blog.writer_status === "completed" && blog.publisher_status === "not_started"
      ),
      backlogUnscheduledIdeas: countBy(
        (blog) =>
          blog.writer_status === "not_started" &&
          getBlogScheduledDate(blog) === null
      ),
      publisherNotStarted: countBy((blog) => blog.publisher_status === "not_started"),
      publisherInProgress: countBy((blog) => blog.publisher_status === "in_progress"),
      publisherFinalReview: countBy(
        (blog) =>
          blog.writer_status === "completed" && blog.publisher_status === "in_progress"
      ),
      publisherPublished: countBy((blog) => blog.publisher_status === "completed"),
    };
  }, [blogs]);


  useEffect(() => {
    if (!activeBlogId) {
      return;
    }
    if (!blogs.some((blog) => blog.id === activeBlogId)) {
      setActiveBlogId(null);
      setPanelHistory([]);
      setPanelComments([]);
      setPanelCommentDraft("");
      setPanelError(null);
    }
  }, [activeBlogId, blogs]);


  useEffect(() => {
    if (!isEditColumnsOpen) {
      return;
    }

    const handleOutsideClick = (event: MouseEvent) => {
      if (!columnEditorRef.current?.contains(event.target as Node)) {
        setIsEditColumnsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, [isEditColumnsOpen]);

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      const targetNode = event.target as Node;
      document.querySelectorAll<HTMLDetailsElement>("details[open]").forEach((menu) => {
        if (!menu.contains(targetNode)) {
          menu.open = false;
        }
      });
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeOpenDashboardMenus();
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("keydown", handleEscape);
    };
  }, [closeOpenDashboardMenus]);

  const writerOptions = useMemo(
    () =>
      Array.from(
        new Map(
          blogs
            .filter((blog) => blog.writer)
            .map((blog) => [blog.writer!.id, blog.writer!])
        ).values()
      ),
    [blogs]
  );
  const publisherOptions = useMemo(
    () =>
      Array.from(
        new Map(
          blogs
            .filter((blog) => blog.publisher)
            .map((blog) => [blog.publisher!.id, blog.publisher!])
        ).values()
      ),
    [blogs]
  );

  const siteFilterOptions = useMemo(
    () => SITES.map((site) => ({ value: site, label: site })),
    []
  );

  const overallStatusFilterOptions = useMemo(
    () =>
      OVERALL_STATUSES.map((status) => ({
        value: status,
        label: STATUS_LABELS[status],
      })),
    []
  );

  const writerFilterOptions = useMemo(
    () =>
      writerOptions.map((writer) => ({
        value: writer.id,
        label: writer.full_name,
      })),
    [writerOptions]
  );

  const publisherFilterOptions = useMemo(
    () =>
      publisherOptions.map((publisher) => ({
        value: publisher.id,
        label: publisher.full_name,
      })),
    [publisherOptions]
  );

  const writerStatusFilterOptions = useMemo(
    () =>
      WRITER_STATUSES.map((status) => ({
        value: status,
        label: WRITER_STATUS_LABELS[status],
      })),
    []
  );

  const publisherStatusFilterOptions = useMemo(
    () =>
      PUBLISHER_STATUSES.map((status) => ({
        value: status,
        label: PUBLISHER_STATUS_LABELS[status],
      })),
    []
  );
  const filteredBlogs = useMemo(() => {

    const matchesQuickQueue = (blog: BlogRecord) => {
      if (!activeQuickQueue) {
        return true;
      }
      if (activeQuickQueue === "writer_not_started") {
        return blog.writer_status === "not_started";
      }
      if (activeQuickQueue === "writer_in_progress") {
        return blog.writer_status === "in_progress";
      }
      if (activeQuickQueue === "writer_needs_revision") {
        return blog.writer_status === "needs_revision";
      }
      if (activeQuickQueue === "writer_completed_waiting_publish") {
        return (
          blog.writer_status === "completed" &&
          blog.publisher_status === "not_started"
        );
      }
      if (activeQuickQueue === "backlog_unscheduled") {
        return (
          blog.writer_status === "not_started" &&
          getBlogScheduledDate(blog) === null
        );
      }
      if (activeQuickQueue === "publisher_not_started") {
        return blog.publisher_status === "not_started";
      }
      if (activeQuickQueue === "publisher_in_progress") {
        return blog.publisher_status === "in_progress";
      }
      if (activeQuickQueue === "publisher_final_review") {
        return (
          blog.writer_status === "completed" &&
          blog.publisher_status === "in_progress"
        );
      }
      return blog.publisher_status === "completed";
    };
    const matchesMetricFilter = (blog: BlogRecord) => {
      if (!activeMetricFilter) {
        return true;
      }

      if (activeMetricFilter === "ready_to_publish") {
        return blog.overall_status === "ready_to_publish";
      }

      if (activeMetricFilter === "delayed") {
        const scheduledDate = getBlogScheduledDate(blog);
        const todayKey = format(new Date(), "yyyy-MM-dd");
        return (
          scheduledDate !== null &&
          scheduledDate < todayKey &&
          blog.overall_status !== "published"
        );
      }

      const todayDate = new Date();
      const weekStart = new Date(todayDate);
      weekStart.setDate(todayDate.getDate() - todayDate.getDay());
      weekStart.setHours(0, 0, 0, 0);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      weekEnd.setHours(23, 59, 59, 999);
      const scheduledDate = getBlogScheduledDate(blog);
      if (!scheduledDate) {
        return false;
      }
      const scheduledTime = new Date(`${scheduledDate}T00:00:00`).getTime();
      return scheduledTime >= weekStart.getTime() && scheduledTime <= weekEnd.getTime();
    };
    return blogs.filter((blog) => {
      const normalizedSearch = search.toLowerCase().trim();
      const searchHaystack = [
        blog.title,
        blog.writer?.full_name ?? "",
        blog.publisher?.full_name ?? "",
        blog.site,
        blog.live_url ?? "",
      ]
        .join(" ")
        .toLowerCase();
      const matchesSearch =
        normalizedSearch.length === 0 || searchHaystack.includes(normalizedSearch);
      const matchesSite =
        siteFilters.length === 0 || siteFilters.includes(blog.site);
      const matchesStatus =
        statusFilters.length === 0 || statusFilters.includes(blog.overall_status);
      const matchesWriter =
        writerFilters.length === 0 ||
        (blog.writer_id !== null && writerFilters.includes(blog.writer_id));
      const matchesPublisher =
        publisherFilters.length === 0 ||
        (blog.publisher_id !== null && publisherFilters.includes(blog.publisher_id));
      const matchesWriterStatus =
        writerStatusFilters.length === 0 ||
        writerStatusFilters.includes(blog.writer_status);
      const matchesPublisherStatus =
        publisherStatusFilters.length === 0 ||
        publisherStatusFilters.includes(blog.publisher_status);
      return (
        matchesQuickQueue(blog) &&
        matchesMetricFilter(blog) &&
        matchesSearch &&
        matchesSite &&
        matchesStatus &&
        matchesWriter &&
        matchesPublisher &&
        matchesWriterStatus &&
        matchesPublisherStatus
      );
    });
  }, [
    blogs,
    publisherFilters,
    publisherStatusFilters,
    search,
    siteFilters,
    statusFilters,
    activeQuickQueue,
    activeMetricFilter,
    writerFilters,
    writerStatusFilters,
  ]);

  const sortedBlogs = useMemo(() => {
    const collator = new Intl.Collator(undefined, { sensitivity: "base" });
    const directionMultiplier = sortDirection === "asc" ? 1 : -1;

    return [...filteredBlogs].sort((left, right) => {
      let compareResult = 0;

      if (sortField === "publish_date") {
        const leftDate = getBlogPublishDate(left);
        const rightDate = getBlogPublishDate(right);
        if (!leftDate && !rightDate) {
          compareResult = 0;
        } else if (!leftDate) {
          compareResult = 1;
        } else if (!rightDate) {
          compareResult = -1;
        } else {
          compareResult = leftDate.localeCompare(rightDate);
        }
      } else if (sortField === "title") {
        compareResult = collator.compare(left.title, right.title);
      } else if (sortField === "writer") {
        const leftWriter = left.writer?.full_name ?? "";
        const rightWriter = right.writer?.full_name ?? "";
        if (!leftWriter && !rightWriter) {
          compareResult = 0;
        } else if (!leftWriter) {
          compareResult = 1;
        } else if (!rightWriter) {
          compareResult = -1;
        } else {
          compareResult = collator.compare(leftWriter, rightWriter);
        }
      } else if (sortField === "publisher") {
        const leftPublisher = left.publisher?.full_name ?? "";
        const rightPublisher = right.publisher?.full_name ?? "";
        if (!leftPublisher && !rightPublisher) {
          compareResult = 0;
        } else if (!leftPublisher) {
          compareResult = 1;
        } else if (!rightPublisher) {
          compareResult = -1;
        } else {
          compareResult = collator.compare(leftPublisher, rightPublisher);
        }
      } else if (sortField === "overall_status") {
        compareResult =
          (OVERALL_STATUS_ORDER.get(left.overall_status) ?? Number.MAX_SAFE_INTEGER) -
          (OVERALL_STATUS_ORDER.get(right.overall_status) ?? Number.MAX_SAFE_INTEGER);
      } else if (sortField === "writer_status") {
        compareResult =
          (WRITER_STATUS_ORDER.get(left.writer_status) ?? Number.MAX_SAFE_INTEGER) -
          (WRITER_STATUS_ORDER.get(right.writer_status) ?? Number.MAX_SAFE_INTEGER);
      } else if (sortField === "publisher_status") {
        compareResult =
          (PUBLISHER_STATUS_ORDER.get(left.publisher_status) ?? Number.MAX_SAFE_INTEGER) -
          (PUBLISHER_STATUS_ORDER.get(right.publisher_status) ?? Number.MAX_SAFE_INTEGER);
      }

      return compareResult * directionMultiplier;
    });
  }, [filteredBlogs, sortDirection, sortField]);

  const pageCount = useMemo(
    () => getTablePageCount(sortedBlogs.length, rowLimit),
    [rowLimit, sortedBlogs.length]
  );

  useEffect(() => {
    setCurrentPage((previous) => Math.min(previous, pageCount));
  }, [pageCount]);

  useEffect(() => {
    setCurrentPage(1);
  }, [
    activeMetricFilter,
    activeQuickQueue,
    publisherFilters,
    publisherStatusFilters,
    rowLimit,
    search,
    siteFilters,
    sortDirection,
    sortField,
    statusFilters,
    writerFilters,
    writerStatusFilters,
  ]);
  useEffect(() => {
    if (!tableContainerRef.current) {
      return;
    }
    tableContainerRef.current.scrollTop = 0;
  }, [
    activeMetricFilter,
    activeQuickQueue,
    publisherFilters,
    publisherStatusFilters,
    rowLimit,
    search,
    siteFilters,
    sortDirection,
    sortField,
    statusFilters,
    writerFilters,
    writerStatusFilters,
  ]);
  useEffect(() => {
    if (isLoading) {
      return;
    }
    setIsApplyingFilterFeedback(true);
    const timeoutId = window.setTimeout(() => {
      setIsApplyingFilterFeedback(false);
    }, 180);
    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [
    activeMetricFilter,
    activeQuickQueue,
    currentPage,
    isLoading,
    publisherFilters,
    publisherStatusFilters,
    rowLimit,
    search,
    siteFilters,
    sortDirection,
    sortField,
    statusFilters,
    writerFilters,
    writerStatusFilters,
  ]);

  const pagedBlogs = useMemo(
    () => getTablePageRows(sortedBlogs, currentPage, rowLimit),
    [currentPage, rowLimit, sortedBlogs]
  );

  const assignmentOptions = useMemo(
    () =>
      assignableUsers.length > 0
        ? assignableUsers
        : Array.from(
            new Map(
              [...writerOptions, ...publisherOptions].map((user) => [
                user.id,
                {
                  id: user.id,
                  full_name: user.full_name,
                  email: user.email,
                },
              ])
            ).values()
          ),
    [assignableUsers, publisherOptions, writerOptions]
  );


  const focusStripMetrics = useMemo(() => {
    const todayDate = new Date();
    const weekStart = new Date(todayDate);
    weekStart.setDate(todayDate.getDate() - todayDate.getDay());
    weekStart.setHours(0, 0, 0, 0);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);
    const todayKey = format(todayDate, "yyyy-MM-dd");

    const scheduledThisWeek = blogs.filter((blog) => {
      const scheduledDate = getBlogScheduledDate(blog);
      if (!scheduledDate) {
        return false;
      }
      const scheduledTime = new Date(`${scheduledDate}T00:00:00`).getTime();
      return scheduledTime >= weekStart.getTime() && scheduledTime <= weekEnd.getTime();
    }).length;

    const readyToPublish = blogs.filter(
      (blog) => blog.overall_status === "ready_to_publish"
    ).length;

    const delayed = blogs.filter((blog) => {
      const scheduledDate = getBlogScheduledDate(blog);
      return (
        scheduledDate !== null &&
        scheduledDate < todayKey &&
        blog.overall_status !== "published"
      );
    }).length;

    return {
      scheduledThisWeek,
      readyToPublish,
      delayed,
    };
  }, [blogs]);

  const recentPublishedBlogs = useMemo(
    () =>
      [...blogs]
        .filter((blog) => blog.overall_status === "published")
        .sort((left, right) => {
          const leftDate = left.actual_published_at ?? left.published_at ?? "";
          const rightDate = right.actual_published_at ?? right.published_at ?? "";
          return rightDate.localeCompare(leftDate);
        })
        .slice(0, 3),
    [blogs]
  );

  const mostRecentPublishedBlog = recentPublishedBlogs[0] ?? null;

  const visibleBlogIds = useMemo(() => pagedBlogs.map((blog) => blog.id), [pagedBlogs]);
  const activeBlogIndex = useMemo(
    () => sortedBlogs.findIndex((blog) => blog.id === activeBlogId),
    [activeBlogId, sortedBlogs]
  );
  const headerCellClass = rowDensity === "compact" ? "px-3 py-1.5" : "px-3 py-3";
  const bodyCellClass = rowDensity === "compact" ? "px-3 py-1.5" : "px-3 py-2.5";
  const hiddenColumnSet = useMemo(() => new Set(hiddenColumns), [hiddenColumns]);
  const visibleColumnOrder = useMemo(
    () => {
      const visibleColumns = columnOrder.filter((column) => !hiddenColumnSet.has(column));
      const missingRequiredColumns = REQUIRED_DASHBOARD_COLUMNS.filter(
        (column) => !visibleColumns.includes(column)
      );
      const nextVisibleColumns = [...visibleColumns, ...missingRequiredColumns];
      return nextVisibleColumns.length > 0
        ? nextVisibleColumns
        : [...REQUIRED_DASHBOARD_COLUMNS];
    },
    [columnOrder, hiddenColumnSet]
  );
  const selectedIdSet = useMemo(() => new Set(selectedBlogIds), [selectedBlogIds]);
  const selectedBlogs = useMemo(
    () => blogs.filter((blog) => selectedIdSet.has(blog.id)),
    [blogs, selectedIdSet]
  );
  const allVisibleSelected =
    visibleBlogIds.length > 0 &&
    visibleBlogIds.every((id) => selectedIdSet.has(id));
  const hasPendingBulkChanges =
    Boolean(bulkWriterId) ||
    Boolean(bulkPublisherId) ||
    Boolean(bulkWriterStatus) ||
    Boolean(bulkPublisherStatus);

  const handleToggleAllVisible = (checked: boolean) => {
    if (!canSelectRows) {
      return;
    }
    if (!checked) {
      setSelectedBlogIds((previous) =>
        previous.filter((id) => !visibleBlogIds.includes(id))
      );
      return;
    }

    setSelectedBlogIds((previous) =>
      Array.from(new Set([...previous, ...visibleBlogIds]))
    );
  };

  const handleToggleSingle = (blogId: string, checked: boolean) => {
    if (!canSelectRows) {
      return;
    }
    if (checked) {
      setSelectedBlogIds((previous) => Array.from(new Set([...previous, blogId])));
      return;
    }
    setSelectedBlogIds((previous) => previous.filter((id) => id !== blogId));
  };

  const clearBulkUiState = () => {
    setSelectedBlogIds([]);
    setBulkWriterId("");
    setBulkPublisherId("");
    setBulkWriterStatus("");
    setBulkPublisherStatus("");
  };
  const moveColumn = (column: DashboardColumnKey, direction: -1 | 1) => {
    setColumnOrder((previous) => {
      const currentIndex = previous.indexOf(column);
      if (currentIndex < 0) {
        return previous;
      }

      const nextIndex = currentIndex + direction;
      if (nextIndex < 0 || nextIndex >= previous.length) {
        return previous;
      }

      const nextOrder = [...previous];
      [nextOrder[currentIndex], nextOrder[nextIndex]] = [
        nextOrder[nextIndex],
        nextOrder[currentIndex],
      ];
      return nextOrder;
    });
  };
  const toggleColumnVisibility = (column: DashboardColumnKey) => {
    if (REQUIRED_DASHBOARD_COLUMN_SET.has(column)) {
      return;
    }
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

  const saveColumnView = () => {
    if (typeof window === "undefined") {
      return;
    }
    window.localStorage.setItem(
      columnViewStorageKey,
      JSON.stringify(columnOrder)
    );
    window.localStorage.setItem(
      columnHiddenStorageKey,
      JSON.stringify(hiddenColumns)
    );
    setError(null);
    setSuccessMessage("Column view saved.");
  };

  const resetColumnView = () => {
    setColumnOrder(DEFAULT_DASHBOARD_COLUMN_ORDER);
    setHiddenColumns(DEFAULT_DASHBOARD_HIDDEN_COLUMNS);
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(columnViewStorageKey);
      window.localStorage.removeItem(columnHiddenStorageKey);
    }
    setError(null);
    setSuccessMessage("Column view reset to default.");
  };

  const applySavedView = useCallback(
    (view: SavedDashboardView) => {
      applyFilterState(view.state);
      setColumnOrder(view.columnOrder);
      setActiveSavedViewId(view.id);
      setError(null);
      setSuccessMessage(`Applied saved view "${view.name}".`);
    },
    [applyFilterState]
  );

  const resetDashboardFilters = useCallback(() => {
    applyFilterState(DEFAULT_DASHBOARD_FILTER_STATE);
    setActiveQuickQueue(null);
    setActiveMetricFilter(null);
    setActiveSavedViewId(null);
    setError(null);
    setSuccessMessage("Dashboard filters reset.");
  }, [applyFilterState]);

  const applyQuickQueuePreset = useCallback((queue: QuickQueueKey) => {
    setActiveQuickQueue(queue);
    setActiveMetricFilter(null);
    setActiveSavedViewId(null);
    setSearch("");
    setSiteFilters([]);
    setStatusFilters([]);
    setWriterFilters([]);
    setPublisherFilters([]);
    setWriterStatusFilters([]);
    setPublisherStatusFilters([]);
    setSortField("publish_date");
    setSortDirection(queue === "publisher_published" ? "desc" : "asc");
    setCurrentPage(1);
  }, []);
  const clearAllFilters = useCallback(() => {
    resetDashboardFilters();
    setSuccessMessage("All filters cleared.");
  }, [resetDashboardFilters]);
  const copyQuickActionValue = useCallback(
    async (value: string | null | undefined, label: "title" | "url") => {
      const normalizedValue = value?.trim() ?? "";
      if (normalizedValue.length === 0) {
        setError(label === "url" ? "This blog does not have a URL yet." : "Nothing to copy.");
        setSuccessMessage(null);
        return;
      }

      try {
        if (
          typeof navigator !== "undefined" &&
          navigator.clipboard &&
          typeof navigator.clipboard.writeText === "function"
        ) {
          await navigator.clipboard.writeText(normalizedValue);
        } else {
          const textArea = document.createElement("textarea");
          textArea.value = normalizedValue;
          textArea.style.position = "fixed";
          textArea.style.opacity = "0";
          document.body.appendChild(textArea);
          textArea.focus();
          textArea.select();
          document.execCommand("copy");
          document.body.removeChild(textArea);
        }
        setError(null);
        setSuccessMessage(label === "url" ? "Copied URL." : "Copied title.");
      } catch {
        setError("Could not copy to clipboard.");
        setSuccessMessage(null);
      }
    },
    []
  );
  const activeFilterPills = useMemo(
    () =>
      [
        search.trim()
          ? {
              id: "search",
              label: `Search: ${search.trim()}`,
              onRemove: () => {
                setSearch("");
              },
            }
          : null,
        ...siteFilters.map((site) => ({
          id: `site-${site}`,
          label: `Site: ${site}`,
          onRemove: () => {
            setSiteFilters((previous) => previous.filter((value) => value !== site));
          },
        })),
        ...writerFilters.map((writerId) => ({
          id: `writer-${writerId}`,
          label: `Writer: ${
            writerOptions.find((writer) => writer.id === writerId)?.full_name ?? writerId
          }`,
          onRemove: () => {
            setWriterFilters((previous) => previous.filter((value) => value !== writerId));
          },
        })),
        ...publisherFilters.map((publisherId) => ({
          id: `publisher-${publisherId}`,
          label: `Publisher: ${
            publisherOptions.find((publisher) => publisher.id === publisherId)?.full_name ??
            publisherId
          }`,
          onRemove: () => {
            setPublisherFilters((previous) => previous.filter((value) => value !== publisherId));
          },
        })),
        ...writerStatusFilters.map((status) => ({
          id: `writer-status-${status}`,
          label: `Writer: ${WRITER_STATUS_LABELS[status]}`,
          onRemove: () => {
            setWriterStatusFilters((previous) => previous.filter((value) => value !== status));
          },
        })),
        ...publisherStatusFilters.map((status) => ({
          id: `publisher-status-${status}`,
          label: `Publisher: ${PUBLISHER_STATUS_LABELS[status]}`,
          onRemove: () => {
            setPublisherStatusFilters((previous) => previous.filter((value) => value !== status));
          },
        })),
        ...statusFilters.map((status) => ({
          id: `overall-status-${status}`,
          label: `Stage: ${STATUS_LABELS[status]}`,
          onRemove: () => {
            setStatusFilters((previous) => previous.filter((value) => value !== status));
          },
        })),
        activeMetricFilter
          ? {
              id: "metric",
              label: `Metric: ${
                activeMetricFilter === "scheduled_this_week"
                  ? "Scheduled This Week"
                  : activeMetricFilter === "ready_to_publish"
                    ? "Ready to Publish"
                    : "Delayed"
              }`,
              onRemove: () => {
                setActiveMetricFilter(null);
              },
            }
          : null,
        activeQuickQueue
          ? {
              id: "queue",
              label: "Pipeline filter active",
              onRemove: () => {
                setActiveQuickQueue(null);
              },
            }
          : null,
      ].filter((pill) => pill !== null),
    [
      activeMetricFilter,
      activeQuickQueue,
      publisherFilters,
      publisherOptions,
      publisherStatusFilters,
      search,
      siteFilters,
      statusFilters,
      writerFilters,
      writerOptions,
      writerStatusFilters,
    ]
  );

  const saveCurrentFiltersAsView = useCallback(() => {
    const baseName = `View ${format(new Date(), "MMM d yyyy, h:mm a")}`;
    const existingNames = new Set(savedViews.map((view) => view.name.toLowerCase()));
    let trimmedName = baseName;
    if (existingNames.has(trimmedName.toLowerCase())) {
      let suffix = 2;
      while (existingNames.has(`${baseName} (${suffix})`.toLowerCase())) {
        suffix += 1;
      }
      trimmedName = `${baseName} (${suffix})`;
    }

    const snapshot = buildCurrentFilterState();
    const snapshotColumnOrder = [...columnOrder];
    const nowIso = new Date().toISOString();
    const nextId =
      typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `${Date.now()}`;
    setSavedViews((previous) => [
      ...previous,
      {
        id: nextId,
        name: trimmedName,
        state: snapshot,
        columnOrder: snapshotColumnOrder,
        createdAt: nowIso,
        updatedAt: nowIso,
      },
    ]);
    setActiveSavedViewId(nextId);
    setError(null);
    setSuccessMessage(`Saved new view "${trimmedName}".`);
  }, [buildCurrentFilterState, columnOrder, savedViews]);


  const getExportCellValue = useCallback(
    (blog: BlogRecord, column: DashboardColumnKey) => {
      if (column === "title") {
        return blog.title;
      }

      if (column === "site") {
        return getSiteLabel(blog.site);
      }

      if (column === "writer") {
        return blog.writer?.full_name ?? "Unassigned";
      }

      if (column === "writer_status") {
        return toTitleCase(blog.writer_status);
      }

      if (column === "publisher") {
        return blog.publisher?.full_name ?? "Unassigned";
      }

      if (column === "publisher_status") {
        return toTitleCase(blog.publisher_status);
      }

      if (column === "overall_status") {
        const workflowStage = getWorkflowStage({
          writerStatus: blog.writer_status,
          publisherStatus: blog.publisher_status,
        });
        return toTitleCase(workflowStage);
      }

      const publishDate = getBlogPublishDate(blog);
      return formatDisplayDate(publishDate) || "—";
    },
    []
  );

  const buildCsvContent = useCallback(
    (rows: BlogRecord[]) => {
      const headers = visibleColumnOrder.map((column) =>
        escapeCsvValue(DASHBOARD_COLUMN_LABELS[column])
      );
      const csvRows = rows.map((blog) =>
        visibleColumnOrder
          .map((column) => escapeCsvValue(getExportCellValue(blog, column)))
          .join(",")
      );
      return [headers.join(","), ...csvRows].join("\n");
    },
    [getExportCellValue, visibleColumnOrder]
  );

  const triggerCsvDownload = useCallback((csvContent: string, filename: string) => {
    const blob = new Blob([`\uFEFF${csvContent}`], {
      type: "text/csv;charset=utf-8;",
    });
    const downloadUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = downloadUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(downloadUrl);
  }, []);

  const handleExportCsv = (scope: "selected" | "view") => {
    if (scope === "selected" && !canExportSelectedCsv) {
      setError("You do not have permission to export selected CSV.");
      setSuccessMessage(null);
      return;
    }
    if (scope === "view" && !canExportCsv) {
      setError("You do not have permission to export CSV.");
      setSuccessMessage(null);
      return;
    }
    const rowsToExport = scope === "selected" ? selectedBlogs : sortedBlogs;
    if (rowsToExport.length === 0) {
      setError(
        scope === "selected"
          ? "Select at least one blog before exporting CSV."
          : "No blogs available in the current view to export."
      );
      setSuccessMessage(null);
      return;
    }

    const csvContent = buildCsvContent(rowsToExport);
    const timestamp = new Date().toISOString().replaceAll(":", "-").replaceAll(".", "-");
    const filename = `dashboard-${scope}-${timestamp}.csv`;
    triggerCsvDownload(csvContent, filename);
    setError(null);
    setSuccessMessage(`Exported ${rowsToExport.length} blog(s) as CSV.`);
  };

  const ensureBulkSelection = () => {
    if (selectedBlogIds.length === 0) {
      setError("Select at least one blog for bulk actions.");
      return false;
    }
    return true;
  };

  const runBulkMutation = async (run: () => Promise<string>) => {
    setIsBulkSaving(true);
    setError(null);
    setSuccessMessage(null);
    try {
      const successText = await run();
      clearBulkUiState();
      await loadData();
      setSuccessMessage(successText);
    } catch (mutationError) {
      const message =
        mutationError instanceof Error ? mutationError.message : "Bulk action failed.";
      setError(message);
    } finally {
      setIsBulkSaving(false);
    }
  };

  const handleBulkApplyChanges = async () => {
    if (!ensureBulkSelection()) {
      return;
    }
    if (!hasPendingBulkChanges) {
      setError("Choose at least one bulk change before applying.");
      return;
    }

    const isSettingWriter = Boolean(bulkWriterId);
    const isSettingPublisher = Boolean(bulkPublisherId);

    if (isSettingWriter && !canChangeWriterAssignment) {
      setError("You do not have permission to change writer assignments.");
      return;
    }
    if (isSettingPublisher && !canChangePublisherAssignment) {
      setError("You do not have permission to change publisher assignments.");
      return;
    }
    if (
      bulkWriterStatus &&
      selectedBlogs.some((blog) =>
        !canTransitionWriterStatus(blog.writer_status, bulkWriterStatus, hasPermission)
      )
    ) {
      setError("You do not have permission to apply that writer status change.");
      return;
    }
    if (
      bulkPublisherStatus &&
      selectedBlogs.some((blog) =>
        !canTransitionPublisherStatus(
          blog.publisher_status,
          bulkPublisherStatus,
          hasPermission
        )
      )
    ) {
      setError("You do not have permission to apply that publisher status change.");
      return;
    }

    if (bulkWriterStatus && bulkWriterStatus !== "not_started") {
      const missingWriter = selectedBlogs.filter(
        (blog) => !blog.writer_id && !isSettingWriter
      );
      if (missingWriter.length > 0) {
        setError("Assign a writer first for all selected blogs before changing writer status.");
        return;
      }
    }

    if (bulkPublisherStatus && bulkPublisherStatus !== "not_started") {
      const missingPublisher = selectedBlogs.filter(
        (blog) => !blog.publisher_id && !isSettingPublisher
      );
      if (missingPublisher.length > 0) {
        setError("Assign a publisher first for all selected blogs before changing publisher status.");
        return;
      }
    }

    if (
      bulkWriterStatus &&
      bulkWriterStatus !== "completed" &&
      selectedBlogs.some((blog) => {
        const nextPublisherStatus = bulkPublisherStatus || blog.publisher_status;
        return nextPublisherStatus === "completed";
      })
    ) {
      setError("Writer status cannot be set below completed for already published blogs.");
      return;
    }

    if (
      bulkPublisherStatus === "completed" &&
      selectedBlogs.some((blog) => {
        const nextWriterStatus = bulkWriterStatus || blog.writer_status;
        return nextWriterStatus !== "completed";
      })
    ) {
      setError("Publisher cannot be marked completed unless writing is completed for all selected blogs.");
      return;
    }

    const updatePayload: Partial<
      Pick<BlogRecord, "writer_id" | "publisher_id" | "writer_status" | "publisher_status">
    > = {};

    if (isSettingWriter) {
      updatePayload.writer_id = bulkWriterId;
    }
    if (isSettingPublisher) {
      updatePayload.publisher_id = bulkPublisherId;
    }
    if (bulkWriterStatus !== "") {
      updatePayload.writer_status = bulkWriterStatus;
    }
    if (bulkPublisherStatus !== "") {
      updatePayload.publisher_status = bulkPublisherStatus;
    }

    await runBulkMutation(async () => {
      const supabase = getSupabaseBrowserClient();
      const { error: updateError } = await supabase
        .from("blogs")
        .update(updatePayload)
        .in("id", selectedBlogIds);
      if (updateError) {
        throw new Error(updateError.message);
      }

      const appliedChangeLabels: string[] = [];
      if (isSettingWriter) {
        appliedChangeLabels.push("writer assignment");
      }
      if (isSettingPublisher) {
        appliedChangeLabels.push("publisher assignment");
      }
      if (bulkWriterStatus !== "") {
        appliedChangeLabels.push("writer status");
      }
      if (bulkPublisherStatus !== "") {
        appliedChangeLabels.push("publisher status");
      }

      return `Applied ${appliedChangeLabels.join(", ")} to ${selectedBlogIds.length} blog(s).`;
    });
  };

  const handleBulkDelete = async () => {
    if (!canDeleteBlog) {
      setError("You do not have permission to delete blogs.");
      return;
    }
    if (!ensureBulkSelection()) {
      return;
    }
    const selectedIdsSnapshot = [...selectedBlogIds];
    const selectedCount = selectedIdsSnapshot.length;
    setError(null);
    setSuccessMessage(null);
    showWarning(`Delete ${selectedCount} selected blog(s)? This cannot be undone.`, {
      actionLabel: "Delete",
      durationMs: 7000,
      onAction: () => {
        void runBulkMutation(async () => {
          const supabase = getSupabaseBrowserClient();
          const { error: deleteError } = await supabase
            .from("blogs")
            .delete()
            .in("id", selectedIdsSnapshot);
          if (deleteError) {
            throw new Error(deleteError.message);
          }
          return `Deleted ${selectedCount} blog(s).`;
        });
      },
    });
  };


  const updateBlogInline = useCallback(
    async (
      blog: BlogRecord,
      updates: Partial<
        Pick<
          BlogRecord,
          | "writer_id"
          | "publisher_id"
          | "writer_status"
          | "publisher_status"
          | "scheduled_publish_date"
          | "display_published_date"
          | "target_publish_date"
        >
      >,
      message: string
    ) => {
      const nextWriterId =
        updates.writer_id !== undefined ? updates.writer_id : blog.writer_id;
      const nextPublisherId =
        updates.publisher_id !== undefined ? updates.publisher_id : blog.publisher_id;
      const nextWriterStatus =
        updates.writer_status !== undefined ? updates.writer_status : blog.writer_status;
      const nextPublisherStatus =
        updates.publisher_status !== undefined
          ? updates.publisher_status
          : blog.publisher_status;
      const requestedWriterAssignmentChange =
        updates.writer_id !== undefined && updates.writer_id !== blog.writer_id;
      const requestedPublisherAssignmentChange =
        updates.publisher_id !== undefined && updates.publisher_id !== blog.publisher_id;
      const requestedScheduledDateChange =
        updates.scheduled_publish_date !== undefined ||
        updates.target_publish_date !== undefined;
      const requestedDisplayDateChange =
        updates.display_published_date !== undefined;

      if (requestedWriterAssignmentChange && !canChangeWriterAssignment) {
        setError("You do not have permission to change writer assignments.");
        setSuccessMessage(null);
        return;
      }
      if (requestedPublisherAssignmentChange && !canChangePublisherAssignment) {
        setError("You do not have permission to change publisher assignments.");
        setSuccessMessage(null);
        return;
      }
      if (
        updates.writer_status !== undefined &&
        !canTransitionWriterStatus(blog.writer_status, updates.writer_status, hasPermission)
      ) {
        setError("You do not have permission to apply that writer status change.");
        setSuccessMessage(null);
        return;
      }
      if (
        updates.publisher_status !== undefined &&
        !canTransitionPublisherStatus(
          blog.publisher_status,
          updates.publisher_status,
          hasPermission
        )
      ) {
        setError("You do not have permission to apply that publisher status change.");
        setSuccessMessage(null);
        return;
      }
      if (requestedScheduledDateChange && !canEditScheduledDate) {
        setError("You do not have permission to edit the scheduled publish date.");
        setSuccessMessage(null);
        return;
      }
      if (requestedDisplayDateChange && !canEditDisplayDate) {
        setError("You do not have permission to edit the display publish date.");
        setSuccessMessage(null);
        return;
      }

      if (nextWriterStatus !== "not_started" && !nextWriterId) {
        setError("Assign a writer before changing writer status.");
        setSuccessMessage(null);
        return;
      }
      if (nextPublisherStatus !== "not_started" && !nextPublisherId) {
        setError("Assign a publisher before changing publisher status.");
        setSuccessMessage(null);
        return;
      }
      if (nextPublisherStatus === "completed" && nextWriterStatus !== "completed") {
        setError("Writer status must be completed before publisher status can be completed.");
        setSuccessMessage(null);
        return;
      }
      if (nextWriterStatus !== "completed" && nextPublisherStatus === "completed") {
        setError("Writer status cannot be moved below completed after publishing is complete.");
        setSuccessMessage(null);
        return;
      }

      setError(null);
      setSuccessMessage(null);

      const supabase = getSupabaseBrowserClient();
      let { data, error: updateError } = await supabase
        .from("blogs")
        .update(updates)
        .eq("id", blog.id)
        .select(BLOG_SELECT_WITH_DATES_WITH_RELATIONS)
        .single();

      if (isMissingBlogDateColumnsError(updateError)) {
        const legacyUpdates = {
          ...updates,
        };
        delete (legacyUpdates as { scheduled_publish_date?: string | null })
          .scheduled_publish_date;
        delete (legacyUpdates as { display_published_date?: string | null })
          .display_published_date;
        delete (legacyUpdates as { target_publish_date?: string | null }).target_publish_date;

        const fallback = await supabase
          .from("blogs")
          .update(legacyUpdates)
          .eq("id", blog.id)
          .select(BLOG_SELECT_LEGACY_WITH_RELATIONS)
          .single();
        data = fallback.data as typeof data;
        updateError = fallback.error;
      }

      if (updateError) {
        setError(updateError.message);
        setSuccessMessage(null);
        return;
      }

      const nextBlog = normalizeBlogRow(
        (data ?? {}) as Record<string, unknown>
      ) as BlogRecord;
      setBlogs((previous) =>
        previous.map((previousBlog) =>
          previousBlog.id === blog.id ? nextBlog : previousBlog
        )
      );
      setSuccessMessage(message);
    },
    [
      canChangePublisherAssignment,
      canChangeWriterAssignment,
      canEditDisplayDate,
      canEditScheduledDate,
      hasPermission,
    ]
  );

  const loadPanelData = useCallback(async (blogId: string) => {
    setIsPanelLoading(true);
    setPanelError(null);

    const supabase = getSupabaseBrowserClient();
    const fetchComments = async () => {
      let { data, error } = await supabase
        .schema("public")
        .from("blog_comments")
        .select("id,blog_id,comment,user_id,created_at,author:user_id(id,full_name,email)")
        .eq("blog_id", blogId)
        .order("created_at", { ascending: false });

      if (isMissingBlogCommentUserIdColumnError(error)) {
        const fallback = await supabase
          .schema("public")
          .from("blog_comments")
          .select("id,blog_id,comment,created_by,created_at,author:created_by(id,full_name,email)")
          .eq("blog_id", blogId)
          .order("created_at", { ascending: false });
        data = fallback.data as typeof data;
        error = fallback.error;
      }

      return { data, error };
    };
    const [{ data: historyData, error: historyError }, { data: commentsData, error: commentsError }] =
      await Promise.all([
        supabase
          .from("blog_assignment_history")
          .select("*")
          .eq("blog_id", blogId)
          .order("changed_at", { ascending: false })
          .limit(100),
        fetchComments(),
      ]);

    if (historyError) {
      setPanelError(historyError.message);
      setPanelHistory([]);
      setPanelComments([]);
      setIsPanelLoading(false);
      return;
    }

    setPanelHistory((historyData ?? []) as BlogHistoryRecord[]);
    if (commentsError) {
      if (isMissingBlogCommentsTableError(commentsError)) {
        setPanelComments([]);
        setPanelError(
          "Comments table is missing from schema cache. Run latest migrations and refresh schema cache."
        );
      } else {
        setPanelComments([]);
        setPanelError(commentsError.message);
      }
    } else {
      setPanelComments(normalizeCommentRows((commentsData ?? []) as Array<Record<string, unknown>>));
    }

    setIsPanelLoading(false);
  }, []);

  const openPanel = useCallback((blogId: string) => {
    setActiveBlogId(blogId);
    setPanelCommentDraft("");
    void loadPanelData(blogId);
  }, [loadPanelData]);

  const activeBlog = useMemo(
    () => blogs.find((blog) => blog.id === activeBlogId) ?? null,
    [activeBlogId, blogs]
  );
  useEffect(() => {
    if (!activeBlogId || sortedBlogs.length === 0 || activeBlogIndex < 0) {
      return;
    }

    const isFormElement = (eventTarget: EventTarget | null) => {
      if (!(eventTarget instanceof HTMLElement)) {
        return false;
      }
      const tagName = eventTarget.tagName.toLowerCase();
      return (
        eventTarget.isContentEditable ||
        tagName === "input" ||
        tagName === "textarea" ||
        tagName === "select"
      );
    };

    const handlePanelKeyboardNavigation = (event: KeyboardEvent) => {
      if (isFormElement(event.target)) {
        return;
      }
      if (event.key !== "j" && event.key !== "k") {
        return;
      }

      event.preventDefault();
      const direction = event.key === "j" ? 1 : -1;
      const nextIndex =
        (activeBlogIndex + direction + sortedBlogs.length) % sortedBlogs.length;
      const nextBlog = sortedBlogs[nextIndex];
      if (!nextBlog) {
        return;
      }
      openPanel(nextBlog.id);
    };

    window.addEventListener("keydown", handlePanelKeyboardNavigation);
    return () => {
      window.removeEventListener("keydown", handlePanelKeyboardNavigation);
    };
  }, [activeBlogId, activeBlogIndex, openPanel, sortedBlogs]);

  const handlePanelAddComment = async () => {
    if (!activeBlog || !user?.id) {
      return;
    }
    if (!canCreateComments) {
      setPanelError("You do not have permission to add comments.");
      return;
    }

    const trimmedComment = panelCommentDraft.trim();
    if (!trimmedComment) {
      setPanelError("Comment cannot be empty.");
      return;
    }

    setIsPanelCommentSaving(true);
    setPanelError(null);

    const supabase = getSupabaseBrowserClient();
    let { error: insertError } = await supabase
      .schema("public")
      .from("blog_comments")
      .insert({
        blog_id: activeBlog.id,
        comment: trimmedComment,
        user_id: user.id,
      });

    if (isMissingBlogCommentUserIdColumnError(insertError)) {
      const fallback = await supabase
        .schema("public")
        .from("blog_comments")
        .insert({
          blog_id: activeBlog.id,
          comment: trimmedComment,
          created_by: user.id,
        });
      insertError = fallback.error;
    }

    if (insertError) {
      if (isMissingBlogCommentsTableError(insertError)) {
        setPanelError(
          "Comments table is missing from schema cache. Run latest migrations and refresh schema cache."
        );
      } else {
        setPanelError(insertError.message);
      }
      setIsPanelCommentSaving(false);
      return;
    }

    setPanelCommentDraft("");
    await loadPanelData(activeBlog.id);
    setIsPanelCommentSaving(false);
  };
  const sortedSavedViews = useMemo(
    () => [...savedViews].sort((left, right) => left.name.localeCompare(right.name)),
    [savedViews]
  );

  const dashboardCommandPaletteCommands = useMemo(() => {
    const viewCommands = sortedSavedViews.map((view) => ({
      id: `saved-view-${view.id}`,
      label: `Apply view: ${view.name}`,
      group: "Saved Views",
      keywords: [
        "saved",
        "view",
        view.name.toLowerCase(),
      ],
      action: () => {
        applySavedView(view);
      },
    }));

    const dashboardCommands = [
      {
        id: "save-current-view",
        label: "Save current filters as view",
        group: "Saved Views",
        keywords: ["save", "view", "filters"],
        action: () => {
          saveCurrentFiltersAsView();
        },
      },
      {
        id: "reset-dashboard-filters",
        label: "Reset dashboard filters",
        group: "Saved Views",
        keywords: ["reset", "filters", "clear"],
        action: () => {
          resetDashboardFilters();
        },
      },
    ];

    const openBlogCommands = sortedBlogs.slice(0, 60).map((blog) => ({
      id: `open-blog-${blog.id}`,
      label: `Open "${blog.title}"`,
      group: "Blogs",
      keywords: [
        blog.site,
        blog.title.toLowerCase(),
        blog.writer?.full_name?.toLowerCase() ?? "",
        blog.publisher?.full_name?.toLowerCase() ?? "",
      ],
      action: () => {
        openPanel(blog.id);
      },
    }));

    return [...dashboardCommands, ...viewCommands, ...openBlogCommands];
  }, [
    applySavedView,
    openPanel,
    resetDashboardFilters,
    saveCurrentFiltersAsView,
    sortedBlogs,
    sortedSavedViews,
  ]);



  return (
    <ProtectedPage requiredPermissions={["view_dashboard"]}>
      <AppShell
        commandPaletteCommands={dashboardCommandPaletteCommands}
        sidebarContent={
          <DashboardSidebar
            quickQueueCounts={quickQueueCounts}
            activeQuickQueue={activeQuickQueue}
            recentlyPublished={mostRecentPublishedBlog}
            onApplyQuickQueueFilter={applyQuickQueuePreset}
            onOpenBlog={openPanel}
          />
        }
      >
        <div className="space-y-5 transition-opacity duration-200">
          <DataPageHeader
            title="Dashboard"
            description="Track assignments, writing progress, and publishing readiness."
            primaryAction={
              <div className="flex flex-wrap items-center gap-2">
              <details className="relative">
                <summary className="cursor-pointer list-none rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100">
                  Actions ▼
                </summary>
                <div className="absolute right-0 z-30 mt-1 w-52 rounded-md border border-slate-200 bg-white p-1 shadow-lg">
                  <button
                    type="button"
                    className="block w-full rounded px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-100"
                    onClick={() => {
                      closeOpenDashboardMenus();
                      saveCurrentFiltersAsView();
                    }}
                  >
                    Save view
                  </button>
                  <button
                    type="button"
                    className="block w-full rounded px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-100"
                    onClick={() => {
                      closeOpenDashboardMenus();
                      resetDashboardFilters();
                    }}
                  >
                    Reset filters
                  </button>
                  <button
                    type="button"
                    className="block w-full rounded px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-100"
                    onClick={() => {
                      closeOpenDashboardMenus();
                      setIsEditColumnsOpen((previous) => !previous);
                    }}
                  >
                    Edit columns
                  </button>
                </div>
              </details>
              {canCreateBlog ? (
                <details className="relative">
                  <summary className="cursor-pointer list-none rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700">
                    + Add
                  </summary>
                  <div className="absolute right-0 z-30 mt-1 w-44 rounded-md border border-slate-200 bg-white p-1 shadow-lg">
                    <button
                      type="button"
                      className="flex w-full items-center justify-between rounded px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-100"
                      onClick={() => {
                        closeOpenDashboardMenus();
                        router.push("/blogs/new");
                      }}
                    >
                      <span>+ Add Blog</span>
                      <KbdShortcut className="bg-slate-50">N</KbdShortcut>
                    </button>
                    <button
                      type="button"
                      className="block w-full rounded px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-100"
                      onClick={() => {
                        closeOpenDashboardMenus();
                        router.push("/ideas");
                      }}
                    >
                      + Add Idea
                    </button>
                    <button
                      type="button"
                      disabled
                      className="block w-full cursor-not-allowed rounded px-3 py-2 text-left text-sm text-slate-400"
                    >
                      + Import Blog (soon)
                    </button>
                  </div>
                </details>
              ) : null}
            </div>
            }
          />
          <DataPageToolbar
            searchValue={search}
            onSearchChange={setSearch}
            searchPlaceholder="Search title, URL, writer, publisher, or site"
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
              <>
                <CheckboxMultiSelect
                  label="Sites"
                  options={siteFilterOptions}
                  selectedValues={siteFilters}
                  onChange={(nextValues) => {
                    setSiteFilters(nextValues as BlogSite[]);
                  }}
                />
                <CheckboxMultiSelect
                  label="Writers"
                  options={writerFilterOptions}
                  selectedValues={writerFilters}
                  onChange={setWriterFilters}
                />
                <details className="rounded-md border border-slate-200 bg-white px-3 py-2 md:col-span-2 xl:col-span-2">
                  <summary className="cursor-pointer list-none text-sm font-medium text-slate-700">
                    Status
                  </summary>
                  <div className="mt-2 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                    <CheckboxMultiSelect
                      label="Writer Status"
                      options={writerStatusFilterOptions}
                      selectedValues={writerStatusFilters}
                      onChange={(nextValues) => {
                        setWriterStatusFilters(nextValues as WriterStageStatus[]);
                      }}
                    />
                    <CheckboxMultiSelect
                      label="Publisher Status"
                      options={publisherStatusFilterOptions}
                      selectedValues={publisherStatusFilters}
                      onChange={(nextValues) => {
                        setPublisherStatusFilters(nextValues as PublisherStageStatus[]);
                      }}
                    />
                    <CheckboxMultiSelect
                      label="Overall Status"
                      options={overallStatusFilterOptions}
                      selectedValues={statusFilters}
                      onChange={(nextValues) => {
                        setStatusFilters(nextValues as OverallBlogStatus[]);
                      }}
                    />
                  </div>
                </details>
                <details className="relative">
                  <summary className="cursor-pointer list-none rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50">
                    + Add Filter
                  </summary>
                  <div className="absolute left-0 z-30 mt-1 w-72 rounded-md border border-slate-200 bg-white p-2 shadow-lg">
                    <CheckboxMultiSelect
                      label="Publishers"
                      options={publisherFilterOptions}
                      selectedValues={publisherFilters}
                      onChange={setPublisherFilters}
                    />
                  </div>
                </details>
                <label className="space-y-1 text-xs font-medium uppercase tracking-wide text-slate-500">
                  Sort By
                  <select
                    className="focus-field w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-normal normal-case tracking-normal text-slate-700"
                    value={sortField}
                    onChange={(event) => {
                      setSortField(event.target.value as DashboardSortField);
                    }}
                  >
                    {DASHBOARD_SORT_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                <button
                  type="button"
                  className="rounded-md border border-slate-300 px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                  onClick={() => {
                    setSortDirection((previous) => (previous === "asc" ? "desc" : "asc"));
                  }}
                >
                  {DASHBOARD_SORT_OPTIONS.find((option) => option.value === sortField)?.label}{" "}
                  {sortDirection === "asc" ? "↑" : "↓"}
                </button>
              </>
            }
          />
          <p className="text-xs text-slate-500">
            Case-insensitive partial match across title, URL, writer, publisher, and site.
            <span className="ml-2 inline-flex items-center gap-1 text-[11px] font-medium text-slate-600">
              <KbdShortcut className="bg-slate-50">/</KbdShortcut>
              focus search
            </span>
          </p>
          <DataPageFilterPills pills={activeFilterPills} />
          {isApplyingFilterFeedback ? (
            <div aria-live="polite" className="inline-flex items-center gap-2 text-xs text-slate-500">
              <span className="h-2 w-2 animate-pulse rounded-full bg-slate-400" />
              Updating results…
            </div>
          ) : null}
          <section className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
            <div className="flex items-baseline justify-between gap-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Metrics (click to filter)
              </p>
              <p className="text-[11px] text-slate-500">Counts reflect the full dataset</p>
            </div>
            <div className="mt-2 grid gap-2 text-sm md:grid-cols-3">
              <button
                type="button"
                className={`rounded-lg border px-3 py-2 text-left transition ${
                  activeMetricFilter === "scheduled_this_week"
                    ? "border-slate-900 bg-slate-900 text-white shadow-sm"
                    : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                }`}
                onClick={() => {
                  setActiveMetricFilter((previous) =>
                    previous === "scheduled_this_week" ? null : "scheduled_this_week"
                  );
                  setActiveQuickQueue(null);
                }}
              >
                <p className="text-[11px] font-semibold uppercase tracking-wide">
                  Scheduled This Week
                </p>
                <p className="mt-1 text-2xl font-semibold tabular-nums">
                  {focusStripMetrics.scheduledThisWeek}
                </p>
              </button>
              <button
                type="button"
                className={`rounded-lg border px-3 py-2 text-left transition ${
                  activeMetricFilter === "ready_to_publish"
                    ? "border-slate-900 bg-slate-900 text-white shadow-sm"
                    : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                }`}
                onClick={() => {
                  setActiveMetricFilter((previous) =>
                    previous === "ready_to_publish" ? null : "ready_to_publish"
                  );
                  setActiveQuickQueue(null);
                }}
              >
                <p className="text-[11px] font-semibold uppercase tracking-wide">
                  Ready to Publish
                </p>
                <p className="mt-1 text-2xl font-semibold tabular-nums">
                  {focusStripMetrics.readyToPublish}
                </p>
              </button>
              <button
                type="button"
                title="Blogs whose scheduled publish date has passed and overall status is not published."
                className={`rounded-lg border px-3 py-2 text-left transition ${
                  activeMetricFilter === "delayed"
                    ? "border-slate-900 bg-slate-900 text-white shadow-sm"
                    : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                }`}
                onClick={() => {
                  setActiveMetricFilter((previous) => (previous === "delayed" ? null : "delayed"));
                  setActiveQuickQueue(null);
                }}
              >
                <p className="text-[11px] font-semibold uppercase tracking-wide">Delayed</p>
                <p className="mt-1 text-2xl font-semibold tabular-nums">
                  {focusStripMetrics.delayed}
                </p>
              </button>
            </div>
          </section>

          {canRunBulkActions && selectedBlogIds.length > 0 ? (
            <section className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-medium text-slate-700">
                  {selectedBlogIds.length} selected
                </p>
                <button
                  type="button"
                  disabled={isBulkSaving}
                  className="rounded border border-slate-300 bg-white px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                  onClick={() => {
                    clearBulkUiState();
                  }}
                >
                  Clear Selection
                </button>
              </div>

              <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
                <select
                  value={bulkWriterId}
                  onChange={(event) => {
                    setBulkWriterId(event.target.value);
                  }}
                  disabled={!canChangeWriterAssignment || isBulkSaving}
                  className="rounded-md border border-slate-300 px-3 py-2 text-sm disabled:cursor-not-allowed disabled:bg-slate-100"
                >
                  <option value="">No writer change</option>
                  {assignmentOptions.map((user) => (
                    <option key={user.id} value={user.id}>
                      Writer: {user.full_name}
                    </option>
                  ))}
                </select>

                <select
                  value={bulkPublisherId}
                  onChange={(event) => {
                    setBulkPublisherId(event.target.value);
                  }}
                  disabled={!canChangePublisherAssignment || isBulkSaving}
                  className="rounded-md border border-slate-300 px-3 py-2 text-sm disabled:cursor-not-allowed disabled:bg-slate-100"
                >
                  <option value="">No publisher change</option>
                  {assignmentOptions.map((user) => (
                    <option key={user.id} value={user.id}>
                      Publisher: {user.full_name}
                    </option>
                  ))}
                </select>

                <select
                  value={bulkWriterStatus}
                  onChange={(event) => {
                    setBulkWriterStatus(event.target.value as WriterStageStatus | "");
                  }}
                  disabled={!canEditWritingStage || isBulkSaving}
                  className="rounded-md border border-slate-300 px-3 py-2 text-sm disabled:cursor-not-allowed disabled:bg-slate-100"
                >
                  <option value="">No writer status change</option>
                  {WRITER_STATUSES.map((status) => (
                    <option key={status} value={status}>
                      Writer Status: {toTitleCase(status)}
                    </option>
                  ))}
                </select>

                <select
                  value={bulkPublisherStatus}
                  onChange={(event) => {
                    setBulkPublisherStatus(event.target.value as PublisherStageStatus | "");
                  }}
                  disabled={!canEditPublishingStage || isBulkSaving}
                  className="rounded-md border border-slate-300 px-3 py-2 text-sm disabled:cursor-not-allowed disabled:bg-slate-100"
                >
                  <option value="">No publisher status change</option>
                  {PUBLISHER_STATUSES.map((status) => (
                    <option key={status} value={status}>
                      Publisher Status: {toTitleCase(status)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  disabled={isBulkSaving || !hasPendingBulkChanges}
                  className="rounded-md bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
                  onClick={() => {
                    void handleBulkApplyChanges();
                  }}
                >
                  Apply Changes
                </button>
                {canDeleteBlog ? (
                  <button
                    type="button"
                    disabled={isBulkSaving}
                    className="rounded-md border border-rose-300 bg-white px-3 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
                    onClick={() => {
                      void handleBulkDelete();
                    }}
                  >
                    Delete Selected
                  </button>
                ) : null}
              </div>
            </section>
          ) : null}

          {isLoading ? (
            <div className="space-y-3 rounded-md border border-slate-200 bg-slate-50 px-4 py-5">
              <div className="h-4 w-40 animate-pulse rounded bg-slate-200" />
              <div className="h-10 w-full animate-pulse rounded bg-slate-200" />
              <div className="h-10 w-full animate-pulse rounded bg-slate-200" />
              <div className="h-10 w-3/4 animate-pulse rounded bg-slate-200" />
            </div>
          ) : (
            <div className="space-y-4">
              <section className="relative rounded-lg border border-slate-200 bg-slate-50 px-3 py-2" ref={columnEditorRef}>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-3">
                    <TableResultsSummary
                      totalRows={sortedBlogs.length}
                      currentPage={currentPage}
                      rowLimit={rowLimit}
                      noun="blogs"
                    />
                    {canExportCsv ? (
                      <button
                        type="button"
                        disabled={sortedBlogs.length === 0}
                        className="rounded border border-slate-300 bg-white px-3 py-1 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                        onClick={() => {
                          handleExportCsv("view");
                        }}
                      >
                        Export View CSV
                      </button>
                    ) : null}
                    {canExportSelectedCsv && canSelectRows ? (
                      <button
                        type="button"
                        disabled={selectedBlogIds.length === 0}
                        className="rounded border border-slate-300 bg-white px-3 py-1 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                        onClick={() => {
                          handleExportCsv("selected");
                        }}
                      >
                        Export Selected CSV
                      </button>
                    ) : null}
                  </div>
                  <div className="ml-auto flex items-center gap-2">
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
                    <button
                      type="button"
                      className="rounded-md border border-slate-300 bg-white px-3 py-1 text-sm font-medium text-slate-700 hover:bg-slate-100"
                      onClick={() => {
                        setIsEditColumnsOpen((previous) => !previous);
                      }}
                    >
                      Edit Columns
                    </button>
                  </div>
                </div>
                {isEditColumnsOpen ? (
                  <div className="absolute right-0 z-30 mt-2 w-full max-w-2xl rounded-lg border border-slate-200 bg-white p-3 shadow-lg">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Column View
                      </p>
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          className="rounded border border-slate-300 bg-white px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100"
                          onClick={saveColumnView}
                        >
                          Save View
                        </button>
                        <button
                          type="button"
                          className="rounded border border-slate-300 bg-white px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100"
                          onClick={resetColumnView}
                        >
                          Reset Default
                        </button>
                      </div>
                    </div>
                    <div className="mt-2 grid gap-2 md:grid-cols-2">
                      {columnOrder.map((column, index) => (
                        <div
                          key={column}
                          className="inline-flex items-center justify-between gap-2 rounded border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700"
                        >
                          <label className="inline-flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={!hiddenColumnSet.has(column)}
                              disabled={
                                REQUIRED_DASHBOARD_COLUMN_SET.has(column) ||
                                (!hiddenColumnSet.has(column) &&
                                  visibleColumnOrder.length <= 1)
                              }
                              onChange={() => {
                                toggleColumnVisibility(column);
                              }}
                            />
                            <span className="font-medium">
                              {DASHBOARD_COLUMN_LABELS[column]}
                              {REQUIRED_DASHBOARD_COLUMN_SET.has(column) ? " (required)" : ""}
                            </span>
                          </label>
                          <div className="inline-flex items-center gap-1">
                            <button
                              type="button"
                              aria-label={`Move ${DASHBOARD_COLUMN_LABELS[column]} left`}
                              disabled={index === 0}
                              className="rounded border border-slate-200 px-1 text-slate-600 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                              onClick={() => {
                                moveColumn(column, -1);
                              }}
                            >
                              ←
                            </button>
                            <button
                              type="button"
                              aria-label={`Move ${DASHBOARD_COLUMN_LABELS[column]} right`}
                              disabled={index === columnOrder.length - 1}
                              className="rounded border border-slate-200 px-1 text-slate-600 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                              onClick={() => {
                                moveColumn(column, 1);
                              }}
                            >
                              →
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                    <p className="mt-2 text-xs text-slate-500">
                      Core workflow columns are required and always visible.
                    </p>
                  </div>
                ) : null}
              </section>

              <div
                ref={tableContainerRef}
                className="max-h-[70vh] overflow-auto rounded-lg border border-slate-200"
              >
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead className="bg-slate-100 text-left text-xs uppercase tracking-wide text-slate-600">
                    <tr>
                    {canSelectRows ? (
                        <th
                          className={`${headerCellClass} sticky top-0 z-10 bg-slate-100 shadow-[inset_0_-1px_0_0_rgb(226_232_240)]`}
                        >
                          <input
                            type="checkbox"
                            checked={allVisibleSelected}
                            onChange={(event) => {
                              handleToggleAllVisible(event.target.checked);
                            }}
                          />
                        </th>
                      ) : null}
                      {visibleColumnOrder.map((column) => (
                        <th
                          key={column}
                          className={`${headerCellClass} sticky top-0 z-10 bg-slate-100 shadow-[inset_0_-1px_0_0_rgb(226_232_240)] ${
                            CENTER_ALIGNED_DASHBOARD_COLUMNS.includes(column)
                              ? "text-center"
                              : ""
                          }`}
                        >
                          {DASHBOARD_COLUMN_LABELS[column]}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {sortedBlogs.length === 0 ? (
                      <tr>
                        <td
                          className={`${bodyCellClass} text-center text-slate-500`}
                          colSpan={visibleColumnOrder.length + (canSelectRows ? 1 : 0)}
                        >
                          No blogs found with current filters.
                        </td>
                      </tr>
                    ) : (
                      pagedBlogs.map((blog) => {
                        const displayPublishDate = getBlogPublishDate(blog);
                        const scheduledPublishDate = getBlogScheduledDate(blog);
                        const publishDate = scheduledPublishDate
                          ? parseISO(scheduledPublishDate)
                          : null;
                        const publishedTimestamp = blog.actual_published_at ?? blog.published_at;
                        const publishedDelayDays =
                          scheduledPublishDate && publishedTimestamp
                            ? Math.floor(
                                (new Date(publishedTimestamp).getTime() -
                                  new Date(`${scheduledPublishDate}T00:00:00Z`).getTime()) /
                                  (24 * 60 * 60 * 1000)
                              )
                            : null;
                        const isOverdue =
                          publishDate !== null &&
                          isBefore(publishDate, new Date()) &&
                          blog.publisher_status !== "completed";
                        const isStaleDraft =
                          blog.writer_status !== "completed" &&
                          isBefore(
                            parseISO(blog.status_updated_at),
                            new Date(
                              now.getTime() - staleDraftDays * 24 * 60 * 60 * 1000
                            )
                          );
                        const rowWorkflowStage = getWorkflowStage({
                          writerStatus: blog.writer_status,
                          publisherStatus: blog.publisher_status,
                        });
                        const rowToneClass = isOverdue
                          ? "bg-rose-50"
                          : rowWorkflowStage === "ready"
                            ? "bg-amber-50"
                            : rowWorkflowStage === "publishing"
                              ? "bg-blue-50"
                              : rowWorkflowStage === "writing"
                                ? "bg-white"
                                : "bg-emerald-50/40";

                        return (
                          <tr
                            key={blog.id}
                            className={`group table-row-focus cursor-pointer ${
                              activeBlogId === blog.id ? "bg-slate-100" : `${rowToneClass} hover:bg-slate-100`
                            }`}
                            onClick={() => {
                              openPanel(blog.id);
                            }}
                          >
                            {canSelectRows ? (
                              <td
                                className={bodyCellClass}
                                onClick={(event) => {
                                  event.stopPropagation();
                                }}
                              >
                                <input
                                  type="checkbox"
                                  checked={selectedIdSet.has(blog.id)}
                                  onChange={(event) => {
                                    handleToggleSingle(blog.id, event.target.checked);
                                  }}
                                />
                              </td>
                            ) : null}
                            {visibleColumnOrder.map((column) => {
                              if (column === "title") {
                                return (
                                  <td
                                    key={column}
                                    className={`${bodyCellClass} font-medium text-slate-900`}
                                  >
                                    <div className="max-w-[28rem] space-y-1">
                                      <span className="block overflow-hidden text-ellipsis [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2]">
                                        {blog.title}
                                      </span>
                                      <div className="hidden flex-wrap items-center gap-1 group-hover:inline-flex group-focus-within:inline-flex">
                                        <button
                                          type="button"
                                          className="rounded border border-slate-300 bg-white px-1.5 py-0.5 text-[11px] font-medium text-slate-700 hover:bg-slate-100"
                                          onClick={(event) => {
                                            event.stopPropagation();
                                            openPanel(blog.id);
                                          }}
                                        >
                                          Open
                                        </button>
                                        <button
                                          type="button"
                                          className="rounded border border-slate-300 bg-white px-1.5 py-0.5 text-[11px] font-medium text-slate-700 hover:bg-slate-100"
                                          onClick={(event) => {
                                            event.stopPropagation();
                                            void copyQuickActionValue(blog.title, "title");
                                          }}
                                        >
                                          Copy Title
                                        </button>
                                        <button
                                          type="button"
                                          disabled={!blog.live_url}
                                          className="rounded border border-slate-300 bg-white px-1.5 py-0.5 text-[11px] font-medium text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                                          onClick={(event) => {
                                            event.stopPropagation();
                                            void copyQuickActionValue(blog.live_url, "url");
                                          }}
                                        >
                                          Copy URL
                                        </button>
                                        <button
                                          type="button"
                                          className="rounded border border-slate-300 bg-white px-1.5 py-0.5 text-[11px] font-medium text-slate-700 hover:bg-slate-100"
                                          onClick={(event) => {
                                            event.stopPropagation();
                                            openPanel(blog.id);
                                          }}
                                        >
                                          View History
                                        </button>
                                      </div>
                                    </div>
                                  </td>
                                );
                              }

                              if (column === "site") {
                                return (
                                  <td key={column} className={`${bodyCellClass} text-slate-600`}>
                                    <span
                                      className={`inline-flex items-center justify-center rounded-full border px-2 py-0.5 text-xs font-medium ${getSiteBadgeClasses(
                                        blog.site
                                      )}`}
                                    >
                                      {getSiteLabel(blog.site)}
                                    </span>
                                  </td>
                                );
                              }

                              if (column === "writer") {
                                return (
                                  <td key={column} className={`${bodyCellClass} text-slate-600`}>
                                    {blog.writer?.full_name ?? "Unassigned"}
                                  </td>
                                );
                              }

                              if (column === "writer_status") {
                                return (
                                  <td key={column} className={`${bodyCellClass} text-center text-slate-600`}>
                                    {canEditWritingStage ? (
                                      <select
                                        className="rounded border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700"
                                        value={blog.writer_status}
                                        onClick={(event) => {
                                          event.stopPropagation();
                                        }}
                                        onChange={(event) => {
                                          event.stopPropagation();
                                          void updateBlogInline(
                                            blog,
                                            { writer_status: event.target.value as WriterStageStatus },
                                            `Writer stage updated for "${blog.title}".`
                                          );
                                        }}
                                      >
                                        {WRITER_STATUSES.map((status) => (
                                          <option key={status} value={status}>
                                            {WRITER_STAGE_DISPLAY_LABELS[status]}
                                          </option>
                                        ))}
                                      </select>
                                    ) : (
                                      <div className="inline-flex items-center gap-1.5">
                                        <span className="text-xs text-slate-500">Writer:</span>
                                        <WriterStatusBadge status={blog.writer_status} />
                                      </div>
                                    )}
                                  </td>
                                );
                              }

                              if (column === "publisher") {
                                return (
                                  <td key={column} className={`${bodyCellClass} text-slate-600`}>
                                    {blog.publisher?.full_name ?? "Unassigned"}
                                  </td>
                                );
                              }

                              if (column === "publisher_status") {
                                return (
                                  <td key={column} className={`${bodyCellClass} text-center text-slate-600`}>
                                    {canEditPublishingStage ? (
                                      <select
                                        className="rounded border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700"
                                        value={blog.publisher_status}
                                        onClick={(event) => {
                                          event.stopPropagation();
                                        }}
                                        onChange={(event) => {
                                          event.stopPropagation();
                                          void updateBlogInline(
                                            blog,
                                            { publisher_status: event.target.value as PublisherStageStatus },
                                            `Publisher stage updated for "${blog.title}".`
                                          );
                                        }}
                                      >
                                        {PUBLISHER_STATUSES.map((status) => (
                                          <option key={status} value={status}>
                                            {PUBLISHER_STAGE_DISPLAY_LABELS[status]}
                                          </option>
                                        ))}
                                      </select>
                                    ) : (
                                      <div className="inline-flex items-center gap-1.5">
                                        <span className="text-xs text-slate-500">Publisher:</span>
                                        <PublisherStatusBadge status={blog.publisher_status} />
                                      </div>
                                    )}
                                  </td>
                                );
                              }

                              if (column === "overall_status") {
                                return (
                                  <td key={column} className={`${bodyCellClass} text-center`}>
                                    <div className="flex items-center justify-center gap-2">
                                      <StatusBadge status={blog.overall_status} />
                                      {isOverdue ? (
                                        <span className="rounded bg-rose-100 px-2 py-0.5 text-xs font-medium text-rose-700">
                                          Overdue
                                        </span>
                                      ) : null}
                                      {isStaleDraft ? (
                                        <span className="rounded bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                                          Stale draft
                                        </span>
                                      ) : null}
                                      {rowWorkflowStage === "published" &&
                                      (publishedDelayDays ?? 0) > 0 ? (
                                        <span className="rounded bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                                          ⚠ Delayed {publishedDelayDays} days
                                        </span>
                                      ) : null}
                                    </div>
                                  </td>
                                );
                              }

                              return (
                                <td key={column} className={`${bodyCellClass} text-slate-600`}>
                                  {formatDisplayDate(displayPublishDate) || "—"}
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                <div className="flex flex-wrap items-center gap-3">
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
                <button
                  type="button"
                  className="rounded border border-slate-300 bg-white px-3 py-1 text-sm text-slate-700 hover:bg-slate-100"
                  onClick={() => {
                    tableContainerRef.current?.scrollIntoView({
                      behavior: "smooth",
                      block: "start",
                    });
                  }}
                >
                  ↑ Move to top
                </button>
              </div>
            </div>
          )}

          {activeBlog ? (
            <>
              <button
                type="button"
                aria-label="Close blog panel"
                className="fixed inset-0 z-30 bg-slate-900/25"
                onClick={() => {
                  setActiveBlogId(null);
                  setPanelError(null);
                  setPanelCommentDraft("");
                }}
              />
              <aside className="fixed inset-y-0 right-0 z-40 w-full max-w-2xl overflow-y-auto border-l border-slate-200 bg-white shadow-2xl">
                <div className="sticky top-0 z-10 border-b border-slate-200 bg-white p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Blog Panel
                      </p>
                      <h3 className="mt-1 text-lg font-semibold text-slate-900">
                        {activeBlog.title}
                      </h3>
                      <p className="mt-1 text-sm text-slate-600">{activeBlog.site}</p>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <WorkflowStageBadge
                          stage={getWorkflowStage({
                            writerStatus: activeBlog.writer_status,
                            publisherStatus: activeBlog.publisher_status,
                          })}
                        />
                        <StatusBadge status={activeBlog.overall_status} />
                        <WriterStatusBadge status={activeBlog.writer_status} />
                        <PublisherStatusBadge status={activeBlog.publisher_status} />
                      </div>
                    </div>
                    <button
                      type="button"
                      className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-100"
                      onClick={() => {
                        setActiveBlogId(null);
                        setPanelError(null);
                        setPanelCommentDraft("");
                      }}
                    >
                      Close
                    </button>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <details className="relative">
                      <summary className="cursor-pointer list-none rounded-md border border-slate-300 bg-white px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100">
                        Actions ▼
                      </summary>
                      <div className="absolute left-0 z-30 mt-1 w-40 rounded-md border border-slate-200 bg-white p-1 shadow-lg">
                        <Link
                          href={`/blogs/${activeBlog.id}`}
                          className="block rounded px-3 py-2 text-xs text-slate-700 hover:bg-slate-100"
                          onClick={() => {
                            closeOpenDashboardMenus();
                          }}
                        >
                          Open blog page
                        </Link>
                        <button
                          type="button"
                          className="block w-full rounded px-3 py-2 text-left text-xs text-slate-700 hover:bg-slate-100"
                          onClick={() => {
                            closeOpenDashboardMenus();
                            void loadPanelData(activeBlog.id);
                          }}
                        >
                          Refresh
                        </button>
                      </div>
                    </details>
                  </div>
                </div>

                <div className="space-y-5 p-4">

                  <section className="rounded-lg border border-slate-200 p-3">
                    <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Assignments & Dates
                    </h4>
                    <div className="mt-2 grid gap-3 sm:grid-cols-2">
                      <label className="block text-xs text-slate-600">
                        Writer
                        {canChangeWriterAssignment ? (
                          <select
                            className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
                            value={activeBlog.writer_id ?? ""}
                            onChange={(event) => {
                              const nextWriterId = event.target.value || null;
                              void updateBlogInline(
                                activeBlog,
                                { writer_id: nextWriterId },
                                `Writer updated for "${activeBlog.title}".`
                              );
                            }}
                          >
                            <option value="">Unassigned</option>
                            {assignmentOptions.map((userOption) => (
                              <option key={userOption.id} value={userOption.id}>
                                {userOption.full_name}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <p className="mt-1 text-sm font-medium text-slate-900">
                            {activeBlog.writer?.full_name ?? "Unassigned"}
                          </p>
                        )}
                      </label>

                      <label className="block text-xs text-slate-600">
                        Publisher
                        {canChangePublisherAssignment ? (
                          <select
                            className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
                            value={activeBlog.publisher_id ?? ""}
                            onChange={(event) => {
                              const nextPublisherId = event.target.value || null;
                              void updateBlogInline(
                                activeBlog,
                                { publisher_id: nextPublisherId },
                                `Publisher updated for "${activeBlog.title}".`
                              );
                            }}
                          >
                            <option value="">Unassigned</option>
                            {assignmentOptions.map((userOption) => (
                              <option key={userOption.id} value={userOption.id}>
                                {userOption.full_name}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <p className="mt-1 text-sm font-medium text-slate-900">
                            {activeBlog.publisher?.full_name ?? "Unassigned"}
                          </p>
                        )}
                      </label>

                      <label className="block text-xs text-slate-600">
                        Writer status
                        <select
                          disabled={!canEditWritingStage}
                          className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm disabled:bg-slate-100"
                          value={activeBlog.writer_status}
                          onChange={(event) => {
                            void updateBlogInline(
                              activeBlog,
                              { writer_status: event.target.value as WriterStageStatus },
                              `Writer status updated for "${activeBlog.title}".`
                            );
                          }}
                        >
                          {WRITER_STATUSES.map((status) => {
                            const isTransitionAllowed = canTransitionWriterStatus(
                              activeBlog.writer_status,
                              status,
                              hasPermission
                            );
                            return (
                              <option
                                key={status}
                                value={status}
                                disabled={!isTransitionAllowed}
                              >
                                {WRITER_STATUS_LABELS[status]}
                              </option>
                            );
                          })}
                        </select>
                      </label>

                      <label className="block text-xs text-slate-600">
                        Publisher status
                        <select
                          disabled={!canEditPublishingStage}
                          className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm disabled:bg-slate-100"
                          value={activeBlog.publisher_status}
                          onChange={(event) => {
                            void updateBlogInline(
                              activeBlog,
                              { publisher_status: event.target.value as PublisherStageStatus },
                              `Publisher status updated for "${activeBlog.title}".`
                            );
                          }}
                        >
                          {PUBLISHER_STATUSES.map((status) => {
                            const isTransitionAllowed = canTransitionPublisherStatus(
                              activeBlog.publisher_status,
                              status,
                              hasPermission
                            );
                            return (
                              <option
                                key={status}
                                value={status}
                                disabled={!isTransitionAllowed}
                              >
                                {PUBLISHER_STATUS_LABELS[status]}
                              </option>
                            );
                          })}
                        </select>
                      </label>

                      <label className="block text-xs text-slate-600">
                        Scheduled date
                        <input
                          disabled={!canEditScheduledDate}
                          type="date"
                          className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm disabled:bg-slate-100"
                          value={formatDateInput(getBlogScheduledDate(activeBlog))}
                          onChange={(event) => {
                            const nextDate = event.target.value || null;
                            void updateBlogInline(
                              activeBlog,
                              {
                                scheduled_publish_date: nextDate,
                                target_publish_date: nextDate,
                              },
                              `Scheduled date updated for "${activeBlog.title}".`
                            );
                          }}
                        />
                      </label>

                      <label className="block text-xs text-slate-600">
                        Display date
                        <input
                          disabled={!canEditDisplayDate}
                          type="date"
                          className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm disabled:bg-slate-100"
                          value={formatDateInput(activeBlog.display_published_date)}
                          onChange={(event) => {
                            const nextDisplayDate = event.target.value || null;
                            void updateBlogInline(
                              activeBlog,
                              { display_published_date: nextDisplayDate },
                              `Display date updated for "${activeBlog.title}".`
                            );
                          }}
                        />
                      </label>
                    </div>
                  </section>

                  <section className="rounded-lg border border-slate-200 p-3">
                    <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Links
                    </h4>
                    <div className="mt-2 space-y-1 text-sm text-slate-700">
                      <p>
                        Google Doc:{" "}
                        {activeBlog.google_doc_url ? (
                          <ExternalLink
                            href={activeBlog.google_doc_url}
                            className="text-blue-600 underline"
                          >
                            {activeBlog.google_doc_url}
                          </ExternalLink>
                        ) : (
                          "—"
                        )}
                      </p>
                      <p>
                        Live URL:{" "}
                        {activeBlog.live_url ? (
                          <ExternalLink
                            href={activeBlog.live_url}
                            className="text-blue-600 underline"
                          >
                            {activeBlog.live_url}
                          </ExternalLink>
                        ) : (
                          "—"
                        )}
                      </p>
                    </div>
                  </section>

                  <section className="rounded-lg border border-slate-200 p-3">
                    <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Comments
                    </h4>
                    <div className="mt-2 space-y-2">
                      {canCreateComments ? (
                        <>
                          <textarea
                            value={panelCommentDraft}
                            onChange={(event) => {
                              setPanelCommentDraft(event.target.value);
                            }}
                            className="min-h-20 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                            placeholder="Add a comment..."
                            maxLength={2000}
                          />
                          <div className="flex justify-end">
                            <button
                              type="button"
                              disabled={isPanelCommentSaving}
                              className="rounded-md bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
                              onClick={() => {
                                void handlePanelAddComment();
                              }}
                            >
                              {isPanelCommentSaving ? "Adding..." : "Add Comment"}
                            </button>
                          </div>
                        </>
                      ) : (
                        <p className="text-sm text-slate-500">
                          You do not have permission to add comments.
                        </p>
                      )}
                      {panelComments.length === 0 ? (
                        <p className="text-sm text-slate-500">No comments yet.</p>
                      ) : (
                        <ul className="space-y-2">
                          {panelComments.map((comment) => (
                            <li key={comment.id} className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
                              <div className="flex items-start gap-2">
                                <span className="mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-200 text-[10px] font-semibold text-slate-700">
                                  {(comment.author?.full_name ?? "U").slice(0, 1).toUpperCase()}
                                </span>
                                <div className="min-w-0">
                                  <p className="text-xs font-semibold text-slate-600">
                                    {comment.author?.full_name ?? "Unknown"} —{" "}
                                    {formatDistanceToNow(new Date(comment.created_at), {
                                      addSuffix: true,
                                    })}
                                  </p>
                                  <p className="mt-1 text-sm text-slate-800">{comment.comment}</p>
                                </div>
                              </div>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </section>

                  <section className="rounded-lg border border-slate-200 p-3">
                    <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Activity Timeline
                    </h4>
                    {isPanelLoading ? (
                      <p className="mt-2 text-sm text-slate-500">Loading timeline…</p>
                    ) : panelHistory.length === 0 ? (
                      <p className="mt-2 text-sm text-slate-500">No activity history yet.</p>
                    ) : (
                      <ol className="mt-2 space-y-2">
                        {panelHistory.map((entry) => (
                          <li
                            key={entry.id}
                            className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2"
                          >
                            <p className="text-sm font-medium text-slate-800">
                              {toTitleCase(entry.event_type)}
                            </p>
                            <p className="text-xs text-slate-600">
                              {entry.field_name ? `${entry.field_name}: ` : ""}
                              {entry.old_value ?? "—"} → {entry.new_value ?? "—"}
                            </p>
                            <p className="text-xs text-slate-400">
                              {format(new Date(entry.changed_at), "PPp")}
                            </p>
                          </li>
                        ))}
                      </ol>
                    )}
                  </section>
                </div>
              </aside>
            </>
          ) : null}
        </div>
      </AppShell>
    </ProtectedPage>
  );
}
