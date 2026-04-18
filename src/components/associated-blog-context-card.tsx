"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { formatDateOnly } from "@/lib/utils";
import { ExternalLinkIcon } from "@/lib/icons";
import { LinkQuickActions } from "@/components/link-quick-actions";
import { useAuth } from "@/providers/auth-provider";

interface AssociatedBlog {
  id: string;
  title: string;
  site: string;
  writer_status: string;
  publisher_status: string;
  overall_status: string;
  scheduled_publish_date: string | null;
  display_published_date: string | null;
  google_doc_url: string | null;
  live_url: string | null;
}

export interface AssociatedBlogContextCardProps {
  blogId: string | null;
  loading?: boolean;
}

export function AssociatedBlogContextCard({
  blogId,
  loading,
}: AssociatedBlogContextCardProps) {
  const { session } = useAuth();
  const [blog, setBlog] = useState<AssociatedBlog | null>(null);
  const [fetchLoading, setFetchLoading] = useState(false);

  const fetchBlog = useCallback(async () => {
    if (!blogId || !session?.access_token) return;

    setFetchLoading(true);
    try {
      const response = await fetch(
        `/api/social-posts/${blogId}/associated-blog`,
        {
          headers: {
            authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      if (!response.ok) {
        console.error("Failed to fetch associated blog");
        return;
      }

      const data = await response.json();
      setBlog(data.data || null);
    } catch (err) {
      console.error("Error fetching associated blog:", err);
    } finally {
      setFetchLoading(false);
    }
  }, [blogId, session?.access_token]);

  useEffect(() => {
    void fetchBlog();
  }, [fetchBlog]);

  if (!blogId) {
    return (
      <div className="rounded-lg border border-[color:var(--sh-gray-200)] bg-[color:var(--sh-gray)] p-4">
        <p className="text-sm text-navy-500">No associated blog.</p>
      </div>
    );
  }

  if (loading || fetchLoading) {
    return (
      <div className="rounded-lg border border-[color:var(--sh-gray-200)] bg-[color:var(--sh-gray)] p-4">
        <p className="text-sm text-navy-500">Loading blog context...</p>
      </div>
    );
  }

  if (!blog) {
    return (
      <div className="rounded-lg border border-[color:var(--sh-gray-200)] bg-[color:var(--sh-gray)] p-4">
        <p className="text-sm text-navy-500">Blog not found.</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-[color:var(--sh-gray-200)] bg-[color:var(--sh-gray)] p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <Link href={`/blogs/${blog.id}`} className="block">
            <h4 className="font-medium text-ink hover:underline truncate">
              {blog.title}
            </h4>
          </Link>
          <p className="text-xs text-navy-500 mt-1">{blog.site}</p>
          <div className="flex gap-2 mt-2 flex-wrap">
            <span className="inline-block px-2 py-1 rounded bg-white text-xs text-navy-500 border border-[color:var(--sh-gray-200)]">
              Writing: {blog.writer_status}
            </span>
            <span className="inline-block px-2 py-1 rounded bg-white text-xs text-navy-500 border border-[color:var(--sh-gray-200)]">
              Publishing: {blog.publisher_status}
            </span>
          </div>
          {blog.scheduled_publish_date && (
            <p className="text-xs text-navy-500 mt-2">
              Scheduled: {formatDateOnly(blog.scheduled_publish_date)}
            </p>
          )}
        </div>
        <Link
          href={`/blogs/${blog.id}`}
          className="flex-shrink-0 inline-flex items-center justify-center w-8 h-8 rounded hover:bg-[color:var(--sh-gray-200)] transition-colors"
          title="Open blog"
        >
          <ExternalLinkIcon size={16} />
        </Link>
      </div>
      <div className="mt-4 pt-4 border-t border-[color:var(--sh-gray-200)]">
        <div className="flex flex-col gap-3">
          {blog.google_doc_url && (
            <LinkQuickActions
              label="Draft Doc"
              href={blog.google_doc_url}
            />
          )}
          {blog.live_url && (
            <LinkQuickActions
              label="Live Blog"
              href={blog.live_url}
            />
          )}
        </div>
      </div>
    </div>
  );
}
