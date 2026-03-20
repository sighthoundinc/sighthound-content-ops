import { NextRequest, NextResponse } from "next/server";

import { getUserRoles } from "@/lib/roles";
import { requirePermission } from "@/lib/server-permissions";
import { createAdminClient } from "@/lib/supabase/server";

type WipeAppCleanRpcResult = {
  truncated_table_count?: number;
  truncated_tables?: string[];
  app_settings_reset?: boolean;
  fallback_used?: boolean;
  fallback_reason?: string;
};
type WipeAppCleanRequestBody = {
  removeOtherAdminProfiles?: boolean;
};
type PostgrestLikeError = {
  code?: string | null;
  message?: string | null;
  details?: string | null;
  hint?: string | null;
};
type PreservedAdminProfile = {
  id: string;
  email: string;
  full_name: string;
  first_name?: string | null;
  last_name?: string | null;
  display_name?: string | null;
  role: "admin" | "writer" | "publisher" | "editor";
  user_roles?: Array<"admin" | "writer" | "publisher" | "editor"> | null;
  is_active: boolean;
};
const PRESERVED_ADMIN_PROFILE_SELECT =
  "id,email,full_name,first_name,last_name,display_name,role,user_roles,is_active";

const FULL_WIPE_TABLES: Array<{ table: string; markerColumn: string }> = [
  { table: "social_post_comments", markerColumn: "id" },
  { table: "social_post_links", markerColumn: "id" },
  { table: "social_post_activity_history", markerColumn: "id" },
  { table: "blog_comments", markerColumn: "id" },
  { table: "blog_idea_comments", markerColumn: "id" },
  { table: "blog_assignment_history", markerColumn: "id" },
  { table: "permission_audit_logs", markerColumn: "id" },
  { table: "notification_events", markerColumn: "id" },
  { table: "blog_import_logs", markerColumn: "id" },
  { table: "role_permissions", markerColumn: "role" },
  { table: "social_posts", markerColumn: "id" },
  { table: "blog_ideas", markerColumn: "id" },
  { table: "blogs", markerColumn: "id" },
  { table: "profiles", markerColumn: "id" },
  { table: "app_settings", markerColumn: "id" },
];

function normalizeErrorText(error: PostgrestLikeError | null | undefined) {
  return `${error?.message ?? ""} ${error?.details ?? ""} ${error?.hint ?? ""}`.toLowerCase();
}

function isMissingSchemaResourceError(error: PostgrestLikeError | null | undefined) {
  if (!error) {
    return false;
  }
  const code = (error.code ?? "").toUpperCase();
  const text = normalizeErrorText(error);
  return (
    code === "42P01" ||
    code === "42703" ||
    code === "PGRST204" ||
    code === "PGRST205" ||
    text.includes("does not exist") ||
    text.includes("could not find the table") ||
    (text.includes("could not find") && text.includes("schema cache"))
  );
}

function isMissingWipeRpcError(error: PostgrestLikeError | null | undefined) {
  if (!error) {
    return false;
  }
  const code = (error.code ?? "").toUpperCase();
  const text = normalizeErrorText(error);
  return (
    code === "PGRST202" ||
    text.includes("could not find the function public.wipe_app_clean_data")
  );
}

async function listAllAuthUserIds(adminClient: ReturnType<typeof createAdminClient>) {
  const allUserIds: string[] = [];
  const perPage = 1000;
  let page = 1;

  while (true) {
    const { data, error } = await adminClient.auth.admin.listUsers({ page, perPage });
    if (error) {
      throw new Error(`Failed to list users: ${error.message}`);
    }

    const users = data.users ?? [];
    allUserIds.push(...users.map((user) => user.id));
    if (users.length < perPage) {
      break;
    }
    page += 1;
  }

  return Array.from(new Set(allUserIds));
}

async function readPreservedAdminProfile(
  adminClient: ReturnType<typeof createAdminClient>,
  userId: string
) {
  const { data, error } = await adminClient
    .from("profiles")
    .select(PRESERVED_ADMIN_PROFILE_SELECT)
    .eq("id", userId)
    .maybeSingle();
  if (error || !data) {
    throw new Error("Could not load acting admin profile before wipe.");
  }
  return data as PreservedAdminProfile;
}
async function readOtherAdminProfiles(
  adminClient: ReturnType<typeof createAdminClient>,
  userId: string
) {
  const { data, error } = await adminClient
    .from("profiles")
    .select(PRESERVED_ADMIN_PROFILE_SELECT)
    .neq("id", userId);
  if (error) {
    throw new Error("Could not load other admin profiles before wipe.");
  }
  const profiles = (data ?? []) as PreservedAdminProfile[];
  return profiles.filter((nextProfile) =>
    nextProfile.user_roles?.length
      ? nextProfile.user_roles.includes("admin")
      : nextProfile.role === "admin"
  );
}

async function restorePreservedAdminProfiles(
  adminClient: ReturnType<typeof createAdminClient>,
  profiles: PreservedAdminProfile[]
) {
  if (profiles.length === 0) {
    return;
  }
  const { error } = await adminClient.from("profiles").upsert(
    profiles.map((profile) => ({
      id: profile.id,
      email: profile.email,
      full_name: profile.full_name,
      first_name: profile.first_name ?? null,
      last_name: profile.last_name ?? null,
      display_name: profile.display_name ?? profile.full_name,
      role: "admin",
      user_roles: ["admin"],
      is_active: true,
    })),
    { onConflict: "id" }
  );
  if (error) {
    throw new Error(`Failed to restore preserved admin profile(s): ${error.message}`);
  }
}

