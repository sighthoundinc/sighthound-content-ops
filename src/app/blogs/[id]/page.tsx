"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { format } from "date-fns";

import { AppShell } from "@/components/app-shell";
import { ProtectedPage } from "@/components/protected-page";
import { StatusBadge } from "@/components/status-badge";
import {
  BLOG_SELECT_LEGACY_WITH_RELATIONS,
  BLOG_SELECT_WITH_DATES_WITH_RELATIONS,
  getBlogPublishDate,
  isMissingBlogDateColumnsError,
  normalizeBlogRow,
} from "@/lib/blog-schema";
import { notifySlack } from "@/lib/notifications";
import { PUBLISHER_STATUSES, SITES, WRITER_STATUSES } from "@/lib/status";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import type {
  BlogHistoryRecord,
  BlogRecord,
  BlogSite,
  ProfileRecord,
  PublisherStageStatus,
  WriterStageStatus,
} from "@/lib/types";
import { formatDateInput, toTitleCase } from "@/lib/utils";
import { useAuth } from "@/providers/auth-provider";

type BlogFormState = {
  title: string;
  site: BlogSite;
  writer_id: string;
  publisher_id: string;
  writer_status: WriterStageStatus;
  publisher_status: PublisherStageStatus;
  google_doc_url: string;
  live_url: string;
  scheduled_publish_date: string;
  is_archived: boolean;
};

