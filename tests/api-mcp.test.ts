import { Client } from "@modelcontextprotocol/client";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/client";

import { POST } from "@/app/api/mcp/route";
import { POST as postMcpUrlSecret } from "@/app/api/mcp/s/[secret]/route";
import {
  hasPermission,
  resolveActiveProfileContext,
  type AuthenticatedRequestContext,
} from "@/lib/server-permissions";
import {
  MCP_URL_SECRET_REDACTED_PATH,
  mcpRateLimiter,
  SlidingWindowRateLimiter,
} from "@/lib/mcp/security";

jest.mock("next/server", () => ({
  after: (callback: () => void | Promise<void>) => {
    void callback();
  },
}));

jest.mock("@/lib/server-permissions", () => ({
  hasPermission: jest.fn(),
  resolveActiveProfileContext: jest.fn(),
}));

const ACTOR_ID = "11111111-1111-4111-8111-111111111111";
const OTHER_USER_ID = "22222222-2222-4222-8222-222222222222";
const BLOG_ID = "33333333-3333-4333-8333-333333333333";
const SOCIAL_POST_ID = "44444444-4444-4444-8444-444444444444";
const MCP_TOKEN = "mcp-test-token-that-is-never-logged";
const MCP_URL_SECRET = "mcp-url-secret-that-is-never-logged";

const blogRow = {
  id: BLOG_ID,
  title: "Relay workflow guide",
  slug: "relay-workflow-guide",
  site: "sighthound.com",
  writer_id: ACTOR_ID,
  publisher_id: ACTOR_ID,
  writer_status: "in_progress",
  publisher_status: "not_started",
  overall_status: "writing",
  google_doc_url: "https://docs.google.com/document/d/example",
  live_url: null,
  scheduled_publish_date: "2026-11-10",
  display_published_date: null,
  actual_published_at: null,
  published_at: null,
  target_publish_date: "2026-11-10",
  status_updated_at: "2026-11-01T12:00:00.000Z",
  is_archived: false,
  created_by: ACTOR_ID,
  created_at: "2026-10-01T12:00:00.000Z",
  updated_at: "2026-11-01T12:00:00.000Z",
};

const socialPostRow = {
  id: SOCIAL_POST_ID,
  title: "Relay launch post",
  product: "redactor",
  type: "image",
  canva_url: "https://www.canva.com/design/example",
  canva_page: 2,
  caption: "A social caption, not article text.",
  platforms: ["linkedin"],
  scheduled_date: "2026-11-12",
  status: "draft",
  created_by: ACTOR_ID,
  worker_user_id: ACTOR_ID,
  reviewer_user_id: OTHER_USER_ID,
  assigned_to_user_id: ACTOR_ID,
  associated_blog_id: BLOG_ID,
  created_at: "2026-10-02T12:00:00.000Z",
  updated_at: "2026-11-02T12:00:00.000Z",
  associated_blog: {
    id: BLOG_ID,
    title: blogRow.title,
    slug: blogRow.slug,
    site: blogRow.site,
  },
  social_post_links: [
    {
      id: "55555555-5555-4555-8555-555555555555",
      platform: "linkedin",
      url: "https://www.linkedin.com/posts/example",
      created_at: "2026-11-03T12:00:00.000Z",
      updated_at: "2026-11-03T12:00:00.000Z",
    },
  ],
};

