import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { requirePermission } from "@/lib/server-permissions";
import { resolveNames } from "@/lib/user-matching";
import { withApiContract } from "@/lib/api-contract";

const resolveNamesRequestSchema = z.object({
  names: z.array(z.string().min(1)).min(1),
});

export const POST = withApiContract(async function POST(request: NextRequest) {
  try {
    const auth = await requirePermission(request, "run_data_import");
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const body = await request.json();
    const parsed = resolveNamesRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid request body" },
        { status: 400 }
      );
    }

    const adminClient = auth.context.adminClient;

    // Fetch all active users with necessary fields
    const { data: users, error: usersError } = await adminClient
      .from("profiles")
      .select("id,full_name,display_name,username,email,role,first_name,last_name")
      .eq("is_active", true);

    if (usersError) {
      return NextResponse.json({ error: usersError.message }, { status: 400 });
    }

    // Resolve names using matching library
    const resolutions = resolveNames(parsed.data.names, users ?? []);

    return NextResponse.json({
      resolutions,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Unexpected server error" }, { status: 500 });
  }
});
