import type { AppRole, ProfileRecord } from "@/lib/types";

export function getUserRoles(profile: Pick<ProfileRecord, "role" | "user_roles"> | null | undefined) {
  if (!profile) {
    return [];
  }
  const roles = profile.user_roles?.length ? profile.user_roles : [profile.role];
  return Array.from(new Set(roles));
}

export function hasRole(
  profile: Pick<ProfileRecord, "role" | "user_roles"> | null | undefined,
  role: AppRole
) {
  return getUserRoles(profile).includes(role);
}
