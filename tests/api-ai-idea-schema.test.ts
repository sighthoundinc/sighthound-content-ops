import type { SupabaseClient } from "@supabase/supabase-js";

import {
  getIdeaEntityCacheVersion,
  queryIdeaEntityState,
} from "@/app/api/ai/utils/idea-entity-state";

describe("Ask AI idea schema", () => {
  test("selects only confirmed blog_ideas fields and derives cache version from them", async () => {
    const result = {
      data: {
        id: "idea-1",
        title: "Relay search",
        site: "sighthound.com",
        description: "Search changes",
        created_by: "user-1",
        is_converted: false,
        converted_blog_id: null,
        created_at: "2026-11-01T12:00:00.000Z",
      },
      error: null,
    };
    const maybeSingle = jest.fn().mockResolvedValue(result);
    const eq = jest.fn().mockReturnValue({ maybeSingle });
    const select = jest.fn().mockReturnValue({ eq });
    const from = jest.fn().mockReturnValue({ select });
    const supabase = { from } as unknown as SupabaseClient;

    const queryResult = await queryIdeaEntityState(supabase, "idea-1");

    expect(from).toHaveBeenCalledWith("blog_ideas");
    expect(select).toHaveBeenCalledWith(
      "id,title,site,description,created_by,is_converted,converted_blog_id,created_at"
    );
    expect(select.mock.calls[0]?.[0]).not.toContain("updated_at");
    expect(eq).toHaveBeenCalledWith("id", "idea-1");
    expect(queryResult.data?.created_at).toBe(result.data.created_at);
    const cacheVersion = getIdeaEntityCacheVersion(result.data);
    expect(cacheVersion).toMatch(/^[a-f0-9]{64}$/);
    expect(
      getIdeaEntityCacheVersion({ ...result.data, description: "Updated idea" })
    ).not.toBe(cacheVersion);
  });
});
