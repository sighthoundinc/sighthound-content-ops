import type { NextRequest } from "next/server";

import {
  isRolePermissionsSchemaMissingError,
  normalizeRolePermissionRows,
  resolvePermissionsForRoles,
  type RolePermissionRow,
} from "@/lib/permissions";
import { isMissingUserRolesColumnError } from "@/lib/profile-schema";
import { getUserRoles } from "@/lib/roles";
import { createAdminClient, createAnonServerClient } from "@/lib/supabase/server";
import type { AppPermissionKey, ProfileRecord } from "@/lib/types";

type ActiveProfile = Pick<ProfileRecord, "id" | "role" | "user_roles" | "is_active">;

export type AuthenticatedRequestContext = {
  userId: string;
  profile: ActiveProfile;
  permissions: Set<AppPermissionKey>;
  rolePermissionRows: RolePermissionRow[];
  adminClient: ReturnType<typeof createAdminClient>;
};

type AuthFailure = {
  error: string;
  status: number;
};

function getBearerToken(request: NextRequest) {
  const authorization = request.headers.get("authorization") ?? "";
  return authorization.startsWith("Bearer ")
    ? authorization.slice("Bearer ".length)
    : null;
}

async function getRolePermissionRows(adminClient: ReturnType<typeof createAdminClient>) {
  const { data, error } = await adminClient
    .from("role_permissions")
    .select("role,permission_key,enabled");

  if (error) {
    if (isRolePermissionsSchemaMissingError(error)) {
      return [] as RolePermissionRow[];
    }
    throw new Error(error.message);
  }
  return normalizeRolePermissionRows(data ?? []);
}

async function loadActiveProfile(
  adminClient: ReturnType<typeof createAdminClient>,
  userId: string
) {
  let { data: profile, error: profileError } = await adminClient
    .from("profiles")
    .select("id,role,user_roles,is_active")
    .eq("id", userId)
    .eq("is_active", true)
    .maybeSingle();

  if (isMissingUserRolesColumnError(profileError)) {
    const fallback = await adminClient
      .from("profiles")
      .select("id,role,is_active")
      .eq("id", userId)
      .eq("is_active", true)
      .maybeSingle();
    profile = fallback.data as typeof profile;
    profileError = fallback.error;
  }

  if (profileError || !profile) {
    return null;
  }
  return profile as ActiveProfile;
}

export async function authenticateRequest(
  request: NextRequest
): Promise<{ context: AuthenticatedRequestContext } | AuthFailure> {
  const token = getBearerToken(request);
  if (!token) {
    return { error: "Missing access token", status: 401 };
  }

  const anonClient = createAnonServerClient();
  const { data: userData, error: userError } = await anonClient.auth.getUser(token);
  if (userError || !userData.user) {
    return { error: "Invalid session", status: 401 };
  }

  const adminClient = createAdminClient();
  const profile = await loadActiveProfile(adminClient, userData.user.id);
  if (!profile) {
    return { error: "Active profile not found", status: 403 };
  }

  const roles = getUserRoles(profile);
  const rolePermissionRows = await getRolePermissionRows(adminClient);
  const permissions = new Set(resolvePermissionsForRoles(roles, rolePermissionRows));

  return {
    context: {
      userId: userData.user.id,
      profile,
      permissions,
      rolePermissionRows,
      adminClient,
    },
  };
}

export function hasPermission(
  context: AuthenticatedRequestContext,
  permissionKey: AppPermissionKey
) {
  return context.permissions.has(permissionKey);
}

export async function requirePermission(
  request: NextRequest,
  permissionKey: AppPermissionKey
): Promise<{ context: AuthenticatedRequestContext } | AuthFailure> {
  const auth = await authenticateRequest(request);
  if ("error" in auth) {
    return auth;
  }
  if (!hasPermission(auth.context, permissionKey)) {
    return { error: "Permission denied", status: 403 };
  }
  return auth;
}

