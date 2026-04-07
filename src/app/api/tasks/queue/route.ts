import { NextRequest, NextResponse } from "next/server";

import { withApiContract } from "@/lib/api-contract";
import { requirePermission } from "@/lib/server-permissions";
import { fetchSharedTaskClassificationInputs } from "@/lib/server-task-classification-inputs";

export const GET = withApiContract(async function GET(request: NextRequest) {
  try {
    const auth = await requirePermission(request, "view_my_tasks");
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { profile, adminClient } = auth.context;
    if (!profile) {
      return NextResponse.json({ error: "User profile not found." }, { status: 401 });
    }

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

    const { blogs, assignments, socialRows } = sharedInputs.data;
    return NextResponse.json({
      blogs,
      assignments,
      socialRows,
    });
  } catch (error) {
    console.error(
      "Error in tasks queue endpoint:",
      error instanceof Error ? error.message : error
    );
    return NextResponse.json(
      { error: "Failed to fetch tasks queue." },
      { status: 500 }
    );
  }
});
