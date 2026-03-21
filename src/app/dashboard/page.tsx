"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";

import { AppShell } from "@/components/app-shell";
import { BlogDetailsDrawer } from "@/components/blog-details-drawer";
import { BlogImportModal } from "@/components/blog-import-modal";
import { Button } from "@/components/button";
import { CheckboxMultiSelect } from "@/components/checkbox-multi-select";
import { ColumnEditor } from "@/components/column-editor";
import { DashboardTable } from "@/components/dashboard-table";
import { DetailDrawerField } from "@/components/detail-drawer";
import { FilterBar } from "@/components/filter-bar";
import {
  DATA_PAGE_CONTROL_ACTION_BUTTON_CLASS,
  DATA_PAGE_CONTROL_ACTIONS_CLASS,
  DATA_PAGE_CONTROL_ROW_CLASS,
  DATA_PAGE_CONTROL_STRIP_CLASS,
  DATA_PAGE_STACK_CLASS,
  DataPageEmptyState,
  DataPageFilterPills,
  DataPageHeader,
  DataPageTableFeedback,
  DataPageToolbar,
} from "@/components/data-page";
import { ExternalLink } from "@/components/external-link";
import { KbdShortcut } from "@/components/kbd-shortcut";
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
  SEGMENTED_CONTROL_CLASS,
  segmentedControlItemClass,
} from "@/lib/segmented-control";
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
import { getSiteBadgeClasses, getSiteLabel, getSiteShortLabel } from "@/lib/site";
import { MAIN_CREATE_SHORTCUTS } from "@/lib/shortcuts";
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
import { formatDateInTimezone } from "@/lib/format-date";
import { useAuth } from "@/providers/auth-provider";
import { useSystemFeedback } from "@/providers/system-feedback-provider";
import { logDashboardVisitEvent } from "@/app/actions/log-dashboard-visit";

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

type DashboardColumnKey =
  | "title"
  | "site"
  | "writer"
  | "writer_status"
  | "publisher"
  | "publisher_status"
  | "overall_status"
  | "publish_date";
type DashboardSortField = DashboardColumnKey;

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
const REQUIRED_DASHBOARD_COLUMNS: DashboardColumnKey[] = [];

const DASHBOARD_COLUMN_VIEW_STORAGE_KEY = "dashboard-column-view:v1";
const DASHBOARD_COLUMN_HIDDEN_STORAGE_KEY = "dashboard-column-hidden:v1";

const isDashboardColumnKey = (value: string): value is DashboardColumnKey =>
  value in DASHBOARD_COLUMN_LABELS;
const escapeCsvValue = (value: string) => `"${value.replaceAll("\"", "\"\"")}"`;
const escapeHtmlValue = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;")
    .replaceAll("'", "&#39;");

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
      seen.has(item)
    ) {
      continue;
    }
    hiddenColumns.push(item);
    seen.add(item);
  }
  return hiddenColumns;
};

const DASHBOARD_SORT_FIELDS: DashboardSortField[] = [
  "publish_date",
  "title",
  "site",
  "writer",
  "publisher",
  "overall_status",
  "writer_status",
  "publisher_status",
];
type MetricFilterKey =
  | "scheduled_this_week"
  | "ready_to_publish"
  | "currently_writing"
  | "under_review"
  | "needs_revision"
  | "publishing_in_progress";
const METRIC_FILTER_LABELS: Record<MetricFilterKey, string> = {
  scheduled_this_week: "Scheduled This Week",
  ready_to_publish: "Ready to Publish",
  currently_writing: "Currently Writing",
  under_review: "Under Review",
  needs_revision: "Needs Revision",
  publishing_in_progress: "Publishing In Progress",
};

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
  rowDensity: "compact" | "comfortable";
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

const DASHBOARD_FILTER_STATE_STORAGE_KEY = "dashboard-filter-state:v1";
const DASHBOARD_SAVED_VIEWS_STORAGE_KEY = "dashboard-saved-views:v1";
const DASHBOARD_ACTIVE_SAVED_VIEW_STORAGE_KEY = "dashboard-active-saved-view:v1";
const buildUserScopedStorageKey = (baseKey: string, userId: string | null | undefined) =>
  `${baseKey}:${userId ?? "anonymous"}`;

const DASHBOARD_SORT_FIELD_SET = new Set<DashboardSortField>(DASHBOARD_SORT_FIELDS);
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
  rowDensity: "compact",
  rowLimit: DEFAULT_TABLE_ROW_LIMIT,
};

const isSortDirection = (value: unknown): value is SortDirection =>
  value === "asc" || value === "desc";
