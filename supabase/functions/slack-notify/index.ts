// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

type EventType =
  | "blog_created"
  | "writer_assigned"
  | "writer_completed"
  | "ready_to_publish"
  | "published"
  | "social_post_created"
  | "social_submitted_for_review"
  | "social_changes_requested"
  | "social_creative_approved"
  | "social_ready_to_publish"
  | "social_awaiting_live_link"
  | "social_published"
  | "social_live_link_reminder";

interface NotifyPayload {
  eventType: EventType;
  blogId?: string;
  socialPostId?: string;
  title: string;
  site: string;
  actorName: string;
  targetEmail?: string | null;
  targetUserName?: string; // User to whom task is assigned/action needed
  targetUserNames?: string[];
  appUrl?: string;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};


const EVENT_CONTENT_TYPE: Record<EventType, string> = {
  blog_created: "Blog",
  writer_assigned: "Blog",
  writer_completed: "Blog",
  ready_to_publish: "Blog",
  published: "Blog",
  social_post_created: "Social",
  social_submitted_for_review: "Social",
  social_changes_requested: "Social",
  social_creative_approved: "Social",
  social_ready_to_publish: "Social",
  social_awaiting_live_link: "Social",
  social_published: "Social",
  social_live_link_reminder: "Social",
};


const EVENT_ACTION: Record<EventType, string> = {
  blog_created: "Created - draft is ready for work",
  writer_assigned: "Assigned - work can start",
  writer_completed: "Writing complete - awaiting publishing review",
  ready_to_publish: "Ready to publish - awaiting publishing action",
  published: "Published",
  social_post_created: "Created - draft is ready for work",
  social_submitted_for_review: "Submitted for review - awaiting editorial approval",
  social_changes_requested: "Changes requested - awaiting revision",
  social_creative_approved: "Creative approved - awaiting next action",
  social_ready_to_publish: "Ready to publish - awaiting execution",
  social_awaiting_live_link: "Awaiting live link - awaiting submission",
  social_published: "Published",
  social_live_link_reminder: "Live link reminder - awaiting submission",
};

const ROLE_LABELS = new Set(["writer", "publisher", "editor", "social editor", "admin"]);

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

function buildMessage(payload: NotifyPayload) {
  const deepLink = payload.appUrl
    ? payload.socialPostId
      ? `${payload.appUrl}/social-posts/${payload.socialPostId}`
      : payload.blogId
        ? `${payload.appUrl}/blogs/${payload.blogId}`
        : null
    : null;

  const contentType = EVENT_CONTENT_TYPE[payload.eventType];
  const action = EVENT_ACTION[payload.eventType];
  const assignedTo = resolveAssignedTo(payload);
  const assignedBy = normalizeName(payload.actorName) ?? "Team";

  // Line 1: [Social|Blog] Title (site)
  const headerLine = `[${contentType}] ${payload.title} (${payload.site})`;
  // Line 2: Action
  const actionLine = `Action: ${action}`;
  // Line 3: Assigned to
  const assignedToLine = `Assigned to: ${assignedTo}`;
  // Line 4: Assigned by
  const assignedByLine = `Assigned by: ${assignedBy}`;
  // Line 5 (optional): Open link
  const openLine = deepLink ? `Open link: ${deepLink}` : null;

  const parts = [headerLine, actionLine, assignedToLine, assignedByLine];
  if (openLine) parts.push(openLine);

  return parts.join("\n");
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
    if (
      !payload?.eventType ||
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
        });
        delivered = true;
      } catch (error) {
        console.error("Could not send channel notification", error);
      }

      if (payload.targetEmail) {
        try {
          const userLookup = await callSlackApi(botToken, "users.lookupByEmail", {
            email: payload.targetEmail,
          });
          const slackUserId = userLookup.user?.id as string | undefined;
          if (slackUserId) {
            await callSlackApi(botToken, "chat.postMessage", {
              channel: slackUserId,
              text,
            });
            delivered = true;
          }
        } catch (error) {
          console.error("Could not send DM notification", error);
        }
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
