import { NextRequest, NextResponse } from "next/server";

import { withApiContract } from "@/lib/api-contract";
import {
  BLOG_SELECT_LEGACY,
  BLOG_SELECT_WITH_DATES,
  getBlogPublishDate,
  getBlogScheduledDate,
  isMissingBlogDateColumnsError,
  normalizeBlogRows,
} from "@/lib/blog-schema";
import { requirePermission } from "@/lib/server-permissions";
import {
  buildUserScopedResponseCacheKey,
  getServerResponseCacheValue,
  setServerResponseCacheValue,
} from "@/lib/server-response-cache";
import type { BlogRecord, SocialPostStatus } from "@/lib/types";

type OverviewMetricBreakdown = { blogs: number; social: number };
type DashboardOverviewMetrics = {
  openWork: number;
  scheduledNextSevenDays: number;
  awaitingReview: number;
  readyToPublish: number;
  awaitingLiveLink: number;
  publishedLastSevenDays: number;
  breakdown: {
    openWork: OverviewMetricBreakdown;
    scheduledNextSevenDays: OverviewMetricBreakdown;
    awaitingReview: OverviewMetricBreakdown;
    readyToPublish: OverviewMetricBreakdown;
    awaitingLiveLink: OverviewMetricBreakdown;
    publishedLastSevenDays: OverviewMetricBreakdown;
  };
};
const DASHBOARD_OVERVIEW_CACHE_TTL_MS = 30_000;
const DASHBOARD_OVERVIEW_CACHE_CONTROL =
  "private, max-age=30, stale-while-revalidate=30";


