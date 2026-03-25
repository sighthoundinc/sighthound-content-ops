import { NextRequest, NextResponse } from "next/server";

import { requirePermission } from "@/lib/server-permissions";
import { withApiContract } from "@/lib/api-contract";
import { getUserRoles } from "@/lib/roles";

export const POST = withApiContract(async function POST(request: NextRequest) {
  try {
    const auth = await requirePermission(request, "manage_users");
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const callerRoles = getUserRoles(auth.context.profile);
    if (!callerRoles.includes("admin")) {
      return NextResponse.json(
        { error: "Only admins can run diagnostics." },
        { status: 403 }
      );
    }

    const adminClient = auth.context.adminClient;
    const diagnostics: Record<string, unknown> = {};

    // Test 1: Can we list users?
    try {
      const { data: users, error: listError } =
        await adminClient.auth.admin.listUsers({ page: 1, perPage: 1 });
      diagnostics.listUsers = {
        success: !listError,
        error: listError?.message,
        userCount: users?.users?.length ?? 0,
      };
    } catch (err) {
      diagnostics.listUsers = {
        success: false,
        error: err instanceof Error ? err.message : "Unknown error",
      };
    }

    // Test 2: Can we check profiles table?
    try {
      const { data: profiles, error: profileError } = await adminClient
        .from("profiles")
        .select("id")
        .limit(1);
      diagnostics.profiles = {
        success: !profileError,
        error: profileError?.message,
        profileCount: profiles?.length ?? 0,
      };
    } catch (err) {
      diagnostics.profiles = {
        success: false,
        error: err instanceof Error ? err.message : "Unknown error",
      };
    }

    // Test 3: Try creating a test user with hardcoded values
    try {
      const testEmail = `diagnostic-${Date.now()}@test.local`;
      const { data: createdUser, error: createError } =
        await adminClient.auth.admin.createUser({
          email: testEmail,
          password: "TestPassword123!",
          email_confirm: true,
        });
      diagnostics.createUser = {
        success: !createError,
        error: createError?.message,
        code: createError?.code,
        status: createError?.status,
        userId: createdUser?.user?.id ?? null,
      };

      // If creation succeeded, try to delete the test user
      if (createdUser?.user?.id) {
        const { error: deleteError } = await adminClient.auth.admin.deleteUser(
          createdUser.user.id
        );
        diagnostics.cleanupTestUser = {
          success: !deleteError,
          error: deleteError?.message,
        };
      }
    } catch (err) {
      diagnostics.createUser = {
        success: false,
        error: err instanceof Error ? err.message : "Unknown error",
      };
    }

    // Test 4: Check if specific email exists
    try {
      const { data: users, error: checkError } =
        await adminClient.auth.admin.listUsers({ page: 1, perPage: 1000 });
      const testEmails = ["test@sighthound.com"];
      const foundEmails = (users?.users ?? [])
        .filter((u) => testEmails.includes(u.email ?? ""))
        .map((u) => ({ email: u.email, id: u.id, created_at: u.created_at }));

      diagnostics.emailCheck = {
        success: !checkError,
        error: checkError?.message,
        foundEmails,
      };
    } catch (err) {
      diagnostics.emailCheck = {
        success: false,
        error: err instanceof Error ? err.message : "Unknown error",
      };
    }

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      adminUserId: auth.context.userId,
      diagnostics,
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unexpected server error";
    console.error(error);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
});
