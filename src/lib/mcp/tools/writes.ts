import { NextRequest } from "next/server";
import { z } from "zod";
import {
  McpServer,
  type StandardSchemaWithJSON,
} from "@modelcontextprotocol/server";

import { POST as createBlogRoute } from "@/app/api/blogs/route";
import { POST as addBlogCommentRoute } from "@/app/api/blogs/[id]/comments/route";
import { POST as transitionBlogRoute } from "@/app/api/blogs/[id]/transition/route";
import { POST as recordActivityRoute } from "@/app/api/events/record-activity/route";
import { POST as createSocialPostRoute } from "@/app/api/social-posts/route";
import { POST as addSocialCommentRoute } from "@/app/api/social-posts/[id]/comments/route";
import { POST as reopenSocialBriefRoute } from "@/app/api/social-posts/[id]/reopen-brief/route";
import { POST as transitionSocialPostRoute } from "@/app/api/social-posts/[id]/transition/route";
import { runAsMcpActor } from "@/lib/mcp/actor-context";
import { scheduleMcpToolCallLog } from "@/lib/mcp/security";
import { getUserRoles } from "@/lib/roles";
import {
  hasPermission,
  type AuthenticatedRequestContext,
} from "@/lib/server-permissions";
import { isValidSocialLiveLink } from "@/lib/social-post-workflow";
import type { AppPermissionKey } from "@/lib/types";
import { unifiedEventToActivityRecord } from "@/lib/unified-events";

const SITES = ["sighthound.com", "redactor.com"] as const;
const WRITER_STATUSES = [
  "not_started",
  "in_progress",
  "pending_review",
  "needs_revision",
  "completed",
] as const;
const PUBLISHER_STATUSES = [
  "not_started",
  "in_progress",
  "pending_review",
  "publisher_approved",
  "completed",
] as const;
const PRODUCTS = ["alpr_plus", "redactor", "hardware", "general_company"] as const;
const SOCIAL_TYPES = ["image", "carousel", "link", "video"] as const;
const PLATFORMS = ["linkedin", "facebook", "instagram"] as const;
const SOCIAL_STATUSES = [
  "draft",
  "in_review",
  "changes_requested",
  "creative_approved",
  "ready_to_publish",
  "awaiting_live_link",
  "published",
] as const;

const uuid = z.string().uuid();
const date = z.string().date();
const SOCIAL_POST_RETURN_SELECT =
  "id,title,product,type,canva_url,canva_page,caption,platforms,scheduled_date,status,created_by,worker_user_id,reviewer_user_id,associated_blog_id,updated_at";
const IDEA_RETURN_SELECT =
  "id,title,site,description,created_by,created_at,is_converted,converted_blog_id";

class ToolUserError extends Error {}

type RouteHandler = (
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) => Promise<Response>;