const isRowDensity = (value: unknown): value is "compact" | "comfortable" =>
  value === "compact" || value === "comfortable";

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
  const rowDensity = isRowDensity(state.rowDensity)
    ? state.rowDensity
    : DEFAULT_DASHBOARD_FILTER_STATE.rowDensity;

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
    rowDensity,
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
  useEffect(() => {
    if (!user?.id) {
      return;
    }
    void logDashboardVisitEvent(user.id);
  }, [user?.id]);
  const permissionContract = useMemo(
    () => createUiPermissionContract(hasPermission),
    [hasPermission]
  );
  const canCreateBlog = permissionContract.canCreateBlog;
  const canManageSocialPosts =
    permissionContract.canViewDashboard || permissionContract.canOverrideWorkflow;
  const canRunDataImport = hasPermission("run_data_import");
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
  const canEditPanelDetails =
    canChangeWriterAssignment ||
    canChangePublisherAssignment ||
    canEditWritingStage ||
    canEditPublishingStage ||
    canEditScheduledDate ||
    canEditDisplayDate;
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
  const [rowDensity, setRowDensity] = useState<"compact" | "comfortable">("compact");
  const [columnOrder, setColumnOrder] = useState<DashboardColumnKey[]>(
    DEFAULT_DASHBOARD_COLUMN_ORDER
  );
  const [hiddenColumns, setHiddenColumns] = useState<DashboardColumnKey[]>(
    DEFAULT_DASHBOARD_HIDDEN_COLUMNS
  );
  const [savedViews, setSavedViews] = useState<SavedDashboardView[]>([]);
  const [activeSavedViewId, setActiveSavedViewId] = useState<string | null>(null);
  const [rowLimit, setRowLimit] = useState<TableRowLimit>(DEFAULT_TABLE_ROW_LIMIT);
  const [currentPage, setCurrentPage] = useState(1);
  const [staleDraftDays, setStaleDraftDays] = useState(10);
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
  const [isPanelEditMode, setIsPanelEditMode] = useState(false);
  const [activeMetricFilter, setActiveMetricFilter] = useState<MetricFilterKey | null>(null);
  const [isApplyingFilterFeedback, setIsApplyingFilterFeedback] = useState(false);
  const [isEditColumnsOpen, setIsEditColumnsOpen] = useState(false);
  const [hasLoadedLocalState, setHasLoadedLocalState] = useState(false);
  const [, setCompletionTimingsByBlog] = useState<
    Record<string, BlogCompletionTiming>
  >({});
  const columnEditorRef = useRef<HTMLDivElement | null>(null);
  const tableContainerRef = useRef<HTMLDivElement | null>(null);
  const hydratedStorageKeysRef = useRef<string | null>(null);
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
    setRowDensity(nextState.rowDensity);
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
      rowDensity,
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
      rowDensity,
    ]
  );
  const hasActiveDashboardFilters =
    search.trim().length > 0 ||
    siteFilters.length > 0 ||
    statusFilters.length > 0 ||
    writerFilters.length > 0 ||
    publisherFilters.length > 0 ||
    writerStatusFilters.length > 0 ||
    publisherStatusFilters.length > 0 ||
    activeMetricFilter !== null;

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
      setError(
        `Couldn't load dashboard. ${blogsError.message ? "Error: " + blogsError.message : "Try refreshing."}`
      );
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
    const savedHiddenColumns = window.localStorage.getItem(columnHiddenStorageKey);
    if (savedHiddenColumns) {
      try {
        const parsedHiddenColumns = JSON.parse(savedHiddenColumns) as unknown;
        setHiddenColumns(normalizeDashboardHiddenColumns(parsedHiddenColumns));
      } catch {
        setHiddenColumns(DEFAULT_DASHBOARD_HIDDEN_COLUMNS);
      }
    }
  }, [columnHiddenStorageKey, columnViewStorageKey]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const storageKeySignature = `${filterStateStorageKey}|${savedViewsStorageKey}|${activeSavedViewStorageKey}`;
    if (hydratedStorageKeysRef.current === storageKeySignature) {
      return;
    }
    hydratedStorageKeysRef.current = storageKeySignature;

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
      setIsPanelEditMode(false);
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
        if (activeBlogId) {
          setActiveBlogId(null);
          setPanelError(null);
          setPanelCommentDraft("");
          setIsPanelEditMode(false);
        }
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("keydown", handleEscape);
    };
  }, [activeBlogId, closeOpenDashboardMenus]);

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
    () => SITES.map((site) => ({ value: site, label: getSiteShortLabel(site) })),
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
    const todayDate = new Date();
    const weekStart = new Date(todayDate);
    weekStart.setDate(todayDate.getDate() - todayDate.getDay());
    weekStart.setHours(0, 0, 0, 0);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);

    const isScheduledThisWeek = (blog: BlogRecord) => {
      const scheduledDate = getBlogScheduledDate(blog);
      if (!scheduledDate) {
        return false;
      }
      const scheduledTime = new Date(`${scheduledDate}T00:00:00`).getTime();
      return scheduledTime >= weekStart.getTime() && scheduledTime <= weekEnd.getTime();
    };

    const matchesMetricFilter = (blog: BlogRecord) => {
      if (!activeMetricFilter) {
        return true;
      }

      if (activeMetricFilter === "scheduled_this_week") {
        return isScheduledThisWeek(blog);
      }
      if (activeMetricFilter === "ready_to_publish") {
        return blog.overall_status === "ready_to_publish";
      }
      if (activeMetricFilter === "currently_writing") {
        return blog.writer_status === "in_progress";
      }
      if (activeMetricFilter === "under_review") {
        return (
          blog.writer_status === "needs_revision" ||
          blog.publisher_status === "in_progress"
        );
      }
      if (activeMetricFilter === "needs_revision") {
        return blog.writer_status === "needs_revision";
      }
      return (
        blog.writer_status === "completed" &&
        blog.publisher_status === "in_progress"
      );
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
      } else if (sortField === "site") {
        compareResult = collator.compare(left.site, right.site);
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


    const currentlyWriting = blogs.filter(
      (blog) => blog.writer_status === "in_progress"
    ).length;

    const underReview = blogs.filter(
      (blog) =>
        blog.writer_status === "needs_revision" ||
        blog.publisher_status === "in_progress"
    ).length;

    const needsRevision = blogs.filter(
      (blog) => blog.writer_status === "needs_revision"
    ).length;


    const publishingInProgress = blogs.filter(
      (blog) =>
        blog.writer_status === "completed" &&
        blog.publisher_status === "in_progress"
    ).length;

    return {
      scheduledThisWeek,
      readyToPublish,
      currentlyWriting,
      underReview,
      needsRevision,
      publishingInProgress,
    };
  }, [blogs]);

  const visibleBlogIds = useMemo(() => pagedBlogs.map((blog) => blog.id), [pagedBlogs]);
  const activeBlogIndex = useMemo(
    () => sortedBlogs.findIndex((blog) => blog.id === activeBlogId),
    [activeBlogId, sortedBlogs]
  );
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
  const handleSortByColumn = (column: DashboardColumnKey) => {
    if (sortField === column) {
      setSortDirection((previous) => (previous === "asc" ? "desc" : "asc"));
      return;
    }
    setSortField(column);
    setSortDirection("asc");
  };

  const clearBulkUiState = () => {
    setSelectedBlogIds([]);
    setBulkWriterId("");
    setBulkPublisherId("");
    setBulkWriterStatus("");
    setBulkPublisherStatus("");
  };
  const toggleColumnVisibility = (column: DashboardColumnKey) => {
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
    setActiveMetricFilter(null);
    setActiveSavedViewId(null);
    setError(null);
    setSuccessMessage("Dashboard filters reset.");
  }, [applyFilterState]);
  const clearAllFilters = useCallback(() => {
    resetDashboardFilters();
    setSuccessMessage("All filters cleared.");
  }, [resetDashboardFilters]);

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
          label: `Site: ${getSiteShortLabel(site)}`,
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
              label: `Metric: ${METRIC_FILTER_LABELS[activeMetricFilter]}`,
              onRemove: () => {
                setActiveMetricFilter(null);
              },
            }
          : null,
      ].filter((pill) => pill !== null),
    [
      activeMetricFilter,
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
    const baseName = `View ${formatDateInTimezone(new Date().toISOString(), profile?.timezone, "MMM d yyyy, h:mm a")}`;
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
        return getSiteShortLabel(blog.site);
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

  const getSmartExportScope = (): "selected" | "view" => {
    if (selectedBlogIds.length === 0 || selectedBlogIds.length === sortedBlogs.length) {
      return "view";
    }
    return "selected";
  };
  const handleCopyValues = useCallback(async (field: "title" | "url") => {
    const values =
      field === "title"
        ? sortedBlogs.map((blog) => blog.title)
        : sortedBlogs
            .map((blog) => blog.live_url ?? "")
            .filter((value) => value.length > 0);
    if (values.length === 0) {
      setError(field === "title" ? "No titles to copy." : "No URLs to copy.");
      setSuccessMessage(null);
      return;
    }
    try {
      await navigator.clipboard.writeText(values.join("\n"));
      setError(null);
      setSuccessMessage(field === "title" ? "Copied all titles." : "Copied all URLs.");
    } catch {
      setError("Could not copy to clipboard.");
      setSuccessMessage(null);
    }
  }, [sortedBlogs]);

  const handleExportCsv = useCallback((scope: "selected" | "view") => {
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
  }, [
    buildCsvContent,
    canExportCsv,
    canExportSelectedCsv,
    selectedBlogs,
    sortedBlogs,
    triggerCsvDownload,
  ]);

  const handleExportPdf = useCallback(
    (scope: "selected" | "view") => {
      if (scope === "selected" && !canExportSelectedCsv) {
        setError("You do not have permission to export selected PDF.");
        setSuccessMessage(null);
        return;
      }
      if (scope === "view" && !canExportCsv) {
        setError("You do not have permission to export PDF.");
        setSuccessMessage(null);
        return;
      }

      const rowsToExport = scope === "selected" ? selectedBlogs : sortedBlogs;
      if (rowsToExport.length === 0) {
        setError(
          scope === "selected"
            ? "Select at least one blog before exporting PDF."
            : "No blogs available in the current view to export."
        );
        setSuccessMessage(null);
        return;
      }

      const popup = window.open("", "_blank", "width=1100,height=800");
      if (!popup) {
        setError("Popup blocked. Allow popups to export PDF.");
        setSuccessMessage(null);
        return;
      }

      const generatedAt = formatDateInTimezone(new Date().toISOString(), profile?.timezone, "MMM d yyyy, h:mm a");
      const headerMarkup = visibleColumnOrder
        .map((column) => `<th>${escapeHtmlValue(DASHBOARD_COLUMN_LABELS[column])}</th>`)
        .join("");
      const rowsMarkup = rowsToExport
        .map((blog) => {
          const cells = visibleColumnOrder
            .map((column) => `<td>${escapeHtmlValue(getExportCellValue(blog, column))}</td>`)
            .join("");
          return `<tr>${cells}</tr>`;
        })
        .join("");

      popup.document.open();
      popup.document.write(`<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Dashboard Export</title>
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
  <h1>Dashboard Export</h1>
  <p>Generated ${escapeHtmlValue(generatedAt)}</p>
  <table>
    <thead><tr>${headerMarkup}</tr></thead>
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
      setError(null);
      setSuccessMessage(
        `PDF ready for ${rowsToExport.length} blog(s). Use the print dialog to save.`
      );
    },
    [
      canExportCsv,
      canExportSelectedCsv,
      getExportCellValue,
      selectedBlogs,
      sortedBlogs,
      visibleColumnOrder,
    ]
  );
  useEffect(() => {
    const handlePaletteAction = (event: Event) => {
      const actionId = (event as CustomEvent<{ actionId?: string }>).detail?.actionId;
      if (actionId === "clear_all_filters") {
        clearAllFilters();
        return;
      }
      if (actionId === "export_current_view") {
        handleExportCsv("view");
      }
    };
    window.addEventListener("command-palette-action", handlePaletteAction as EventListener);
    return () => {
      window.removeEventListener(
        "command-palette-action",
        handlePaletteAction as EventListener
      );
    };
  }, [clearAllFilters, handleExportCsv]);

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
      
      // Warn if advancing writer status without Google Doc link
      if (
        updates.writer_status !== undefined &&
        updates.writer_status !== "not_started" &&
        updates.writer_status !== "in_progress" &&
        !nextBlog.google_doc_url
      ) {
        setSuccessMessage(
          `${message} (Note: Please add a Google Doc link when available)`
        );
      } else {
        setSuccessMessage(message);
      }
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
  const closePanel = useCallback(() => {
    setActiveBlogId(null);
    setPanelError(null);
    setPanelCommentDraft("");
    setIsPanelEditMode(false);
  }, []);

  const openPanel = useCallback((blogId: string) => {
    setActiveBlogId(blogId);
    setIsPanelEditMode(false);
    setPanelError(null);
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

  return (
    <ProtectedPage requiredPermissions={["view_dashboard"]}>
      <AppShell>
        <div className={`${DATA_PAGE_STACK_CLASS} transition-opacity duration-200`}>
          <DataPageHeader
            title="Dashboard"
            description="Track assignments, writing progress, and publishing readiness."
            primaryAction={
              <div className="flex flex-wrap items-center gap-2">
                {canCreateBlog || canManageSocialPosts ? (
                  <details className="relative">
                    <summary className="cursor-pointer list-none rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700">
                      Add
                    </summary>
                    <div className="absolute right-0 z-30 mt-1 w-48 rounded-md border border-slate-200 bg-white p-1 shadow-lg">
                      {canCreateBlog ? (
                        <>
                          <button
                            type="button"
                            className="block w-full rounded px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-100"
                            onClick={() => {
                              closeOpenDashboardMenus();
                              router.push("/ideas");
                            }}
                          >
                            <span className="flex items-center justify-between gap-3">
                              <span>New Idea</span>
                              <KbdShortcut className="border-slate-200 bg-slate-50 text-slate-500">
                                {MAIN_CREATE_SHORTCUTS.newIdea}
                              </KbdShortcut>
                            </span>
                          </button>
                          <button
                            type="button"
                            className="block w-full rounded px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-100"
                            onClick={() => {
                              closeOpenDashboardMenus();
                              router.push("/blogs/new");
                            }}
                          >
                            <span className="flex items-center justify-between gap-3">
                              <span>New Blog</span>
                              <KbdShortcut className="border-slate-200 bg-slate-50 text-slate-500">
                                {MAIN_CREATE_SHORTCUTS.newBlog}
                              </KbdShortcut>
                            </span>
                          </button>
                        </>
                      ) : null}
                      {canManageSocialPosts ? (
                        <button
                          type="button"
                          className="block w-full rounded px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-100"
                          onClick={() => {
                            closeOpenDashboardMenus();
                            router.push("/social-posts?create=1");
                          }}
                        >
                          <span className="flex items-center justify-between gap-3">
                            <span>New Social Post</span>
                            <KbdShortcut className="border-slate-200 bg-slate-50 text-slate-500">
                              {MAIN_CREATE_SHORTCUTS.newSocialPost}
                            </KbdShortcut>
                          </span>
                        </button>
                      ) : null}
                    </div>
                  </details>
                ) : null}
              </div>
            }
          />
          <section className="rounded-md border border-slate-200 bg-slate-50 p-3">
            <h2 className="text-sm font-semibold text-slate-900">Overview</h2>
            <div className="mt-3 grid gap-2 text-sm md:grid-cols-3">
              <button
                type="button"
                className={`rounded-lg border px-3 py-3 text-left transition ${
                  activeMetricFilter === "scheduled_this_week"
                    ? "border-slate-900 bg-slate-900 text-white shadow-sm"
                    : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                }`}
                onClick={() => {
                  setActiveMetricFilter((previous) =>
                    previous === "scheduled_this_week" ? null : "scheduled_this_week"
                  );
                }}
              >
                <p className="text-xs font-semibold text-slate-700">
                  Scheduled This Week
                </p>
                <p className="mt-2 text-2xl font-semibold tabular-nums">
                  {focusStripMetrics.scheduledThisWeek}
                </p>
              </button>
              <button
                type="button"
                className={`rounded-lg border px-3 py-3 text-left transition ${
                  activeMetricFilter === "currently_writing"
                    ? "border-slate-900 bg-slate-900 text-white shadow-sm"
                    : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                }`}
                onClick={() => {
                  setActiveMetricFilter((previous) =>
                    previous === "currently_writing" ? null : "currently_writing"
                  );
                }}
              >
                <p className="text-xs font-semibold text-slate-700">
                  Writing in Progress
                </p>
                <p className="mt-2 text-2xl font-semibold tabular-nums">
                  {focusStripMetrics.currentlyWriting}
                </p>
              </button>
              <button
                type="button"
                className={`rounded-lg border px-3 py-3 text-left transition ${
                  activeMetricFilter === "under_review"
                    ? "border-slate-900 bg-slate-900 text-white shadow-sm"
                    : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                }`}
                onClick={() => {
                  setActiveMetricFilter((previous) =>
                    previous === "under_review" ? null : "under_review"
                  );
                }}
              >
                <p className="text-xs font-semibold text-slate-700">
                  Under Review
                </p>
                <p className="mt-2 text-2xl font-semibold tabular-nums">
                  {focusStripMetrics.underReview}
                </p>
              </button>
              <button
                type="button"
                className={`rounded-lg border px-3 py-3 text-left transition ${
                  activeMetricFilter === "needs_revision"
                    ? "border-slate-900 bg-slate-900 text-white shadow-sm"
                    : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                }`}
                onClick={() => {
                  setActiveMetricFilter((previous) =>
                    previous === "needs_revision" ? null : "needs_revision"
                  );
                }}
              >
                <p className="text-xs font-semibold text-slate-700">
                  Needs Revision
                </p>
                <p className="mt-2 text-2xl font-semibold tabular-nums">
                  {focusStripMetrics.needsRevision}
                </p>
              </button>
              <button
                type="button"
                className={`rounded-lg border px-3 py-3 text-left transition ${
                  activeMetricFilter === "ready_to_publish"
                    ? "border-slate-900 bg-slate-900 text-white shadow-sm"
                    : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                }`}
                onClick={() => {
                  setActiveMetricFilter((previous) =>
                    previous === "ready_to_publish" ? null : "ready_to_publish"
                  );
                }}
              >
                <p className="text-xs font-semibold text-slate-700">
                  Ready to Publish
                </p>
                <p className="mt-2 text-2xl font-semibold tabular-nums">
                  {focusStripMetrics.readyToPublish}
                </p>
              </button>
              <button
                type="button"
                className={`rounded-lg border px-3 py-3 text-left transition ${
                  activeMetricFilter === "publishing_in_progress"
                    ? "border-slate-900 bg-slate-900 text-white shadow-sm"
                    : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                }`}
                onClick={() => {
                  setActiveMetricFilter((previous) =>
                    previous === "publishing_in_progress" ? null : "publishing_in_progress"
                  );
                }}
              >
                <p className="text-xs font-semibold text-slate-700">
                  Publishing in Progress
                </p>
                <p className="mt-2 text-2xl font-semibold tabular-nums">
                  {focusStripMetrics.publishingInProgress}
                </p>
              </button>
            </div>
          </section>
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
              <div className="md:col-span-2 xl:col-span-4 grid gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-600 mb-2">Filter by</p>
                  <div className="grid gap-3 md:grid-cols-3">
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
                    <CheckboxMultiSelect
                      label="Publishers"
                      options={publisherFilterOptions}
                      selectedValues={publisherFilters}
                      onChange={setPublisherFilters}
                    />
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
                      label="Stage"
                      options={overallStatusFilterOptions}
                      selectedValues={statusFilters}
                      onChange={(nextValues) => {
                        setStatusFilters(nextValues as OverallBlogStatus[]);
                      }}
                    />
                  </div>
                </div>
              </div>
            }
          />
          <DataPageFilterPills pills={activeFilterPills} />

          {(search || siteFilters.length > 0 || statusFilters.length > 0 || writerFilters.length > 0 || publisherFilters.length > 0 || writerStatusFilters.length > 0 || publisherStatusFilters.length > 0) && (
            <FilterBar
              filters={[
                ...(search ? [{ id: "search", label: "Search", value: search }] : []),
                ...siteFilters.map((site) => ({
                  id: `site-${site}`,
                  label: "Site",
                  value: getSiteShortLabel(site),
                })),
                ...statusFilters.map((status) => ({
                  id: `status-${status}`,
                  label: "Status",
                  value: STATUS_LABELS[status],
                })),
                ...writerFilters.map((writerId) => {
                  const writer = assignableUsers.find((u) => u.id === writerId);
                  return {
                    id: `writer-${writerId}`,
                    label: "Writer",
                    value: writer?.full_name || writerId,
                  };
                }),
                ...publisherFilters.map((publisherId) => {
                  const publisher = assignableUsers.find((u) => u.id === publisherId);
                  return {
                    id: `publisher-${publisherId}`,
                    label: "Publisher",
                    value: publisher?.full_name || publisherId,
                  };
                }),
                ...writerStatusFilters.map((writerStatus) => ({
                  id: `writer-status-${writerStatus}`,
                  label: "Writer Status",
                  value: WRITER_STATUS_LABELS[writerStatus],
                })),
                ...publisherStatusFilters.map((publisherStatus) => ({
                  id: `publisher-status-${publisherStatus}`,
                  label: "Publisher Status",
                  value: PUBLISHER_STATUS_LABELS[publisherStatus],
                })),
              ]}
              onRemoveFilter={(filterId) => {
                if (filterId === "search") {
                  setSearch("");
                } else if (filterId.startsWith("site-")) {
                  const site = filterId.replace("site-", "") as BlogSite;
                  setSiteFilters((prev) => prev.filter((s) => s !== site));
                } else if (filterId.startsWith("status-")) {
                  const status = filterId.replace("status-", "") as OverallBlogStatus;
                  setStatusFilters((prev) => prev.filter((s) => s !== status));
                } else if (filterId.startsWith("writer-") && !filterId.startsWith("writer-status-")) {
                  const writerId = filterId.replace("writer-", "");
                  setWriterFilters((prev) => prev.filter((id) => id !== writerId));
                } else if (filterId.startsWith("publisher-") && !filterId.startsWith("publisher-status-")) {
                  const publisherId = filterId.replace("publisher-", "");
                  setPublisherFilters((prev) => prev.filter((id) => id !== publisherId));
                } else if (filterId.startsWith("writer-status-")) {
                  const status = filterId.replace("writer-status-", "") as WriterStageStatus;
                  setWriterStatusFilters((prev) => prev.filter((s) => s !== status));
                } else if (filterId.startsWith("publisher-status-")) {
                  const status = filterId.replace("publisher-status-", "") as PublisherStageStatus;
                  setPublisherStatusFilters((prev) => prev.filter((s) => s !== status));
                }
              }}
              onClearAll={() => {
                setSearch("");
                setSiteFilters([]);
                setStatusFilters([]);
                setWriterFilters([]);
                setPublisherFilters([]);
                setWriterStatusFilters([]);
                setPublisherStatusFilters([]);
                setCurrentPage(1);
              }}
            />
          )}

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
              <section className={`${DATA_PAGE_CONTROL_STRIP_CLASS} relative`} ref={columnEditorRef}>
                <div className={DATA_PAGE_CONTROL_ROW_CLASS}>
                  <div className="flex flex-wrap items-center gap-3">
                    <TableResultsSummary
                      totalRows={sortedBlogs.length}
                      currentPage={currentPage}
                      rowLimit={rowLimit}
                      noun="blogs"
                    />
                  </div>
                  <div className={DATA_PAGE_CONTROL_ACTIONS_CLASS}>
                    <details className="relative">
                      <summary
                        className={`${DATA_PAGE_CONTROL_ACTION_BUTTON_CLASS} cursor-pointer list-none border border-slate-300 bg-white text-slate-700 hover:bg-slate-100`}
                      >
                        Copy
                      </summary>
                      <div className="absolute right-0 z-30 mt-1 w-40 rounded-md border border-slate-200 bg-white p-1 shadow-md">
                        <button
                          type="button"
                          disabled={sortedBlogs.length === 0}
                          className="block w-full rounded px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                          onClick={() => {
                            closeOpenDashboardMenus();
                            void handleCopyValues("title");
                          }}
                        >
                          All titles
                        </button>
                        <button
                          type="button"
                          disabled={sortedBlogs.length === 0}
                          className="block w-full rounded px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                          onClick={() => {
                            closeOpenDashboardMenus();
                            void handleCopyValues("url");
                          }}
                        >
                          All URLs
                        </button>
                      </div>
                    </details>
                    <button
                      type="button"
                      className={`${DATA_PAGE_CONTROL_ACTION_BUTTON_CLASS} border border-slate-300 bg-white text-slate-700 hover:bg-slate-100`}
                      onClick={() => {
                        setIsEditColumnsOpen((previous) => !previous);
                      }}
                    >
                      Customize
                    </button>
                    {canRunDataImport ? (
                      <BlogImportModal
                        triggerLabel="Import"
                        triggerVariant="primary"
                        triggerSize="sm"
                        triggerClassName={DATA_PAGE_CONTROL_ACTION_BUTTON_CLASS}
                        onImported={async (summary) => {
                          await loadData();
                          showSuccess(
                            `Import complete: ${summary.created} created, ${summary.updated} updated, ${summary.failed} failed.`
                          );
                        }}
                      />
                    ) : null}
                    {canExportCsv || canExportSelectedCsv ? (
                      <details className="relative">
                        <summary
                          className={`${DATA_PAGE_CONTROL_ACTION_BUTTON_CLASS} cursor-pointer list-none border border-slate-900 bg-slate-900 text-white hover:bg-slate-700`}
                        >
                          Export
                        </summary>
                        <div className="absolute right-0 z-30 mt-1 w-40 rounded-md border border-slate-200 bg-white p-1 shadow-md">
                          <button
                            type="button"
                            disabled={sortedBlogs.length === 0}
                            className="block w-full rounded px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                            onClick={() => {
                              handleExportCsv(getSmartExportScope());
                              closeOpenDashboardMenus();
                            }}
                          >
                            As .CSV file
                          </button>
                          <button
                            type="button"
                            disabled={sortedBlogs.length === 0}
                            className="block w-full rounded px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                            onClick={() => {
                              handleExportPdf(getSmartExportScope());
                              closeOpenDashboardMenus();
                            }}
                          >
                            As .PDF file
                          </button>
                        </div>
                      </details>
                    ) : null}
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
                          onClick={saveCurrentFiltersAsView}
                        >
                          Save View
                        </button>
                        <details className="relative">
                          <summary className="cursor-pointer list-none rounded border border-slate-300 bg-white px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100">
                            Load View ▼
                          </summary>
                          <div className="absolute right-0 z-40 mt-1 w-56 rounded-md border border-slate-200 bg-white p-1 shadow-lg">
                            {sortedSavedViews.length === 0 ? (
                              <p className="px-3 py-2 text-xs text-slate-500">No saved views yet.</p>
                            ) : (
                              sortedSavedViews.map((view) => (
                                <button
                                  key={view.id}
                                  type="button"
                                  className={`block w-full rounded px-3 py-2 text-left text-sm transition ${
                                    activeSavedViewId === view.id
                                      ? "bg-slate-900 text-white"
                                      : "text-slate-700 hover:bg-slate-100"
                                  }`}
                                  onClick={() => {
                                    closeOpenDashboardMenus();
                                    applySavedView(view);
                                  }}
                                >
                                  <p className="font-medium">{view.name}</p>
                                  <p className="text-[11px] opacity-75">
                                    {activeSavedViewId === view.id ? "Active" : "Click to apply"}
                                  </p>
                                </button>
                              ))
                            )}
                          </div>
                        </details>
                        <button
                          type="button"
                          className="rounded border border-slate-300 bg-white px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100"
                          onClick={resetColumnView}
                        >
                          Reset Default
                        </button>
                      </div>
                    </div>
                    <div className="mt-2 space-y-3">
                      <div className="flex items-center justify-between rounded border border-slate-200 bg-slate-50 px-2 py-1.5">
                        <span className="text-xs font-medium text-slate-600">Density</span>
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
                      <p className="text-[11px] text-slate-500">Drag columns to reorder, or use checkboxes to show/hide</p>
                      <ColumnEditor
                        columns={columnOrder.map((column) => ({
                          id: column,
                          label: DASHBOARD_COLUMN_LABELS[column],
                          isVisible: !hiddenColumnSet.has(column),
                        }))}
                        onReorder={(reorderedColumns) => {
                          setColumnOrder(reorderedColumns.map((col) => col.id as DashboardColumnKey));
                        }}
                        onToggleVisibility={(columnId) => {
                          toggleColumnVisibility(columnId as DashboardColumnKey);
                        }}
                        minVisibleColumns={1}
                      />
                    </div>
                  </div>
                ) : null}
              </section>
              {sortedBlogs.length === 0 && hasActiveDashboardFilters ? (
                <DataPageEmptyState
                  title="No blogs match your filters."
                  description="Clear filters to return to the full view, or import new records."
                  action={
                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={clearAllFilters}
                      >
                        Clear all filters
                      </Button>
                      {canRunDataImport ? (
                        <Button
                          type="button"
                          variant="primary"
                          size="sm"
                          onClick={() => {
                            router.push("/blogs?import=1");
                          }}
                        >
                          Open import
                        </Button>
                      ) : null}
                    </div>
                  }
                />
              ) : null}
              {sortedBlogs.length === 0 && !hasActiveDashboardFilters ? (
                <DataPageEmptyState
                  title="No blogs yet."
                  description="Create your first blog or import existing content to get started."
                  action={
                    <div className="flex flex-wrap items-center gap-2">
                      {canCreateBlog ? (
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={() => {
                            router.push("/blogs/new");
                          }}
                        >
                          Add new blog
                        </Button>
                      ) : null}
                      {canRunDataImport ? (
                        <Button
                          type="button"
                          variant="primary"
                          size="sm"
                          onClick={() => {
                            router.push("/blogs?import=1");
                          }}
                        >
                          Open import
                        </Button>
                      ) : null}
                    </div>
                  }
                />
              ) : null}

              <div className="overflow-hidden rounded-lg border border-slate-200">
                <div
                  ref={tableContainerRef}
                  className="max-h-[70vh] overflow-y-auto"
                >
                  <DashboardTable
                    blogs={pagedBlogs}
                    visibleColumns={visibleColumnOrder}
                    activeBlogId={activeBlogId}
                    selectedIds={selectedIdSet}
                    rowDensity={rowDensity}
                    canSelectRows={canSelectRows}
                    canEditWritingStage={canEditWritingStage}
                    canEditPublishingStage={canEditPublishingStage}
                    sortField={sortField}
                    sortDirection={sortDirection}
                    staleDraftDays={staleDraftDays}
                    onRowClick={openPanel}
                    onSortChange={handleSortByColumn}
                    onToggleAll={handleToggleAllVisible}
                    onToggleSingle={handleToggleSingle}
                    onWriterStatusChange={(blog, status) => {
                      void updateBlogInline(
                        blog,
                        { writer_status: status },
                        `Writer stage updated for "${blog.title}".`
                      );
                    }}
                    onPublisherStatusChange={(blog, status) => {
                      void updateBlogInline(
                        blog,
                        { publisher_status: status },
                        `Publisher stage updated for "${blog.title}".`
                      );
                    }}
                  />
                </div>
              </div>
              <div className={DATA_PAGE_CONTROL_STRIP_CLASS}>
                <div className="flex flex-wrap items-center gap-3">
                  <TableRowLimitSelect
                    value={rowLimit}
                    onChange={(value) => {
                      setRowLimit(value);
                      setActiveSavedViewId(null);
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
              <DataPageTableFeedback isVisible={isApplyingFilterFeedback} />
            </div>
          )}

          <BlogDetailsDrawer
            blog={activeBlog}
            isOpen={Boolean(activeBlog)}
            onClose={closePanel}
            subtitle={activeBlog ? getSiteLabel(activeBlog.site) : undefined}
            commentsCount={panelComments.length}
            timelineCount={panelHistory.length}
            siteBadge={
              activeBlog ? (
                <span
                  className={`inline-flex items-center justify-center rounded-full border px-2 py-0.5 text-xs font-medium ${getSiteBadgeClasses(
                    activeBlog.site
                  )}`}
                >
                  {getSiteShortLabel(activeBlog.site)}
                </span>
              ) : null
            }
            statusBadges={
              activeBlog ? (
                <>
                  <WorkflowStageBadge
                    stage={getWorkflowStage({
                      writerStatus: activeBlog.writer_status,
                      publisherStatus: activeBlog.publisher_status,
                    })}
                  />
                  <StatusBadge status={activeBlog.overall_status} />
                  <WriterStatusBadge status={activeBlog.writer_status} />
                  <PublisherStatusBadge status={activeBlog.publisher_status} />
                </>
              ) : null
            }
            overviewFields={
              activeBlog
                ? [
                    {
                      label: "Workflow stage",
                      value: toTitleCase(
                        getWorkflowStage({
                          writerStatus: activeBlog.writer_status,
                          publisherStatus: activeBlog.publisher_status,
                        })
                      ),
                    },
                    {
                      label: "Overall status",
                      value: STATUS_LABELS[activeBlog.overall_status],
                    },
                  ]
                : []
            }
            workflowContent={
              activeBlog ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  {isPanelEditMode && canChangeWriterAssignment ? (
                    <label className="block space-y-1">
                      <span className="text-xs text-slate-500">Writer</span>
                      <select
                        className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
                        value={activeBlog.writer_id ?? ""}
                        onChange={(event) => {
                          const nextWriterId = event.target.value || null;
                          void updateBlogInline(
                            activeBlog,
                            { writer_id: nextWriterId },
                            `Writer updated for \"${activeBlog.title}\".`
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
                    </label>
                  ) : (
                    <DetailDrawerField
                      label="Writer"
                      value={activeBlog.writer?.full_name ?? "Unassigned"}
                    />
                  )}

                  {isPanelEditMode && canChangePublisherAssignment ? (
                    <label className="block space-y-1">
                      <span className="text-xs text-slate-500">Publisher</span>
                      <select
                        className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
                        value={activeBlog.publisher_id ?? ""}
                        onChange={(event) => {
                          const nextPublisherId = event.target.value || null;
                          void updateBlogInline(
                            activeBlog,
                            { publisher_id: nextPublisherId },
                            `Publisher updated for \"${activeBlog.title}\".`
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
                    </label>
                  ) : (
                    <DetailDrawerField
                      label="Publisher"
                      value={activeBlog.publisher?.full_name ?? "Unassigned"}
                    />
                  )}

                  {isPanelEditMode && canEditWritingStage ? (
                    <label className="block space-y-1">
                      <span className="text-xs text-slate-500">Writer status</span>
                      <select
                        className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
                        value={activeBlog.writer_status}
                        onChange={(event) => {
                          void updateBlogInline(
                            activeBlog,
                            { writer_status: event.target.value as WriterStageStatus },
                            `Writer status updated for \"${activeBlog.title}\".`
                          );
                        }}
                      >
                        {WRITER_STATUSES.map((status) => {
                          const isTransitionAllowed = canTransitionWriterStatus(
                            activeBlog.writer_status,
                            status,
                            hasPermission
                          );
                          const needsGoogleDoc =
                            status !== "not_started" &&
                            status !== "in_progress" &&
                            !activeBlog.google_doc_url;
                          return (
                            <option
                              key={status}
                              value={status}
                              disabled={!isTransitionAllowed || needsGoogleDoc}
                            >
                              {WRITER_STATUS_LABELS[status]}
                            </option>
                          );
                        })}
                      </select>
                    </label>
                  ) : (
                    <DetailDrawerField
                      label="Writer status"
                      value={WRITER_STATUS_LABELS[activeBlog.writer_status]}
                    />
                  )}

                  {isPanelEditMode && canEditPublishingStage ? (
                    <label className="block space-y-1">
                      <span className="text-xs text-slate-500">Publisher status</span>
                      <select
                        className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
                        value={activeBlog.publisher_status}
                        onChange={(event) => {
                          void updateBlogInline(
                            activeBlog,
                            { publisher_status: event.target.value as PublisherStageStatus },
                            `Publisher status updated for \"${activeBlog.title}\".`
                          );
                        }}
                      >
                        {PUBLISHER_STATUSES.map((status) => {
                          const isTransitionAllowed = canTransitionPublisherStatus(
                            activeBlog.publisher_status,
                            status,
                            hasPermission
                          );
                          const needsGoogleDoc =
                            status !== "not_started" && !activeBlog.google_doc_url;
                          return (
                            <option
                              key={status}
                              value={status}
                              disabled={!isTransitionAllowed || needsGoogleDoc}
                            >
                              {PUBLISHER_STATUS_LABELS[status]}
                            </option>
                          );
                        })}
                      </select>
                    </label>
                  ) : (
                    <DetailDrawerField
                      label="Publisher status"
                      value={PUBLISHER_STATUS_LABELS[activeBlog.publisher_status]}
                    />
                  )}
                </div>
              ) : null
            }
            datesContent={
              activeBlog ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  {isPanelEditMode && canEditScheduledDate ? (
                    <label className="block space-y-1">
                      <span className="text-xs text-slate-500">Scheduled date</span>
                      <input
                        type="date"
                        className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
                        value={formatDateInput(getBlogScheduledDate(activeBlog))}
                        onChange={(event) => {
                          const nextDate = event.target.value || null;
                          void updateBlogInline(
                            activeBlog,
                            {
                              scheduled_publish_date: nextDate,
                              target_publish_date: nextDate,
                            },
                            `Scheduled date updated for \"${activeBlog.title}\".`
                          );
                        }}
                      />
                    </label>
                  ) : (
                    <DetailDrawerField
                      label="Scheduled date"
                      value={formatDisplayDate(getBlogScheduledDate(activeBlog)) || "—"}
                    />
                  )}

                  {isPanelEditMode && canEditDisplayDate ? (
                    <label className="block space-y-1">
                      <span className="text-xs text-slate-500">Display date</span>
                      <input
                        type="date"
                        className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
                        value={formatDateInput(activeBlog.display_published_date)}
                        onChange={(event) => {
                          const nextDisplayDate = event.target.value || null;
                          void updateBlogInline(
                            activeBlog,
                            { display_published_date: nextDisplayDate },
                            `Display date updated for \"${activeBlog.title}\".`
                          );
                        }}
                      />
                    </label>
                  ) : (
                    <DetailDrawerField
                      label="Display date"
                      value={formatDisplayDate(activeBlog.display_published_date) || "—"}
                    />
                  )}

                  <DetailDrawerField
                    label="Published date"
                    value={formatDisplayDate(getBlogPublishDate(activeBlog)) || "—"}
                  />
                </div>
              ) : null
            }
            linksContent={
              activeBlog ? (
                <div className="space-y-3 text-sm text-slate-700">
                  <div className="space-y-1">
                    <p className="text-xs text-slate-500">Google Doc</p>
                    {activeBlog.google_doc_url ? (
                      <ExternalLink href={activeBlog.google_doc_url} className="block truncate text-blue-600" title={activeBlog.google_doc_url}>
                        {activeBlog.google_doc_url}
                      </ExternalLink>
                    ) : (
                      <p>—</p>
                    )}
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-slate-500">Live URL</p>
                    {activeBlog.live_url ? (
                      <ExternalLink href={activeBlog.live_url} className="block truncate text-blue-600" title={activeBlog.live_url}>
                        {activeBlog.live_url}
                      </ExternalLink>
                    ) : (
                      <p>—</p>
                    )}
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-slate-500">Blog Page</p>
                    <Link
                      href={`/blogs/${activeBlog.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="interactive-link block truncate text-blue-600"
                      title={`/blogs/${activeBlog.id}`}
                    >
                      {`/blogs/${activeBlog.id}`}
                    </Link>
                  </div>
                </div>
              ) : undefined
            }
            commentsContent={
              activeBlog ? (
                <div className="space-y-2">
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
              ) : undefined
            }
            timelineContent={
              activeBlog ? (
                isPanelLoading ? (
                  <p className="text-sm text-slate-500">Loading timeline…</p>
                ) : panelHistory.length === 0 ? (
                  <p className="text-sm text-slate-500">No activity history yet.</p>
                ) : (
                  <ol className="space-y-2">
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
                          {formatDateInTimezone(entry.changed_at, profile?.timezone)}
                        </p>
                      </li>
                    ))}
                  </ol>
                )
              ) : undefined
            }
            canEdit={canEditPanelDetails}
            isEditMode={isPanelEditMode}
            onToggleEditMode={() => {
              setIsPanelEditMode((previous) => !previous);
            }}
          />
        </div>
      </AppShell>
    </ProtectedPage>
  );
}
