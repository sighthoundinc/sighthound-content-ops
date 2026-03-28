import { NextRequest, NextResponse } from "next/server";

import { requirePermission } from "@/lib/server-permissions";
import { withApiContract } from "@/lib/api-contract";
import { getUserRoles } from "@/lib/roles";

export const POST = withApiContract(async function POST(request: NextRequest) {
  try {
    const auth = await requirePermission(request, "delete_user");
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const callerRoles = getUserRoles(auth.context.profile);
    if (!callerRoles.includes("admin")) {
      return NextResponse.json(
        { error: "Only admins can clean up orphaned auth users." },
        { status: 403 }
      );
    }

    const adminClient = auth.context.adminClient;

    // List all auth users
    const allUserIds: string[] = [];
    const perPage = 1000;
    let page = 1;

    while (true) {
      const { data, error } = await adminClient.auth.admin.listUsers({
        page,
        perPage,
      });
      if (error) {
        throw new Error(`Failed to list auth users: ${error.message}`);
      }

      const users = data.users ?? [];
      allUserIds.push(...users.map((user) => user.id));
      if (users.length < perPage) {
        break;
      }
      page += 1;
    }

    // Find orphaned users (auth.users with no corresponding profile)
    const { data: profileIds, error: profileError } = await adminClient
      .from("profiles")
      .select("id");

    if (profileError) {
      throw new Error(`Failed to load profiles: ${profileError.message}`);
    }

    const profileIdSet = new Set((profileIds ?? []).map((p) => p.id));
    const orphanedUserIds = allUserIds.filter((id) => !profileIdSet.has(id));

    if (orphanedUserIds.length === 0) {
      return NextResponse.json({
        message: "No orphaned auth users found.",
        deletedCount: 0,
        failedDeletes: [],
      });
    }

    // Delete orphaned auth users
    const failedDeletes: Array<{ userId: string; error: string }> = [];
    let deletedCount = 0;

    for (const userId of orphanedUserIds) {
      const { error: deleteError } = await adminClient.auth.admin.deleteUser(
        userId
      );
      if (deleteError) {
        failedDeletes.push({ userId, error: "Failed to delete auth user" });
        console.error(`Failed to delete orphaned user ${userId}:`, deleteError);
        continue;
      }
      deletedCount += 1;
    }

    if (failedDeletes.length > 0) {
      return NextResponse.json(
        {
          message: `Cleaned up orphaned auth users with some failures.`,
          deletedCount,
          failedDeletes,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: "Successfully cleaned up all orphaned auth users.",
      deletedCount,
      failedDeletes: [],
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to clean up orphaned auth users. Please try again." }, { status: 500 });
  }
});
