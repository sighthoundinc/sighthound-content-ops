import { McpServer } from "@modelcontextprotocol/server";

import type { AuthenticatedRequestContext } from "@/lib/server-permissions";
import { registerBlogTools } from "@/lib/mcp/tools/blogs";
import { registerIdeaAndTaskTools } from "@/lib/mcp/tools/ideas-and-tasks";
import { registerSocialPostTools } from "@/lib/mcp/tools/social-posts";

export function createMcpServer(context: AuthenticatedRequestContext) {
  const server = new McpServer(
    { name: "sighthound-content-relay", version: "1.0.0" },
    { maxToolInputElements: 64 }
  );

  registerBlogTools(server, context);
  registerSocialPostTools(server, context);
  registerIdeaAndTaskTools(server, context);

  return server;
}
