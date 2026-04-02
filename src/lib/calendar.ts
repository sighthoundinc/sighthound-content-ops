import { addDays, format, startOfWeek } from "date-fns";

export function normalizeWeekStart(value: number | null | undefined): 0 | 1 | 2 | 3 | 4 | 5 | 6 {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return 1;
  }
  const normalized = Math.max(0, Math.min(6, Math.trunc(value)));
  return normalized as 0 | 1 | 2 | 3 | 4 | 5 | 6;
}

export function getWeekdayLabels(weekStart: number) {
  const normalizedWeekStart = normalizeWeekStart(weekStart);
  const baseStart = startOfWeek(new Date(), {
    weekStartsOn: normalizedWeekStart,
  });
  return Array.from({ length: 7 }, (_, index) =>
    format(addDays(baseStart, index), "EEE")
  );
}

export function getDateKeyInTimezone(
  date: Date,
  timezone: string = "America/New_York"
) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = formatter.formatToParts(date);
  const year = parts.find((part) => part.type === "year")?.value ?? "0000";
  const month = parts.find((part) => part.type === "month")?.value ?? "01";
  const day = parts.find((part) => part.type === "day")?.value ?? "01";
  return `${year}-${month}-${day}`;
}
