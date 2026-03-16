"use client";

import * as XLSX from "xlsx";
import { useEffect, useMemo, useRef, useState } from "react";

import { Button } from "@/components/button";
import { useAuth } from "@/providers/auth-provider";

const MAX_IMPORT_ROWS = 500;

const REQUIRED_COLUMNS = {
  site: "Site",
  title: "Blog Title",
  liveUrl: "Live URL",
  writer: "Writer",
  publisher: "Publisher",
  draftDocLink: "Draft Doc Link",
  displayPublishDate: "Display Publish Date",
  actualPublishDate: "Actual Publish Date",
} as const;

type ImportRow = {
  rowNumber: number;
  site: string;
  title: string;
  liveUrl: string;
  writer: string;
  publisher: string;
  draftDocLink: string;
  displayPublishDate: string;
  actualPublishDate: string;
};

type ImportResponse = {
  created: number;
  updated: number;
  failed: number;
  failures: Array<{ rowNumber: number; message: string }>;
  failedRows?: Array<ImportRow & { error: string }>;
};

type ParseError = {
  rowNumber: number;
  message: string;
};

function normalizeHeader(value: string) {
  return value.trim().toLowerCase().replace(/[_\s]+/g, " ");
}

function toIsoDateString(value: unknown) {
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) {
      return "";
    }
    return value.toISOString().slice(0, 10);
  }
  if (typeof value === "number") {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (!parsed) {
      return "";
    }
    const month = String(parsed.m).padStart(2, "0");
    const day = String(parsed.d).padStart(2, "0");
    return `${parsed.y}-${month}-${day}`;
  }
  const text = String(value ?? "").trim();
  if (!text) {
    return "";
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    return text;
  }
  const parsedTime = Date.parse(text);
  if (Number.isNaN(parsedTime)) {
    return text;
  }
  return new Date(parsedTime).toISOString().slice(0, 10);
}

function isValidDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }
  const [year, month, day] = value.split("-").map((token) => Number.parseInt(token, 10));
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

