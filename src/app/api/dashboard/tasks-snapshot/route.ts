import { NextRequest, NextResponse } from "next/server";
import { withApiContract } from "@/lib/api-contract";
import {
  BLOG_SELECT_WITH_DATES,
  getBlogPublishDate,
  normalizeBlogRows,
} from "@/lib/blog-schema";
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
import {
  isMissingSocialOwnershipColumnsError,
  SOCIAL_TASK_SELECT_LEGACY,
  SOCIAL_TASK_SELECT_WITH_OWNERSHIP,
} from "@/lib/social-post-schema";
import { ACTIVE_SOCIAL_STATUSES, assertValidStatus } from "@/lib/task-logic";
import { requirePermission } from "@/lib/server-permissions";
import type { BlogRecord, SocialPostStatus } from "@/lib/types";


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

    const userId = profile.id;
    const isAdmin =
      profile.role === "admin" ||
      (Array.isArray(profile.user_roles) && profile.user_roles.includes("admin"));

    const { data: assignments, error: assignmentError } = await adminClient
      .from("task_assignments")
      .select("blog_id,task_type")
      .eq("assigned_to_user_id", userId)
      .eq("status", "pending");

    if (assignmentError && !assignmentError.message.includes("task_assignments")) {
      return NextResponse.json(
        { error: "Failed to load task assignments." },
        { status: 500 }
      );
    }

    const assignmentMap = new Map<
      string,
      Array<{ taskType: "writer_review" | "publisher_review" }>
    >();
    const assignedBlogIdSet = new Set<string>();
    for (const assignment of assignments ?? []) {
      if (
        typeof assignment.blog_id === "string" &&
        typeof assignment.task_type === "string"
      ) {
        const existingAssignments = assignmentMap.get(assignment.blog_id) ?? [];
        existingAssignments.push({
          taskType: assignment.task_type as "writer_review" | "publisher_review",
        });
        assignmentMap.set(assignment.blog_id, existingAssignments);
        assignedBlogIdSet.add(assignment.blog_id);
      }
    }
    const assignedBlogIds = Array.from(assignedBlogIdSet);

    let blogQuery = adminClient
      .from("blogs")
      .select(BLOG_SELECT_WITH_DATES)
      .eq("is_archived", false)
      .neq("overall_status", "published");
    if (assignedBlogIds.length > 0) {
      blogQuery = blogQuery.or(
        `writer_id.eq.${userId},publisher_id.eq.${userId},id.in.(${assignedBlogIds.join(",")})`
      );
    } else {
      blogQuery = blogQuery.or(`writer_id.eq.${userId},publisher_id.eq.${userId}`);
    }

    const { data: blogRows, error: blogError } = await blogQuery
      .order("scheduled_publish_date", { ascending: true, nullsFirst: false })
      .order("updated_at", { ascending: false });

    if (blogError) {
      return NextResponse.json({ error: "Failed to load blog tasks." }, { status: 500 });
    }

    const normalizedBlogs = normalizeBlogRows(
      (blogRows ?? []) as Array<Record<string, unknown>>
    ) as BlogRecord[];

    const fetchSocialRows = async (includeOwnershipColumns: boolean) => {
      let query = adminClient
        .from("social_posts")
        .select(
          includeOwnershipColumns
            ? SOCIAL_TASK_SELECT_WITH_OWNERSHIP
            : SOCIAL_TASK_SELECT_LEGACY
        )
        .in("status", ACTIVE_SOCIAL_STATUSES);

      query = query.or(
        includeOwnershipColumns
          ? `assigned_to_user_id.eq.${userId},worker_user_id.eq.${userId},reviewer_user_id.eq.${userId},created_by.eq.${userId}`
          : `worker_user_id.eq.${userId},reviewer_user_id.eq.${userId},created_by.eq.${userId}`
      );

      return query.order("scheduled_date", { ascending: true, nullsFirst: false });
    };

    let { data: socialRows, error: socialError } = await fetchSocialRows(true);
    if (isMissingSocialOwnershipColumnsError(socialError)) {
      console.warn(
        "social_posts ownership columns missing; falling back to legacy social task query."
      );
      const fallbackResult = await fetchSocialRows(false);
      socialRows = fallbackResult.data;
      socialError = fallbackResult.error;
    }

    if (socialError) {
      return NextResponse.json({ error: "Failed to load social tasks." }, { status: 500 });
    }

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

    const normalizedSocialRows = (socialRows ?? []) as unknown as Array<
      Record<string, unknown>
    >;
    const socialTasks: SnapshotTask[] = normalizedSocialRows.flatMap((row) => {
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

    return NextResponse.json(response);
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
