import { cn } from "@/lib/utils";
import type { SortDirection } from "@/lib/table";

export interface DataTableColumn<TData> {
  /** Unique identifier for the column */
  id: string;
  /** Display label for the column header */
  label: string;
  /** Whether this column is sortable */
  sortable?: boolean;
  /** Text alignment for the column */
  align?: "left" | "center" | "right";
  /** Custom renderer for cell content */
  render: (item: TData, index: number) => React.ReactNode;
  /** Minimum width for the column */
  minWidth?: string;
  /** Whether the column is visible */
  visible?: boolean;
  /** Custom className for the column */
  className?: string;
}

export interface DataTableProps<TData> {
  /** Array of data rows to display */
  data: TData[];
  /** Array of column definitions */
  columns: DataTableColumn<TData>[];
  /** Field currently sorted by (id of the column) */
  sortField?: string;
  /** Direction of sort */
  sortDirection?: SortDirection;
  /** Callback when a sortable column header is clicked */
  onSort?: (field: string, direction: SortDirection) => void;
  /** Whether to show row selection checkboxes */
  showSelection?: boolean;
  /** Set of selected row indices */
  selectedIndices?: Set<number>;
  /** Callback when row selection changes */
  onSelectionChange?: (indices: Set<number>) => void;
  /** Callback when a row is clicked */
  onRowClick?: (item: TData, index: number) => void;
  /** Index of currently active row */
  activeIndex?: number;
  /** Row density: compact or comfortable spacing */
  density?: "compact" | "comfortable";
  /** Empty state message */
  emptyMessage?: string;
  /** Custom className for the table wrapper */
  className?: string;
  /** Custom className for rows */
  rowClassName?: (item: TData, index: number, isActive: boolean, isSelected: boolean) => string;
}

const headerCellClass =
  "px-6 py-3 font-medium text-slate-900 whitespace-nowrap relative";
const bodyCellClass = (density: "compact" | "comfortable") =>
  density === "compact" ? "px-6 py-2 text-slate-900 h-10 align-middle" : "px-6 py-3 text-slate-900 h-12 align-middle";

/**
 * Unified DataTable component for consistent table display and interactions across the application.
 * Supports sorting, pagination, row selection, and customizable column rendering.
 *
 * @example
 * <DataTable
 *   data={items}
 *   columns={[
 *     { id: "name", label: "Name", sortable: true, render: (item) => item.name },
 *     { id: "status", label: "Status", render: (item) => <StatusBadge status={item.status} /> },
 *   ]}
 *   onSort={handleSort}
 *   onRowClick={handleRowClick}
 * />
 */
export function DataTable<TData>({
  data,
  columns,
  sortField,
  sortDirection,
  onSort,
  showSelection = false,
  selectedIndices = new Set(),
  onSelectionChange,
  onRowClick,
  activeIndex,
  density = "comfortable",
  emptyMessage = "No data available",
  className,
  rowClassName,
}: DataTableProps<TData>) {
  const visibleColumns = columns.filter((col) => col.visible !== false);
  const allVisibleSelected =
    visibleColumns.length > 0 &&
    selectedIndices.size > 0 &&
    selectedIndices.size === data.length;
  const someSelected = selectedIndices.size > 0 && !allVisibleSelected;

  const handleToggleAll = (checked: boolean) => {
    if (!onSelectionChange) return;

    if (checked) {
      const allIndices = new Set(
        data.map((_, index) => index)
      );
      onSelectionChange(allIndices);
    } else {
      onSelectionChange(new Set());
    }
  };

  const handleToggleSingle = (index: number, checked: boolean) => {
    if (!onSelectionChange) return;

    const newSelection = new Set(selectedIndices);
    if (checked) {
      newSelection.add(index);
    } else {
      newSelection.delete(index);
    }
    onSelectionChange(newSelection);
  };

  const handleColumnSort = (columnId: string) => {
    if (!onSort) return;

    let newDirection: SortDirection = "asc";
    if (sortField === columnId && sortDirection === "asc") {
      newDirection = "desc";
    }
    onSort(columnId, newDirection);
  };

  return (
    <div
      className={cn(
        "overflow-auto rounded-lg border border-slate-200",
        className
      )}
    >
      <table className="min-w-full divide-y divide-slate-200 text-sm">
        <thead className="bg-slate-100 text-left text-xs uppercase tracking-wide text-slate-600">
          <tr>
            {showSelection && (
              <th
                className={cn(
                  headerCellClass,
                  "sticky top-0 z-10 bg-slate-100 shadow-[inset_0_-1px_0_0_rgb(226_232_240)] w-12"
                )}
              >
                <input
                  type="checkbox"
                  checked={allVisibleSelected}
                  ref={(input) => {
                    if (input) {
                      input.indeterminate = someSelected;
                    }
                  }}
                  onChange={(event) => handleToggleAll(event.target.checked)}
                  aria-label="Select all rows"
                />
              </th>
            )}
            {visibleColumns.map((column) => (
              <th
                key={column.id}
                className={cn(
                  headerCellClass,
                  "sticky top-0 z-10 bg-slate-100 shadow-[inset_0_-1px_0_0_rgb(226_232_240)]",
                  column.align === "center" ? "text-center" : "",
                  column.align === "right" ? "text-right" : "",
                  column.minWidth
                )}
              >
                {column.sortable ? (
                  <button
                    type="button"
                    onClick={() => handleColumnSort(column.id)}
                    className="inline-flex items-center gap-1 hover:text-slate-900 cursor-pointer"
                    aria-label={`Sort by ${column.label}`}
                  >
                    {column.label}
                    {sortField === column.id && (
                      <span className="text-xs">
                        {sortDirection === "asc" ? "↑" : "↓"}
                      </span>
                    )}
                  </button>
                ) : (
                  column.label
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {data.length === 0 ? (
            <tr>
              <td
                className={cn(
                  bodyCellClass(density),
                  "text-center text-slate-500"
                )}
                colSpan={visibleColumns.length + (showSelection ? 1 : 0)}
              >
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((item, index) => {
              const isSelected = selectedIndices.has(index);
              const isActive = activeIndex === index;
              const defaultRowClass = isActive
                ? "bg-slate-100"
                : isSelected
                  ? "bg-slate-50"
                  : "hover:bg-slate-50";

              return (
                <tr
                  key={index}
                  className={cn(
                    "cursor-pointer transition-colors",
                    rowClassName
                      ? rowClassName(item, index, isActive, isSelected)
                      : defaultRowClass
                  )}
                  onClick={() => onRowClick?.(item, index)}
                >
                  {showSelection && (
                    <td
                      className={cn(bodyCellClass(density), "w-12")}
                      onClick={(event) => event.stopPropagation()}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(event) =>
                          handleToggleSingle(index, event.target.checked)
                        }
                        aria-label={`Select row ${index + 1}`}
                      />
                    </td>
                  )}
                  {visibleColumns.map((column) => (
                    <td
                      key={column.id}
                      className={cn(
                        bodyCellClass(density),
                        column.align === "center" ? "text-center" : "",
                        column.align === "right" ? "text-right" : "",
                        column.className,
                        "overflow-hidden"
                      )}
                    >
                      {column.render(item, index)}
                    </td>
                  ))}
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
