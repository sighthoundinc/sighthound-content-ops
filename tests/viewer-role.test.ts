import { ALL_PERMISSION_KEYS, resolvePermissionsForRoles } from "@/lib/permissions";
import { isViewOnly } from "@/lib/roles";

describe("viewer role", () => {
  it("resolves to view_* permissions only, even with stray role_permissions rows", () => {
    const resolved = resolvePermissionsForRoles(["viewer"], [
      // A row like this must be ignored: viewer is not a managed role.
      { role: "viewer", permission_key: "create_blog", enabled: true },
    ]);
    expect(resolved.length).toBeGreaterThan(0);
    expect(resolved.every((key) => key.startsWith("view_"))).toBe(true);
    expect(resolved.length).toBeLessThan(ALL_PERMISSION_KEYS.length);
  });

  it("is view-only only when viewer is the sole role", () => {
    expect(isViewOnly({ role: "viewer", user_roles: ["viewer"] })).toBe(true);
    expect(isViewOnly({ role: "viewer", user_roles: null })).toBe(true);
    expect(isViewOnly({ role: "writer", user_roles: ["writer", "viewer"] })).toBe(false);
    expect(isViewOnly({ role: "admin", user_roles: ["admin"] })).toBe(false);
    expect(isViewOnly(null)).toBe(false);
  });
});

describe("viewer exclusivity", () => {
  it("rejects viewer combined with any other role", () => {
    const { isValidRoleSet } = jest.requireActual("@/lib/roles");
    expect(isValidRoleSet(["viewer"])).toBe(true);
    expect(isValidRoleSet(["writer", "publisher"])).toBe(true);
    expect(isValidRoleSet(["viewer", "writer"])).toBe(false);
    expect(isValidRoleSet(["admin", "viewer"])).toBe(false);
  });
});
