import { createMcpHandler } from "@modelcontextprotocol/server";
import { z } from "zod";

import { resolveActiveProfileContext } from "@/lib/server-permissions";
import {
  MCP_URL_SECRET_REDACTED_PATH,
  mcpRateLimiter,
  mcpRateLimitedResponse,
  mcpUnavailableResponse,
} from "@/lib/mcp/security";
import { createMcpServer } from "@/lib/mcp/tools/register";

const actorIdSchema = z.string().uuid();
const mcpHandlerOptions = {
  legacy: "stateless" as const,
  responseMode: "json" as const,
  maxRequestBodySize: 64 * 1024,
};

type McpApplicationLogPath = "/api/mcp" | typeof MCP_URL_SECRET_REDACTED_PATH;

export async function handleMcpRequest(
  request: Request,
  logPath: McpApplicationLogPath
) {
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

  console.info("[MCP] Request accepted", { path: logPath });

  const handler = createMcpHandler(
    () => createMcpServer(context),
    mcpHandlerOptions
  );
  return handler.fetch(request);
}
