import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/server-permissions";
import { getUserRoles } from "@/lib/roles";
import { withApiContract } from "@/lib/api-contract";
import { getSocialTaskActionState } from "@/lib/task-action-state";
import type { SocialPostStatus } from "@/lib/types";

interface DashboardSummary {
  writerCounts: Record<string, number>;
  publisherCounts: Record<string, number>;
  socialPostCounts: Record<string, number>;
  userRoles: string[];
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

export const GET = withApiContract(async function GET(request: NextRequest) {
  try {
    const auth = await requirePermission(request, "view_writing_queue");
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
      writerCounts: {
        not_started: 0,
        in_progress: 0,
        needs_revision: 0,
        completed: 0,
      },
      publisherCounts: {
        not_started: 0,
        in_progress: 0,
        completed: 0,
      },
      socialPostCounts: {
        awaiting_live_link: 0,
        in_review: 0,
        ready_to_publish: 0,
      },
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
          if (status && status in summary.publisherCounts) {
            (summary.publisherCounts[status] as number)++;
          }
        });
      }
    }

    // Fetch social post status counts (assignment-scoped + specific statuses only)
    if (
      userRoles.includes("admin") ||
      userRoles.includes("publisher") ||
      userRoles.includes("editor") ||
      userRoles.includes("writer")
    ) {
      let socialRows: Array<Record<string, unknown>> | null = null;
      let socialError: { message: string } | null = null;

      const scopedSocial = await adminClient
        .from("social_posts")
        .select("status,created_by,assigned_to_user_id,worker_user_id,reviewer_user_id,editor_user_id,admin_owner_id")
        .in("status", ["awaiting_live_link", "in_review", "ready_to_publish"])
        .or(
          `assigned_to_user_id.eq.${profile.id},worker_user_id.eq.${profile.id},reviewer_user_id.eq.${profile.id},created_by.eq.${profile.id},editor_user_id.eq.${profile.id},admin_owner_id.eq.${profile.id}`
        );

      socialRows = scopedSocial.data as Array<Record<string, unknown>> | null;
      socialError = scopedSocial.error as { message: string } | null;

      if (socialError && isMissingSocialOwnershipColumnError(socialError.message)) {
        const fallbackWithLegacyOwners = await adminClient
          .from("social_posts")
          .select("status,created_by,editor_user_id,admin_owner_id")
          .in("status", ["awaiting_live_link", "in_review", "ready_to_publish"])
          .or(`created_by.eq.${profile.id},editor_user_id.eq.${profile.id},admin_owner_id.eq.${profile.id}`);
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
          .select("status,created_by")
          .in("status", ["awaiting_live_link", "in_review", "ready_to_publish"])
          .eq("created_by", profile.id);
        socialRows = fallbackCreatedByOnly.data as Array<Record<string, unknown>> | null;
        socialError = fallbackCreatedByOnly.error as { message: string } | null;
      }

      if (socialError) {
        console.error("Error fetching social post counts:", socialError);
      } else if (socialRows && Array.isArray(socialRows)) {
        socialRows.forEach((row: Record<string, unknown>) => {
          const status = row.status as SocialPostStatus | undefined;
          if (!status) {
            return;
          }
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