export default function BlogDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { user, profile } = useAuth();
  const blogId = params.id;

  const [blog, setBlog] = useState<BlogRecord | null>(null);
  const [form, setForm] = useState<BlogFormState | null>(null);
  const [users, setUsers] = useState<ProfileRecord[]>([]);
  const [history, setHistory] = useState<BlogHistoryRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!blogId) {
      return;
    }

    const loadData = async () => {
      const supabase = getSupabaseBrowserClient();
      setIsLoading(true);
      setError(null);
      const fetchBlog = async () => {
        let { data, error } = await supabase
          .from("blogs")
          .select(BLOG_SELECT_WITH_DATES_WITH_RELATIONS)
          .eq("id", blogId)
          .single();
        if (isMissingBlogDateColumnsError(error)) {
          const fallback = await supabase
            .from("blogs")
            .select(BLOG_SELECT_LEGACY_WITH_RELATIONS)
            .eq("id", blogId)
            .single();
          data = fallback.data as typeof data;
          error = fallback.error;
        }

        return { data, error };
      };

      const [{ data: blogData, error: blogError }, { data: usersData }, { data: historyData }] =
        await Promise.all([
          fetchBlog(),
          supabase
            .from("profiles")
            .select("*")
            .eq("is_active", true)
            .order("full_name", { ascending: true }),
          supabase
            .from("blog_assignment_history")
            .select("*")
            .eq("blog_id", blogId)
            .order("changed_at", { ascending: false })
            .limit(50),
        ]);

      if (blogError) {
        setError(blogError.message);
        setIsLoading(false);
        return;
      }

      const nextBlog = normalizeBlogRow(
        (blogData ?? {}) as Record<string, unknown>
      ) as unknown as BlogRecord;
      setBlog(nextBlog);
      setForm({
        title: nextBlog.title,
        site: nextBlog.site,
        writer_id: nextBlog.writer_id ?? "",
        publisher_id: nextBlog.publisher_id ?? "",
        writer_status: nextBlog.writer_status,
        publisher_status: nextBlog.publisher_status,
        google_doc_url: nextBlog.google_doc_url ?? "",
        live_url: nextBlog.live_url ?? "",
        scheduled_publish_date: formatDateInput(getBlogPublishDate(nextBlog)),
        is_archived: nextBlog.is_archived,
      });
      setUsers((usersData ?? []) as ProfileRecord[]);
      setHistory((historyData ?? []) as BlogHistoryRecord[]);
      setIsLoading(false);
    };

    void loadData();
  }, [blogId]);

  const canAdminEdit = profile?.role === "admin";
  const isWriterAssignee = blog?.writer_id === user?.id;
  const isPublisherAssignee = blog?.publisher_id === user?.id;
  const canWriterEdit = canAdminEdit || isWriterAssignee;
  const canPublisherEdit = canAdminEdit || isPublisherAssignee;

  const selectedWriter = useMemo(
    () => users.find((nextUser) => nextUser.id === form?.writer_id) ?? null,
    [form?.writer_id, users]
  );
  const selectedPublisher = useMemo(
    () => users.find((nextUser) => nextUser.id === form?.publisher_id) ?? null,
    [form?.publisher_id, users]
  );

  const updateBlog = async (
    updates: Record<string, unknown>,
    message: string,
    notify?: () => Promise<void>
  ) => {
    if (!blog) {
      return;
    }

    setIsSaving(true);
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
      delete (legacyUpdates as { scheduled_publish_date?: string | null }).scheduled_publish_date;
      delete (legacyUpdates as { published_at?: string | null }).published_at;

      const fallbackUpdate = await supabase
        .from("blogs")
        .update(legacyUpdates)
        .eq("id", blog.id)
        .select(BLOG_SELECT_LEGACY_WITH_RELATIONS)
        .single();
      data = fallbackUpdate.data as typeof data;
      updateError = fallbackUpdate.error;
    }

    if (updateError) {
      setError(updateError.message);
      setIsSaving(false);
      return;
    }

    const nextBlog = normalizeBlogRow(
      (data ?? {}) as Record<string, unknown>
    ) as unknown as BlogRecord;
    setBlog(nextBlog);
    setForm({
      title: nextBlog.title,
      site: nextBlog.site,
      writer_id: nextBlog.writer_id ?? "",
      publisher_id: nextBlog.publisher_id ?? "",
      writer_status: nextBlog.writer_status,
      publisher_status: nextBlog.publisher_status,
      google_doc_url: nextBlog.google_doc_url ?? "",
      live_url: nextBlog.live_url ?? "",
      scheduled_publish_date: formatDateInput(getBlogPublishDate(nextBlog)),
      is_archived: nextBlog.is_archived,
    });
    setSuccessMessage(message);

    if (notify) {
      await notify();
    }

    const { data: historyData } = await supabase
      .from("blog_assignment_history")
      .select("*")
      .eq("blog_id", blog.id)
      .order("changed_at", { ascending: false })
      .limit(50);
    setHistory((historyData ?? []) as BlogHistoryRecord[]);
    setIsSaving(false);
  };

  const handleAdminSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form || !blog) {
      return;
    }

    const previousWriterId = blog.writer_id ?? "";
    const writerChanged = previousWriterId !== form.writer_id;

    await updateBlog(
      {
        title: form.title.trim(),
        site: form.site,
        writer_id: form.writer_id || null,
        publisher_id: form.publisher_id || null,
        scheduled_publish_date: form.scheduled_publish_date || null,
        target_publish_date: form.scheduled_publish_date || null,
        is_archived: form.is_archived,
      },
      "Blog details updated.",
      writerChanged && form.writer_id && selectedWriter
        ? async () => {
            await notifySlack({
              eventType: "writer_assigned",
              blogId: blog.id,
              title: form.title,
              site: form.site,
              actorName: profile?.full_name ?? "Admin",
              targetEmail: selectedWriter.email,
            });
          }
        : undefined
    );
  };

  const handleWriterSave = async () => {
    if (!form || !blog || !canWriterEdit) {
      return;
    }

    await updateBlog(
      {
        writer_status: form.writer_status,
        google_doc_url: form.google_doc_url.trim() || null,
      },
      "Writer updates saved."
    );
  };

  const handlePublisherSave = async () => {
    if (!form || !blog || !canPublisherEdit) {
      return;
    }

    await updateBlog(
      {
        publisher_status: form.publisher_status,
        live_url: form.live_url.trim() || null,
      },
      "Publisher updates saved."
    );
  };

  const handleMarkWritingComplete = async () => {
    if (!form || !blog || !canWriterEdit) {
      return;
    }

    const targetPublisherEmail =
      users.find((nextUser) => nextUser.id === form.publisher_id)?.email ?? null;

    await updateBlog(
      {
        writer_status: "completed",
      },
      "Writing marked complete.",
      async () => {
        await notifySlack({
          eventType: "writer_completed",
          blogId: blog.id,
          title: blog.title,
          site: blog.site,
          actorName: profile?.full_name ?? "Writer",
          targetEmail: blog.writer?.email ?? undefined,
        });
        await notifySlack({
          eventType: "ready_to_publish",
          blogId: blog.id,
          title: blog.title,
          site: blog.site,
          actorName: profile?.full_name ?? "Writer",
          targetEmail: targetPublisherEmail,
        });
      }
    );
  };

  const handleMarkPublishingComplete = async () => {
    if (!blog || !canPublisherEdit) {
      return;
    }

    await updateBlog(
      {
        publisher_status: "completed",
      },
      "Publishing marked complete.",
      async () => {
        await notifySlack({
          eventType: "published",
          blogId: blog.id,
          title: blog.title,
          site: blog.site,
          actorName: profile?.full_name ?? "Publisher",
          targetEmail: null,
        });
      }
    );
  };

  if (isLoading || !form) {
    return (
      <ProtectedPage>
        <AppShell>
          <p className="rounded-md border border-slate-200 bg-slate-50 px-4 py-5 text-sm text-slate-500">
            Loading blog details…
          </p>
        </AppShell>
      </ProtectedPage>
    );
  }

  if (!blog) {
    return (
      <ProtectedPage>
        <AppShell>
          <p className="rounded-md border border-rose-200 bg-rose-50 px-4 py-5 text-sm text-rose-700">
            Blog not found.
          </p>
        </AppShell>
      </ProtectedPage>
    );
  }

  return (
    <ProtectedPage>
      <AppShell>
        <div className="space-y-5">
          <header className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">{blog.title}</h2>
              <p className="text-sm text-slate-600">
                {blog.site} • Created {format(new Date(blog.created_at), "PPp")}
              </p>
            </div>
            <StatusBadge status={blog.overall_status} />
          </header>

          {error ? (
            <p className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {error}
            </p>
          ) : null}
          {successMessage ? (
            <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              {successMessage}
            </p>
          ) : null}

          <section className="rounded-lg border border-slate-200 p-4">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
              Blog Details
            </h3>

            <form className="mt-3 space-y-4" onSubmit={handleAdminSave}>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="block">
                  <span className="mb-1 block text-sm font-medium text-slate-700">
                    Title
                  </span>
                  <input
                    disabled={!canAdminEdit}
                    value={form.title}
                    onChange={(event) => {
                      setForm((prev) =>
                        prev ? { ...prev, title: event.target.value } : prev
                      );
                    }}
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-100"
                  />
                </label>

                <label className="block">
                  <span className="mb-1 block text-sm font-medium text-slate-700">
                    Site
                  </span>
                  <select
                    disabled={!canAdminEdit}
                    value={form.site}
                    onChange={(event) => {
                      setForm((prev) =>
                        prev ? { ...prev, site: event.target.value as BlogSite } : prev
                      );
                    }}
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-100"
                  >
                    {SITES.map((siteValue) => (
                      <option key={siteValue} value={siteValue}>
                        {siteValue}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="block">
                  <span className="mb-1 block text-sm font-medium text-slate-700">
                    Writer
                  </span>
                  <select
                    disabled={!canAdminEdit}
                    value={form.writer_id}
                    onChange={(event) => {
                      setForm((prev) =>
                        prev ? { ...prev, writer_id: event.target.value } : prev
                      );
                    }}
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-100"
                  >
                    <option value="">Unassigned</option>
                    {users.map((nextUser) => (
                      <option key={nextUser.id} value={nextUser.id}>
                        {nextUser.full_name} ({nextUser.role})
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="mb-1 block text-sm font-medium text-slate-700">
                    Publisher
                  </span>
                  <select
                    disabled={!canAdminEdit}
                    value={form.publisher_id}
                    onChange={(event) => {
                      setForm((prev) =>
                        prev ? { ...prev, publisher_id: event.target.value } : prev
                      );
                    }}
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-100"
                  >
                    <option value="">Unassigned</option>
                    {users.map((nextUser) => (
                      <option key={nextUser.id} value={nextUser.id}>
                        {nextUser.full_name} ({nextUser.role})
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <label className="block">
                <span className="mb-1 block text-sm font-medium text-slate-700">
                  Target Publish Date
                </span>
                <input
                  disabled={!canAdminEdit}
                  type="date"
                  value={form.scheduled_publish_date}
                  onChange={(event) => {
                    setForm((prev) =>
                      prev ? { ...prev, scheduled_publish_date: event.target.value } : prev
                    );
                  }}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-100"
                />
              </label>

              <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                <input
                  disabled={!canAdminEdit}
                  type="checkbox"
                  checked={form.is_archived}
                  onChange={(event) => {
                    setForm((prev) =>
                      prev ? { ...prev, is_archived: event.target.checked } : prev
                    );
                  }}
                />
                Archived
              </label>

              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={!canAdminEdit || isSaving}
                  className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Save Details
                </button>
                <button
                  type="button"
                  className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  onClick={() => {
                    router.push("/dashboard");
                  }}
                >
                  Back to Dashboard
                </button>
              </div>
            </form>
          </section>

          <section className="grid gap-4 xl:grid-cols-2">
            <div className="rounded-lg border border-slate-200 p-4">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                Writer Workflow
              </h3>
              <p className="mt-1 text-sm text-slate-600">
                Assigned writer: {selectedWriter?.full_name ?? "Unassigned"}
              </p>

              <div className="mt-3 space-y-3">
                <label className="block">
                  <span className="mb-1 block text-sm font-medium text-slate-700">
                    Writer Status
                  </span>
                  <select
                    disabled={!canWriterEdit}
                    value={form.writer_status}
                    onChange={(event) => {
                      setForm((prev) =>
                        prev
                          ? {
                              ...prev,
                              writer_status: event.target.value as WriterStageStatus,
                            }
                          : prev
                      );
                    }}
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-100"
                  >
                    {WRITER_STATUSES.map((status) => (
                      <option key={status} value={status}>
                        {toTitleCase(status)}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="mb-1 block text-sm font-medium text-slate-700">
                    Google Doc URL
                  </span>
                  <input
                    disabled={!canWriterEdit}
                    type="url"
                    value={form.google_doc_url}
                    onChange={(event) => {
                      setForm((prev) =>
                        prev ? { ...prev, google_doc_url: event.target.value } : prev
                      );
                    }}
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-100"
                    placeholder="https://docs.google.com/..."
                  />
                </label>

                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={!canWriterEdit || isSaving}
                    className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                    onClick={() => {
                      void handleWriterSave();
                    }}
                  >
                    Save Writer Updates
                  </button>
                  <button
                    type="button"
                    disabled={!canWriterEdit || isSaving}
                    className="rounded-md bg-violet-600 px-3 py-2 text-sm font-semibold text-white hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-60"
                    onClick={() => {
                      if (confirm("Mark writing as complete?")) {
                        void handleMarkWritingComplete();
                      }
                    }}
                  >
                    Mark Writing Complete
                  </button>
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-slate-200 p-4">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                Publisher Workflow
              </h3>
              <p className="mt-1 text-sm text-slate-600">
                Assigned publisher: {selectedPublisher?.full_name ?? "Unassigned"}
              </p>

              <div className="mt-3 space-y-3">
                <label className="block">
                  <span className="mb-1 block text-sm font-medium text-slate-700">
                    Publisher Status
                  </span>
                  <select
                    disabled={!canPublisherEdit}
                    value={form.publisher_status}
                    onChange={(event) => {
                      setForm((prev) =>
                        prev
                          ? {
                              ...prev,
                              publisher_status: event.target.value as PublisherStageStatus,
                            }
                          : prev
                      );
                    }}
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-100"
                  >
                    {PUBLISHER_STATUSES.map((status) => (
                      <option key={status} value={status}>
                        {toTitleCase(status)}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="mb-1 block text-sm font-medium text-slate-700">
                    Live URL
                  </span>
                  <input
                    disabled={!canPublisherEdit}
                    type="url"
                    value={form.live_url}
                    onChange={(event) => {
                      setForm((prev) =>
                        prev ? { ...prev, live_url: event.target.value } : prev
                      );
                    }}
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-100"
                    placeholder="https://..."
                  />
                </label>

                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={!canPublisherEdit || isSaving}
                    className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                    onClick={() => {
                      void handlePublisherSave();
                    }}
                  >
                    Save Publisher Updates
                  </button>
                  <button
                    type="button"
                    disabled={!canPublisherEdit || isSaving}
                    className="rounded-md bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
                    onClick={() => {
                      if (confirm("Mark publishing as complete?")) {
                        void handleMarkPublishingComplete();
                      }
                    }}
                  >
                    Mark Publishing Complete
                  </button>
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-lg border border-slate-200 p-4">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
              Assignment & Activity History
            </h3>
            {history.length === 0 ? (
              <p className="mt-3 text-sm text-slate-500">No history yet.</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {history.map((entry) => (
                  <li
                    key={entry.id}
                    className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2"
                  >
                    <p className="text-sm font-medium text-slate-800">
                      {toTitleCase(entry.event_type)}
                    </p>
                    <p className="text-xs text-slate-500">
                      {entry.field_name ? `${entry.field_name}: ` : ""}
                      {entry.old_value ?? "—"} → {entry.new_value ?? "—"}
                    </p>
                    <p className="text-xs text-slate-400">
                      {format(new Date(entry.changed_at), "PPp")}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {blog.google_doc_url ? (
            <section className="rounded-lg border border-slate-200 p-4">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                Links
              </h3>
              <div className="mt-2 space-y-2 text-sm">
                <p>
                  Draft:{" "}
                  <Link
                    href={blog.google_doc_url}
                    className="text-blue-600 underline"
                    target="_blank"
                  >
                    {blog.google_doc_url}
                  </Link>
                </p>
                {blog.live_url ? (
                  <p>
                    Live URL:{" "}
                    <Link
                      href={blog.live_url}
                      className="text-blue-600 underline"
                      target="_blank"
                    >
                      {blog.live_url}
                    </Link>
                  </p>
                ) : null}
              </div>
            </section>
          ) : null}
        </div>
      </AppShell>
    </ProtectedPage>
  );
}