export const GET = withApiContract(async function GET(request: NextRequest) {
  try {
    const auth = await requirePermission(request, "view_dashboard");
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { adminClient, profile } = auth.context;
    if (!profile) {
      return NextResponse.json({ error: "User profile not found." }, { status: 401 });
    }
    const cacheKey = buildUserScopedResponseCacheKey(
      "dashboard:overview-metrics",
      profile.id
    );
    const cachedMetrics =
      getServerResponseCacheValue<DashboardOverviewMetrics>(cacheKey);
    if (cachedMetrics) {
      return NextResponse.json(cachedMetrics, {
        headers: {
          "Cache-Control": DASHBOARD_OVERVIEW_CACHE_CONTROL,
        },
      });
    }

    let { data: blogRows, error: blogError } = await adminClient
      .from("blogs")
      .select(BLOG_SELECT_WITH_DATES)
      .eq("is_archived", false);
    if (isMissingBlogDateColumnsError(blogError)) {
      const fallback = await adminClient
        .from("blogs")
        .select(BLOG_SELECT_LEGACY)
        .eq("is_archived", false);
      blogRows = fallback.data as typeof blogRows;
      blogError = fallback.error;
    }
    if (blogError) {
      return NextResponse.json(
        { error: "Failed to load blog overview metrics." },
        { status: 500 }
      );
    }

    const { data: socialRows, error: socialError } = await adminClient
      .from("social_posts")
      .select("id,status,scheduled_date");
    if (socialError) {
      return NextResponse.json(
        { error: "Failed to load social overview metrics." },
        { status: 500 }
      );
    }

    const blogs = normalizeBlogRows(
      (blogRows ?? []) as Array<Record<string, unknown>>
    ) as BlogRecord[];
    const socialPosts = (socialRows ?? []) as Array<{
      id?: string;
      status?: SocialPostStatus;
      scheduled_date?: string | null;
    }>;
    const socialPostIds = socialPosts
      .map((post) => (typeof post.id === "string" ? post.id : null))
      .filter((postId): postId is string => !!postId);
    const publishedSocialPostIds = socialPosts
      .filter((post) => post.status === "published")
      .map((post) => (typeof post.id === "string" ? post.id : null))
      .filter((postId): postId is string => !!postId);

    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const nextSevenDaysEnd = new Date(todayStart);
    nextSevenDaysEnd.setDate(todayStart.getDate() + 6);
    nextSevenDaysEnd.setHours(23, 59, 59, 999);
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(now.getDate() - 7);
    const sevenDaysAgoIso = sevenDaysAgo.toISOString();

    const isInNextSevenDays = (dateValue: string | null) => {
      if (!dateValue) {
        return false;
      }
      const dateTime = new Date(`${dateValue}T00:00:00`).getTime();
      return dateTime >= todayStart.getTime() && dateTime <= nextSevenDaysEnd.getTime();
    };
    const isInLastSevenDays = (dateValue: string | null) => {
      if (!dateValue) {
        return false;
      }
      const dateTime = new Date(dateValue).getTime();
      return dateTime >= sevenDaysAgo.getTime() && dateTime <= now.getTime();
    };
    const socialPostsWithLiveLinks = new Set<string>();
    if (socialPostIds.length > 0) {
      const { data: liveLinkRows, error: liveLinkRowsError } = await adminClient
        .from("social_post_links")
        .select("social_post_id")
        .in("social_post_id", socialPostIds);
      if (liveLinkRowsError) {
        return NextResponse.json(
          { error: "Failed to load social live-link metrics." },
          { status: 500 }
        );
      }
      for (const row of liveLinkRows ?? []) {
        if (typeof row.social_post_id === "string" && row.social_post_id) {
          socialPostsWithLiveLinks.add(row.social_post_id);
        }
      }
    }
    const recentlyPublishedSocialPostIds = new Set<string>();
    if (publishedSocialPostIds.length > 0) {
      const { data: socialPublishTransitions, error: socialPublishTransitionsError } =
        await adminClient
          .from("social_post_activity_history")
          .select("social_post_id,changed_at")
          .eq("field_name", "status")
          .eq("new_value", "published")
          .gte("changed_at", sevenDaysAgoIso)
          .in("social_post_id", publishedSocialPostIds);
      if (socialPublishTransitionsError) {
        return NextResponse.json(
          { error: "Failed to load social published metrics." },
          { status: 500 }
        );
      }
      for (const row of socialPublishTransitions ?? []) {
        if (
          typeof row.social_post_id === "string" &&
          row.social_post_id &&
          isInLastSevenDays(typeof row.changed_at === "string" ? row.changed_at : null)
        ) {
          recentlyPublishedSocialPostIds.add(row.social_post_id);
        }
      }
    }

    const breakdown: DashboardOverviewMetrics["breakdown"] = {
      openWork: { blogs: 0, social: 0 },
      scheduledNextSevenDays: { blogs: 0, social: 0 },
      awaitingReview: { blogs: 0, social: 0 },
      readyToPublish: { blogs: 0, social: 0 },
      awaitingLiveLink: { blogs: 0, social: 0 },
      publishedLastSevenDays: { blogs: 0, social: 0 },
    };

    for (const blog of blogs) {
      const isPublished = blog.overall_status === "published";
      const scheduledDate = getBlogScheduledDate(blog);
      if (!isPublished) {
        breakdown.openWork.blogs += 1;
        if (isInNextSevenDays(scheduledDate)) {
          breakdown.scheduledNextSevenDays.blogs += 1;
        }
      }
      if (
        blog.writer_status === "pending_review" ||
        blog.publisher_status === "pending_review"
      ) {
        breakdown.awaitingReview.blogs += 1;
      }
      if (blog.overall_status === "ready_to_publish") {
        breakdown.readyToPublish.blogs += 1;
      }
      if (isPublished) {
        const publishedTimestamp = getBlogPublishDate(blog);
        if (publishedTimestamp && isInLastSevenDays(publishedTimestamp)) {
          breakdown.publishedLastSevenDays.blogs += 1;
        }
      }
    }
    for (const post of socialPosts) {
      const postId = typeof post.id === "string" ? post.id : null;
      const status = post.status;
      if (!status) {
        continue;
      }
      if (status !== "published") {
        breakdown.openWork.social += 1;
        if (isInNextSevenDays(post.scheduled_date ?? null)) {
          breakdown.scheduledNextSevenDays.social += 1;
        }
      }
      if (status === "in_review") {
        breakdown.awaitingReview.social += 1;
      }
      if (status === "ready_to_publish") {
        breakdown.readyToPublish.social += 1;
      }
      if (
        status === "awaiting_live_link" &&
        postId &&
        !socialPostsWithLiveLinks.has(postId)
      ) {
        breakdown.awaitingLiveLink.social += 1;
      }
      if (status === "published" && postId && recentlyPublishedSocialPostIds.has(postId)) {
        breakdown.publishedLastSevenDays.social += 1;
      }
    }

    const response: DashboardOverviewMetrics = {
      openWork: breakdown.openWork.blogs + breakdown.openWork.social,
      scheduledNextSevenDays:
        breakdown.scheduledNextSevenDays.blogs + breakdown.scheduledNextSevenDays.social,
      awaitingReview: breakdown.awaitingReview.blogs + breakdown.awaitingReview.social,
      readyToPublish: breakdown.readyToPublish.blogs + breakdown.readyToPublish.social,
      awaitingLiveLink: breakdown.awaitingLiveLink.blogs + breakdown.awaitingLiveLink.social,
      publishedLastSevenDays:
        breakdown.publishedLastSevenDays.blogs + breakdown.publishedLastSevenDays.social,
      breakdown,
    };

    setServerResponseCacheValue(
      cacheKey,
      response,
      DASHBOARD_OVERVIEW_CACHE_TTL_MS
    );
    return NextResponse.json(response, {
      headers: {
        "Cache-Control": DASHBOARD_OVERVIEW_CACHE_CONTROL,
      },
    });
  } catch (error) {
    console.error(
      "Error in dashboard overview metrics endpoint:",
      error instanceof Error ? error.message : error
    );
    return NextResponse.json(
      { error: "Failed to fetch dashboard overview metrics." },
      { status: 500 }
    );
  }
});
