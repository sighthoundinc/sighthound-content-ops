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
  updated_at: "2026-09-08T12:00:00.123456+00:00",
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
  test("transition cannot silently accept unsaved live links", async () => {
    await denied(socialTransition, {
      nextStatus: "in_review",
      liveLinks: [{ platform: "linkedin", url: "https://www.linkedin.com/posts/test" }],
    }, 400, "BAD_REQUEST");
  });
  test.each(Object.entries({
    product: "unknown", type: "unknown", canva_url: "https://",
    platforms: ["unknown"], caption: 123, scheduled_date: "2026-02-30",
  }))("stored invalid required %s blocks approval", async (field, value) => {
    db.state.record.status = "in_review";
    db.state.record[field] = value;
    actor("reviewer");
    await denied(socialTransition, { nextStatus: "creative_approved" }, 400, "BAD_REQUEST");
  });
  test("merged valid fields can repair invalid stored required values", async () => {
    db.state.record.canva_url = "https://";
    expect((await call(socialTransition, {
      nextStatus: "in_review", canva_url: base.canva_url,
    })).status).toBe(200);
  });
  for (const status of ["ready_to_publish", "awaiting_live_link"]) {
    for (const role of ["writer", "admin"]) {
      test.each(Object.entries({
        title: "Changed", product: "hardware", type: "video",
        canva_url: "https://www.canva.com/design/changed", canva_page: 2,
        caption: "Changed", platforms: ["facebook"], scheduled_date: "2026-04-01",
        associated_blog_id: null,
      }))(`${status} execution lock rejects ${role} edit to %s`, async (field, value) => {
        db.state.record.status = status;
        actor("worker", role);
        await denied(socialTransition, {
          nextStatus: "changes_requested", reason: "Revise brief", [field]: value,
        }, 400, "BAD_REQUEST");
      });
      test(`${status} allows ${role} rollback without brief edits`, async () => {
        db.state.record.status = status;
        actor("worker", role);
        expect((await call(socialTransition, {
          nextStatus: "changes_requested", reason: "Revise brief",
        })).status).toBe(200);
      });
    }
  }
  test("unauthenticated request does not reach database", async () => {
    jest.mocked(authenticateRequest).mockResolvedValue({ error: "Unauthorized", status: 401 });
    await denied(socialTransition, { nextStatus: "in_review" }, 401, "UNAUTHORIZED");
    expect(db.client.from).not.toHaveBeenCalled();
  });
  test.each([
    ["draft", "in_review", "reviewer_user_id", "worker"],
    ["changes_requested", "in_review", "reviewer_user_id", "worker"],
    ["in_review", "changes_requested", "worker_user_id", "reviewer"],
    ["creative_approved", "ready_to_publish", "worker_user_id", "reviewer"],
  ])("%s -> %s requires a next owner", async (status, nextStatus, field, userId) => {
    db.state.record.status = status;
    db.state.record[field] = null;
    actor(userId);
    await denied(socialTransition, { nextStatus }, 400, "BAD_REQUEST");
  });
  test.each([
    { platform: "linkedin", url: "" },
    { platform: "linkedin", url: "https://linkedin.com.evil.example/posts/test" },
    { platform: "linkedin", url: "javascript:alert(1)" },
    { platform: "linkedin", url: "https://www.facebook.com/posts/test" },
    { platform: "linkedin", url: "https://user:password@www.linkedin.com/posts/test" },
  ])("invalid stored live link blocks publishing (%p)", async (link) => {
    db.state.record.status = "awaiting_live_link";
    db.state.links = [{ id: "link", ...link }];
    await denied(socialTransition, { nextStatus: "published" }, 400, "BAD_REQUEST");
  });
  test("a valid stored link after an invalid row permits publishing", async () => {
    db.state.record.status = "awaiting_live_link";
    db.state.links = [
      { id: "bad", platform: "linkedin", url: "" },
      { id: "good", platform: "linkedin", url: "https://www.linkedin.com/posts/test" },
    ];
    expect((await call(socialTransition, { nextStatus: "published" })).status).toBe(200);
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
    expect(db.client.rpc).toHaveBeenCalledWith("apply_social_post_transition", {
      p_social_post_id: base.id, p_from_status: "draft",
      p_expected_updated_at: base.updated_at, p_to_status: "in_review",
      p_actor_id: "worker", p_reason: null, p_brief: { canva_url: base.canva_url },
    });
    expect(db.updates).toEqual([]);
    expect(db.inserts).toEqual([]);
    expect(emitEvent).toHaveBeenCalledWith(expect.any(Object),
      expect.objectContaining({ skipActivityHistory: true }));
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
  test.each([
    ["linkedin", "https://www.linkedin.com/posts/test"],
    ["facebook", "https://www.facebook.com/example/posts/123"],
    ["instagram", "https://www.instagram.com/p/ABC123/"],
  ])("stored %s link permits publishing", async (platform, url) => {
    db.state.record.status = "awaiting_live_link";
    db.state.links = [{ id: "link", platform, url }];
    const result = await call(socialTransition, { nextStatus: "published" });
    expect(result.status).toBe(200);
    expect(db.client.rpc).toHaveBeenCalledWith("apply_social_post_transition",
      expect.objectContaining({ p_to_status: "published", p_brief: {} }));
  });
  test("stale write returns conflict without emitting success", async () => {
    db.state.conflict = true;
    const result = await call(socialTransition, { nextStatus: "in_review" });
    expect(result.status).toBe(409);
    expect(result.body.errorCode).toBe("CONFLICT");
    expect(emitEvent).not.toHaveBeenCalled();
  });
});

