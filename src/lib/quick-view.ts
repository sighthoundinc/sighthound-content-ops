export const QUICK_VIEW_STORAGE_KEY =
  "sighthound.quick_view_admin_session_v1";

export type QuickViewSnapshot = {
  adminAccessToken: string;
  adminRefreshToken: string;
  adminUserId: string;
  adminDisplayName: string;
  targetUserId: string;
  targetDisplayName: string;
  startedAt: string;
};

function isQuickViewSnapshot(value: unknown): value is QuickViewSnapshot {
  if (!value || typeof value !== "object") {
    return false;
  }
  const candidate = value as Partial<QuickViewSnapshot>;
  return (
    typeof candidate.adminAccessToken === "string" &&
    typeof candidate.adminRefreshToken === "string" &&
    typeof candidate.adminUserId === "string" &&
    typeof candidate.adminDisplayName === "string" &&
    typeof candidate.targetUserId === "string" &&
    typeof candidate.targetDisplayName === "string" &&
    typeof candidate.startedAt === "string"
  );
}

export function readQuickViewSnapshot() {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    const raw = window.localStorage.getItem(QUICK_VIEW_STORAGE_KEY);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as unknown;
    return isQuickViewSnapshot(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function saveQuickViewSnapshot(snapshot: QuickViewSnapshot) {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(QUICK_VIEW_STORAGE_KEY, JSON.stringify(snapshot));
}

export function clearQuickViewSnapshot() {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.removeItem(QUICK_VIEW_STORAGE_KEY);
}
