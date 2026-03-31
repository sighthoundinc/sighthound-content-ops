"use client";

import * as XLSX from "xlsx";
import { useEffect, useMemo, useRef, useState } from "react";

import { Button } from "@/components/button";
import {
  NameResolutionModal,
  type NameResolutionState,
} from "@/components/name-resolution-modal";
import type { NameResolutionResult } from "@/lib/user-matching";
import {
  TABLE_BASE_CLASS,
  TABLE_BODY_CLASS,
  TABLE_HEAD_CLASS,
  TABLE_TEXT_TRUNCATE_CLASS,
} from "@/lib/table";
import { AppIcon } from "@/lib/icons";
import {
  getApiErrorMessage,
  isApiFailure,
  parseApiResponseJson,
} from "@/lib/api-response";
import { useAuth } from "@/providers/auth-provider";

const REQUIRED_COLUMNS_SET = new Set([
  "site",
  "title",
  "liveUrl",
  "writer",
  "publisher",
  "displayPublishDate",
]);

const OPTIONAL_COLUMNS_SET = new Set(["draftDocLink", "actualPublishDate"]);

const ALL_COLUMNS = {
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
function normalizeSiteForFallback(value: string) {
  const normalized = value.trim().toLowerCase();
  if (
    normalized === "sh" ||
    normalized === "sighthound" ||
    normalized === "sighthound.com"
  ) {
    return "sighthound.com" as const;
  }
  if (normalized === "red" || normalized === "redactor" || normalized === "redactor.com") {
    return "redactor.com" as const;
  }
  return null;
}

function applyRowFallbacks(row: ImportRow, selectedColumns: Set<string>): ImportRow {
  const next = { ...row };
  const normalizedSite = normalizeSiteForFallback(next.site);

  if (!next.liveUrl.trim() && normalizedSite === "sighthound.com") {
    next.liveUrl = "https://www.sighthound.com/blog/";
  } else if (!next.liveUrl.trim() && normalizedSite === "redactor.com") {
    next.liveUrl = "https://www.redactor.com/blog/";
  }

  if (selectedColumns.has("draftDocLink") && !next.draftDocLink.trim()) {
    next.draftDocLink = "https://docs.google.com/";
  }

  if (
    selectedColumns.has("actualPublishDate") &&
    !next.actualPublishDate.trim() &&
    next.displayPublishDate.trim()
  ) {
    next.actualPublishDate = next.displayPublishDate.trim();
  }

  return next;
}

function applyFallbacksToRows(rows: ImportRow[], selectedColumns: Set<string>) {
  return rows.map((row) => applyRowFallbacks(row, selectedColumns));
}

function normalizeHeader(value: string) {
  return value.trim().toLowerCase().replace(/[_\s]+/g, " ");
}

function toIsoDateString(value: unknown) {
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) {
      return "";
    }
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, "0");
    const day = String(value.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
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
  const dmyMatch = text.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (dmyMatch) {
    const [, day, month, year] = dmyMatch;
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }
  // Parse all dates as Eastern Time (US) to ensure consistency
  // regardless of where the import is run from.
  // This treats the input date string as if it were entered in ET/EDT.
  
  // Try parsing as YYYY-MM-DD (with optional slashes)
  const isoMatch = text.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
  if (isoMatch) {
    const [, year, monthStr, dayStr] = isoMatch;
    const month = String(monthStr).padStart(2, "0");
    const day = String(dayStr).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }
  // Try parsing as MM/DD/YYYY or M/D/YYYY (common US format)
  const usMatch = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (usMatch) {
    const [, monthStr, dayStr, year] = usMatch;
    const month = String(monthStr).padStart(2, "0");
    const day = String(dayStr).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }
  // Fallback: use Date.parse with Eastern Time offset
  // This is a last resort for non-standard date formats
  const parsedTime = Date.parse(text);
  if (Number.isNaN(parsedTime)) {
    return text;
  }
  // Convert to Eastern Time by creating a date object
  // and using toLocaleString to read it as if in Eastern timezone
  const date = new Date(parsedTime);
  // Use en-US locale with Eastern timezone to extract date components
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const parts = formatter.formatToParts(date);
  const yearPart = parts.find(p => p.type === 'year')?.value;
  const monthPart = parts.find(p => p.type === 'month')?.value;
  const dayPart = parts.find(p => p.type === 'day')?.value;
  if (yearPart && monthPart && dayPart) {
    return `${yearPart}-${monthPart}-${dayPart}`;
  }
  return text;
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

function validateRows(rows: ImportRow[], selectedColumns: Set<string>) {
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
    if (selectedColumns.has("actualPublishDate")) {
      if (row.actualPublishDate.trim() && !isValidDate(row.actualPublishDate.trim())) {
        errors.push({
          rowNumber: row.rowNumber,
          message: "Invalid date format for Actual Publish Date",
        });
      }
    }
    if (selectedColumns.has("draftDocLink")) {
      if (row.draftDocLink.trim() && !isValidUrl(row.draftDocLink.trim())) {
        errors.push({
          rowNumber: row.rowNumber,
          message: "Invalid URL format for Draft Doc Link",
        });
      }
    }
  }
  return errors;
}

