import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { isMissingUserRolesColumnError } from "@/lib/profile-schema";

import { createAdminClient, createAnonServerClient } from "@/lib/supabase/server";

const updateProfileSchema = z.object({
  targetUserId: z.string().uuid().optional(),
  firstName: z.string().trim().max(100).optional().nullable(),
  lastName: z.string().trim().max(100).optional().nullable(),
  displayName: z.string().trim().max(200).optional().nullable(),
  userRoles: z.array(z.enum(["admin", "writer", "publisher", "editor"])).optional(),
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

export async function PATCH(request: NextRequest) {
  try {
    const authorization = request.headers.get("authorization") ?? "";
    const token = authorization.startsWith("Bearer ")
      ? authorization.slice("Bearer ".length)
      : null;
    if (!token) {
      return NextResponse.json({ error: "Missing access token" }, { status: 401 });
    }

    const anonClient = createAnonServerClient();
    const { data: userData, error: userError } = await anonClient.auth.getUser(token);
    if (userError || !userData.user) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = updateProfileSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid request body" },
        { status: 400 }
      );
    }

    const adminClient = createAdminClient();
    let { data: requesterProfile, error: requesterProfileError } = await adminClient
      .from("profiles")
      .select("id,role,user_roles,is_active")
      .eq("id", userData.user.id)
      .eq("is_active", true)
      .maybeSingle();
    if (isMissingUserRolesColumnError(requesterProfileError)) {
      const fallbackRequesterQuery = await adminClient
        .from("profiles")
        .select("id,role,is_active")
        .eq("id", userData.user.id)
        .eq("is_active", true)
        .maybeSingle();
      requesterProfile = fallbackRequesterQuery.data as typeof requesterProfile;
      requesterProfileError = fallbackRequesterQuery.error;
    }

    if (requesterProfileError || !requesterProfile) {
      return NextResponse.json({ error: "Active profile not found" }, { status: 403 });
    }

    const requesterRoles = new Set<string>([
      requesterProfile.role,
      ...((requesterProfile.user_roles as string[] | null | undefined) ?? []),
    ]);
    const isRequesterAdmin = requesterRoles.has("admin");
    const targetUserId = parsed.data.targetUserId ?? userData.user.id;
    const isSelfUpdate = targetUserId === userData.user.id;

    if (!isSelfUpdate && !isRequesterAdmin) {
      return NextResponse.json(
        { error: "You can only edit your own profile." },
        { status: 403 }
      );
    }

    if (parsed.data.userRoles && !isRequesterAdmin) {
      return NextResponse.json(
        { error: "Only admins can edit user roles." },
        { status: 403 }
      );
    }

    const firstName = toNullableTrimmed(parsed.data.firstName);
    const lastName = toNullableTrimmed(parsed.data.lastName);
    const displayName = toNullableTrimmed(parsed.data.displayName);

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

    if (parsed.data.userRoles && isRequesterAdmin) {
      const nextUserRoles = Array.from(new Set(parsed.data.userRoles));
      profileUpdates.user_roles = nextUserRoles;
      if (nextUserRoles.length > 0) {
        profileUpdates.role = nextUserRoles[0];
      }
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
      return NextResponse.json({ error: updateError.message }, { status: 400 });
    }

    return NextResponse.json({ profile: updatedProfile });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Unexpected server error" }, { status: 500 });
  }
}
