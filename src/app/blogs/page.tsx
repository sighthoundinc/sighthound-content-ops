"use client";

import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";

import { AppShell } from "@/components/app-shell";
import { ProtectedPage } from "@/components/protected-page";
import { TablePaginationControls } from "@/components/table-controls";
import {
  BLOG_SELECT_LEGACY,
  BLOG_SELECT_WITH_DATES,
  getBlogPublishDate,
  isMissingBlogDateColumnsError,
  normalizeBlogRows,
} from "@/lib/blog-schema";
import { getWorkflowStage } from "@/lib/status";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import type { BlogRecord, BlogSite } from "@/lib/types";

type LibraryStatusFilter = "published" | "published_and_unpublished" | "unpublished";
type LibraryStageFilter =
  | "all"
  | "writing"
  | "needs_revision"
  | "ready_to_publish"
  | "publishing"
  | "published";
type LibrarySiteFilter = "all" | BlogSite;
type LibrarySortField = "published_date" | "title" | "site";
type LibrarySortDirection = "asc" | "desc";
type LibraryRowLimit = 10 | 20 | 50 | 100 | "all";

const ROW_LIMIT_OPTIONS: LibraryRowLimit[] = [10, 20, 50, 100, "all"];
const DEFAULT_ROW_LIMIT: LibraryRowLimit = 20;

const STATUS_FILTER_OPTIONS: Array<{ value: LibraryStatusFilter; label: string }> = [
  { value: "published", label: "Published" },
  { value: "published_and_unpublished", label: "Published + Unpublished" },
  { value: "unpublished", label: "Unpublished only" },
];

const STAGE_FILTER_OPTIONS: Array<{ value: LibraryStageFilter; label: string }> = [
  { value: "all", label: "All" },
  { value: "writing", label: "Writing" },
  { value: "needs_revision", label: "Needs Revision" },
  { value: "ready_to_publish", label: "Ready to Publish" },
  { value: "publishing", label: "Publishing" },
  { value: "published", label: "Published" },
];

