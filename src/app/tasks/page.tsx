"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { AppShell } from "@/components/app-shell";
import { ProtectedPage } from "@/components/protected-page";
import { StatusBadge } from "@/components/status-badge";
import {
  BLOG_SELECT_LEGACY,
  BLOG_SELECT_WITH_DATES,
  getBlogPublishDate,
  isMissingBlogDateColumnsError,
  normalizeBlogRows,
} from "@/lib/blog-schema";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import type { BlogRecord } from "@/lib/types";
import { formatDateInput, toTitleCase } from "@/lib/utils";
import { useAuth } from "@/providers/auth-provider";

export default function MyTasksPage() {
  const { user } = useAuth();
  const [blogs, setBlogs] = useState<BlogRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id) {
      return;
    }

    const loadTasks = async () => {
      const supabase = getSupabaseBrowserClient();
      setIsLoading(true);
      setError(null);
      let { data, error: tasksError } = await supabase
        .from("blogs")
        .select(BLOG_SELECT_WITH_DATES)
        .eq("is_archived", false)
        .or(`writer_id.eq.${user.id},publisher_id.eq.${user.id}`)
        .order("scheduled_publish_date", { ascending: true, nullsFirst: false })
        .order("updated_at", { ascending: false });

      if (isMissingBlogDateColumnsError(tasksError)) {
        const fallback = await supabase
          .from("blogs")
          .select(BLOG_SELECT_LEGACY)
          .eq("is_archived", false)
          .or(`writer_id.eq.${user.id},publisher_id.eq.${user.id}`)
          .order("target_publish_date", { ascending: true, nullsFirst: false })
          .order("updated_at", { ascending: false });
        data = fallback.data as typeof data;
        tasksError = fallback.error;
      }

      if (tasksError) {
        setError(tasksError.message);
        setIsLoading(false);
        return;
      }

      setBlogs(
        normalizeBlogRows((data ?? []) as Array<Record<string, unknown>>) as BlogRecord[]
      );
      setIsLoading(false);
    };

    void loadTasks();
  }, [user?.id]);

  const writingTasks = useMemo(
    () =>
      blogs.filter(
        (blog) =>
          blog.writer_id === user?.id &&
          blog.writer_status !== "completed" &&
          blog.writer_status !== "pending_review"
      ),
    [blogs, user?.id]
  );

  const revisionTasks = useMemo(
    () =>
      blogs.filter(
        (blog) => blog.writer_id === user?.id && blog.writer_status === "pending_review"
      ),
    [blogs, user?.id]
  );

  const publishingTasks = useMemo(
    () =>
      blogs.filter(
        (blog) =>
          blog.publisher_id === user?.id && blog.publisher_status !== "completed"
      ),
    [blogs, user?.id]
  );

  const recentlyCompleted = useMemo(
    () =>
      blogs
        .filter(
          (blog) =>
            (blog.writer_id === user?.id && blog.writer_status === "completed") ||
            (blog.publisher_id === user?.id &&
              blog.publisher_status === "completed")
        )
        .slice(0, 12),
    [blogs, user?.id]
  );

  const renderList = (items: BlogRecord[]) => {
    if (items.length === 0) {
      return (
        <p className="rounded-md border border-slate-200 bg-slate-50 px-3 py-4 text-sm text-slate-500">
          No tasks in this section.
        </p>
      );
    }

    return (
      <ul className="space-y-2">
        {items.map((blog) => (
          <li key={blog.id} className="rounded-md border border-slate-200 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Link
                className="font-medium text-slate-900 hover:underline"
                href={`/blogs/${blog.id}`}
              >
                {blog.title}
              </Link>
              <StatusBadge status={blog.overall_status} />
            </div>
            <p className="mt-1 text-sm text-slate-600">
              {blog.site} • Publish date:{" "}
              {formatDateInput(getBlogPublishDate(blog)) || "Not set"}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Writer: {toTitleCase(blog.writer_status)} • Publisher:{" "}
              {toTitleCase(blog.publisher_status)}
            </p>
          </li>
        ))}
      </ul>
    );
  };

  return (
    <ProtectedPage>
      <AppShell>
        <div className="space-y-5">
          <header>
            <h2 className="text-xl font-semibold text-slate-900">My Tasks</h2>
            <p className="text-sm text-slate-600">
              Tasks assigned to you as writer and publisher.
            </p>
          </header>

          {isLoading ? (
            <p className="rounded-md border border-slate-200 bg-slate-50 px-4 py-5 text-sm text-slate-500">
              Loading tasks…
            </p>
          ) : error ? (
            <p className="rounded-md border border-rose-200 bg-rose-50 px-4 py-5 text-sm text-rose-700">
              {error}
            </p>
          ) : (
            <div className="grid gap-4 xl:grid-cols-2">
              <section className="space-y-2">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                  Writing Tasks
                </h3>
                {renderList(writingTasks)}
              </section>

              <section className="space-y-2">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                  Needs Revision
                </h3>
                {renderList(revisionTasks)}
              </section>

              <section className="space-y-2">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                  Publishing Tasks
                </h3>
                {renderList(publishingTasks)}
              </section>

              <section className="space-y-2">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                  Recently Completed
                </h3>
                {renderList(recentlyCompleted)}
              </section>
            </div>
          )}
        </div>
      </AppShell>
    </ProtectedPage>
  );
}
