import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { getUserRoles } from "@/lib/roles";
import { authenticateRequest } from "@/lib/server-permissions";
import { withApiContract } from "@/lib/api-contract";

const quickViewSchema = z.object({
  targetUserId: z.string().uuid(),
});

export const POST = withApiContract(async function POST(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request);
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const callerRoles = getUserRoles(auth.context.profile);
    if (!callerRoles.includes("admin")) {
      return NextResponse.json(
        { error: "Only admins can start quick-view mode." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const parsed = quickViewSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid request body." },
        { status: 400 }
      );
    }

    const { targetUserId } = parsed.data;
    if (targetUserId === auth.context.userId) {
      return NextResponse.json(
        { error: "Select a different user to quick-view as." },
        { status: 400 }
      );
    }

    const adminClient = auth.context.adminClient;
    const { data: targetProfile, error: targetProfileError } = await adminClient
      .from("profiles")
      .select("id,email,full_name,display_name,role,user_roles,is_active")
      .eq("id", targetUserId)
      .maybeSingle();
    if (targetProfileError) {
      return NextResponse.json({ error: targetProfileError.message }, { status: 400 });
    }
    if (!targetProfile || !targetProfile.is_active) {
      return NextResponse.json(
        { error: "Target user not found or inactive." },
        { status: 404 }
      );
    }

    const targetRoles = getUserRoles(targetProfile);
    if (targetRoles.includes("admin")) {
      return NextResponse.json(
        { error: "Quick-view supports non-admin users only." },
        { status: 400 }
      );
    }

    const { data: generatedLinkData, error: generateLinkError } =
      await adminClient.auth.admin.generateLink({
        type: "magiclink",
        email: targetProfile.email,
        options: {
          redirectTo: `${request.nextUrl.origin}/tasks?action=action_required`,
        },
      });

    if (generateLinkError) {
      return NextResponse.json({ error: generateLinkError.message }, { status: 400 });
    }

    const tokenHash = generatedLinkData.properties?.hashed_token;
    if (!tokenHash) {
      return NextResponse.json(
        { error: "Unable to generate quick-view token." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      tokenHash,
      targetUserId: targetProfile.id,
      targetDisplayName:
        targetProfile.display_name || targetProfile.full_name || targetProfile.email,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Unexpected server error" },
      { status: 500 }
    );
  }
});
