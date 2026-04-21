/**
 * PDF export contract test.
 *
 * Locks the branded-export output shape produced by
 * `renderBrandedPdfHtml` / `openBrandedPdfExport` / `buildExportFilename`.
 *
 * Changes to branding, layout, filename pattern, or status-chip tones MUST
 * update both `src/lib/pdf-export.ts` AND this test in the same change —
 * that is the guardrail per AGENTS.md §PDF Export Authority.
 */
import {
  buildExportFilename,
  openBrandedPdfExport,
  renderBrandedPdfHtml,
  type PdfColumnDef,
} from "@/lib/pdf-export";
import { PRINT_BRAND_TOKENS } from "@/lib/print-brand-tokens";

type Fixture = { id: string; title: string; status: string };

const columns: PdfColumnDef<Fixture>[] = [
  { key: "id", label: "ID", width: "12%" },
  { key: "title", label: "Title" },
  { key: "status", label: "Status" },
];

const fixtureRows: Fixture[] = [
  { id: "1", title: "Launch Post", status: "Draft" },
  { id: "2", title: "Reminder", status: "Published" },
];

describe("renderBrandedPdfHtml", () => {
  const html = renderBrandedPdfHtml({
    title: "Blog Library Export",
    surface: "blogs",
    scope: "view",
    columns,
    rows: fixtureRows,
    getCell: (row, key) => (row as unknown as Record<string, string>)[key] ?? "",
    timezone: "America/New_York",
    filters: [
      { label: "Site", value: "SH" },
      { label: "Search", value: "redaction" },
    ],
    sort: { columnLabel: "Title", direction: "asc" },
    actor: { name: "Haris Ajmal", email: "haris@sighthound.com" },
    originUrl: "https://app.sighthound.com",
  });

  it("emits a complete HTML document", () => {
    expect(html).toMatch(/^<!doctype html>/i);
    expect(html).toContain("</html>");
  });

  it("includes the Sighthound Content Relay footer brand", () => {
    expect(html).toContain("Sighthound Content Relay");
  });

  it("renders the brand gradient stripe", () => {
    expect(html).toContain("linear-gradient(90deg, #4f60dc 0%, #f05d22 60%, #f62470 100%)");
    expect(html).toContain('class="brand-stripe"');
  });

  it("embeds the logo as an absolute URL derived from origin", () => {
    expect(html).toContain('src="https://app.sighthound.com/sighthound-logo-with-text.svg"');
  });

  it("loads Lexend via Google Fonts inside the detached popup", () => {
    expect(html).toContain("fonts.googleapis.com/css2?family=Lexend");
  });

  it("uses the canonical brand tokens for body/text/border/surface", () => {
    expect(html).toContain(PRINT_BRAND_TOKENS.ink);
    expect(html).toContain(PRINT_BRAND_TOKENS.inkSoft);
    expect(html).toContain(PRINT_BRAND_TOKENS.borderDefault);
    expect(html).toContain(PRINT_BRAND_TOKENS.surfaceMuted);
  });

  it("renders a footer with a CSS page counter", () => {
    expect(html).toContain("counter(page)");
    expect(html).toContain("counter(pages)");
    expect(html).toContain('class="pdf-footer"');
  });

  it("repeats the table header across printed pages and avoids split rows", () => {
    expect(html).toContain("thead { display: table-header-group; }");
    expect(html).toContain("page-break-inside: avoid");
  });

  it("exposes actor, timezone, and scope metadata in the context block", () => {
    expect(html).toContain("Haris Ajmal");
    expect(html).toContain("haris@sighthound.com");
    expect(html).toContain("America/New_York");
    expect(html).toContain("Current View");
  });

  it("emits one filter pill per supplied filter", () => {
    expect(html).toContain(">Site:</strong>");
    expect(html).toContain(">Search:</strong>");
    expect((html.match(/class="filter-pill"/g) ?? []).length).toBe(2);
  });

  it("emits one <tr> per body row plus the header row", () => {
    const rowMatches = html.match(/<tr>/g) ?? [];
    expect(rowMatches.length).toBe(fixtureRows.length + 1);
  });

  it("renders chip-shaped cell values with tone-mapped colors", () => {
    const chipHtml = renderBrandedPdfHtml({
      title: "Social Posts Export",
      surface: "social-posts",
      scope: "view",
      columns: [{ key: "status", label: "Status" }],
      rows: [{ status: "published" }],
      getCell: () => ({ kind: "chip", label: "Published", tone: "published" }),
      originUrl: "https://app.sighthound.com",
    });
    expect(chipHtml).toContain('class="chip"');
    // published tone -> emerald palette
    expect(chipHtml).toContain("#d1fae5");
    expect(chipHtml).toContain("#065f46");
  });

  it("switches to landscape @page sizing when requested", () => {
    const landscape = renderBrandedPdfHtml({
      title: "Dashboard Export",
      surface: "dashboard",
      scope: "view",
      columns,
      rows: fixtureRows,
      getCell: (row, key) => (row as unknown as Record<string, string>)[key] ?? "",
      originUrl: "https://app.sighthound.com",
      orientation: "landscape",
    });
    expect(landscape).toContain("size: letter landscape");
  });

  it("escapes HTML metacharacters in cell values", () => {
    const dangerous = renderBrandedPdfHtml({
      title: "Export",
      surface: "blogs",
      scope: "view",
      columns: [{ key: "title", label: "Title" }],
      rows: [{ title: "<script>alert('x')</script>" }],
      getCell: (row) => (row as { title: string }).title,
      originUrl: "https://app.sighthound.com",
    });
    expect(dangerous).not.toContain("<script>alert");
    expect(dangerous).toContain("&lt;script&gt;");
  });
});

