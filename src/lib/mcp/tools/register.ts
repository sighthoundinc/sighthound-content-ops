import { McpServer } from "@modelcontextprotocol/server";

import type { AuthenticatedRequestContext } from "@/lib/server-permissions";
import { registerBlogTools } from "@/lib/mcp/tools/blogs";
import { registerIdeaAndTaskTools } from "@/lib/mcp/tools/ideas-and-tasks";
import { registerSocialPostTools } from "@/lib/mcp/tools/social-posts";
import { registerWriteTools } from "@/lib/mcp/tools/writes";

const MCP_INSTRUCTIONS = `Content Relay tracks Sighthound/Redactor blogs, social posts and ideas. Every write acts as one configured Relay user and follows the app's workflow rules.

Finding things: resolve names before writing. People -> list_users (assignment tools need user ids). Blogs -> list_blogs search. Social posts -> list_social_posts search. Ideas -> list_ideas search. If a name matches more than one record, ask which one.

Blogs: writer_status goes not_started -> in_progress -> pending_review -> (needs_revision ->) completed; then publisher_status goes not_started -> in_progress -> pending_review -> publisher_approved -> completed. Assign a writer/publisher before setting that stage's status; the writer stage must be completed before the publisher stage can be. When writing completes and a publisher is assigned, Relay starts the publisher stage itself. Set live_url when the post is live. All changes go through update_blog. Article text lives in the Google Doc, not Relay.

Social posts: draft -> in_review -> creative_approved -> ready_to_publish -> awaiting_live_link -> published; in_review, ready_to_publish and awaiting_live_link can go back to changes_requested with a reason, and changes_requested returns to in_review. Move one step at a time with transition_social_post; do not skip stages. Brief fields are editable only in draft/changes_requested (use reopen_social_post_brief when locked). To publish: save the link with set_social_post_live_links first, then transition.

Ideas: create_idea; convert to a blog with create_blog idea_id.

If a tool returns a workflow error, report it; do not work around it. Clear requests: do them and report what changed. Deletes are permanent: confirm with the user first. Status changes and comments can notify people in Slack.`;

export function createMcpServer(context: AuthenticatedRequestContext) {
  const server = new McpServer(
    { name: "sighthound-content-relay", version: "1.0.0" },
    { maxToolInputElements: 64, instructions: MCP_INSTRUCTIONS }
  );

  registerBlogTools(server, context);
  registerSocialPostTools(server, context);
  registerIdeaAndTaskTools(server, context);
  if (process.env.MCP_MUTATIONS_ENABLED === "true") {
    registerWriteTools(server, context);
  }

  return server;
}
