/**
 * Ask AI telemetry.
 *
 * Writes a minimal observability row per request to `ai_assistant_events`.
 * Uses the service-role client because this write must succeed regardless
 * of the caller's RLS (admins still see only their own workspace via
 * policies on the table itself).
 *
 * Never stores prompt text, answer text, or PII beyond the user ID — that
 * keeps the event log safe to retain and trivial to audit.
 */

import { createClient } from "@supabase/supabase-js";

export interface AskAIEvent {
  userId: string;
  entityType: string;
  entityId: string | null;
  intent: string;
  responseSource: "deterministic" | "gemini" | "cache";
  model: string | null;
  latencyMs: number;
  hadError: boolean;
  cached: boolean;
  validatorFailed?: boolean;
}

let cachedAdminClient: ReturnType<typeof createClient> | null = null;

function getAdminClient() {
  if (cachedAdminClient) return cachedAdminClient;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) return null;
  cachedAdminClient = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cachedAdminClient;
}

export function recordAskAIEvent(event: AskAIEvent): void {
  const client = getAdminClient();
  if (!client) return; // Service-role not configured — skip silently.

  const row = {
    user_id: event.userId,
    entity_type: event.entityType,
    entity_id: event.entityId,
    intent: event.intent,
    response_source: event.responseSource,
    model: event.model,
    latency_ms: event.latencyMs,
    had_error: event.hadError,
    cached: event.cached,
    validator_failed: event.validatorFailed ?? false,
  };

  // Fire-and-forget. We never await this from a request path.
  // Cast via unknown because the supabase-js generated types don't know
  // about this table yet (migration is the source of truth).
  (client.from("ai_assistant_events") as unknown as {
    insert: (values: unknown) => Promise<{ error: { code?: string; message: string } | null }>;
  })
    .insert(row)
    .then((result) => {
      if (result.error) {
        console.warn("[Ask AI Telemetry] insert failed", {
          code: result.error.code,
          message: result.error.message,
        });
      }
    });
}
