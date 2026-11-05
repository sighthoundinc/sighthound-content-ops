import { createHash, timingSafeEqual } from "node:crypto";
import { after } from "next/server";

import type { AuthenticatedRequestContext } from "@/lib/server-permissions";

const MCP_RATE_LIMIT = 60;
const MCP_RATE_WINDOW_MS = 60_000;
const MCP_SECRET_MAX_LENGTH = 4096;

export const MCP_URL_SECRET_REDACTED_PATH = "/api/mcp/s/[redacted]" as const;

function hasMatchingMcpSecret(
  presentedSecret: string,
  configuredSecret: string | undefined
) {
  if (!configuredSecret) {
    return false;
  }

  const presentedDigest = createHash("sha256")
    .update(presentedSecret, "utf8")
    .digest();
  const configuredDigest = createHash("sha256")
    .update(configuredSecret, "utf8")
    .digest();
  return timingSafeEqual(presentedDigest, configuredDigest);
}

export function isValidMcpBearerToken(
  authorizationHeader: string | null,
  configuredToken: string | undefined
) {

  const match = authorizationHeader?.match(/^Bearer ([^\s]+)$/i);
  if (!match || match[1].length > MCP_SECRET_MAX_LENGTH) {
    return false;
  }
  return hasMatchingMcpSecret(match[1], configuredToken);
}

export function isValidMcpUrlSecret(
  presentedSecret: string | undefined,
  configuredSecret: string | undefined
) {
  if (!presentedSecret || presentedSecret.length > MCP_SECRET_MAX_LENGTH) {
    return false;
  }

  return hasMatchingMcpSecret(presentedSecret, configuredSecret);
}

export class SlidingWindowRateLimiter {
  private readonly requestTimes: number[] = [];

  constructor(
    private readonly maxRequests: number,
    private readonly windowMs: number
  ) {}

  allow(now = Date.now()) {
    const cutoff = now - this.windowMs;
    while (this.requestTimes[0] !== undefined && this.requestTimes[0] <= cutoff) {
      this.requestTimes.shift();
    }

    if (this.requestTimes.length >= this.maxRequests) {
      return false;
    }

    this.requestTimes.push(now);
    return true;
  }

  retryAfterSeconds(now = Date.now()) {
    const oldestRequest = this.requestTimes[0];
    if (oldestRequest === undefined) {
      return 1;
    }
    return Math.max(1, Math.ceil((oldestRequest + this.windowMs - now) / 1000));
  }
}

export const mcpRateLimiter = new SlidingWindowRateLimiter(
  MCP_RATE_LIMIT,
  MCP_RATE_WINDOW_MS
);

export function scheduleMcpToolCallLog(
  context: Pick<AuthenticatedRequestContext, "adminClient" | "userId">,
  toolName: string
) {
  const writeLog = async () => {
    try {
      const { error } = await context.adminClient.from("access_logs").insert({
        user_id: context.userId,
        event_type: "mcp_tool_call",
        tool_name: toolName,
      });
      if (error) {
        return;
      }
    } catch {
      // Access-log writes must never affect MCP tool results.
    }
  };

  try {
    after(writeLog);
  } catch {
    // Outside a Next request context, retain best-effort fire-and-forget behavior.
    void writeLog();
  }
}

export function mcpUnauthorizedResponse() {
  return Response.json({ error: "Unauthorized" }, { status: 401 });
}

export function mcpUnavailableResponse() {
  return Response.json({ error: "MCP service unavailable" }, { status: 503 });
}

export function mcpRateLimitedResponse(now = Date.now()) {
  return Response.json(
    { error: "MCP request limit exceeded" },
    {
      status: 429,
      headers: {
        "Retry-After": String(mcpRateLimiter.retryAfterSeconds(now)),
      },
    }
  );
}
