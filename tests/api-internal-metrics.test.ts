import { NextRequest } from "next/server";

import { GET } from "@/app/api/internal/metrics/route";
import { requirePermission } from "@/lib/server-permissions";

jest.mock("@/lib/server-permissions", () => ({
  requirePermission: jest.fn(),
}));
afterEach(() => {
  delete globalThis.__deprecatedIdeasDeleteHits;
});

describe("internal metrics authorization", () => {
  test.each([
    [401, "Unauthorized", "UNAUTHORIZED"],
    [403, "Permission denied", "FORBIDDEN"],
  ] as const)(
    "denies unauthenticated or non-admin caller with %i",
    async (status, error, errorCode) => {
      jest.mocked(requirePermission).mockResolvedValue({ error, status });
      const request = new NextRequest("http://localhost/api/internal/metrics");

      const response = await GET(request);

      expect(requirePermission).toHaveBeenCalledWith(request, "manage_users");
      expect(response.status).toBe(status);
      expect(await response.json()).toMatchObject({
        success: false,
        errorCode,
      });
    }
  );

  test("returns metrics to an authorized caller", async () => {
    jest.mocked(requirePermission).mockResolvedValue({
      context: {},
    } as unknown as Awaited<ReturnType<typeof requirePermission>>);
    globalThis.__deprecatedIdeasDeleteHits = 3;

    const response = await GET(
      new NextRequest("http://localhost/api/internal/metrics")
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      success: true,
      deprecatedIdeasDeleteHits: 3,
    });
  });
});
