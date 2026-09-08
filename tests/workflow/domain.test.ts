import "@/lib/status.contract.test";
import { socialPostWorkflowContractSmokeChecks } from "@/lib/social-post-workflow.contract.test";
import { taskActionStateContractSmokeChecks } from "@/lib/task-action-state.contract.test";
import { overdueWindowContractSmokeChecks } from "@/lib/overdue-window.contract.test";
import {
  getNextAssignment, isValidTransition, canUserActOnStatus,
  type SocialPostStatus,
} from "@/lib/social-post-workflow";
import { computeSocialPostPreflight } from "@/lib/preflight";
import { getSocialTaskActionStateFromRow, getPublisherTaskActionState } from "@/lib/task-action-state";
import { formatDateOnly } from "@/lib/utils";

const expectedGraph: Record<SocialPostStatus, SocialPostStatus[]> = {
  draft: ["in_review"],
  in_review: ["creative_approved", "changes_requested"],
  changes_requested: ["in_review"],
  creative_approved: ["ready_to_publish"],
  ready_to_publish: ["awaiting_live_link", "changes_requested"],
  awaiting_live_link: ["published", "changes_requested"],
  published: [],
};
const statuses = Object.keys(expectedGraph) as SocialPostStatus[];
const expectedOwners = {
  draft: "worker", in_review: "reviewer", changes_requested: "worker",
  creative_approved: "reviewer", ready_to_publish: "worker",
  awaiting_live_link: "worker", published: null,
};
const fields = {
  product: "redactor", type: "image", canva_url: "https://www.canva.com/design/test",
  platforms: ["linkedin"], caption: "Approved caption", scheduled_date: "2026-03-08",
};

describe("existing contract exports are enforced", () => {
  for (const [group, checks] of Object.entries({
    social: socialPostWorkflowContractSmokeChecks,
    tasks: taskActionStateContractSmokeChecks,
    overdue: overdueWindowContractSmokeChecks,
  })) {
    test.each(Object.entries(checks))(`${group}: %s`, (_name, value) => expect(value).toBe(true));
  }
});

describe("workflow state and ownership", () => {
  for (const current of statuses) {
    test.each(statuses)(`${current} -> %s`, (next) => {
      expect(isValidTransition(current, next)).toBe(expectedGraph[current].includes(next));
    });
    test(`${current} owner`, () => {
      expect(getNextAssignment(current, "worker", "reviewer")).toBe(expectedOwners[current]);
      expect(getNextAssignment(current, null, null)).toBeNull();
    });
    for (const actor of ["worker", "reviewer", "creator", "legacy-editor", "stranger"]) {
      test(`${current}: task action matches non-admin transition authority for ${actor}`, () => {
        const row = {
          status: current, created_by: "creator", worker_user_id: "worker",
          reviewer_user_id: "reviewer", assigned_to_user_id: expectedOwners[current],
          editor_user_id: "legacy-editor",
        };
        const canAct = canUserActOnStatus({
          status: current, workerUserId: "worker", reviewerUserId: "reviewer",
          userId: actor, isAdmin: false,
        });
        expect(getSocialTaskActionStateFromRow({ row, userId: actor, isAdmin: false }))
          .toBe(canAct ? "action_required" : "waiting_on_others");
      });
    }
  }
  test.each(["not_started", "in_progress", "pending_review", "needs_revision"] as const)(
    "publishing waits until writing completed (%s)", (writer) => {
      expect(getPublisherTaskActionState(writer, "publisher_approved")).toBe("waiting_on_others");
    },
  );
});

describe("preflight requirements", () => {
  for (const status of statuses.filter((value) => value !== "published")) {
    const required = status === "draft" || status === "changes_requested"
      ? ["product", "type", "canva_url"]
      : ["product", "type", "canva_url", "platforms", "caption", "scheduled_date"];
    test(`${status}: optional title does not block`, () => {
      expect(computeSocialPostPreflight({ status, fields, liveLinkCount: 1 }).ready).toBe(true);
    });
    for (const key of required) {
      test.each([null, undefined, "", "   ", []])(`${status}: missing ${key} (%p)`, (value) => {
        const result = computeSocialPostPreflight({
          status, fields: { ...fields, [key]: value }, liveLinkCount: 1,
        });
        expect(result.ready).toBe(false);
        expect(result.missing.map((field) => field.key)).toEqual([key]);
      });
    }
  }
  test("publishing requires a stored link", () => {
    expect(computeSocialPostPreflight({
      status: "awaiting_live_link", fields, liveLinkCount: 0,
    }).missing.map((field) => field.key)).toEqual(["live_links"]);
  });
  test("published is terminal", () => {
    expect(computeSocialPostPreflight({
      status: "published", fields: {}, liveLinkCount: 0,
    })).toEqual({ nextStatus: null, requiredCount: 0, missing: [], ready: true });
  });
});

describe("date-only display (run in separate TZ processes)", () => {
  test.each([
    ["2026-02-11", "Feb 11, 2026"],
    ["2026-03-08T00:00:00.000Z", "Mar 8, 2026"],
    ["2026-11-01T00:00:00.000Z", "Nov 1, 2026"],
    ["2024-02-29", "Feb 29, 2024"],
  ])("%s stays on its calendar date", (input, expected) => {
    expect(formatDateOnly(input)).toBe(expected);
  });
  test.each([
    null, undefined, "", "invalid", "2026-02-30", "2026-13-01",
    "2026-00-01", "2026-03-00", "2026-3x-08", "2026-03-08garbage",
    "2025-02-29",
    "2026-03-08T25:00:00Z", "2026-03-08T00:60:00Z",
    "2026-03-08T00:00:60Z", "2026-03-08T00:00:00+25:00",
    "2026-03-08T00:00:00+01:60",
  ])("empty/malformed %p", (input) => {
    expect(formatDateOnly(input)).toBe("");
  });
});
