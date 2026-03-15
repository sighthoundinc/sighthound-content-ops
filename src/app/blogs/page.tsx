"use client";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { format } from "date-fns";

import { AppShell } from "@/components/app-shell";
import { Button, buttonClass } from "@/components/button";
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
import type {
  BlogRecord,
  BlogSite,
  PublisherStageStatus,
  WriterStageStatus,
} from "@/lib/types";
import { useAuth } from "@/providers/auth-provider";
import { useSystemFeedback } from "@/providers/system-feedback-provider";

type LibraryStatusFilter = "published" | "published_and_unpublished" | "unpublished";
type LibraryStage = "writing" | "needs_revision" | "ready_to_publish" | "publishing" | "published";
type LibrarySiteFilter = "all" | BlogSite;
type LibraryWriterStatusFilter = "all" | WriterStageStatus;
type LibraryPublisherStatusFilter = "all" | PublisherStageStatus;
type LibrarySortField = "published_date" | "title" | "site";
type LibrarySortDirection = "asc" | "desc";
type LibraryRowLimit = 10 | 20 | 50 | 100 | "all";
type BoardStageQueryFilter = "idea" | "writing" | "reviewing" | "publishing" | "published";

const ROW_LIMIT_OPTIONS: LibraryRowLimit[] = [10, 20, 50, 100, "all"];
const DEFAULT_ROW_LIMIT: LibraryRowLimit = 20;

const STATUS_FILTER_OPTIONS: Array<{ value: LibraryStatusFilter; label: string }> = [
  { value: "published", label: "Published" },
  { value: "published_and_unpublished", label: "Include Unpublished" },
  { value: "unpublished", label: "Unpublished only" },
];

const SITE_FILTER_OPTIONS: Array<{ value: LibrarySiteFilter; label: string }> = [
  { value: "all", label: "All Sites" },
  { value: "sighthound.com", label: "Sighthound (SH)" },
  { value: "redactor.com", label: "Redactor (RED)" },
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
  { value: "completed", label: PUBLISHER_STATUS_LABELS.completed },
];

const SORT_OPTIONS: Array<{ value: LibrarySortField; label: string }> = [
  { value: "published_date", label: "Published Date" },
  { value: "title", label: "Title" },
  { value: "site", label: "Site" },
];

const SORT_DIRECTION_OPTIONS: Array<{ value: LibrarySortDirection; label: string }> = [
  { value: "desc", label: "Descending" },
  { value: "asc", label: "Ascending" },
];


const escapeCsvValue = (value: string) => `"${value.replaceAll("\"", "\"\"")}"`;
const escapeHtmlValue = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;")
    .replaceAll("'", "&#39;");
const escapeRegexValue = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

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
  if (!dateKey) {
    return "—";
  }
  const dateValue = new Date(`${dateKey}T00:00:00`);
  if (Number.isNaN(dateValue.getTime())) {
    return "—";
  }
  return format(dateValue, "MMM d yyyy");
}