describe("atomic RPC transport", () => {
  test("rollback passes normalized reason without separate history insert", async () => {
    db.state.record.status = "ready_to_publish";
    expect((await call(socialTransition, {
      nextStatus: "changes_requested", reason: "  Revise design  ",
    })).status).toBe(200);
    expect(db.client.rpc).toHaveBeenCalledWith("apply_social_post_transition",
      expect.objectContaining({ p_reason: "Revise design", p_brief: {} }));
    expect(db.inserts).toEqual([]);
  });
  test.each([
    ["40001", 409, "CONFLICT"], ["40P01", 409, "CONFLICT"],
    ["P0002", 404, "NOT_FOUND"], ["42501", 403, "FORBIDDEN"],
    ["23514", 400, "BAD_REQUEST"], ["23503", 400, "BAD_REQUEST"],
    ["22P02", 400, "BAD_REQUEST"], ["DB_FAILURE", 500, "INTERNAL_SERVER_ERROR"],
  ])("RPC error %s is safely normalized", async (code, status, errorCode) => {
    db.client.rpc.mockResolvedValueOnce({ data: null, error: { code, message: "private database details" } });
    const result = await call(socialTransition, { nextStatus: "in_review" });
    expect(result.status).toBe(status);
    expect(result.body.errorCode).toBe(errorCode);
    expect(JSON.stringify(result.body)).not.toContain("private database details");
    expect(emitEvent).not.toHaveBeenCalled();
  });
  test("notification rejection cannot turn a committed transition into a 500", async () => {
    jest.mocked(emitEvent).mockRejectedValueOnce(new Error("delivery unavailable"));
    const result = await call(socialTransition, { nextStatus: "in_review" });
    expect(result.status).toBe(200);
    expect(result.body.post).toEqual({ id: base.id, status: "in_review" });
    expect(db.client.rpc).toHaveBeenCalledTimes(1);
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
  test.each(["not_started", "in_progress", "pending_review", "needs_revision"])(
    "publisher cannot complete while writing is %s, even with permissions", async (writerStatus) => {
      db.state.record = {
        id: base.id, writer_id: "worker", publisher_id: "publisher",
        writer_status: writerStatus, publisher_status: "publisher_approved",
        updated_at: "2026-03-08T12:00:00.000Z",
      };
      actor("publisher");
      await denied(blogTransition, { publisher_status: "completed" }, 400, "BAD_REQUEST");
    }
  );
});
