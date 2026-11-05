import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/server";

import { getBlogPublishDate } from "@/lib/blog-schema";
import {
  PUBLISHER_STATUS_LABELS,
  SOCIAL_POST_STATUS_LABELS,
  WRITER_STATUS_LABELS,
} from "@/lib/status";
import {
  getSelectedBlogTaskCandidate,
  getSocialTaskActionStateFromRow,
  type TaskActionState,
} from "@/lib/task-action-state";
import { fetchSharedTaskClassificationInputs } from "@/lib/server-task-classification-inputs";
import { assertValidStatus } from "@/lib/task-logic";
import {
  registerReadOnlyTool,
  boundedPaginationSchema,
  throwOnQueryError,
} from "@/lib/mcp/tools/shared";
import type { AuthenticatedRequestContext } from "@/lib/server-permissions";
import { getUserRoles } from "@/lib/roles";
import type { SocialPostStatus } from "@/lib/types";

const listIdeasSchema = z
  .object({
    site: z.enum(["sighthound.com", "redactor.com"]).optional(),
    is_converted: z.boolean().optional(),
    search: z.string().trim().min(1).max(100).optional(),
    ...boundedPaginationSchema(),
  })
  .strict();

const noArgumentsSchema = z.object({}).strict();

function compareDatesAsc(leftDate: string | null, rightDate: string | null) {
  if (leftDate && rightDate) return leftDate.localeCompare(rightDate);
  if (leftDate) return -1;
  if (rightDate) return 1;
  return 0;
}

type TaskItem = {
  id: string;
  title: string;
  kind: "blog" | "social";
  path: string;
  status: string;
  scheduled_date: string | null;
  created_at: string;
  action_state: TaskActionState;
};

export function registerIdeaAndTaskTools(
  server: McpServer,
  context: AuthenticatedRequestContext
) {
  registerReadOnlyTool(server, {
    name: "list_ideas",
    title: "List ideas",
    description:
      "List confirmed blog-idea metadata, with optional site, converted-state, and title search filters. Results are paginated (maximum 100 per page).",
    inputSchema: listIdeasSchema,
    permission: "view_ideas",
    context,
    run: async (input) => {
      if (input.search && !input.search.replace(/[\\%_*]/g, " ").trim()) {
        return {
          ideas: [],
          total: 0,
          limit: input.limit,
          offset: input.offset,
        };
      }
      let query = context.adminClient
        .from("blog_ideas")
        .select(
          "id,title,site,description,created_by,created_at,is_converted,converted_blog_id",
          { count: "exact" }
        );
      if (input.site) query = query.eq("site", input.site);
      if (input.is_converted !== undefined) {
        query = query.eq("is_converted", input.is_converted);
      }
      if (input.search) {
        const literalSearch = input.search.replace(/[\\%_*]/g, " ");
        query = query.ilike("title", `%${literalSearch}%`);
      }

      const { data, error, count } = await query
        .order("created_at", { ascending: false })
        .order("id", { ascending: true })
        .range(input.offset, input.offset + input.limit - 1);
      throwOnQueryError(error);

      return {
        ideas: data ?? [],
        total: count ?? data?.length ?? 0,
        limit: input.limit,
        offset: input.offset,
      };
    },
  });

  registerReadOnlyTool(server, {
    name: "get_my_tasks",
    title: "Get my tasks",
    description:
      "Return the configured actor's required and waiting blog/social-post tasks using the existing task-ownership and classification rules. This tool accepts no identity arguments.",
    inputSchema: noArgumentsSchema,
    permission: "view_my_tasks",
    context,
    run: async () => {
      const sharedInputs = await fetchSharedTaskClassificationInputs({
        adminClient: context.adminClient,
        userId: context.userId,
      });
      if (!sharedInputs.data || sharedInputs.error) {
        throw new Error("Failed to load task inputs.");
      }

      const { blogs, assignmentMap, socialRows } = sharedInputs.data;
      const isAdmin = getUserRoles(context.profile).includes("admin");
      const tasks: TaskItem[] = [];

      for (const blog of blogs) {
        assertValidStatus(blog.writer_status, "writer");
        assertValidStatus(blog.publisher_status, "publisher");

        const selected = getSelectedBlogTaskCandidate({
          userId: context.userId,
          writerId: blog.writer_id,
          publisherId: blog.publisher_id,
          writerStatus: blog.writer_status,
          publisherStatus: blog.publisher_status,
          assignmentEntries: assignmentMap.get(blog.id) ?? [],
        });
        if (!selected) continue;

        tasks.push({
          id: `${blog.id}:blog`,
          title: blog.title,
          kind: "blog",
          path: `/blogs/${blog.id}`,
          status:
            selected.countBucket === "writer"
              ? WRITER_STATUS_LABELS[blog.writer_status]
              : blog.writer_status === "completed" &&
                  blog.publisher_status === "not_started"
                ? "Ready to publish"
                : PUBLISHER_STATUS_LABELS[blog.publisher_status],
          scheduled_date: getBlogPublishDate(blog),
          created_at: blog.created_at,
          action_state: selected.actionState,
        });
      }

      for (const row of socialRows) {
        const rawStatus = row.status;
        if (
          typeof rawStatus !== "string" ||
          !(rawStatus in SOCIAL_POST_STATUS_LABELS)
        ) {
          continue;
        }
        const status = rawStatus as SocialPostStatus;
        assertValidStatus(status, "social");

        tasks.push({
          id: String(row.id ?? ""),
          title: String(row.title ?? "Untitled social post"),
          kind: "social",
          path: `/social-posts/${String(row.id ?? "")}`,
          status: SOCIAL_POST_STATUS_LABELS[status],
          scheduled_date:
            typeof row.scheduled_date === "string" ? row.scheduled_date : null,
          created_at: String(row.created_at ?? ""),
          action_state:
            getSocialTaskActionStateFromRow({
              row,
              userId: context.userId,
              isAdmin,
            }) ?? "waiting_on_others",
        });
      }

      const compareByDate = (left: TaskItem, right: TaskItem) => {
        const scheduleOrder = compareDatesAsc(
          left.scheduled_date,
          right.scheduled_date
        );
        return scheduleOrder || left.created_at.localeCompare(right.created_at);
      };

      return {
        required_by_me: tasks
          .filter((task) => task.action_state === "action_required")
          .sort(compareByDate),
        waiting_on_others: tasks
          .filter((task) => task.action_state === "waiting_on_others")
          .sort(compareByDate),
      };
    },
  });
}
