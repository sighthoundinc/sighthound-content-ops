"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { isBefore, parseISO } from "date-fns";

import { AppShell } from "@/components/app-shell";
import { CheckboxMultiSelect } from "@/components/checkbox-multi-select";
import { ProtectedPage } from "@/components/protected-page";
import { StatusBadge } from "@/components/status-badge";
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
  normalizeBlogRows,
} from "@/lib/blog-schema";
import {
  OVERALL_STATUSES,
  PUBLISHER_STATUSES,
  SITES,
  STATUS_LABELS,
  WRITER_STATUSES,
} from "@/lib/status";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import {
  DEFAULT_TABLE_ROW_LIMIT,
  getTablePageCount,
  getTablePageRows,
  type SortDirection,
  type TableRowLimit,
} from "@/lib/table";
import type {
  BlogSite,
  BlogRecord,
  OverallBlogStatus,
  ProfileRecord,
  PublisherStageStatus,
  WriterStageStatus,
} from "@/lib/types";
import { formatDateInput, toTitleCase } from "@/lib/utils";
import { useAuth } from "@/providers/auth-provider";

const WRITER_STATUS_FILTER_LABELS: Record<WriterStageStatus, string> = {
  not_started: "Not Started",
  in_progress: "In Progress",
  needs_revision: "Pending Review",
  completed: "Completed",
};

const PUBLISHER_STATUS_FILTER_LABELS: Record<PublisherStageStatus, string> = {
  not_started: "Not Started",
  in_progress: "In Progress",
  completed: "Completed",
};

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
  overall_status: "Overall Status",
  publish_date: "Publish Date",
};

const DEFAULT_DASHBOARD_COLUMN_ORDER: DashboardColumnKey[] = [
  "title",
  "site",
  "writer",
  "writer_status",
  "publisher",
  "publisher_status",
  "overall_status",
  "publish_date",
];

const DASHBOARD_COLUMN_VIEW_STORAGE_KEY = "dashboard-column-view:v1";

const isDashboardColumnKey = (value: string): value is DashboardColumnKey =>
  value in DASHBOARD_COLUMN_LABELS;

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

const DASHBOARD_SORT_OPTIONS: Array<{ value: DashboardSortField; label: string }> = [
  { value: "publish_date", label: "Publish Date" },
  { value: "title", label: "Title" },
  { value: "writer", label: "Writer" },
  { value: "publisher", label: "Publisher" },
  { value: "overall_status", label: "Overall Status" },
  { value: "writer_status", label: "Writer Status" },
  { value: "publisher_status", label: "Publisher Status" },
];

