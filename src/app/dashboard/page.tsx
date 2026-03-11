"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { isBefore, parseISO } from "date-fns";

import { AppShell } from "@/components/app-shell";
import { ProtectedPage } from "@/components/protected-page";
import { StatusBadge } from "@/components/status-badge";
import {
  BLOG_SELECT_LEGACY_WITH_RELATIONS,
  BLOG_SELECT_WITH_DATES_WITH_RELATIONS,
  getBlogPublishDate,
  isMissingBlogDateColumnsError,
  normalizeBlogRows,
} from "@/lib/blog-schema";
import { PUBLISHER_STATUSES, STATUS_LABELS, WRITER_STATUSES } from "@/lib/status";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import type {
  BlogRecord,
  OverallBlogStatus,
  ProfileRecord,
  PublisherStageStatus,
  WriterStageStatus,
} from "@/lib/types";
import { formatDateInput, toTitleCase } from "@/lib/utils";
import { useAuth } from "@/providers/auth-provider";

export default function DashboardPage() {
  const router = useRouter();
  const { profile } = useAuth();
  const isAdmin = profile?.role === "admin";
  const [blogs, setBlogs] = useState<BlogRecord[]>([]);
  const [assignableUsers, setAssignableUsers] = useState<
    Array<Pick<ProfileRecord, "id" | "full_name" | "email">>
  >([]);
  const [search, setSearch] = useState("");
  const [siteFilter, setSiteFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<OverallBlogStatus | "all">(
    "all"
  );
  const [writerFilter, setWriterFilter] = useState("all");
  const [publisherFilter, setPublisherFilter] = useState("all");
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

  const filteredBlogs = useMemo(() => {
    return blogs.filter((blog) => {
      const matchesSearch = blog.title
        .toLowerCase()
        .includes(search.toLowerCase().trim());
      const matchesSite = siteFilter === "all" || blog.site === siteFilter;
      const matchesStatus =
        statusFilter === "all" || blog.overall_status === statusFilter;
      const matchesWriter =
        writerFilter === "all" || blog.writer_id === writerFilter;
      const matchesPublisher =
        publisherFilter === "all" || blog.publisher_id === publisherFilter;
      return (
        matchesSearch &&
        matchesSite &&
        matchesStatus &&
        matchesWriter &&
        matchesPublisher
      );
    });
  }, [blogs, search, siteFilter, statusFilter, writerFilter, publisherFilter]);

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

  const visibleBlogIds = useMemo(() => filteredBlogs.map((blog) => blog.id), [filteredBlogs]);
  const selectedIdSet = useMemo(() => new Set(selectedBlogIds), [selectedBlogIds]);
  const selectedBlogs = useMemo(
    () => blogs.filter((blog) => selectedIdSet.has(blog.id)),
    [blogs, selectedIdSet]
  );
  const allVisibleSelected =
    visibleBlogIds.length > 0 &&
    visibleBlogIds.every((id) => selectedIdSet.has(id));

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

  const handleBulkAssignWriter = async () => {
    if (!ensureBulkSelection()) {
      return;
    }
    if (!bulkWriterId) {
      setError("Choose a writer before applying bulk writer assignment.");
      return;
    }

    await runBulkMutation(async () => {
      const supabase = getSupabaseBrowserClient();
      const { error: updateError } = await supabase
        .from("blogs")
        .update({ writer_id: bulkWriterId })
        .in("id", selectedBlogIds);
      if (updateError) {
        throw new Error(updateError.message);
      }
      return `Assigned writer to ${selectedBlogIds.length} blog(s).`;
    });
  };

  const handleBulkAssignPublisher = async () => {
    if (!ensureBulkSelection()) {
      return;
    }
    if (!bulkPublisherId) {
      setError("Choose a publisher before applying bulk publisher assignment.");
      return;
    }

    await runBulkMutation(async () => {
      const supabase = getSupabaseBrowserClient();
      const { error: updateError } = await supabase
        .from("blogs")
        .update({ publisher_id: bulkPublisherId })
        .in("id", selectedBlogIds);
      if (updateError) {
        throw new Error(updateError.message);
      }
      return `Assigned publisher to ${selectedBlogIds.length} blog(s).`;
    });
  };

  const handleBulkWriterStatus = async () => {
    if (!ensureBulkSelection()) {
      return;
    }
    if (!bulkWriterStatus) {
      setError("Choose a writer status before applying bulk status changes.");
      return;
    }

    if (bulkWriterStatus !== "not_started") {
      const missingWriter = selectedBlogs.filter((blog) => !blog.writer_id);
      if (missingWriter.length > 0) {
        setError("Assign a writer first for all selected blogs before changing writer status.");
        return;
      }
    }

    if (
      bulkWriterStatus !== "completed" &&
      selectedBlogs.some((blog) => blog.publisher_status === "completed")
    ) {
      setError("Writer status cannot be set below completed for already published blogs.");
      return;
    }

    await runBulkMutation(async () => {
      const supabase = getSupabaseBrowserClient();
      const { error: updateError } = await supabase
        .from("blogs")
        .update({ writer_status: bulkWriterStatus })
        .in("id", selectedBlogIds);
      if (updateError) {
        throw new Error(updateError.message);
      }
      return `Updated writer status to ${toTitleCase(bulkWriterStatus)} for ${selectedBlogIds.length} blog(s).`;
    });
  };

  const handleBulkPublisherStatus = async () => {
    if (!ensureBulkSelection()) {
      return;
    }
    if (!bulkPublisherStatus) {
      setError("Choose a publisher status before applying bulk status changes.");
      return;
    }

    if (bulkPublisherStatus !== "not_started") {
      const missingPublisher = selectedBlogs.filter((blog) => !blog.publisher_id);
      if (missingPublisher.length > 0) {
        setError("Assign a publisher first for all selected blogs before changing publisher status.");
        return;
      }
    }

    if (
      bulkPublisherStatus === "completed" &&
      selectedBlogs.some((blog) => blog.writer_status !== "completed")
    ) {
      setError("Publisher cannot be marked completed unless writing is completed for all selected blogs.");
      return;
    }

    await runBulkMutation(async () => {
      const supabase = getSupabaseBrowserClient();
      const { error: updateError } = await supabase
        .from("blogs")
        .update({ publisher_status: bulkPublisherStatus })
        .in("id", selectedBlogIds);
      if (updateError) {
        throw new Error(updateError.message);
      }
      return `Updated publisher status to ${toTitleCase(bulkPublisherStatus)} for ${selectedBlogIds.length} blog(s).`;
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

          <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            <input
              type="search"
              placeholder="Search title..."
              className="rounded-md border border-slate-300 px-3 py-2 text-sm"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
              }}
            />

            <select
              className="rounded-md border border-slate-300 px-3 py-2 text-sm"
              value={siteFilter}
              onChange={(event) => {
                setSiteFilter(event.target.value);
              }}
            >
              <option value="all">All Sites</option>
              <option value="sighthound.com">sighthound.com</option>
              <option value="redactor.com">redactor.com</option>
            </select>

            <select
              className="rounded-md border border-slate-300 px-3 py-2 text-sm"
              value={statusFilter}
              onChange={(event) => {
                setStatusFilter(event.target.value as OverallBlogStatus | "all");
              }}
            >
              <option value="all">All Statuses</option>
              {Object.entries(STATUS_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>

            <select
              className="rounded-md border border-slate-300 px-3 py-2 text-sm"
              value={writerFilter}
              onChange={(event) => {
                setWriterFilter(event.target.value);
              }}
            >
              <option value="all">All Writers</option>
              {writerOptions.map((writer) => (
                <option key={writer.id} value={writer.id}>
                  {writer.full_name}
                </option>
              ))}
            </select>

            <select
              className="rounded-md border border-slate-300 px-3 py-2 text-sm"
              value={publisherFilter}
              onChange={(event) => {
                setPublisherFilter(event.target.value);
              }}
            >
              <option value="all">All Publishers</option>
              {publisherOptions.map((publisher) => (
                <option key={publisher.id} value={publisher.id}>
                  {publisher.full_name}
                </option>
              ))}
            </select>
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

          {isAdmin ? (
            <section className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-medium text-slate-700">
                  {selectedBlogIds.length} selected
                </p>
                <button
                  type="button"
                  disabled={selectedBlogIds.length === 0 || isBulkSaving}
                  className="rounded border border-slate-300 bg-white px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                  onClick={() => {
                    clearBulkUiState();
                  }}
                >
                  Clear Selection
                </button>
              </div>

              <div className="grid gap-2 xl:grid-cols-2">
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={bulkWriterId}
                    onChange={(event) => {
                      setBulkWriterId(event.target.value);
                    }}
                    className="rounded-md border border-slate-300 px-3 py-2 text-sm"
                  >
                    <option value="">Assign writer...</option>
                    {assignmentOptions.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.full_name}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    disabled={isBulkSaving || selectedBlogIds.length === 0}
                    className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                    onClick={() => {
                      void handleBulkAssignWriter();
                    }}
                  >
                    Assign Writer
                  </button>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={bulkPublisherId}
                    onChange={(event) => {
                      setBulkPublisherId(event.target.value);
                    }}
                    className="rounded-md border border-slate-300 px-3 py-2 text-sm"
                  >
                    <option value="">Assign publisher...</option>
                    {assignmentOptions.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.full_name}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    disabled={isBulkSaving || selectedBlogIds.length === 0}
                    className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                    onClick={() => {
                      void handleBulkAssignPublisher();
                    }}
                  >
                    Assign Publisher
                  </button>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={bulkWriterStatus}
                    onChange={(event) => {
                      setBulkWriterStatus(event.target.value as WriterStageStatus | "");
                    }}
                    className="rounded-md border border-slate-300 px-3 py-2 text-sm"
                  >
                    <option value="">Writer status...</option>
                    {WRITER_STATUSES.map((status) => (
                      <option key={status} value={status}>
                        {toTitleCase(status)}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    disabled={isBulkSaving || selectedBlogIds.length === 0}
                    className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                    onClick={() => {
                      void handleBulkWriterStatus();
                    }}
                  >
                    Update Writer Status
                  </button>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={bulkPublisherStatus}
                    onChange={(event) => {
                      setBulkPublisherStatus(event.target.value as PublisherStageStatus | "");
                    }}
                    className="rounded-md border border-slate-300 px-3 py-2 text-sm"
                  >
                    <option value="">Publisher status...</option>
                    {PUBLISHER_STATUSES.map((status) => (
                      <option key={status} value={status}>
                        {toTitleCase(status)}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    disabled={isBulkSaving || selectedBlogIds.length === 0}
                    className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                    onClick={() => {
                      void handleBulkPublisherStatus();
                    }}
                  >
                    Update Publisher Status
                  </button>
                </div>
              </div>

              <div>
                <button
                  type="button"
                  disabled={isBulkSaving || selectedBlogIds.length === 0}
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
                    <th className="px-3 py-2">Title</th>
                    <th className="px-3 py-2">Site</th>
                    <th className="px-3 py-2">Writer</th>
                    <th className="px-3 py-2">Writer Status</th>
                    <th className="px-3 py-2">Publisher</th>
                    <th className="px-3 py-2">Publisher Status</th>
                    <th className="px-3 py-2">Overall Status</th>
                    <th className="px-3 py-2">Publish Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredBlogs.length === 0 ? (
                    <tr>
                      <td
                        className="px-3 py-5 text-center text-slate-500"
                        colSpan={isAdmin ? 9 : 8}
                      >
                        No blogs found with current filters.
                      </td>
                    </tr>
                  ) : (
                    filteredBlogs.map((blog) => {
                      const displayPublishDate = getBlogPublishDate(blog);
                      const scheduledPublishDate =
                        blog.scheduled_publish_date ?? blog.target_publish_date ?? null;
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
                          <td className="px-3 py-2 font-medium text-slate-900">
                            {blog.title}
                          </td>
                          <td className="px-3 py-2 text-slate-600">{blog.site}</td>
                          <td className="px-3 py-2 text-slate-600">
                            {blog.writer?.full_name ?? "Unassigned"}
                          </td>
                          <td className="px-3 py-2 text-slate-600">
                            {toTitleCase(blog.writer_status)}
                          </td>
                          <td className="px-3 py-2 text-slate-600">
                            {blog.publisher?.full_name ?? "Unassigned"}
                          </td>
                          <td className="px-3 py-2 text-slate-600">
                            {toTitleCase(blog.publisher_status)}
                          </td>
                          <td className="px-3 py-2">
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
                          <td className="px-3 py-2 text-slate-600">
                            {formatDateInput(displayPublishDate) || "—"}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </AppShell>
    </ProtectedPage>
  );
}
