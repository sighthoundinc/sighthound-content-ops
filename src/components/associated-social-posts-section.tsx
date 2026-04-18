"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { formatDateOnly } from "@/lib/utils";
import { ArrowRightIcon } from "@/lib/icons";
import { useAuth } from "@/providers/auth-provider";

interface SocialPost {
  id: string;
  title: string;
  type: string;
  status: string;
  platforms: string[];
  scheduled_date: string | null;
  created_at: string;
}

export interface AssociatedSocialPostsSectionProps {
  blogId: string;
  loading?: boolean;
}

export function AssociatedSocialPostsSection({
  blogId,
  loading,
}: AssociatedSocialPostsSectionProps) {
  const { session } = useAuth();
  const [socialPosts, setSocialPosts] = useState<SocialPost[]>([]);
  const [fetchLoading, setFetchLoading] = useState(false);

  const fetchSocialPosts = useCallback(async () => {
    if (!session?.access_token) return;

    setFetchLoading(true);
    try {
      const response = await fetch(
        `/api/blogs/${blogId}/associated-social-posts`,
        {
          headers: {
            authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      if (!response.ok) {
        console.error("Failed to fetch associated social posts");
        return;
      }

      const data = await response.json();
      setSocialPosts(data.data || []);
    } catch (err) {
      console.error("Error fetching associated social posts:", err);
    } finally {
      setFetchLoading(false);
    }
  }, [blogId, session?.access_token]);

  useEffect(() => {
    void fetchSocialPosts();
  }, [fetchSocialPosts]);

  const displayLoading = loading || fetchLoading;
  const hasContent = socialPosts.length > 0;

  return (
    <div className="rounded-lg border border-slate-200 bg-white">
      <div className="px-4 py-3 border-b border-slate-200">
        <h3 className="font-semibold text-slate-900">
          Associated Social Posts
        </h3>
        {hasContent && (
          <p className="text-xs text-slate-600 mt-1">
            {socialPosts.length} post{socialPosts.length !== 1 ? "s" : ""}
          </p>
        )}
      </div>
      <div className="divide-y divide-slate-200">
        {displayLoading && !hasContent ? (
          <div className="px-4 py-6 text-center">
            <p className="text-sm text-slate-600">Loading...</p>
          </div>
        ) : hasContent ? (
          socialPosts.map((post) => (
            <Link
              key={post.id}
              href={`/social-posts/${post.id}`}
              className="block px-4 py-3 hover:bg-slate-50 transition-colors"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-slate-900 truncate hover:underline">
                    {post.title || "(Untitled)"}
                  </h4>
                  <div className="flex gap-1 mt-1 flex-wrap">
                    <span className="inline-block px-1.5 py-0.5 rounded text-xs bg-slate-100 text-slate-700">
                      {post.type}
                    </span>
                    <span className="inline-block px-1.5 py-0.5 rounded text-xs bg-slate-100 text-slate-700">
                      {post.status}
                    </span>
                    {post.platforms && post.platforms.length > 0 && (
                      <span className="inline-block px-1.5 py-0.5 rounded text-xs bg-slate-100 text-slate-700">
                        {post.platforms.join(", ")}
                      </span>
                    )}
                  </div>
                  {post.scheduled_date && (
                    <p className="text-xs text-slate-600 mt-1">
                      Scheduled: {formatDateOnly(post.scheduled_date)}
                    </p>
                  )}
                </div>
                <ArrowRightIcon size={16}
                  className="flex-shrink-0 text-slate-400 group-hover:text-slate-600" />
              </div>
            </Link>
          ))
        ) : (
          <div className="px-4 py-6 text-center">
            <p className="text-sm text-slate-600">No associated social posts.</p>
          </div>
        )}
      </div>
    </div>
  );
}
