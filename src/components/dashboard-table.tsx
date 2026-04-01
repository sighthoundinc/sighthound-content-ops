"use client";

import { formatDateOnly } from "@/lib/utils";
import { formatDateInTimezone } from "@/lib/format-date";
import { cn } from "@/lib/utils";
import {
  getTableBodyCellClass,
  TABLE_BASE_CLASS,
  TABLE_BODY_CLASS,
  TABLE_CONTAINER_CLASS,
  TABLE_HEAD_CLASS,
  TABLE_HEADER_CELL_CLASS,
  TABLE_STICKY_HEADER_CELL_CLASS,
  type SortDirection,
} from "@/lib/table";

export type DashboardTableColumnKey =
  | "content_type"
  | "site"
  | "id"
  | "title"
  | "status_display"
  | "lifecycle_bucket"
  | "scheduled_date"
  | "published_date"
  | "owner_display"
  | "updated_at"
  | "product";

export const DASHBOARD_COLUMN_LABELS: Record<DashboardTableColumnKey, string> = {
  content_type: "Type",
  site: "Site",
  id: "ID",
  title: "Title",
  status_display: "Status",
  lifecycle_bucket: "Lifecycle",
  scheduled_date: "Scheduled",
  published_date: "Published",
  owner_display: "Assigned to",
  updated_at: "Updated",
  product: "Product",
};

const CENTER_ALIGNED_COLUMNS: DashboardTableColumnKey[] = [
  "content_type",
  "status_display",
  "lifecycle_bucket",
];

export interface DashboardTableRow {
  content_type: "blog" | "social_post";
  site: string;
  id: string;
  title: string;
  status_display: string;
  lifecycle_bucket:
    | "open_work"
    | "awaiting_review"
    | "ready_to_publish"
    | "awaiting_live_link"
    | "published";
  scheduled_date: string | null;
  published_date: string | null;
  owner_display: string;
  updated_at: string;
  product?: string | null;
}

export interface DashboardTableProps {
  rows: DashboardTableRow[];
  visibleColumns: DashboardTableColumnKey[];
  activeRowId: string | null;
  selectedRowKeys: Set<string>;
  rowDensity: "compact" | "comfortable";
  canSelectRows: boolean;
  sortField: DashboardTableColumnKey;
  sortDirection: SortDirection;
  timezone?: string | null;
  onRowClick: (row: DashboardTableRow) => void;
  onSortChange: (column: DashboardTableColumnKey) => void;
  onToggleAll: (checked: boolean) => void;
  onToggleSingle: (row: DashboardTableRow, checked: boolean) => void;
}

