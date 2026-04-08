import {
  getCurrentDateIso,
  getOverdueUpdatedAtCutoffIso,
  isDateDueOnOrBeforeToday,
  isRecordStaleForOverdueCheck,
} from "@/lib/overdue-window";

const fixedNow = Date.parse("2026-04-08T12:00:00.000Z");
const cutoffIso = getOverdueUpdatedAtCutoffIso(fixedNow);
const todayIso = getCurrentDateIso(fixedNow);

export const overdueWindowContractSmokeChecks = {
  cutoffUsesOneDayLookback: cutoffIso === "2026-04-07T12:00:00.000Z",
  staleRowsAreIncluded:
    isRecordStaleForOverdueCheck("2026-04-07T11:59:59.000Z", fixedNow) ===
    true,
  freshRowsAreExcluded:
    isRecordStaleForOverdueCheck("2026-04-07T12:00:01.000Z", fixedNow) ===
    false,
  dueDatesIncludeToday: isDateDueOnOrBeforeToday("2026-04-08", fixedNow) === true,
  futureDatesAreExcluded:
    isDateDueOnOrBeforeToday("2026-04-09", fixedNow) === false,
  currentDateFormattingIsStable: todayIso === "2026-04-08",
} as const;
