import { NextRequest, NextResponse } from "next/server";
import { withApiContract } from "@/lib/api-contract";
import { BLOG_SELECT_WITH_DATES, normalizeBlogRows } from "@/lib/blog-schema";
import { requirePermission } from "@/lib/server-permissions";
import { getUserRoles } from "@/lib/roles";
import {
  compareBlogTaskCandidatePriority,
  getAdminAssignmentTaskActionState,
  getPublisherTaskActionState,
  getSocialTaskActionState,
  getWriterTaskActionState,
  type BlogTaskAssociation,
  type TaskActionState,
} from "@/lib/task-action-state";
import {
  isMissingSocialOwnershipColumnsError,
  SOCIAL_TASK_SELECT_LEGACY,
  SOCIAL_TASK_SELECT_WITH_OWNERSHIP,
} from "@/lib/social-post-schema";
import {
  ACTIVE_SOCIAL_STATUSES,
  assertValidStatus,
  initialPublisherCounts,
  initialSocialPostCounts,
  initialWriterCounts,
} from "@/lib/task-logic";
import type { BlogRecord, SocialPostStatus } from "@/lib/types";

interface DashboardSummary {
  writerCounts: Record<string, number>;
  publisherCounts: Record<string, number>;
  socialPostCounts: Record<string, number>;
  userRoles: string[];
}

type BlogTaskCandidate = {
  actionState: TaskActionState;
  statusKey: string;
  countBucket: "writer" | "publisher";
  association: BlogTaskAssociation;
};

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

    const userRoles = getUserRoles(profile);
    const isAdmin = userRoles.includes("admin");
    const summary: DashboardSummary = {
      writerCounts: initialWriterCounts(),
      publisherCounts: initialPublisherCounts(),
      socialPostCounts: initialSocialPostCounts(),
      userRoles,
    };

    const { data: assignments, error: assignmentError } = await adminClient
      .from("task_assignments")
      .select("blog_id,task_type")
      .eq("assigned_to_user_id", profile.id)
      .eq("status", "pending");

    if (
      assignmentError &&
      !(assignmentError.message ?? "").includes("task_assignments")
    ) {
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
        `writer_id.eq.${profile.id},publisher_id.eq.${profile.id},id.in.(${assignedBlogIds.join(",")})`
      );
    } else {
      blogQuery = blogQuery.or(
        `writer_id.eq.${profile.id},publisher_id.eq.${profile.id}`
      );
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

    for (const blog of normalizedBlogs) {
      const assignmentEntries = assignmentMap.get(blog.id) ?? [];
      const candidates: BlogTaskCandidate[] = [];

      assertValidStatus(blog.writer_status, "writer");
      assertValidStatus(blog.publisher_status, "publisher");

      if (blog.writer_id === profile.id) {
        candidates.push({
          association: "writer",
          countBucket: "writer",
          statusKey: blog.writer_status,
          actionState: getWriterTaskActionState(blog.writer_status),
        });
      }

      if (blog.publisher_id === profile.id) {
        candidates.push({
          association: "publisher",
          countBucket: "publisher",
          statusKey: blog.publisher_status,
          actionState: getPublisherTaskActionState(
            blog.writer_status,
            blog.publisher_status
          ),
        });
      }

      for (const assignment of assignmentEntries) {
        const countBucket =
          assignment.taskType === "writer_review" ? "writer" : "publisher";
        candidates.push({
          association: "admin_assignment",
          countBucket,
          statusKey:
            countBucket === "writer" ? blog.writer_status : blog.publisher_status,
          actionState: getAdminAssignmentTaskActionState(
            assignment.taskType,
            blog.writer_status,
            blog.publisher_status
          ),
        });
      }

      if (candidates.length === 0) {
        continue;
      }

      const [selected] = [...candidates].sort(compareBlogTaskCandidatePriority);
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
          ? `assigned_to_user_id.eq.${profile.id},worker_user_id.eq.${profile.id},reviewer_user_id.eq.${profile.id},created_by.eq.${profile.id}`
          : `worker_user_id.eq.${profile.id},reviewer_user_id.eq.${profile.id},created_by.eq.${profile.id}`
      );

      return query;
    };

    let { data: socialRows, error: socialError } = await fetchSocialRows(true);
    if (isMissingSocialOwnershipColumnsError(socialError)) {
      console.warn(
        "social_posts ownership columns missing; falling back to legacy social count query."
      );
      const fallbackResult = await fetchSocialRows(false);
      socialRows = fallbackResult.data;
      socialError = fallbackResult.error;
    }

    if (socialError) {
      return NextResponse.json({ error: "Failed to load social tasks." }, { status: 500 });
    }

    if (socialRows && Array.isArray(socialRows)) {
      ((socialRows ?? []) as unknown as Array<Record<string, unknown>>).forEach((row) => {
        const status = row.status as SocialPostStatus | undefined;
        if (!status) {
          return;
        }
        assertValidStatus(status, "social");
        const actionState = getSocialTaskActionState({
          status,
          userId: profile.id,
          isAdmin,
          createdBy: typeof row.created_by === "string" ? row.created_by : null,
          workerUserId:
            typeof row.worker_user_id === "string" ? row.worker_user_id : null,
          reviewerUserId:
            typeof row.reviewer_user_id === "string" ? row.reviewer_user_id : null,
          assignedToUserId:
            typeof row.assigned_to_user_id === "string"
              ? row.assigned_to_user_id
              : null,
          editorUserId:
            typeof row.editor_user_id === "string" ? row.editor_user_id : null,
          adminOwnerId:
            typeof row.admin_owner_id === "string" ? row.admin_owner_id : null,
        });
        if (actionState !== "action_required") {
          return;
        }
        if (status in summary.socialPostCounts) {
          (summary.socialPostCounts[status] as number)++;
        }
      });
    }

    return NextResponse.json(summary);
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
