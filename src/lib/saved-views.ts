/**
 * Saved Views — per-user filter presets.
 *
 * Initial implementation uses localStorage as the storage layer so the
 * feature can roll out ahead of the `saved_views` Supabase table. API
 * methods match what the final RESTful endpoints will expose, making
 * migration to server storage a drop-in change for consumers.
 *
 * Contract:
 * - Views are scoped per page (`scope`) and per user (localStorage key).
 * - `filter_json` is opaque to this module; callers own serialization
 *   of their page-specific filter state.
 * - No workflow / status enum keys leak into view names (AGENTS.md).
 */

const STORAGE_PREFIX = "saved-views:";

export type SavedViewScope =
  | "dashboard"
  | "tasks"
  | "blogs"
  | "social-posts"
  | "calendar"
  | "inbox";

export type SavedView = {
  id: string;
  name: string;
  scope: SavedViewScope;
  pinned: boolean;
  filter_json: string;
  created_at: string;
  updated_at: string;
};

function storageKey(scope: SavedViewScope): string {
  return `${STORAGE_PREFIX}${scope}`;
}

function readStorage(scope: SavedViewScope): SavedView[] {
  if (typeof window === "undefined") {
    return [];
  }
  try {
    const raw = window.localStorage.getItem(storageKey(scope));
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as SavedView[]) : [];
  } catch (error) {
    console.warn("saved views read failed", error);
    return [];
  }
}

function writeStorage(scope: SavedViewScope, views: SavedView[]) {
  if (typeof window === "undefined") {
    return;
  }
  try {
    window.localStorage.setItem(storageKey(scope), JSON.stringify(views));
  } catch (error) {
    console.warn("saved views write failed", error);
  }
}

export function listSavedViews(scope: SavedViewScope): SavedView[] {
  return readStorage(scope).sort((a, b) => {
    if (a.pinned !== b.pinned) {
      return a.pinned ? -1 : 1;
    }
    return a.name.localeCompare(b.name);
  });
}

export function saveSavedView(input: {
  scope: SavedViewScope;
  name: string;
  filter_json: string;
  pinned?: boolean;
}): SavedView {
  const views = readStorage(input.scope);
  const id =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const now = new Date().toISOString();
  const view: SavedView = {
    id,
    scope: input.scope,
    name: input.name,
    filter_json: input.filter_json,
    pinned: input.pinned ?? false,
    created_at: now,
    updated_at: now,
  };
  writeStorage(input.scope, [...views, view]);
  return view;
}

export function updateSavedView(
  scope: SavedViewScope,
  id: string,
  patch: Partial<Pick<SavedView, "name" | "filter_json" | "pinned">>
): SavedView | null {
  const views = readStorage(scope);
  let updated: SavedView | null = null;
  const next = views.map((view) => {
    if (view.id !== id) {
      return view;
    }
    updated = {
      ...view,
      ...patch,
      updated_at: new Date().toISOString(),
    };
    return updated;
  });
  if (!updated) {
    return null;
  }
  writeStorage(scope, next);
  return updated;
}

export function deleteSavedView(scope: SavedViewScope, id: string): boolean {
  const views = readStorage(scope);
  const next = views.filter((view) => view.id !== id);
  if (next.length === views.length) {
    return false;
  }
  writeStorage(scope, next);
  return true;
}