export default function DashboardPage() {
  const router = useRouter();
  const { profile } = useAuth();
  const isAdmin = profile?.role === "admin";
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

    setBlogs(
      normalizeBlogRows((blogsData ?? []) as Array<Record<string, unknown>>) as BlogRecord[]
    );
    if (settingsData?.stale_draft_days) {
      setStaleDraftDays(settingsData.stale_draft_days);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  useEffect(() => {
    if (!isAdmin) {
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
  }, [isAdmin]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const savedColumnView = window.localStorage.getItem(
      DASHBOARD_COLUMN_VIEW_STORAGE_KEY
    );
    if (!savedColumnView) {
      return;
    }

    try {
      const parsedColumnOrder = JSON.parse(savedColumnView) as unknown;
      setColumnOrder(normalizeDashboardColumnOrder(parsedColumnOrder));
    } catch {
      setColumnOrder(DEFAULT_DASHBOARD_COLUMN_ORDER);
    }
  }, []);

  useEffect(() => {
    const existingIds = new Set(blogs.map((blog) => blog.id));
    setSelectedBlogIds((previous) => previous.filter((id) => existingIds.has(id)));
  }, [blogs]);

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
        label: WRITER_STATUS_FILTER_LABELS[status],
      })),
    []
  );

  const publisherStatusFilterOptions = useMemo(
    () =>
      PUBLISHER_STATUSES.map((status) => ({
        value: status,
        label: PUBLISHER_STATUS_FILTER_LABELS[status],
      })),
    []
  );
  const filteredBlogs = useMemo(() => {
    return blogs.filter((blog) => {
      const matchesSearch = blog.title
        .toLowerCase()
        .includes(search.toLowerCase().trim());
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

  const publishDelaySummary = useMemo(() => {
    const delays = blogs
      .map((blog) => {
        const scheduledDate = getBlogScheduledDate(blog);
        const actualPublishedAt = blog.actual_published_at ?? blog.published_at;
        if (!scheduledDate || !actualPublishedAt) {
          return null;
        }
        return Math.floor(
          (new Date(actualPublishedAt).getTime() -
            new Date(`${scheduledDate}T00:00:00Z`).getTime()) /
            (24 * 60 * 60 * 1000)
        );
      })
      .filter((value): value is number => value !== null);

    const averageDelayDays =
      delays.length === 0
        ? null
        : Number((delays.reduce((sum, value) => sum + value, 0) / delays.length).toFixed(1));
    return {
      trackedCount: delays.length,
      averageDelayDays,
    };
  }, [blogs]);

  const visibleBlogIds = useMemo(() => pagedBlogs.map((blog) => blog.id), [pagedBlogs]);
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

  const saveColumnView = () => {
    if (typeof window === "undefined") {
      return;
    }
    window.localStorage.setItem(
      DASHBOARD_COLUMN_VIEW_STORAGE_KEY,
      JSON.stringify(columnOrder)
    );
    setError(null);
    setSuccessMessage("Column view saved.");
  };

  const resetColumnView = () => {
    setColumnOrder(DEFAULT_DASHBOARD_COLUMN_ORDER);
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(DASHBOARD_COLUMN_VIEW_STORAGE_KEY);
    }
    setError(null);
    setSuccessMessage("Column view reset to default.");
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
    if (!ensureBulkSelection()) {
      return;
    }
    if (!confirm(`Delete ${selectedBlogIds.length} selected blog(s)? This cannot be undone.`)) {
      return;
    }

    await runBulkMutation(async () => {
      const supabase = getSupabaseBrowserClient();
      const { error: deleteError } = await supabase
        .from("blogs")
        .delete()
        .in("id", selectedBlogIds);
      if (deleteError) {
        throw new Error(deleteError.message);
      }
      return `Deleted ${selectedBlogIds.length} blog(s).`;
    });
  };

  return (
    <ProtectedPage>
      <AppShell>
        <div className="space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">Dashboard</h2>
              <p className="text-sm text-slate-600">
                Track assignments, writing progress, and publishing readiness.
              </p>
            </div>

            {profile?.role === "admin" ? (
              <button
                type="button"
                className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700"
                onClick={() => {
                  router.push("/blogs/new");
                }}
              >
                Add Blog
              </button>
            ) : null}
          </div>

          <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-5">
            <input
              type="search"
              placeholder="Search title..."
              className="rounded-md border border-slate-300 px-3 py-2 text-sm"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
              }}
            />

            <CheckboxMultiSelect
              label="Sites"
              options={siteFilterOptions}
              selectedValues={siteFilters}
              onChange={(nextValues) => {
                setSiteFilters(nextValues as BlogSite[]);
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

            <select
              className="rounded-md border border-slate-300 px-3 py-2 text-sm"
              value={sortField}
              onChange={(event) => {
                setSortField(event.target.value as DashboardSortField);
              }}
            >
              {DASHBOARD_SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  Sort: {option.label}
                </option>
              ))}
            </select>

            <select
              className="rounded-md border border-slate-300 px-3 py-2 text-sm"
              value={sortDirection}
              onChange={(event) => {
                setSortDirection(event.target.value as SortDirection);
              }}
            >
              <option value="asc">Sort Direction: Ascending</option>
              <option value="desc">Sort Direction: Descending</option>
            </select>

          </section>
          <section className="grid gap-3 sm:grid-cols-2">
            <article className="rounded-md border border-slate-200 bg-slate-50 px-3 py-3">
              <p className="text-xs uppercase tracking-wide text-slate-500">
                Published With Delay Data
              </p>
              <p className="mt-1 text-lg font-semibold text-slate-900">
                {publishDelaySummary.trackedCount}
              </p>
            </article>
            <article className="rounded-md border border-slate-200 bg-slate-50 px-3 py-3">
              <p className="text-xs uppercase tracking-wide text-slate-500">
                Average Publish Delay (Days)
              </p>
              <p className="mt-1 text-lg font-semibold text-slate-900">
                {publishDelaySummary.averageDelayDays ?? "—"}
              </p>
            </article>
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

          {isAdmin && selectedBlogIds.length > 0 ? (
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
                  className="rounded-md border border-slate-300 px-3 py-2 text-sm"
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
                  className="rounded-md border border-slate-300 px-3 py-2 text-sm"
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
                  className="rounded-md border border-slate-300 px-3 py-2 text-sm"
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
                  className="rounded-md border border-slate-300 px-3 py-2 text-sm"
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
              </div>
            </section>
          ) : null}

          {isLoading ? (
            <p className="rounded-md border border-slate-200 bg-slate-50 px-4 py-5 text-sm text-slate-500">
              Loading blogs…
            </p>
          ) : (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                <TableResultsSummary
                  totalRows={sortedBlogs.length}
                  currentPage={currentPage}
                  rowLimit={rowLimit}
                  noun="blogs"
                />
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
              </div>

              <section className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-3">
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
                <div className="mt-2 flex flex-wrap gap-2">
                  {columnOrder.map((column, index) => (
                    <div
                      key={column}
                      className="inline-flex items-center gap-1 rounded border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700"
                    >
                      <span className="font-medium">{DASHBOARD_COLUMN_LABELS[column]}</span>
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
                  ))}
                </div>
                <p className="mt-2 text-xs text-slate-500">
                  Move columns and save to keep this layout.
                </p>
              </section>

              <div className="overflow-x-auto rounded-lg border border-slate-200">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead className="bg-slate-100 text-left text-xs uppercase tracking-wide text-slate-600">
                    <tr>
                      {isAdmin ? (
                        <th className="px-3 py-2">
                          <input
                            type="checkbox"
                            checked={allVisibleSelected}
                            onChange={(event) => {
                              handleToggleAllVisible(event.target.checked);
                            }}
                          />
                        </th>
                      ) : null}
                      {columnOrder.map((column) => (
                        <th key={column} className="px-3 py-2">
                          {DASHBOARD_COLUMN_LABELS[column]}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {sortedBlogs.length === 0 ? (
                      <tr>
                        <td
                          className="px-3 py-5 text-center text-slate-500"
                          colSpan={columnOrder.length + (isAdmin ? 1 : 0)}
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

                        return (
                          <tr
                            key={blog.id}
                            className="cursor-pointer hover:bg-slate-50"
                            onClick={() => {
                              router.push(`/blogs/${blog.id}`);
                            }}
                          >
                            {isAdmin ? (
                              <td
                                className="px-3 py-2"
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
                            {columnOrder.map((column) => {
                              if (column === "title") {
                                return (
                                  <td
                                    key={column}
                                    className="px-3 py-2 font-medium text-slate-900"
                                  >
                                    {blog.title}
                                  </td>
                                );
                              }

                              if (column === "site") {
                                return (
                                  <td key={column} className="px-3 py-2 text-slate-600">
                                    {blog.site}
                                  </td>
                                );
                              }

                              if (column === "writer") {
                                return (
                                  <td key={column} className="px-3 py-2 text-slate-600">
                                    {blog.writer?.full_name ?? "Unassigned"}
                                  </td>
                                );
                              }

                              if (column === "writer_status") {
                                return (
                                  <td key={column} className="px-3 py-2 text-slate-600">
                                    {toTitleCase(blog.writer_status)}
                                  </td>
                                );
                              }

                              if (column === "publisher") {
                                return (
                                  <td key={column} className="px-3 py-2 text-slate-600">
                                    {blog.publisher?.full_name ?? "Unassigned"}
                                  </td>
                                );
                              }

                              if (column === "publisher_status") {
                                return (
                                  <td key={column} className="px-3 py-2 text-slate-600">
                                    {toTitleCase(blog.publisher_status)}
                                  </td>
                                );
                              }

                              if (column === "overall_status") {
                                return (
                                  <td key={column} className="px-3 py-2">
                                    <div className="flex items-center gap-2">
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
                                    </div>
                                  </td>
                                );
                              }

                              return (
                                <td key={column} className="px-3 py-2 text-slate-600">
                                  {formatDateInput(displayPublishDate) || "—"}
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
            </div>
          )}
        </div>
      </AppShell>
    </ProtectedPage>
  );
}
