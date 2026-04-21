/**
 * POST /api/exports/pdf
 *
 * Server-side branded export endpoint. Accepts the same option shape consumed
 * by `openBrandedPdfExport` in the browser and returns fully-rendered,
 * print-ready HTML (Content-Type: `text/html`). The HTML includes Lexend +
 * the brand gradient stripe + the Sighthound logo + `@page` counters, so any
 * headless browser (Puppeteer, Playwright, wkhtmltopdf, etc.) can convert it
 * directly to a PDF with zero additional styling.
 *
 * Rationale:
 * - Keeps rendering logic in one place (`src/lib/pdf-export.ts`).
 * - Unlocks programmatic/cron exports (email attachments, archive snapshots)
 *   without adding Puppeteer as a runtime dependency today.
 * - Future Puppeteer integration becomes a thin wrapper around this HTML.
 *
 * Authorization:
 * - Requires an authenticated session (matches the app's other export paths).
 * - Callers are expected to pre-validate/trim rows to what the user has
 *   permission to see. This route does NOT re-query the DB or re-check
 *   per-row RLS; it purely renders what it is given.
 */
import { NextRequest, NextResponse } from "next/server";

import { authenticateRequest } from "@/lib/server-permissions";
import {
  renderBrandedPdfHtml,
  type PdfColumnDef,
  type PdfExportDensity,
  type PdfExportOrientation,
  type PdfExportScope,
  type PdfCellValue,
  type PdfFilterSummary,
  type PdfSortSummary,
  type PdfStatusTone,
} from "@/lib/pdf-export";

type PdfExportRow = Record<string, PdfCellValue>;

type PdfExportRequestBody = {
  title: string;
  surface: string;
  scope: PdfExportScope;
  columns: PdfColumnDef[];
  rows: PdfExportRow[];
  timezone?: string | null;
  filters?: PdfFilterSummary[];
  sort?: PdfSortSummary | null;
  actor?: { name: string | null; email: string | null } | null;
  orientation?: PdfExportOrientation;
  density?: PdfExportDensity;
  logoUrl?: string;
  footerBrand?: string;
  subtitle?: string;
};

const ALLOWED_STATUS_TONES = new Set<PdfStatusTone>([
  "review",
  "ready-to-publish",
  "awaiting-live-link",
  "changes-requested",
  "in-progress",
  "published",
  "neutral",
]);

function isValidBody(value: unknown): value is PdfExportRequestBody {
  if (!value || typeof value !== "object") {
    return false;
  }
  const body = value as Partial<PdfExportRequestBody>;
  if (typeof body.title !== "string" || body.title.length === 0) {
    return false;
  }
  if (typeof body.surface !== "string" || body.surface.length === 0) {
    return false;
  }
  if (body.scope !== "view" && body.scope !== "selected") {
    return false;
  }
  if (!Array.isArray(body.columns) || body.columns.length === 0) {
    return false;
  }
  if (!Array.isArray(body.rows)) {
    return false;
  }
  return true;
}

/**
 * Strips any cell values that don't match the expected `PdfCellValue` union so
 * untrusted callers can't inject arbitrary HTML through the cell serializer.
 */
function sanitizeRows(rows: PdfExportRow[]): PdfExportRow[] {
  return rows.map((row) => {
    const sanitized: PdfExportRow = {};
    for (const [key, value] of Object.entries(row)) {
      if (value == null) {
        sanitized[key] = value;
        continue;
      }
      if (typeof value === "string") {
        sanitized[key] = value;
        continue;
      }
      if (
        typeof value === "object" &&
        "kind" in value &&
        value.kind === "chip" &&
        typeof value.label === "string" &&
        ALLOWED_STATUS_TONES.has(value.tone as PdfStatusTone)
      ) {
        sanitized[key] = {
          kind: "chip",
          label: value.label,
          tone: value.tone,
        };
        continue;
      }
      // Drop unknown shapes rather than trust them.
      sanitized[key] = null;
    }
    return sanitized;
  });
}

export async function POST(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body." },
      { status: 400 }
    );
  }

  if (!isValidBody(body)) {
    return NextResponse.json(
      {
        error:
          "Invalid body. Expected { title, surface, scope, columns, rows, ... }.",
      },
      { status: 400 }
    );
  }

  // Defensive cap — prevents an accidental 100k-row export from DOSing the
  // render step. Callers paginating large data should chunk client-side.
  const MAX_ROWS = 5_000;
  if (body.rows.length > MAX_ROWS) {
    return NextResponse.json(
      {
        error: `Row count exceeds export limit (${MAX_ROWS}). Narrow filters or paginate.`,
      },
      { status: 413 }
    );
  }

  const origin = new URL(request.url).origin;
  const html = renderBrandedPdfHtml({
    title: body.title,
    subtitle: body.subtitle,
    surface: body.surface,
    scope: body.scope,
    columns: body.columns,
    rows: sanitizeRows(body.rows),
    getCell: (row, columnKey) => row[columnKey] ?? "",
    timezone: body.timezone ?? null,
    filters: body.filters ?? [],
    sort: body.sort ?? null,
    actor: body.actor ?? null,
    orientation: body.orientation,
    density: body.density,
    logoUrl: body.logoUrl,
    footerBrand: body.footerBrand,
    originUrl: origin,
  });

  return new Response(html, {
    status: 200,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store",
      "x-export-surface": body.surface,
      "x-export-scope": body.scope,
    },
  });
}
