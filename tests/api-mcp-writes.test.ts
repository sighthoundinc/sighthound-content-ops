import { Client, StreamableHTTPClientTransport } from "@modelcontextprotocol/client";

import { POST } from "@/app/api/mcp/route";
import { getMcpActorContext, runAsMcpActor } from "@/lib/mcp/actor-context";
import { mcpRateLimiter } from "@/lib/mcp/security";
import {
  authenticateRequest,
  resolveActiveProfileContext,
  type AuthenticatedRequestContext,
} from "@/lib/server-permissions";

jest.mock("@/lib/supabase/server", () => ({
  createAdminClient: jest.fn(() => ({})),
  createAnonServerClient: jest.fn(),
}));

jest.mock("@/lib/server-permissions", () => ({
  ...jest.requireActual("@/lib/server-permissions"),
  resolveActiveProfileContext: jest.fn(),
}));

const seenActors: Array<string | null> = [];
jest.mock("@/app/api/blogs/[id]/transition/route", () => ({
  POST: jest.fn(async () => {
    seenActors.push(getMcpActorContext()?.userId ?? null);
    return Response.json(
      { error: "Assign a writer before setting writing status" },
      { status: 400 }
    );
  }),
}));

const ACTOR_ID = "11111111-1111-4111-8111-111111111111";
const OTHER_ID = "22222222-2222-4222-8222-222222222222";
const IDEA_ID = "33333333-3333-4333-8333-333333333333";
const POST_ID = "44444444-4444-4444-8444-444444444444";
const BLOG_ID = "55555555-5555-4555-8555-555555555555";
const TOKEN = "mcp-writes-test-token";

type Write = { table: string; method: string; payload: unknown };

function createMockAdminClient(rows: Record<string, Record<string, unknown>>) {
  const writes: Write[] = [];
  const from = (table: string) => {
    let pending: Write | null = null;
    const result = () => ({ data: rows[table] ?? null, error: null });
    const chain: Record<string, unknown> = {
      select: () => chain,
      eq: () => chain,
      maybeSingle: async () => result(),
      then: (resolve: (value: unknown) => unknown) => Promise.resolve(result()).then(resolve),
    };
    for (const method of ["insert", "update", "upsert", "delete"]) {
      chain[method] = (payload: unknown) => {
        pending = { table, method, payload };
        if (table !== "access_logs") writes.push(pending);
        return chain;
      };
    }
    void pending;
    return chain;
  };
  return { client: { from } as unknown as AuthenticatedRequestContext["adminClient"], writes };
}

function makeContext(
  admin: ReturnType<typeof createMockAdminClient>,
  permissions: string[],
  roles = ["writer"]
) {
  return {
    userId: ACTOR_ID,
    profile: { id: ACTOR_ID, role: roles[0], user_roles: roles, is_active: true },
    permissions: new Set(permissions),
    rolePermissionRows: [],
    adminClient: admin.client,
  } as unknown as AuthenticatedRequestContext;
}

async function withClient<T>(run: (client: Client) => Promise<T>) {
  const transport = new StreamableHTTPClientTransport(
    new URL("https://content-relay.test/api/mcp"),
    {
      requestInit: { headers: { authorization: `Bearer ${TOKEN}` } },
      fetch: async (input, init) =>
        POST(input instanceof Request ? input : new Request(input, init)),
    }
  );
  const client = new Client({ name: "writes-test", version: "1.0.0" });
  await client.connect(transport);
  try {
    return await run(client);
  } finally {
    await client.close();
  }
}

function text(result: unknown) {
  return (result as { content: Array<{ text: string }> }).content[0].text;
}

