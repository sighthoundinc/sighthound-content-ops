import { NextRequest } from "next/server";
import { POST as socialTransition } from "@/app/api/social-posts/[id]/transition/route";
import { POST as blogTransition } from "@/app/api/blogs/[id]/transition/route";
import { POST as reopenBrief } from "@/app/api/social-posts/[id]/reopen-brief/route";
import { authenticateRequest } from "@/lib/server-permissions";
import { emitEvent } from "@/lib/emit-event";
import { databaseFake } from "./database-fake";

jest.mock("@/lib/server-permissions", () => ({
  authenticateRequest: jest.fn(), hasPermission: jest.fn(() => true),
}));
jest.mock("@/lib/emit-event", () => ({ emitEvent: jest.fn().mockResolvedValue(undefined) }));
jest.mock("@/lib/server-slack-emitter", () => ({
  emitWorkflowSlackEvent: jest.fn().mockResolvedValue(undefined),
}));

const base = {
  id: "00000000-0000-4000-8000-000000000001", status: "draft",
  created_by: "creator", worker_user_id: "worker", reviewer_user_id: "reviewer",
  assigned_to_user_id: "worker", title: "",
  product: "redactor", type: "image", canva_url: "https://www.canva.com/design/test",
  platforms: ["linkedin"], caption: "Approved", scheduled_date: "2026-03-08",
};
let db: ReturnType<typeof databaseFake>;
function actor(userId = "worker", role = "writer") {
  jest.mocked(authenticateRequest).mockResolvedValue({
    context: { userId, profile: { role }, adminClient: db.client },
  } as unknown as Awaited<ReturnType<typeof authenticateRequest>>);
}
async function call(handler: typeof socialTransition, payload: unknown) {
  const response = await handler(new NextRequest("http://localhost/api/test", {
    method: "POST", body: JSON.stringify(payload),
    headers: { "content-type": "application/json" },
  }), { params: Promise.resolve({ id: base.id }) });
  return { status: response.status, body: await response.json() };
}
async function denied(handler: typeof socialTransition, payload: unknown, status: number, errorCode: string) {
  const result = await call(handler, payload);
  expect(result.status).toBe(status);
  expect(result.body).toMatchObject({ success: false, errorCode });
  expect(db.updates).toEqual([]);
  expect(emitEvent).not.toHaveBeenCalled();
}
beforeEach(() => {
  jest.clearAllMocks();
  db = databaseFake({ ...base });
  actor();
});