async function wipePublicDataWithFallback(
  adminClient: ReturnType<typeof createAdminClient>,
  preserveUserId: string
): Promise<WipeAppCleanRpcResult> {
  const { data: wipeData, error: wipeError } = await adminClient.rpc(
    "wipe_app_clean_data"
  );
  if (!wipeError) {
    return (wipeData as WipeAppCleanRpcResult | null) ?? {};
  }

  if (!isMissingWipeRpcError(wipeError as PostgrestLikeError)) {
    throw new Error(`Failed to wipe public data: ${wipeError.message}`);
  }

  const wipedTables: string[] = [];
  for (const entry of FULL_WIPE_TABLES) {
    const { table, markerColumn } = entry;
    let deleteQuery = adminClient.from(table).delete();
    if (table === "profiles") {
      deleteQuery = deleteQuery.neq("id", preserveUserId);
    } else {
      deleteQuery = deleteQuery.not(markerColumn, "is", null);
    }
    const { error: deleteError } = await deleteQuery;
    if (!deleteError) {
      wipedTables.push(table);
      continue;
    }
    if (isMissingSchemaResourceError(deleteError as PostgrestLikeError)) {
      continue;
    }
    throw new Error(`Failed to wipe table ${table}: ${deleteError.message}`);
  }

  const { error: appSettingsError } = await adminClient.from("app_settings").upsert(
    {
      id: 1,
      timezone: "America/Chicago",
      week_start: 1,
      stale_draft_days: 10,
      updated_by: null,
    },
    { onConflict: "id" }
  );
  if (
    appSettingsError &&
    !isMissingSchemaResourceError(appSettingsError as PostgrestLikeError)
  ) {
    throw new Error(`Failed to reset app settings: ${appSettingsError.message}`);
  }

  return {
    truncated_table_count: wipedTables.length,
    truncated_tables: wipedTables,
    app_settings_reset: !appSettingsError,
    fallback_used: true,
    fallback_reason:
      "RPC public.wipe_app_clean_data not available in PostgREST schema cache",
  };
}

export async function DELETE(request: NextRequest) {
  try {
    let removeOtherAdminProfiles = false;
    try {
      const requestBody = (await request.json()) as WipeAppCleanRequestBody;
      removeOtherAdminProfiles = requestBody?.removeOtherAdminProfiles === true;
    } catch {
      removeOtherAdminProfiles = false;
    }
    const auth = await requirePermission(request, "delete_user");
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const callerRoles = getUserRoles(auth.context.profile);
    if (!callerRoles.includes("admin")) {
      return NextResponse.json(
        { error: "Only admins can wipe app data." },
        { status: 403 }
      );
    }

    const adminClient = auth.context.adminClient;
    const preservedAdminProfile = await readPreservedAdminProfile(
      adminClient,
      auth.context.userId
    );
    const otherAdminProfiles = removeOtherAdminProfiles
      ? []
      : await readOtherAdminProfiles(adminClient, auth.context.userId);
    const preservedAdminUserIds = new Set<string>([
      auth.context.userId,
      ...otherAdminProfiles.map((nextProfile) => nextProfile.id),
    ]);
    const wipeData = await wipePublicDataWithFallback(adminClient, auth.context.userId);
    await restorePreservedAdminProfiles(adminClient, [
      preservedAdminProfile,
      ...otherAdminProfiles,
    ]);

    const userIds = await listAllAuthUserIds(adminClient);
    const failedUserDeletes: Array<{ userId: string; error: string }> = [];
    let deletedAuthUsers = 0;
    let preservedAuthUsers = 0;

    for (const userId of userIds) {
      if (preservedAdminUserIds.has(userId)) {
        preservedAuthUsers += 1;
        continue;
      }
      const { error: deleteError } = await adminClient.auth.admin.deleteUser(userId);
      if (deleteError) {
        failedUserDeletes.push({ userId, error: deleteError.message });
        continue;
      }
      deletedAuthUsers += 1;
    }

    const normalizedWipeData = wipeData as WipeAppCleanRpcResult;

    if (failedUserDeletes.length > 0) {
      return NextResponse.json(
        {
          error: "App data was wiped, but some auth users could not be deleted.",
          deletedAuthUsers,
          preservedAuthUsers,
          preservedAdminUserId: auth.context.userId,
          removedOtherAdminProfiles: removeOtherAdminProfiles,
          preservedOtherAdminProfiles: otherAdminProfiles.length,
          failedUserDeletes,
          wipeSummary: normalizedWipeData,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      deletedAuthUsers,
      preservedAuthUsers,
      preservedAdminUserId: auth.context.userId,
      removedOtherAdminProfiles: removeOtherAdminProfiles,
      preservedOtherAdminProfiles: otherAdminProfiles.length,
      failedUserDeletes,
      wipeSummary: normalizedWipeData,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unexpected server error";
    console.error(error);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