const resultRowsByTable: Record<string, unknown[]> = {
  blogs: [blogRow],
  blog_comments: [
    {
      id: "66666666-6666-4666-8666-666666666666",
      blog_id: BLOG_ID,
      user_id: ACTOR_ID,
      comment: "A review comment.",
      created_at: "2026-11-04T12:00:00.000Z",
      updated_at: "2026-11-04T12:00:00.000Z",
    },
  ],
  blog_assignment_history: [
    {
      id: "77777777-7777-4777-8777-777777777777",
      blog_id: BLOG_ID,
      changed_by: ACTOR_ID,
      event_type: "assignment_changed",
      field_name: "writer_id",
      old_value: OTHER_USER_ID,
      new_value: ACTOR_ID,
      metadata: {},
      changed_at: "2026-11-04T11:00:00.000Z",
    },
  ],
  social_posts: [socialPostRow],
  blog_ideas: [
    {
      id: "88888888-8888-4888-8888-888888888888",
      title: "Safer records workflows",
      site: "redactor.com",
      description: "Idea description.",
      created_by: ACTOR_ID,
      created_at: "2026-11-02T12:00:00.000Z",
      is_converted: false,
      converted_blog_id: null,
    },
  ],
  task_assignments: [],
};

type QueryCall = { table: string; method: string; args: unknown[] };

function createMockAdminClient() {
  const calls: QueryCall[] = [];
  const logWrites: Record<string, unknown>[] = [];
  let rejectLogWrites = false;

  const from = jest.fn((table: string) => {
    const data = resultRowsByTable[table] ?? [];
    const result = { data, error: null, count: data.length };
    const query: Record<string | symbol, unknown> = {};
    const chain = new Proxy(query, {
      get(_target, property) {
        if (property === "then") {
          return (
            resolve?: (value: typeof result) => unknown,
            reject?: (reason: unknown) => unknown
          ) => Promise.resolve(result).then(resolve, reject);
        }
        if (property === "maybeSingle") {
          return async () => ({ data: data[0] ?? null, error: null });
        }
        if (property === "insert") {
          return async (row: Record<string, unknown>) => {
            logWrites.push(row);
            if (rejectLogWrites) {
              throw new Error("simulated access-log migration failure");
            }
            return { error: null };
          };
        }
        return (...args: unknown[]) => {
          calls.push({ table, method: String(property), args });
          return chain;
        };
      },
    });
    return chain;
  });

  return {
    client: { from } as unknown as AuthenticatedRequestContext["adminClient"],
    calls,
    from,
    logWrites,
    setRejectLogWrites(value: boolean) {
      rejectLogWrites = value;
    },
  };
}

function readToolText(result: {
  content: Array<{ type: string; text?: string }>;
}) {
  const text = result.content.find((item) => item.type === "text")?.text;
  if (!text) throw new Error("MCP tool returned no text content.");
  return JSON.parse(text) as Record<string, unknown>;
}

