import { NextRequest } from "next/server";

import { GET } from "@/app/api/search/route";
import {
  authenticateRequest,
  hasPermission,
} from "@/lib/server-permissions";

jest.mock("@/lib/server-permissions", () => ({
  authenticateRequest: jest.fn(),
  hasPermission: jest.fn(),
}));

describe("global search idea schema", () => {
  test("queries confirmed blog_ideas columns and orders by created_at", async () => {
    const query = {
      select: jest.fn(),
      ilike: jest.fn(),
      order: jest.fn(),
      limit: jest.fn(),
    };
    query.select.mockReturnValue(query);
    query.ilike.mockReturnValue(query);
    query.order.mockReturnValue(query);
    query.limit.mockResolvedValue({
      data: [
        {
          id: "idea-1",
          title: "Relay search",
          site: "sighthound.com",
          created_at: "2026-11-01T12:00:00.000Z",
        },
      ],
    });
    const adminClient = { from: jest.fn(() => query) };
    jest.mocked(authenticateRequest).mockResolvedValue({
      context: { adminClient },
    } as unknown as Awaited<ReturnType<typeof authenticateRequest>>);
    jest.mocked(hasPermission).mockImplementation(
      (_context, permission) => permission === "view_ideas"
    );

    const response = await GET(
      new NextRequest("http://localhost/api/search?q=relay")
    );

    expect(response.status).toBe(200);
    expect(adminClient.from).toHaveBeenCalledTimes(1);
    expect(adminClient.from).toHaveBeenCalledWith("blog_ideas");
    expect(query.select).toHaveBeenCalledWith("id,title,site,created_at");
    expect(query.select.mock.calls[0]?.[0]).not.toContain("updated_at");
    expect(query.order).toHaveBeenCalledWith("created_at", {
      ascending: false,
    });
    expect(await response.json()).toMatchObject({
      results: [
        {
          id: "idea-1",
          title: "Relay search",
          kind: "idea",
          site: "sighthound.com",
        },
      ],
    });
  });
});
