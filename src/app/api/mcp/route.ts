import { createMcpHandler } from "@modelcontextprotocol/server";
import { z } from "zod";

import { resolveActiveProfileContext } from "@/lib/server-permissions";
import {
  isValidMcpBearerToken,
  mcpRateLimiter,
  mcpRateLimitedResponse,
  mcpUnauthorizedResponse,
  mcpUnavailableResponse,
} from "@/lib/mcp/security";
import { createMcpServer } from "@/lib/mcp/tools/register";

export const runtime = "nodejs";

const actorIdSchema = z.string().uuid();
const mcpHandlerOptions = {
  legacy: "stateless" as const,
  responseMode: "json" as const,
  maxRequestBodySize: 64 * 1024,
};

export async function POST(request: Request) {
  if (
    !isValidMcpBearerToken(
      request.headers.get("authorization"),
      process.env.MCP_API_TOKEN
    )
  ) {
    return mcpUnauthorizedResponse();
  }

  const configuredActorId = actorIdSchema.safeParse(
    process.env.MCP_ACT_AS_USER_ID
  );
  if (!configuredActorId.success) {
    return mcpUnavailableResponse();
  }

  if (!mcpRateLimiter.allow()) {
    return mcpRateLimitedResponse();
  }

  let context;
  try {
    context = await resolveActiveProfileContext(configuredActorId.data);
  } catch {
    return mcpUnavailableResponse();
  }
  if (!context) {
    return mcpUnavailableResponse();
  }

  const handler = createMcpHandler(
    () => createMcpServer(context),
    mcpHandlerOptions
  );
  return handler.fetch(request);
}
