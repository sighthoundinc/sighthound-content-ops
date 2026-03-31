export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function toTitleCase(value: string) {
  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function formatDateInput(value: string | null | undefined) {
  if (!value) {
    return "";
  }
  return value.slice(0, 10);
}

/**
 * Formats a date-only string (YYYY-MM-DD or ISO timestamp) without timezone conversion.
 * Parses the date part directly and formats locally without converting through UTC.
 * This prevents day-shift bugs in behind-UTC timezones.
 *
 * @param value - Date string in YYYY-MM-DD format or ISO timestamp
 * @returns Formatted date string (e.g., "Mar 20, 2026") or empty string if invalid
 */
export function formatDateOnly(value: string | null | undefined) {
  if (!value) {
    return "";
  }
  const dateToken = value.slice(0, 10);
  // Parse date string directly as local date, not UTC
  const parts = dateToken.split("-");
  if (parts.length !== 3) {
    return "";
  }
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);
  if (Number.isNaN(year) || Number.isNaN(month) || Number.isNaN(day)) {
    return "";
  }
  // Create date in local timezone (not UTC) to preserve the date value
  const localDate = new Date(year, month, day);
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(localDate);
}

/**
 * @deprecated Use formatDateOnly instead for date-only display.
 * This function incorrectly applies UTC timezone conversion to date-only strings.
 */
export function formatDisplayDate(value: string | null | undefined) {
  return formatDateOnly(value);
}

export function isExternalHref(href: string) {
  const normalized = href.trim().toLowerCase();
  if (!normalized) {
    return false;
  }
  if (
    normalized.startsWith("/") ||
    normalized.startsWith("#") ||
    normalized.startsWith("?")
  ) {
    return false;
  }
  return (
    normalized.startsWith("http://") ||
    normalized.startsWith("https://") ||
    normalized.startsWith("//")
  );
}
