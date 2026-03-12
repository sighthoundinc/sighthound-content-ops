import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { createAdminClient, createAnonServerClient } from "@/lib/supabase/server";
import type { AppRole } from "@/lib/types";

const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  fullName: z.string().min(2),
  role: z.enum(["admin", "writer", "publisher", "editor"]),
  userRoles: z.array(z.enum(["admin", "writer", "publisher", "editor"])).optional(),
});

async function requireAdmin(request: NextRequest) {
  const authorization = request.headers.get("authorization") ?? "";
  const token = authorization.startsWith("Bearer ")
    ? authorization.slice("Bearer ".length)
    : null;

  if (!token) {
    return { error: "Missing access token", status: 401 } as const;
  }

  const anonClient = createAnonServerClient();
  const { data: userData, error: userError } = await anonClient.auth.getUser(token);
  if (userError || !userData.user) {
    return { error: "Invalid session", status: 401 } as const;
  }
  const adminClient = createAdminClient();
  const { data: profile, error: profileError } = await adminClient
    .from("profiles")
    .select("id,role,user_roles")
    .eq("id", userData.user.id)
    .eq("is_active", true)
    .maybeSingle();
  const roleSet = new Set<string>([
    profile?.role ?? "",
    ...((profile?.user_roles as string[] | null | undefined) ?? []),
  ]);
  if (profileError || !profile || !roleSet.has("admin")) {
    return { error: "Admin access required", status: 403 } as const;
  }

  return { userId: userData.user.id } as const;
}

export async function POST(request: NextRequest) {
  try {
    const adminCheck = await requireAdmin(request);
    if ("error" in adminCheck) {
      return NextResponse.json(
        { error: adminCheck.error },
        { status: adminCheck.status }
      );
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
    const adminClient = createAdminClient();
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
      return NextResponse.json(
        { error: createUserError?.message ?? "Could not create user" },
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
}
