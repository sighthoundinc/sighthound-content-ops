/**
 * Calendar export utilities for ICS (RFC 5545) and CSV (RFC 4180) formats.
 * Enables users to export calendar events to external calendar applications.
 */

export interface CalendarExportItem {
  id: string;
  title: string;
  scheduledDate: string; // YYYY-MM-DD format
  type: "blog" | "social";
  status: string;
  site: string;
  dayOfWeek: string;
}

/**
 * Generates RFC 5545-compliant iCalendar (.ics) file content
 * for import into Outlook, Apple Calendar, Google Calendar, etc.
 */
export function generateICS(
  items: CalendarExportItem[],
  timezone: string
): string {
  const now = new Date();
  const timestamp = now
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}/, "");

  const events = items
    .map((item) => {
      const date = item.scheduledDate.replace(/-/g, "");
      const uid = `${item.id}-${item.type}@sighthound-content-ops`;
      const contentType =
        item.type === "blog"
          ? "Blog"
          : item.type === "social"
            ? "Social Post"
            : "Content";
      const summary = `${contentType}: ${item.title}`;
      const description = `Type: ${contentType}\nStatus: ${item.status}\nSite: ${item.site}`;

      return (
        [
          "BEGIN:VEVENT",
          `UID:${uid}`,
          `DTSTAMP:${timestamp}`,
          `DTSTART;VALUE=DATE:${date}`,
          `SUMMARY:${escapeICS(summary)}`,
          `DESCRIPTION:${escapeICS(description)}`,
          "STATUS:CONFIRMED",
          `CREATED:${timestamp}`,
          `LAST-MODIFIED:${timestamp}`,
          "END:VEVENT",
        ].join("\r\n")
      );
    })
    .join("\r\n");

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Sighthound Content Ops//EN",
    `CALSCALE:GREGORIAN`,
    `X-TIMEZONE:${timezone}`,
    events,
    "END:VCALENDAR",
  ].join("\r\n");
}

/**
 * Generates RFC 4180-compliant CSV file content
 * for use in spreadsheet applications.
 */
export function generateCSV(items: CalendarExportItem[]): string {
  const headers = ["Date", "Day", "Type", "Title", "Status", "Site"];

  const rows = items.map((item) => [
    item.scheduledDate,
    item.dayOfWeek,
    item.type === "blog" ? "Blog" : "Social Post",
    escapeCSV(item.title),
    escapeCSV(item.status),
    item.site,
  ]);

  const allRows = [headers, ...rows];
  return allRows.map((row) => row.join(",")).join("\r\n");
}

/**
 * Triggers a file download for ICS content
 */
export function exportToICS(
  items: CalendarExportItem[],
  timezone: string,
  filename: string = "calendar.ics"
): void {
  const content = generateICS(items, timezone);
  downloadFile(content, filename, "text/calendar;charset=utf-8");
}

/**
 * Triggers a file download for CSV content
 */
export function exportToCSV(
  items: CalendarExportItem[],
  filename: string = "calendar.csv"
): void {
  const content = generateCSV(items);
  downloadFile(content, filename, "text/csv;charset=utf-8");
}

/**
 * Helper: Download file to user's machine
 */
function downloadFile(
  content: string,
  filename: string,
  mimeType: string
): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Escape special characters for ICS (RFC 5545)
 */
function escapeICS(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\r\n/g, "\\n")
    .replace(/\n/g, "\\n")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,");
}

/**
 * Escape special characters for CSV (RFC 4180)
 */
function escapeCSV(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
