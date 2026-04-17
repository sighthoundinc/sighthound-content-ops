/**
 * Ask AI response cache.
 *
 * Small in-process LRU with a short TTL. Keeps Gemini call volume (and
 * latency) down when users re-open the panel or repeat a question about
 * the same record before its `updated_at` changes.
 *
 * This cache is deliberately not distributed — we treat it as a best-effort
 * per-worker optimisation. Stale entries are bounded by TTL.
 */

const DEFAULT_MAX_ENTRIES = 500;
const DEFAULT_TTL_MS = 5 * 60 * 1000; // 5 minutes

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

function createLRU<T>(maxEntries: number, ttlMs: number) {
  const store = new Map<string, CacheEntry<T>>();

  function get(key: string): T | undefined {
    const entry = store.get(key);
    if (!entry) return undefined;
    if (entry.expiresAt <= Date.now()) {
      store.delete(key);
      return undefined;
    }
    // Touch — move to most-recently-used position.
    store.delete(key);
    store.set(key, entry);
    return entry.value;
  }

  function set(key: string, value: T): void {
    if (store.has(key)) {
      store.delete(key);
    } else if (store.size >= maxEntries) {
      const oldestKey = store.keys().next().value;
      if (typeof oldestKey === "string") {
        store.delete(oldestKey);
      }
    }
    store.set(key, { value, expiresAt: Date.now() + ttlMs });
  }

  function clear(): void {
    store.clear();
  }

  return { get, set, clear, get size() { return store.size; } };
}

export interface CachedAskAIPayload {
  data: unknown;
  generatedAt: string;
}

const cache = createLRU<CachedAskAIPayload>(DEFAULT_MAX_ENTRIES, DEFAULT_TTL_MS);

function cacheDisabled(): boolean {
  return process.env.ASK_AI_DISABLE_CACHE === "true";
}

export function buildCacheKey(parts: {
  userId: string;
  entityType: string;
  entityId: string;
  updatedAt: string | null | undefined;
  prompt: string;
}): string {
  const updated = parts.updatedAt ?? "0";
  // Normalise prompt: collapse whitespace, lowercase — cache hits on casing/spacing are safe.
  const normalisedPrompt = parts.prompt.trim().replace(/\s+/g, " ").toLowerCase();
  return `${parts.userId}|${parts.entityType}|${parts.entityId}|${updated}|${normalisedPrompt}`;
}

export function getCachedResponse(key: string): CachedAskAIPayload | undefined {
  if (cacheDisabled()) return undefined;
  return cache.get(key);
}

export function setCachedResponse(key: string, value: CachedAskAIPayload): void {
  if (cacheDisabled()) return;
  cache.set(key, value);
}

export function clearAskAICache(): void {
  cache.clear();
}

export function cacheStats(): { size: number } {
  return { size: cache.size };
}
