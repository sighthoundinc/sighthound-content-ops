"use client";

import { formatDateInTimezone } from "@/lib/format-date";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import { AppShell } from "@/components/app-shell";
import { BlogDetailsDrawer } from "@/components/blog-details-drawer";
import { BlogImportModal } from "@/components/blog-import-modal";
import { Button, buttonClass } from "@/components/button";
import { DataTable, type DataTableColumn } from "@/components/data-table";
import { DetailDrawerField } from "@/components/detail-drawer";
import { LinkQuickActions } from "@/components/link-quick-actions";
import { PublisherStatusBadge, WriterStatusBadge } from "@/components/status-badge";
import {
  DATA_PAGE_CONTROL_ACTION_BUTTON_CLASS,
  DATA_PAGE_CONTROL_ACTIONS_CLASS,
  DATA_PAGE_CONTROL_ROW_CLASS,
  DATA_PAGE_CONTROL_STRIP_CLASS,
  DATA_PAGE_STACK_CLASS,
  DATA_PAGE_TABLE_SECTION_CLASS,
  DataPageFilterPills,
  DataPageHeader,
  DataPageToolbar,
} from "@/components/data-page";
import { PermissionGate } from "@/components/permissions/PermissionGate";
import { ProtectedPage } from "@/components/protected-page";
import {
  TablePaginationControls,
  TableResultsSummary,
  TableRowLimitSelect,
} from "@/components/table-controls";
import {
  BLOG_SELECT_WITH_DATES_WITH_RELATIONS,
  getBlogPublishDate,
  isMissingBlogCommentsTableError,
  normalizeBlogRows,
} from "@/lib/blog-schema";
import {
  formatActivityChangeDescription,
  formatActivityEventTitle,
} from "@/lib/activity-history-format";
import { PUBLISHER_STATUS_LABELS, WRITER_STATUS_LABELS } from "@/lib/status";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import {
  ExportScopePermissions,
  createUiPermissionContract,
} from "@/lib/permissions/uiPermissions";
import {
  SEGMENTED_CONTROL_CLASS,
  segmentedControlItemClass,
} from "@/lib/segmented-control";
import { getSiteBadgeClasses, getSiteLabel, getSiteShortLabel } from "@/lib/site";
import type {
  BlogHistoryRecord,
  BlogRecord,
  BlogSite,
  ProfileRecord,
  PublisherStageStatus,
  WriterStageStatus,
} from "@/lib/types";
import { cn, formatDateOnly } from "@/lib/utils";
import { useAuth } from "@/providers/auth-provider";
import { useAlerts } from "@/providers/alerts-provider";

type LibraryStatusFilter = "published" | "published_and_unpublished" | "unpublished";
type LibraryStage = "writing" | "needs_revision" | "ready_to_publish" | "publishing" | "published";
type LibrarySiteFilter = "all" | BlogSite;
type LibraryWriterStatusFilter = "all" | WriterStageStatus;
type LibraryPublisherStatusFilter = "all" | PublisherStageStatus;
type LibrarySortField = "none" | "published_date" | "title" | "site";
type LibrarySortDirection = "asc" | "desc";
type LibraryRowLimit = 10 | 20 | 50 | "all";
type LibraryColumnKey =
  | "site"
  | "title"
  | "live_url"
  | "writer_status"
  | "published_date"
  | "writer"
  | "publisher"
  | "publisher_status"
  | "stage"
  | "associated_social_posts";
type BoardStageQueryFilter = "idea" | "writing" | "reviewing" | "publishing" | "published";

const ROW_LIMIT_OPTIONS: LibraryRowLimit[] = [10, 20, 50, "all"];
const DEFAULT_ROW_LIMIT: LibraryRowLimit = 10;
const BLOG_LIBRARY_COLUMN_VIEW_STORAGE_KEY = "blog-library-column-view:v1";
const LIBRARY_SORT_FIELDS: LibrarySortField[] = ["none", "published_date", "title", "site"];
const isLibrarySortField = (value: unknown): value is LibrarySortField =>
  typeof value === "string" && LIBRARY_SORT_FIELDS.includes(value as LibrarySortField);
const isLibrarySortDirection = (value: unknown): value is LibrarySortDirection =>
  value === "asc" || value === "desc";
const isLibraryRowLimit = (value: unknown): value is LibraryRowLimit =>
  value === "all" ||
  (typeof value === "number" && ROW_LIMIT_OPTIONS.includes(value as LibraryRowLimit));
const DEFAULT_LIBRARY_COLUMN_ORDER: LibraryColumnKey[] = [
  "site",
  "title",
  "live_url",
  "writer_status",
  "published_date",
  "writer",
  "publisher",
  "publisher_status",
  "stage",
];
const DEFAULT_LIBRARY_HIDDEN_COLUMNS: LibraryColumnKey[] = [
  "writer",
  "publisher",
  "publisher_status",
  "stage",
];
const LIBRARY_COLUMN_LABELS: Record<LibraryColumnKey, string> = {
  site: "Site",
  title: "Title",
  live_url: "Live URL",
  writer_status: "Writer Stage",
  published_date: "Published Date",
  writer: "Writer",
  publisher: "Publisher",
  publisher_status: "Publisher Status",
  stage: "Stage",
  associated_social_posts: "Associated Social Posts",
};
const isLibraryColumnKey = (value: string): value is LibraryColumnKey =>
  value in LIBRARY_COLUMN_LABELS;

const normalizeLibraryColumnOrder = (value: unknown): LibraryColumnKey[] => {
  if (!Array.isArray(value)) {
    return DEFAULT_LIBRARY_COLUMN_ORDER;
  }
  const seen = new Set<LibraryColumnKey>();
  const normalized: LibraryColumnKey[] = [];
  for (const item of value) {
    if (typeof item !== "string" || !isLibraryColumnKey(item) || seen.has(item)) {
      continue;
    }
    seen.add(item);
    normalized.push(item);
  }
  for (const defaultColumn of DEFAULT_LIBRARY_COLUMN_ORDER) {
    if (!seen.has(defaultColumn)) {
      normalized.push(defaultColumn);
    }
  }
  return normalized;
};

const normalizeLibraryHiddenColumns = (value: unknown): LibraryColumnKey[] => {
  if (!Array.isArray(value)) {
    return DEFAULT_LIBRARY_HIDDEN_COLUMNS;
  }
  const hiddenColumns: LibraryColumnKey[] = [];
  const seen = new Set<LibraryColumnKey>();
  for (const item of value) {
    if (typeof item !== "string" || !isLibraryColumnKey(item) || seen.has(item)) {
      continue;
    }
    hiddenColumns.push(item);
    seen.add(item);
  }
  return hiddenColumns;
};

