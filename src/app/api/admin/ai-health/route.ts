/**
 * Admin-only Ask AI health endpoint.
 *
 * Returns aggregate Gemini success rate, fallback rate, p50/p95 latency,
 * top intents, and thumbs up/down ratio from the last 24 hours.
 *
 * RLS on `ai_assistant_events` and `ai_assistant_feedback` restricts reads
 * to admins, so this endpoint relies on RLS rather than redundant checks.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

interface EventRow {
  response_source: string;
  latency_ms: number;
  intent: string;
  cached: boolean;
  validator_failed: boolean;
  had_error: boolean;
}

interface FeedbackRow {
  thumbs: "up" | "down";
}

function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length));
  return sorted[idx];
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("Authorization") || "";
  const accessToken = authHeader.replace(/^Bearer\s+/i, "");
  if (!accessToken) {
    return NextResponse.json(
      { success: false, error: { code: "UNAUTHORIZED", message: "Sign in required" } },
      { status: 401 }
    );
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
    {
      auth: { persistSession: false },
      global: { headers: { Authorization: `Bearer ${accessToken}` } },
    }
  );

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const [eventsResult, feedbackResult] = await Promise.all([
    supabase
      .from("ai_assistant_events")
      .select("response_source, latency_ms, intent, cached, validator_failed, had_error")
      .gte("created_at", since)
      .limit(1000),
    supabase
      .from("ai_assistant_feedback")
      .select("thumbs")
      .gte("created_at", since)
      .limit(1000),
  ]);

  if (eventsResult.error || feedbackResult.error) {
    const code =
      eventsResult.error?.code === "42501" || feedbackResult.error?.code === "42501"
        ? "UNAUTHORIZED"
        : "INTERNAL_ERROR";
    return NextResponse.json(
      {
        success: false,
        error: {
          code,
          message: code === "UNAUTHORIZED" ? "Admin access required" : "Couldn't load Ask AI health",
        },
      },
      { status: code === "UNAUTHORIZED" ? 403 : 500 }
    );
  }

  const events = (eventsResult.data ?? []) as EventRow[];
  const feedback = (feedbackResult.data ?? []) as FeedbackRow[];

  const total = events.length;
  const gemini = events.filter((e) => e.response_source === "gemini").length;
  const deterministic = events.filter((e) => e.response_source === "deterministic").length;
  const cached = events.filter((e) => e.cached).length;
  const validatorFailed = events.filter((e) => e.validator_failed).length;
  const errors = events.filter((e) => e.had_error).length;

  const latencies = events.map((e) => e.latency_ms || 0);
  const p50 = percentile(latencies, 50);
  const p95 = percentile(latencies, 95);

  const intentCounts = new Map<string, number>();
  for (const event of events) {
    intentCounts.set(event.intent, (intentCounts.get(event.intent) ?? 0) + 1);
  }
  const topIntents = [...intentCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([intent, count]) => ({ intent, count }));

  const thumbsUp = feedback.filter((f) => f.thumbs === "up").length;
  const thumbsDown = feedback.filter((f) => f.thumbs === "down").length;

  return NextResponse.json({
    success: true,
    data: {
      windowHours: 24,
      totalRequests: total,
      geminiRequests: gemini,
      deterministicRequests: deterministic,
      cachedResponses: cached,
      validatorRejections: validatorFailed,
      errorResponses: errors,
      latencyMs: { p50, p95 },
      topIntents,
      feedback: { up: thumbsUp, down: thumbsDown },
    },
    generatedAt: new Date().toISOString(),
  });
}
