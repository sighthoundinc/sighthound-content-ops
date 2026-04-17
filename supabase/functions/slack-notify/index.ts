// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import {
  buildMessage,
  isKnownEventType,
  normalizeAppUrl,
  SLACK_DELIVERY_FLAGS,
} from "./message.mjs";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function resolveAppUrlFromEnv() {
  return (
    normalizeAppUrl(Deno.env.get("NEXT_PUBLIC_APP_URL")) ??
    normalizeAppUrl(Deno.env.get("APP_URL")) ??
    null
  );
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
    const payload = (await request.json()) as any;
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

    const fallbackAppUrl = resolveAppUrlFromEnv();
    const text = buildMessage(payload, { fallbackAppUrl });
    const botToken = Deno.env.get("SLACK_BOT_TOKEN");
    const marketingChannel = Deno.env.get("SLACK_MARKETING_CHANNEL") ?? "#content-ops-alerts";
    const webhookUrl = Deno.env.get("SLACK_WEBHOOK_URL");

    let delivered = false;

    if (botToken) {
      try {
        await callSlackApi(botToken, "chat.postMessage", {
          channel: marketingChannel,
          text,
          ...SLACK_DELIVERY_FLAGS,
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
            ...SLACK_DELIVERY_FLAGS,
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
