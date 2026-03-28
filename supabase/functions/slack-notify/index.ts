// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

type EventType =
  | "writer_assigned"
  | "writer_completed"
  | "ready_to_publish"
  | "published"
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
  appUrl?: string;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const EVENT_LABELS: Record<EventType, string> = {
  writer_assigned: "Writer assigned",
  writer_completed: "Writing complete",
  ready_to_publish: "Ready to publish",
  published: "Published",
  social_submitted_for_review: "Submitted for review",
  social_changes_requested: "Changes requested",
  social_creative_approved: "Creative approved",
  social_ready_to_publish: "Ready to publish",
  social_awaiting_live_link: "Awaiting live link",
  social_published: "Published",
  social_live_link_reminder: "Live link reminder",
};

const EVENT_CONTENT_TYPE: Record<EventType, string> = {
  writer_assigned: "Blog",
  writer_completed: "Blog",
  ready_to_publish: "Blog",
  published: "Blog",
  social_submitted_for_review: "Social",
  social_changes_requested: "Social",
  social_creative_approved: "Social",
  social_ready_to_publish: "Social",
  social_awaiting_live_link: "Social",
  social_published: "Social",
  social_live_link_reminder: "Social",
};

const EVENT_NEXT: Record<EventType, string | null> = {
  writer_assigned: "Writing",
  writer_completed: "Publisher review",
  ready_to_publish: "Publishing",
  published: null,
  social_submitted_for_review: "Editorial review",
  social_changes_requested: "Creator revisions",
  social_creative_approved: null,
  social_ready_to_publish: "Creator action",
  social_awaiting_live_link: "Live link submission",
  social_published: null,
  social_live_link_reminder: "Live link submission",
};

function buildMessage(payload: NotifyPayload) {
  const deepLink = payload.appUrl
    ? payload.socialPostId
      ? `${payload.appUrl}/social-posts/${payload.socialPostId}`
      : payload.blogId
        ? `${payload.appUrl}/blogs/${payload.blogId}`
        : null
    : null;

  const contentType = EVENT_CONTENT_TYPE[payload.eventType];
  const label = EVENT_LABELS[payload.eventType];
  const next = EVENT_NEXT[payload.eventType];
  const assignedTo = payload.targetUserName || "team";

  // Line 1: [ContentType] Event label
  const headerLine = `*[${contentType}]* ${label}`;

  // Line 2: "Title" (site)
  const titleLine = `"${payload.title}" (${payload.site})`;

  // Line 3 (optional): Assigned to: user name (instead of role)
  const assignedLine = payload.targetUserName ? `Assigned to: ${assignedTo}` : null;

  // Line 4 (optional): Next: what happens next
  const nextLine = next ? `Next: ${next}` : null;

  // Line 5 (optional): Open: deep link
  const openLine = deepLink ? `Open: ${deepLink}` : null;

  const parts = [headerLine, titleLine];
  if (assignedLine) parts.push(assignedLine);
  if (nextLine) parts.push(nextLine);
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
