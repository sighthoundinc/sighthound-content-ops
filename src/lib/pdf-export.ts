/**
 * Sighthound Content Relay — shared branded PDF export helper.
 *
 * Authority: all paginated / printed exports in the app MUST route through
 * `openBrandedPdfExport`. Per-page inlined HTML/CSS is prohibited (see
 * AGENTS.md §PDF Export Authority).
 *
 * Goals:
 * - Consistent brand presentation (logo, colors, typography) across every
 *   exported PDF in the app.
 * - Self-describing snapshots (title, scope, generated-at, active filters,
 *   sort, actor, timezone) so printed output is auditable without context.
 * - Print-friendly layout (repeating header row, no split rows, page counter
 *   in footer, gradient brand stripe, zebra body).
 * - Zero runtime dependencies — the output is generated HTML consumed by the
 *   browser print pipeline. No Puppeteer / jspdf / react-pdf required.
 *
 * Brand tokens consumed from `src/lib/print-brand-tokens.ts`. Typography is
 * Lexend loaded through Google Fonts inside the popup (the popup is a
 * detached document and does not inherit the host `@font-face`).
 */
import { PRINT_BRAND_TOKENS } from "@/lib/print-brand-tokens";
import { formatDateInTimezone } from "@/lib/format-date";

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export type PdfExportOrientation = "portrait" | "landscape";
export type PdfExportDensity = "compact" | "comfortable";
export type PdfExportScope = "view" | "selected";

/**
 * Canonical status tone tokens shared with `src/lib/table-row-tones.ts`.
 * Keep this list aligned so printed exports mirror in-app row coloring.
 */
export type PdfStatusTone =
  | "review"
  | "ready-to-publish"
  | "awaiting-live-link"
  | "changes-requested"
  | "in-progress"
  | "published"
  | "neutral";

export type PdfColumnDef<Row> = {
  /** Stable column key used by `getCell`. */
  key: string;
  /** Header text displayed in the table. */
  label: string;
  /**
   * Optional CSS width hint (e.g. `"12%"` or `"120px"`). When provided across
   * a subset of columns the remaining space is distributed evenly by the
   * table layout engine.
   */
  width?: string;
  /** Optional alignment override. Defaults to `left`. */
  align?: "left" | "center" | "right";
};

export type PdfCellValue =
  | string
  | null
  | undefined
  | {
      /** Discriminator so TS can narrow the union cheaply. */
      kind: "chip";
      label: string;
      tone: PdfStatusTone;
    };

export type PdfFilterSummary = {
  /** Concept label (e.g. `"Site"`, `"Writer Status"`). */
  label: string;
  /** Human-readable value (e.g. `"SH"`, `"In Progress"`). */
  value: string;
};

export type PdfSortSummary = {
  columnLabel: string;
  direction: "asc" | "desc";
};

export type PdfActor = {
  name: string | null;
  email: string | null;
};

export type PdfExportOptions<Row> = {
  /** Main H1 (e.g. "Blog Library Export"). */
  title: string;
  /** Optional sub-heading shown under the H1 in the document header. */
  subtitle?: string;
  /**
   * Content surface slug for filename + footer branding (e.g. `"blogs"`,
   * `"dashboard"`, `"tasks"`, `"social-posts"`).
   */
  surface: string;
  /**
   * Export scope. Controls subtitle fallback + filename suffix.
   */
  scope: PdfExportScope;
  /** Columns (header labels + optional width hints). */
  columns: PdfColumnDef<Row>[];
  /** Row data. */
  rows: Row[];
  /**
   * Cell resolver. Returning a string renders plain text; returning a
   * `{ kind: "chip", ... }` object renders a pastel status chip.
   */
  getCell: (row: Row, columnKey: string) => PdfCellValue;
  /** IANA timezone (defaults to `America/New_York` per AGENTS.md). */
  timezone?: string | null;
  /** Active filters surfaced in the context block. */
  filters?: PdfFilterSummary[];
  /** Current sort, if any. */
  sort?: PdfSortSummary | null;
  /** Exporting user, surfaced in the context block and footer. */
  actor?: PdfActor | null;
  /** Page orientation. Default: `portrait`. */
  orientation?: PdfExportOrientation;
  /** Row density. Default: `compact`. */
  density?: PdfExportDensity;
  /**
   * Override the default logo URL. Relative to origin unless absolute.
   * Defaults to `/sighthound-logo-with-text.svg` (served from `public/`).
   */
  logoUrl?: string;
  /**
   * Label used in the footer, e.g. `"Sighthound Content Relay"`. Override
   * to mark internal/confidential exports.
   */
  footerBrand?: string;
  /**
   * Injection seam used by tests. When provided, the helper returns the
   * generated HTML string and skips `window.open`.
   */
  __renderOnly?: true;
};