const STATUS_FILTER_OPTIONS: Array<{ value: LibraryStatusFilter; label: string }> = [
  { value: "published", label: "Published" },
  { value: "published_and_unpublished", label: "Include Unpublished" },
  { value: "unpublished", label: "Unpublished only" },
];

const SITE_FILTER_OPTIONS: Array<{ value: LibrarySiteFilter; label: string }> = [
  { value: "all", label: "Sites" },
  { value: "sighthound.com", label: "SH" },
  { value: "redactor.com", label: "RED" },
];
const WRITER_STATUS_FILTER_OPTIONS: Array<{
  value: LibraryWriterStatusFilter;
  label: string;
}> = [
  { value: "all", label: "Writer Status" },
  { value: "not_started", label: WRITER_STATUS_LABELS.not_started },
  { value: "in_progress", label: WRITER_STATUS_LABELS.in_progress },
  { value: "needs_revision", label: WRITER_STATUS_LABELS.needs_revision },
  { value: "completed", label: WRITER_STATUS_LABELS.completed },
];
const PUBLISHER_STATUS_FILTER_OPTIONS: Array<{
  value: LibraryPublisherStatusFilter;
  label: string;
}> = [
  { value: "all", label: "Publisher Status" },
  { value: "not_started", label: PUBLISHER_STATUS_LABELS.not_started },
  { value: "in_progress", label: PUBLISHER_STATUS_LABELS.in_progress },
  { value: "pending_review", label: PUBLISHER_STATUS_LABELS.pending_review },
  { value: "publisher_approved", label: PUBLISHER_STATUS_LABELS.publisher_approved },
  { value: "completed", label: PUBLISHER_STATUS_LABELS.completed },
];

const SORTABLE_LIBRARY_COLUMNS: Partial<Record<LibraryColumnKey, LibrarySortField>> = {
  site: "site",
  title: "title",
  published_date: "published_date",
};


const escapeCsvValue = (value: string) => `"${value.replaceAll("\"", "\"\"")}"`;
const escapeHtmlValue = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;")
    .replaceAll("'", "&#39;");

function getPublishedDateKey(blog: BlogRecord) {
  return blog.display_published_date ?? getBlogPublishDate(blog);
}

export default function BlogLibraryPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-slate-500">Loading blog library...</div>}>
      <BlogLibraryPageContent />
    </Suspense>
  );
}


function getPageCount(totalRows: number, rowLimit: LibraryRowLimit) {
  if (totalRows === 0 || rowLimit === "all") {
    return 1;
  }
  return Math.max(1, Math.ceil(totalRows / rowLimit));
}

function getPageRows<T>(rows: T[], currentPage: number, rowLimit: LibraryRowLimit) {
  if (rowLimit === "all") {
    return rows;
  }
  const startIndex = (currentPage - 1) * rowLimit;
  return rows.slice(startIndex, startIndex + rowLimit);
}

function formatPublishedDate(blog: BlogRecord) {
  const dateKey = getPublishedDateKey(blog);
  return formatDateOnly(dateKey) || "—";
}

function getStageForBadge(blog: BlogRecord): LibraryStage {
  if (blog.overall_status === "published") {
    return "published";
  }
  if (blog.publisher_status === "in_progress") {
    return "publishing";
  }
  if (blog.overall_status === "needs_revision") {
    return "needs_revision";
  }
  if (blog.overall_status === "ready_to_publish") {
    return "ready_to_publish";
  }
  return "writing";
}

function getStageLabel(stage: LibraryStage) {
  if (stage === "needs_revision") {
    return "Needs Revision";
  }
  if (stage === "ready_to_publish") {
    return "Ready to Publish";
  }
  if (stage === "publishing") {
    return "Publishing";
  }
  if (stage === "published") {
    return "Published";
  }
  return "Writing";
}

function getStageBadgeClasses(stage: LibraryStage) {
  if (stage === "published") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }
  if (stage === "publishing") {
    return "border-blue-200 bg-blue-50 text-blue-700";
  }
  if (stage === "ready_to_publish") {
    return "border-sky-200 bg-sky-50 text-sky-700";
  }
  if (stage === "needs_revision") {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }
  return "border-slate-200 bg-slate-100 text-slate-700";
}

function getAssigneeLabel(name: string | null | undefined) {
  return name && name.trim().length > 0 ? name : "Unassigned";
}
type BlogCommentRecord = {
  id: string;
  blog_id: string;
  comment: string;
  created_by: string;
  created_at: string;
  author?: Pick<ProfileRecord, "id" | "full_name" | "email"> | null;
};
function normalizeCommentRows(rows: Array<Record<string, unknown>>) {
  return rows.map((row) => {
    return {
      id: String(row.id ?? ""),
      blog_id: String(row.blog_id ?? ""),
      comment: String(row.comment ?? ""),
      created_by: String(row.user_id ?? ""),
      created_at: String(row.created_at ?? ""),
      author: (Array.isArray(row.author) ? row.author[0] : row.author) as
        | Pick<ProfileRecord, "id" | "full_name" | "email">
        | null
        | undefined,
    } satisfies BlogCommentRecord;
  });
}

function isBoardStageQueryFilter(value: string | null): value is BoardStageQueryFilter {
  return value === "idea" || value === "writing" || value === "reviewing" || value === "publishing" || value === "published";
}

