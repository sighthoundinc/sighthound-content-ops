/**
 * Tiny in-memory stale-while-revalidate cache for list pages.
 *
 * Purpose: when a user navigates away from a list and comes back, show the
 * last data immediately and refresh it in the background, instead of
 * flashing skeletons on every visit.
 *
 * Rules:
 *  - Browser only. On the server these functions are no-ops, because a
 *    module-level Map there would be shared across users and requests.
 *  - Memory only. Nothing is written to disk; a full page reload starts
 *    empty, so there is no schema to migrate.
 *  - The server stays authoritative. Pages always refetch on mount; the
 *    cache only decides what is on screen while that request is in flight.
 *  - Cleared when the session ends, so one account never sees another's
 *    cached rows on a shared machine.
 */
const store = new Map<string, unknown>();

const isBrowser = typeof window !== "undefined";

export function readClientCache<T>(key: string): T | undefined {
  if (!isBrowser) {
    return undefined;
  }
  return store.get(key) as T | undefined;
}

export function hasClientCache(key: string): boolean {
  return isBrowser && store.has(key);
}

export function writeClientCache<T>(key: string, value: T): void {
  if (!isBrowser) {
    return;
  }
  store.set(key, value);
}

export function clearClientCache(): void {
  store.clear();
}