function getSiteBadgeClasses(site: BlogSite) {
  if (site === "sighthound.com") {
    return "border-blue-200 bg-blue-50 text-blue-700";
  }
  return "border-orange-200 bg-orange-50 text-orange-700";
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

function renderHighlightedText(value: string, query: string) {
  const normalizedQuery = query.trim();
  if (!normalizedQuery) {
    return value;
  }
  const matcher = new RegExp(`(${escapeRegexValue(normalizedQuery)})`, "ig");
  return value.split(matcher).map((part, index) =>
    part.toLowerCase() === normalizedQuery.toLowerCase() ? (
      <mark
        key={`${part}-${index}`}
        className="rounded bg-amber-100 px-0.5 text-slate-900"
      >
        {part}
      </mark>
    ) : (
      part
    )
  );
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
  const [rowLimit, setRowLimit] = useState<LibraryRowLimit>(DEFAULT_ROW_LIMIT);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedBlogIds, setSelectedBlogIds] = useState<string[]>([]);
  const [copiedCell, setCopiedCell] = useState<{
    blogId: string;
    field: "title" | "url";
  } | null>(null);
  const boardStageQuery = searchParams.get("boardStage");

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
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("keydown", handleEscape);
    };
  }, [closeOpenDetailsMenus]);

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

  const selectedIdSet = useMemo(() => new Set(selectedBlogIds), [selectedBlogIds]);
  const selectedBlogs = useMemo(
    () => sortedBlogs.filter((blog) => selectedIdSet.has(blog.id)),
    [selectedIdSet, sortedBlogs]
  );
  const visibleRange = useMemo(
    () => getVisibleRange(sortedBlogs.length, currentPage, rowLimit),
    [currentPage, rowLimit, sortedBlogs.length]
  );
  const shouldShowStageColumn = statusFilter !== "published";
  const hasActiveFilters =
    searchQuery.trim().length > 0 ||
    statusFilter !== "published" ||
    siteFilter !== "all" ||
    writerStatusFilter !== "all" ||
    publisherStatusFilter !== "all";
  const hasNoResults = !isLoading && sortedBlogs.length === 0;
  const tableColumnCount = 7 + (canSelectRows ? 1 : 0) + (shouldShowStageColumn ? 1 : 0);
  const allVisibleSelected =
    pagedBlogs.length > 0 && pagedBlogs.every((blog) => selectedIdSet.has(blog.id));
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

  const copyToClipboard = async (
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
  };

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

  const toggleSelectAllVisible = (nextChecked: boolean) => {
    if (!canSelectRows) {
      return;
    }
    if (!nextChecked) {
      const visibleIds = new Set(pagedBlogs.map((blog) => blog.id));
      setSelectedBlogIds((previous) => previous.filter((id) => !visibleIds.has(id)));
      return;
    }
    setSelectedBlogIds((previous) => {
      const next = new Set(previous);
      for (const blog of pagedBlogs) {
        next.add(blog.id);
      }
      return Array.from(next);
    });
  };

  const toggleRowSelection = (blogId: string, nextChecked: boolean) => {
    if (!canSelectRows) {
      return;
    }
    setSelectedBlogIds((previous) => {
      if (nextChecked) {
        return previous.includes(blogId) ? previous : [...previous, blogId];
      }
      return previous.filter((id) => id !== blogId);
    });
  };

  const buildCsv = (rows: BlogRecord[]) => {
    const headers = ["Sr #", "Blog Title", "Live URL", "Published Date", "Site"].map(
      escapeCsvValue
    );
    const dataRows = rows.map((blog, index) =>
      [
        String(index + 1),
        blog.title,
        blog.live_url ?? "",
        formatPublishedDate(blog),
        blog.site === "sighthound.com" ? "SH" : "RED",
      ]
        .map(escapeCsvValue)
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

    const rowsMarkup = rows
      .map((blog, index) => {
        const site = blog.site === "sighthound.com" ? "SH" : "RED";
        return `<tr>
          <td>${index + 1}</td>
          <td>${escapeHtmlValue(blog.title)}</td>
          <td>${escapeHtmlValue(blog.live_url ?? "")}</td>
          <td>${escapeHtmlValue(formatPublishedDate(blog))}</td>
          <td>${escapeHtmlValue(site)}</td>
        </tr>`;
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
        <th>Sr #</th>
        <th>Blog Title</th>
        <th>Live URL</th>
        <th>Published Date</th>
        <th>Site</th>
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
        <div className="space-y-5">
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
              </>
            }
            filters={
              <>
              <label className="space-y-1 text-xs font-medium uppercase tracking-wide text-slate-500">
                Publish State
                <select
                  value={statusFilter}
                  onChange={(event) => {
                    setStatusFilter(event.target.value as LibraryStatusFilter);
                  }}
                  className="focus-field w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-normal normal-case tracking-normal text-slate-700"
                >
                  {STATUS_FILTER_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-1 text-xs font-medium uppercase tracking-wide text-slate-500 md:col-span-2 xl:col-span-1">
                Website
                <select
                  value={siteFilter}
                  onChange={(event) => {
                    setSiteFilter(event.target.value as LibrarySiteFilter);
                  }}
                  className="focus-field w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-normal normal-case tracking-normal text-slate-700"
                >
                  {SITE_FILTER_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-1 text-xs font-medium uppercase tracking-wide text-slate-500">
                Writer Status
                <select
                  value={writerStatusFilter}
                  onChange={(event) => {
                    setWriterStatusFilter(event.target.value as LibraryWriterStatusFilter);
                  }}
                  className="focus-field w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-normal normal-case tracking-normal text-slate-700"
                >
                  {WRITER_STATUS_FILTER_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-1 text-xs font-medium uppercase tracking-wide text-slate-500 md:col-span-2 xl:col-span-1">
                Publisher Status
                <select
                  value={publisherStatusFilter}
                  onChange={(event) => {
                    setPublisherStatusFilter(event.target.value as LibraryPublisherStatusFilter);
                  }}
                  className="focus-field w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-normal normal-case tracking-normal text-slate-700"
                >
                  {PUBLISHER_STATUS_FILTER_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-1 text-xs font-medium uppercase tracking-wide text-slate-500">
                Sort By
                <select
                  value={sortField}
                  onChange={(event) => {
                    setSortField(event.target.value as LibrarySortField);
                  }}
                  className="focus-field w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-normal normal-case tracking-normal text-slate-700"
                >
                  {SORT_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-1 text-xs font-medium uppercase tracking-wide text-slate-500 md:col-span-2 xl:col-span-1">
                Direction
                <select
                  value={sortDirection}
                  onChange={(event) => {
                    setSortDirection(event.target.value as LibrarySortDirection);
                  }}
                  className="focus-field w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-normal normal-case tracking-normal text-slate-700"
                >
                  {SORT_DIRECTION_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <div className="flex items-end justify-end md:col-span-2 xl:col-span-1">
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

          {error ? (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-rose-200 bg-rose-50 px-4 py-3">
              <p className="text-sm text-rose-700">{error}</p>
              <Button
                type="button"
                onClick={() => {
                  void loadBlogs();
                }}
                variant="secondary"
                size="xs"
              >
                Retry
              </Button>
            </div>
          ) : null}

          <section className="space-y-3 rounded-lg border border-slate-200 bg-white p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm text-slate-600">
                Showing <span className="font-medium text-slate-900">{visibleRange.start}</span>-
                <span className="font-medium text-slate-900">{visibleRange.end}</span> of{" "}
                <span className="font-medium text-slate-900">{sortedBlogs.length}</span> blogs
              </p>
            </div>
            {hasNoResults && hasActiveFilters ? (
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
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
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-slate-200 bg-slate-50 px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-slate-900">No blogs yet.</p>
                  <p className="text-sm text-slate-600">
                    Create your first blog to start building the content library.
                  </p>
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
              <div className="overflow-auto rounded-lg border border-slate-200">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead className="sticky top-0 z-10 bg-slate-100 text-left text-xs uppercase tracking-wide text-slate-600">
                    <tr>
                      {canSelectRows ? <th className="px-3 py-2" /> : null}
                      <th className="px-3 py-2">Sr #</th>
                      <th className="px-3 py-2">Blog Title</th>
                      <th className="px-3 py-2">Live URL</th>
                      <th className="px-3 py-2">Writer Status</th>
                      <th className="px-3 py-2">Publisher Status</th>
                      <th className="px-3 py-2">Published Date</th>
                      {shouldShowStageColumn ? <th className="px-3 py-2">Stage</th> : null}
                      <th className="px-3 py-2">Site</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {Array.from({ length: 5 }).map((_, rowIndex) => (
                      <tr key={`skeleton-row-${rowIndex}`}>
                        <td className="px-3 py-3" colSpan={tableColumnCount}>
                          <div className="skeleton h-4 w-full" />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : hasNoResults ? null : (
              <div className="overflow-auto rounded-lg border border-slate-200">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead className="sticky top-0 z-10 bg-slate-100 text-left text-xs uppercase tracking-wide text-slate-600">
                    <tr>
                      {canSelectRows ? (
                        <th className="px-3 py-2">
                          <input
                            type="checkbox"
                            checked={allVisibleSelected}
                            onChange={(event) => {
                              toggleSelectAllVisible(event.target.checked);
                            }}
                          />
                        </th>
                      ) : null}
                      <th className="px-3 py-2">Sr #</th>
                      <th className="px-3 py-2">Blog Title</th>
                      <th className="px-3 py-2">Live URL</th>
                      <th className="px-3 py-2">Writer Status</th>
                      <th className="px-3 py-2">Publisher Status</th>
                      <th className="px-3 py-2">Published Date</th>
                      {shouldShowStageColumn ? <th className="px-3 py-2">Stage</th> : null}
                      <th className="px-3 py-2">Site</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {pagedBlogs.map((blog, index) => {
                      const globalIndex =
                        rowLimit === "all"
                          ? index + 1
                          : (currentPage - 1) * rowLimit + index + 1;
                      const copiedTitle =
                        copiedCell?.blogId === blog.id && copiedCell.field === "title";
                      const copiedUrl = copiedCell?.blogId === blog.id && copiedCell.field === "url";
                      const stage = getStageForBadge(blog);
                      return (
                        <tr key={blog.id} className="group hover:bg-slate-50">
                          {canSelectRows ? (
                            <td className="px-3 py-2 align-top">
                              <input
                                type="checkbox"
                                checked={selectedIdSet.has(blog.id)}
                                onChange={(event) => {
                                  toggleRowSelection(blog.id, event.target.checked);
                                }}
                              />
                            </td>
                          ) : null}
                          <td className="px-3 py-2 align-top text-slate-600">{globalIndex}</td>
                          <td className="px-3 py-2 align-top text-slate-900">
                            <div className="max-w-[34rem] space-y-1">
                              <div className="group/title inline-flex max-w-full items-start gap-2">
                                <Link
                                  href={`/blogs/${blog.id}`}
                                  className="interactive-link line-clamp-2 font-medium text-slate-800"
                                >
                                  {renderHighlightedText(blog.title, searchQuery)}
                                </Link>
                                <span className="tooltip-container">
                                  <button
                                    type="button"
                                    aria-label="Copy blog title"
                                    className="pressable reveal-on-row-hover rounded border border-slate-300 bg-white px-1.5 py-0.5 text-[11px] text-slate-600 hover:bg-slate-100"
                                    onClick={() => {
                                      void copyToClipboard(
                                        blog.title,
                                        blog.id,
                                        "title",
                                        "Copied title."
                                      );
                                    }}
                                  >
                                    {copiedTitle ? "✓" : "📋"}
                                  </button>
                                  <span className="tooltip-bubble">Copy blog title</span>
                                </span>
                                <details className="relative">
                                  <summary className="pressable reveal-on-row-hover cursor-pointer list-none rounded border border-slate-300 bg-white px-1.5 py-0.5 text-[11px] text-slate-600 hover:bg-slate-100">
                                    ⋯
                                  </summary>
                                  <div className="absolute right-0 z-20 mt-1 w-36 rounded-md border border-slate-200 bg-white p-1 shadow-md">
                                    <Link
                                      href={`/blogs/${blog.id}`}
                                      className="interactive-link block rounded px-2 py-1 text-xs text-slate-700 hover:bg-slate-100"
                                      onClick={() => {
                                        closeOpenDetailsMenus();
                                      }}
                                    >
                                      Open details
                                    </Link>
                                    <button
                                      type="button"
                                      className="pressable block w-full rounded px-2 py-1 text-left text-xs text-slate-700 hover:bg-slate-100"
                                      onClick={() => {
                                        closeOpenDetailsMenus();
                                        void copyToClipboard(
                                          blog.title,
                                          blog.id,
                                          "title",
                                          "Copied title."
                                        );
                                      }}
                                    >
                                      Copy title
                                    </button>
                                    <button
                                      type="button"
                                      className="pressable block w-full rounded px-2 py-1 text-left text-xs text-slate-700 hover:bg-slate-100"
                                      onClick={() => {
                                        closeOpenDetailsMenus();
                                        void copyToClipboard(
                                          blog.live_url ?? "",
                                          blog.id,
                                          "url",
                                          "Copied URL."
                                        );
                                      }}
                                    >
                                      Copy URL
                                    </button>
                                  </div>
                                </details>
                              </div>
                              <p className="line-clamp-1 text-xs text-slate-500">
                                {blog.site === "sighthound.com" ? "SH" : "RED"} • Writer:{" "}
                                {getAssigneeLabel(blog.writer?.full_name)} • Publisher:{" "}
                                {getAssigneeLabel(blog.publisher?.full_name)}
                              </p>
                            </div>
                          </td>
                          <td className="px-3 py-2 align-top text-slate-700">
                            {blog.live_url ? (
                              <div className="group/url inline-flex max-w-[24rem] items-center gap-2">
                                <a
                                  href={blog.live_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="interactive-link truncate text-left text-slate-700"
                                  title={blog.live_url}
                                >
                                  {renderHighlightedText(blog.live_url, searchQuery)} ↗
                                </a>
                                <span className="tooltip-container">
                                  <button
                                    type="button"
                                    aria-label="Copy blog URL"
                                    className="pressable reveal-on-row-hover rounded border border-slate-300 bg-white px-1.5 py-0.5 text-[11px] text-slate-600 hover:bg-slate-100"
                                    onClick={() => {
                                      void copyToClipboard(
                                        blog.live_url ?? "",
                                        blog.id,
                                        "url",
                                        "Copied URL."
                                      );
                                    }}
                                  >
                                    {copiedUrl ? "✓" : "🔗"}
                                  </button>
                                  <span className="tooltip-bubble">Copy blog URL</span>
                                </span>
                              </div>
                            ) : (
                              "—"
                            )}
                          </td>
                          <td className="px-3 py-2 align-top text-xs text-slate-700">
                            {WRITER_STATUS_LABELS[blog.writer_status]}
                          </td>
                          <td className="px-3 py-2 align-top text-xs text-slate-700">
                            {PUBLISHER_STATUS_LABELS[blog.publisher_status]}
                          </td>
                          <td className="px-3 py-2 align-top text-slate-600">
                            {formatPublishedDate(blog)}
                          </td>
                          {shouldShowStageColumn ? (
                            <td className="px-3 py-2 align-top">
                              <span
                                className={`inline-flex items-center justify-center rounded border px-2 py-0.5 text-xs font-semibold ${getStageBadgeClasses(
                                  stage
                                )}`}
                              >
                                {getStageLabel(stage)}
                              </span>
                            </td>
                          ) : null}
                          <td className="px-3 py-2 align-top">
                            <span
                              className={`inline-flex min-w-10 items-center justify-center rounded border px-2 py-0.5 text-xs font-semibold ${getSiteBadgeClasses(
                                blog.site
                              )}`}
                            >
                              {blog.site === "sighthound.com" ? "SH" : "RED"}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
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
        </div>
      </AppShell>
    </ProtectedPage>
  );
}
