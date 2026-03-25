import { NextRequest, NextResponse } from "next/server";
import { withApiContract } from "@/lib/api-contract";
import {
  BLOG_SELECT_LEGACY,
  BLOG_SELECT_WITH_DATES,
  getBlogPublishDate,
  isMissingBlogDateColumnsError,
  normalizeBlogRows,
} from "@/lib/blog-schema";
import {
  PUBLISHER_STATUS_LABELS,
  SOCIAL_POST_STATUS_LABELS,
  WRITER_STATUS_LABELS,
  getNextActor,
} from "@/lib/status";
import { requirePermission } from "@/lib/server-permissions";
import type {
  BlogRecord,
  PublisherStageStatus,
  SocialPostStatus,
  WriterStageStatus,
} from "@/lib/types";

type TaskActionState = "action_required" | "waiting_on_others";

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

const SNAPSHOT_MAX_ITEMS = 8;

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

function isMissingSocialOwnershipColumnError(message: string) {
  return (
    message.includes("assigned_to_user_id") ||
    message.includes("worker_user_id") ||
    message.includes("reviewer_user_id") ||
    message.includes("editor_user_id") ||
    message.includes("admin_owner_id")
  );
}

function getWriterTaskActionState(writerStatus: WriterStageStatus): TaskActionState {
  if (
    writerStatus === "not_started" ||
    writerStatus === "in_progress" ||
    writerStatus === "needs_revision"
  ) {
    return "action_required";
  }
  return "waiting_on_others";
}

function getPublisherTaskActionState(
  writerStatus: WriterStageStatus,
  publisherStatus: PublisherStageStatus
): TaskActionState {
  if (writerStatus !== "completed") {
    return "waiting_on_others";
  }
  if (publisherStatus === "not_started" || publisherStatus === "in_progress") {
    return "action_required";
  }
  return "waiting_on_others";
}

function getAdminAssignmentTaskActionState(
  taskType: "writer_review" | "publisher_review",
  writerStatus: WriterStageStatus,
  publisherStatus: PublisherStageStatus
): TaskActionState {
  if (taskType === "writer_review") {
    return writerStatus === "pending_review" ? "action_required" : "waiting_on_others";
  }
  return publisherStatus === "pending_review" || publisherStatus === "publisher_approved"
    ? "action_required"
    : "waiting_on_others";
}

