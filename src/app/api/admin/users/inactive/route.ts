import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { getUserRoles } from "@/lib/roles";
import { requirePermission } from "@/lib/server-permissions";

const INACTIVE_USERS_PURGE_CONFIRMATION_TEXT = "DELETE INACTIVE USERS";

const purgeInactiveUsersSchema = z.object({
  confirmationText: z.string().min(1),
});

type InactiveProfile = {
  id: string;
  full_name: string;
  is_active: boolean;
};

export async function DELETE(request: NextRequest) {
  try {
    const auth = await requirePermission(request, "delete_user");
    if ("error" in auth) {
      return NextResponse.json(
        { error: auth.error },
        { status: auth.status }
      );
    }

    const roles = getUserRoles(auth.context.profile);
    if (!roles.includes("admin")) {
      return NextResponse.json(
        { error: "Only admins can purge inactive users." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const parsed = purgeInactiveUsersSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid request body" },
        { status: 400 }
      );
    }

    if (
      parsed.data.confirmationText.trim() !==
      INACTIVE_USERS_PURGE_CONFIRMATION_TEXT
    ) {
      return NextResponse.json(
        {
          error: `Confirmation text mismatch. Type exactly "${INACTIVE_USERS_PURGE_CONFIRMATION_TEXT}".`,
        },
        { status: 400 }
      );
    }

    const adminClient = auth.context.adminClient;
    const { data: profilesData, error: profilesError } = await adminClient
      .from("profiles")
      .select("id,full_name,is_active")
      .eq("is_active", false)
      .order("created_at", { ascending: true });
    if (profilesError) {
      return NextResponse.json(
        { error: profilesError.message },
        { status: 400 }
      );
    }

    const inactiveProfiles = (profilesData ?? []) as InactiveProfile[];
    const inactiveUserIds = Array.from(
      new Set(inactiveProfiles.map((profile) => profile.id))
    );
    if (inactiveUserIds.length === 0) {
      return NextResponse.json({
        candidateCount: 0,
        deletedCount: 0,
        failed: [],
      });
    }

    if (inactiveUserIds.includes(auth.context.userId)) {
      return NextResponse.json(
        {
          error:
            "Your account is marked inactive. Reactivate your account before purging inactive users.",
        },
        { status: 400 }
      );
    }

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
          (normalizedMessage.includes("could not find") &&
            normalizedMessage.includes("schema cache"));
        if (isMissingSchemaResource) {
          continue;
        }

        return `${table}: ${error.message}`;
      }

      return null;
    };

    const failed: Array<{ userId: string; error: string }> = [];
    const deletedUserIds: string[] = [];

    for (const userId of inactiveUserIds) {
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

      let { error: deleteAuthError } = await adminClient.auth.admin.deleteUser(
        userId
      );
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

      const { error: deleteProfileError } = await adminClient
        .from("profiles")
        .delete()
        .eq("id", userId);
      if (deleteProfileError) {
        failed.push({ userId, error: deleteProfileError.message });
        continue;
      }

      deletedUserIds.push(userId);
    }

    if (deletedUserIds.length === 0 && failed.length > 0) {
      return NextResponse.json(
        {
          error: failed[0]?.error ?? "Failed to purge inactive users.",
          candidateCount: inactiveUserIds.length,
          deletedCount: 0,
          deletedUserIds,
          failed,
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      candidateCount: inactiveUserIds.length,
      deletedCount: deletedUserIds.length,
      deletedUserIds,
      failed,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Unexpected server error" },
      { status: 500 }
    );
  }
}
