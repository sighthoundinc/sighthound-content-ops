import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withApiContract } from "@/lib/api-contract";

import { hasPermission, requirePermission } from "@/lib/server-permissions";
import type { AppRole } from "@/lib/types";

const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  fullName: z.string().min(2),
  role: z.enum(["admin", "writer", "publisher", "editor"]),
  userRoles: z.array(z.enum(["admin", "writer", "publisher", "editor"])).optional(),
});
const deleteUsersSchema = z.object({
  userIds: z.array(z.string().uuid()).min(1),
});


export const POST = withApiContract(async function POST(request: NextRequest) {
  try {
    const auth = await requirePermission(request, "manage_users");
    if ("error" in auth) {
      return NextResponse.json(
        { error: auth.error },
        { status: auth.status }
      );
    }
    if (!hasPermission(auth.context, "assign_roles")) {
      return NextResponse.json({ error: "Permission denied" }, { status: 403 });
    }

    const body = await request.json();
    const parsed = createUserSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid request body" },
        { status: 400 }
      );
    }

    const { email, password, fullName, role, userRoles } = parsed.data;
    const normalizedUserRoles = Array.from(new Set(userRoles?.length ? userRoles : [role]));
    const [firstName, ...restName] = fullName.trim().split(/\s+/);
    const lastName = restName.length ? restName.join(" ") : null;
    const adminClient = auth.context.adminClient;
    const { data: createdUserData, error: createUserError } =
      await adminClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          full_name: fullName,
          role,
          user_roles: normalizedUserRoles,
        },
      });

    if (createUserError || !createdUserData.user) {
      const errorMsg = createUserError?.message ?? "Could not create user";
      console.error(`User creation failed for ${email}:`, {
        error: errorMsg,
        code: createUserError?.code,
        details: createUserError?.status,
      });
      // Provide more actionable error for common cases
      if (errorMsg.toLowerCase().includes("already exists")) {
        return NextResponse.json(
          {
            error: `User with email "${email}" already exists in auth system. Try cleanup endpoint or contact admin.`,
          },
          { status: 400 }
        );
      }
      return NextResponse.json(
        { error: `Database error creating new user: ${errorMsg}` },
        { status: 400 }
      );
    }

    const profilePayload = {
      id: createdUserData.user.id,
      email,
      full_name: fullName,
      role: role as AppRole,
      first_name: firstName || null,
      last_name: lastName,
      display_name: fullName,
      user_roles: normalizedUserRoles,
      is_active: true,
    };

    const { error: upsertError } = await adminClient
      .from("profiles")
      .upsert(profilePayload, { onConflict: "id" });

    if (upsertError) {
      return NextResponse.json({ error: upsertError.message }, { status: 400 });
    }

    return NextResponse.json({
      id: createdUserData.user.id,
      email,
      role,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Unexpected server error" },
      { status: 500 }
    );
  }
});

export const DELETE = withApiContract(async function DELETE(request: NextRequest) {
  try {
    const auth = await requirePermission(request, "delete_user");
    if ("error" in auth) {
      return NextResponse.json(
        { error: auth.error },
        { status: auth.status }
      );
    }

    const body = await request.json();
    const parsed = deleteUsersSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid request body" },
        { status: 400 }
      );
    }

    const normalizedUserIds = Array.from(new Set(parsed.data.userIds));
    if (normalizedUserIds.includes(auth.context.userId)) {
      return NextResponse.json(
        { error: "You cannot delete your own account." },
        { status: 400 }
      );
    }

    const adminClient = auth.context.adminClient;
    const deletedUserIds: string[] = [];
    const failed: Array<{ userId: string; error: string }> = [];
    const reassignCreatedContentOwnership = async (
      fromUserId: string,
      toUserId: string
    ) => {
      const ownershipTables = [
        "blogs",
        "social_posts",
        "blog_ideas",
        "blog_idea_comments",
      ] as const;

      for (const table of ownershipTables) {
        const { error } = await adminClient
          .from(table)
          .update({ created_by: toUserId })
          .eq("created_by", fromUserId);

        if (!error) {
          continue;
        }

        const normalizedMessage = error.message.toLowerCase();
        const normalizedCode = (error.code ?? "").toLowerCase();
        const isMissingSchemaResource =
          normalizedCode === "42p01" ||
          normalizedCode === "42703" ||
          normalizedCode === "pgrst204" ||
          normalizedCode === "pgrst205" ||
          normalizedMessage.includes("does not exist") ||
          normalizedMessage.includes("could not find the table") ||
          (normalizedMessage.includes("could not find")
            && normalizedMessage.includes("schema cache"));
        if (!isMissingSchemaResource) {
          return `${table}: ${error.message}`;
        }
      }

      return null;
    };

    for (const userId of normalizedUserIds) {
      const reassignmentError = await reassignCreatedContentOwnership(
        userId,
        auth.context.userId
      );
      if (reassignmentError) {
        failed.push({
          userId,
          error: `Unable to reassign authored content before delete: ${reassignmentError}`,
        });
        continue;
      }
      let { error: deleteAuthError } = await adminClient.auth.admin.deleteUser(userId);
      const isDatabaseDeleteError =
        deleteAuthError?.message
          ?.toLowerCase()
          .includes("database error deleting user") ?? false;
      if (isDatabaseDeleteError) {
        const retryReassignmentError = await reassignCreatedContentOwnership(
          userId,
          auth.context.userId
        );
        if (retryReassignmentError) {
          failed.push({
            userId,
            error: `Unable to reassign authored content before delete: ${retryReassignmentError}`,
          });
          continue;
        }

        const retryDeleteResult = await adminClient.auth.admin.deleteUser(userId);
        deleteAuthError = retryDeleteResult.error;
      }
      const shouldAttemptSoftDelete =
        deleteAuthError?.message
          ?.toLowerCase()
          .includes("database error deleting user") ?? false;
      if (shouldAttemptSoftDelete) {
        const softDeleteResult = await adminClient.auth.admin.deleteUser(userId, true);
        deleteAuthError = softDeleteResult.error;
      }
      if (deleteAuthError) {
        failed.push({ userId, error: deleteAuthError.message });
        continue;
      }

      const { error: deactivateProfileError } = await adminClient
        .from("profiles")
        .update({ is_active: false })
        .eq("id", userId);

      if (deactivateProfileError) {
        failed.push({ userId, error: deactivateProfileError.message });
        continue;
      }

      deletedUserIds.push(userId);
    }

    if (deletedUserIds.length === 0) {
      return NextResponse.json(
        {
          error: failed[0]?.error ?? "Failed to delete users.",
          deletedUserIds,
          failed,
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      deletedUserIds,
      deletedCount: deletedUserIds.length,
      failed,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Unexpected server error" },
      { status: 500 }
    );
  }
});
