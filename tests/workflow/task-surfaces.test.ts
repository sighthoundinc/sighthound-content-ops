import { NextRequest } from "next/server";
import { GET as summary } from "@/app/api/dashboard/summary/route";
import { GET as snapshot } from "@/app/api/dashboard/tasks-snapshot/route";
import { GET as queue } from "@/app/api/tasks/queue/route";
import { requirePermission } from "@/lib/server-permissions";
import { fetchSharedTaskClassificationInputs } from "@/lib/server-task-classification-inputs";
import { getSocialTaskActionStateFromRow } from "@/lib/task-action-state";

jest.mock("@/lib/server-permissions", () => ({ requirePermission: jest.fn() }));
jest.mock("@/lib/server-task-classification-inputs", () => ({
  fetchSharedTaskClassificationInputs: jest.fn(),
}));
jest.mock("@/lib/server-response-cache", () => ({
  buildUserScopedResponseCacheKey: jest.fn(),
  getServerResponseCacheValue: jest.fn(() => null),
  setServerResponseCacheValue: jest.fn(),
}));

// Real route classification, mocked input retrieval: not visibility/RLS or cache proof.
describe("social responsibility across summary, snapshot, and task queue", () => {
  test.each([
    ["draft", "worker"],
    ["in_review", "reviewer"],
    ["changes_requested", "worker"],
    ["creative_approved", "reviewer"],
    ["ready_to_publish", "worker"],
    ["awaiting_live_link", "worker"],
  ])("%s belongs to %s, not every associated admin", async (status, owner) => {
    for (const userId of ["worker", "reviewer", "creator"]) {
      const row = {
        id: "post", title: "Post", status, worker_user_id: "worker",
        reviewer_user_id: "reviewer", created_by: "creator",
        assigned_to_user_id: owner, scheduled_date: "2026-03-08",
        created_at: "2026-03-01T00:00:00Z",
      };
      jest.mocked(requirePermission).mockResolvedValue({
        context: { profile: { id: userId, role: "admin" }, adminClient: {} },
      } as Awaited<ReturnType<typeof requirePermission>>);
      jest.mocked(fetchSharedTaskClassificationInputs).mockResolvedValue({
        data: { blogs: [], assignments: [], assignmentMap: new Map(), socialRows: [row] },
      });
      const request = new NextRequest("http://localhost/api/test");
      const summaryResponse = await summary(request);
      const snapshotResponse = await snapshot(request);
      const queueResponse = await queue(request);
      expect([summaryResponse.status, snapshotResponse.status, queueResponse.status])
        .toEqual([200, 200, 200]);
      const summaryBody = await summaryResponse.json();
      const snapshotBody = await snapshotResponse.json();
      const queueBody = await queueResponse.json();
      const expected = userId === owner ? "action_required" : "waiting_on_others";
      expect(summaryBody.socialPostCounts[status]).toBe(userId === owner ? 1 : 0);
      expect(snapshotBody.requiredByMe.map((item: { id: string }) => item.id))
        .toEqual(userId === owner ? ["post"] : []);
      expect(snapshotBody.waitingOnOthers.map((item: { id: string }) => item.id))
        .toEqual(userId === owner ? [] : ["post"]);
      expect(getSocialTaskActionStateFromRow({
        row: queueBody.socialRows[0], userId, isAdmin: true,
      })).toBe(expected);
    }
  });
  test("a missing owner never makes an admin responsible", () => {
    expect(getSocialTaskActionStateFromRow({
      row: { status: "draft", worker_user_id: null, reviewer_user_id: "reviewer" },
      userId: "reviewer", isAdmin: true,
    })).toBe("waiting_on_others");
  });
});
