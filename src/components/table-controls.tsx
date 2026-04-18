import {
  TABLE_ROW_LIMIT_OPTIONS,
  getTableVisibleRange,
  type TableRowLimit,
} from "@/lib/table";
import { Button } from "@/components/button";

export function TableRowLimitSelect({
  value,
  onChange,
}: {
  value: TableRowLimit;
  onChange: (value: TableRowLimit) => void;
}) {
  return (
    <label className="flex items-center gap-2 text-xs text-navy-500">
      <span className="font-medium text-navy-500">Rows per page</span>
      <select
        className="focus-field rounded-md border border-[color:var(--sh-gray-200)] px-2 py-1 text-xs font-normal text-ink"
        value={String(value)}
        onChange={(event) => {
          const nextValue =
            event.target.value === "all"
              ? "all"
              : (Number(event.target.value) as TableRowLimit);
          onChange(nextValue);
        }}
      >
        {TABLE_ROW_LIMIT_OPTIONS.map((option) => (
          <option key={String(option)} value={String(option)}>
            {option === "all" ? "All" : option}
          </option>
        ))}
      </select>
    </label>
  );
}

export function TableResultsSummary({
  totalRows,
  currentPage,
  rowLimit,
  noun,
}: {
  totalRows: number;
  currentPage: number;
  rowLimit: TableRowLimit;
  noun: string;
}) {
  const range = getTableVisibleRange(totalRows, currentPage, rowLimit);
  return (
    <p className="text-xs text-navy-500 font-normal">
      Showing <span className="font-medium text-ink">{range.start}</span>-
      <span className="font-medium text-ink">{range.end}</span> of{" "}
      <span className="font-medium text-ink">{totalRows}</span> {noun}
    </p>
  );
}

export function TablePaginationControls({
  currentPage,
  pageCount,
  onPageChange,
}: {
  currentPage: number;
  pageCount: number;
  onPageChange: (nextPage: number) => void;
}) {
  if (pageCount <= 1) {
    return null;
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        type="button"
        variant="secondary"
        size="xs"
        onClick={() => {
          onPageChange(Math.max(1, currentPage - 1));
        }}
        disabled={currentPage <= 1}
      >
        Prev
      </Button>
      <p className="text-xs text-navy-500 font-normal">
        Page <span className="font-medium text-ink">{currentPage}</span> of{" "}
        <span className="font-medium text-ink">{pageCount}</span>
      </p>
      <Button
        type="button"
        variant="secondary"
        size="xs"
        onClick={() => {
          onPageChange(Math.min(pageCount, currentPage + 1));
        }}
        disabled={currentPage >= pageCount}
      >
        Next
      </Button>
    </div>
  );
}
