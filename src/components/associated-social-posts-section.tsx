"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { formatDateOnly } from "@/lib/utils";
import { ArrowRightIcon } from "@/lib/icons";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import {
  SOCIAL_PLATFORM_LABELS,
  SOCIAL_POST_STATUS_LABELS,
  SOCIAL_POST_TYPE_LABELS,
} from "@/lib/status";
import { UI_VOCAB } from "@/lib/ui-vocab";
import { useAuth } from "@/providers/auth-provider";

const labelFor = (labels: Record<string, string>, value: string) => labels[value] ?? value;

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
  const [fetchFailed, setFetchFailed] = useState(false);

  const fetchSocialPosts = useCallback(async () => {
    if (!session?.access_token) return;

    setFetchLoading(true);
    setFetchFailed(false);
    try {
      // Same RLS-scoped read the Social Posts list uses. The previous
      // /api/blogs/[id]/associated-social-posts route never existed, so this
      // section always 404'd and showed "No associated social posts".
      const { data, error } = await getSupabaseBrowserClient()
        .from("social_posts")
        .select("id,title,type,status,platforms,scheduled_date,created_at")
        .eq("associated_blog_id", blogId)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Failed to fetch associated social posts", error.message);
        setFetchFailed(true);
        return;
      }

      setSocialPosts((data ?? []) as SocialPost[]);
    } catch (err) {
      console.error("Error fetching associated social posts:", err);
      setFetchFailed(true);
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
    <div className="rounded-lg border border-[color:var(--sh-gray-200)] bg-white">
      <div className="px-4 py-3 border-b border-[color:var(--sh-gray-200)]">
        <h3 className="font-semibold text-ink">
          Associated Social Posts
        </h3>
        {hasContent && (
          <p className="text-xs text-navy-500 mt-1">
            {socialPosts.length} post{socialPosts.length !== 1 ? "s" : ""}
          </p>
        )}
      </div>
      <div className="divide-y divide-[color:var(--sh-gray-200)]">
        {displayLoading && !hasContent ? (
          <div className="px-4 py-6 text-center">
            <p className="text-sm text-navy-500">Loading...</p>
          </div>
        ) : hasContent ? (
          socialPosts.map((post) => (
            <Link
              key={post.id}
              href={`/social-posts/${post.id}`}
              className="block px-4 py-3 hover:bg-blurple-50 transition-colors"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-ink truncate hover:underline">
                    {post.title || "(Untitled)"}
                  </h4>
                  <div className="flex gap-1 mt-1 flex-wrap">
                    <span className="inline-block px-1.5 py-0.5 rounded text-xs bg-blurple-50 text-navy-500">
                      {labelFor(SOCIAL_POST_TYPE_LABELS, post.type)}
                    </span>
                    <span className="inline-block px-1.5 py-0.5 rounded text-xs bg-blurple-50 text-navy-500">
                      {labelFor(SOCIAL_POST_STATUS_LABELS, post.status)}
                    </span>
                    {post.platforms && post.platforms.length > 0 && (
                      <span className="inline-block px-1.5 py-0.5 rounded text-xs bg-blurple-50 text-navy-500">
                        {post.platforms
                          .map((platform) => labelFor(SOCIAL_PLATFORM_LABELS, platform))
                          .join(", ")}
                      </span>
                    )}
                  </div>
                  {post.scheduled_date && (
                    <p className="text-xs text-navy-500 mt-1">
                      Scheduled: {formatDateOnly(post.scheduled_date)}
                    </p>
                  )}
                </div>
                <ArrowRightIcon size={16}
                  className="flex-shrink-0 text-navy-500/60 group-hover:text-navy-500" />
              </div>
            </Link>
          ))
        ) : fetchFailed ? (
          <div role="alert" className="flex flex-wrap items-center justify-center gap-3 px-4 py-6">
            <p className="text-sm text-navy-500">{UI_VOCAB.errors.loadFailedDescription}</p>
            <button
              type="button"
              className="text-sm font-medium text-brand underline-offset-2 hover:underline"
              onClick={() => {
                void fetchSocialPosts();
              }}
            >
              {UI_VOCAB.errors.retry}
            </button>
          </div>
        ) : (
          <div className="px-4 py-6 text-center">
            <p className="text-sm text-navy-500">No associated social posts.</p>
          </div>
        )}
      </div>
    </div>
  );
}
