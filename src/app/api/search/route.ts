/**
 * GET /api/search?q=... — global cross-entity search scaffold.
 *
 * Returns grouped results for blogs, social posts, and ideas using the
 * existing permission-gated admin client pattern. Visibility filtering
 * follows the caller's `view_*` permissions to stay aligned with the
 * UI's read scope.
 *
 * Behaviour:
 *  - Empty query returns most recently updated items per group.
 *  - Query is case-insensitive partial match on title columns.
 *  - Max 10 rows per group to keep response fast (<250ms p50 budget).
 */

import { NextRequest, NextResponse } from "next/server";

import { authenticateRequest, hasPermission } from "@/lib/server-permissions";
import type { createAdminClient } from "@/lib/supabase/server";

type SearchResult = {
  id: string;
  title: string;
  kind: "blog" | "social" | "idea";
  site: string | null;
  href: string;
  statusLabel?: string | null;
};

const LIMIT_PER_GROUP = 10;
const EMPTY_RESPONSE: { query: string; results: SearchResult[] } = {
  query: "",
  results: [],
};

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const query = (url.searchParams.get("q") ?? "").trim();
  const auth = await authenticateRequest(request);
  if ("error" in auth) {
    return NextResponse.json(EMPTY_RESPONSE, { status: 200 });
  }
  const { adminClient } = auth.context;

  const like = query ? `%${query.replace(/[%_]/g, "")}%` : null;
  const tasks: Array<Promise<Array<Record<string, unknown>>>> = [];
  const kinds: Array<SearchResult["kind"]> = [];

  if (hasPermission(auth.context, "view_dashboard")) {
    kinds.push("blog");
    tasks.push(
      searchTable(adminClient, "blogs", {
        like,
        columns: "id,title,site,overall_status,updated_at",
        orderColumn: "updated_at",
      })
    );
  }
  if (hasPermission(auth.context, "view_social_posts")) {
    kinds.push("social");
    tasks.push(
      searchTable(adminClient, "social_posts", {
        like,
        columns: "id,title,status,updated_at",
        orderColumn: "updated_at",
      })
    );
  }
  if (hasPermission(auth.context, "view_ideas")) {
    kinds.push("idea");
    tasks.push(
      searchTable(adminClient, "ideas", {
        like,
        columns: "id,title,site,updated_at",
        orderColumn: "updated_at",
      })
    );
  }

  const grouped = await Promise.all(tasks);
  const results: SearchResult[] = [];
  grouped.forEach((rows, index) => {
    const kind = kinds[index];
    if (!kind) {
      return;
    }
    if (kind === "blog") {
      results.push(...mapBlogResults(rows));
    } else if (kind === "social") {
      results.push(...mapSocialResults(rows));
    } else if (kind === "idea") {
      results.push(...mapIdeaResults(rows));
    }
  });

  return NextResponse.json(
    { query, results },
    {
      status: 200,
      headers: { "Cache-Control": "no-store" },
    }
  );
}

type AdminClient = ReturnType<typeof createAdminClient>;

async function searchTable(
  supabase: AdminClient,
  table: string,
  options: { like: string | null; columns: string; orderColumn: string }
): Promise<Array<Record<string, unknown>>> {
  try {
    const builder = supabase.from(table).select(options.columns);
    const filtered = options.like
      ? builder.ilike("title", options.like)
      : builder;
    const { data } = await filtered
      .order(options.orderColumn, { ascending: false })
      .limit(LIMIT_PER_GROUP);
    return Array.isArray(data)
      ? (data as unknown as Array<Record<string, unknown>>)
      : [];
  } catch (error) {
    console.warn(`global search ${table} failed`, error);
    return [];
  }
}

function mapBlogResults(
  rows: Array<Record<string, unknown>>
): SearchResult[] {
  const results: SearchResult[] = [];
  for (const row of rows) {
    const id = String(row.id ?? "");
    if (!id) {
      continue;
    }
    results.push({
      id,
      title: String(row.title ?? "Untitled"),
      kind: "blog",
      site: typeof row.site === "string" ? row.site : null,
      statusLabel:
        typeof row.overall_status === "string" ? row.overall_status : null,
      href: `/blogs/${id}`,
    });
  }
  return results;
}

function mapSocialResults(
  rows: Array<Record<string, unknown>>
): SearchResult[] {
  const results: SearchResult[] = [];
  for (const row of rows) {
    const id = String(row.id ?? "");
    if (!id) {
      continue;
    }
    results.push({
      id,
      title: String(row.title ?? "Untitled"),
      kind: "social",
      site: null,
      statusLabel: typeof row.status === "string" ? row.status : null,
      href: `/social-posts/${id}`,
    });
  }
  return results;
}

function mapIdeaResults(
  rows: Array<Record<string, unknown>>
): SearchResult[] {
  const results: SearchResult[] = [];
  for (const row of rows) {
    const id = String(row.id ?? "");
    if (!id) {
      continue;
    }
    results.push({
      id,
      title: String(row.title ?? "Untitled"),
      kind: "idea",
      site: typeof row.site === "string" ? row.site : null,
      href: `/ideas?focus=${id}`,
    });
  }
  return results;
}
