import {
  isValidMcpUrlSecret,
  MCP_URL_SECRET_REDACTED_PATH,
  mcpUnauthorizedResponse,
} from "@/lib/mcp/security";
import { handleMcpRequest } from "@/lib/mcp/request-handler";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ secret: string }>;
};

export async function POST(request: Request, { params }: RouteContext) {
  const { secret } = await params;
  if (!isValidMcpUrlSecret(secret, process.env.MCP_URL_SECRET)) {
    return mcpUnauthorizedResponse();
  }

  return handleMcpRequest(request, MCP_URL_SECRET_REDACTED_PATH);
}
