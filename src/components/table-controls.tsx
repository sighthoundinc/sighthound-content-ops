import {
  TABLE_ROW_LIMIT_OPTIONS,
  getTableVisibleRange,
  type TableRowLimit,
} from "@/lib/table";

export function TableRowLimitSelect({
  value,
  onChange,
}: {
  value: TableRowLimit;
  onChange: (value: TableRowLimit) => void;
}) {
  return (
    <label className="flex items-center gap-2 text-sm text-slate-600">
      <span className="font-medium text-slate-700">Rows</span>
      <select
        className="rounded-md border border-slate-300 px-2 py-1 text-sm"
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
    <p className="text-sm text-slate-600">
      Showing <span className="font-medium text-slate-900">{range.start}</span>-
      <span className="font-medium text-slate-900">{range.end}</span> of{" "}
      <span className="font-medium text-slate-900">{totalRows}</span> {noun}
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
      <button
        type="button"
        className="rounded border border-slate-300 bg-white px-2 py-1 text-sm text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
        onClick={() => {
          onPageChange(Math.max(1, currentPage - 1));
        }}
        disabled={currentPage <= 1}
      >
        Previous
      </button>
      <p className="text-sm text-slate-600">
        Page <span className="font-medium text-slate-900">{currentPage}</span> of{" "}
        <span className="font-medium text-slate-900">{pageCount}</span>
      </p>
      <button
        type="button"
        className="rounded border border-slate-300 bg-white px-2 py-1 text-sm text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
        onClick={() => {
          onPageChange(Math.min(pageCount, currentPage + 1));
        }}
        disabled={currentPage >= pageCount}
      >
        Next
      </button>
    </div>
  );
}