export function DashboardTable({
  rows,
  visibleColumns,
  activeRowId,
  selectedRowKeys,
  rowDensity,
  canSelectRows,
  sortField,
  sortDirection,
  timezone,
  onRowClick,
  onSortChange,
  onToggleAll,
  onToggleSingle,
}: DashboardTableProps) {
  const bodyCellClass = getTableBodyCellClass(rowDensity);
  const getRowKey = (row: DashboardTableRow) => `${row.content_type}:${row.id}`;
  const allSelected =
    rows.length > 0 && rows.every((row) => selectedRowKeys.has(getRowKey(row)));
  const someSelected =
    rows.some((row) => selectedRowKeys.has(getRowKey(row))) && !allSelected;

  const getColumnSortIndicator = (column: DashboardTableColumnKey) => {
    if (sortField !== column) {
      return "↕";
    }
    return sortDirection === "asc" ? "↑" : "↓";
  };
  const getColumnAriaSort = (column: DashboardTableColumnKey) => {
    if (sortField !== column) {
      return "none";
    }
    return sortDirection === "asc" ? "ascending" : "descending";
  };

  return (
    <div className={TABLE_CONTAINER_CLASS}>
      <table className={TABLE_BASE_CLASS}>
        <thead className={TABLE_HEAD_CLASS}>
          <tr>
            {canSelectRows && (
              <th
                className={cn(
                  TABLE_HEADER_CELL_CLASS,
                  TABLE_STICKY_HEADER_CELL_CLASS
                )}
              >
                <input
                  type="checkbox"
                  checked={allSelected}
                  ref={(input) => {
                    if (input) {
                      input.indeterminate = someSelected;
                    }
                  }}
                  onChange={(event) => {
                    onToggleAll(event.target.checked);
                  }}
                  aria-label="Select all visible rows"
                />
              </th>
            )}
            {visibleColumns.map((column) => (
              <th
                key={column}
                aria-sort={getColumnAriaSort(column)}
                className={cn(
                  TABLE_HEADER_CELL_CLASS,
                  TABLE_STICKY_HEADER_CELL_CLASS,
                  CENTER_ALIGNED_COLUMNS.includes(column) ? "text-center" : ""
                )}
              >
                <button
                  type="button"
                  className={cn(
                    "inline-flex w-full items-center gap-1 text-xs font-semibold leading-4 tracking-wide text-slate-600 hover:text-slate-900",
                    CENTER_ALIGNED_COLUMNS.includes(column)
                      ? "justify-center"
                      : "justify-start"
                  )}
                  onClick={() => {
                    onSortChange(column);
                  }}
                  title={`Sort by ${DASHBOARD_COLUMN_LABELS[column]}`}
                >
                  <span>{DASHBOARD_COLUMN_LABELS[column]}</span>
                  <span aria-hidden="true" className="text-[11px] text-slate-500">
                    {getColumnSortIndicator(column)}
                  </span>
                </button>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className={TABLE_BODY_CLASS}>
          {rows.length === 0 ? (
            <tr>
              <td
                className={cn(bodyCellClass, "text-center text-slate-500 text-sm")}
                colSpan={visibleColumns.length + (canSelectRows ? 1 : 0)}
              >
                No content found with current filters.
              </td>
            </tr>
          ) : (
            rows.map((row) => {
              const isSelected = selectedRowKeys.has(getRowKey(row));
              const isActive = activeRowId === row.id;
              return (
                <tr
                  key={`${row.content_type}:${row.id}`}
                  className={cn(
                    "cursor-pointer transition-colors",
                    isActive
                      ? "bg-slate-100"
                      : isSelected
                        ? "bg-slate-50"
                        : "hover:bg-slate-50"
                  )}
                  onClick={() => {
                    onRowClick(row);
                  }}
                >
                  {canSelectRows && (
                    <td
                      className={bodyCellClass}
                      onClick={(event) => {
                        event.stopPropagation();
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(event) => {
                          onToggleSingle(row, event.target.checked);
                        }}
                        aria-label={`Select ${row.title}`}
                      />
                    </td>
                  )}
                  {visibleColumns.map((column) => {
                    if (column === "content_type") {
                      return (
                        <td key={column} className={cn(bodyCellClass, "text-center")}>
                          {row.content_type === "blog" ? "Blog" : "Social Post"}
                        </td>
                      );
                    }
                    if (column === "site") {
                      return (
                        <td key={column} className={bodyCellClass}>
                          <span className="truncate text-slate-800" title={row.site}>
                            {row.site}
                          </span>
                        </td>
                      );
                    }
                    if (column === "id") {
                      return (
                        <td key={column} className={bodyCellClass}>
                          <span className="truncate text-slate-700" title={row.id}>
                            {row.id}
                          </span>
                        </td>
                      );
                    }
                    if (column === "title") {
                      return (
                        <td key={column} className={cn(bodyCellClass, "max-w-[26rem] font-medium")}>
                          <span className="block truncate text-slate-900" title={row.title}>
                            {row.title}
                          </span>
                        </td>
                      );
                    }
                    if (column === "status_display") {
                      return (
                        <td key={column} className={cn(bodyCellClass, "text-center")}>
                          <span className="truncate text-slate-800" title={row.status_display}>
                            {row.status_display}
                          </span>
                        </td>
                      );
                    }
                    if (column === "lifecycle_bucket") {
                      return (
                        <td key={column} className={cn(bodyCellClass, "text-center")}>
                          <span
                            className="truncate text-slate-700"
                            title={row.lifecycle_bucket.replaceAll("_", " ")}
                          >
                            {row.lifecycle_bucket.replaceAll("_", " ")}
                          </span>
                        </td>
                      );
                    }
                    if (column === "scheduled_date") {
                      return (
                        <td key={column} className={bodyCellClass}>
                          {formatDateOnly(row.scheduled_date) || "—"}
                        </td>
                      );
                    }
                    if (column === "published_date") {
                      return (
                        <td key={column} className={bodyCellClass}>
                          {formatDateOnly(row.published_date) || "—"}
                        </td>
                      );
                    }
                    if (column === "owner_display") {
                      return (
                        <td key={column} className={bodyCellClass}>
                          <span className="block max-w-[11rem] truncate" title={row.owner_display}>
                            {row.owner_display}
                          </span>
                        </td>
                      );
                    }
                    if (column === "updated_at") {
                      return (
                        <td key={column} className={bodyCellClass}>
                          {formatDateInTimezone(row.updated_at, timezone ?? undefined)}
                        </td>
                      );
                    }
                    return (
                      <td key={column} className={bodyCellClass}>
                        <span className="truncate text-slate-800" title={row.product ?? "—"}>
                          {row.product ?? "—"}
                        </span>
                      </td>
                    );
                  })}
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