describe("buildExportFilename", () => {
  const frozenAt = new Date("2026-04-21T12:52:26Z");

  it("uses the canonical content-relay prefix and ET abbreviation for US/Eastern", () => {
    const filename = buildExportFilename({
      surface: "blogs",
      scope: "selected",
      timezone: "America/New_York",
      at: frozenAt,
    });
    expect(filename.startsWith("content-relay_blogs_selected_")).toBe(true);
    expect(filename.endsWith("_ET.pdf")).toBe(true);
  });

  it("supports CSV extension with the same pattern", () => {
    const filename = buildExportFilename({
      surface: "dashboard",
      scope: "view",
      timezone: "America/Los_Angeles",
      ext: "csv",
      at: frozenAt,
    });
    expect(filename).toMatch(/^content-relay_dashboard_view_\d{8}-\d{4}_PT\.csv$/);
  });

  it("falls back to a slugified timezone when no short abbreviation exists", () => {
    const filename = buildExportFilename({
      surface: "tasks",
      scope: "view",
      timezone: "Africa/Nairobi",
      at: frozenAt,
    });
    expect(filename).toMatch(/_Africa-Nairobi\.pdf$/);
  });

  it("defaults to America/New_York when no timezone is provided", () => {
    const filename = buildExportFilename({
      surface: "social-posts",
      scope: "view",
      at: frozenAt,
    });
    expect(filename.endsWith("_ET.pdf")).toBe(true);
  });
});

describe("openBrandedPdfExport", () => {
  it("returns { status: 'empty' } for an empty row set", () => {
    const result = openBrandedPdfExport({
      title: "Nothing",
      surface: "blogs",
      scope: "view",
      columns,
      rows: [],
      getCell: () => "",
    });
    expect(result.status).toBe("empty");
  });

  it("returns HTML through the test seam when __renderOnly is set", () => {
    const result = openBrandedPdfExport({
      title: "Render Only",
      surface: "blogs",
      scope: "selected",
      columns,
      rows: fixtureRows,
      getCell: (row, key) => (row as unknown as Record<string, string>)[key] ?? "",
      __renderOnly: true,
    });
    expect(result.status).toBe("html");
    if (result.status === "html") {
      expect(result.html).toContain("<!doctype html>");
      expect(result.html).toContain("Render Only");
      expect(result.html).toContain("Selected");
    }
  });
});