export const GET = withApiContract(async function GET(request: NextRequest) {
  try {
    const auth = await requirePermission(request, "view_writing_queue");
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { profile, adminClient } = auth.context;
    if (!profile) {
      return NextResponse.json({ error: "User profile not found." }, { status: 401 });
    }

    const userId = profile.id;

    const { data: assignments, error: assignmentError } = await adminClient
      .from("task_assignments")
      .select("blog_id,task_type,assigned_at")
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
      { taskType: "writer_review" | "publisher_review"; assignedAt: string }
    >();
    const assignedBlogIds: string[] = [];
    for (const assignment of assignments ?? []) {
      if (
        typeof assignment.blog_id === "string" &&
        typeof assignment.task_type === "string" &&
        typeof assignment.assigned_at === "string"
      ) {
        assignmentMap.set(assignment.blog_id, {
          taskType: assignment.task_type as "writer_review" | "publisher_review",
          assignedAt: assignment.assigned_at,
        });
        assignedBlogIds.push(assignment.blog_id);
      }
    }

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

    let { data: blogRows, error: blogError } = await blogQuery
      .order("scheduled_publish_date", { ascending: true, nullsFirst: false })
      .order("updated_at", { ascending: false });

    if (isMissingBlogDateColumnsError(blogError)) {
      let blogFallbackQuery = adminClient
        .from("blogs")
        .select(BLOG_SELECT_LEGACY)
        .eq("is_archived", false)
        .neq("overall_status", "published");
      if (assignedBlogIds.length > 0) {
        blogFallbackQuery = blogFallbackQuery.or(
          `writer_id.eq.${userId},publisher_id.eq.${userId},id.in.(${assignedBlogIds.join(",")})`
        );
      } else {
        blogFallbackQuery = blogFallbackQuery.or(
          `writer_id.eq.${userId},publisher_id.eq.${userId}`
        );
      }
      const fallback = await blogFallbackQuery
        .order("target_publish_date", { ascending: true, nullsFirst: false })
        .order("updated_at", { ascending: false });
      blogRows = fallback.data as typeof blogRows;
      blogError = fallback.error;
    }

    if (blogError) {
      return NextResponse.json({ error: "Failed to load blog tasks." }, { status: 500 });
    }

    const normalizedBlogs = normalizeBlogRows(
      (blogRows ?? []) as Array<Record<string, unknown>>
    ) as BlogRecord[];

    let socialRows: Array<Record<string, unknown>> | null = null;
    let socialError: { message: string } | null = null;

    const scopedSocial = await adminClient
      .from("social_posts")
      .select(
        "id,title,status,scheduled_date,created_at,created_by,worker_user_id,reviewer_user_id,assigned_to_user_id,editor_user_id,admin_owner_id"
      )
      .neq("status", "published")
      .or(
        `assigned_to_user_id.eq.${userId},worker_user_id.eq.${userId},reviewer_user_id.eq.${userId},created_by.eq.${userId},editor_user_id.eq.${userId},admin_owner_id.eq.${userId}`
      )
      .order("scheduled_date", { ascending: true, nullsFirst: false });
    socialRows = scopedSocial.data as Array<Record<string, unknown>> | null;
    socialError = scopedSocial.error as { message: string } | null;

    if (socialError && isMissingSocialOwnershipColumnError(socialError.message)) {
      const fallbackWithLegacyOwners = await adminClient
        .from("social_posts")
        .select("id,title,status,scheduled_date,created_at,created_by,editor_user_id,admin_owner_id")
        .neq("status", "published")
        .or(`created_by.eq.${userId},editor_user_id.eq.${userId},admin_owner_id.eq.${userId}`)
        .order("scheduled_date", { ascending: true, nullsFirst: false });
      socialRows = fallbackWithLegacyOwners.data as Array<Record<string, unknown>> | null;
      socialError = fallbackWithLegacyOwners.error as { message: string } | null;
    }

    if (
      socialError &&
      (socialError.message.includes("editor_user_id") ||
        socialError.message.includes("admin_owner_id"))
    ) {
      const fallbackCreatedByOnly = await adminClient
        .from("social_posts")
        .select("id,title,status,scheduled_date,created_at,created_by")
        .neq("status", "published")
        .eq("created_by", userId)
        .order("scheduled_date", { ascending: true, nullsFirst: false });
      socialRows = fallbackCreatedByOnly.data as Array<Record<string, unknown>> | null;
      socialError = fallbackCreatedByOnly.error as { message: string } | null;
    }

    if (socialError) {
      return NextResponse.json({ error: "Failed to load social tasks." }, { status: 500 });
    }

    const blogTasks: SnapshotTask[] = [];
    const processedBlogIds = new Set<string>();
    for (const blog of normalizedBlogs) {
      const scheduledDate = getBlogPublishDate(blog);
      const assignment = assignmentMap.get(blog.id);
      const isAdminAssignment = assignment !== undefined;

      if (blog.writer_id === userId) {
        const actionState = getWriterTaskActionState(blog.writer_status);
        blogTasks.push({
          id: `${blog.id}:writer`,
          title: blog.title,
          kind: "blog",
          href: `/blogs/${blog.id}`,
          statusLabel: WRITER_STATUS_LABELS[blog.writer_status],
          scheduledDate,
          createdAt: blog.created_at,
          actionState,
        });
        processedBlogIds.add(blog.id);
      }

      if (blog.publisher_id === userId) {
        const actionState = getPublisherTaskActionState(
          blog.writer_status,
          blog.publisher_status
        );
        blogTasks.push({
          id: `${blog.id}:publisher`,
          title: blog.title,
          kind: "blog",
          href: `/blogs/${blog.id}`,
          statusLabel:
            blog.writer_status === "completed" && blog.publisher_status === "not_started"
              ? "Ready to publish"
              : PUBLISHER_STATUS_LABELS[blog.publisher_status],
          scheduledDate,
          createdAt: blog.created_at,
          actionState,
        });
        processedBlogIds.add(blog.id);
      }

      if (isAdminAssignment && !processedBlogIds.has(blog.id)) {
        const taskType = assignment.taskType;
        const actionState = getAdminAssignmentTaskActionState(
          taskType,
          blog.writer_status,
          blog.publisher_status
        );
        blogTasks.push({
          id: `${blog.id}:${taskType}:admin`,
          title: blog.title,
          kind: "blog",
          href: `/blogs/${blog.id}`,
          statusLabel:
            taskType === "writer_review"
              ? WRITER_STATUS_LABELS[blog.writer_status]
              : PUBLISHER_STATUS_LABELS[blog.publisher_status],
          scheduledDate,
          createdAt: blog.created_at,
          actionState,
        });
        processedBlogIds.add(blog.id);
      }
    }

    const socialTasks: SnapshotTask[] = (
      (socialRows ?? []) as Array<Record<string, unknown>>
    ).flatMap((row) => {
        const status = row.status as SocialPostStatus;
        if (!(status in SOCIAL_POST_STATUS_LABELS)) {
          return [];
        }
        const nextActor = getNextActor(status);
        const createdBy = typeof row.created_by === "string" ? row.created_by : null;
        const workerUserId =
          typeof row.worker_user_id === "string" ? row.worker_user_id : null;
        const reviewerUserId =
          typeof row.reviewer_user_id === "string" ? row.reviewer_user_id : null;
        const assignedToUserId =
          typeof row.assigned_to_user_id === "string" ? row.assigned_to_user_id : null;
        const editorUserId =
          typeof row.editor_user_id === "string" ? row.editor_user_id : createdBy;
        const adminOwnerId =
          typeof row.admin_owner_id === "string" ? row.admin_owner_id : null;
        const isActionRequired =
          assignedToUserId !== null
            ? assignedToUserId === userId
            : nextActor === "editor"
              ? workerUserId === userId || editorUserId === userId || createdBy === userId
              : nextActor === "admin"
                ? reviewerUserId === userId || adminOwnerId === userId
                : false;

        return [{
          id: String(row.id ?? ""),
          title: String(row.title ?? "Untitled social post"),
          kind: "social",
          href: `/social-posts/${String(row.id ?? "")}`,
          statusLabel: SOCIAL_POST_STATUS_LABELS[status],
          scheduledDate:
            typeof row.scheduled_date === "string" ? row.scheduled_date : null,
          createdAt: String(row.created_at ?? ""),
          actionState: isActionRequired ? "action_required" : "waiting_on_others",
        } satisfies SnapshotTask];
      });

    const merged = [...blogTasks, ...socialTasks].sort((left, right) => {
      if (left.actionState !== right.actionState) {
        return left.actionState === "action_required" ? -1 : 1;
      }
      const dateCompare = compareDatesAsc(left.scheduledDate, right.scheduledDate);
      if (dateCompare !== 0) {
        return dateCompare;
      }
      return left.createdAt.localeCompare(right.createdAt);
    });

    const topItems = merged.slice(0, SNAPSHOT_MAX_ITEMS);
    const response: SnapshotResponse = {
      requiredByMe: topItems.filter((item) => item.actionState === "action_required"),
      waitingOnOthers: topItems.filter(
        (item) => item.actionState === "waiting_on_others"
      ),
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