type ParseResult = {
  rows: ImportRow[];
  detectedColumns: Map<string, string>;
};

function parseRowsFromBuffer(buffer: ArrayBuffer): ParseResult {
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
  const detectedColumns = new Map<string, string>();
  headers.forEach((header, index) => {
    if (header) {
      indexByHeader.set(header, index);
    }
  });

  const columnIndexes = {
    site: indexByHeader.get(normalizeHeader(ALL_COLUMNS.site)),
    title: indexByHeader.get(normalizeHeader(ALL_COLUMNS.title)),
    liveUrl: indexByHeader.get(normalizeHeader(ALL_COLUMNS.liveUrl)),
    writer: indexByHeader.get(normalizeHeader(ALL_COLUMNS.writer)),
    publisher: indexByHeader.get(normalizeHeader(ALL_COLUMNS.publisher)),
    draftDocLink: indexByHeader.get(normalizeHeader(ALL_COLUMNS.draftDocLink)),
    displayPublishDate: indexByHeader.get(normalizeHeader(ALL_COLUMNS.displayPublishDate)),
    actualPublishDate: indexByHeader.get(normalizeHeader(ALL_COLUMNS.actualPublishDate)),
  } as const;

  const missingRequired = Object.entries(columnIndexes)
    .filter(([key, index]) => REQUIRED_COLUMNS_SET.has(key) && index === undefined)
    .map(([key]) => ALL_COLUMNS[key as keyof typeof ALL_COLUMNS]);
  if (missingRequired.length > 0) {
    throw new Error(`Missing required columns: ${missingRequired.join(", ")}`);
  }

  Object.entries(columnIndexes).forEach(([key, index]) => {
    if (index !== undefined) {
      detectedColumns.set(key, ALL_COLUMNS[key as keyof typeof ALL_COLUMNS]);
    }
  });

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
  return { rows: parsedRows, detectedColumns };
}

function escapeCsvCell(value: string) {
  return `"${value.replaceAll("\"", "\"\"")}"`;
}

