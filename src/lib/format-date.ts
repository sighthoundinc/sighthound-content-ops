import { format as formatDateFns } from "date-fns";

/**
 * Formats a date/datetime string in the user's specified timezone.
 * Falls back to America/New_York if no timezone is provided.
 *
 * @param isoString - ISO 8601 datetime string (UTC)
 * @param timezone - User's timezone (e.g., "America/New_York", "Europe/London")
 * @param formatPattern - date-fns format pattern (e.g., "PPp", "MMM d, yyyy h:mm a")
 * @returns Formatted date string in the user's timezone
 */
export function formatDateInTimezone(
  isoString: string | null | undefined,
  timezone: string = "America/New_York",
  formatPattern: string = "PPp"
): string {
  if (!isoString) {
    return "";
  }

  try {
    const date = new Date(isoString);
    if (Number.isNaN(date.getTime())) {
      return "";
    }

    // Get the date string in the user's timezone
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    });

    const parts = formatter.formatToParts(date);
    const partMap: Record<string, string> = {};
    parts.forEach((part) => {
      partMap[part.type] = part.value;
    });

    // Construct a new date in UTC that represents the local time in the user's timezone
    // This is a workaround because date-fns doesn't natively support arbitrary timezones
    const month = parseInt(partMap.month, 10) - 1;
    const day = parseInt(partMap.day, 10);
    const year = parseInt(partMap.year, 10);
    const hour = partMap.hour12 === "PM" && parseInt(partMap.hour, 10) !== 12
      ? parseInt(partMap.hour, 10) + 12
      : partMap.hour12 === "AM" && parseInt(partMap.hour, 10) === 12
      ? 0
      : parseInt(partMap.hour, 10);
    const minute = parseInt(partMap.minute, 10);
    const second = parseInt(partMap.second, 10);

    // Create a date that represents the timezone-local time
    const localDate = new Date(year, month, day, hour, minute, second);

    // Format using date-fns with the constructed local date
    return formatDateFns(localDate, formatPattern);
  } catch (error) {
    console.error("Error formatting date:", error);
    return isoString || "";
  }
}

/**
 * Formats a short date (just date, no time) in the user's timezone.
 *
 * @param isoString - ISO 8601 datetime string (UTC)
 * @param timezone - User's timezone (e.g., "America/New_York")
 * @returns Formatted date string (e.g., "Mar 20, 2026")
 */
export function formatShortDateInTimezone(
  isoString: string | null | undefined,
  timezone: string = "America/New_York"
): string {
  return formatDateInTimezone(isoString, timezone, "PPP");
}

/**
 * Formats a time-only string in the user's timezone.
 *
 * @param isoString - ISO 8601 datetime string (UTC)
 * @param timezone - User's timezone (e.g., "America/New_York")
 * @returns Formatted time string (e.g., "2:30 PM")
 */
export function formatTimeInTimezone(
  isoString: string | null | undefined,
  timezone: string = "America/New_York"
): string {
  return formatDateInTimezone(isoString, timezone, "p");
}
