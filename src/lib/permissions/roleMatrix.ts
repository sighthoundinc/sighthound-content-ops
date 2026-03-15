import {
  APP_ROLES,
  getDefaultRolePermissions,
} from "@/lib/permissions";
import type {
  AppRole,
  CanonicalAppPermissionKey,
} from "@/lib/types";

export const RolePermissions = Object.freeze(
  Object.fromEntries(
    APP_ROLES.map((role) => [role, [...getDefaultRolePermissions(role)]])
  ) as Record<AppRole, CanonicalAppPermissionKey[]>
);

export function getRolePermissions(role: AppRole) {
  return RolePermissions[role] ?? [];
}