export function BlogImportModal({
  autoOpen = false,
  triggerLabel = "Import Blogs",
  triggerVariant = "secondary",
  triggerSize = "sm",
  triggerClassName,
  onImported,
}: {
  autoOpen?: boolean;
  triggerLabel?: string;
  triggerVariant?: "primary" | "secondary" | "destructive" | "ghost" | "icon";
  triggerSize?: "xs" | "sm" | "md" | "icon";
  triggerClassName?: string;
  onImported: (result: {
    created: number;
    updated: number;
    failed: number;
  }) => Promise<void> | void;
}) {
  const { session, loading } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [fileName, setFileName] = useState("");
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [selectedRowNumbers, setSelectedRowNumbers] = useState<number[]>([]);
  const [parseErrors, setParseErrors] = useState<ParseError[]>([]);
  const [result, setResult] = useState<ImportResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [detectedColumns, setDetectedColumns] = useState<Map<string, string>>(new Map());
  const [selectedColumns, setSelectedColumns] = useState<Set<string>>(new Set([...REQUIRED_COLUMNS_SET]));
  const [isResolvingNames, setIsResolvingNames] = useState(false);
  const [showNameResolutionModal, setShowNameResolutionModal] = useState(false);
  const [nameResolutions, setNameResolutions] = useState<NameResolutionResult[]>([]);
  const [selectedNameResolutions, setSelectedNameResolutions] = useState<NameResolutionState>({});
  const [isNameResolutionAccepted, setIsNameResolutionAccepted] = useState(false);
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
  const uniqueSelectedNames = useMemo(
    () =>
      Array.from(
        new Set(
          selectedRows
            .flatMap((row) => [row.writer.trim(), row.publisher.trim()])
            .filter(Boolean)
        )
      ),
    [selectedRows]
  );
  const isNameResolutionComplete = useMemo(
    () =>
      uniqueSelectedNames.length > 0 &&
      uniqueSelectedNames.every((name) => Boolean(selectedNameResolutions[name])),
    [uniqueSelectedNames, selectedNameResolutions]
  );
  const selectedRowsWithErrors = useMemo(
    () => selectedRows.filter((row) => rowErrorMap.has(row.rowNumber)),
    [rowErrorMap, selectedRows]
  );
  const selectedValidationErrors = useMemo(
    () => parseErrors.filter((rowError) => selectedRowSet.has(rowError.rowNumber)),
    [parseErrors, selectedRowSet]
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

  // Auto-trigger name resolution after rows are available (silent Step 1.75)
  useEffect(() => {
    if (
      rows.length > 0 &&
      selectedRows.length > 0 &&
      !isResolvingNames &&
      nameResolutions.length === 0 &&
      Object.keys(selectedNameResolutions).length === 0 &&
      session?.access_token
    ) {
      const autoResolve = async () => {
        if (selectedRows.length === 0 || !session?.access_token) return;
        setIsResolvingNames(true);
        try {
          // Only resolve names from valid rows (no validation errors)
          const validRows = selectedRows.filter((row) => !rowErrorMap.has(row.rowNumber));
          const uniqueNames = Array.from(
            new Set(
              validRows.flatMap((row) => [row.writer.trim(), row.publisher.trim()]).filter(Boolean)
            )
          );
          
          // Skip if no valid rows have names to resolve
          if (uniqueNames.length === 0) {
            setIsResolvingNames(false);
            return;
          }
          const response = await fetch("/api/users/resolve-names", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              authorization: `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({ names: uniqueNames }),
          });
          const payload = await parseApiResponseJson<{
            resolutions?: NameResolutionResult[];
          }>(response);
          if (isApiFailure(response, payload)) {
            throw new Error(getApiErrorMessage(payload, "Failed to resolve names"));
          }
          setNameResolutions(payload.resolutions ?? []);
          const autoResolved: NameResolutionState = {};
          for (const resolution of payload.resolutions ?? []) {
            if (resolution.bestMatch) {
              autoResolved[resolution.inputName] = {
                action: "use_existing",
                selectedUserId: resolution.bestMatch.id,
              };
            } else {
              autoResolved[resolution.inputName] = { action: "create_new" };
            }
          }
          setSelectedNameResolutions(autoResolved);
        } catch (err) {
          console.error("Auto-resolution failed:", err);
        } finally {
          setIsResolvingNames(false);
        }
      };
      void autoResolve();
    }
  }, [rows.length, selectedRows, isResolvingNames, nameResolutions.length, selectedNameResolutions, session?.access_token, rowErrorMap]);

  const resetState = () => {
    setIsParsing(false);
    setIsImporting(false);
    setFileName("");
    setRows([]);
    setSelectedRowNumbers([]);
    setParseErrors([]);
    setResult(null);
    if (!isNameResolutionAccepted || !isNameResolutionComplete) {
      setError("Please review and accept automatic name resolution before importing.");
      setShowNameResolutionModal(true);
      return;
    }
    setError(null);
    setDetectedColumns(new Map());
    setSelectedColumns(new Set([...REQUIRED_COLUMNS_SET]));
    setIsResolvingNames(false);
    setShowNameResolutionModal(false);
    setNameResolutions([]);
    setSelectedNameResolutions({});
    setIsNameResolutionAccepted(false);
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
    setDetectedColumns(new Map());
    setSelectedColumns(new Set([...REQUIRED_COLUMNS_SET]));
    setNameResolutions([]);
    setSelectedNameResolutions({});
    setIsNameResolutionAccepted(false);

    const lower = file.name.toLowerCase();
    if (!lower.endsWith(".csv") && !lower.endsWith(".xlsx")) {
      setError("Only .csv and .xlsx files are supported.");
      return;
    }

    try {
      setIsParsing(true);
      const buffer = await file.arrayBuffer();
      const parseResult = parseRowsFromBuffer(buffer);
      const nextSelectedColumns = new Set([...REQUIRED_COLUMNS_SET]);
      for (const key of OPTIONAL_COLUMNS_SET) {
        if (parseResult.detectedColumns.has(key)) {
          nextSelectedColumns.add(key);
        }
      }
      setRows(parseResult.rows);
      setSelectedRowNumbers(parseResult.rows.map((row) => row.rowNumber));
      setDetectedColumns(parseResult.detectedColumns);
      setSelectedColumns(nextSelectedColumns);
      setParseErrors(
        validateRows(applyFallbacksToRows(parseResult.rows, nextSelectedColumns), nextSelectedColumns)
      );
    } catch (parseError) {
      console.error("File parse failed:", parseError);
      setError("Failed to parse file. Please check the format and try again.");
    } finally {
      setIsParsing(false);
    }
  };

  const onImport = async () => {
    if (selectedRows.length === 0 || isImporting || hasSelectedValidationErrors) {
      return;
    }
    if (!session?.access_token) {
      setError("Authentication required. Please ensure you are logged in.");
      return;
    }
    setError(null);
    setIsImporting(true);
    try {
      const normalizedNameResolutions = Object.fromEntries(
        Object.entries(selectedNameResolutions).map(([name, resolution]) => [
          name,
          {
            action: resolution.action,
            userId: resolution.selectedUserId,
            selectedUserId: resolution.selectedUserId,
          },
        ])
      );
      const rowsToImport = selectedRows.map((row) => {
        const rowWithFallbacks = applyRowFallbacks(row, selectedColumns);
        return {
          ...rowWithFallbacks,
          actualPublishDate: selectedColumns.has("actualPublishDate")
            ? rowWithFallbacks.actualPublishDate
            : "",
          draftDocLink: selectedColumns.has("draftDocLink")
            ? rowWithFallbacks.draftDocLink
            : "",
        };
      });
      const response = await fetch("/api/blogs/import", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          fileName,
          rows: rowsToImport,
          selectedColumns: Array.from(selectedColumns),
          nameResolutions: normalizedNameResolutions,
        }),
      });
      const payload = await parseApiResponseJson<ImportResponse>(response);
      if (isApiFailure(response, payload)) {
        throw new Error(getApiErrorMessage(payload, "Import failed"));
      }
      setResult(payload);
      await onImported({
        created: payload.created,
        updated: payload.updated,
        failed: payload.failed,
      });
    } catch (importError) {
      console.error("Blog import failed:", importError);
      setError("Import failed. Please try again.");
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

  const triggerNameResolution = async () => {
    if (selectedRows.length === 0 || !session?.access_token) {
      return;
    }
    setIsResolvingNames(true);
    setIsNameResolutionAccepted(false);
    try {
      const uniqueNames = Array.from(
        new Set(
          selectedRows.flatMap((row) => [row.writer.trim(), row.publisher.trim()]).filter(Boolean)
        )
      );
      const response = await fetch("/api/users/resolve-names", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ names: uniqueNames }),
      });
      const payload = await parseApiResponseJson<{
        resolutions?: NameResolutionResult[];
      }>(response);
      if (isApiFailure(response, payload)) {
        throw new Error(getApiErrorMessage(payload, "Failed to resolve names"));
      }
      setNameResolutions(payload.resolutions ?? []);
      const autoResolved: NameResolutionState = {};
      for (const resolution of payload.resolutions ?? []) {
        if (resolution.bestMatch) {
          autoResolved[resolution.inputName] = {
            action: "use_existing",
            selectedUserId: resolution.bestMatch.id,
          };
        } else {
          autoResolved[resolution.inputName] = { action: "create_new" };
        }
      }
      setSelectedNameResolutions(autoResolved);
      setShowNameResolutionModal(true);
    } catch (err) {
      console.error("Name resolution failed:", err);
      setError("Failed to resolve names. Please try again.");
    } finally {
      setIsResolvingNames(false);
    }
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
        variant={triggerVariant}
        size={triggerSize}
        className={triggerClassName}
        onClick={() => {
          setIsOpen(true);
        }}
      >
        {triggerLabel}
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
                <p className="text-sm text-slate-600">Upload file → review rows → import.</p>
              </div>
              <Button type="button" variant="ghost" size="sm" onClick={closeModal}>
                <AppIcon name="close" boxClassName="h-4 w-4" size={13} />
              </Button>
            </div>

            <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3">
              <div className="mb-3 flex flex-wrap items-center gap-2 text-xs">
                <span className="text-slate-500">Need a template?</span>
                <a
                  href="/templates/blog-import-template.xlsx"
                  className="rounded border border-slate-300 bg-white px-2 py-1 font-medium text-blue-700 hover:bg-slate-100"
                >
                  XLSX
                </a>
                <a
                  href="/templates/blog-import-template.csv"
                  className="rounded border border-slate-300 bg-white px-2 py-1 font-medium text-blue-700 hover:bg-slate-100"
                >
                  CSV
                </a>
              </div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                Step 1 · Upload file
              </p>
              <label className="mt-2 block text-sm text-slate-700">
                <span className="mb-2 block">Choose a `.csv` or `.xlsx` file</span>
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
                  <span className="font-medium text-slate-800">{fileName}</span> selected
                </p>
              ) : null}
              {isParsing ? <p className="mt-2 text-xs text-slate-600">Parsing file…</p> : null}
            </div>

            {rows.length > 0 && detectedColumns.size > 0 ? (
              <div className="mt-4 rounded-lg border border-slate-200 p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                  Step 1.5 · Select Columns
                </p>
                <p className="mt-2 text-sm text-slate-700">
                  Required columns are locked. Optional columns can be included or skipped.
                </p>
                <div className="mt-3 space-y-2">
                  {Array.from(REQUIRED_COLUMNS_SET).map((key) => (
                    <label
                      key={key}
                      className="flex items-center gap-2 rounded px-2 py-2 text-sm text-slate-700 bg-slate-50"
                    >
                      <input
                        type="checkbox"
                        checked={true}
                        disabled={true}
                        className="cursor-not-allowed"
                      />
                      <span>
                        <strong>{ALL_COLUMNS[key as keyof typeof ALL_COLUMNS]}</strong> (required)
                      </span>
                    </label>
                  ))}
                  {Array.from(OPTIONAL_COLUMNS_SET).map((key) => {
                    const isDetected = detectedColumns.has(key);
                    return (
                      <label
                        key={key}
                        className={`flex items-center gap-2 rounded px-2 py-2 text-sm ${
                          isDetected
                            ? "text-slate-700 hover:bg-slate-50"
                            : "text-slate-500 bg-slate-50 cursor-not-allowed"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={selectedColumns.has(key)}
                          disabled={!isDetected}
                          onChange={() => {
                            const next = new Set(selectedColumns);
                            if (next.has(key)) {
                              next.delete(key);
                            } else {
                              next.add(key);
                            }
                            setSelectedColumns(next);
                            setParseErrors(validateRows(applyFallbacksToRows(rows, next), next));
                          }}
                          className={isDetected ? "cursor-pointer" : "cursor-not-allowed"}
                        />
                        <span>
                          {ALL_COLUMNS[key as keyof typeof ALL_COLUMNS]}
                          {!isDetected ? " (not found in file)" : " (optional)"}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
            ) : null}

            {rows.length > 0 && selectedRows.length > 0 ? (
              <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                  Step 1.75 · Name Resolution (Automatic)
                </p>
                <p className="mt-1 text-slate-700">
                  {isResolvingNames
                    ? "Resolving writer/publisher names in the background..."
                    : isNameResolutionAccepted
                      ? "Resolved and accepted. You can continue."
                      : "Auto-resolved. Please review and accept before importing."}
                </p>
                <div className="mt-2">
                  <Button
                    type="button"
                    variant="secondary"
                    size="xs"
                    onClick={triggerNameResolution}
                    disabled={isResolvingNames || selectedRows.length === 0}
                  >
                    Re-run Resolution
                  </Button>
                  <Button
                    type="button"
                    variant="primary"
                    size="xs"
                    className="ml-2"
                    onClick={() => setShowNameResolutionModal(true)}
                    disabled={isResolvingNames || nameResolutions.length === 0}
                  >
                    Review Resolutions
                  </Button>
                </div>
              </div>
            ) : null}

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
                      All
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
                      None
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
                      Valid only
                    </Button>
                    <span className="text-slate-600">
                      Selected <span className="font-semibold text-slate-900">{selectedRows.length}</span>
                    </span>
                  </div>
                  <div className="mt-2 overflow-auto rounded-md border border-slate-200">
                    <table className={`${TABLE_BASE_CLASS} text-left text-xs`}>
                      <thead className={`${TABLE_HEAD_CLASS} text-[11px]`}>
                        <tr>
                          <th className="h-10 w-10 px-2 py-2 font-medium whitespace-nowrap">Pick</th>
                          <th className="h-10 w-14 px-2 py-2 font-medium whitespace-nowrap">Row</th>
                          <th className="h-10 px-2 py-2 font-medium whitespace-nowrap">Site</th>
                          <th className="h-10 px-2 py-2 font-medium whitespace-nowrap">Blog Title</th>
                          <th className="h-10 px-2 py-2 font-medium whitespace-nowrap">Live URL</th>
                          <th className="h-10 px-2 py-2 font-medium whitespace-nowrap">Writer</th>
                          <th className="h-10 px-2 py-2 font-medium whitespace-nowrap">Publisher</th>
                          <th className="h-10 px-2 py-2 font-medium whitespace-nowrap">Display Publish Date</th>
                          <th className="h-10 px-2 py-2 font-medium whitespace-nowrap">Actual Publish Date</th>
                        </tr>
                      </thead>
                      <tbody className={TABLE_BODY_CLASS}>
                        {previewRows.map((row) => (
                          <tr
                            key={row.rowNumber}
                            className={`${
                              rowErrorMap.has(row.rowNumber) ? "bg-rose-50/60" : ""
                            }`}
                          >
                            <td className="h-10 px-2 py-2 align-middle">
                              <input
                                type="checkbox"
                                checked={selectedRowSet.has(row.rowNumber)}
                                onChange={() => {
                                  toggleRowSelection(row.rowNumber);
                                }}
                              />
                            </td>
                            <td className="h-10 px-2 py-2 align-middle text-slate-500">
                              {row.rowNumber}
                            </td>
                            <td className="h-10 max-w-[90px] px-2 py-2 align-middle overflow-hidden">
                              <span className={TABLE_TEXT_TRUNCATE_CLASS} title={row.site}>
                                {row.site}
                              </span>
                            </td>
                            <td className="h-10 max-w-[240px] px-2 py-2 align-middle overflow-hidden">
                              <span className={TABLE_TEXT_TRUNCATE_CLASS} title={row.title}>
                                {row.title}
                              </span>
                            </td>
                            <td className="h-10 max-w-[260px] px-2 py-2 align-middle overflow-hidden">
                              <span className={TABLE_TEXT_TRUNCATE_CLASS} title={row.liveUrl}>
                                {row.liveUrl}
                              </span>
                            </td>
                            <td className="h-10 max-w-[140px] px-2 py-2 align-middle overflow-hidden">
                              <span className={TABLE_TEXT_TRUNCATE_CLASS} title={row.writer}>
                                {row.writer}
                              </span>
                            </td>
                            <td className="h-10 max-w-[140px] px-2 py-2 align-middle overflow-hidden">
                              <span className={TABLE_TEXT_TRUNCATE_CLASS} title={row.publisher}>
                                {row.publisher}
                              </span>
                            </td>
                            <td className="h-10 px-2 py-2 align-middle">{row.displayPublishDate}</td>
                            <td className="h-10 px-2 py-2 align-middle">{row.actualPublishDate}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="rounded-lg border border-slate-200 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                    Step 3 · Review
                  </p>
                  {selectedValidationErrors.length === 0 ? (
                    <p className="mt-2 inline-flex items-center gap-1 text-sm text-emerald-700">
                      <AppIcon name="success" boxClassName="h-4 w-4" size={13} />
                      All selected rows look good.
                    </p>
                  ) : (
                    <div className="mt-2">
                      <p className="mb-1 inline-flex items-center gap-1 text-sm font-semibold text-rose-700">
                        <AppIcon name="warning" boxClassName="h-4 w-4" size={13} />
                        {selectedInvalidCount} row(s) with errors:
                      </p>
                      <ul className="max-h-32 space-y-1 overflow-auto text-xs text-rose-700">
                        {selectedValidationErrors.slice(0, 5).map((validationError, index) => (
                          <li key={`${validationError.rowNumber}-${validationError.message}-${index}`}>
                            Row {validationError.rowNumber}: {validationError.message}
                          </li>
                        ))}
                        {selectedValidationErrors.length > 5 ? (
                          <li className="text-slate-600">... and {selectedValidationErrors.length - 5} more</li>
                        ) : null}
                      </ul>
                    </div>
                  )}
                  <p className="mt-3 text-xs text-slate-600">
                    <strong>{selectedValidCount} blog(s)</strong> ready to import{selectedInvalidCount > 0 ? ` (${selectedInvalidCount} with errors)` : ''}
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
              <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
                {result.failed === 0 ? (
                  <div>
                    <p className="inline-flex items-center gap-1 font-semibold text-emerald-700">
                      <AppIcon name="success" boxClassName="h-4 w-4" size={13} />
                      All {result.created + result.updated} blog(s) imported successfully!
                    </p>
                    {result.created > 0 && <p className="mt-1 text-xs text-slate-600">Created: {result.created}</p>}
                    {result.updated > 0 && <p className="text-xs text-slate-600">Updated: {result.updated}</p>}
                  </div>
                ) : (
                  <div>
                    <p className="text-slate-900 font-semibold">Import summary</p>
                    <div className="mt-2 space-y-1 text-sm">
                      {result.created > 0 && (
                        <div className="inline-flex items-center gap-1 text-emerald-700">
                          <AppIcon name="success" boxClassName="h-4 w-4" size={13} />
                          Created {result.created}
                        </div>
                      )}
                      {result.updated > 0 && (
                        <div className="inline-flex items-center gap-1 text-blue-700">
                          <AppIcon name="info" boxClassName="h-4 w-4" size={13} />
                          Updated {result.updated}
                        </div>
                      )}
                      {result.failed > 0 && (
                        <div className="inline-flex items-center gap-1 font-semibold text-rose-700">
                          <AppIcon name="error" boxClassName="h-4 w-4" size={13} />
                          Failed {result.failed}
                        </div>
                      )}
                    </div>
                    {result.failed > 0 ? (
                      <div className="mt-3 space-y-2">
                        <div>
                          <p className="text-xs font-semibold text-slate-600 mb-2">Error details (first 10):</p>
                          <ul className="max-h-40 space-y-1 overflow-auto rounded bg-white p-2 text-xs border border-slate-300">
                            {result.failures?.slice(0, 10).map((failure, idx) => (
                              <li key={idx} className="text-rose-700">
                                Row {failure.rowNumber}: {failure.message}
                              </li>
                            ))}
                          </ul>
                        </div>
                        <Button type="button" variant="secondary" size="xs" onClick={downloadFailedRows}>
                          Download failed rows
                        </Button>
                      </div>
                    ) : null}
                  </div>
                )}
              </div>
            ) : null}

            <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
              {result ? (
                <>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      resetState();
                    }}
                  >
                    Import another file
                  </Button>
                  <Button type="button" variant="primary" size="sm" onClick={closeModal}>
                    Close & go to all blogs
                  </Button>
                </>
              ) : (
                <>
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
                      !isNameResolutionAccepted ||
                      !isNameResolutionComplete ||
                      isResolvingNames ||
                      isImporting ||
                      loading ||
                      !session
                    }
                  >
                    {isImporting ? "Importing..." : `Import ${selectedValidCount} Blogs`}
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      ) : null}
      <NameResolutionModal
        isOpen={showNameResolutionModal}
        isLoading={isResolvingNames}
        resolutions={nameResolutions}
        selectedResolutions={selectedNameResolutions}
        onResolutionsChange={setSelectedNameResolutions}
        onConfirm={() => {
          setIsNameResolutionAccepted(true);
          setShowNameResolutionModal(false);
        }}
        onClose={() => {
          if (!isNameResolutionAccepted) {
            setError("Name resolution is required before importing.");
          }
          setShowNameResolutionModal(false);
        }}
      />
    </>
  );
}
