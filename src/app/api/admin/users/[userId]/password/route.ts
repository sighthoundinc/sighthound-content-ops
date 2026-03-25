import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { requirePermission } from "@/lib/server-permissions";
import { withApiContract } from "@/lib/api-contract";

const resetPasswordSchema = z.object({
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export const PATCH = withApiContract(async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const auth = await requirePermission(request, "manage_users");
    if ("error" in auth) {
      return NextResponse.json(
        { error: auth.error },
        { status: auth.status }
      );
    }

    const { userId } = await params;
    const adminClient = auth.context.adminClient;

    // Validate userId format
    if (!userId || typeof userId !== "string") {
      return NextResponse.json(
        { error: "Invalid user ID" },
        { status: 400 }
      );
    }

    // Parse request body
    const body = await request.json();
    const parsed = resetPasswordSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid password" },
        { status: 400 }
      );
    }

    const { password } = parsed.data;

    // Attempt to reset the password
    const { data, error } = await adminClient.auth.admin.updateUserById(userId, {
      password,
    });

    if (error) {
      console.error("Password reset error:", error);
      return NextResponse.json(
        { error: error.message ?? "Failed to reset password" },
        { status: 400 }
      );
    }

    if (!data.user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Password reset for ${data.user.email}`,
      email: data.user.email,
    });
  } catch (error) {
    console.error("Password reset endpoint error:", error);
    return NextResponse.json(
      { error: "Unexpected server error" },
      { status: 500 }
    );
  }
});