const SITE_FILTER_OPTIONS: Array<{ value: LibrarySiteFilter; label: string }> = [
  { value: "all", label: "All Sites" },
  { value: "sighthound.com", label: "Sighthound (SH)" },
  { value: "redactor.com", label: "Redactor (RED)" },
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

function getPublishedDateKey(blog: BlogRecord) {
  return blog.display_published_date ?? getBlogPublishDate(blog);
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

export default function BlogLibraryPage() {
  const [blogs, setBlogs] = useState<BlogRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<LibraryStatusFilter>("published");
  const [stageFilter, setStageFilter] = useState<LibraryStageFilter>("all");
  const [siteFilter, setSiteFilter] = useState<LibrarySiteFilter>("all");
  const [sortField, setSortField] = useState<LibrarySortField>("published_date");
  const [sortDirection, setSortDirection] = useState<LibrarySortDirection>("desc");
  const [rowLimit, setRowLimit] = useState<LibraryRowLimit>(DEFAULT_ROW_LIMIT);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedBlogIds, setSelectedBlogIds] = useState<string[]>([]);
  const [copiedCell, setCopiedCell] = useState<{
    blogId: string;
    field: "title" | "url";
  } | null>(null);

  useEffect(() => {
    const loadBlogs = async () => {
      const supabase = getSupabaseBrowserClient();
      setIsLoading(true);
      setError(null);

      let { data, error: blogsError } = await supabase
        .from("blogs")
        .select(BLOG_SELECT_WITH_DATES)
        .eq("is_archived", false)
        .order("display_published_date", { ascending: false, nullsFirst: false })
        .order("updated_at", { ascending: false });

      if (isMissingBlogDateColumnsError(blogsError)) {
        const fallback = await supabase
          .from("blogs")
          .select(BLOG_SELECT_LEGACY)
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

      setBlogs(
        normalizeBlogRows((data ?? []) as Array<Record<string, unknown>>) as BlogRecord[]
      );
      setIsLoading(false);
    };

    void loadBlogs();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, rowLimit, siteFilter, sortDirection, sortField, stageFilter, statusFilter]);

  useEffect(() => {
    const existingIds = new Set(blogs.map((blog) => blog.id));
    setSelectedBlogIds((previous) => previous.filter((id) => existingIds.has(id)));
  }, [blogs]);

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

  const filteredBlogs = useMemo(() => {
    const normalizedSearch = searchQuery.trim().toLowerCase();

    return blogs.filter((blog) => {
      if (statusFilter === "published" && blog.overall_status !== "published") {
        return false;
      }
      if (statusFilter === "unpublished" && blog.overall_status === "published") {
        return false;
      }

      if (stageFilter !== "all") {
        if (stageFilter === "publishing") {
          const stage = getWorkflowStage({
            writerStatus: blog.writer_status,
            publisherStatus: blog.publisher_status,
          });
          if (stage !== "publishing") {
            return false;
          }
        } else if (blog.overall_status !== stageFilter) {
          return false;
        }
      }

      if (siteFilter !== "all" && blog.site !== siteFilter) {
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
  }, [blogs, searchQuery, siteFilter, stageFilter, statusFilter]);

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
  const allVisibleSelected =
    pagedBlogs.length > 0 && pagedBlogs.every((blog) => selectedIdSet.has(blog.id));

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
      setSuccessMessage(successLabel);
      setError(null);
    } catch {
      setError("Could not copy to clipboard.");
      setSuccessMessage(null);
    }
  };

  const copyAll = async (field: "title" | "url") => {
    const values =
      field === "title"
        ? sortedBlogs.map((blog) => blog.title)
        : sortedBlogs.map((blog) => blog.live_url ?? "").filter((value) => value.length > 0);
    if (values.length === 0) {
      setError(field === "title" ? "No titles to copy." : "No URLs to copy.");
      setSuccessMessage(null);
      return;
    }
    try {
      await navigator.clipboard.writeText(values.join("\n"));
      setSuccessMessage(field === "title" ? "Copied all titles." : "Copied all URLs.");
      setError(null);
    } catch {
      setError("Could not copy to clipboard.");
      setSuccessMessage(null);
    }
  };

  const toggleSelectAllVisible = (nextChecked: boolean) => {
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
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const exportCsv = (scope: "view" | "selected") => {
    const rows = scope === "selected" ? selectedBlogs : sortedBlogs;
    if (rows.length === 0) {
      setError(scope === "selected" ? "No selected rows to export." : "No rows to export.");
      setSuccessMessage(null);
      return;
    }
    triggerDownload(
      `\uFEFF${buildCsv(rows)}`,
      `blog-library-${scope}-${format(new Date(), "yyyyMMdd-HHmm")}.csv`,
      "text/csv;charset=utf-8;"
    );
    setError(null);
    setSuccessMessage(`Exported ${scope} CSV.`);
  };

  const exportPdf = (scope: "view" | "selected") => {
    const rows = scope === "selected" ? selectedBlogs : sortedBlogs;
    if (rows.length === 0) {
      setError(scope === "selected" ? "No selected rows to export." : "No rows to export.");
      setSuccessMessage(null);
      return;
    }

    const popup = window.open("", "_blank", "noopener,noreferrer,width=1100,height=800");
    if (!popup) {
      setError("Popup blocked. Allow popups to export PDF.");
      setSuccessMessage(null);
      return;
    }

    const rowsMarkup = rows
      .map((blog, index) => {
        const site = blog.site === "sighthound.com" ? "SH" : "RED";
        return `<tr>
          <td>${index + 1}</td>
          <td>${blog.title}</td>
          <td>${blog.live_url ?? ""}</td>
          <td>${formatPublishedDate(blog)}</td>
          <td>${site}</td>
        </tr>`;
      })
      .join("");

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
  <p>Generated ${format(new Date(), "MMM d yyyy, h:mm a")}</p>
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
    popup.focus();
    popup.print();

    setError(null);
    setSuccessMessage(`Prepared ${scope} PDF export.`);
  };

  return (
    <ProtectedPage requiredPermissions={["view_dashboard"]}>
      <AppShell>
        <div className="space-y-5">
          <header className="space-y-1">
            <h2 className="text-xl font-semibold text-slate-900">Blog Library</h2>
            <p className="text-sm text-slate-600">
              Fast searchable reference for published titles and live URLs.
            </p>
          </header>

          <section className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
            <input
              type="search"
              value={searchQuery}
              onChange={(event) => {
                setSearchQuery(event.target.value);
              }}
              placeholder="Search title or URL"
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
            />
            <div className="grid gap-3 md:grid-cols-3">
              <label className="space-y-1 text-xs font-medium uppercase tracking-wide text-slate-500">
                Status
                <select
                  value={statusFilter}
                  onChange={(event) => {
                    setStatusFilter(event.target.value as LibraryStatusFilter);
                  }}
                  className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-normal normal-case tracking-normal text-slate-700"
                >
                  {STATUS_FILTER_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-1 text-xs font-medium uppercase tracking-wide text-slate-500">
                Stage
                <select
                  value={stageFilter}
                  onChange={(event) => {
                    setStageFilter(event.target.value as LibraryStageFilter);
                  }}
                  className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-normal normal-case tracking-normal text-slate-700"
                >
                  {STAGE_FILTER_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-1 text-xs font-medium uppercase tracking-wide text-slate-500">
                Website
                <select
                  value={siteFilter}
                  onChange={(event) => {
                    setSiteFilter(event.target.value as LibrarySiteFilter);
                  }}
                  className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-normal normal-case tracking-normal text-slate-700"
                >
                  {SITE_FILTER_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <label className="space-y-1 text-xs font-medium uppercase tracking-wide text-slate-500">
                Sort By
                <select
                  value={sortField}
                  onChange={(event) => {
                    setSortField(event.target.value as LibrarySortField);
                  }}
                  className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-normal normal-case tracking-normal text-slate-700"
                >
                  {SORT_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-1 text-xs font-medium uppercase tracking-wide text-slate-500">
                Direction
                <select
                  value={sortDirection}
                  onChange={(event) => {
                    setSortDirection(event.target.value as LibrarySortDirection);
                  }}
                  className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-normal normal-case tracking-normal text-slate-700"
                >
                  {SORT_DIRECTION_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </section>

          {error ? (
            <p className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error}
            </p>
          ) : null}
          {successMessage ? (
            <p className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              {successMessage}
            </p>
          ) : null}

          <section className="space-y-3 rounded-lg border border-slate-200 bg-white p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm text-slate-600">
                Showing <span className="font-medium text-slate-900">{visibleRange.start}</span>-
                <span className="font-medium text-slate-900">{visibleRange.end}</span> of{" "}
                <span className="font-medium text-slate-900">{sortedBlogs.length}</span> blogs
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    void copyAll("title");
                  }}
                  className="rounded border border-slate-300 bg-white px-3 py-1 text-sm text-slate-700 hover:bg-slate-100"
                >
                  Copy All Titles
                </button>
                <button
                  type="button"
                  onClick={() => {
                    void copyAll("url");
                  }}
                  className="rounded border border-slate-300 bg-white px-3 py-1 text-sm text-slate-700 hover:bg-slate-100"
                >
                  Copy All URLs
                </button>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                className="rounded border border-slate-300 bg-white px-3 py-1 text-sm text-slate-700 hover:bg-slate-100"
                onClick={() => {
                  exportCsv("view");
                }}
              >
                Export View CSV
              </button>
              <button
                type="button"
                className="rounded border border-slate-300 bg-white px-3 py-1 text-sm text-slate-700 hover:bg-slate-100"
                onClick={() => {
                  exportPdf("view");
                }}
              >
                Export View PDF
              </button>
              <button
                type="button"
                disabled={selectedBlogs.length === 0}
                className="rounded border border-slate-300 bg-white px-3 py-1 text-sm text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                onClick={() => {
                  exportCsv("selected");
                }}
              >
                Export Selected CSV
              </button>
              <button
                type="button"
                disabled={selectedBlogs.length === 0}
                className="rounded border border-slate-300 bg-white px-3 py-1 text-sm text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                onClick={() => {
                  exportPdf("selected");
                }}
              >
                Export Selected PDF
              </button>
            </div>

            {isLoading ? (
              <p className="rounded-md border border-slate-200 bg-slate-50 px-4 py-5 text-sm text-slate-500">
                Loading blog library…
              </p>
            ) : (
              <div className="overflow-auto rounded-lg border border-slate-200">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead className="bg-slate-100 text-left text-xs uppercase tracking-wide text-slate-600">
                    <tr>
                      <th className="px-3 py-2">
                        <input
                          type="checkbox"
                          checked={allVisibleSelected}
                          onChange={(event) => {
                            toggleSelectAllVisible(event.target.checked);
                          }}
                        />
                      </th>
                      <th className="px-3 py-2">Sr #</th>
                      <th className="px-3 py-2">Blog Title</th>
                      <th className="px-3 py-2">Live URL</th>
                      <th className="px-3 py-2">Published Date</th>
                      <th className="px-3 py-2">Site</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {pagedBlogs.length === 0 ? (
                      <tr>
                        <td className="px-3 py-5 text-center text-slate-500" colSpan={6}>
                          No blogs found with current filters.
                        </td>
                      </tr>
                    ) : (
                      pagedBlogs.map((blog, index) => {
                        const globalIndex =
                          rowLimit === "all"
                            ? index + 1
                            : (currentPage - 1) * rowLimit + index + 1;
                        const copiedTitle =
                          copiedCell?.blogId === blog.id && copiedCell.field === "title";
                        const copiedUrl =
                          copiedCell?.blogId === blog.id && copiedCell.field === "url";
                        return (
                          <tr key={blog.id} className="group hover:bg-slate-50">
                            <td className="px-3 py-2 align-top">
                              <input
                                type="checkbox"
                                checked={selectedIdSet.has(blog.id)}
                                onChange={(event) => {
                                  toggleRowSelection(blog.id, event.target.checked);
                                }}
                              />
                            </td>
                            <td className="px-3 py-2 align-top text-slate-600">{globalIndex}</td>
                            <td className="px-3 py-2 align-top text-slate-900">
                              <div className="group/title inline-flex max-w-[34rem] items-center gap-2">
                                <span className="line-clamp-2">{blog.title}</span>
                                <button
                                  type="button"
                                  title="Copy Title"
                                  className="rounded border border-slate-300 bg-white px-1.5 py-0.5 text-[11px] text-slate-600 opacity-0 transition group-hover/title:opacity-100 hover:bg-slate-100"
                                  onClick={() => {
                                    void copyToClipboard(
                                      blog.title,
                                      blog.id,
                                      "title",
                                      "Copied title."
                                    );
                                  }}
                                >
                                  {copiedTitle ? "Copied ✓" : "Copy"}
                                </button>
                              </div>
                            </td>
                            <td className="px-3 py-2 align-top text-slate-700">
                              {blog.live_url ? (
                                <div className="group/url inline-flex max-w-[24rem] items-center gap-2">
                                  <button
                                    type="button"
                                    className="truncate text-left hover:text-slate-900 hover:underline"
                                    onClick={() => {
                                      void copyToClipboard(
                                        blog.live_url ?? "",
                                        blog.id,
                                        "url",
                                        "Copied URL."
                                      );
                                    }}
                                    title="Copy URL"
                                  >
                                    {blog.live_url}
                                  </button>
                                  <button
                                    type="button"
                                    title="Copy URL"
                                    className="rounded border border-slate-300 bg-white px-1.5 py-0.5 text-[11px] text-slate-600 opacity-0 transition group-hover/url:opacity-100 hover:bg-slate-100"
                                    onClick={() => {
                                      void copyToClipboard(
                                        blog.live_url ?? "",
                                        blog.id,
                                        "url",
                                        "Copied URL."
                                      );
                                    }}
                                  >
                                    {copiedUrl ? "Copied ✓" : "Copy"}
                                  </button>
                                </div>
                              ) : (
                                "—"
                              )}
                            </td>
                            <td className="px-3 py-2 align-top text-slate-600">
                              {formatPublishedDate(blog)}
                            </td>
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
                      })
                    )}
                  </tbody>
                </table>
              </div>
            )}
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
              <label className="flex items-center gap-2 text-sm text-slate-600">
                <span className="font-medium text-slate-700">Rows per page</span>
                <select
                  className="rounded-md border border-slate-300 px-2 py-1 text-sm"
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
