import type { AppRole, ProfileRecord } from "@/lib/types";

export function getUserRoles(profile: Pick<ProfileRecord, "role" | "user_roles"> | null | undefined) {
  if (!profile) {
    return [];
  }
  const roles = profile.user_roles?.length ? profile.user_roles : [profile.role];
  return Array.from(new Set(roles));
}

// True when "viewer" is the only role held: the account is read-only.
export function isViewOnly(
  profile: Pick<ProfileRecord, "role" | "user_roles"> | null | undefined
) {
  const roles = getUserRoles(profile);
  return roles.length > 0 && roles.every((role) => role === "viewer");
}

// Viewer is exclusive: it cannot be combined with any other role.
export function isValidRoleSet(roles: AppRole[]) {
  return !roles.includes("viewer") || roles.every((role) => role === "viewer");
}

export function hasRole(
  profile: Pick<ProfileRecord, "role" | "user_roles"> | null | undefined,
  role: AppRole
) {
  return getUserRoles(profile).includes(role);
}
