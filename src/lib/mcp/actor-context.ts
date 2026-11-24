import { AsyncLocalStorage } from "node:async_hooks";

import type { AuthenticatedRequestContext } from "@/lib/server-permissions";

// Server-only: set solely by MCP write tools so they can call existing API
// route handlers as the configured actor. HTTP requests can never set it.
const mcpActorStorage = new AsyncLocalStorage<AuthenticatedRequestContext>();

export function runAsMcpActor<T>(
  context: AuthenticatedRequestContext,
  run: () => Promise<T>
) {
  return mcpActorStorage.run(context, run);
}

export function getMcpActorContext() {
  return mcpActorStorage.getStore() ?? null;
}
