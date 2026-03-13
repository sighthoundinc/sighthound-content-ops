import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import {
  CONFIGURABLE_PERMISSION_KEYS,
  LOCKED_ADMIN_PERMISSION_KEYS,
  MANAGED_PERMISSION_ROLES,
  PERMISSION_DEFINITIONS,
  getDefaultRolePermissions,
  getRolePermissionState,
  isCanonicalPermissionKey,
  isLockedAdminPermission,
} from "@/lib/permissions";
import { requirePermission } from "@/lib/server-permissions";
import type { AppRole, CanonicalAppPermissionKey } from "@/lib/types";

const togglePermissionSchema = z.object({
  role: z.enum(["writer", "publisher", "editor"]),
  permissionKey: z.string().min(1),
  enabled: z.boolean(),
});

const resetRoleSchema = z.object({
  role: z.enum(["writer", "publisher", "editor"]),
});

function getRoleDefaults(role: AppRole) {
  const defaultSet = new Set(
    getDefaultRolePermissions(role).filter(
      (permissionKey) =>
        CONFIGURABLE_PERMISSION_KEYS.includes(permissionKey) &&
        !isLockedAdminPermission(permissionKey)
    )
  );

  return CONFIGURABLE_PERMISSION_KEYS.map((permissionKey) => ({
    role,
    permission_key: permissionKey,
    enabled: defaultSet.has(permissionKey),
  }));
}

export async function GET(request: NextRequest) {
  const auth = await requirePermission(request, "manage_permissions");
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const adminClient = auth.context.adminClient;
  const { data: rolePermissionRows, error: rolePermissionsError } = await adminClient
    .from("role_permissions")
    .select("role,permission_key,enabled")
    .order("role", { ascending: true })
    .order("permission_key", { ascending: true });

  if (rolePermissionsError) {
    return NextResponse.json({ error: rolePermissionsError.message }, { status: 400 });
  }

  const { data: auditRows, error: auditError } = await adminClient
    .from("permission_audit_logs")
    .select("id,role,permission_key,old_value,new_value,changed_by,changed_at")
    .order("changed_at", { ascending: false })
    .limit(100);

  if (auditError) {
    return NextResponse.json({ error: auditError.message }, { status: 400 });
  }

  const actorIds = Array.from(
    new Set(
      (auditRows ?? [])
        .map((row) => row.changed_by)
        .filter((value): value is string => Boolean(value))
    )
  );
  const actorNameById = new Map<string, string>();
  if (actorIds.length > 0) {
    const { data: actorsData, error: actorsError } = await adminClient
      .from("profiles")
      .select("id,full_name,email")
      .in("id", actorIds);

    if (actorsError) {
      return NextResponse.json({ error: actorsError.message }, { status: 400 });
    }

    for (const actor of actorsData ?? []) {
      actorNameById.set(actor.id, actor.full_name || actor.email);
    }
  }

  return NextResponse.json({
    roles: MANAGED_PERMISSION_ROLES,
    permissionDefinitions: PERMISSION_DEFINITIONS,
    lockedPermissions: LOCKED_ADMIN_PERMISSION_KEYS,
    rolePermissions: rolePermissionRows ?? [],
    defaultRolePermissions: Object.fromEntries(
      MANAGED_PERMISSION_ROLES.map((role) => [role, getRoleDefaults(role)])
    ),
    auditLogs: (auditRows ?? []).map((row) => ({
      ...row,
      actor_name: row.changed_by ? actorNameById.get(row.changed_by) ?? null : null,
    })),
  });
}

export async function PATCH(request: NextRequest) {
  const auth = await requirePermission(request, "manage_permissions");
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const body = await request.json();
  const parsed = togglePermissionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request body." },
      { status: 400 }
    );
  }

  const { role, permissionKey, enabled } = parsed.data;
  if (!isCanonicalPermissionKey(permissionKey)) {
    return NextResponse.json({ error: "Unknown permission key." }, { status: 400 });
  }
  if (!CONFIGURABLE_PERMISSION_KEYS.includes(permissionKey)) {
    return NextResponse.json(
      { error: "This permission cannot be changed." },
      { status: 400 }
    );
  }

  const adminClient = auth.context.adminClient;
  const currentState = getRolePermissionState(role, auth.context.rolePermissionRows);
  const oldValue = currentState[permissionKey];

  const { error: upsertError } = await adminClient.from("role_permissions").upsert(
    {
      role,
      permission_key: permissionKey,
      enabled,
    },
    { onConflict: "role,permission_key" }
  );
  if (upsertError) {
    return NextResponse.json({ error: upsertError.message }, { status: 400 });
  }

  if (oldValue !== enabled) {
    const { error: auditInsertError } = await adminClient
      .from("permission_audit_logs")
      .insert({
        role,
        permission_key: permissionKey,
        old_value: oldValue,
        new_value: enabled,
        changed_by: auth.context.userId,
      });
    if (auditInsertError) {
      return NextResponse.json({ error: auditInsertError.message }, { status: 400 });
    }
  }

  return NextResponse.json({
    role,
    permissionKey,
    oldValue,
    newValue: enabled,
  });
}

export async function POST(request: NextRequest) {
  const auth = await requirePermission(request, "manage_permissions");
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const body = await request.json();
  const parsed = resetRoleSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request body." },
      { status: 400 }
    );
  }

  const { role } = parsed.data;
  const adminClient = auth.context.adminClient;
  const currentState = getRolePermissionState(role, auth.context.rolePermissionRows);
  const defaults = getRoleDefaults(role);

  const { error: upsertError } = await adminClient
    .from("role_permissions")
    .upsert(defaults, { onConflict: "role,permission_key" });
  if (upsertError) {
    return NextResponse.json({ error: upsertError.message }, { status: 400 });
  }

  const auditRows: Array<{
    role: AppRole;
    permission_key: CanonicalAppPermissionKey;
    old_value: boolean;
    new_value: boolean;
    changed_by: string;
  }> = [];
  for (const permissionRow of defaults) {
    const permissionKey = permissionRow.permission_key;
    const oldValue = currentState[permissionKey];
    if (oldValue === permissionRow.enabled) {
      continue;
    }
    auditRows.push({
      role,
      permission_key: permissionKey,
      old_value: oldValue,
      new_value: permissionRow.enabled,
      changed_by: auth.context.userId,
    });
  }

  if (auditRows.length > 0) {
    const { error: auditError } = await adminClient
      .from("permission_audit_logs")
      .insert(auditRows);
    if (auditError) {
      return NextResponse.json({ error: auditError.message }, { status: 400 });
    }
  }

  return NextResponse.json({
    role,
    resetCount: defaults.length,
    changedCount: auditRows.length,
  });
}