function isValidUrl(value: string) {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function validateRows(rows: ImportRow[]) {
  const errors: ParseError[] = [];
  for (const row of rows) {
    const site = row.site.trim().toLowerCase();
    if (
      site !== "sh" &&
      site !== "red" &&
      site !== "sighthound" &&
      site !== "redactor" &&
      site !== "sighthound.com" &&
      site !== "redactor.com"
    ) {
      errors.push({ rowNumber: row.rowNumber, message: "Invalid site value" });
    }
    if (!row.title.trim()) {
      errors.push({ rowNumber: row.rowNumber, message: "Missing Blog Title" });
    }
    if (!row.liveUrl.trim()) {
      errors.push({ rowNumber: row.rowNumber, message: "Missing Live URL" });
    } else if (!isValidUrl(row.liveUrl.trim())) {
      errors.push({ rowNumber: row.rowNumber, message: "Invalid URL format" });
    }
    if (!row.writer.trim()) {
      errors.push({ rowNumber: row.rowNumber, message: "Missing Writer" });
    }
    if (!row.publisher.trim()) {
      errors.push({ rowNumber: row.rowNumber, message: "Missing Publisher" });
    }
    if (!row.displayPublishDate.trim()) {
      errors.push({ rowNumber: row.rowNumber, message: "Missing Display Publish Date" });
    } else if (!isValidDate(row.displayPublishDate.trim())) {
      errors.push({
        rowNumber: row.rowNumber,
        message: "Invalid date format for Display Publish Date",
      });
    }
    if (!row.actualPublishDate.trim()) {
      errors.push({ rowNumber: row.rowNumber, message: "Missing Actual Publish Date" });
    } else if (!isValidDate(row.actualPublishDate.trim())) {
      errors.push({
        rowNumber: row.rowNumber,
        message: "Invalid date format for Actual Publish Date",
      });
    }
    if (row.draftDocLink.trim() && !isValidUrl(row.draftDocLink.trim())) {
      errors.push({
        rowNumber: row.rowNumber,
        message: "Invalid URL format for Draft Doc Link",
      });
    }
  }
  return errors;
}

function parseRowsFromBuffer(buffer: ArrayBuffer) {
  const workbook = XLSX.read(buffer, { type: "array", cellDates: true });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    throw new Error("No worksheet found in file");
  }
  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json<Array<unknown>>(sheet, {
    header: 1,
    raw: true,
    defval: "",
  });
  if (rows.length < 2) {
    throw new Error("File is empty or missing data rows");
  }

  const headers = rows[0].map((value) => normalizeHeader(String(value ?? "")));
  const indexByHeader = new Map<string, number>();
  headers.forEach((header, index) => {
    if (header) {
      indexByHeader.set(header, index);
    }
  });

  const columnIndexes = {
    site: indexByHeader.get(normalizeHeader(REQUIRED_COLUMNS.site)),
    title: indexByHeader.get(normalizeHeader(REQUIRED_COLUMNS.title)),
    liveUrl: indexByHeader.get(normalizeHeader(REQUIRED_COLUMNS.liveUrl)),
    writer: indexByHeader.get(normalizeHeader(REQUIRED_COLUMNS.writer)),
    publisher: indexByHeader.get(normalizeHeader(REQUIRED_COLUMNS.publisher)),
    draftDocLink: indexByHeader.get(normalizeHeader(REQUIRED_COLUMNS.draftDocLink)),
    displayPublishDate: indexByHeader.get(normalizeHeader(REQUIRED_COLUMNS.displayPublishDate)),
    actualPublishDate: indexByHeader.get(normalizeHeader(REQUIRED_COLUMNS.actualPublishDate)),
  } as const;

  const missing = Object.entries(columnIndexes)
    .filter(([, index]) => index === undefined)
    .map(([key]) => REQUIRED_COLUMNS[key as keyof typeof REQUIRED_COLUMNS]);
  if (missing.length > 0) {
    throw new Error(`Missing required columns: ${missing.join(", ")}`);
  }

  const parsedRows: ImportRow[] = [];
  for (let i = 1; i < rows.length; i += 1) {
    const sourceRow = rows[i];
    const site = String(sourceRow[columnIndexes.site ?? 0] ?? "").trim();
    const title = String(sourceRow[columnIndexes.title ?? 0] ?? "").trim();
    const liveUrl = String(sourceRow[columnIndexes.liveUrl ?? 0] ?? "").trim();
    const writer = String(sourceRow[columnIndexes.writer ?? 0] ?? "").trim();
    const publisher = String(sourceRow[columnIndexes.publisher ?? 0] ?? "").trim();
    const draftDocLink = String(sourceRow[columnIndexes.draftDocLink ?? 0] ?? "").trim();
    const displayPublishDate = toIsoDateString(sourceRow[columnIndexes.displayPublishDate ?? 0]);
    const actualPublishDate = toIsoDateString(sourceRow[columnIndexes.actualPublishDate ?? 0]);

    const isEmptyRow =
      !site &&
      !title &&
      !liveUrl &&
      !writer &&
      !publisher &&
      !draftDocLink &&
      !displayPublishDate &&
      !actualPublishDate;
    if (isEmptyRow) {
      continue;
    }

    parsedRows.push({
      rowNumber: i + 1,
      site,
      title,
      liveUrl,
      writer,
      publisher,
      draftDocLink,
      displayPublishDate,
      actualPublishDate,
    });
  }

  if (parsedRows.length === 0) {
    throw new Error("No importable rows were found");
  }
  if (parsedRows.length > MAX_IMPORT_ROWS) {
    throw new Error(`File has ${parsedRows.length} rows. Maximum allowed is ${MAX_IMPORT_ROWS}.`);
  }

  return parsedRows;
}

function escapeCsvCell(value: string) {
  return `"${value.replaceAll("\"", "\"\"")}"`;
}

