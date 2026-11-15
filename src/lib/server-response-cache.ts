type ServerResponseCacheEntry = {
  value: unknown;
  expiresAt: number;
};

const MAX_CACHE_ENTRIES = 500;

declare global {
  var __sighthoundServerResponseCache:
    | Map<string, ServerResponseCacheEntry>
    | undefined;
}

const serverResponseCache =
  globalThis.__sighthoundServerResponseCache ??
  new Map<string, ServerResponseCacheEntry>();

if (!globalThis.__sighthoundServerResponseCache) {
  globalThis.__sighthoundServerResponseCache = serverResponseCache;
}

function evictExpiredEntries(now: number) {
  for (const [cacheKey, cacheEntry] of serverResponseCache.entries()) {
    if (cacheEntry.expiresAt <= now) {
      serverResponseCache.delete(cacheKey);
    }
  }
}

export function buildUserScopedResponseCacheKey(namespace: string, userId: string) {
  return `${namespace}:${userId}`;
}

export function getServerResponseCacheValue<T>(cacheKey: string): T | null {
  const now = Date.now();
  const cacheEntry = serverResponseCache.get(cacheKey);
  if (!cacheEntry) {
    return null;
  }
  if (cacheEntry.expiresAt <= now) {
    serverResponseCache.delete(cacheKey);
    return null;
  }
  return cacheEntry.value as T;
}

export function setServerResponseCacheValue<T>(
  cacheKey: string,
  value: T,
  ttlMs: number
) {
  const now = Date.now();
  evictExpiredEntries(now);
  if (serverResponseCache.size >= MAX_CACHE_ENTRIES) {
    const oldestCacheKey = serverResponseCache.keys().next().value;
    if (oldestCacheKey) {
      serverResponseCache.delete(oldestCacheKey);
    }
  }
  serverResponseCache.set(cacheKey, {
    value,
    expiresAt: now + ttlMs,
  });
}

/**
 * TTL for per-user "what do I need to do" responses (dashboard summary and
 * tasks snapshot). Kept to a few seconds on purpose:
 *
 * - This cache is in-memory per server instance. On serverless hosting a
 *   status change is usually handled by a different instance than the one
 *   holding the cached response, so clearing on write cannot be relied on.
 * - Home renders both responses side by side. With a long TTL they expire at
 *   different moments and the page shows tasks with no matching tiles.
 *
 * A short TTL still collapses bursts (Home, Inbox and Activity History can
 * request the same data within the same second) without a visible lag.
 */
export const PERSONAL_TASK_RESPONSE_CACHE_TTL_MS = 3_000;
export const PERSONAL_TASK_RESPONSE_CACHE_CONTROL = "private, no-cache";
