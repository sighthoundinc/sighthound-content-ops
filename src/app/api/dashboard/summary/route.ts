import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/server-permissions";
import { getUserRoles } from "@/lib/roles";
import { withApiContract } from "@/lib/api-contract";

interface DashboardSummary {
  writerCounts: Record<string, number>;
  publisherCounts: Record<string, number>;
  socialPostCounts: Record<string, number>;
  userRoles: string[];
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

    // Fetch social post status counts (specific statuses only)
    if (userRoles.includes("admin") || userRoles.includes("publisher")) {
      const { data: socialPostData, error: socialError } = await adminClient
        .from("social_posts")
        .select("status")
        .in("status", ["awaiting_live_link", "in_review"]);

      if (socialError) {
        console.error("Error fetching social post counts:", socialError);
      } else if (socialPostData && Array.isArray(socialPostData)) {
        socialPostData.forEach((row: Record<string, unknown>) => {
          const status = row.status as string | undefined;
          if (status && status in summary.socialPostCounts) {
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
