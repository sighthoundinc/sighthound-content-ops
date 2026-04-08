export const OVERDUE_STALE_WINDOW_MS = 24 * 60 * 60 * 1000;

export function getOverdueUpdatedAtCutoffIso(nowMs = Date.now()) {
  return new Date(nowMs - OVERDUE_STALE_WINDOW_MS).toISOString();
}

export function getCurrentDateIso(nowMs = Date.now()) {
  return new Date(nowMs).toISOString().split("T")[0];
}

export function isRecordStaleForOverdueCheck(
  updatedAtIso: string,
  nowMs = Date.now()
) {
  const updatedAtMs = Date.parse(updatedAtIso);
  if (Number.isNaN(updatedAtMs)) {
    return false;
  }
  return updatedAtMs <= nowMs - OVERDUE_STALE_WINDOW_MS;
}

export function isDateDueOnOrBeforeToday(dateValue: string, nowMs = Date.now()) {
  return dateValue <= getCurrentDateIso(nowMs);
}
