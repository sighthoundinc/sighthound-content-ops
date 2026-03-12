export const TABLE_ROW_LIMIT_OPTIONS = [10, 20, 50, "all"] as const;

export type TableRowLimit = (typeof TABLE_ROW_LIMIT_OPTIONS)[number];
export type SortDirection = "asc" | "desc";

export const DEFAULT_TABLE_ROW_LIMIT: TableRowLimit = 10;

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
