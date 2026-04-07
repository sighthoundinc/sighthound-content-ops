import {
  BLOG_SELECT_WITH_DATES,
  normalizeBlogRows,
} from "@/lib/blog-schema";
import {
  isMissingSocialOwnershipColumnsError,
  SOCIAL_TASK_SELECT_LEGACY,
  SOCIAL_TASK_SELECT_WITH_OWNERSHIP,
} from "@/lib/social-post-schema";
import { createAdminClient } from "@/lib/supabase/server";
import { ACTIVE_SOCIAL_STATUSES } from "@/lib/task-logic";
import type { BlogRecord } from "@/lib/types";

export type TaskAssignmentInput = {
  blogId: string;
  taskType: "writer_review" | "publisher_review";
  assignedAt: string | null;
};

type SharedTaskInputErrorKind = "assignments" | "blogs" | "social";

export type SharedTaskInputError = {
  kind: SharedTaskInputErrorKind;
  message: string;
};

export type SharedTaskClassificationInputs = {
  blogs: BlogRecord[];
  assignments: TaskAssignmentInput[];
  assignmentMap: Map<string, TaskAssignmentInput[]>;
  socialRows: Array<Record<string, unknown>>;
};

export async function fetchSharedTaskClassificationInputs({
  adminClient,
  userId,
}: {
  adminClient: ReturnType<typeof createAdminClient>;
  userId: string;
}): Promise<{
  data?: SharedTaskClassificationInputs;
  error?: SharedTaskInputError;
}> {
  const { data: assignmentRows, error: assignmentError } = await adminClient
    .from("task_assignments")
    .select("blog_id,task_type,assigned_at")
    .eq("assigned_to_user_id", userId)
    .eq("status", "pending");

  if (
    assignmentError &&
    !(assignmentError.message ?? "").includes("task_assignments")
  ) {
    return {
      error: { kind: "assignments", message: "Failed to load task assignments." },
    };
  }

  const assignments: TaskAssignmentInput[] = [];
  const assignmentMap = new Map<string, TaskAssignmentInput[]>();
  const assignedBlogIdSet = new Set<string>();
  for (const assignment of assignmentRows ?? []) {
    if (
      typeof assignment.blog_id === "string" &&
      typeof assignment.task_type === "string"
    ) {
      const entry: TaskAssignmentInput = {
        blogId: assignment.blog_id,
        taskType: assignment.task_type as "writer_review" | "publisher_review",
        assignedAt:
          typeof assignment.assigned_at === "string" ? assignment.assigned_at : null,
      };
      assignments.push(entry);
      const existingEntries = assignmentMap.get(entry.blogId) ?? [];
      existingEntries.push(entry);
      assignmentMap.set(entry.blogId, existingEntries);
      assignedBlogIdSet.add(entry.blogId);
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
    return { error: { kind: "blogs", message: "Failed to load blog tasks." } };
  }

  const blogs = normalizeBlogRows(
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
    const fallbackResult = await fetchSocialRows(false);
    socialRows = fallbackResult.data;
    socialError = fallbackResult.error;
  }
  if (socialError) {
    return { error: { kind: "social", message: "Failed to load social tasks." } };
  }

  return {
    data: {
      blogs,
      assignments,
      assignmentMap,
      socialRows: (socialRows ?? []) as Array<Record<string, unknown>>,
    },
  };
}
