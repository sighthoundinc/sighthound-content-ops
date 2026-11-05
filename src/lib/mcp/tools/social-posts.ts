import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/server";

import {
  registerReadOnlyTool,
  boundedPaginationSchema,
  throwOnQueryError,
} from "@/lib/mcp/tools/shared";
import type { AuthenticatedRequestContext } from "@/lib/server-permissions";
import type {
  SocialPlatform,
  SocialPostProduct,
  SocialPostStatus,
  SocialPostType,
} from "@/lib/types";

const PRODUCTS = [
  "alpr_plus",
  "redactor",
  "hardware",
  "general_company",
] as const satisfies readonly SocialPostProduct[];
const SOCIAL_TYPES = ["image", "carousel", "link", "video"] as const satisfies readonly SocialPostType[];
const SOCIAL_STATUSES = [
  "draft",
  "in_review",
  "changes_requested",
  "creative_approved",
  "ready_to_publish",
  "awaiting_live_link",
  "published",
] as const satisfies readonly SocialPostStatus[];
const PLATFORMS = [
  "linkedin",
  "facebook",
  "instagram",
] as const satisfies readonly SocialPlatform[];

const socialPostSelect =
  "id,title,product,type,canva_url,canva_page,caption,platforms,scheduled_date,status,created_by,worker_user_id,reviewer_user_id,assigned_to_user_id,associated_blog_id,created_at,updated_at,associated_blog:associated_blog_id(id,title,slug,site),social_post_links(id,platform,url,created_at,updated_at)";

const listSocialPostsSchema = z
  .object({
    product: z.enum(PRODUCTS).optional(),
    type: z.enum(SOCIAL_TYPES).optional(),
    status: z.enum(SOCIAL_STATUSES).optional(),
    platforms: z
      .array(z.enum(PLATFORMS))
      .max(3)
      .optional()
      .refine(
        (platforms) => !platforms || new Set(platforms).size === platforms.length,
        { message: "platforms cannot contain duplicates." }
      ),
    associated_blog_id: z.string().uuid().nullable().optional(),
    ...boundedPaginationSchema(),
  })
  .strict();

const getSocialPostSchema = z
  .object({
    id: z.string().uuid(),
  })
  .strict();


export function registerSocialPostTools(
  server: McpServer,
  context: AuthenticatedRequestContext
) {
  registerReadOnlyTool(server, {
    name: "list_social_posts",
    title: "List social posts",
    description:
      "List social post metadata with product, type, status, platform, and associated-blog filters. Results include linked blog context and social-post links and are paginated (maximum 100 per page).",
    inputSchema: listSocialPostsSchema,
    permission: "view_social_posts",
    context,
    run: async (input) => {
      let query = context.adminClient
        .from("social_posts")
        .select(socialPostSelect, { count: "exact" });
      if (input.product) query = query.eq("product", input.product);
      if (input.type) query = query.eq("type", input.type);
      if (input.status) query = query.eq("status", input.status);
      if (input.platforms?.length) {
        query = query.overlaps("platforms", input.platforms);
      }
      if (input.associated_blog_id === null) {
        query = query.is("associated_blog_id", null);
      } else if (input.associated_blog_id) {
        query = query.eq("associated_blog_id", input.associated_blog_id);
      }

      const { data, error, count } = await query
        .order("updated_at", { ascending: false })
        .order("id", { ascending: true })
        .range(input.offset, input.offset + input.limit - 1);
      throwOnQueryError(error);

      return {
        social_posts: data ?? [],
        total: count ?? data?.length ?? 0,
        limit: input.limit,
        offset: input.offset,
      };
    },
  });

  registerReadOnlyTool(server, {
    name: "get_social_post",
    title: "Get social post",
    description:
      "Get one social post by UUID, including its linked blog context and social-post links.",
    inputSchema: getSocialPostSchema,
    permission: "view_social_posts",
    context,
    run: async ({ id }) => {
      const { data, error } = await context.adminClient
        .from("social_posts")
        .select(socialPostSelect)
        .eq("id", id)
        .maybeSingle();
      throwOnQueryError(error);
      if (!data) {
        throw new Error("Social post not found.");
      }
      return { social_post: data };
    },
  });
}
