/**
 * Shortcut hint discoverability.
 *
 * Tracks which tips the user has already seen so we can fire a one-time
 * toast like "Tip: press E to edit" the first time a user performs an
 * action via mouse that has a keyboard equivalent.
 *
 * Keeps to localStorage for Wave 2; migrate to `profiles.ui_tips_shown`
 * JSONB when the DB column lands (AGENTS.md). Consumers do not need to
 * change when storage moves.
 *
 * Rule (AGENTS.md Shortcut Display Invariants):
 * - The shortcuts modal remains the single source of truth.
 * - Tip text MUST be transient (toast) and MUST NOT be repeated inline on pages.
 */

const STORAGE_KEY = "ui:tips-shown";

type TipStore = Record<string, boolean>;

function readStore(): TipStore {
  if (typeof window === "undefined") {
    return {};
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return {};
    }
    const parsed = JSON.parse(raw);
    return typeof parsed === "object" && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}

function writeStore(store: TipStore) {
  if (typeof window === "undefined") {
    return;
  }
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch (error) {
    console.warn("shortcut tip write failed", error);
  }
}

export function hasSeenTip(tipId: string): boolean {
  return Boolean(readStore()[tipId]);
}

export function markTipSeen(tipId: string): void {
  const store = readStore();
  if (store[tipId]) {
    return;
  }
  store[tipId] = true;
  writeStore(store);
}

/**
 * Convenience: run the provided toast invocation once per tip id.
 * Returns true if the toast was emitted, false otherwise.
 */
export function emitTipOnce(
  tipId: string,
  emit: () => void
): boolean {
  if (hasSeenTip(tipId)) {
    return false;
  }
  markTipSeen(tipId);
  emit();
  return true;
}