export function BlogImportModal({
  autoOpen = false,
  onImported,
}: {
  autoOpen?: boolean;
  onImported: (result: {
    created: number;
    updated: number;
    failed: number;
  }) => Promise<void> | void;
}) {
  const { session } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [fileName, setFileName] = useState("");
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [selectedRowNumbers, setSelectedRowNumbers] = useState<number[]>([]);
  const [parseErrors, setParseErrors] = useState<ParseError[]>([]);
  const [result, setResult] = useState<ImportResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const autoOpenedRef = useRef(false);
  const previewRows = useMemo(() => rows, [rows]);
  const rowErrorMap = useMemo(() => {
    const map = new Map<number, string[]>();
    for (const rowError of parseErrors) {
      const existing = map.get(rowError.rowNumber) ?? [];
      existing.push(rowError.message);
      map.set(rowError.rowNumber, existing);
    }
    return map;
  }, [parseErrors]);
  const selectedRowSet = useMemo(() => new Set(selectedRowNumbers), [selectedRowNumbers]);
  const selectedRows = useMemo(
    () => rows.filter((row) => selectedRowSet.has(row.rowNumber)),
    [rows, selectedRowSet]
  );
  const selectedRowsWithErrors = useMemo(
    () => selectedRows.filter((row) => rowErrorMap.has(row.rowNumber)),
    [rowErrorMap, selectedRows]
  );
  const selectedInvalidCount = selectedRowsWithErrors.length;
  const selectedValidCount = selectedRows.length - selectedInvalidCount;
  const hasSelectedValidationErrors = selectedInvalidCount > 0;
  const allSelected = rows.length > 0 && selectedRowNumbers.length === rows.length;

  useEffect(() => {
    if (!autoOpen || autoOpenedRef.current) {
      return;
    }
    autoOpenedRef.current = true;
    setIsOpen(true);
  }, [autoOpen]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [isOpen]);

  const resetState = () => {
    setIsParsing(false);
    setIsImporting(false);
    setFileName("");
    setRows([]);
    setSelectedRowNumbers([]);
    setParseErrors([]);
    setResult(null);
    setError(null);
  };

  const closeModal = () => {
    setIsOpen(false);
    resetState();
  };

  const onFileSelected = async (file: File | null) => {
    if (!file) {
      return;
    }
    setError(null);
    setResult(null);
    setRows([]);
    setParseErrors([]);
    setFileName(file.name);

    const lower = file.name.toLowerCase();
    if (!lower.endsWith(".csv") && !lower.endsWith(".xlsx")) {
      setError("Only .csv and .xlsx files are supported.");
      return;
    }

    try {
      setIsParsing(true);
      const buffer = await file.arrayBuffer();
      const parsedRows = parseRowsFromBuffer(buffer);
      setRows(parsedRows);
      setSelectedRowNumbers(parsedRows.map((row) => row.rowNumber));
      setParseErrors(validateRows(parsedRows));
    } catch (parseError) {
      setError(parseError instanceof Error ? parseError.message : "Failed to parse file");
    } finally {
      setIsParsing(false);
    }
  };

  const onImport = async () => {
    if (selectedRows.length === 0 || isImporting || hasSelectedValidationErrors) {
      return;
    }
    if (!session?.access_token) {
      setError("Missing access token");
      return;
    }
    setError(null);
    setIsImporting(true);
    try {
      const response = await fetch("/api/blogs/import", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          fileName,
          rows: selectedRows,
        }),
      });
      const payload = (await response.json()) as ImportResponse & { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "Import failed");
      }
      setResult(payload);
      await onImported({
        created: payload.created,
        updated: payload.updated,
        failed: payload.failed,
      });
    } catch (importError) {
      setError(importError instanceof Error ? importError.message : "Import failed");
    } finally {
      setIsImporting(false);
    }
  };

  const toggleRowSelection = (rowNumber: number) => {
    setSelectedRowNumbers((previous) =>
      previous.includes(rowNumber)
        ? previous.filter((value) => value !== rowNumber)
        : [...previous, rowNumber]
    );
  };

  const downloadFailedRows = () => {
    if (!result?.failedRows || result.failedRows.length === 0) {
      return;
    }
    const header = [
      "Site",
      "Blog Title",
      "Live URL",
      "Writer",
      "Publisher",
      "Draft Doc Link",
      "Display Publish Date",
      "Actual Publish Date",
      "Error",
    ];
    const csv = [
      header.map(escapeCsvCell).join(","),
      ...result.failedRows.map((row) =>
        [
          row.site,
          row.title,
          row.liveUrl,
          row.writer,
          row.publisher,
          row.draftDocLink,
          row.displayPublishDate,
          row.actualPublishDate,
          row.error,
        ]
          .map((value) => escapeCsvCell(String(value ?? "")))
          .join(",")
      ),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "blog-import-failed-rows.csv";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <Button
        type="button"
        variant="secondary"
        size="sm"
        onClick={() => {
          setIsOpen(true);
        }}
      >
        Import Blogs
      </Button>
      {isOpen ? (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
          <button
            type="button"
            className="absolute inset-0 bg-slate-900/40"
            aria-label="Close import modal"
            onClick={closeModal}
          />
          <div className="relative max-h-[90vh] w-full max-w-5xl overflow-auto rounded-xl border border-slate-200 bg-white p-4 shadow-2xl sm:p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-slate-900">Import Blogs</h2>
                <p className="text-sm text-slate-600">
                  Upload CSV/XLSX, preview first 10 rows, validate, then import.
                </p>
              </div>
              <Button type="button" variant="ghost" size="sm" onClick={closeModal}>
                Close
              </Button>
            </div>

            <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3">
              <div className="mb-3 flex flex-wrap items-center gap-2 text-xs">
                <span className="font-semibold uppercase tracking-wide text-slate-600">
                  Download Template
                </span>
                <a
                  href="/templates/blog-import-template.xlsx"
                  className="rounded border border-slate-300 bg-white px-2 py-1 font-medium text-slate-700 hover:bg-slate-100"
                >
                  XLSX (recommended)
                </a>
                <a
                  href="/templates/blog-import-template.csv"
                  className="rounded border border-slate-300 bg-white px-2 py-1 font-medium text-slate-700 hover:bg-slate-100"
                >
                  CSV
                </a>
              </div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">Step 1</p>
              <label className="mt-2 block text-sm text-slate-700">
                <span className="mb-2 block">Upload a `.csv` or `.xlsx` file</span>
                <input
                  type="file"
                  accept=".csv,.xlsx"
                  onChange={(event) => {
                    const file = event.target.files?.[0] ?? null;
                    void onFileSelected(file);
                  }}
                  className="block w-full cursor-pointer rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 file:mr-3 file:rounded file:border-0 file:bg-slate-100 file:px-2 file:py-1 file:text-sm"
                />
              </label>
              {fileName ? (
                <p className="mt-2 text-xs text-slate-600">
                  Selected file: <span className="font-medium text-slate-800">{fileName}</span>
                </p>
              ) : null}
              {isParsing ? <p className="mt-2 text-xs text-slate-600">Parsing file…</p> : null}
            </div>

            {rows.length > 0 ? (
              <div className="mt-4 space-y-4">
                <div className="rounded-lg border border-slate-200 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                    Step 2 · Preview ({rows.length} rows)
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                    <Button
                      type="button"
                      variant="secondary"
                      size="xs"
                      onClick={() => {
                        setSelectedRowNumbers(rows.map((row) => row.rowNumber));
                      }}
                      disabled={rows.length === 0 || allSelected}
                    >
                      Select all
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      size="xs"
                      onClick={() => {
                        setSelectedRowNumbers([]);
                      }}
                      disabled={selectedRowNumbers.length === 0}
                    >
                      Unselect all
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      size="xs"
                      onClick={() => {
                        setSelectedRowNumbers(
                          rows
                            .filter((row) => !rowErrorMap.has(row.rowNumber))
                            .map((row) => row.rowNumber)
                        );
                      }}
                      disabled={rows.length === 0}
                    >
                      Select valid rows
                    </Button>
                    <span className="text-slate-600">
                      Selected: <span className="font-semibold text-slate-900">{selectedRows.length}</span>
                    </span>
                  </div>
                  <div className="mt-2 overflow-x-auto">
                    <table className="min-w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-slate-200 text-slate-600">
                          <th className="w-10 px-2 py-2">Pick</th>
                          <th className="w-14 px-2 py-2">Row</th>
                          <th className="px-2 py-2">Site</th>
                          <th className="px-2 py-2">Blog Title</th>
                          <th className="px-2 py-2">Live URL</th>
                          <th className="px-2 py-2">Writer</th>
                          <th className="px-2 py-2">Publisher</th>
                          <th className="px-2 py-2">Display Publish Date</th>
                          <th className="px-2 py-2">Actual Publish Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {previewRows.map((row) => (
                          <tr
                            key={row.rowNumber}
                            className={`border-b border-slate-100 align-top ${
                              rowErrorMap.has(row.rowNumber) ? "bg-rose-50/60" : ""
                            }`}
                          >
                            <td className="px-2 py-2">
                              <input
                                type="checkbox"
                                checked={selectedRowSet.has(row.rowNumber)}
                                onChange={() => {
                                  toggleRowSelection(row.rowNumber);
                                }}
                              />
                            </td>
                            <td className="px-2 py-2 text-slate-500">{row.rowNumber}</td>
                            <td className="max-w-[90px] overflow-hidden truncate px-2 py-2" title={row.site}>
                              {row.site}
                            </td>
                            <td className="max-w-[240px] overflow-hidden truncate px-2 py-2" title={row.title}>
                              {row.title}
                            </td>
                            <td
                              className="max-w-[260px] overflow-hidden truncate px-2 py-2"
                              title={row.liveUrl}
                            >
                              {row.liveUrl}
                            </td>
                            <td className="max-w-[140px] overflow-hidden truncate px-2 py-2" title={row.writer}>
                              {row.writer}
                            </td>
                            <td
                              className="max-w-[140px] overflow-hidden truncate px-2 py-2"
                              title={row.publisher}
                            >
                              {row.publisher}
                            </td>
                            <td className="px-2 py-2">{row.displayPublishDate}</td>
                            <td className="px-2 py-2">{row.actualPublishDate}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="rounded-lg border border-slate-200 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                    Step 3 · Validation
                  </p>
                  {parseErrors.length === 0 ? (
                    <p className="mt-2 text-sm text-emerald-700">No validation errors found.</p>
                  ) : (
                    <ul className="mt-2 max-h-40 space-y-1 overflow-auto text-sm text-rose-700">
                      {parseErrors.map((validationError, index) => (
                        <li key={`${validationError.rowNumber}-${validationError.message}-${index}`}>
                          Row {validationError.rowNumber}: {validationError.message}
                        </li>
                      ))}
                    </ul>
                  )}
                  <p className="mt-2 text-xs text-slate-600">
                    Selected rows ready to import:{" "}
                    <span className="font-semibold text-slate-900">{selectedValidCount}</span>
                    {selectedInvalidCount > 0 ? (
                      <>
                        {" "}
                        · Selected rows with errors:{" "}
                        <span className="font-semibold text-rose-700">{selectedInvalidCount}</span>
                      </>
                    ) : null}
                  </p>
                </div>
              </div>
            ) : null}

            {error ? (
              <p className="mt-4 rounded border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                {error}
              </p>
            ) : null}

            {result ? (
              <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
                <p className="font-semibold text-slate-900">Import complete</p>
                <p className="mt-1">
                  Created: <span className="font-semibold">{result.created}</span> · Updated:{" "}
                  <span className="font-semibold">{result.updated}</span> · Failed:{" "}
                  <span className="font-semibold">{result.failed}</span>
                </p>
                {result.failed > 0 ? (
                  <div className="mt-2">
                    <Button type="button" variant="secondary" size="xs" onClick={downloadFailedRows}>
                      Download failed rows CSV
                    </Button>
                  </div>
                ) : null}
              </div>
            ) : null}

            <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
              <Button type="button" variant="secondary" size="sm" onClick={closeModal}>
                Cancel
              </Button>
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={onImport}
                disabled={
                  selectedRows.length === 0 ||
                  selectedValidCount === 0 ||
                  hasSelectedValidationErrors ||
                  isImporting
                }
              >
                {isImporting ? "Importing..." : `Import ${selectedValidCount} Blogs`}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