describe("real social handler (mock transport; not RLS proof)", () => {
  test("unauthenticated request does not reach database", async () => {
    jest.mocked(authenticateRequest).mockResolvedValue({ error: "Unauthorized", status: 401 });
    await denied(socialTransition, { nextStatus: "in_review" }, 401, "UNAUTHORIZED");
    expect(db.client.from).not.toHaveBeenCalled();
  });
  test("non-owner cannot transition", async () => {
    actor("stranger");
    await denied(socialTransition, { nextStatus: "in_review" }, 403, "FORBIDDEN");
  });
  test("missing stage owner does not grant access to a stranger", async () => {
    db.state.record.worker_user_id = null;
    db.state.record.assigned_to_user_id = null;
    actor("stranger");
    await denied(socialTransition, { nextStatus: "in_review" }, 403, "FORBIDDEN");
  });
  test("database read failure cannot mutate", async () => {
    db.state.failRead = true;
    await denied(socialTransition, { nextStatus: "in_review" }, 500, "INTERNAL_SERVER_ERROR");
  });
  test("database write failure cannot emit success", async () => {
    db.state.failWrite = true;
    const result = await call(socialTransition, { nextStatus: "in_review" });
    expect(result.status).toBe(500);
    expect(result.body.errorCode).toBe("INTERNAL_SERVER_ERROR");
    expect(emitEvent).not.toHaveBeenCalled();
  });
  test("invalid edge is rejected", async () => {
    await denied(socialTransition, { nextStatus: "published" }, 400, "BAD_REQUEST");
  });
  test.each(["product", "type", "canva_url"])("missing %s blocks review", async (field) => {
    db.state.record[field] = null;
    await denied(socialTransition, { nextStatus: "in_review" }, 400, "BAD_REQUEST");
  });
  test.each(["caption", "platforms", "scheduled_date"])("approval requires %s", async (field) => {
    db.state.record.status = "in_review";
    db.state.record[field] = null;
    actor("reviewer");
    await denied(socialTransition, { nextStatus: "creative_approved" }, 400, "BAD_REQUEST");
  });
  test("merged payload can satisfy required fields; title stays optional", async () => {
    db.state.record.canva_url = null;
    const result = await call(socialTransition, { nextStatus: "in_review", canva_url: base.canva_url });
    expect(result.status).toBe(200);
    expect(result.body).toMatchObject({ success: true, post: { status: "in_review" } });
    expect(db.updates[0]).toMatchObject({ status: "in_review", canva_url: base.canva_url });
    expect(db.filters).toContainEqual(["status", "draft"]);
  });
  test.each(["ready_to_publish", "awaiting_live_link"])("%s brief edits rejected for worker", async (status) => {
    db.state.record.status = status;
    await denied(socialTransition, {
      nextStatus: "changes_requested", reason: "Fix design", title: "Changed",
    }, 400, "BAD_REQUEST");
  });
  test.each(["ready_to_publish", "awaiting_live_link"])("%s rollback needs reason", async (status) => {
    db.state.record.status = status;
    await denied(socialTransition, { nextStatus: "changes_requested", reason: "   " }, 400, "BAD_REQUEST");
  });
  test("request-only links cannot satisfy stored-link publishing gate", async () => {
    db.state.record.status = "awaiting_live_link";
    await denied(socialTransition, {
      nextStatus: "published", liveLinks: [{ platform: "linkedin", url: "https://www.linkedin.com/posts/test" }],
    }, 400, "BAD_REQUEST");
  });
  test("stored link permits publishing", async () => {
    db.state.record.status = "awaiting_live_link";
    db.state.links = [{ id: "link", url: "https://www.linkedin.com/posts/test" }];
    const result = await call(socialTransition, { nextStatus: "published" });
    expect(result.status).toBe(200);
    expect(db.updates[0]).toMatchObject({ status: "published" });
  });
  test("stale write returns conflict without emitting success", async () => {
    db.state.conflict = true;
    const result = await call(socialTransition, { nextStatus: "in_review" });
    expect(result.status).toBe(409);
    expect(result.body.errorCode).toBe("CONFLICT");
    expect(emitEvent).not.toHaveBeenCalled();
  });
});

describe("reopen handler", () => {
  test("non-admin never invokes privileged RPC", async () => {
    await denied(reopenBrief, {}, 403, "FORBIDDEN");
    expect(db.client.rpc).not.toHaveBeenCalled();
  });
  test("admin passes actor and normalized reason to RPC", async () => {
    actor("reviewer", "admin");
    const result = await call(reopenBrief, { reason: " Fix caption " });
    expect(result.status).toBe(200);
    expect(db.client.rpc).toHaveBeenCalledWith("reopen_social_post_for_brief_edit", {
      p_social_post_id: base.id, p_actor_id: "reviewer", p_reason: "Fix caption",
    });
  });
  test("RPC failure is a normalized error", async () => {
    actor("reviewer", "admin");
    db.client.rpc.mockResolvedValue({ data: null, error: { code: "DB_FAILURE" } });
    await denied(reopenBrief, {}, 400, "BAD_REQUEST");
  });
});

describe("blog publishing prerequisite", () => {
  test("publisher cannot complete before writing approval, even with permissions", async () => {
    db.state.record = {
      id: base.id, writer_id: "worker", publisher_id: "publisher",
      writer_status: "in_progress", publisher_status: "publisher_approved",
      updated_at: "2026-03-08T12:00:00.000Z",
    };
    actor("publisher");
    await denied(blogTransition, { publisher_status: "completed" }, 400, "BAD_REQUEST");
  });
});
