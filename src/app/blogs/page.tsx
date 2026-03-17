"use client";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { format } from "date-fns";

import { AppShell } from "@/components/app-shell";
import { BlogImportModal } from "@/components/blog-import-modal";
import { Button, buttonClass } from "@/components/button";
import { DataTable, type DataTableColumn } from "@/components/data-table";
import { PublisherStatusBadge, WriterStatusBadge } from "@/components/status-badge";
import {
  DataPageFilterPills,
  DataPageHeader,
  DataPageToolbar,
} from "@/components/data-page";
import { PermissionGate } from "@/components/permissions/PermissionGate";
import { ProtectedPage } from "@/components/protected-page";
import { TablePaginationControls } from "@/components/table-controls";
import {
  BLOG_SELECT_LEGACY_WITH_RELATIONS,
  BLOG_SELECT_WITH_DATES_WITH_RELATIONS,
  getBlogPublishDate,
  isMissingBlogDateColumnsError,
  normalizeBlogRows,
} from "@/lib/blog-schema";
import { PUBLISHER_STATUS_LABELS, WRITER_STATUS_LABELS } from "@/lib/status";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import {
  ExportScopePermissions,
  createUiPermissionContract,
} from "@/lib/permissions/uiPermissions";
import { getSiteBadgeClasses, getSiteLabel } from "@/lib/site";
import type {
  BlogRecord,
  BlogSite,
  PublisherStageStatus,
  WriterStageStatus,
} from "@/lib/types";
import { cn, formatDisplayDate } from "@/lib/utils";
import { useAuth } from "@/providers/auth-provider";
import { useSystemFeedback } from "@/providers/system-feedback-provider";

type LibraryStatusFilter = "published" | "published_and_unpublished" | "unpublished";
type LibraryStage = "writing" | "needs_revision" | "ready_to_publish" | "publishing" | "published";
type LibrarySiteFilter = "all" | BlogSite;
type LibraryWriterStatusFilter = "all" | WriterStageStatus;
type LibraryPublisherStatusFilter = "all" | PublisherStageStatus;
type LibrarySortField = "none" | "published_date" | "title" | "site";
type LibrarySortDirection = "asc" | "desc";
type LibraryRowLimit = 10 | 20 | 50 | 100 | "all";
type RowDensity = "compact" | "comfortable";
type LibraryColumnKey =
  | "site"
  | "title"
  | "live_url"
  | "writer_status"
  | "published_date"
  | "writer"
  | "publisher"
  | "publisher_status"
  | "stage";
type BoardStageQueryFilter = "idea" | "writing" | "reviewing" | "publishing" | "published";

const ROW_LIMIT_OPTIONS: LibraryRowLimit[] = [10, 20, 50, 100, "all"];
const DEFAULT_ROW_LIMIT: LibraryRowLimit = 20;
const BLOG_LIBRARY_COLUMN_VIEW_STORAGE_KEY = "blog-library-column-view:v1";
const BLOG_LIBRARY_ROW_DENSITY_STORAGE_KEY = "blog-library-row-density:v1";
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
  { value: "all", label: "All Sites" },
  { value: "sighthound.com", label: "Sighthound" },
  { value: "redactor.com", label: "Redactor" },
];
const WRITER_STATUS_FILTER_OPTIONS: Array<{
  value: LibraryWriterStatusFilter;
  label: string;
}> = [
  { value: "all", label: "All Writer Statuses" },
  { value: "not_started", label: WRITER_STATUS_LABELS.not_started },
  { value: "in_progress", label: WRITER_STATUS_LABELS.in_progress },
  { value: "needs_revision", label: WRITER_STATUS_LABELS.needs_revision },
  { value: "completed", label: WRITER_STATUS_LABELS.completed },
];
const PUBLISHER_STATUS_FILTER_OPTIONS: Array<{
  value: LibraryPublisherStatusFilter;
  label: string;
}> = [
  { value: "all", label: "All Publisher Statuses" },
  { value: "not_started", label: PUBLISHER_STATUS_LABELS.not_started },
  { value: "in_progress", label: PUBLISHER_STATUS_LABELS.in_progress },
  { value: "pending_review", label: PUBLISHER_STATUS_LABELS.pending_review },
  { value: "publisher_approved", label: PUBLISHER_STATUS_LABELS.publisher_approved },
  { value: "completed", label: PUBLISHER_STATUS_LABELS.completed },
];

