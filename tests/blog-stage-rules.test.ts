import {
  canTransitionPublisherStatus,
  canTransitionWriterStatus,
  resolvePermissionsForRoles,
} from "@/lib/permissions";
import type { AppPermissionKey, AppRole } from "@/lib/types";

const lookup = (roles: AppRole[]) => {
  const set = new Set<AppPermissionKey>(resolvePermissionsForRoles(roles));
  return (key: AppPermissionKey) => set.has(key);
};
const owner = { userId: "u1", ownerId: "u1" };
const other = { userId: "u2", ownerId: "u1" };

describe("blog stage rules", () => {
  it("lets only the assigned writer move writing forward", () => {
    expect(canTransitionWriterStatus("not_started", "in_progress", lookup(["writer"]), owner)).toBe(true);
    expect(canTransitionWriterStatus("in_progress", "pending_review", lookup(["writer"]), owner)).toBe(true);
    expect(canTransitionWriterStatus("in_progress", "pending_review", lookup(["writer"]), other)).toBe(false);
  });

  it("needs a reviewer who is not the writer to approve or send back", () => {
    expect(canTransitionWriterStatus("pending_review", "completed", lookup(["writer"]), owner)).toBe(false);
    expect(canTransitionWriterStatus("pending_review", "completed", lookup(["writer"]), other)).toBe(false);
    expect(canTransitionWriterStatus("pending_review", "completed", lookup(["editor"]), other)).toBe(true);
    expect(canTransitionWriterStatus("pending_review", "needs_revision", lookup(["editor"]), other)).toBe(true);
    // Writer + editor still cannot review their own draft.
    expect(canTransitionWriterStatus("pending_review", "completed", lookup(["writer", "editor"]), owner)).toBe(false);
  });

  it("lets a publisher run publishing without any writer permission", () => {
    const publisher = lookup(["publisher"]);
    expect(canTransitionPublisherStatus("not_started", "in_progress", publisher, owner)).toBe(true);
    expect(canTransitionPublisherStatus("in_progress", "pending_review", publisher, owner)).toBe(true);
    expect(canTransitionPublisherStatus("pending_review", "publisher_approved", publisher, owner)).toBe(false);
    expect(canTransitionPublisherStatus("pending_review", "publisher_approved", lookup(["editor"]), other)).toBe(true);
    expect(canTransitionPublisherStatus("publisher_approved", "completed", publisher, owner)).toBe(true);
    expect(canTransitionPublisherStatus("publisher_approved", "completed", publisher, other)).toBe(false);
  });

  it("lets an admin step in on any stage", () => {
    expect(canTransitionWriterStatus("pending_review", "completed", lookup(["admin"]), owner)).toBe(true);
    expect(canTransitionPublisherStatus("in_progress", "pending_review", lookup(["admin"]), other)).toBe(true);
  });
});