// Runs an existing Relay API route as the MCP actor, so every route-level
// permission check, workflow rule, Slack event and history write still applies.
async function callRelayRoute(
  context: AuthenticatedRequestContext,
  handler: RouteHandler,
  path: string,
  body: Record<string, unknown>,
  id = ""
) {
  const request = new NextRequest(`https://relay.mcp.internal${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const response = await runAsMcpActor(context, () =>
    handler(request, { params: Promise.resolve({ id }) })
  );
  const payload = (await response.json().catch(() => null)) as Record<
    string,
    unknown
  > | null;
  if (!response.ok) {
    const message =
      typeof payload?.error === "string" ? payload.error : `Request failed (${response.status}).`;
    throw new ToolUserError(message);
  }
  return payload ?? {};
}

function isAdmin(context: AuthenticatedRequestContext) {
  return getUserRoles(context.profile).includes("admin");
}

function stripUndefined<T extends Record<string, unknown>>(value: T) {
  return Object.fromEntries(
    Object.entries(value).filter(([, entry]) => entry !== undefined)
  );
}

// Direct writes bypass RLS (service role), so they re-apply the RLS rule:
// social post rows are editable by creator, worker, reviewer or admin.
async function loadOwnedSocialPost(
  context: AuthenticatedRequestContext,
  socialPostId: string
) {
  const { data, error } = await context.adminClient
    .from("social_posts")
    .select("id,title,status,created_by,worker_user_id,reviewer_user_id")
    .eq("id", socialPostId)
    .maybeSingle();
  if (error) throw new Error("Database query failed.");
  if (!data) throw new ToolUserError("Social post not found.");
  const ownerIds = [data.created_by, data.worker_user_id, data.reviewer_user_id];
  if (!ownerIds.includes(context.userId) && !isAdmin(context)) {
    throw new ToolUserError("Permission denied.");
  }
  return data;
}

// Mirrors the app's canEditBrief: never during execution; otherwise admins
// always, everyone else only in draft or changes_requested.
function assertBriefEditable(context: AuthenticatedRequestContext, status: string) {
  if (status === "ready_to_publish" || status === "awaiting_live_link") {
    throw new ToolUserError(
      "Brief fields are locked during execution. Use reopen_social_post_brief first."
    );
  }
  if (!isAdmin(context) && status !== "draft" && status !== "changes_requested") {
    throw new ToolUserError(
      "The brief can only be edited in draft or changes_requested."
    );
  }
}

// Same activity record the app writes via emitEvent() after an assignment save.
async function recordAssignmentActivity(
  context: AuthenticatedRequestContext,
  post: { id: string; title: string },
  fieldName: "worker_user_id" | "reviewer_user_id",
  oldValue: string | null,
  newValue: string
) {
  const record = unifiedEventToActivityRecord({
    type: "social_post_assigned",
    contentType: "social_post",
    contentId: post.id,
    oldValue: oldValue ?? undefined,
    newValue,
    fieldName,
    actor: context.userId,
    targetUserId: newValue,
    contentTitle: post.title,
    metadata: { role: fieldName === "worker_user_id" ? "assigned_to" : "reviewer" },
    timestamp: Date.now(),
  });
  try {
    await callRelayRoute(context, recordActivityRoute, "/api/events/record-activity", {
      ...record,
      contentType: "social_post",
    });
  } catch {
    // Matches the app: the assignment stands even if activity recording fails.
    console.error("[MCP] Assignment activity record failed", { fieldName });
  }
}

function throwOnWriteError(error: { code?: string; message?: string } | null) {
  if (!error) return;
  // 23514 = Relay workflow guard (e.g. locked brief); its message is user-facing.
  if (error.code === "23514" && error.message) {
    throw new ToolUserError(error.message);
  }
  throw new Error("Database write failed.");
}

type WriteToolDefinition<TSchema extends z.ZodType> = {
  name: string;
  title: string;
  description: string;
  inputSchema: TSchema;
  permission?: AppPermissionKey;
  destructive?: boolean;
  run: (input: z.infer<TSchema>) => Promise<Record<string, unknown>>;
};

function toolError(message: string) {
  return { content: [{ type: "text" as const, text: message }], isError: true };
}

function registerWriteTool<TSchema extends z.ZodType>(
  server: McpServer,
  context: AuthenticatedRequestContext,
  definition: WriteToolDefinition<TSchema>
) {
  server.registerTool(
    definition.name,
    {
      title: definition.title,
      description: `${definition.description} Writes to Relay as the configured actor; notifications and history apply as in the app.`,
      inputSchema: definition.inputSchema as unknown as StandardSchemaWithJSON<
        unknown,
        unknown
      >,
      annotations: {
        readOnlyHint: false,
        destructiveHint: definition.destructive ?? false,
        idempotentHint: false,
        openWorldHint: false,
      },
    },
    async (rawInput) => {
      scheduleMcpToolCallLog(context, definition.name);

      if (definition.permission && !hasPermission(context, definition.permission)) {
        return toolError("Permission denied.");
      }
      const parsedInput = definition.inputSchema.safeParse(rawInput);
      if (!parsedInput.success) {
        return toolError(
          `Invalid tool input: ${parsedInput.error.issues[0]?.message ?? "unknown"}`
        );
      }
      try {
        const result = await definition.run(parsedInput.data);
        return { content: [{ type: "text", text: JSON.stringify(result) }] };
      } catch (error) {
        if (error instanceof ToolUserError) {
          return toolError(error.message);
        }
        console.error("[MCP] Write tool failed", { tool: definition.name });
        return toolError("The MCP request could not be completed.");
      }
    }
  );
}

const blogFields = {
  title: z.string().trim().min(1).optional(),
  site: z.enum(SITES).optional(),
  writer_id: uuid.nullable().optional(),
  publisher_id: uuid.nullable().optional(),
  writer_status: z.enum(WRITER_STATUSES).optional(),
  publisher_status: z.enum(PUBLISHER_STATUSES).optional(),
  google_doc_url: z.string().url().nullable().optional(),
  scheduled_publish_date: date.nullable().optional(),
  display_published_date: date.nullable().optional(),
  target_publish_date: date.nullable().optional(),
};

const socialBriefFields = {
  title: z.string().trim().min(1).optional(),
  product: z.enum(PRODUCTS).optional(),
  type: z.enum(SOCIAL_TYPES).optional(),
  canva_url: z.string().url().nullable().optional(),
  canva_page: z.number().int().min(1).nullable().optional(),
  caption: z.string().trim().nullable().optional(),
  platforms: z.array(z.enum(PLATFORMS)).max(3).optional(),
  scheduled_date: date.nullable().optional(),
  associated_blog_id: uuid.nullable().optional(),
};

export function registerWriteTools(
  server: McpServer,
  context: AuthenticatedRequestContext
) {
  // Blogs ------------------------------------------------------------------
  registerWriteTool(server, context, {
    name: "create_blog",
    title: "Create blog",
    description:
      "Create a blog record (metadata only; article text stays in the Google Doc).",
    inputSchema: z
      .object({
        ...blogFields,
        title: z.string().trim().min(1),
        site: z.enum(SITES),
        slug: z.string().trim().min(1).optional(),
      })
      .strict(),
    run: (input) => callRelayRoute(context, createBlogRoute, "/api/blogs", input),
  });

  registerWriteTool(server, context, {
    name: "update_blog",
    title: "Update blog",
    description:
      "Edit a blog's fields, assign writer/publisher, move writer_status/publisher_status through the workflow, set live_url, or archive/unarchive. Workflow rules decide which changes are allowed.",
    inputSchema: z
      .object({
        blog_id: uuid,
        ...blogFields,
        live_url: z.string().url().nullable().optional(),
        actual_published_at: z.string().nullable().optional(),
        is_archived: z.boolean().optional(),
      })
      .strict(),
    run: ({ blog_id, ...fields }) =>
      callRelayRoute(
        context,
        transitionBlogRoute,
        `/api/blogs/${blog_id}/transition`,
        stripUndefined(fields),
        blog_id
      ),
  });

  registerWriteTool(server, context, {
    name: "add_blog_comment",
    title: "Add blog comment",
    description: "Post a comment on a blog.",
    inputSchema: z
      .object({ blog_id: uuid, comment: z.string().trim().min(1).max(5000) })
      .strict(),
    run: ({ blog_id, comment }) =>
      callRelayRoute(
        context,
        addBlogCommentRoute,
        `/api/blogs/${blog_id}/comments`,
        { comment },
        blog_id
      ),
  });

  // Social posts -----------------------------------------------------------
  registerWriteTool(server, context, {
    name: "create_social_post",
    title: "Create social post",
    description: "Create a social post brief. reviewer_user_id is required.",
    inputSchema: z
      .object({
        title: z.string().trim().min(1).optional(),
        product: z.enum(PRODUCTS),
        type: z.enum(SOCIAL_TYPES),
        platforms: z.array(z.enum(PLATFORMS)).max(3).optional(),
        scheduled_date: date.nullable().optional(),
        associated_blog_id: uuid.nullable().optional(),
        worker_user_id: uuid.nullable().optional(),
        reviewer_user_id: uuid,
      })
      .strict(),
    run: (input) =>
      callRelayRoute(context, createSocialPostRoute, "/api/social-posts", input),
  });

  registerWriteTool(server, context, {
    name: "update_social_post_brief",
    title: "Update social post brief",
    description:
      "Edit a social post's brief fields without changing status. Brief fields are locked in ready_to_publish and awaiting_live_link; use reopen_social_post_brief first.",
    permission: "edit_social_post_brief",
    inputSchema: z.object({ social_post_id: uuid, ...socialBriefFields }).strict(),
    run: async ({ social_post_id, ...fields }) => {
      // Same normalization as the app's persistBrief.
      const updates = stripUndefined({
        ...fields,
        canva_url: fields.canva_url === undefined ? undefined : fields.canva_url?.trim() || null,
        caption: fields.caption === undefined ? undefined : fields.caption?.trim() ? fields.caption : null,
        platforms: fields.platforms ? Array.from(new Set(fields.platforms)) : undefined,
        scheduled_date: fields.scheduled_date === undefined ? undefined : fields.scheduled_date || null,
      });
      if (Object.keys(updates).length === 0) {
        throw new ToolUserError("Provide at least one field to update.");
      }
      const post = await loadOwnedSocialPost(context, social_post_id);
      assertBriefEditable(context, post.status);
      const { data, error } = await context.adminClient
        .from("social_posts")
        .update(updates)
        .eq("id", social_post_id)
        .select(SOCIAL_POST_RETURN_SELECT)
        .maybeSingle();
      throwOnWriteError(error);
      return { social_post: data };
    },
  });

  registerWriteTool(server, context, {
    name: "set_social_post_assignments",
    title: "Set social post assignments",
    description: "Set who works on a social post (worker) and who reviews it.",
    permission: "edit_social_post_brief",
    inputSchema: z
      .object({ social_post_id: uuid, worker_user_id: uuid, reviewer_user_id: uuid })
      .strict(),
    run: async ({ social_post_id, worker_user_id, reviewer_user_id }) => {
      const post = await loadOwnedSocialPost(context, social_post_id);
      const { data, error } = await context.adminClient
        .from("social_posts")
        .update({ worker_user_id, reviewer_user_id })
        .eq("id", social_post_id)
        .select(SOCIAL_POST_RETURN_SELECT)
        .maybeSingle();
      throwOnWriteError(error);
      if (post.worker_user_id !== worker_user_id) {
        await recordAssignmentActivity(context, post, "worker_user_id", post.worker_user_id, worker_user_id);
      }
      if (post.reviewer_user_id !== reviewer_user_id) {
        await recordAssignmentActivity(context, post, "reviewer_user_id", post.reviewer_user_id, reviewer_user_id);
      }
      return { social_post: data };
    },
  });

  registerWriteTool(server, context, {
    name: "transition_social_post",
    title: "Move social post to a new status",
    description:
      "Move a social post through its workflow (draft → in_review → creative_approved → ready_to_publish → awaiting_live_link → published, or back to changes_requested with a reason). Required fields and ownership rules apply. Publishing needs a saved live link (set_social_post_live_links).",
    inputSchema: z
      .object({
        social_post_id: uuid,
        next_status: z.enum(SOCIAL_STATUSES),
        reason: z.string().trim().max(2000).optional(),
      })
      .strict(),
    run: ({ social_post_id, next_status, reason }) =>
      callRelayRoute(
        context,
        transitionSocialPostRoute,
        `/api/social-posts/${social_post_id}/transition`,
        stripUndefined({ nextStatus: next_status, reason }),
        social_post_id
      ),
  });

  registerWriteTool(server, context, {
    name: "set_social_post_live_links",
    title: "Set social post live links",
    description:
      "Save or remove the live post URL per platform. Pass url: null to remove a platform's link.",
    permission: "add_social_post_link",
    destructive: true,
    inputSchema: z
      .object({
        social_post_id: uuid,
        links: z
          .array(z.object({ platform: z.enum(PLATFORMS), url: z.string().url().nullable() }).strict())
          .min(1)
          .max(3),
      })
      .strict(),
    run: async ({ social_post_id, links }) => {
      await loadOwnedSocialPost(context, social_post_id);
      for (const link of links) {
        if (link.url && !isValidSocialLiveLink(link)) {
          throw new ToolUserError(`Invalid ${link.platform} live link.`);
        }
      }
      for (const link of links) {
        const table = context.adminClient.from("social_post_links");
        const { error } = link.url
          ? await table.upsert(
              {
                social_post_id,
                platform: link.platform,
                url: link.url,
                created_by: context.userId,
              },
              { onConflict: "social_post_id,platform" }
            )
          : await table
              .delete()
              .eq("social_post_id", social_post_id)
              .eq("platform", link.platform);
        throwOnWriteError(error);
      }
      const { data, error } = await context.adminClient
        .from("social_post_links")
        .select("id,platform,url,updated_at")
        .eq("social_post_id", social_post_id);
      throwOnWriteError(error);
      return { links: data ?? [] };
    },
  });

  registerWriteTool(server, context, {
    name: "reopen_social_post_brief",
    title: "Reopen social post brief",
    description: "Reopen a locked social post brief so its fields can be edited again.",
    inputSchema: z.object({ social_post_id: uuid }).strict(),
    run: ({ social_post_id }) =>
      callRelayRoute(
        context,
        reopenSocialBriefRoute,
        `/api/social-posts/${social_post_id}/reopen-brief`,
        {},
        social_post_id
      ),
  });

  registerWriteTool(server, context, {
    name: "add_social_post_comment",
    title: "Add social post comment",
    description: "Post a comment (or a reply via parent_comment_id) on a social post.",
    inputSchema: z
      .object({
        social_post_id: uuid,
        comment: z.string().trim().min(1).max(5000),
        parent_comment_id: uuid.nullable().optional(),
      })
      .strict(),
    run: ({ social_post_id, ...body }) =>
      callRelayRoute(
        context,
        addSocialCommentRoute,
        `/api/social-posts/${social_post_id}/comments`,
        stripUndefined(body),
        social_post_id
      ),
  });

  // Ideas ------------------------------------------------------------------
  registerWriteTool(server, context, {
    name: "create_idea",
    title: "Create idea",
    description: "Add a blog idea.",
    permission: "create_idea",
    inputSchema: z
      .object({
        title: z.string().trim().min(1).max(300),
        site: z.enum(SITES),
        description: z.string().trim().max(5000).nullable().optional(),
      })
      .strict(),
    run: async ({ title, site, description }) => {
      const { data, error } = await context.adminClient
        .from("blog_ideas")
        .insert({ title, site, description: description || null, created_by: context.userId })
        .select(IDEA_RETURN_SELECT)
        .maybeSingle();
      throwOnWriteError(error);
      return { idea: data };
    },
  });

  registerWriteTool(server, context, {
    name: "update_idea",
    title: "Update idea",
    description: "Edit an idea you created (admins can edit any idea).",
    permission: "edit_own_idea",
    inputSchema: z
      .object({
        idea_id: uuid,
        title: z.string().trim().min(1).max(300).optional(),
        site: z.enum(SITES).optional(),
        description: z.string().trim().max(5000).nullable().optional(),
      })
      .strict(),
    run: async ({ idea_id, ...fields }) => {
      const updates = stripUndefined(fields);
      if (Object.keys(updates).length === 0) {
        throw new ToolUserError("Provide at least one field to update.");
      }
      const { data: idea, error: loadError } = await context.adminClient
        .from("blog_ideas")
        .select("id,created_by")
        .eq("id", idea_id)
        .maybeSingle();
      if (loadError) throw new Error("Database query failed.");
      if (!idea) throw new ToolUserError("Idea not found.");
      // Mirrors RLS: creator or admin only.
      if (idea.created_by !== context.userId && !isAdmin(context)) {
        throw new ToolUserError("Permission denied.");
      }
      const { data, error } = await context.adminClient
        .from("blog_ideas")
        .update(updates)
        .eq("id", idea_id)
        .select(IDEA_RETURN_SELECT)
        .maybeSingle();
      throwOnWriteError(error);
      return { idea: data };
    },
  });
}
