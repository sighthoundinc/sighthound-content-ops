import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/server-permissions";
import { getUserRoles } from "@/lib/roles";
import { withApiContract } from "@/lib/api-contract";
import { getSocialTaskActionState } from "@/lib/task-action-state";
import {
  ACTIVE_SOCIAL_STATUSES,
  assertValidStatus,
  initialPublisherCounts,
  initialSocialPostCounts,
  initialWriterCounts,
} from "@/lib/task-logic";
import type { SocialPostStatus } from "@/lib/types";

interface DashboardSummary {
  writerCounts: Record<string, number>;
  publisherCounts: Record<string, number>;
  socialPostCounts: Record<string, number>;
  userRoles: string[];
}

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
    const summary: DashboardSummary = {
      writerCounts: initialWriterCounts(),
      publisherCounts: initialPublisherCounts(),
      socialPostCounts: initialSocialPostCounts(),
      userRoles,
    };

    // Fetch blog writer status counts (exclude published, assigned to current user)
    if (userRoles.includes("writer") || userRoles.includes("admin")) {
      const { data: blogWriterCounts, error: writerError } = await adminClient
        .from("blogs")
        .select("writer_status")
        .eq("writer_id", profile.id)
        .neq("overall_status", "published")
        .not("writer_status", "is", null);

      if (writerError) {
        console.error("Error fetching writer counts:", writerError);
      } else if (blogWriterCounts && Array.isArray(blogWriterCounts)) {
        blogWriterCounts.forEach((row: Record<string, unknown>) => {
          const status = row.writer_status as string | undefined;
          if (status) {
            assertValidStatus(status, "writer");
          }
          if (status && status in summary.writerCounts) {
            (summary.writerCounts[status] as number)++;
          }
        });
      }
    }

    // Fetch blog publisher status counts (exclude published, only where writer completed and assigned to current user)
    if (userRoles.includes("publisher") || userRoles.includes("admin")) {
      const { data: blogPublisherCounts, error: publisherError } = await adminClient
        .from("blogs")
        .select("publisher_status")
        .eq("writer_status", "completed")
        .eq("publisher_id", profile.id)
        .neq("overall_status", "published")
        .not("publisher_status", "is", null);

      if (publisherError) {
        console.error("Error fetching publisher counts:", publisherError);
      } else if (blogPublisherCounts && Array.isArray(blogPublisherCounts)) {
        blogPublisherCounts.forEach((row: Record<string, unknown>) => {
          const status = row.publisher_status as string | undefined;
          if (status) {
            assertValidStatus(status, "publisher");
          }
          if (status && status in summary.publisherCounts) {
            (summary.publisherCounts[status] as number)++;
          }
        });
      }
    }

    // Fetch social post status counts (assignment-scoped, active statuses only)
    if (
      userRoles.includes("admin") ||
      userRoles.includes("publisher") ||
      userRoles.includes("editor") ||
      userRoles.includes("writer")
    ) {
      const { data: socialRows, error: socialError } = await adminClient
        .from("social_posts")
        .select("status,created_by,worker_user_id,reviewer_user_id")
        .in("status", ACTIVE_SOCIAL_STATUSES)
        .or(
          `worker_user_id.eq.${profile.id},reviewer_user_id.eq.${profile.id},created_by.eq.${profile.id}`
        );

      if (socialError) {
        console.error("Error fetching social post counts:", socialError);
      } else if (socialRows && Array.isArray(socialRows)) {
        ((socialRows ?? []) as unknown as Array<Record<string, unknown>>).forEach((row) => {
          const status = row.status as SocialPostStatus | undefined;
          if (!status) {
            return;
          }
          assertValidStatus(status, "social");
          const actionState = getSocialTaskActionState({
            status,
            userId: profile.id,
            isAdmin: userRoles.includes("admin"),
            createdBy: typeof row.created_by === "string" ? row.created_by : null,
            workerUserId:
              typeof row.worker_user_id === "string" ? row.worker_user_id : null,
            reviewerUserId:
              typeof row.reviewer_user_id === "string"
                ? row.reviewer_user_id
                : null,
            assignedToUserId: null,
            editorUserId: null,
            adminOwnerId: null,
          });
          if (actionState !== "action_required") {
            return;
          }
          if (status in summary.socialPostCounts) {
            (summary.socialPostCounts[status] as number)++;
          }
        });
      }
    }

    return NextResponse.json(summary);
  } catch (error) {
    console.error("Error in dashboard summary endpoint:", error instanceof Error ? error.message : error);
    return NextResponse.json(
      { error: "Failed to fetch work summary" },
      { status: 500 }
    );
  }
});
