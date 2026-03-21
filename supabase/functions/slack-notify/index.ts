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
  social_submitted_for_review: "Social submitted for review",
  social_changes_requested: "Social changes requested",
  social_creative_approved: "Social creative approved",
  social_ready_to_publish: "Social ready to publish",
  social_awaiting_live_link: "Social awaiting live link",
  social_published: "Social published",
  social_live_link_reminder: "Social live link reminder",
};

function buildMessage(payload: NotifyPayload) {
  const deepLink = payload.appUrl
    ? payload.socialPostId
      ? `${payload.appUrl}/social-posts/${payload.socialPostId}`
      : payload.blogId
        ? `${payload.appUrl}/blogs/${payload.blogId}`
        : null
    : null;
  const intro = `*${EVENT_LABELS[payload.eventType]}* • ${payload.title} (${payload.site})`;
  const actor = `Actor: ${payload.actorName}`;
  if (!deepLink) {
    return `${intro}\n${actor}`;
  }
  return `${intro}\n${actor}\n${deepLink}`;
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
    const marketingChannel = Deno.env.get("SLACK_MARKETING_CHANNEL") ?? "#marketing";
    const webhookUrl = Deno.env.get("SLACK_WEBHOOK_URL");

    if (botToken) {
      await callSlackApi(botToken, "chat.postMessage", {
        channel: marketingChannel,
        text,
      });

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
          }
        } catch (error) {
          console.error("Could not send DM notification", error);
        }
      }
    } else if (webhookUrl) {
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
    } else {
      throw new Error("No Slack credentials configured");
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
