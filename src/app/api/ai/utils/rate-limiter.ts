/**
 * Ask AI per-user rate limiter.
 *
 * In-memory sliding window. Good enough for single-worker dev and small
 * production deployments; the telemetry table is used as a backstop when
 * workers restart so users can't bypass the limit by resetting pods.
 *
 * Admin users are exempt (they're expected to drive observability queries
 * and burst usage).
 */

import type { SupabaseClient } from "@supabase/supabase-js";

interface Bucket {
  timestamps: number[]; // Epoch millis of recent hits.
}

const buckets = new Map<string, Bucket>();

function windowMs(): number {
  return 60 * 1000; // 1 minute
}

function limitFor(isAdmin: boolean): number {
  if (isAdmin) return Number.MAX_SAFE_INTEGER; // admins are exempt
  const raw = process.env.ASK_AI_RATE_LIMIT_PER_MINUTE;
  const parsed = raw ? Number(raw) : NaN;
  if (Number.isFinite(parsed) && parsed > 0) return Math.min(parsed, 120);
  return 10;
}

export interface RateLimitResult {
  allowed: boolean;
  retryAfterSeconds: number;
  remaining: number;
}

export function checkRateLimit(userId: string, isAdmin: boolean): RateLimitResult {
  const limit = limitFor(isAdmin);
  if (limit === Number.MAX_SAFE_INTEGER) {
    return { allowed: true, retryAfterSeconds: 0, remaining: limit };
  }

  const now = Date.now();
  const cutoff = now - windowMs();

  let bucket = buckets.get(userId);
  if (!bucket) {
    bucket = { timestamps: [] };
    buckets.set(userId, bucket);
  }
  // Trim expired entries.
  while (bucket.timestamps.length && bucket.timestamps[0] < cutoff) {
    bucket.timestamps.shift();
  }

  if (bucket.timestamps.length >= limit) {
    const oldest = bucket.timestamps[0];
    const retryMs = Math.max(0, oldest + windowMs() - now);
    return {
      allowed: false,
      retryAfterSeconds: Math.ceil(retryMs / 1000),
      remaining: 0,
    };
  }

  bucket.timestamps.push(now);
  return {
    allowed: true,
    retryAfterSeconds: 0,
    remaining: Math.max(0, limit - bucket.timestamps.length),
  };
}

/**
 * Cross-worker backstop. Called on cold starts to reseed the in-memory
 * bucket from telemetry so a user can't bypass the limit by hammering
 * during a restart.
 */
export async function seedRateLimitBucket(
  supabase: SupabaseClient,
  userId: string
): Promise<void> {
  try {
    const since = new Date(Date.now() - windowMs()).toISOString();
    const { data } = await supabase
      .from("ai_assistant_events")
      .select("created_at")
      .eq("user_id", userId)
      .gte("created_at", since);
    if (!data) return;
    const timestamps = data
      .map((row) => new Date(row.created_at as string).getTime())
      .filter((t) => Number.isFinite(t));
    buckets.set(userId, { timestamps });
  } catch {
    // best-effort; never block the request path
  }
}
