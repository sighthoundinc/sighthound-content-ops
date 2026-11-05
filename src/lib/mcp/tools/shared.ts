import { z } from "zod";
import {
  McpServer,
  type StandardSchemaWithJSON,
} from "@modelcontextprotocol/server";

import {
  hasPermission,
  type AuthenticatedRequestContext,
} from "@/lib/server-permissions";
import type { AppPermissionKey } from "@/lib/types";
import { scheduleMcpToolCallLog } from "@/lib/mcp/security";

export const ARTICLE_TEXT_NOTICE =
  "Relay stores blog metadata, not blog article text. Use google_doc_url for the draft; article-text revision history is unavailable.";

type ReadToolDefinition<TSchema extends z.ZodType> = {
  name: string;
  title: string;
  description: string;
  inputSchema: TSchema;
  permission: AppPermissionKey;
  context: AuthenticatedRequestContext;
  authorize?: (input: z.infer<TSchema>) => boolean;
  run: (input: z.infer<TSchema>) => Promise<Record<string, unknown>>;
};

function toolError(message: string) {
  return {
    content: [{ type: "text" as const, text: message }],
    isError: true,
  };
}

export function registerReadOnlyTool<TSchema extends z.ZodType>(
  server: McpServer,
  definition: ReadToolDefinition<TSchema>
) {
  server.registerTool(
    definition.name,
    {
      title: definition.title,
      description: `${definition.description} ${ARTICLE_TEXT_NOTICE}`,
      inputSchema: definition.inputSchema as unknown as StandardSchemaWithJSON<
        unknown,
        unknown
      >,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async (rawInput) => {
      scheduleMcpToolCallLog(definition.context, definition.name);

      if (!hasPermission(definition.context, definition.permission)) {
        return toolError("Permission denied.");
      }

      try {
        const parsedInput = definition.inputSchema.safeParse(rawInput);
        if (!parsedInput.success) {
          return toolError("Invalid tool input.");
        }
        if (
          definition.authorize &&
          !definition.authorize(parsedInput.data)
        ) {
          return toolError("Permission denied.");
        }
        const result = await definition.run(parsedInput.data);
        return {
          content: [{ type: "text", text: JSON.stringify(result) }],
        };
      } catch {
        console.error("[MCP] Read tool failed", { tool: definition.name });
        return toolError("The MCP request could not be completed.");
      }
    }
  );
}

export function throwOnQueryError(error: { message?: string } | null) {
  if (error) {
    throw new Error("Database query failed.");
  }
}

export function boundedPaginationSchema() {
  return {
    limit: z.number().int().min(1).max(100).default(25),
    offset: z.number().int().min(0).max(10_000).default(0),
  };
}

export function sanitizeOrSearchValue(value: string) {
  return value
    .replace(/[%*_(),.:\\\\\"']/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
