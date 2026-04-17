import {
  buildCacheKey,
  clearAskAICache,
  getCachedResponse,
  setCachedResponse,
} from "@/app/api/ai/utils/response-cache";
import { checkRateLimit } from "@/app/api/ai/utils/rate-limiter";
import { buildSafeLinks } from "@/app/api/ai/utils/safe-links";

describe("response-cache", () => {
  beforeEach(() => {
    clearAskAICache();
    delete process.env.ASK_AI_DISABLE_CACHE;
  });

  it("round-trips a payload under the same key", () => {
    const key = buildCacheKey({
      userId: "u1",
      entityType: "blog",
      entityId: "b1",
      updatedAt: "2026-04-17T00:00:00Z",
      prompt: "Why can't I publish?",
    });
    setCachedResponse(key, { data: { foo: "bar" }, generatedAt: new Date().toISOString() });
    const hit = getCachedResponse(key);
    expect(hit?.data).toEqual({ foo: "bar" });
  });

  it("normalises whitespace and case in cache keys", () => {
    const a = buildCacheKey({
      userId: "u1",
      entityType: "blog",
      entityId: "b1",
      updatedAt: "2026-04-17T00:00:00Z",
      prompt: "  Why   Can't I Publish?  ",
    });
    const b = buildCacheKey({
      userId: "u1",
      entityType: "blog",
      entityId: "b1",
      updatedAt: "2026-04-17T00:00:00Z",
      prompt: "why can't i publish?",
    });
    expect(a).toBe(b);
  });

  it("honours ASK_AI_DISABLE_CACHE=true", () => {
    process.env.ASK_AI_DISABLE_CACHE = "true";
    const key = "disabled";
    setCachedResponse(key, { data: { x: 1 }, generatedAt: new Date().toISOString() });
    expect(getCachedResponse(key)).toBeUndefined();
  });
});

describe("rate-limiter", () => {
  beforeEach(() => {
    // Reset env to defaults.
    delete process.env.ASK_AI_RATE_LIMIT_PER_MINUTE;
  });

  it("admins are exempt", () => {
    for (let i = 0; i < 20; i++) {
      const r = checkRateLimit("admin-user", true);
      expect(r.allowed).toBe(true);
    }
  });

  it("blocks non-admins past the configured limit", () => {
    process.env.ASK_AI_RATE_LIMIT_PER_MINUTE = "3";
    const userId = `rate-test-${Date.now()}-${Math.random()}`;
    expect(checkRateLimit(userId, false).allowed).toBe(true);
    expect(checkRateLimit(userId, false).allowed).toBe(true);
    expect(checkRateLimit(userId, false).allowed).toBe(true);
    const blocked = checkRateLimit(userId, false);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSeconds).toBeGreaterThanOrEqual(0);
  });
});

describe("buildSafeLinks", () => {
  it("produces blog detail + google doc + live URL for a blog", () => {
    const links = buildSafeLinks("blog", "b1", {
      kind: "blog",
      id: "b1",
      googleDocUrl: "https://docs.google.com/document/d/abc",
      liveUrl: "https://www.sighthound.com/blog/x",
    } as unknown as import("@/app/api/ai/utils/fact-provider").FactContext);

    expect(links.find((l) => l.key === "blog_detail")).toBeDefined();
    expect(links.find((l) => l.key === "google_doc")?.kind).toBe("external");
    expect(links.find((l) => l.key === "live_url")?.kind).toBe("external");
  });

  it("produces workspace pointers for workspace entity type", () => {
    const links = buildSafeLinks("workspace", null, null);
    expect(links.map((l) => l.key)).toEqual(
      expect.arrayContaining(["dashboard", "my_tasks", "calendar"])
    );
  });

  it("never returns duplicate keys", () => {
    const links = buildSafeLinks("social_post", "s1", {
      kind: "social_post",
      id: "s1",
      canvaUrl: "https://canva.com/x",
      associatedBlogId: "ab1",
      liveLinks: ["https://linkedin.com/x", "https://facebook.com/y"],
    } as unknown as import("@/app/api/ai/utils/fact-provider").FactContext);
    const keys = links.map((l) => l.key);
    expect(new Set(keys).size).toBe(keys.length);
  });
});
