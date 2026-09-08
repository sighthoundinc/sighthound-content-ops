/**
 * Handler-test transport only. Does NOT simulate triggers, RLS, or transactions.
 * Live persisted-state verification must be run separately.
 */
export function databaseFake(record: Record<string, unknown>) {
  const state = {
    record, links: [] as Record<string, unknown>[],
    conflict: false, failRead: false, failWrite: false,
  };
  const updates: Record<string, unknown>[] = [];
  const filters: Array<[string, unknown]> = [];
  const inserts: Array<{ table: string; payload: unknown }> = [];
  const rpc = jest.fn().mockResolvedValue({ data: { status: "creative_approved" }, error: null });
  const from = jest.fn((table: string) => {
    let update: Record<string, unknown> | undefined;
    let insert: unknown;
    const result = () => {
      if (insert !== undefined) return { data: null, error: null };
      if (update) {
        if (state.failWrite) return { data: null, error: { code: "DB_FAILURE" } };
        if (state.conflict) return { data: null, error: null };
        return { data: { ...state.record, ...update }, error: null };
      }
      if (state.failRead) return { data: null, error: { code: "DB_FAILURE" } };
      if (table === "social_post_links") return { data: state.links, error: null };
      if (table === "profiles") return { data: [], error: null };
      return { data: state.record, error: null };
    };
    type Result = ReturnType<typeof result>;
    type Query = {
      select: (...args: unknown[]) => Query;
      eq: (key: string, value: unknown) => Query;
      in: (...args: unknown[]) => Query;
      limit: (...args: unknown[]) => Query;
      update: (payload: Record<string, unknown>) => Query;
      insert: (payload: unknown) => Query;
      maybeSingle: () => Promise<Result>;
      then: (resolve: (value: Result) => unknown) => Promise<unknown>;
    };
    const query: Query = {
      select: jest.fn(() => query),
      eq: jest.fn((key: string, value: unknown) => { filters.push([key, value]); return query; }),
      in: jest.fn(() => query),
      limit: jest.fn(() => query),
      update: jest.fn((payload: Record<string, unknown>) => {
        updates.push(payload); update = payload; return query;
      }),
      insert: jest.fn((payload: unknown) => {
        inserts.push({ table, payload }); insert = payload; return query;
      }),
      maybeSingle: jest.fn(async () => result()),
      then: (resolve: (value: ReturnType<typeof result>) => unknown) =>
        Promise.resolve(result()).then(resolve),
    };
    return query;
  });
  return { client: { from, rpc }, state, updates, filters, inserts };
}
