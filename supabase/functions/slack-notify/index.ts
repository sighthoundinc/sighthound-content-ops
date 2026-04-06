// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

type EventType =
  | "blog_created"
  | "blog_comment_created"
  | "writer_assigned"
  | "writer_completed"
  | "ready_to_publish"
  | "published"
  | "blog_publish_overdue"
  | "social_post_created"
  | "social_comment_created"
  | "social_submitted_for_review"
  | "social_changes_requested"
  | "social_creative_approved"
  | "social_ready_to_publish"
  | "social_awaiting_live_link"
  | "social_published"
  | "social_live_link_reminder"
  | "social_review_overdue"
  | "social_publish_overdue";

interface NotifyPayload {
  eventType: EventType;
  blogId?: string;
  socialPostId?: string;
  title: string;
  site: string;
  commentBody?: string;
  actorName: string;
  targetUserName?: string; // User to whom task is assigned/action needed
  targetUserNames?: string[];
  appUrl?: string;
}

function normalizeAppUrl(value: string | null | undefined) {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  return trimmed.replace(/\/$/, "");
}

function resolveAppUrl() {
  return (
    normalizeAppUrl(Deno.env.get("NEXT_PUBLIC_APP_URL")) ??
    normalizeAppUrl(Deno.env.get("APP_URL")) ??
    DEFAULT_APP_URL
  );
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const DEFAULT_APP_URL = "https://sighthound-content-ops.vercel.app";
const MAX_COMMENT_BODY_LENGTH = 3000;


const EVENT_CONTENT_TYPE: Record<EventType, string> = {
  blog_created: "Blog",
  blog_comment_created: "Blog",
  writer_assigned: "Blog",
  writer_completed: "Blog",
  ready_to_publish: "Blog",
  published: "Blog",
  blog_publish_overdue: "Blog",
  social_post_created: "Social",
  social_comment_created: "Social",
  social_submitted_for_review: "Social",
  social_changes_requested: "Social",
  social_creative_approved: "Social",
  social_ready_to_publish: "Social",
  social_awaiting_live_link: "Social",
  social_published: "Social",
  social_live_link_reminder: "Social",
  social_review_overdue: "Social",
  social_publish_overdue: "Social",
};


const EVENT_ACTION: Record<EventType, string> = {
  blog_created: "Created - draft is ready for work",
  blog_comment_created: "New comment",
  writer_assigned: "Assigned - work can start",
  writer_completed: "Writing complete - awaiting publishing review",
  ready_to_publish: "Ready to publish - awaiting publishing action",
  published: "Published",
  blog_publish_overdue: "Publish overdue - immediate action required",
  social_post_created: "Created - draft is ready for work",
  social_comment_created: "New comment",
  social_submitted_for_review: "Submitted for review - awaiting editorial approval",
  social_changes_requested: "Changes requested - awaiting revision",
  social_creative_approved: "Creative approved - awaiting next action",
  social_ready_to_publish: "Ready to publish - awaiting execution",
  social_awaiting_live_link: "Awaiting live link - awaiting submission",
  social_published: "Published",
  social_live_link_reminder: "Live link reminder - awaiting submission",
  social_review_overdue: "Review overdue - immediate action required",
  social_publish_overdue: "Publish overdue - immediate action required",
};

const ROLE_LABELS = new Set(["writer", "publisher", "editor", "social editor", "admin"]);
const COMMENT_EVENT_TYPES = new Set<EventType>([
  "blog_comment_created",
  "social_comment_created",
]);

function normalizeName(value: string | null | undefined) {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  if (ROLE_LABELS.has(trimmed.toLowerCase())) {
    return null;
  }
  return trimmed;
}

function resolveAssignedTo(payload: NotifyPayload) {
  const names = Array.isArray(payload.targetUserNames)
    ? payload.targetUserNames
        .map((name) => normalizeName(name))
        .filter((name): name is string => Boolean(name))
    : [];
  if (names.length > 0) {
    return names.join(", ");
  }
  return normalizeName(payload.targetUserName) ?? "Team";
}

function normalizeCommentBody(value: string | null | undefined) {
  if (typeof value !== "string") {
    return null;
  }
  const normalized = value.replace(/\r\n?/g, "\n").trim();
  if (!normalized) {
    return null;
  }
  const mentionSafe = normalized
    .replace(/@(?=(here|channel|everyone)\b)/gi, "@\u200B")
    .replace(/<@/g, "<@\u200B")
    .replace(/<!/g, "<!\u200B");
  if (mentionSafe.length <= MAX_COMMENT_BODY_LENGTH) {
    return mentionSafe;
  }
  return `${mentionSafe.slice(0, MAX_COMMENT_BODY_LENGTH - 3)}...`;
}

function buildMessage(payload: NotifyPayload) {
  const appUrl = resolveAppUrl();
  const deepLink = payload.socialPostId
    ? `${appUrl}/social-posts/${payload.socialPostId}`
    : payload.blogId
      ? `${appUrl}/blogs/${payload.blogId}`
      : null;

  const contentType = EVENT_CONTENT_TYPE[payload.eventType];
  const action = EVENT_ACTION[payload.eventType];
  const assignedBy = normalizeName(payload.actorName) ?? "Team";
  const isCommentEvent = COMMENT_EVENT_TYPES.has(payload.eventType);

  // Line 1: [Social|Blog] Title (site)
  const headerLine = `[${contentType}] ${payload.title} (${payload.site})`;
  // Line 2: Action
  const actionLine = `Action: ${action}`;
  // Line 5 (optional): Open link
  const openLine = deepLink ? `Open link: ${deepLink}` : null;
  if (isCommentEvent) {
    const commentBody = normalizeCommentBody(payload.commentBody);
    const byLine = `By: ${assignedBy}`;
    const commentLine = commentBody ? `Comment:\n${commentBody}` : "Comment:\n(No comment text)";
    const parts = [headerLine, actionLine, byLine, commentLine];
    if (openLine) parts.push(openLine);
    return parts.join("\n");
  }

  const assignedTo = resolveAssignedTo(payload);
  // Line 3: Assigned to
  const assignedToLine = `Assigned to: ${assignedTo}`;
  // Line 4: Assigned by
  const assignedByLine = `Assigned by: ${assignedBy}`;

  const parts = [headerLine, actionLine, assignedToLine, assignedByLine];
  if (openLine) parts.push(openLine);

  return parts.join("\n");
}
function isKnownEventType(eventType: string): eventType is EventType {
  return eventType in EVENT_CONTENT_TYPE && eventType in EVENT_ACTION;
}

async function callSlackApi(token: string, endpoint: string, body: Record<string, unknown>) {
  const response = await fetch(`https://slack.com/api/${endpoint}`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json; charset=utf-8",
    },
    body: JSON.stringify(body),
  });

  const payload = await response.json();
  if (!response.ok || !payload.ok) {
    throw new Error(payload.error ?? "Slack API request failed");
  }
  return payload;
}

serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (request.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      {
        status: 405,
        headers: { ...corsHeaders, "content-type": "application/json" },
      }
    );
  }

  try {
    const payload = (await request.json()) as NotifyPayload;
    const hasKnownEventType =
      typeof payload?.eventType === "string" && isKnownEventType(payload.eventType);
    if (
      !hasKnownEventType ||
      !payload?.title ||
      !payload?.site ||
      (!payload?.blogId && !payload?.socialPostId)
    ) {
      return new Response(
        JSON.stringify({ error: "Invalid payload" }),
        {
          status: 400,
          headers: { ...corsHeaders, "content-type": "application/json" },
        }
      );
    }

    const text = buildMessage(payload);
    const botToken = Deno.env.get("SLACK_BOT_TOKEN");
    const marketingChannel = Deno.env.get("SLACK_MARKETING_CHANNEL") ?? "#content-ops-alerts";
    const webhookUrl = Deno.env.get("SLACK_WEBHOOK_URL");

    let delivered = false;

    if (botToken) {
      try {
        await callSlackApi(botToken, "chat.postMessage", {
          channel: marketingChannel,
          text,
          unfurl_links: false,
          unfurl_media: false,
        });
        delivered = true;
      } catch (error) {
        console.error("Could not send channel notification", error);
      }
    }

    if (!delivered && webhookUrl) {
      try {
        const webhookResponse = await fetch(webhookUrl, {
          method: "POST",
          headers: {
            "content-type": "application/json",
          },
          body: JSON.stringify({
            text,
            unfurl_links: false,
            unfurl_media: false,
          }),
        });
        if (!webhookResponse.ok) {
          throw new Error(`Webhook post failed with status ${webhookResponse.status}`);
        }
        delivered = true;
      } catch (error) {
        console.error("Could not send webhook notification", error);
      }
    }

    if (!delivered) {
      throw new Error("No Slack deliveries succeeded");
    }

    return new Response(
      JSON.stringify({ success: true }),
      {
        status: 200,
        headers: { ...corsHeaders, "content-type": "application/json" },
      }
    );
  } catch (error) {
    console.error(error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "content-type": "application/json" },
      }
    );
  }
});
