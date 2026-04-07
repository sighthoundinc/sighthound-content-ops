import { NextRequest, NextResponse } from "next/server";
import { withApiContract } from "@/lib/api-contract";
import { getBlogPublishDate } from "@/lib/blog-schema";
import {
  PUBLISHER_STATUS_LABELS,
  SOCIAL_POST_STATUS_LABELS,
  WRITER_STATUS_LABELS,
} from "@/lib/status";
import {
  getSelectedBlogTaskCandidate,
  getSocialTaskActionStateFromRow,
  type TaskActionState,
} from "@/lib/task-action-state";
import { fetchSharedTaskClassificationInputs } from "@/lib/server-task-classification-inputs";
import { assertValidStatus } from "@/lib/task-logic";
import { requirePermission } from "@/lib/server-permissions";
import type { SocialPostStatus } from "@/lib/types";
import {
  buildUserScopedResponseCacheKey,
  getServerResponseCacheValue,
  setServerResponseCacheValue,
} from "@/lib/server-response-cache";


type SnapshotTask = {
  id: string;
  title: string;
  kind: "blog" | "social";
  href: string;
  statusLabel: string;
  scheduledDate: string | null;
  createdAt: string;
  actionState: TaskActionState;
};

type SnapshotResponse = {
  requiredByMe: SnapshotTask[];
  waitingOnOthers: SnapshotTask[];
};
const DASHBOARD_SNAPSHOT_CACHE_TTL_MS = 30_000;
const DASHBOARD_SNAPSHOT_CACHE_CONTROL =
  "private, max-age=30, stale-while-revalidate=30";

function compareDatesAsc(leftDate: string | null, rightDate: string | null) {
  if (leftDate && rightDate) {
    return leftDate.localeCompare(rightDate);
  }
  if (leftDate && !rightDate) {
    return -1;
  }
  if (!leftDate && rightDate) {
    return 1;
  }
  return 0;
}


export const GET = withApiContract(async function GET(request: NextRequest) {
  try {
    const auth = await requirePermission(request, "view_dashboard");
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { profile, adminClient } = auth.context;
    if (!profile) {
      return NextResponse.json({ error: "User profile not found." }, { status: 401 });
    }
    const cacheKey = buildUserScopedResponseCacheKey(
      "dashboard:tasks-snapshot",
      profile.id
    );
    const cachedSnapshot = getServerResponseCacheValue<SnapshotResponse>(cacheKey);
    if (cachedSnapshot) {
      return NextResponse.json(cachedSnapshot, {
        headers: {
          "Cache-Control": DASHBOARD_SNAPSHOT_CACHE_CONTROL,
        },
      });
    }

    const userId = profile.id;
    const isAdmin =
      profile.role === "admin" ||
      (Array.isArray(profile.user_roles) && profile.user_roles.includes("admin"));

    const sharedInputs = await fetchSharedTaskClassificationInputs({
      adminClient,
      userId,
    });
    if (!sharedInputs.data || sharedInputs.error) {
      return NextResponse.json(
        { error: sharedInputs.error?.message ?? "Failed to load task inputs." },
        { status: 500 }
      );
    }

    const {
      blogs: normalizedBlogs,
      assignmentMap,
      socialRows,
    } = sharedInputs.data;

    const blogTasks: SnapshotTask[] = [];
    for (const blog of normalizedBlogs) {
      const scheduledDate = getBlogPublishDate(blog);
      const assignmentEntries = assignmentMap.get(blog.id) ?? [];

      assertValidStatus(blog.writer_status, "writer");
      assertValidStatus(blog.publisher_status, "publisher");

      const selected = getSelectedBlogTaskCandidate({
        userId,
        writerId: blog.writer_id,
        publisherId: blog.publisher_id,
        writerStatus: blog.writer_status,
        publisherStatus: blog.publisher_status,
        assignmentEntries,
      });
      if (!selected) {
        continue;
      }
      blogTasks.push({
        id: `${blog.id}:blog`,
        title: blog.title,
        kind: "blog",
        href: `/blogs/${blog.id}`,
        statusLabel:
          selected.countBucket === "writer"
            ? WRITER_STATUS_LABELS[blog.writer_status]
            : blog.writer_status === "completed" &&
                blog.publisher_status === "not_started"
              ? "Ready to publish"
              : PUBLISHER_STATUS_LABELS[blog.publisher_status],
        scheduledDate,
        createdAt: blog.created_at,
        actionState: selected.actionState,
      });
    }

    const socialTasks: SnapshotTask[] = socialRows.flatMap((row) => {
        const status = row.status as SocialPostStatus;
        if (!(status in SOCIAL_POST_STATUS_LABELS)) {
          return [];
        }
        assertValidStatus(status, "social");
        const actionState =
          getSocialTaskActionStateFromRow({
            row,
            userId,
            isAdmin,
          }) ?? "waiting_on_others";

        return [{
          id: String(row.id ?? ""),
          title: String(row.title ?? "Untitled social post"),
          kind: "social",
          href: `/social-posts/${String(row.id ?? "")}`,
          statusLabel: SOCIAL_POST_STATUS_LABELS[status],
          scheduledDate:
            typeof row.scheduled_date === "string" ? row.scheduled_date : null,
          createdAt: String(row.created_at ?? ""),
          actionState,
        } satisfies SnapshotTask];
      });

    const allItems = [...blogTasks, ...socialTasks];
    const compareByScheduleThenCreated = (left: SnapshotTask, right: SnapshotTask) => {
      const dateCompare = compareDatesAsc(left.scheduledDate, right.scheduledDate);
      if (dateCompare !== 0) {
        return dateCompare;
      }
      return left.createdAt.localeCompare(right.createdAt);
    };
    const response: SnapshotResponse = {
      requiredByMe: allItems
        .filter((item) => item.actionState === "action_required")
        .sort(compareByScheduleThenCreated),
      waitingOnOthers: allItems
        .filter((item) => item.actionState === "waiting_on_others")
        .sort(compareByScheduleThenCreated),
    };
    setServerResponseCacheValue(
      cacheKey,
      response,
      DASHBOARD_SNAPSHOT_CACHE_TTL_MS
    );
    return NextResponse.json(response, {
      headers: {
        "Cache-Control": DASHBOARD_SNAPSHOT_CACHE_CONTROL,
      },
    });
  } catch (error) {
    console.error(
      "Error in dashboard tasks snapshot endpoint:",
      error instanceof Error ? error.message : error
    );
    return NextResponse.json(
      { error: "Failed to fetch task snapshot" },
      { status: 500 }
    );
  }
});
