import { McpServer } from "@modelcontextprotocol/server";

import type { AuthenticatedRequestContext } from "@/lib/server-permissions";
import { registerBlogTools } from "@/lib/mcp/tools/blogs";
import { registerIdeaAndTaskTools } from "@/lib/mcp/tools/ideas-and-tasks";
import { registerSocialPostTools } from "@/lib/mcp/tools/social-posts";
import { registerWriteTools } from "@/lib/mcp/tools/writes";

const MCP_INSTRUCTIONS = `Content Relay tracks Sighthound/Redactor blogs, social posts and ideas. Every write acts as one configured Relay user and follows the app's workflow rules.

Finding things: resolve names before writing. People -> list_users (assignment tools need user ids). Blogs -> list_blogs search. Social posts -> list_social_posts search. Ideas -> list_ideas search. Requests are often dictated, so names and titles may be misheard: on an exact single match, proceed; on a close but inexact match, say which record you picked before changing it; if several match, ask which one.

Defaults when the user names nobody: blog publisher -> the user named Julianna; social post reviewer -> the user named Haris. Resolve both with list_users.

Blogs: writer_status goes not_started -> in_progress -> pending_review -> (needs_revision ->) completed; then publisher_status goes not_started -> in_progress -> pending_review -> publisher_approved -> completed. Assign a writer/publisher before setting that stage's status; the writer stage must be completed before the publisher stage can be. When writing completes and a publisher is assigned, Relay starts the publisher stage itself. Set live_url when the post is live. All changes go through update_blog. Article text lives in the Google Doc, not Relay.

Social posts: draft -> in_review -> creative_approved -> ready_to_publish -> awaiting_live_link -> published; in_review, ready_to_publish and awaiting_live_link can go back to changes_requested with a reason, and changes_requested returns to in_review. Move one step at a time with transition_social_post; do not skip stages. Brief fields are editable only in draft/changes_requested (use reopen_social_post_brief when locked). To publish: save the link with set_social_post_live_links first, then transition.

Ideas: create_idea; convert to a blog with create_blog idea_id.

Google Doc status: each blog's google_doc_url draft usually starts with a header block containing a STATUS line. When asked to check a blog, read the doc with the Google Docs/Drive connector and compare STATUS with Relay. Act only on a clear status (for example ready to publish -> writer_status completed, assign the publisher); if it is conditional or unclear (for example 'needs a cover image, then ready'), report it and ask. If the user says the writer forgot to update the doc, edit only the STATUS line in the doc, then make the matching Relay change.

Live links: before marking something published, open the live URL to confirm the page loads when you can. Social sites often block or require login; then check only that the link is a well-formed post URL on the right platform and say it could not be opened.

Messages to the team: 'tell the writer/reviewer ...' -> add a comment on that blog or social post (add_blog_comment / add_social_post_comment); Relay notifies them.

'What did you change?' -> list_mcp_changes.

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
