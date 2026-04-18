export const TABLE_ROW_LIMIT_OPTIONS = [10, 20, 50, "all"] as const;

export type TableRowLimit = (typeof TABLE_ROW_LIMIT_OPTIONS)[number];
export type SortDirection = "asc" | "desc";
export type TableDensity = "compact" | "comfortable";

export const DEFAULT_TABLE_ROW_LIMIT: TableRowLimit = 10;
export const TABLE_CONTAINER_CLASS = "overflow-auto rounded-lg border border-[color:var(--sh-gray-200)]";
export const TABLE_BASE_CLASS = "min-w-full divide-y divide-[color:var(--sh-gray-200)]";
export const TABLE_HEAD_CLASS =
  "bg-blurple-50 text-left text-xs font-semibold tracking-wide text-navy-500";
export const TABLE_STICKY_HEAD_CLASS =
  "sticky top-0 z-10 bg-blurple-50 text-left text-xs font-semibold tracking-wide text-navy-500";
export const TABLE_BODY_CLASS = "divide-y divide-[color:var(--sh-gray)]";
export const TABLE_HEADER_CELL_CLASS =
  "px-6 py-3 font-semibold text-navy-500 whitespace-nowrap relative text-xs tracking-wide leading-4";
export const TABLE_STICKY_HEADER_CELL_CLASS =
  "sticky top-0 z-10 bg-blurple-50 shadow-[inset_0_-1px_0_0_rgb(226_232_240)]";
export const TABLE_TEXT_TRUNCATE_CLASS = "block truncate";
export const TABLE_NUMERIC_CELL_CLASS = "tabular-nums";

export function getTableBodyCellClass(density: TableDensity) {
  return density === "compact"
    ? "px-6 py-2 h-10 align-middle text-ink text-sm font-normal leading-4 overflow-hidden whitespace-nowrap text-ellipsis"
    : "px-6 py-3 h-12 align-middle text-ink text-sm font-normal leading-5 overflow-hidden whitespace-nowrap text-ellipsis";
}

export function getTablePageCount(totalRows: number, rowLimit: TableRowLimit) {
  if (totalRows === 0 || rowLimit === "all") {
    return 1;
  }
  return Math.max(1, Math.ceil(totalRows / rowLimit));
}

export function getTablePageRows<T>(
  rows: T[],
  currentPage: number,
  rowLimit: TableRowLimit
) {
  if (rowLimit === "all") {
    return rows;
  }
  const startIndex = (currentPage - 1) * rowLimit;
  return rows.slice(startIndex, startIndex + rowLimit);
}

export function getTableVisibleRange(
  totalRows: number,
  currentPage: number,
  rowLimit: TableRowLimit
) {
  if (totalRows === 0) {
    return { start: 0, end: 0 };
  }
  if (rowLimit === "all") {
    return { start: 1, end: totalRows };
  }
  const start = (currentPage - 1) * rowLimit + 1;
  const end = Math.min(totalRows, currentPage * rowLimit);
  return { start, end };
}