const SORT_OPTIONS: Array<{ value: LibrarySortField; label: string }> = [
  { value: "none", label: "None" },
  { value: "published_date", label: "Sort by: Publish Date" },
  { value: "title", label: "Sort by: Title" },
  { value: "site", label: "Sort by: Site" },
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

function getVisibleRange(totalRows: number, currentPage: number, rowLimit: LibraryRowLimit) {
  if (totalRows === 0) {
    return { start: 0, end: 0 };
  }
  if (rowLimit === "all") {
    return { start: 1, end: totalRows };
  }
  const start = (currentPage - 1) * rowLimit + 1;
  const end = Math.min(totalRows, currentPage * rowLimit);
  return { start, end };
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
  return formatDisplayDate(dateKey) || "—";
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


function isBoardStageQueryFilter(value: string | null): value is BoardStageQueryFilter {
  return value === "idea" || value === "writing" || value === "reviewing" || value === "publishing" || value === "published";
}

function BlogLibraryPageContent() {
  const searchParams = useSearchParams();
  const { hasPermission } = useAuth();
  const { showSaving, showSuccess, showError, updateStatus, pushNotification } =
    useSystemFeedback();
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
  const [rowDensity, setRowDensity] = useState<RowDensity>("comfortable");
  const [rowLimit, setRowLimit] = useState<LibraryRowLimit>(DEFAULT_ROW_LIMIT);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedBlogIds, setSelectedBlogIds] = useState<string[]>([]);
  const [focusedBlogId, setFocusedBlogId] = useState<string | null>(null);
  const [activeBlogId, setActiveBlogId] = useState<string | null>(null);
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

    let { data, error: blogsError } = await supabase
      .from("blogs")
      .select(BLOG_SELECT_WITH_DATES_WITH_RELATIONS)
      .eq("is_archived", false)
      .order("display_published_date", { ascending: false, nullsFirst: false })
      .order("updated_at", { ascending: false });

    if (isMissingBlogDateColumnsError(blogsError)) {
      const fallback = await supabase
        .from("blogs")
        .select(BLOG_SELECT_LEGACY_WITH_RELATIONS)
        .eq("is_archived", false)
        .order("target_publish_date", { ascending: false, nullsFirst: false })
        .order("updated_at", { ascending: false });
      data = fallback.data as typeof data;
      blogsError = fallback.error;
    }

    if (blogsError) {
      setError(blogsError.message);
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
      };
      setColumnOrder(normalizeLibraryColumnOrder(parsed.order));
      setHiddenColumns(normalizeLibraryHiddenColumns(parsed.hidden));
    } catch {
      setColumnOrder(DEFAULT_LIBRARY_COLUMN_ORDER);
      setHiddenColumns(DEFAULT_LIBRARY_HIDDEN_COLUMNS);
    }
  }, []);
  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    window.localStorage.setItem(
      BLOG_LIBRARY_COLUMN_VIEW_STORAGE_KEY,
      JSON.stringify({ order: columnOrder, hidden: hiddenColumns })
    );
  }, [columnOrder, hiddenColumns]);
  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const storedDensity = window.localStorage.getItem(BLOG_LIBRARY_ROW_DENSITY_STORAGE_KEY);
    if (storedDensity === "compact" || storedDensity === "comfortable") {
      setRowDensity(storedDensity);
    }
  }, []);
  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    window.localStorage.setItem(BLOG_LIBRARY_ROW_DENSITY_STORAGE_KEY, rowDensity);
  }, [rowDensity]);
  const closeOpenDetailsMenus = useCallback(() => {
    document.querySelectorAll<HTMLDetailsElement>("details[open]").forEach((menu) => {
      menu.open = false;
    });
  }, []);

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
        closeOpenDetailsMenus();
        setActiveBlogId(null);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("keydown", handleEscape);
    };
  }, [closeOpenDetailsMenus]);
  useEffect(() => {
    if (!activeBlogId) {
      return;
    }
    if (!blogs.some((blog) => blog.id === activeBlogId)) {
      setActiveBlogId(null);
    }
  }, [activeBlogId, blogs]);

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
  const visibleRange = useMemo(
    () => getVisibleRange(sortedBlogs.length, currentPage, rowLimit),
    [currentPage, rowLimit, sortedBlogs.length]
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
                {getSiteLabel(blog.site)}
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

  const resetFilters = () => {
    setSearchQuery("");
    setStatusFilter("published");
    setSiteFilter("all");
    setWriterStatusFilter("all");
    setPublisherStatusFilter("all");
    setSortField("published_date");
    setSortDirection("desc");
  };
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
    async (
      value: string,
      blogId: string,
      field: "title" | "url",
      successLabel: string
    ) => {
      if (!value) {
        return;
      }

      try {
        await navigator.clipboard.writeText(value);
        setCopiedCell({ blogId, field });
        showSuccess(successLabel);
      } catch {
        showError("Could not copy to clipboard.");
      }
    },
    [showError, showSuccess]
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
      if (
        (event.metaKey || event.ctrlKey) &&
        event.key.toLowerCase() === "c" &&
        focusedBlogId
      ) {
        const focusedBlog = pagedBlogs.find((blog) => blog.id === focusedBlogId);
        if (!focusedBlog) {
          return;
        }
        event.preventDefault();
        void copyToClipboard(focusedBlog.title, focusedBlog.id, "title", "Copied title.");
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
      showError(field === "title" ? "No titles to copy." : "No URLs to copy.");
      return;
    }
    try {
      await navigator.clipboard.writeText(values.join("\n"));
      showSuccess(field === "title" ? "Copied all titles." : "Copied all URLs.");
    } catch {
      showError("Could not copy to clipboard.");
    }
  };

  const getExportCellValue = (blog: BlogRecord, column: LibraryColumnKey) => {
    if (column === "site") {
      return getSiteLabel(blog.site);
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
  };

  const buildCsv = (rows: BlogRecord[]) => {
    const headers = visibleColumnOrder.map((column) =>
      escapeCsvValue(LIBRARY_COLUMN_LABELS[column])
    );
    const dataRows = rows.map((blog) =>
      visibleColumnOrder
        .map((column) => escapeCsvValue(getExportCellValue(blog, column)))
        .join(",")
    );
    return [headers.join(","), ...dataRows].join("\n");
  };

  const triggerDownload = (content: BlobPart, filename: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    if (blob.size === 0) {
      showError("Export failed because the generated file was empty.");
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
  };

  const exportCsv = (scope: "view" | "selected") => {
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
      `blog-library-${scope}-${format(new Date(), "yyyyMMdd-HHmm")}.csv`,
      "text/csv;charset=utf-8;"
    );
    updateStatus(statusId, {
      type: "success",
      message: "Export complete.",
      notification: {
        icon: "📤",
        message: `Export ready (${scope === "view" ? "view" : "selected"} CSV)`,
        href: "/blogs",
      },
    });
  };

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
    const generatedAt = format(new Date(), "MMM d yyyy, h:mm a");

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
        icon: "📤",
        message: `Export ready (${scope === "view" ? "view" : "selected"} PDF)`,
        href: "/blogs",
      },
    });
    pushNotification({
      icon: "📄",
      message: "Use browser print dialog to save PDF",
      href: "/blogs",
    });
  };

  return (
    <ProtectedPage requiredPermissions={["view_dashboard"]}>
      <AppShell>
        <div className="space-y-6 px-6">
          <DataPageHeader
            title="Blogs"
            description="Searchable reference library for blog titles, URLs, and published history."
            primaryAction={
              <div className="flex flex-wrap items-center justify-end gap-2">
                <div className="inline-flex rounded-md border border-slate-300 bg-white p-0.5 text-sm">
                  <span className="rounded bg-slate-900 px-3 py-1.5 font-medium text-white">
                    Table View
                  </span>
                  <Link
                    href="/blogs/cardboard"
                    className="pressable rounded px-3 py-1.5 text-slate-700 hover:bg-slate-100"
                  >
                    Pipeline View
                  </Link>
                </div>
                {canCreateBlogs ? (
                  <Link
                    href="/blogs/new"
                  className={buttonClass({ variant: "primary", size: "md" })}
                  >
                    Create Blog
                  </Link>
                ) : null}
                {canRunDataImport ? (
                  <BlogImportModal
                    autoOpen={shouldAutoOpenImport}
                    onImported={async (summary) => {
                      await loadBlogs();
                      showSuccess(
                        `Import complete: ${summary.created} created, ${summary.updated} updated, ${summary.failed} failed.`
                      );
                    }}
                  />
                ) : null}
              </div>
            }
          />

          <DataPageToolbar
            searchValue={searchQuery}
            onSearchChange={setSearchQuery}
            searchPlaceholder="Search blog title or URL"
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
                <PermissionGate
                  can={canExportCsv}
                  reason="You do not have permission to export the current blog view."
                  requiredPermission={ExportScopePermissions.viewExport}
                >
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      exportCsv("view");
                    }}
                  >
                    Export CSV
                  </Button>
                </PermissionGate>
                <PermissionGate
                  can={canExportCsv}
                  reason="You do not have permission to export the current blog view."
                  requiredPermission={ExportScopePermissions.viewExport}
                >
                  <Button
                    type="button"
                    className="pressable rounded border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-100"
                    onClick={() => {
                      exportPdf("view");
                    }}
                  >
                    Export PDF
                  </Button>
                </PermissionGate>
                <PermissionGate
                  can={canExportSelectedCsv}
                  reason="You do not have permission to export selected blog rows."
                  requiredPermission={ExportScopePermissions.selectedExport}
                >
                  <Button
                    type="button"
                    disabled={!canExportSelectedCsv || selectedBlogs.length === 0}
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      exportCsv("selected");
                    }}
                  >
                    Export Selection
                  </Button>
                </PermissionGate>
                <Button
                  type="button"
                  onClick={() => {
                    void copyAll("title");
                  }}
                  variant="secondary"
                  size="sm"
                >
                  Copy Titles
                </Button>
                <Button
                  type="button"
                  onClick={() => {
                    void copyAll("url");
                  }}
                  variant="secondary"
                  size="sm"
                >
                  Copy URLs
                </Button>
              </>
            }
            filters={
              <>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
                <select
                  aria-label="Publish State"
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
                <select
                  aria-label="Website"
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
                <select
                  aria-label="Writer Status"
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
                <select
                  aria-label="Publisher Status"
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
                <div className="flex items-center gap-2">
                  <select
                    aria-label="Sort Field"
                    value={sortField}
                    onChange={(event) => {
                      setSortField(event.target.value as LibrarySortField);
                    }}
                    className="focus-field flex-1 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700"
                  >
                    {SORT_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <select
                    aria-label="Sort Direction"
                    value={sortDirection}
                    disabled={sortField === "none"}
                    onChange={(event) => {
                      setSortDirection(event.target.value as LibrarySortDirection);
                    }}
                    className="focus-field w-16 rounded-md border border-slate-300 bg-white px-2 py-2 text-sm text-slate-700 disabled:cursor-not-allowed disabled:bg-slate-100"
                  >
                    <option value="asc">↑</option>
                    <option value="desc">↓</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end">
                <Button
                  type="button"
                  onClick={resetFilters}
                  variant="secondary"
                  size="sm"
                >
                  Reset Filters
                </Button>
              </div>
            </>
            }
          />
          <DataPageFilterPills pills={activeFilterPills} />

          <section className="space-y-4 rounded-lg border border-slate-200 bg-white p-4 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs uppercase tracking-wide text-slate-600">
                Showing <span className="font-semibold text-slate-900">{visibleRange.start}</span>–<span className="font-semibold text-slate-900">{visibleRange.end}</span> of{" "}
                <span className="font-semibold text-slate-900">{sortedBlogs.length}</span>
              </p>
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
                  Reset filters
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
                    + Create Blog
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
                rowClassName={(_blog, _index, isActive, isSelected) =>
                  cn(
                    "transition-colors",
                    isActive
                      ? "bg-slate-100"
                      : isSelected
                        ? "bg-slate-50"
                        : "hover:bg-slate-50"
                  )
                }
              />
            )}
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
              <label className="flex items-center gap-2 text-sm text-slate-600">
                <span className="font-medium text-slate-700">Rows per page</span>
                <select
                  className="focus-field rounded-md border border-slate-300 px-2 py-1 text-sm"
                  value={String(rowLimit)}
                  onChange={(event) => {
                    const nextValue =
                      event.target.value === "all"
                        ? "all"
                        : (Number(event.target.value) as LibraryRowLimit);
                    setRowLimit(nextValue);
                  }}
                >
                  {ROW_LIMIT_OPTIONS.map((option) => (
                    <option key={String(option)} value={String(option)}>
                      {option === "all" ? "All" : option}
                    </option>
                  ))}
                </select>
              </label>
              <TablePaginationControls
                currentPage={currentPage}
                pageCount={pageCount}
                onPageChange={setCurrentPage}
              />
            </div>
          </section>
          {activeBlog ? (
            <>
              <button
                type="button"
                aria-label="Close blog preview"
                className="fixed inset-0 z-30 bg-slate-900/25"
                onClick={() => {
                  setActiveBlogId(null);
                }}
              />
              <aside className="fixed inset-y-0 right-0 z-40 w-full max-w-lg overflow-y-auto border-l border-slate-200 bg-white shadow-2xl">
                <div className="sticky top-0 z-10 border-b border-slate-200 bg-white px-4 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-2">
                      <span
                        className={`inline-flex items-center justify-center rounded-full border px-2 py-0.5 text-xs font-medium ${getSiteBadgeClasses(
                          activeBlog.site
                        )}`}
                      >
                        {getSiteLabel(activeBlog.site)}
                      </span>
                      <h3 className="text-lg font-semibold text-slate-900">{activeBlog.title}</h3>
                    </div>
                    <button
                      type="button"
                      className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-100"
                      onClick={() => {
                        setActiveBlogId(null);
                      }}
                    >
                      Close
                    </button>
                  </div>
                </div>
                <div className="space-y-4 p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <WriterStatusBadge status={activeBlog.writer_status} />
                    <PublisherStatusBadge status={activeBlog.publisher_status} />
                    <span
                      className={`inline-flex items-center justify-center rounded border px-2 py-0.5 text-xs font-semibold ${getStageBadgeClasses(
                        getStageForBadge(activeBlog)
                      )}`}
                    >
                      {getStageLabel(getStageForBadge(activeBlog))}
                    </span>
                  </div>
                  <dl className="grid gap-3 rounded-lg border border-slate-200 p-3 text-sm sm:grid-cols-2">
                    <div>
                      <dt className="text-xs uppercase tracking-wide text-slate-500">Writer</dt>
                      <dd className="mt-1 text-slate-800">
                        {getAssigneeLabel(activeBlog.writer?.full_name)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs uppercase tracking-wide text-slate-500">Publisher</dt>
                      <dd className="mt-1 text-slate-800">
                        {getAssigneeLabel(activeBlog.publisher?.full_name)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs uppercase tracking-wide text-slate-500">
                        Published Date
                      </dt>
                      <dd className="mt-1 text-slate-800">{formatPublishedDate(activeBlog)}</dd>
                    </div>
                    <div>
                      <dt className="text-xs uppercase tracking-wide text-slate-500">Live URL</dt>
                      <dd className="mt-1 break-all text-slate-800">
                        {activeBlog.live_url ?? "—"}
                      </dd>
                    </div>
                  </dl>
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      href={`/blogs/${activeBlog.id}`}
                      className="pressable inline-flex items-center rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-100"
                    >
                      ↗ Open full page
                    </Link>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        void copyToClipboard(
                          activeBlog.title,
                          activeBlog.id,
                          "title",
                          "Copied title."
                        );
                      }}
                    >
                      Copy title
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        void copyToClipboard(
                          activeBlog.live_url ?? "",
                          activeBlog.id,
                          "url",
                          "Copied URL."
                        );
                      }}
                    >
                      Copy URL
                    </Button>
                  </div>
                </div>
              </aside>
            </>
          ) : null}
        </div>
      </AppShell>
    </ProtectedPage>
  );
}
