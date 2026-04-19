"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { formatDateOnly } from "@/lib/utils";
import { ExternalLinkIcon } from "@/lib/icons";
import { Badge } from "@/components/badge";
import { Card } from "@/components/card";
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
      <Card tone="muted" className="p-4">
        <p className="text-sm text-navy-500">No associated blog.</p>
      </Card>
    );
  }

  if (loading || fetchLoading) {
    return (
      <Card tone="muted" className="p-4">
        <p className="text-sm text-navy-500">Loading blog context...</p>
      </Card>
    );
  }

  if (!blog) {
    return (
      <Card tone="muted" className="p-4">
        <p className="text-sm text-navy-500">Blog not found.</p>
      </Card>
    );
  }

  return (
    <Card tone="muted" className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <Link href={`/blogs/${blog.id}`} className="block">
            <h4 className="truncate font-medium text-ink hover:underline">
              {blog.title}
            </h4>
          </Link>
          <p className="mt-1 text-xs text-navy-500">{blog.site}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Badge>Writing: {blog.writer_status}</Badge>
            <Badge>Publishing: {blog.publisher_status}</Badge>
          </div>
          {blog.scheduled_publish_date && (
            <p className="mt-2 text-xs text-navy-500">
              Scheduled: {formatDateOnly(blog.scheduled_publish_date)}
            </p>
          )}
        </div>
        <Link
          href={`/blogs/${blog.id}`}
          className="inline-flex h-8 w-8 flex-shrink-0 items-center justify-center rounded transition-colors hover:bg-[color:var(--sh-gray-200)]"
          title="Open blog"
        >
          <ExternalLinkIcon size={16} />
        </Link>
      </div>
      <div className="mt-4 border-t border-[color:var(--sh-gray-200)] pt-4">
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
    </Card>
  );
}
