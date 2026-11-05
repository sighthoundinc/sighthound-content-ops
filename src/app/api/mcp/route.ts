import {
  isValidMcpBearerToken,
  mcpUnauthorizedResponse,
} from "@/lib/mcp/security";
import { handleMcpRequest } from "@/lib/mcp/request-handler";

export const runtime = "nodejs";


export async function POST(request: Request) {
  if (
    !isValidMcpBearerToken(
      request.headers.get("authorization"),
      process.env.MCP_API_TOKEN
    )
  ) {
    return mcpUnauthorizedResponse();
  }
  return handleMcpRequest(request, "/api/mcp");
}