describe("Content Relay read-only MCP endpoint", () => {
  let mockAdmin: ReturnType<typeof createMockAdminClient>;
  let context: AuthenticatedRequestContext;

  beforeEach(() => {
    process.env.MCP_API_TOKEN = MCP_TOKEN;
    process.env.MCP_URL_SECRET = MCP_URL_SECRET;
    process.env.MCP_ACT_AS_USER_ID = ACTOR_ID;
    jest.spyOn(mcpRateLimiter, "allow").mockReturnValue(true);
    mockAdmin = createMockAdminClient();
    context = {
      userId: ACTOR_ID,
      profile: {
        id: ACTOR_ID,
        role: "writer",
        user_roles: ["writer"],
        is_active: true,
      },
      permissions: new Set([
        "view_dashboard",
        "view_archived_blogs",
        "view_social_posts",
        "view_ideas",
        "view_my_tasks",
      ]),
      rolePermissionRows: [],
      adminClient: mockAdmin.client,
    } as AuthenticatedRequestContext;
    jest.mocked(resolveActiveProfileContext).mockResolvedValue(context);
    jest.mocked(hasPermission).mockImplementation(
      (authContext, permission) =>
        (authContext as AuthenticatedRequestContext).permissions.has(permission)
    );
  });

  afterEach(() => {
    delete process.env.MCP_API_TOKEN;
    delete process.env.MCP_URL_SECRET;
    delete process.env.MCP_ACT_AS_USER_ID;
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  async function withMcpClient<T>(
    run: (client: Client) => Promise<T>,
    endpoint = new URL("https://content-relay.test/api/mcp"),
    post: (request: Request) => Promise<Response> = POST,
    authorization: string | null = `Bearer ${MCP_TOKEN}`
  ) {
    const transport = new StreamableHTTPClientTransport(
      endpoint,
      {
        requestInit: {
          headers: authorization ? { authorization } : {},
        },
        fetch: async (input, init) => {
          const request =
            input instanceof Request ? input : new Request(input, init);
          return post(request);
        },
      }
    );
    const client = new Client({ name: "content-relay-mcp-test", version: "1.0.0" });
    await client.connect(transport);
    try {
      return await run(client);
    } finally {
      await client.close();
    }
  }
  function withUrlSecretRoute(request: Request) {
    const secret = new URL(request.url).pathname.split("/").pop();
    return postMcpUrlSecret(request, {
      params: Promise.resolve({ secret: secret ?? "" }),
    });
  }

  test.each([
    ["missing", null],
    ["wrong", "Bearer wrong-token"],
  ])("%s bearer token receives an opaque 401", async (_label, authorization) => {
    const response = await POST(
      new Request("https://content-relay.test/api/mcp", {
        method: "POST",
        headers: authorization ? { authorization } : {},
        body: "{}",
      })
    );

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "Unauthorized" });
    expect(resolveActiveProfileContext).not.toHaveBeenCalled();
  });

  test("URL-secret route rejects invalid credentials without logging or echoing them", async () => {
    const invalidSecret = "invalid-mcp-url-secret";
    const infoSpy = jest.spyOn(console, "info").mockImplementation(() => {});
    try {
      const response = await postMcpUrlSecret(
        new Request(`https://content-relay.test/api/mcp/s/${invalidSecret}`, {
          method: "POST",
          body: "{}",
        }),
        { params: Promise.resolve({ secret: invalidSecret }) }
      );
      const body = await response.text();

      expect(response.status).toBe(401);
      expect(body).toBe(JSON.stringify({ error: "Unauthorized" }));
      expect(body).not.toContain(invalidSecret);
      expect(infoSpy).not.toHaveBeenCalled();
      expect(resolveActiveProfileContext).not.toHaveBeenCalled();
    } finally {
      infoSpy.mockRestore();
    }
  });

  test("URL-secret route shares the read-only tools, actor, rate limit, and telemetry", async () => {
    const infoSpy = jest.spyOn(console, "info").mockImplementation(() => {});
    try {
      await withMcpClient(
        async (client) => {
          const { tools } = await client.listTools();
          const result = await client.callTool({
            name: "list_ideas",
            arguments: {},
          });

          expect(tools.map((tool) => tool.name).sort()).toEqual([
            "get_blog",
            "get_my_tasks",
            "get_social_post",
            "list_blogs",
            "list_ideas",
            "list_social_posts",
          ]);
          expect(result.isError).not.toBe(true);
        },
        new URL(`https://content-relay.test/api/mcp/s/${MCP_URL_SECRET}`),
        withUrlSecretRoute,
        null
      );

      expect(resolveActiveProfileContext).toHaveBeenCalledWith(ACTOR_ID);
      expect(mockAdmin.logWrites).toContainEqual({
        user_id: ACTOR_ID,
        event_type: "mcp_tool_call",
        tool_name: "list_ideas",
      });
      expect(infoSpy).toHaveBeenCalledWith("[MCP] Request accepted", {
        path: MCP_URL_SECRET_REDACTED_PATH,
      });
      expect(JSON.stringify(infoSpy.mock.calls)).not.toContain(MCP_URL_SECRET);
      expect(JSON.stringify(mockAdmin.logWrites)).not.toContain(MCP_URL_SECRET);
    } finally {
      infoSpy.mockRestore();
    }
  });

  test("URL-secret route shares the bearer route rate limit", async () => {
    const allowSpy = jest.spyOn(mcpRateLimiter, "allow").mockReturnValue(false);
    const infoSpy = jest.spyOn(console, "info").mockImplementation(() => {});
    try {
      const response = await postMcpUrlSecret(
        new Request(`https://content-relay.test/api/mcp/s/${MCP_URL_SECRET}`, {
          method: "POST",
          body: "{}",
        }),
        { params: Promise.resolve({ secret: MCP_URL_SECRET }) }
      );

      expect(response.status).toBe(429);
      expect(response.headers.get("Retry-After")).toBeTruthy();
      expect(resolveActiveProfileContext).not.toHaveBeenCalled();
      expect(infoSpy).not.toHaveBeenCalled();
    } finally {
      allowSpy.mockRestore();
      infoSpy.mockRestore();
    }
  });

  test("uses only the configured active-profile identity", async () => {
    await withMcpClient(async (client) => {
      await client.callTool({
        name: "get_my_tasks",
        arguments: {},
      });
    });

    expect(resolveActiveProfileContext).toHaveBeenCalledWith(ACTOR_ID);
  });

  test("rejects an invalid configured actor without resolving a profile", async () => {
    process.env.MCP_ACT_AS_USER_ID = "not-a-uuid";
    const response = await POST(
      new Request("https://content-relay.test/api/mcp", {
        method: "POST",
        headers: { authorization: `Bearer ${MCP_TOKEN}` },
        body: "{}",
      })
    );

    expect(response.status).toBe(503);
    expect(resolveActiveProfileContext).not.toHaveBeenCalled();
  });

  test("tool listing exposes only the six phase-one tools and required data limitations", async () => {
    await withMcpClient(async (client) => {
      const { tools } = await client.listTools();
      expect(tools.map((tool) => tool.name).sort()).toEqual([
        "get_blog",
        "get_my_tasks",
        "get_social_post",
        "list_blogs",
        "list_ideas",
        "list_social_posts",
      ]);
      for (const tool of tools) {
        expect(tool.description).toContain("not blog article text");
        expect(tool.description).toContain("google_doc_url");
        expect(tool.description).toContain("revision history is unavailable");
      }
    });
  });

  test("registers no write tools when MCP_MUTATIONS_ENABLED is unset", async () => {
    const configuredValue = process.env.MCP_MUTATIONS_ENABLED;
    delete process.env.MCP_MUTATIONS_ENABLED;

    try {
      await withMcpClient(async (client) => {
        const { tools } = await client.listTools();

        expect(tools.map((tool) => tool.name).sort()).toEqual([
          "get_blog",
          "get_my_tasks",
          "get_social_post",
          "list_blogs",
          "list_ideas",
          "list_social_posts",
        ]);
      });
    } finally {
      if (configuredValue === undefined) {
        delete process.env.MCP_MUTATIONS_ENABLED;
      } else {
        process.env.MCP_MUTATIONS_ENABLED = configuredValue;
      }
    }
  });

  test("permission denial blocks the protected data query", async () => {
    context.permissions.delete("view_ideas");

    await withMcpClient(async (client) => {
      const result = await client.callTool({
        name: "list_ideas",
        arguments: {},
      });
      expect(result.isError).toBe(true);
      expect(result.content).toContainEqual(
        expect.objectContaining({ text: "Permission denied." })
      );
    });

    expect(mockAdmin.from).not.toHaveBeenCalledWith("blog_ideas");
  });

  test("archived-blog listing returns a permission error before querying blogs", async () => {
    context.permissions.delete("view_archived_blogs");

    await withMcpClient(async (client) => {
      const result = await client.callTool({
        name: "list_blogs",
        arguments: { is_archived: true },
      });
      expect(result.isError).toBe(true);
      expect(result.content).toContainEqual(
        expect.objectContaining({ text: "Permission denied." })
      );
    });

    expect(mockAdmin.from).not.toHaveBeenCalledWith("blogs");
  });

  test("strict schemas reject user-supplied actor identities and invalid pagination", async () => {
    await withMcpClient(async (client) => {
      const spoofed = await client.callTool({
        name: "get_my_tasks",
        arguments: { user_id: OTHER_USER_ID },
      });
      const invalid = await client.callTool({
        name: "list_blogs",
        arguments: { limit: 101 },
      });
      expect(spoofed.isError).toBe(true);
      expect(invalid.isError).toBe(true);
    });

    expect(mockAdmin.from).not.toHaveBeenCalledWith("task_assignments");
    expect(mockAdmin.from).not.toHaveBeenCalledWith("blogs");
  });

  test("list_blogs supports its filters and returns paginated metadata", async () => {
    await withMcpClient(async (client) => {
      const result = await client.callTool({
        name: "list_blogs",
        arguments: {
          site: "sighthound.com",
          overall_status: "writing",
          writer_id: ACTOR_ID,
          publisher_id: ACTOR_ID,
          scheduled_from: "2026-11-01",
          scheduled_to: "2026-11-30",
          search: "relay workflow",
          limit: 10,
          offset: 0,
        },
      });

      expect(result.isError).not.toBe(true);
      expect(readToolText(result)).toMatchObject({
        total: 1,
        limit: 10,
        blogs: [{ id: BLOG_ID, google_doc_url: blogRow.google_doc_url }],
      });
    });

    expect(mockAdmin.calls).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ table: "blogs", method: "eq", args: ["site", "sighthound.com"] }),
        expect.objectContaining({ table: "blogs", method: "gte", args: ["scheduled_publish_date", "2026-11-01"] }),
        expect.objectContaining({ table: "blogs", method: "range", args: [0, 9] }),
      ])
    );
  });

  test.each([
    ["blog", "list_blogs", { search: "%_*(),.:" }],
    ["idea", "list_ideas", { search: "%_*" }],
  ])(
    "%s search made only of stripped metacharacters returns no rows",
    async (_label, toolName, arguments_) => {
      await withMcpClient(async (client) => {
        const result = await client.callTool({
          name: toolName,
          arguments: arguments_,
        });
        expect(result.isError).not.toBe(true);
        const output = readToolText(result);
        expect(output.total).toBe(0);
        expect(output.blogs ?? output.ideas).toEqual([]);
      });

      expect(mockAdmin.from).not.toHaveBeenCalledWith(
        toolName === "list_blogs" ? "blogs" : "blog_ideas"
      );
    }
  );

  test("get_blog returns comments and the latest assignment-history rows", async () => {
    await withMcpClient(async (client) => {
      const result = await client.callTool({
        name: "get_blog",
        arguments: { slug: blogRow.slug },
      });

      expect(result.isError).not.toBe(true);
      expect(readToolText(result)).toMatchObject({
        blog: { id: BLOG_ID, slug: blogRow.slug },
        comments: [{ comment: "A review comment." }],
        assignment_history: [{ event_type: "assignment_changed" }],
      });
    });

    expect(mockAdmin.calls).toContainEqual(
      expect.objectContaining({
        table: "blog_assignment_history",
        method: "limit",
        args: [20],
      })
    );
  });

  test("social tools apply filters and include associated blog and linked URLs", async () => {
    await withMcpClient(async (client) => {
      const listed = await client.callTool({
        name: "list_social_posts",
        arguments: {
          product: "redactor",
          type: "image",
          status: "draft",
          platforms: ["linkedin"],
          associated_blog_id: BLOG_ID,
        },
      });
      const fetched = await client.callTool({
        name: "get_social_post",
        arguments: { id: SOCIAL_POST_ID },
      });

      expect(listed.isError).not.toBe(true);
      expect(readToolText(listed)).toMatchObject({
        social_posts: [
          {
            associated_blog: { id: BLOG_ID, title: blogRow.title },
            social_post_links: [{ platform: "linkedin" }],
          },
        ],
      });
      expect(readToolText(fetched)).toMatchObject({
        social_post: {
          id: SOCIAL_POST_ID,
          associated_blog: { id: BLOG_ID },
          social_post_links: [{ url: socialPostRow.social_post_links[0].url }],
        },
      });
    });

    expect(mockAdmin.calls).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ table: "social_posts", method: "overlaps" }),
        expect.objectContaining({ table: "social_posts", method: "eq", args: ["associated_blog_id", BLOG_ID] }),
      ])
    );
  });

  test("list_ideas reads only confirmed blog_ideas columns", async () => {
    await withMcpClient(async (client) => {
      const result = await client.callTool({
        name: "list_ideas",
        arguments: { site: "redactor.com", search: "records" },
      });

      expect(result.isError).not.toBe(true);
      expect(readToolText(result)).toMatchObject({
        ideas: [{ title: "Safer records workflows" }],
      });
    });

    const selectCall = mockAdmin.calls.find(
      (call) => call.table === "blog_ideas" && call.method === "select"
    );
    expect(selectCall?.args[0]).toBe(
      "id,title,site,description,created_by,created_at,is_converted,converted_blog_id"
    );
    expect(String(selectCall?.args[0])).not.toContain("updated_at");
  });

  test("get_my_tasks reuses shared classification and deduplicates multi-role blogs", async () => {
    await withMcpClient(async (client) => {
      const result = await client.callTool({
        name: "get_my_tasks",
        arguments: {},
      });
      const tasks = readToolText(result);
      const required = tasks.required_by_me as Array<Record<string, unknown>>;

      expect(result.isError).not.toBe(true);
      expect(required.filter((task) => task.kind === "blog")).toHaveLength(1);
      expect(required).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ kind: "blog", action_state: "action_required" }),
          expect.objectContaining({ kind: "social", action_state: "action_required" }),
        ])
      );
    });
  });

  test("failed access-log inserts do not block tool results or include credentials and arguments", async () => {
    mockAdmin.setRejectLogWrites(true);

    await withMcpClient(async (client) => {
      const result = await client.callTool({
        name: "list_ideas",
        arguments: { search: "private query" },
      });
      expect(result.isError).not.toBe(true);
      expect(readToolText(result).ideas).toBeDefined();
    });

    expect(mockAdmin.logWrites).toEqual(
      expect.arrayContaining([
        {
          user_id: ACTOR_ID,
          event_type: "mcp_tool_call",
          tool_name: "list_ideas",
        },
      ])
    );
    expect(JSON.stringify(mockAdmin.logWrites)).not.toContain(MCP_TOKEN);
    expect(JSON.stringify(mockAdmin.logWrites)).not.toContain("private query");
  });

  test("returns 429 before profile lookup when the per-instance request limit is exhausted", async () => {
    const allowSpy = jest.spyOn(mcpRateLimiter, "allow").mockReturnValue(false);
    try {
      const response = await POST(
        new Request("https://content-relay.test/api/mcp", {
          method: "POST",
          headers: { authorization: `Bearer ${MCP_TOKEN}` },
          body: "{}",
        })
      );

      expect(response.status).toBe(429);
      expect(response.headers.get("Retry-After")).toBeTruthy();
      expect(resolveActiveProfileContext).not.toHaveBeenCalled();
    } finally {
      allowSpy.mockRestore();
    }
  });
});

describe("MCP sliding-window request limit", () => {
  test("allows at most the configured number of requests in a rolling window", () => {
    const limiter = new SlidingWindowRateLimiter(2, 1_000);

    expect(limiter.allow(1_000)).toBe(true);
    expect(limiter.allow(1_500)).toBe(true);
    expect(limiter.allow(1_999)).toBe(false);
    expect(limiter.retryAfterSeconds(1_999)).toBe(1);
    expect(limiter.allow(2_000)).toBe(true);
  });
});
