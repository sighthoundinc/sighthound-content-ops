import { NextRequest, NextResponse } from "next/server";
import { withApiContract } from "@/lib/api-contract";
import { requirePermission } from "@/lib/server-permissions";
import { getUserRoles } from "@/lib/roles";
import {
  getSelectedBlogTaskCandidate,
  getSocialTaskActionStateFromRow,
} from "@/lib/task-action-state";
import { fetchSharedTaskClassificationInputs } from "@/lib/server-task-classification-inputs";
import {
  assertValidStatus,
  initialPublisherCounts,
  initialSocialPostCounts,
  initialWriterCounts,
} from "@/lib/task-logic";
import type { SocialPostStatus } from "@/lib/types";
import {
  buildUserScopedResponseCacheKey,
  getServerResponseCacheValue,
  setServerResponseCacheValue,
} from "@/lib/server-response-cache";

interface DashboardSummary {
  writerCounts: Record<string, number>;
  publisherCounts: Record<string, number>;
  socialPostCounts: Record<string, number>;
  userRoles: string[];
}
const DASHBOARD_SUMMARY_CACHE_TTL_MS = 30_000;
const DASHBOARD_SUMMARY_CACHE_CONTROL =
  "private, max-age=30, stale-while-revalidate=30";

export const GET = withApiContract(async function GET(request: NextRequest) {
  try {
    const auth = await requirePermission(request, "view_dashboard");
    if ("error" in auth) {
      console.error("Permission denied:", auth.error);
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { profile, adminClient } = auth.context;
    if (!profile) {
      return NextResponse.json({ error: "User profile not found." }, { status: 401 });
    }
    const cacheKey = buildUserScopedResponseCacheKey(
      "dashboard:summary",
      profile.id
    );
    const cachedSummary = getServerResponseCacheValue<DashboardSummary>(cacheKey);
    if (cachedSummary) {
      return NextResponse.json(cachedSummary, {
        headers: {
          "Cache-Control": DASHBOARD_SUMMARY_CACHE_CONTROL,
        },
      });
    }

    const userRoles = getUserRoles(profile);
    const isAdmin = userRoles.includes("admin");
    const summary: DashboardSummary = {
      writerCounts: initialWriterCounts(),
      publisherCounts: initialPublisherCounts(),
      socialPostCounts: initialSocialPostCounts(),
      userRoles,
    };

    const sharedInputs = await fetchSharedTaskClassificationInputs({
      adminClient,
      userId: profile.id,
    });
    if (!sharedInputs.data || sharedInputs.error) {
      return NextResponse.json(
        { error: sharedInputs.error?.message ?? "Failed to load task inputs." },
        { status: 500 }
      );
    }

    const { blogs: normalizedBlogs, assignmentMap, socialRows } = sharedInputs.data;

    for (const blog of normalizedBlogs) {
      const assignmentEntries = assignmentMap.get(blog.id) ?? [];

      assertValidStatus(blog.writer_status, "writer");
      assertValidStatus(blog.publisher_status, "publisher");

      const selected = getSelectedBlogTaskCandidate({
        userId: profile.id,
        writerId: blog.writer_id,
        publisherId: blog.publisher_id,
        writerStatus: blog.writer_status,
        publisherStatus: blog.publisher_status,
        assignmentEntries,
      });
      if (!selected || selected.actionState !== "action_required") {
        continue;
      }

      if (
        selected.countBucket === "writer" &&
        selected.statusKey in summary.writerCounts
      ) {
        (summary.writerCounts[selected.statusKey] as number)++;
      } else if (
        selected.countBucket === "publisher" &&
        selected.statusKey in summary.publisherCounts
      ) {
        (summary.publisherCounts[selected.statusKey] as number)++;
      }
    }

    if (socialRows.length > 0) {
      socialRows.forEach((row) => {
        const status = row.status as SocialPostStatus | undefined;
        if (!status) {
          return;
        }
        assertValidStatus(status, "social");
        const actionState = getSocialTaskActionStateFromRow({
          row,
          userId: profile.id,
          isAdmin,
        });
        if (actionState !== "action_required") {
          return;
        }
        if (status in summary.socialPostCounts) {
          (summary.socialPostCounts[status] as number)++;
        }
      });
    }

    setServerResponseCacheValue(
      cacheKey,
      summary,
      DASHBOARD_SUMMARY_CACHE_TTL_MS
    );
    return NextResponse.json(summary, {
      headers: {
        "Cache-Control": DASHBOARD_SUMMARY_CACHE_CONTROL,
      },
    });
  } catch (error) {
    console.error(
      "Error in dashboard summary endpoint:",
      error instanceof Error ? error.message : error
    );
    return NextResponse.json(
      { error: "Failed to fetch work summary" },
      { status: 500 }
    );
  }
});