function BlogLibraryPageContent() {
  const searchParams = useSearchParams();
  const { hasPermission, profile } = useAuth();
  const { showSaving, showSuccess, showError, updateAlert: updateStatus } = useAlerts();
  const permissionContract = useMemo(
    () => createUiPermissionContract(hasPermission),
    [hasPermission]
  );
  const canCreateBlogs = permissionContract.canCreateBlog;
  const canRunDataImport = hasPermission("run_data_import");
  const canExportCsv = permissionContract.canExportCsv;
  const canExportSelectedCsv = permissionContract.canExportSelectedCsv;
  const canSelectRows = canExportSelectedCsv;
  const [blogs, setBlogs] = useState<BlogRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<LibraryStatusFilter>("published");
  const [siteFilter, setSiteFilter] = useState<LibrarySiteFilter>("all");
  const [writerStatusFilter, setWriterStatusFilter] = useState<LibraryWriterStatusFilter>("all");
  const [publisherStatusFilter, setPublisherStatusFilter] =
    useState<LibraryPublisherStatusFilter>("all");
  const [sortField, setSortField] = useState<LibrarySortField>("published_date");
  const [sortDirection, setSortDirection] = useState<LibrarySortDirection>("desc");
  const [rowDensity, setRowDensity] = useState<"compact" | "comfortable">("compact");
  const [rowLimit, setRowLimit] = useState<LibraryRowLimit>(DEFAULT_ROW_LIMIT);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedBlogIds, setSelectedBlogIds] = useState<string[]>([]);
  const [focusedBlogId, setFocusedBlogId] = useState<string | null>(null);
  const [activeBlogId, setActiveBlogId] = useState<string | null>(null);
  const [panelHistory, setPanelHistory] = useState<BlogHistoryRecord[]>([]);
  const [panelComments, setPanelComments] = useState<BlogCommentRecord[]>([]);
  const [isPanelLoading, setIsPanelLoading] = useState(false);
  const [panelError, setPanelError] = useState<string | null>(null);
  const [copiedCell, setCopiedCell] = useState<{
    blogId: string;
    field: "title" | "url";
  } | null>(null);
  const [columnOrder, setColumnOrder] = useState<LibraryColumnKey[]>(
    DEFAULT_LIBRARY_COLUMN_ORDER
  );
  const [hiddenColumns, setHiddenColumns] = useState<LibraryColumnKey[]>(
    DEFAULT_LIBRARY_HIDDEN_COLUMNS
  );
  const boardStageQuery = searchParams.get("boardStage");
  const shouldAutoOpenImport = searchParams.get("import") === "1";

  const loadBlogs = useCallback(async () => {
    const supabase = getSupabaseBrowserClient();
    setIsLoading(true);
    setError(null);

    const { data, error: blogsError } = await supabase
      .from("blogs")
      .select(BLOG_SELECT_WITH_DATES_WITH_RELATIONS)
      .eq("is_archived", false)
      .order("display_published_date", { ascending: false, nullsFirst: false })
      .order("updated_at", { ascending: false });

    if (blogsError) {
      setError(
        `Couldn't load blogs. ${blogsError.message ? "Error: " + blogsError.message : "Try refreshing the page."}`
      );
      setIsLoading(false);
      return;
    }

    setBlogs(normalizeBlogRows((data ?? []) as Array<Record<string, unknown>>) as BlogRecord[]);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    void loadBlogs();
  }, [loadBlogs]);

  useEffect(() => {
    if (!isBoardStageQueryFilter(boardStageQuery)) {
      return;
    }
    if (boardStageQuery === "idea") {
      setStatusFilter("unpublished");
      setWriterStatusFilter("not_started");
      setPublisherStatusFilter("not_started");
      return;
    }
    if (boardStageQuery === "writing") {
      setStatusFilter("unpublished");
      setWriterStatusFilter("in_progress");
      setPublisherStatusFilter("all");
      return;
    }
    if (boardStageQuery === "reviewing") {
      setStatusFilter("unpublished");
      setWriterStatusFilter("needs_revision");
      setPublisherStatusFilter("all");
      return;
    }
    if (boardStageQuery === "publishing") {
      setStatusFilter("unpublished");
      setWriterStatusFilter("completed");
      setPublisherStatusFilter("all");
      return;
    }
    setStatusFilter("published");
    setWriterStatusFilter("all");
    setPublisherStatusFilter("completed");
  }, [boardStageQuery]);

  useEffect(() => {
    setCurrentPage(1);
  }, [
    publisherStatusFilter,
    rowLimit,
    searchQuery,
    siteFilter,
    sortDirection,
    sortField,
    statusFilter,
    writerStatusFilter,
  ]);

  useEffect(() => {
    const existingIds = new Set(blogs.map((blog) => blog.id));
    setSelectedBlogIds((previous) => previous.filter((id) => existingIds.has(id)));
  }, [blogs]);

  useEffect(() => {
    if (!canSelectRows) {
      setSelectedBlogIds([]);
    }
  }, [canSelectRows]);

  useEffect(() => {
    if (!copiedCell) {
      return;
    }
    const timeout = window.setTimeout(() => {
      setCopiedCell(null);
    }, 1200);
    return () => {
      window.clearTimeout(timeout);
    };
  }, [copiedCell]);

  useEffect(() => {
    if (!error) {
      return;
    }
    showError(error);
  }, [error, showError]);
  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const stored = window.localStorage.getItem(BLOG_LIBRARY_COLUMN_VIEW_STORAGE_KEY);
    if (!stored) {
      return;
    }
    try {
      const parsed = JSON.parse(stored) as {
        order?: unknown;
        hidden?: unknown;
        sortField?: unknown;
        sortDirection?: unknown;
        rowLimit?: unknown;
        density?: unknown;
      };
      setColumnOrder(normalizeLibraryColumnOrder(parsed.order));
      setHiddenColumns(normalizeLibraryHiddenColumns(parsed.hidden));
      if (isLibrarySortField(parsed.sortField)) {
        setSortField(parsed.sortField);
      }
      if (isLibrarySortDirection(parsed.sortDirection)) {
        setSortDirection(parsed.sortDirection);
      }
      if (isLibraryRowLimit(parsed.rowLimit)) {
        setRowLimit(parsed.rowLimit);
      }
      if (parsed.density === "compact" || parsed.density === "comfortable") {
        setRowDensity(parsed.density);
      }
    } catch {
      setColumnOrder(DEFAULT_LIBRARY_COLUMN_ORDER);
      setHiddenColumns(DEFAULT_LIBRARY_HIDDEN_COLUMNS);
      setSortField("published_date");
      setSortDirection("desc");
      setRowLimit(DEFAULT_ROW_LIMIT);
      setRowDensity("compact");
    }
  }, []);
  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    window.localStorage.setItem(
      BLOG_LIBRARY_COLUMN_VIEW_STORAGE_KEY,
      JSON.stringify({
        order: columnOrder,
        hidden: hiddenColumns,
        sortField,
        sortDirection,
        rowLimit,
        density: rowDensity,
      })
    );
  }, [columnOrder, hiddenColumns, rowDensity, rowLimit, sortDirection, sortField]);
  const closeOpenDetailsMenus = useCallback(() => {
    document.querySelectorAll<HTMLDetailsElement>("details[open]").forEach((menu) => {
      menu.open = false;
    });
  }, []);

  useEffect(() => {

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setActiveBlogId(null);
      }
    };
    window.addEventListener("keydown", handleEscape);
    return () => {
      window.removeEventListener("keydown", handleEscape);
    };
  }, []);
  useEffect(() => {
    if (!activeBlogId) {
      return;
    }
    if (!blogs.some((blog) => blog.id === activeBlogId)) {
      setActiveBlogId(null);
    }
  }, [activeBlogId, blogs]);
  useEffect(() => {
    if (!activeBlogId) {
      setPanelHistory([]);
      setPanelComments([]);
      setPanelError(null);
      return;
    }
    const loadPanelData = async () => {
      setIsPanelLoading(true);
      setPanelError(null);
      const supabase = getSupabaseBrowserClient();
      const fetchComments = async () => {
        const { data, error } = await supabase
          .schema("public")
          .from("blog_comments")
          .select("id,blog_id,comment,user_id,created_at,author:user_id(id,full_name,email)")
          .eq("blog_id", activeBlogId)
          .order("created_at", { ascending: false })
          .limit(5);
        return { data, error };
      };
      const [{ data: historyData, error: historyError }, { data: commentsData, error: commentsError }] =
        await Promise.all([
          supabase
            .from("blog_assignment_history")
            .select("*")
            .eq("blog_id", activeBlogId)
            .order("changed_at", { ascending: false })
            .limit(5),
          fetchComments(),
        ]);
      if (historyError) {
        setPanelError(historyError.message);
        setPanelHistory([]);
      } else {
        setPanelHistory((historyData ?? []) as BlogHistoryRecord[]);
      }
      if (commentsError) {
        if (isMissingBlogCommentsTableError(commentsError)) {
          setPanelError(
            "Comments are temporarily unavailable right now. Please try again in a moment."
          );
        } else {
          setPanelError(commentsError.message);
        }
        setPanelComments([]);
      } else {
        setPanelComments(normalizeCommentRows((commentsData ?? []) as Array<Record<string, unknown>>));
      }
      setIsPanelLoading(false);
    };
    void loadPanelData();
  }, [activeBlogId]);
  const panelHistoryUserNameById = useMemo(() => {
    const entries: Array<[string, string]> = [];
    for (const nextBlog of blogs) {
      if (nextBlog.writer?.id && nextBlog.writer.full_name) {
        entries.push([nextBlog.writer.id, nextBlog.writer.full_name]);
      }
      if (nextBlog.publisher?.id && nextBlog.publisher.full_name) {
        entries.push([nextBlog.publisher.id, nextBlog.publisher.full_name]);
      }
    }
    return Object.fromEntries(entries);
  }, [blogs]);

  const filteredBlogs = useMemo(() => {
    const normalizedSearch = searchQuery.trim().toLowerCase();

    return blogs.filter((blog) => {
      if (statusFilter === "published" && blog.overall_status !== "published") {
        return false;
      }
      if (statusFilter === "unpublished" && blog.overall_status === "published") {
        return false;
      }

      if (siteFilter !== "all" && blog.site !== siteFilter) {
        return false;
      }
      if (writerStatusFilter !== "all" && blog.writer_status !== writerStatusFilter) {
        return false;
      }
      if (
        publisherStatusFilter !== "all" &&
        blog.publisher_status !== publisherStatusFilter
      ) {
        return false;
      }

      if (normalizedSearch.length > 0) {
        const titleText = blog.title.toLowerCase();
        const urlText = (blog.live_url ?? "").toLowerCase();
        if (!titleText.includes(normalizedSearch) && !urlText.includes(normalizedSearch)) {
          return false;
        }
      }

      return true;
    });
  }, [blogs, publisherStatusFilter, searchQuery, siteFilter, statusFilter, writerStatusFilter]);

  const sortedBlogs = useMemo(() => {
    if (sortField === "none") {
      return filteredBlogs;
    }
    const collator = new Intl.Collator("en", { sensitivity: "base", numeric: true });
    const directionMultiplier = sortDirection === "asc" ? 1 : -1;

    return [...filteredBlogs].sort((left, right) => {
      let compareResult = 0;

      if (sortField === "published_date") {
        const leftDate = getPublishedDateKey(left) ?? "";
        const rightDate = getPublishedDateKey(right) ?? "";
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
      } else {
        compareResult = collator.compare(left.site, right.site);
      }

      return compareResult * directionMultiplier;
    });
  }, [filteredBlogs, sortDirection, sortField]);

  const pageCount = useMemo(
    () => getPageCount(sortedBlogs.length, rowLimit),
    [rowLimit, sortedBlogs.length]
  );

  useEffect(() => {
    setCurrentPage((previous) => Math.min(previous, pageCount));
  }, [pageCount]);

  const pagedBlogs = useMemo(
    () => getPageRows(sortedBlogs, currentPage, rowLimit),
    [currentPage, rowLimit, sortedBlogs]
  );
  useEffect(() => {
    if (pagedBlogs.length === 0) {
      setFocusedBlogId(null);
      return;
    }
    if (!focusedBlogId || !pagedBlogs.some((blog) => blog.id === focusedBlogId)) {
      setFocusedBlogId(pagedBlogs[0]?.id ?? null);
    }
  }, [focusedBlogId, pagedBlogs]);

  const selectedIdSet = useMemo(() => new Set(selectedBlogIds), [selectedBlogIds]);
  const selectedBlogs = useMemo(
    () => sortedBlogs.filter((blog) => selectedIdSet.has(blog.id)),
    [selectedIdSet, sortedBlogs]
  );
  const hiddenColumnSet = useMemo(() => new Set(hiddenColumns), [hiddenColumns]);
  const visibleColumnOrder = useMemo(
    () => {
      const visibleColumns = columnOrder.filter((column) => !hiddenColumnSet.has(column));
      return visibleColumns.length > 0 ? visibleColumns : [DEFAULT_LIBRARY_COLUMN_ORDER[0]];
    },
    [columnOrder, hiddenColumnSet]
  );
  const hasActiveFilters =
    searchQuery.trim().length > 0 ||
    statusFilter !== "published" ||
    siteFilter !== "all" ||
    writerStatusFilter !== "all" ||
    publisherStatusFilter !== "all";
  const hasNoResults = !isLoading && sortedBlogs.length === 0;
  const activeBlog = useMemo(
    () => blogs.find((blog) => blog.id === activeBlogId) ?? null,
    [activeBlogId, blogs]
  );
  const selectedPagedIndices = useMemo(() => {
    const indices = new Set<number>();
    pagedBlogs.forEach((blog, index) => {
      if (selectedIdSet.has(blog.id)) {
        indices.add(index);
      }
    });
    return indices;
  }, [pagedBlogs, selectedIdSet]);
  const dataTableSortField = useMemo(() => {
    const entry = Object.entries(SORTABLE_LIBRARY_COLUMNS).find(
      ([, mappedField]) => mappedField === sortField
    );
    return (entry?.[0] as LibraryColumnKey | undefined) ?? undefined;
  }, [sortField]);
  const blogTableColumns = useMemo<DataTableColumn<BlogRecord>[]>(
    () =>
      visibleColumnOrder.map((column) => ({
        id: column,
        label: LIBRARY_COLUMN_LABELS[column],
        sortable: Boolean(SORTABLE_LIBRARY_COLUMNS[column]),
        className:
          column === "title"
            ? "max-w-[26rem]"
            : column === "live_url"
              ? "max-w-[15rem]"
              : column === "writer" || column === "publisher"
                ? "max-w-[10rem]"
                : undefined,
        render: (blog) => {
          if (column === "title") {
            return (
              <Link
                href={`/blogs/${blog.id}`}
                className="interactive-link block truncate font-medium text-slate-800"
                title={blog.title}
              >
                {blog.title}
              </Link>
            );
          }
          if (column === "site") {
            return (
              <span
                className={cn(
                  "inline-flex items-center justify-center rounded-full border px-2 py-0.5 text-xs font-medium",
                  getSiteBadgeClasses(blog.site)
                )}
              >
                {getSiteShortLabel(blog.site)}
              </span>
            );
          }
          if (column === "live_url") {
            return (
              <span className="block max-w-[15rem] truncate text-slate-600" title={blog.live_url ?? ""}>
                {blog.live_url || "—"}
              </span>
            );
          }
          if (column === "writer_status") {
            return <WriterStatusBadge status={blog.writer_status} />;
          }
          if (column === "publisher_status") {
            return <PublisherStatusBadge status={blog.publisher_status} />;
          }
          if (column === "published_date") {
            return <span className="text-slate-600">{formatPublishedDate(blog)}</span>;
          }
          if (column === "writer") {
            return (
              <span
                className="block max-w-[10rem] truncate text-slate-600"
                title={blog.writer?.full_name ?? "Unassigned"}
              >
                {blog.writer?.full_name ?? "Unassigned"}
              </span>
            );
          }
          if (column === "publisher") {
            return (
              <span
                className="block max-w-[10rem] truncate text-slate-600"
                title={blog.publisher?.full_name ?? "Unassigned"}
              >
                {blog.publisher?.full_name ?? "Unassigned"}
              </span>
            );
          }
          if (column === "associated_social_posts") {
            const socialPostCount = (blog as any).social_post_count ?? 0;
            const displayValue = socialPostCount > 0 
              ? `${socialPostCount} post${socialPostCount !== 1 ? "s" : ""}`
              : "—";
            return (
              <span 
                className="text-slate-600 cursor-pointer hover:underline" 
                title={displayValue}
              >
                {displayValue}
              </span>
            );
          }
          return <span className="text-slate-600">{getStageLabel(getStageForBadge(blog))}</span>;
        },
      })),
    [visibleColumnOrder]
  );
  const activeFilterPills = useMemo(
    () => [
      searchQuery.trim().length > 0
        ? {
            id: "search",
            label: `Search: ${searchQuery.trim()}`,
            onRemove: () => {
              setSearchQuery("");
            },
          }
        : null,
      statusFilter !== "published"
        ? {
            id: "status",
            label: `Status: ${
              STATUS_FILTER_OPTIONS.find((option) => option.value === statusFilter)?.label ??
              statusFilter
            }`,
            onRemove: () => {
              setStatusFilter("published");
            },
          }
        : null,
      siteFilter !== "all"
        ? {
            id: "site",
            label: `Site: ${
              SITE_FILTER_OPTIONS.find((option) => option.value === siteFilter)?.label ?? siteFilter
            }`,
            onRemove: () => {
              setSiteFilter("all");
            },
          }
        : null,
      writerStatusFilter !== "all"
        ? {
            id: "writer",
            label: `Writer: ${
              WRITER_STATUS_FILTER_OPTIONS.find(
                (option) => option.value === writerStatusFilter
              )?.label ?? writerStatusFilter
            }`,
            onRemove: () => {
              setWriterStatusFilter("all");
            },
          }
        : null,
      publisherStatusFilter !== "all"
        ? {
            id: "publisher",
            label: `Publisher: ${
              PUBLISHER_STATUS_FILTER_OPTIONS.find(
                (option) => option.value === publisherStatusFilter
              )?.label ?? publisherStatusFilter
            }`,
            onRemove: () => {
              setPublisherStatusFilter("all");
            },
          }
        : null,
    ].filter((pill) => pill !== null),
    [
      publisherStatusFilter,
      searchQuery,
      siteFilter,
      statusFilter,
      writerStatusFilter,
    ]
  );

  const resetFilters = useCallback(() => {
    setSearchQuery("");
    setStatusFilter("published");
    setSiteFilter("all");
    setWriterStatusFilter("all");
    setPublisherStatusFilter("all");
    setSortField("published_date");
    setSortDirection("desc");
  }, []);
  const toggleColumnVisibility = (column: LibraryColumnKey) => {
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
    setColumnOrder(DEFAULT_LIBRARY_COLUMN_ORDER);
    setHiddenColumns(DEFAULT_LIBRARY_HIDDEN_COLUMNS);
  };
  const handleOpenBlogPanel = (blogId: string) => {
    setActiveBlogId(blogId);
  };
  const copyToClipboard = useCallback(
    async (value: string, blogId: string, field: "title" | "url") => {
      if (!value) {
        return;
      }

      try {
        await navigator.clipboard.writeText(value);
        setCopiedCell({ blogId, field });
      } catch {
        showError("Copy failed. Try again.");
      }
    },
    [showError]
  );
  useEffect(() => {
    const isFormElement = (target: EventTarget | null) => {
      if (!(target instanceof HTMLElement)) {
        return false;
      }
      const tagName = target.tagName.toLowerCase();
      return (
        target.isContentEditable ||
        tagName === "input" ||
        tagName === "textarea" ||
        tagName === "select"
      );
    };
    const handleKeyboardNavigation = (event: KeyboardEvent) => {
      if (isFormElement(event.target) || pagedBlogs.length === 0) {
        return;
      }
      const currentIndex = pagedBlogs.findIndex((blog) => blog.id === focusedBlogId);
      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        event.preventDefault();
        const delta = event.key === "ArrowDown" ? 1 : -1;
        const nextIndex =
          ((currentIndex < 0 ? 0 : currentIndex) + delta + pagedBlogs.length) % pagedBlogs.length;
        const nextBlog = pagedBlogs[nextIndex];
        if (!nextBlog) {
          return;
        }
        setFocusedBlogId(nextBlog.id);
        return;
      }
      if (event.key === "Enter" && focusedBlogId) {
        event.preventDefault();
        handleOpenBlogPanel(focusedBlogId);
        return;
      }
    };
    window.addEventListener("keydown", handleKeyboardNavigation);
    return () => {
      window.removeEventListener("keydown", handleKeyboardNavigation);
    };
  }, [copyToClipboard, focusedBlogId, pagedBlogs]);

  const copyAll = async (field: "title" | "url") => {
    const values =
      field === "title"
        ? sortedBlogs.map((blog) => blog.title)
        : sortedBlogs.map((blog) => blog.live_url ?? "").filter((value) => value.length > 0);
    if (values.length === 0) {
      showError(`No ${field === "title" ? "titles" : "URLs"} to copy.`);
      return;
    }
    try {
      await navigator.clipboard.writeText(values.join("\n"));
    } catch {
      showError("Copy failed. Try again.");
    }
  };

  const getExportCellValue = useCallback((blog: BlogRecord, column: LibraryColumnKey) => {
    if (column === "site") {
      return getSiteShortLabel(blog.site);
    }
    if (column === "title") {
      return blog.title;
    }
    if (column === "live_url") {
      return blog.live_url ?? "";
    }
    if (column === "writer_status") {
      return WRITER_STATUS_LABELS[blog.writer_status];
    }
    if (column === "published_date") {
      return formatPublishedDate(blog);
    }
    if (column === "writer") {
      return getAssigneeLabel(blog.writer?.full_name);
    }
    if (column === "publisher") {
      return getAssigneeLabel(blog.publisher?.full_name);
    }
    if (column === "publisher_status") {
      return PUBLISHER_STATUS_LABELS[blog.publisher_status];
    }
    return getStageLabel(getStageForBadge(blog));
  }, []);

  const buildCsv = useCallback((rows: BlogRecord[]) => {
    const headers = visibleColumnOrder.map((column) =>
      escapeCsvValue(LIBRARY_COLUMN_LABELS[column])
    );
    const dataRows = rows.map((blog) =>
      visibleColumnOrder
        .map((column) => escapeCsvValue(getExportCellValue(blog, column)))
        .join(",")
    );
    return [headers.join(","), ...dataRows].join("\n");
  }, [getExportCellValue, visibleColumnOrder]);

  const triggerDownload = useCallback((content: BlobPart, filename: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    if (blob.size === 0) {
      showError("Export failed. No data to generate.");
      return;
    }
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.rel = "noopener";
    link.style.display = "none";
    document.body.appendChild(link);
    link.click();
    window.setTimeout(() => {
      URL.revokeObjectURL(url);
      link.remove();
    }, 1200);
  }, [showError]);

  const getSmartExportScope = (): "view" | "selected" => {
    if (selectedBlogs.length === 0 || selectedBlogs.length === sortedBlogs.length) {
      return "view";
    }
    return "selected";
  };

  const exportCsv = useCallback((scope: "view" | "selected") => {
    const statusId = showSaving("Generating CSV…");
    if (scope === "view" && !canExportCsv) {
      updateStatus(statusId, {
        type: "error",
        message: "Permission denied for CSV export.",
      });
      return;
    }
    if (scope === "selected" && !canExportSelectedCsv) {
      updateStatus(statusId, {
        type: "error",
        message: "Permission denied for selected CSV export.",
      });
      return;
    }
    const rows = scope === "selected" ? selectedBlogs : sortedBlogs;
    if (rows.length === 0) {
      updateStatus(statusId, {
        type: "error",
        message: scope === "selected" ? "No selected rows to export." : "No rows to export.",
      });
      return;
    }
    triggerDownload(
      `\uFEFF${buildCsv(rows)}`,
      `blog-library-${scope}-${formatDateInTimezone(new Date().toISOString(), profile?.timezone, "yyyyMMdd-HHmm")}.csv`,
      "text/csv;charset=utf-8;"
    );
    updateStatus(statusId, {
      type: "success",
      message: "Export complete",
      notification: {
        icon: "download",
        message: `CSV ready (${scope === "view" ? "view" : "selected"})}`,
        href: "/blogs",
      },
    });
  }, [
    buildCsv,
    canExportCsv,
    canExportSelectedCsv,
    profile?.timezone,
    selectedBlogs,
    showSaving,
    sortedBlogs,
    triggerDownload,
    updateStatus,
  ]);

  const exportPdf = (scope: "view" | "selected") => {
    const statusId = showSaving("Generating PDF…");
    if (scope === "view" && !canExportCsv) {
      updateStatus(statusId, {
        type: "error",
        message: "Permission denied for PDF export.",
      });
      return;
    }
    if (scope === "selected" && !canExportSelectedCsv) {
      updateStatus(statusId, {
        type: "error",
        message: "Permission denied for selected PDF export.",
      });
      return;
    }
    const rows = scope === "selected" ? selectedBlogs : sortedBlogs;
    if (rows.length === 0) {
      updateStatus(statusId, {
        type: "error",
        message: scope === "selected" ? "No selected rows to export." : "No rows to export.",
      });
      return;
    }

    const popup = window.open("", "_blank", "width=1100,height=800");
    if (!popup) {
      updateStatus(statusId, {
        type: "error",
        message: "Popup blocked. Allow popups to export PDF.",
      });
      return;
    }
    const generatedAt = formatDateInTimezone(new Date().toISOString(), profile?.timezone, "MMM d yyyy, h:mm a");

    const headerMarkup = visibleColumnOrder
      .map((column) => `<th>${escapeHtmlValue(LIBRARY_COLUMN_LABELS[column])}</th>`)
      .join("");
    const rowsMarkup = rows
      .map((blog) => {
        const cellMarkup = visibleColumnOrder
          .map((column) => `<td>${escapeHtmlValue(getExportCellValue(blog, column))}</td>`)
          .join("");
        return `<tr>${cellMarkup}</tr>`;
      })
      .join("");
    popup.document.open();
    popup.document.write(`<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Blog Library Export</title>
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
  <h1>Blog Library Export (${scope === "view" ? "View" : "Selected"})</h1>
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
    updateStatus(statusId, {
      type: "success",
      message: "Export complete.",
      notification: {
        icon: "download",
        message: `Export ready (${scope === "view" ? "view" : "selected"} PDF)`,
        href: "/blogs",
      },
    });
  };
  useEffect(() => {
    const handlePaletteAction = (event: Event) => {
      const actionId = (event as CustomEvent<{ actionId?: string }>).detail?.actionId;
      if (actionId === "clear_all_filters") {
        resetFilters();
        return;
      }
      if (actionId === "export_current_view") {
        exportCsv("view");
      }
    };
    window.addEventListener("command-palette-action", handlePaletteAction as EventListener);
    return () => {
      window.removeEventListener(
        "command-palette-action",
        handlePaletteAction as EventListener
      );
    };
  }, [exportCsv, resetFilters]);

  return (
    <ProtectedPage requiredPermissions={["view_dashboard"]}>
      <AppShell>
        <div className={DATA_PAGE_STACK_CLASS}>
          <DataPageHeader
            title="Blogs"
            description="Searchable reference library for blog titles, URLs, and published history."
            primaryAction={
              <div className="flex flex-wrap items-center justify-end gap-2">
                {canCreateBlogs ? (
                  <Link
                    href="/blogs/new"
                    className={buttonClass({ variant: "primary", size: "md" })}
                  >
                    New Blog
                  </Link>
                ) : null}
                <div className={`${SEGMENTED_CONTROL_CLASS} text-sm`}>
                  <span className={segmentedControlItemClass({ isActive: true })}>
                    Table View
                  </span>
                  <Link
                    href="/blogs/cardboard"
                    className={segmentedControlItemClass({ isActive: false })}
                  >
                    Pipeline View
                  </Link>
                </div>
              </div>
            }
          />

          <DataPageToolbar
            searchValue={searchQuery}
            onSearchChange={setSearchQuery}
            searchPlaceholder="Search blog title or URL"
            actions={
              <>
                <Button
                  type="button"
                  onClick={resetFilters}
                  variant="secondary"
                  size="sm"
                >
                  Clear all filters
                </Button>
              </>
            }
            filters={
              <>
                <label className="space-y-1">
                  <span className="block text-xs font-medium text-slate-700">Publish State</span>
                  <select
                    value={statusFilter}
                    onChange={(event) => {
                      setStatusFilter(event.target.value as LibraryStatusFilter);
                    }}
                    className="focus-field w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700"
                  >
                    {STATUS_FILTER_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="space-y-1">
                  <span className="block text-xs font-medium text-slate-700">Website</span>
                  <select
                    value={siteFilter}
                    onChange={(event) => {
                      setSiteFilter(event.target.value as LibrarySiteFilter);
                    }}
                    className="focus-field w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700"
                  >
                    {SITE_FILTER_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="space-y-1">
                  <span className="block text-xs font-medium text-slate-700">Writer Status</span>
                  <select
                    value={writerStatusFilter}
                    onChange={(event) => {
                      setWriterStatusFilter(event.target.value as LibraryWriterStatusFilter);
                    }}
                    className="focus-field w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700"
                  >
                    {WRITER_STATUS_FILTER_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="space-y-1">
                  <span className="block text-xs font-medium text-slate-700">Publisher Status</span>
                  <select
                    value={publisherStatusFilter}
                    onChange={(event) => {
                      setPublisherStatusFilter(event.target.value as LibraryPublisherStatusFilter);
                    }}
                    className="focus-field w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700"
                  >
                    {PUBLISHER_STATUS_FILTER_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
              </>
            }
          />
          <DataPageFilterPills pills={activeFilterPills} />

          <section className={DATA_PAGE_TABLE_SECTION_CLASS}>
            <div className={`${DATA_PAGE_CONTROL_STRIP_CLASS} relative`}>
              <div className={DATA_PAGE_CONTROL_ROW_CLASS}>
                <TableResultsSummary
                  totalRows={sortedBlogs.length}
                  currentPage={currentPage}
                  rowLimit={rowLimit}
                  noun="blogs"
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
                        disabled={sortedBlogs.length === 0}
                        className="block w-full rounded px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                        onClick={() => {
                          closeOpenDetailsMenus();
                          void copyAll("title");
                        }}
                      >
                        All titles
                      </button>
                      <button
                        type="button"
                        disabled={sortedBlogs.length === 0}
                        className="block w-full rounded px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                        onClick={() => {
                          closeOpenDetailsMenus();
                          void copyAll("url");
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
                          Reset Defaults
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
                            <span>{LIBRARY_COLUMN_LABELS[column]}</span>
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
                    <BlogImportModal
                      autoOpen={shouldAutoOpenImport}
                      triggerLabel="Import"
                      triggerVariant="primary"
                      triggerSize="sm"
                      onImported={async (summary) => {
                        await loadBlogs();
                        showSuccess(
                          `Import complete: ${summary.created} created, ${summary.updated} updated, ${summary.failed} failed.`
                        );
                      }}
                    />
                  ) : null}
                  <PermissionGate
                    can={canExportCsv || canExportSelectedCsv}
                    reason="You do not have permission to export."
                    requiredPermission={ExportScopePermissions.viewExport}
                  >
                    <details className="relative">
                      <summary
                        className={`${DATA_PAGE_CONTROL_ACTION_BUTTON_CLASS} cursor-pointer list-none border border-slate-900 bg-slate-900 text-white hover:bg-slate-700`}
                      >
                        Export
                      </summary>
                      <div className="absolute right-0 z-20 mt-1 w-44 rounded-md border border-slate-200 bg-white p-1 shadow-md">
                        <button
                          type="button"
                          disabled={sortedBlogs.length === 0}
                          className="block w-full rounded px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                          onClick={() => {
                            closeOpenDetailsMenus();
                            exportCsv(getSmartExportScope());
                          }}
                        >
                          As .CSV file
                        </button>
                        <button
                          type="button"
                          disabled={sortedBlogs.length === 0}
                          className="block w-full rounded px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                          onClick={() => {
                            closeOpenDetailsMenus();
                            exportPdf(getSmartExportScope());
                          }}
                        >
                          As .PDF file
                        </button>
                      </div>
                    </details>
                  </PermissionGate>
                </div>
              </div>
            </div>
            {canSelectRows && selectedBlogs.length > 0 ? (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-sm text-slate-700">
                  <span className="font-semibold text-slate-900">{selectedBlogs.length}</span>{" "}
                  selected
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    size="xs"
                    onClick={() => {
                      exportCsv("selected");
                    }}
                  >
                    Export CSV
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    size="xs"
                    onClick={() => {
                      exportPdf("selected");
                    }}
                  >
                    Export PDF
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    size="xs"
                    onClick={() => {
                      setSelectedBlogIds([]);
                    }}
                  >
                    Clear selection
                  </Button>
                </div>
              </div>
            ) : null}
            {hasNoResults && hasActiveFilters ? (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                <span>No blogs match your filters. Try clearing filters or create a new blog.</span>
                <button
                  type="button"
                  onClick={resetFilters}
                  className="pressable rounded border border-amber-300 bg-white px-2 py-1 text-xs font-medium text-amber-800 hover:bg-amber-100"
                >
                  Clear all filters
                </button>
              </div>
            ) : null}
            {hasNoResults && !hasActiveFilters ? (
              <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-slate-200 bg-slate-50 px-4 py-4">
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-slate-900">No blogs yet.</p>
                  <p className="text-sm text-slate-600">Create your first blog to start building the content library.</p>
                </div>
                {canCreateBlogs ? (
                  <Link
                    href="/blogs/new"
                    className="pressable inline-flex items-center rounded border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
                  >
                    New Blog
                  </Link>
                ) : null}
              </div>
            ) : null}

            {isLoading ? (
              <div className="space-y-3 rounded-lg border border-slate-200 p-4 sm:p-5">
                {Array.from({ length: 5 }).map((_, rowIndex) => (
                  <div key={`skeleton-row-${rowIndex}`} className="skeleton h-12 w-full" />
                ))}
              </div>
            ) : hasNoResults ? null : (
              <DataTable
                data={pagedBlogs}
                columns={blogTableColumns}
                sortField={dataTableSortField}
                sortDirection={sortField === "none" ? undefined : sortDirection}
                onSort={(field, direction) => {
                  const mapped = SORTABLE_LIBRARY_COLUMNS[field as LibraryColumnKey];
                  if (!mapped || mapped === "none") {
                    return;
                  }
                  setSortField(mapped);
                  setSortDirection(direction);
                }}
                showSelection={canSelectRows}
                selectedIndices={selectedPagedIndices}
                onSelectionChange={(indices) => {
                  const visibleIds = pagedBlogs.map((blog) => blog.id);
                  const nextVisibleIds = new Set<string>();
                  indices.forEach((index) => {
                    const blog = pagedBlogs[index];
                    if (blog) {
                      nextVisibleIds.add(blog.id);
                    }
                  });
                  setSelectedBlogIds((previous) => {
                    const next = new Set(previous.filter((id) => !visibleIds.includes(id)));
                    nextVisibleIds.forEach((id) => {
                      next.add(id);
                    });
                    return Array.from(next);
                  });
                }}
                onRowClick={(blog) => {
                  handleOpenBlogPanel(blog.id);
                }}
                activeIndex={pagedBlogs.findIndex((blog) => blog.id === activeBlogId)}
                density={rowDensity}
                emptyMessage="No blogs found."
              />
            )}
            <div className={DATA_PAGE_CONTROL_STRIP_CLASS}>
              <TableRowLimitSelect
                value={rowLimit}
                onChange={(value) => {
                  setRowLimit(value as LibraryRowLimit);
                }}
              />
              <TablePaginationControls
                currentPage={currentPage}
                pageCount={pageCount}
                onPageChange={setCurrentPage}
              />
            </div>
          </section>
          <BlogDetailsDrawer
            blog={activeBlog}
            isOpen={Boolean(activeBlog)}
            onClose={() => {
              setActiveBlogId(null);
            }}
            subtitle={activeBlog ? getSiteLabel(activeBlog.site) : undefined}
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
                  <WriterStatusBadge status={activeBlog.writer_status} />
                  <PublisherStatusBadge status={activeBlog.publisher_status} />
                  <span
                    className={`inline-flex items-center justify-center rounded border px-2 py-0.5 text-xs font-semibold ${getStageBadgeClasses(
                      getStageForBadge(activeBlog)
                    )}`}
                  >
                    {getStageLabel(getStageForBadge(activeBlog))}
                  </span>
                </>
              ) : null
            }
            overviewFields={
              activeBlog
                ? [
                    {
                      label: "Site",
                      value: getSiteLabel(activeBlog.site),
                    },
                    {
                      label: "Library stage",
                      value: getStageLabel(getStageForBadge(activeBlog)),
                    },
                  ]
                : []
            }
            workflowContent={
              activeBlog ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  <DetailDrawerField
                    label="Writer"
                    value={getAssigneeLabel(activeBlog.writer?.full_name)}
                  />
                  <DetailDrawerField
                    label="Publisher"
                    value={getAssigneeLabel(activeBlog.publisher?.full_name)}
                  />
                  <DetailDrawerField
                    label="Writer status"
                    value={WRITER_STATUS_LABELS[activeBlog.writer_status]}
                  />
                  <DetailDrawerField
                    label="Publisher status"
                    value={PUBLISHER_STATUS_LABELS[activeBlog.publisher_status]}
                  />
                </div>
              ) : null
            }
            datesContent={
              activeBlog ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  <DetailDrawerField
                    label="Scheduled date"
                    value={
                      formatDateOnly(
                        activeBlog.scheduled_publish_date ?? activeBlog.target_publish_date
                      ) || "—"
                    }
                  />
                  <DetailDrawerField
                    label="Published date"
                    value={formatPublishedDate(activeBlog)}
                  />
                </div>
              ) : null
            }
            linksContent={
              activeBlog ? (
                <div className="space-y-3 text-sm text-slate-700">
                  <div className="space-y-1">
                    <p className="text-xs text-slate-500">Google Doc</p>
                    <LinkQuickActions
                      href={activeBlog.google_doc_url}
                      label="Google Doc URL"
                      size="xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-slate-500">Live URL</p>
                    <LinkQuickActions
                      href={activeBlog.live_url}
                      label="Live URL"
                      size="xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-slate-500">Blog Page</p>
                    <LinkQuickActions
                      href={`/blogs/${activeBlog.id}`}
                      label="Blog page URL"
                      size="xs"
                    />
                  </div>
                </div>
              ) : undefined
            }
            commentsCount={panelComments.length}
            timelineCount={panelHistory.length}
            commentsContent={
              activeBlog ? (
                <div className="space-y-2">
                  {panelError ? (
                    <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                      {panelError}
                    </p>
                  ) : null}
                  {isPanelLoading ? (
                    <p className="text-sm text-slate-500">Loading comments…</p>
                  ) : panelComments.length === 0 ? (
                    <p className="text-sm text-slate-500">No comments yet.</p>
                  ) : (
                    <ul className="space-y-2">
                      {panelComments.map((comment) => (
                        <li key={comment.id} className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
                          <p className="text-xs font-semibold text-slate-600">
                            {comment.author?.full_name ?? "Unknown"} —{" "}
                            {formatDistanceToNow(new Date(comment.created_at), {
                              addSuffix: true,
                            })}
                          </p>
                          <p className="mt-1 text-sm text-slate-800">{comment.comment}</p>
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
                  <p className="text-sm text-slate-500">Loading activity…</p>
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
                          {formatActivityEventTitle(entry)}
                        </p>
                        {(() => {
                          const detail = formatActivityChangeDescription(entry, {
                            userNameById: panelHistoryUserNameById,
                          });
                          return detail ? (
                            <p className="text-xs text-slate-600">{detail}</p>
                          ) : null;
                        })()}
                        <p className="text-xs text-slate-400">
                          {formatDateInTimezone(entry.changed_at, profile?.timezone)}
                        </p>
                      </li>
                    ))}
                  </ol>
                )
              ) : undefined
            }
          />
        </div>
      </AppShell>
    </ProtectedPage>
  );
}
