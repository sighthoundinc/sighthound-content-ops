import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/server";

import {
  BLOG_SELECT_LEGACY,
  BLOG_SELECT_WITH_DATES,
  isMissingBlogDateColumnsError,
  normalizeBlogRows,
} from "@/lib/blog-schema";
import {
  registerReadOnlyTool,
  boundedPaginationSchema,
  sanitizeOrSearchValue,
  throwOnQueryError,
} from "@/lib/mcp/tools/shared";
import type { AuthenticatedRequestContext } from "@/lib/server-permissions";
import type { BlogSite, OverallBlogStatus } from "@/lib/types";
import { hasPermission } from "@/lib/server-permissions";

const BLOG_SITES = ["sighthound.com", "redactor.com"] as const satisfies readonly BlogSite[];
const OVERALL_STATUSES = [
  "planned",
  "writing",
  "needs_revision",
  "ready_to_publish",
  "published",
] as const satisfies readonly OverallBlogStatus[];

const listBlogsSchema = z
  .object({
    site: z.enum(BLOG_SITES).optional(),
    overall_status: z.enum(OVERALL_STATUSES).optional(),
    writer_id: z.string().uuid().optional(),
    publisher_id: z.string().uuid().optional(),
    scheduled_from: z.string().date().optional(),
    scheduled_to: z.string().date().optional(),
    is_archived: z.boolean().default(false),
    search: z.string().trim().min(1).max(100).optional(),
    ...boundedPaginationSchema(),
  })
  .strict()
  .refine(
    ({ scheduled_from, scheduled_to }) =>
      !scheduled_from || !scheduled_to || scheduled_from <= scheduled_to,
    { message: "scheduled_from must be on or before scheduled_to." }
  );

const getBlogSchema = z
  .object({
    id: z.string().uuid().optional(),
    slug: z.string().trim().min(1).max(200).optional(),
  })
  .strict()
  .refine(({ id, slug }) => Boolean(id) !== Boolean(slug), {
    message: "Provide exactly one of id or slug.",
  });

function blogSelectWithSlug(baseSelect: string) {
  return `${baseSelect},slug`;
}

async function queryBlogBySelector(
  context: AuthenticatedRequestContext,
  selector: { id?: string; slug?: string },
  allowArchived: boolean,
  useDateColumns: boolean
) {
  const select = blogSelectWithSlug(
    useDateColumns ? BLOG_SELECT_WITH_DATES : BLOG_SELECT_LEGACY
  );
  let query = context.adminClient.from("blogs").select(select);

  if (selector.id) {
    query = query.eq("id", selector.id);
  } else if (selector.slug) {
    query = query.eq("slug", selector.slug);
  }
  if (!allowArchived) {
    query = query.eq("is_archived", false);
  }
  return query.maybeSingle();
}

async function queryBlogs(
  context: AuthenticatedRequestContext,
  input: z.infer<typeof listBlogsSchema>,
  useDateColumns: boolean
) {
  const dateColumn = useDateColumns
    ? "scheduled_publish_date"
    : "target_publish_date";
  const select = blogSelectWithSlug(
    useDateColumns ? BLOG_SELECT_WITH_DATES : BLOG_SELECT_LEGACY
  );

  let query = context.adminClient
    .from("blogs")
    .select(select, { count: "exact" })
    .eq("is_archived", input.is_archived);
  if (input.site) query = query.eq("site", input.site);
  if (input.overall_status) query = query.eq("overall_status", input.overall_status);
  if (input.writer_id) query = query.eq("writer_id", input.writer_id);
  if (input.publisher_id) query = query.eq("publisher_id", input.publisher_id);
  if (input.scheduled_from) query = query.gte(dateColumn, input.scheduled_from);
  if (input.scheduled_to) query = query.lte(dateColumn, input.scheduled_to);

  if (input.search) {
    const safeSearch = sanitizeOrSearchValue(input.search);
    if (safeSearch) {
      const pattern = `*${safeSearch}*`;
      query = query.or(
        `title.ilike.${pattern},slug.ilike.${pattern}`
      );
    }
  }

  return query
    .order(dateColumn, { ascending: true, nullsFirst: false })
    .order("updated_at", { ascending: false })
    .order("id", { ascending: true })
    .range(input.offset, input.offset + input.limit - 1);
}

export function registerBlogTools(
  server: McpServer,
  context: AuthenticatedRequestContext
) {
  registerReadOnlyTool(server, {
    name: "list_blogs",
    title: "List blogs",
    description:
      "List blog metadata with optional site, overall status, writer, publisher, scheduled-date range, archive, and title/slug search filters. Results are paginated (maximum 100 per page).",
    inputSchema: listBlogsSchema,
    permission: "view_dashboard",
    context,
    authorize: (input) =>
      !input.is_archived || hasPermission(context, "view_archived_blogs"),
    run: async (input) => {
      if (input.search && !sanitizeOrSearchValue(input.search)) {
        return {
          blogs: [],
          total: 0,
          limit: input.limit,
          offset: input.offset,
        };
      }

      let result = await queryBlogs(context, input, true);
      if (isMissingBlogDateColumnsError(result.error)) {
        result = await queryBlogs(context, input, false);
      }
      throwOnQueryError(result.error);

      const blogs = normalizeBlogRows(
        (result.data ?? []) as unknown as Array<Record<string, unknown>>
      );
      return {
        blogs,
        total: result.count ?? blogs.length,
        limit: input.limit,
        offset: input.offset,
      };
    },
  });

  registerReadOnlyTool(server, {
    name: "get_blog",
    title: "Get blog",
    description:
      "Get one blog by UUID or slug, including up to 50 recent comments and the latest 20 assignment-history rows.",
    inputSchema: getBlogSchema,
    permission: "view_dashboard",
    context,
    run: async (input) => {
      const allowArchived = hasPermission(context, "view_archived_blogs");
      let result = await queryBlogBySelector(context, input, allowArchived, true);
      if (isMissingBlogDateColumnsError(result.error)) {
        result = await queryBlogBySelector(context, input, allowArchived, false);
      }
      throwOnQueryError(result.error);
      if (!result.data) {
        throw new Error("Blog not found.");
      }

      const blog = normalizeBlogRows([
        result.data as unknown as Record<string, unknown>,
      ])[0];
      const [commentsResult, historyResult] = await Promise.all([
        context.adminClient
          .from("blog_comments")
          .select("id,blog_id,user_id,comment,created_at,updated_at")
          .eq("blog_id", blog.id)
          .order("created_at", { ascending: false })
          .limit(50),
        context.adminClient
          .from("blog_assignment_history")
          .select(
            "id,blog_id,changed_by,event_type,field_name,old_value,new_value,metadata,changed_at"
          )
          .eq("blog_id", blog.id)
          .order("changed_at", { ascending: false })
          .limit(20),
      ]);
      throwOnQueryError(commentsResult.error);
      throwOnQueryError(historyResult.error);

      return {
        blog,
        comments: commentsResult.data ?? [],
        assignment_history: historyResult.data ?? [],
      };
    },
  });
}