describe("Content Relay MCP write tools", () => {
  beforeEach(() => {
    process.env.MCP_API_TOKEN = TOKEN;
    process.env.MCP_ACT_AS_USER_ID = ACTOR_ID;
    process.env.MCP_MUTATIONS_ENABLED = "true";
    jest.spyOn(mcpRateLimiter, "allow").mockReturnValue(true);
    seenActors.length = 0;
  });

  afterEach(() => {
    delete process.env.MCP_API_TOKEN;
    delete process.env.MCP_ACT_AS_USER_ID;
    delete process.env.MCP_MUTATIONS_ENABLED;
    jest.restoreAllMocks();
  });

  test("authenticateRequest only trusts the in-process MCP actor, never a request", async () => {
    const context = makeContext(createMockAdminClient({}), []);
    const request = new Request("https://relay.test/api/blogs") as never;

    await expect(runAsMcpActor(context, () => authenticateRequest(request))).resolves.toEqual({
      context,
    });
    await expect(authenticateRequest(request)).resolves.toEqual({
      error: "Missing access token",
      status: 401,
    });
  });

  test("registers write tools only when MCP_MUTATIONS_ENABLED is true", async () => {
    jest.mocked(resolveActiveProfileContext).mockResolvedValue(
      makeContext(createMockAdminClient({}), [])
    );
    const names = await withClient(async (client) =>
      (await client.listTools()).tools.map((tool) => tool.name)
    );
    expect(names).toEqual(
      expect.arrayContaining(["create_blog", "update_blog", "transition_social_post", "create_idea"])
    );
  });

  test("route-backed tools run the existing route as the actor and surface its rule errors", async () => {
    jest.mocked(resolveActiveProfileContext).mockResolvedValue(
      makeContext(createMockAdminClient({}), [])
    );
    const result = await withClient((client) =>
      client.callTool({
        name: "update_blog",
        arguments: { blog_id: BLOG_ID, writer_status: "in_progress" },
      })
    );
    expect(result.isError).toBe(true);
    expect(text(result)).toBe("Assign a writer before setting writing status");
    expect(seenActors).toEqual([ACTOR_ID]);
  });

  test("update_idea is denied for a non-creator non-admin and writes nothing", async () => {
    const admin = createMockAdminClient({ blog_ideas: { id: IDEA_ID, created_by: OTHER_ID } });
    jest.mocked(resolveActiveProfileContext).mockResolvedValue(
      makeContext(admin, ["edit_own_idea"])
    );
    const result = await withClient((client) =>
      client.callTool({ name: "update_idea", arguments: { idea_id: IDEA_ID, title: "New" } })
    );
    expect(text(result)).toBe("Permission denied.");
    expect(admin.writes).toEqual([]);
  });

  test("create_idea records the actor as creator", async () => {
    const admin = createMockAdminClient({ blog_ideas: { id: IDEA_ID } });
    jest.mocked(resolveActiveProfileContext).mockResolvedValue(makeContext(admin, ["create_idea"]));
    const result = await withClient((client) =>
      client.callTool({
        name: "create_idea",
        arguments: { title: "Idea", site: "redactor.com", created_by: OTHER_ID },
      })
    );
    // Strict schema rejects a caller-supplied creator.
    expect(result.isError).toBe(true);

    await withClient((client) =>
      client.callTool({ name: "create_idea", arguments: { title: "Idea", site: "redactor.com" } })
    );
    expect(admin.writes).toEqual([
      {
        table: "blog_ideas",
        method: "insert",
        payload: { title: "Idea", site: "redactor.com", description: null, created_by: ACTOR_ID },
      },
    ]);
  });

  test("social post brief edits require ownership unless admin", async () => {
    const row = { id: POST_ID, created_by: OTHER_ID, worker_user_id: OTHER_ID, reviewer_user_id: OTHER_ID };
    const denied = createMockAdminClient({ social_posts: row });
    jest.mocked(resolveActiveProfileContext).mockResolvedValue(
      makeContext(denied, ["edit_social_post_brief"])
    );
    const result = await withClient((client) =>
      client.callTool({
        name: "update_social_post_brief",
        arguments: { social_post_id: POST_ID, caption: "New caption" },
      })
    );
    expect(text(result)).toBe("Permission denied.");
    expect(denied.writes).toEqual([]);

    const allowed = createMockAdminClient({ social_posts: row });
    jest.mocked(resolveActiveProfileContext).mockResolvedValue(
      makeContext(allowed, ["edit_social_post_brief"], ["admin"])
    );
    await withClient((client) =>
      client.callTool({
        name: "update_social_post_brief",
        arguments: { social_post_id: POST_ID, caption: "New caption" },
      })
    );
    expect(allowed.writes).toEqual([
      { table: "social_posts", method: "update", payload: { caption: "New caption" } },
    ]);
  });
});
