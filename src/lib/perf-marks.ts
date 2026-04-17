/**
 * Performance marks for Content Relay UX budgets.
 *
 * Keep marks light — one mark per critical surface (dashboard TTI, list
 * filter response, drawer open). Consumers call `markStart("dashboard")`
 * early in mount and `markEnd("dashboard")` on first meaningful render.
 *
 * See `docs/PERFORMANCE_BUDGET.md` for the authoritative budget values.
 * Values exceeding the budget are logged with `console.warn` in dev so
 * they're caught during normal usage without shipping a perf panel.
 */

const SESSION_PREFIX = "crelay:";

const BUDGETS: Record<string, number> = {
  "dashboard:tti": 1000,
  "tasks:tti": 1000,
  "list:filter": 100,
  "drawer:open": 150,
  "palette:first-result": 250,
};

export type PerfMarkKey = keyof typeof BUDGETS;

export function markStart(key: PerfMarkKey): void {
  if (typeof performance === "undefined" || !performance.mark) {
    return;
  }
  try {
    performance.mark(`${SESSION_PREFIX}${key}:start`);
  } catch {
    // ignore — marks are best-effort
  }
}

export function markEnd(key: PerfMarkKey): number | null {
  if (typeof performance === "undefined" || !performance.mark) {
    return null;
  }
  try {
    performance.mark(`${SESSION_PREFIX}${key}:end`);
    performance.measure(
      `${SESSION_PREFIX}${key}`,
      `${SESSION_PREFIX}${key}:start`,
      `${SESSION_PREFIX}${key}:end`
    );
    const entries = performance.getEntriesByName(`${SESSION_PREFIX}${key}`);
    const latest = entries[entries.length - 1];
    if (!latest) {
      return null;
    }
    const duration = latest.duration;
    const budget = BUDGETS[key];
    if (
      process.env.NODE_ENV !== "production" &&
      typeof budget === "number" &&
      duration > budget
    ) {
      console.warn(
        `[perf] ${key} exceeded budget (${duration.toFixed(1)}ms > ${budget}ms)`
      );
    }
    return duration;
  } catch {
    return null;
  }
}

export function getBudget(key: PerfMarkKey): number | undefined {
  return BUDGETS[key];
}