export type PdfExportResult =
  | { status: "printed" }
  | { status: "popup-blocked" }
  | { status: "empty" }
  | { status: "html"; html: string };

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------

const DEFAULT_LOGO_URL = "/sighthound-logo-with-text.svg";
const DEFAULT_FOOTER_BRAND = "Sighthound Content Relay";
const DEFAULT_TIMEZONE = "America/New_York";

/**
 * Brand gradient (Blurple → Red-Orange) — a Sighthound Content Relay
 * signature motif (see AGENTS.md §Design System Authority §6).
 */
const BRAND_GRADIENT = "linear-gradient(90deg, #4f60dc 0%, #f05d22 60%, #f62470 100%)";

/**
 * Pastel status-chip palette. Mirrors `src/lib/table-row-tones.ts` and
 * `STATUS_COLORS` in `src/lib/status.ts`; re-declared with literal hex here
 * because CSS variables don't resolve inside the detached print popup.
 */
const STATUS_CHIP_PALETTE: Record<
  PdfStatusTone,
  { background: string; color: string; border: string }
> = {
  review: { background: "#ede9fe", color: "#5b21b6", border: "#c4b5fd" },
  "ready-to-publish": { background: "#e0f2fe", color: "#075985", border: "#7dd3fc" },
  "awaiting-live-link": { background: "#fef3c7", color: "#92400e", border: "#fcd34d" },
  "changes-requested": { background: "#ffe4e6", color: "#9f1239", border: "#fda4af" },
  "in-progress": { background: "#dbeafe", color: "#1d4ed8", border: "#93c5fd" },
  published: { background: "#d1fae5", color: "#065f46", border: "#6ee7b7" },
  neutral: { background: "#eff3f7", color: "#4b4f73", border: "#d9dfe6" },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const escapeHtml = (value: string): string =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;")
    .replaceAll("'", "&#39;");

const formatScopeLabel = (scope: PdfExportScope, count: number): string =>
  scope === "selected" ? `Selected · ${count} row${count === 1 ? "" : "s"}` : `Current View · ${count} row${count === 1 ? "" : "s"}`;

const densityPadding = (density: PdfExportDensity): string =>
  density === "comfortable" ? "10px 12px" : "6px 10px";

const densityFontSize = (density: PdfExportDensity): string =>
  density === "comfortable" ? "12px" : "11px";

const renderChip = (label: string, tone: PdfStatusTone): string => {
  const palette = STATUS_CHIP_PALETTE[tone] ?? STATUS_CHIP_PALETTE.neutral;
  return `<span class="chip" style="background:${palette.background};color:${palette.color};border-color:${palette.border};">${escapeHtml(label)}</span>`;
};

const renderCellContent = (value: PdfCellValue): string => {
  if (value == null) {
    return "";
  }
  if (typeof value === "string") {
    return escapeHtml(value);
  }
  if (typeof value === "object" && value.kind === "chip") {
    return renderChip(value.label, value.tone);
  }
  return "";
};

const renderFiltersList = (filters: PdfFilterSummary[]): string => {
  if (filters.length === 0) {
    return `<span class="meta-empty">None</span>`;
  }
  return filters
    .map(
      (filter) =>
        `<span class="filter-pill"><strong>${escapeHtml(filter.label)}:</strong> ${escapeHtml(filter.value)}</span>`
    )
    .join("");
};

/**
 * Build the filename for a PDF / CSV export.
 *
 * Output pattern: `content-relay_{surface}_{scope}_{YYYYMMDD-HHmm}_{tzAbbr}.{ext}`
 * Example: `content-relay_blogs_selected_20260421-0852_ET.pdf`
 */
export function buildExportFilename(params: {
  surface: string;
  scope: PdfExportScope;
  timezone?: string | null;
  ext?: "pdf" | "csv";
  at?: Date;
}): string {
  const { surface, scope, timezone, ext = "pdf", at = new Date() } = params;
  const tz = timezone || DEFAULT_TIMEZONE;
  const stamp = formatDateInTimezone(at.toISOString(), tz, "yyyyMMdd-HHmm");
  const tzAbbr = inferTimezoneAbbr(tz);
  return `content-relay_${surface}_${scope}_${stamp}_${tzAbbr}.${ext}`;
}

/**
 * Map IANA timezones to a short abbreviation for filenames. Falls back to a
 * dash-free slug of the timezone when no known abbreviation applies.
 */
function inferTimezoneAbbr(timezone: string): string {
  const map: Record<string, string> = {
    "America/New_York": "ET",
    "America/Chicago": "CT",
    "America/Denver": "MT",
    "America/Los_Angeles": "PT",
    "Europe/London": "GMT",
    "Europe/Berlin": "CET",
    "Europe/Paris": "CET",
    "Asia/Tokyo": "JST",
    "Asia/Kolkata": "IST",
    "Asia/Dubai": "GST",
    "Australia/Sydney": "AEDT",
    UTC: "UTC",
  };
  if (map[timezone]) {
    return map[timezone];
  }
  return timezone.replaceAll("/", "-").replaceAll("_", "");
}

// ---------------------------------------------------------------------------
// HTML generation
// ---------------------------------------------------------------------------

/**
 * Pure function that assembles the final HTML document. Exported for
 * contract/unit testing — callers should prefer `openBrandedPdfExport`.
 */
export function renderBrandedPdfHtml<Row>(
  opts: PdfExportOptions<Row> & { originUrl: string }
): string {
  const {
    title,
    subtitle,
    columns,
    rows,
    getCell,
    timezone,
    filters = [],
    sort,
    actor,
    orientation = "portrait",
    density = "compact",
    scope,
    logoUrl = DEFAULT_LOGO_URL,
    footerBrand = DEFAULT_FOOTER_BRAND,
    originUrl,
  } = opts;

  const tz = timezone || DEFAULT_TIMEZONE;
  const generatedAt = formatDateInTimezone(
    new Date().toISOString(),
    tz,
    "MMM d yyyy, h:mm a"
  );
  const absoluteLogoUrl = /^https?:\/\//i.test(logoUrl)
    ? logoUrl
    : `${originUrl.replace(/\/$/, "")}${logoUrl}`;

  const pageSize = orientation === "landscape" ? "letter landscape" : "letter portrait";
  const rowPadding = densityPadding(density);
  const tableFontSize = densityFontSize(density);
  const subtitleText = subtitle || formatScopeLabel(scope, rows.length);

  const headerMarkup = columns
    .map(
      (column) =>
        `<th style="${column.width ? `width:${column.width};` : ""}text-align:${column.align ?? "left"};">${escapeHtml(column.label)}</th>`
    )
    .join("");

  const rowsMarkup = rows
    .map((row) => {
      const cells = columns
        .map((column) => {
          const value = getCell(row, column.key);
          return `<td style="text-align:${column.align ?? "left"};">${renderCellContent(value)}</td>`;
        })
        .join("");
      return `<tr>${cells}</tr>`;
    })
    .join("");

  const actorLine = actor?.name
    ? `${escapeHtml(actor.name)}${actor.email ? ` &lt;${escapeHtml(actor.email)}&gt;` : ""}`
    : actor?.email
      ? escapeHtml(actor.email)
      : "Unknown user";

  const sortLine = sort
    ? `${escapeHtml(sort.columnLabel)} ${sort.direction === "asc" ? "↑" : "↓"}`
    : "Default order";

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(title)}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Lexend:wght@300;400;500;600&display=swap" />
  <style>
    @page {
      size: ${pageSize};
      margin: 0.6in 0.5in 0.8in 0.5in;
    }
    :root {
      color-scheme: light only;
    }
    * { box-sizing: border-box; }
    html, body {
      margin: 0;
      padding: 0;
      background: #ffffff;
      color: ${PRINT_BRAND_TOKENS.ink};
      font-family: "Lexend", -apple-system, BlinkMacSystemFont, "Segoe UI", Verdana, sans-serif;
      font-size: ${tableFontSize};
      letter-spacing: -0.01em;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    body {
      padding: 0 24px 24px;
    }
    .brand-stripe {
      height: 6px;
      width: 100%;
      background: ${BRAND_GRADIENT};
      margin-bottom: 18px;
    }
    header.pdf-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 24px;
      padding-top: 18px;
      padding-bottom: 10px;
      border-bottom: 1px solid ${PRINT_BRAND_TOKENS.borderDefault};
    }
    header.pdf-header .brand {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    header.pdf-header .brand img {
      height: 28px;
      width: auto;
      display: block;
    }
    header.pdf-header .brand .product {
      font-size: 12px;
      font-weight: 500;
      color: ${PRINT_BRAND_TOKENS.inkSoft};
      letter-spacing: 0.02em;
      text-transform: uppercase;
    }
    header.pdf-header .title-block {
      text-align: right;
    }
    header.pdf-header h1 {
      margin: 0;
      font-size: 20px;
      font-weight: 600;
      color: ${PRINT_BRAND_TOKENS.ink};
    }
    header.pdf-header p {
      margin: 4px 0 0;
      font-size: 12px;
      color: ${PRINT_BRAND_TOKENS.inkSoft};
    }
    section.context {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      column-gap: 24px;
      row-gap: 6px;
      padding: 12px 0 14px;
      border-bottom: 1px solid ${PRINT_BRAND_TOKENS.borderDefault};
      font-size: 11px;
      color: ${PRINT_BRAND_TOKENS.inkSoft};
    }
    section.context .label {
      font-weight: 600;
      color: ${PRINT_BRAND_TOKENS.ink};
      margin-right: 6px;
    }
    section.context .filters-row {
      grid-column: span 2;
    }
    section.context .filter-pill {
      display: inline-block;
      background: ${PRINT_BRAND_TOKENS.surfaceMuted};
      border: 1px solid ${PRINT_BRAND_TOKENS.borderDefault};
      border-radius: 999px;
      padding: 2px 8px;
      margin: 2px 6px 2px 0;
      font-size: 10.5px;
      color: ${PRINT_BRAND_TOKENS.ink};
    }
    section.context .meta-empty {
      color: ${PRINT_BRAND_TOKENS.inkSoft};
      font-style: italic;
    }
    table {
      margin-top: 14px;
      border-collapse: collapse;
      width: 100%;
      table-layout: fixed;
      font-size: ${tableFontSize};
    }
    thead { display: table-header-group; }
    tfoot { display: table-row-group; }
    tr { page-break-inside: avoid; break-inside: avoid; }
    th, td {
      border: 1px solid ${PRINT_BRAND_TOKENS.borderDefault};
      padding: ${rowPadding};
      vertical-align: top;
      word-break: break-word;
    }
    th {
      background: ${PRINT_BRAND_TOKENS.surfaceMuted};
      color: ${PRINT_BRAND_TOKENS.ink};
      font-weight: 600;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    tbody tr:nth-child(even) td {
      background: #f7f8fb;
    }
    .chip {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 999px;
      border: 1px solid transparent;
      font-size: 10.5px;
      font-weight: 500;
      white-space: nowrap;
    }
    footer.pdf-footer {
      position: fixed;
      left: 24px;
      right: 24px;
      bottom: 10px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-size: 10px;
      color: ${PRINT_BRAND_TOKENS.inkSoft};
      border-top: 1px solid ${PRINT_BRAND_TOKENS.borderDefault};
      padding-top: 6px;
    }
    footer.pdf-footer .page-counter::after {
      content: counter(page) " / " counter(pages);
    }
    @media print {
      header.pdf-header { page-break-after: avoid; }
      section.context { page-break-after: avoid; }
    }
  </style>
</head>
<body>
  <div class="brand-stripe" aria-hidden="true"></div>
  <header class="pdf-header">
    <div class="brand">
      <img src="${escapeHtml(absoluteLogoUrl)}" alt="Sighthound" onerror="this.style.display='none'" />
      <span class="product">${escapeHtml(footerBrand)}</span>
    </div>
    <div class="title-block">
      <h1>${escapeHtml(title)}</h1>
      <p>${escapeHtml(subtitleText)}</p>
      <p>Generated ${escapeHtml(generatedAt)}</p>
    </div>
  </header>
  <section class="context">
    <div><span class="label">Exported by:</span>${actorLine}</div>
    <div><span class="label">Timezone:</span>${escapeHtml(tz)}</div>
    <div><span class="label">Scope:</span>${escapeHtml(formatScopeLabel(scope, rows.length))}</div>
    <div><span class="label">Sort:</span>${escapeHtml(sortLine)}</div>
    <div class="filters-row"><span class="label">Active filters:</span>${renderFiltersList(filters)}</div>
  </section>
  <table role="table">
    <thead>
      <tr>${headerMarkup}</tr>
    </thead>
    <tbody>${rowsMarkup}</tbody>
  </table>
  <footer class="pdf-footer" aria-hidden="true">
    <span>${escapeHtml(footerBrand)} · ${escapeHtml(generatedAt)}</span>
    <span>Page <span class="page-counter"></span></span>
  </footer>
</body>
</html>`;
}

// ---------------------------------------------------------------------------
// Popup driver
// ---------------------------------------------------------------------------

/**
 * Open a branded print popup and trigger the browser's print dialog. Returns
 * the lifecycle status so callers can surface appropriate toasts.
 *
 * In test mode (`__renderOnly: true`) returns the rendered HTML without
 * touching `window`.
 */
export function openBrandedPdfExport<Row>(opts: PdfExportOptions<Row>): PdfExportResult {
  if (opts.__renderOnly) {
    const html = renderBrandedPdfHtml({ ...opts, originUrl: "http://localhost" });
    return { status: "html", html };
  }

  if (opts.rows.length === 0) {
    return { status: "empty" };
  }

  if (typeof window === "undefined") {
    return { status: "empty" };
  }

  const popup = window.open("", "_blank", "width=1100,height=800");
  if (!popup) {
    return { status: "popup-blocked" };
  }

  const html = renderBrandedPdfHtml({ ...opts, originUrl: window.location.origin });

  popup.document.open();
  popup.document.write(html);
  popup.document.close();

  const triggerPrintWhenReady = () => {
    if (popup.closed) {
      return;
    }
    const isReady = popup.document.readyState === "complete";
    const hasBody = Boolean(popup.document.body?.childElementCount);
    if (!isReady || !hasBody) {
      window.setTimeout(triggerPrintWhenReady, 120);
      return;
    }
    popup.focus();
    popup.print();
  };
  window.setTimeout(triggerPrintWhenReady, 180);

  return { status: "printed" };
}
