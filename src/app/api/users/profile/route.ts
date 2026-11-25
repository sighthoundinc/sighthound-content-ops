import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { authenticateRequest, hasPermission } from "@/lib/server-permissions";
import { withApiContract } from "@/lib/api-contract";
import { isValidRoleSet } from "@/lib/roles";
import { ACTIVE_SOCIAL_STATUSES } from "@/lib/task-logic";

const updateProfileSchema = z.object({
  targetUserId: z.string().uuid().optional(),
  firstName: z.string().trim().max(100).optional().nullable(),
  lastName: z.string().trim().max(100).optional().nullable(),
  displayName: z.string().trim().max(200).optional().nullable(),
  timezone: z.string().trim().min(1).max(100).optional(),
  weekStart: z.number().int().min(0).max(6).optional(),
  staleDraftDays: z.number().int().min(1).max(120).optional(),
  isActive: z.boolean().optional(),
  userRoles: z.array(z.enum(["admin", "writer", "publisher", "editor", "viewer"])).optional(),
});

function toNullableTrimmed(value: string | null | undefined) {
  if (value === undefined) {
    return undefined;
  }
  if (value === null) {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export const PATCH = withApiContract(async function PATCH(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request);
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }
    const { context } = auth;

    const body = await request.json();
    const parsed = updateProfileSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid request body" },
        { status: 400 }
      );
    }

    const adminClient = context.adminClient;
    const targetUserId = parsed.data.targetUserId ?? context.userId;
    const isSelfUpdate = targetUserId === context.userId;
    const canManageUsers = hasPermission(context, "manage_users");
    const canManageRoles = hasPermission(context, "assign_roles");

    if (!isSelfUpdate && !canManageUsers) {
      return NextResponse.json(
        { error: "You can only edit your own profile." },
        { status: 403 }
      );
    }
    if (parsed.data.userRoles && !canManageRoles) {
      return NextResponse.json(
        { error: "Only admins can edit user roles." },
        { status: 403 }
      );
    }
    const becomesViewer = Boolean(parsed.data.userRoles?.includes("viewer"));
    if (parsed.data.userRoles && !isValidRoleSet(parsed.data.userRoles)) {
      return NextResponse.json(
        { error: "Viewer is read-only and cannot be combined with other roles." },
        { status: 400 }
      );
    }
    if (becomesViewer && isSelfUpdate) {
      return NextResponse.json(
        { error: "You cannot make yourself a viewer." },
        { status: 400 }
      );
    }
    if (parsed.data.isActive !== undefined && !canManageUsers) {
      return NextResponse.json(
        { error: "Only admins can edit user activation state." },
        { status: 403 }
      );
    }

    const firstName = toNullableTrimmed(parsed.data.firstName);
    const lastName = toNullableTrimmed(parsed.data.lastName);
    const displayName = toNullableTrimmed(parsed.data.displayName);
    const timezone = parsed.data.timezone?.trim();
    const weekStart = parsed.data.weekStart;
    const staleDraftDays = parsed.data.staleDraftDays;

    const profileUpdates: Record<string, unknown> = {};
    if (firstName !== undefined) {
      profileUpdates.first_name = firstName;
    }
    if (lastName !== undefined) {
      profileUpdates.last_name = lastName;
    }
    if (displayName !== undefined) {
      profileUpdates.display_name = displayName;
    }
    if (timezone !== undefined) {
      profileUpdates.timezone = timezone.length > 0 ? timezone : "America/New_York";
    }
    if (weekStart !== undefined) {
      profileUpdates.week_start = weekStart;
    }
    if (staleDraftDays !== undefined) {
      profileUpdates.stale_draft_days = staleDraftDays;
    }

    if (parsed.data.userRoles && canManageRoles) {
      const nextUserRoles = Array.from(new Set(parsed.data.userRoles));
      profileUpdates.user_roles = nextUserRoles;
      if (nextUserRoles.length > 0) {
        profileUpdates.role = nextUserRoles[0];
      }
    }
    if (parsed.data.isActive !== undefined && canManageUsers) {
      profileUpdates.is_active = parsed.data.isActive;
    }

    const hasNameUpdates =
      firstName !== undefined || lastName !== undefined || displayName !== undefined;
    if (hasNameUpdates) {
      const { data: currentTargetProfile, error: currentTargetProfileError } = await adminClient
        .from("profiles")
        .select("first_name,last_name,display_name,full_name")
        .eq("id", targetUserId)
        .maybeSingle();
      if (currentTargetProfileError || !currentTargetProfile) {
        return NextResponse.json({ error: "Target profile not found." }, { status: 404 });
      }
      const mergedFirstName =
        firstName !== undefined ? firstName : currentTargetProfile.first_name;
      const mergedLastName = lastName !== undefined ? lastName : currentTargetProfile.last_name;
      const mergedDisplayName =
        displayName !== undefined ? displayName : currentTargetProfile.display_name;
      const mergedFullName =
        mergedDisplayName ||
        [mergedFirstName, mergedLastName].filter(Boolean).join(" ").trim() ||
        currentTargetProfile.full_name;
      profileUpdates.full_name = mergedFullName;
    }

    if (Object.keys(profileUpdates).length === 0) {
      return NextResponse.json({ error: "No valid updates provided." }, { status: 400 });
    }

    const { data: updatedProfile, error: updateError } = await adminClient
      .from("profiles")
      .update(profileUpdates)
      .eq("id", targetUserId)
      .select("*")
      .single();

    if (updateError) {
      console.error("Failed to update profile:", updateError);
      return NextResponse.json({ error: "Failed to update profile. Please try again." }, { status: 400 });
    }

    // A viewer can no longer move work forward, so hand their open work to the
    // admin making the change. That admin can reassign it afterwards.
    if (becomesViewer) {
      const handoffs = await Promise.all([
        adminClient.from("blogs").update({ writer_id: context.userId })
          .eq("writer_id", targetUserId).neq("writer_status", "completed"),
        adminClient.from("blogs").update({ publisher_id: context.userId })
          .eq("publisher_id", targetUserId).neq("publisher_status", "completed"),
        adminClient.from("social_posts").update({ worker_user_id: context.userId })
          .eq("worker_user_id", targetUserId).in("status", ACTIVE_SOCIAL_STATUSES),
        adminClient.from("social_posts").update({ reviewer_user_id: context.userId })
          .eq("reviewer_user_id", targetUserId).in("status", ACTIVE_SOCIAL_STATUSES),
      ]);
      const handoffError = handoffs.find((result) => result.error)?.error;
      if (handoffError) {
        console.error("Viewer handoff failed:", handoffError);
        return NextResponse.json({
          profile: updatedProfile,
          warning: "Role updated, but some open work could not be reassigned. Reassign it manually.",
        });
      }
    }

    return NextResponse.json({ profile: updatedProfile });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Unexpected server error" }, { status: 500 });
  }
});
