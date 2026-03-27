"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { formatDistanceToNow } from "date-fns";

import { AppShell } from "@/components/app-shell";
import { Button, buttonClass } from "@/components/button";
import { ExternalLink } from "@/components/external-link";
import { PublisherStatusBadge, WriterStatusBadge } from "@/components/status-badge";
import {
  DataPageEmptyState,
  DataPageFilterPills,
  DataPageHeader,
  DATA_PAGE_STACK_CLASS,
  DataPageToolbar,
} from "@/components/data-page";
import { ProtectedPage } from "@/components/protected-page";
import {
  BLOG_SELECT_LEGACY_WITH_RELATIONS,
  BLOG_SELECT_WITH_DATES_WITH_RELATIONS,
  getBlogPublishDate,
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
import { getSiteShortLabel } from "@/lib/site";
import { SITES } from "@/lib/status";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import { AppIcon } from "@/lib/icons";
import type {
  BlogRecord,
  BlogSite,
  ProfileRecord,
  PublisherStageStatus,
  WriterStageStatus,
} from "@/lib/types";
import { formatDisplayDate } from "@/lib/utils";
import { useAuth } from "@/providers/auth-provider";
import { useSystemFeedback } from "@/providers/system-feedback-provider";

type BoardStage = "idea" | "writing" | "reviewing" | "publishing" | "published";
type BoardStageFilter = "all" | BoardStage;
type ProductFilter = "all" | "sighthound" | "redactor";
type WebsiteFilter = "all" | BlogSite;
type AuthorFilter = "all" | string;

type StageUpdatePayload = {
  writer_status: WriterStageStatus;
  publisher_status: PublisherStageStatus;
};

const BOARD_STAGES: BoardStage[] = [
  "idea",
  "writing",
  "reviewing",
  "publishing",
  "published",
];

const BOARD_STAGE_LABELS: Record<BoardStage, string> = {
  idea: "Idea",
  writing: "Writing",
  reviewing: "Reviewing",
  publishing: "Publishing",
  published: "Published",
};

const BOARD_WIP_LIMITS: Partial<Record<BoardStage, number>> = {
  writing: 6,
};

const PRODUCT_FILTER_OPTIONS: Array<{ value: ProductFilter; label: string }> = [
  { value: "all", label: "All Products" },
  { value: "sighthound", label: "Sighthound" },
  { value: "redactor", label: "Redactor" },
];

const WEBSITE_FILTER_OPTIONS: Array<{ value: WebsiteFilter; label: string }> = [
  { value: "all", label: "All Websites" },
  { value: "sighthound.com", label: "SH" },
  { value: "redactor.com", label: "RED" },
];

const STATUS_FILTER_OPTIONS: Array<{ value: BoardStageFilter; label: string }> = [
  { value: "all", label: "All Stages" },
  { value: "idea", label: "Idea" },
  { value: "writing", label: "Writing" },
  { value: "reviewing", label: "Reviewing" },
  { value: "publishing", label: "Publishing" },
  { value: "published", label: "Published" },
];

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

function getProductFromSite(site: BlogSite): ProductFilter {
  return site === "redactor.com" ? "redactor" : "sighthound";
}

function getProductLabel(site: BlogSite) {
  return site === "redactor.com" ? "Redactor" : "Sighthound";
}

function getBoardStage(blog: BlogRecord): BoardStage {
  if (blog.publisher_status === "completed" || blog.overall_status === "published") {
    return "published";
  }
  if (blog.writer_status === "not_started") {
    return "idea";
  }
  if (blog.writer_status === "in_progress") {
    return "writing";
  }
  if (blog.writer_status === "needs_revision") {
    return "reviewing";
  }
  return "publishing";
}

function formatPublishedDate(blog: BlogRecord) {
  const dateValue = blog.display_published_date ?? getBlogPublishDate(blog);
  return formatDisplayDate(dateValue) || "—";
}

function formatUpdatedDistance(isoValue: string | null | undefined) {
  if (!isoValue) {
    return "Unknown";
  }
  const parsed = new Date(isoValue);
  if (Number.isNaN(parsed.getTime())) {
    return "Unknown";
  }
  return formatDistanceToNow(parsed, { addSuffix: true });
}

function getAuthorLabel(blog: BlogRecord) {
  return blog.writer?.full_name?.trim() || "Unassigned";
}

function getStageUpdatePayload(blog: BlogRecord, targetStage: BoardStage): StageUpdatePayload {
  if (targetStage === "idea") {
    return {
      writer_status: "not_started",
      publisher_status: "not_started",
    };
  }

  if (targetStage === "writing") {
    return {
      writer_status: "in_progress",
      publisher_status: "not_started",
    };
  }

  if (targetStage === "reviewing") {
    return {
      writer_status: "needs_revision",
      publisher_status: "not_started",
    };
  }

  if (targetStage === "publishing") {
    return {
      writer_status: "completed",
      publisher_status:
        blog.publisher_status === "completed" ? "in_progress" : blog.publisher_status,
    };
  }

  return {
    writer_status: "completed",
    publisher_status: "completed",
  };
}

export default function BlogCardBoardPage() {
  const router = useRouter();
  const { hasPermission, user } = useAuth();
  const { showSaving, showSuccess, showError, updateStatus } = useSystemFeedback();
  const permissionContract = useMemo(
    () => createUiPermissionContract(hasPermission),
    [hasPermission]
  );

  const canCreateBlogs = permissionContract.canCreateBlog;
  const canAssignWriter = permissionContract.canChangeWriterAssignment;

  const [blogs, setBlogs] = useState<BlogRecord[]>([]);
  const [authors, setAuthors] = useState<ProfileRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [productFilter, setProductFilter] = useState<ProductFilter>("all");
  const [authorFilter, setAuthorFilter] = useState<AuthorFilter>("all");
  const [websiteFilter, setWebsiteFilter] = useState<WebsiteFilter>("all");
  const [statusFilter, setStatusFilter] = useState<BoardStageFilter>("all");

  const [draggingBlogId, setDraggingBlogId] = useState<string | null>(null);
  const [dragOverStage, setDragOverStage] = useState<BoardStage | null>(null);

  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [quickAddTitle, setQuickAddTitle] = useState("");
  const [quickAddSite, setQuickAddSite] = useState<BlogSite>("sighthound.com");
  const [quickAddAuthorId, setQuickAddAuthorId] = useState("");
  const [isCreatingIdea, setIsCreatingIdea] = useState(false);

  const loadBoardData = useCallback(async () => {
    const supabase = getSupabaseBrowserClient();
    setIsLoading(true);
    setError(null);

    const [{ data: usersData, error: usersError }, blogsResponse] = await Promise.all([
      supabase.from("profiles").select("*").eq("is_active", true).order("full_name", {
        ascending: true,
      }),
      supabase
        .from("blogs")
        .select(BLOG_SELECT_WITH_DATES_WITH_RELATIONS)
        .eq("is_archived", false)
        .order("updated_at", { ascending: false }),
    ]);

    if (usersError) {
      console.error("Load users failed:", usersError);
      setError("Couldn't load team members. Please try again.");
      setIsLoading(false);
      return;
    }

    let blogsData = blogsResponse.data;
    let blogsError = blogsResponse.error;

    if (isMissingBlogDateColumnsError(blogsError)) {
      const fallback = await supabase
        .from("blogs")
        .select(BLOG_SELECT_LEGACY_WITH_RELATIONS)
        .eq("is_archived", false)
        .order("updated_at", { ascending: false });
      blogsData = fallback.data as typeof blogsData;
      blogsError = fallback.error;
    }

    if (blogsError) {
      console.error("Blogs load failed:", blogsError);
      setError("Couldn't load blogs. Please try again.");
      setIsLoading(false);
      return;
    }

    setAuthors((usersData ?? []) as ProfileRecord[]);
    setBlogs(normalizeBlogRows((blogsData ?? []) as Array<Record<string, unknown>>) as BlogRecord[]);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    void loadBoardData();
  }, [loadBoardData]);

  useEffect(() => {
    if (!error) {
      return;
    }
    showError(error);
  }, [error, showError]);

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
        productFilter !== "all"
          ? {
              id: "product",
              label: `Product: ${
                PRODUCT_FILTER_OPTIONS.find((option) => option.value === productFilter)?.label ??
                productFilter
              }`,
              onRemove: () => {
                setProductFilter("all");
              },
            }
          : null,
        authorFilter !== "all"
          ? {
              id: "author",
              label: `Author: ${
                authors.find((author) => author.id === authorFilter)?.full_name ?? "Unknown"
              }`,
              onRemove: () => {
                setAuthorFilter("all");
              },
            }
          : null,
        websiteFilter !== "all"
          ? {
              id: "website",
              label: `Website: ${
                WEBSITE_FILTER_OPTIONS.find((option) => option.value === websiteFilter)?.label ??
                websiteFilter
              }`,
              onRemove: () => {
                setWebsiteFilter("all");
              },
            }
          : null,
        statusFilter !== "all"
          ? {
              id: "status",
              label: `Status: ${
                STATUS_FILTER_OPTIONS.find((option) => option.value === statusFilter)?.label ??
                statusFilter
              }`,
              onRemove: () => {
                setStatusFilter("all");
              },
            }
          : null,
      ].filter((pill) => pill !== null),
    [authorFilter, authors, productFilter, searchQuery, statusFilter, websiteFilter]
  );

  const filteredBlogs = useMemo(() => {
    const normalizedSearch = searchQuery.trim().toLowerCase();

    return blogs.filter((blog) => {
      const stage = getBoardStage(blog);
      const product = getProductFromSite(blog.site);

      if (statusFilter !== "all" && stage !== statusFilter) {
        return false;
      }

      if (productFilter !== "all" && product !== productFilter) {
        return false;
      }

      if (authorFilter !== "all" && blog.writer_id !== authorFilter) {
        return false;
      }

      if (websiteFilter !== "all" && blog.site !== websiteFilter) {
        return false;
      }

      if (normalizedSearch.length > 0) {
        const titleText = blog.title.toLowerCase();
        const liveUrlText = (blog.live_url ?? "").toLowerCase();
        const documentText = (blog.google_doc_url ?? "").toLowerCase();
        if (
          !titleText.includes(normalizedSearch) &&
          !liveUrlText.includes(normalizedSearch) &&
          !documentText.includes(normalizedSearch)
        ) {
          return false;
        }
      }

      return true;
    });
  }, [authorFilter, blogs, productFilter, searchQuery, statusFilter, websiteFilter]);

  const groupedBlogs = useMemo(() => {
    const grouped = {
      idea: [] as BlogRecord[],
      writing: [] as BlogRecord[],
      reviewing: [] as BlogRecord[],
      publishing: [] as BlogRecord[],
      published: [] as BlogRecord[],
    };

    for (const blog of filteredBlogs) {
      grouped[getBoardStage(blog)].push(blog);
    }

    for (const stage of BOARD_STAGES) {
      grouped[stage].sort((left, right) => {
        if (stage === "published") {
          const leftDate = getBlogPublishDate(left) ?? "";
          const rightDate = getBlogPublishDate(right) ?? "";
          return rightDate.localeCompare(leftDate);
        }
        const leftUpdated = left.updated_at ?? "";
        const rightUpdated = right.updated_at ?? "";
        return rightUpdated.localeCompare(leftUpdated);
      });
    }

    return grouped;
  }, [filteredBlogs]);

  const resetFilters = useCallback(() => {
    setSearchQuery("");
    setProductFilter("all");
    setAuthorFilter("all");
    setWebsiteFilter("all");
    setStatusFilter("all");
  }, []);
  useEffect(() => {
    const handlePaletteAction = (event: Event) => {
      const actionId = (event as CustomEvent<{ actionId?: string }>).detail?.actionId;
      if (actionId === "clear_all_filters") {
        resetFilters();
      }
    };
    window.addEventListener("command-palette-action", handlePaletteAction as EventListener);
    return () => {
      window.removeEventListener(
        "command-palette-action",
        handlePaletteAction as EventListener
      );
    };
  }, [resetFilters]);

  const copyValue = useCallback(
    async (value: string, successMessage: string) => {
      if (!value) {
        showError("Nothing to copy.");
        return;
      }

      try {
        await navigator.clipboard.writeText(value);
        showSuccess(successMessage);
      } catch {
        showError("Could not copy to clipboard.");
      }
    },
    [showError, showSuccess]
  );

  const validateStageMove = useCallback(
    (blog: BlogRecord, targetStage: BoardStage) => {
      const nextPayload = getStageUpdatePayload(blog, targetStage);

      if (
        nextPayload.writer_status !== blog.writer_status &&
        !canTransitionWriterStatus(blog.writer_status, nextPayload.writer_status, hasPermission)
      ) {
        return "You do not have permission for that writing stage transition.";
      }

      if (
        nextPayload.publisher_status !== blog.publisher_status &&
        !canTransitionPublisherStatus(
          blog.publisher_status,
          nextPayload.publisher_status,
          hasPermission
        )
      ) {
        return "You do not have permission for that publishing stage transition.";
      }

      if (nextPayload.writer_status !== "not_started" && !blog.writer_id) {
        return "Assign an author before moving this card out of Idea.";
      }

      if (nextPayload.writer_status === "completed" && !blog.google_doc_url?.trim()) {
        return "A Google Doc URL is required before moving to Publishing or Published.";
      }

      if (nextPayload.publisher_status !== "not_started" && !blog.publisher_id) {
        return "Assign a publisher before moving this card into active publishing.";
      }

      if (nextPayload.publisher_status === "completed" && !blog.live_url?.trim()) {
        return "A live URL is required before moving a blog to Published.";
      }

      return null;
    },
    [hasPermission]
  );

  const moveBlogToStage = useCallback(
    async (blog: BlogRecord, targetStage: BoardStage) => {
      const nextPayload = getStageUpdatePayload(blog, targetStage);
      if (
        nextPayload.writer_status === blog.writer_status &&
        nextPayload.publisher_status === blog.publisher_status
      ) {
        return;
      }

      const validationError = validateStageMove(blog, targetStage);
      if (validationError) {
        showError(validationError);
        return;
      }

      const statusId = showSaving("Updating stage…");
      const supabase = getSupabaseBrowserClient();

      let { data, error: updateError } = await supabase
        .from("blogs")
        .update(nextPayload)
        .eq("id", blog.id)
        .select(BLOG_SELECT_WITH_DATES_WITH_RELATIONS)
        .single();

      if (isMissingBlogDateColumnsError(updateError)) {
        const fallback = await supabase
          .from("blogs")
          .update(nextPayload)
          .eq("id", blog.id)
          .select(BLOG_SELECT_LEGACY_WITH_RELATIONS)
          .single();
        data = fallback.data as typeof data;
        updateError = fallback.error;
      }

      if (updateError) {
        updateStatus(statusId, { type: "error", message: updateError.message });
        return;
      }

      const nextBlog = normalizeBlogRow((data ?? {}) as Record<string, unknown>) as BlogRecord;
      setBlogs((previous) =>
        previous.map((candidate) => (candidate.id === blog.id ? nextBlog : candidate))
      );
      updateStatus(statusId, {
        type: "success",
        message: `Status updated to ${BOARD_STAGE_LABELS[targetStage]}.`,
      });
    },
    [showError, showSaving, updateStatus, validateStageMove]
  );

  const handleDropOnStage = async (targetStage: BoardStage) => {
    if (!draggingBlogId) {
      return;
    }

    const draggedBlog = blogs.find((blog) => blog.id === draggingBlogId);
    if (!draggedBlog) {
      setDraggingBlogId(null);
      setDragOverStage(null);
      return;
    }

    setDraggingBlogId(null);
    setDragOverStage(null);
    await moveBlogToStage(draggedBlog, targetStage);
  };

  const handleQuickAddIdea = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!canCreateBlogs) {
      showError("You do not have permission to create blogs.");
      return;
    }
    if (!quickAddTitle.trim()) {
      showError("Title is required.");
      return;
    }
    if (!user?.id) {
      showError("You must be logged in.");
      return;
    }
    if (quickAddAuthorId && !canAssignWriter) {
      showError("You do not have permission to assign an author.");
      return;
    }

    setIsCreatingIdea(true);
    const supabase = getSupabaseBrowserClient();
    const generatedSlug = slugify(quickAddTitle) || `blog-${Date.now()}`;

    const payload = {
      title: quickAddTitle.trim(),
      slug: generatedSlug,
      site: quickAddSite,
      writer_id: canAssignWriter ? quickAddAuthorId || null : null,
      publisher_id: null,
      writer_status: "not_started" as WriterStageStatus,
      publisher_status: "not_started" as PublisherStageStatus,
      created_by: user.id,
    };

    let { data, error: insertError } = await supabase
      .from("blogs")
      .insert(payload)
      .select(BLOG_SELECT_WITH_DATES_WITH_RELATIONS)
      .single();

    if (isMissingBlogDateColumnsError(insertError)) {
      const fallback = await supabase
        .from("blogs")
        .insert(payload)
        .select(BLOG_SELECT_LEGACY_WITH_RELATIONS)
        .single();
      data = fallback.data as typeof data;
      insertError = fallback.error;
    }

    if (insertError) {
      showError(insertError.message);
      setIsCreatingIdea(false);
      return;
    }

    const createdBlog = normalizeBlogRow((data ?? {}) as Record<string, unknown>) as BlogRecord;
    setBlogs((previous) => [createdBlog, ...previous]);
    setQuickAddTitle("");
    setQuickAddSite("sighthound.com");
    setQuickAddAuthorId("");
    setIsQuickAddOpen(false);
    setIsCreatingIdea(false);
    showSuccess("New blog idea created.");
  };

  const handleOpenTableForStage = (stage: BoardStage) => {
    router.push(`/blogs?boardStage=${stage}`);
  };

  const hasNoResults = !isLoading && filteredBlogs.length === 0;

  return (
    <ProtectedPage requiredPermissions={["view_dashboard"]}>
      <AppShell>
        <div className={DATA_PAGE_STACK_CLASS}>
          <nav
            aria-label="Breadcrumb"
            className="flex flex-wrap items-center gap-1 text-xs text-slate-500"
          >
            <Link href="/dashboard" className="hover:text-slate-700">
              Dashboard
            </Link>
            <span>/</span>
            <Link href="/blogs" className="hover:text-slate-700">
              Blogs
            </Link>
            <span>/</span>
            <span className="text-slate-700">CardBoard</span>
          </nav>
          <DataPageHeader
            title="CardBoard"
            description="Pipeline board for team-wide blog stage visibility and movement."
            primaryAction={
              <div className="flex flex-wrap items-center justify-end gap-2">
                <div className={`${SEGMENTED_CONTROL_CLASS} text-sm`}>
                  <Link
                    href="/blogs"
                    className={segmentedControlItemClass({ isActive: false })}
                  >
                    Table View
                  </Link>
                  <span className={segmentedControlItemClass({ isActive: true })}>
                    Pipeline View
                  </span>
                </div>
              </div>
            }
          />

          <DataPageToolbar
            searchValue={searchQuery}
            onSearchChange={setSearchQuery}
            searchPlaceholder="Search blog title, document URL, or live URL"
            filters={
              <>
                <select
                  aria-label="Product"
                  value={productFilter}
                  onChange={(event) => {
                    setProductFilter(event.target.value as ProductFilter);
                  }}
                  className="focus-field w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700"
                >
                  {PRODUCT_FILTER_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <select
                  aria-label="Author"
                  value={authorFilter}
                  onChange={(event) => {
                    setAuthorFilter(event.target.value as AuthorFilter);
                  }}
                  className="focus-field w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700"
                >
                  <option value="all">All Authors</option>
                  {authors.map((author) => (
                    <option key={author.id} value={author.id}>
                      {author.full_name}
                    </option>
                  ))}
                </select>
                <select
                  aria-label="Website"
                  value={websiteFilter}
                  onChange={(event) => {
                    setWebsiteFilter(event.target.value as WebsiteFilter);
                  }}
                  className="focus-field w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700"
                >
                  {WEBSITE_FILTER_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <select
                  aria-label="Status"
                  value={statusFilter}
                  onChange={(event) => {
                    setStatusFilter(event.target.value as BoardStageFilter);
                  }}
                  className="focus-field w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700"
                >
                  {STATUS_FILTER_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </>
            }
            actions={
              <Button
                type="button"
                onClick={resetFilters}
                variant="secondary"
                size="sm"
              >
                Clear all filters
              </Button>
            }
          />
          <DataPageFilterPills pills={activeFilterPills} />


          <section className="rounded-lg border border-slate-200 bg-white p-3">
            <div className="overflow-x-auto pb-1">
              <div className="flex min-w-max gap-4">
                {BOARD_STAGES.map((stage) => {
                  const stageBlogs = groupedBlogs[stage];
                  const wipLimit = BOARD_WIP_LIMITS[stage];
                  const isDropTarget = dragOverStage === stage;

                  return (
                    <div
                      key={stage}
                      className={`w-[300px] shrink-0 rounded-xl border bg-slate-50 p-3 transition ${
                        isDropTarget
                          ? "border-blue-300 ring-2 ring-blue-200"
                          : "border-slate-200"
                      }`}
                      onDragOver={(event) => {
                        event.preventDefault();
                        setDragOverStage(stage);
                      }}
                      onDragLeave={() => {
                        setDragOverStage((previous) => (previous === stage ? null : previous));
                      }}
                      onDrop={(event) => {
                        event.preventDefault();
                        void handleDropOnStage(stage);
                      }}
                    >
                      <div className="sticky top-0 z-10 -mx-3 -mt-3 mb-3 rounded-t-xl border-b border-slate-200 bg-slate-100 px-3 py-2">
                        <button
                          type="button"
                          className="w-full text-left"
                          onClick={() => {
                            handleOpenTableForStage(stage);
                          }}
                        >
                          <p className="text-sm font-semibold text-slate-900">
                            {BOARD_STAGE_LABELS[stage]}{" "}
                            <span className="text-slate-500">({stageBlogs.length})</span>
                            {wipLimit ? (
                              <span className="ml-1 text-xs font-medium text-slate-500">
                                / {wipLimit}
                              </span>
                            ) : null}
                          </p>
                          <p className="text-[11px] uppercase tracking-wide text-slate-500">
                            Open table view
                          </p>
                        </button>
                      </div>
                      {stage === "idea" && canCreateBlogs ? (
                        <div className="mb-3">
                          {isQuickAddOpen ? (
                            <form
                              className="space-y-2 rounded-lg border border-slate-200 bg-white p-3"
                              onSubmit={handleQuickAddIdea}
                            >
                              <label className="space-y-1 text-[11px] font-medium uppercase tracking-wide text-slate-500">
                                Title
                                <input
                                  value={quickAddTitle}
                                  onChange={(event) => {
                                    setQuickAddTitle(event.target.value);
                                  }}
                                  placeholder="Campus ALPR Privacy Concerns"
                                  className="focus-field w-full rounded-md border border-slate-300 bg-white px-2.5 py-2 text-sm font-normal normal-case tracking-normal text-slate-700"
                                />
                              </label>
                              <label className="space-y-1 text-[11px] font-medium uppercase tracking-wide text-slate-500">
                                Product
                                <select
                                  value={quickAddSite}
                                  onChange={(event) => {
                                    setQuickAddSite(event.target.value as BlogSite);
                                  }}
                                  className="focus-field w-full rounded-md border border-slate-300 bg-white px-2.5 py-2 text-sm font-normal normal-case tracking-normal text-slate-700"
                                >
                                  {SITES.map((site) => (
                                    <option key={site} value={site}>
                                      {getProductLabel(site)}
                                    </option>
                                  ))}
                                </select>
                              </label>
                              <label className="space-y-1 text-[11px] font-medium uppercase tracking-wide text-slate-500">
                                Author
                                <select
                                  value={quickAddAuthorId}
                                  disabled={!canAssignWriter}
                                  onChange={(event) => {
                                    setQuickAddAuthorId(event.target.value);
                                  }}
                                  className="focus-field w-full rounded-md border border-slate-300 bg-white px-2.5 py-2 text-sm font-normal normal-case tracking-normal text-slate-700 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500"
                                >
                                  <option value="">Unassigned</option>
                                  {authors.map((author) => (
                                    <option key={author.id} value={author.id}>
                                      {author.full_name}
                                    </option>
                                  ))}
                                </select>
                              </label>
                              <div className="flex items-center justify-end gap-2 pt-1">
                                <Button
                                  type="button"
                                  variant="secondary"
                                  size="xs"
                                  onClick={() => {
                                    setIsQuickAddOpen(false);
                                  }}
                                >
                                  Cancel
                                </Button>
                                <Button
                                  type="submit"
                                  disabled={isCreatingIdea}
                                  variant="primary"
                                  size="xs"
                                >
                                  {isCreatingIdea ? "Creating…" : "Create"}
                                </Button>
                              </div>
                            </form>
                          ) : (
                            <Button
                              type="button"
                              variant="secondary"
                              size="sm"
                              className="w-full border-dashed"
                              onClick={() => {
                                setIsQuickAddOpen(true);
                              }}
                            >
                              New Blog Idea
                            </Button>
                          )}
                        </div>
                      ) : null}

                      <div className="max-h-[65vh] space-y-3 overflow-y-auto pr-1">
                        {isLoading ? (
                          Array.from({ length: 3 }).map((_, index) => (
                            <div
                              key={`${stage}-skeleton-${index}`}
                              className="skeleton h-28 rounded-lg"
                            />
                          ))
                        ) : stageBlogs.length === 0 ? (
                          <p className="rounded-lg border border-dashed border-slate-300 bg-white px-3 py-4 text-center text-xs text-slate-500">
                            No blogs in this stage.
                          </p>
                        ) : (
                          stageBlogs.map((blog) => {
                            const isPublishedStage = stage === "published";
                            const productLabel = getProductLabel(blog.site);

                            return (
                              <article
                                key={blog.id}
                                draggable
                                onDragStart={(event) => {
                                  setDraggingBlogId(blog.id);
                                  event.dataTransfer.effectAllowed = "move";
                                }}
                                onDragEnd={() => {
                                  setDraggingBlogId(null);
                                  setDragOverStage(null);
                                }}
                                className="group relative rounded-lg border border-slate-200 bg-white p-3 shadow-sm transition hover:shadow"
                              >
                                <div className="absolute right-2 top-2 flex items-center gap-1 opacity-0 transition group-hover:opacity-100">
                                  {isPublishedStage ? (
                                    <>
                                      {blog.live_url ? (
                                        <ExternalLink
                                          href={blog.live_url}
                                          className={buttonClass({
                                            variant: "icon",
                                            size: "icon",
                                          })}
                                          aria-label="Open blog"
                                        >
                                          <AppIcon
                                            name="externalLink"
                                            boxClassName="h-4 w-4"
                                            size={13}
                                          />
                                        </ExternalLink>
                                      ) : null}
                                      <Button
                                        type="button"
                                        variant="icon"
                                        size="icon"
                                        aria-label="Copy blog URL"
                                        onClick={() => {
                                          void copyValue(blog.live_url ?? "", "Copied URL.");
                                        }}
                                      >
                                        <AppIcon name="link" boxClassName="h-4 w-4" size={13} />
                                      </Button>
                                      <Button
                                        type="button"
                                        className="pressable rounded border border-slate-300 bg-white px-1.5 py-0.5 text-[11px] text-slate-600 hover:bg-slate-100"
                                        aria-label="Copy blog title"
                                        onClick={() => {
                                          void copyValue(blog.title, "Copied title.");
                                        }}
                                      >
                                        <AppIcon name="copy" boxClassName="h-4 w-4" size={13} />
                                      </Button>
                                    </>
                                  ) : (
                                    <>
                                      <Link
                                        href={`/blogs/${blog.id}`}
                                        className={buttonClass({
                                          variant: "icon",
                                          size: "icon",
                                        })}
                                        aria-label="Edit blog"
                                      >
                                        <AppIcon name="edit" boxClassName="h-4 w-4" size={13} />
                                      </Link>
                                      {blog.google_doc_url ? (
                                        <ExternalLink
                                          href={blog.google_doc_url}
                                          className={buttonClass({
                                            variant: "icon",
                                            size: "icon",
                                          })}
                                          aria-label="Open document"
                                        >
                                          <AppIcon name="file" boxClassName="h-4 w-4" size={13} />
                                        </ExternalLink>
                                      ) : null}
                                      <Button
                                        type="button"
                                        className="pressable rounded border border-slate-300 bg-white px-1.5 py-0.5 text-[11px] text-slate-600 hover:bg-slate-100"
                                        aria-label="Copy blog title"
                                        onClick={() => {
                                          void copyValue(blog.title, "Copied title.");
                                        }}
                                      >
                                        <AppIcon name="copy" boxClassName="h-4 w-4" size={13} />
                                      </Button>
                                      <Button
                                        type="button"
                                        className="pressable rounded border border-slate-300 bg-white px-1.5 py-0.5 text-[11px] text-slate-600 hover:bg-slate-100"
                                        aria-label="Copy blog URL"
                                        onClick={() => {
                                          void copyValue(blog.live_url ?? "", "Copied URL.");
                                        }}
                                      >
                                        <AppIcon name="link" boxClassName="h-4 w-4" size={13} />
                                      </Button>
                                      <Link
                                        href={`/blogs/${blog.id}`}
                                        className={buttonClass({
                                          variant: "icon",
                                          size: "icon",
                                        })}
                                        aria-label="More options"
                                      >
                                        <AppIcon name="more" boxClassName="h-4 w-4" size={13} />
                                      </Link>
                                    </>
                                  )}
                                </div>

                                <h3 className="max-w-[92%] line-clamp-2 text-sm font-semibold text-slate-900">
                                  {blog.title}
                                </h3>
                                {isPublishedStage ? (
                                  <div className="mt-2 space-y-1 text-xs text-slate-600">
                                    <p>
                                      <span className="font-medium text-slate-700">Published:</span>{" "}
                                      {formatPublishedDate(blog)}
                                    </p>
                                    <p>
                                      <span className="font-medium text-slate-700">Website:</span>{" "}
                                      {getSiteShortLabel(blog.site)}
                                    </p>
                                  </div>
                                ) : (
                                  <div className="mt-2 space-y-1 text-xs text-slate-600">
                                    <p>
                                      <span className="font-medium text-slate-700">Product:</span>{" "}
                                      {productLabel}
                                    </p>
                                    <p>
                                      <span className="font-medium text-slate-700">Author:</span>{" "}
                                      {getAuthorLabel(blog)}
                                    </p>
                                    <p>
                                      <span className="font-medium text-slate-700">Updated:</span>{" "}
                                      {formatUpdatedDistance(blog.updated_at)}
                                    </p>
                                  </div>
                                )}
                                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                                  <WriterStatusBadge status={blog.writer_status} />
                                  <PublisherStatusBadge status={blog.publisher_status} />
                                </div>
                              </article>
                            );
                          })
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>

          {hasNoResults ? (
            <DataPageEmptyState
              title="No cards found."
              description="No cards match your current filters."
            />
          ) : null}
        </div>
      </AppShell>
    </ProtectedPage>
  );
}
