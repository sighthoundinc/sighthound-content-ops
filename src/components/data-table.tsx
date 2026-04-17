import { cn } from "@/lib/utils";
import { getWorkflowRowClassName } from "@/lib/table-row-tones";
import { AppIcon, type AppIconName } from "@/lib/icons";
import { readDensitySync } from "@/hooks/useDensityPreference";
import {
  getTableBodyCellClass,
  TABLE_BASE_CLASS,
  TABLE_BODY_CLASS,
  TABLE_CONTAINER_CLASS,
  TABLE_HEAD_CLASS,
  TABLE_HEADER_CELL_CLASS,
  TABLE_STICKY_HEADER_CELL_CLASS,
  TABLE_TEXT_TRUNCATE_CLASS,
  type SortDirection,
} from "@/lib/table";

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
  density,
  emptyMessage = "No data available",
  className,
  rowClassName,
}: DataTableProps<TData>) {
  const effectiveDensity = density ?? readDensitySync();
  const bodyCellClass = getTableBodyCellClass(effectiveDensity);
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
  const getColumnSortIndicatorIcon = (columnId: string): AppIconName => {
    if (!sortField || sortField !== columnId) {
      return "chevronsUpDown";
    }
    return sortDirection === "asc" ? "chevronUp" : "chevronDown";
  };
  const getColumnAriaSort = (columnId: string) => {
    if (!sortField || sortField !== columnId) {
      return "none";
    }
    return sortDirection === "asc" ? "ascending" : "descending";
  };
  const getSortButtonAriaLabel = (columnLabel: string, columnId: string) => {
    if (sortField !== columnId) {
      return `Sort by ${columnLabel} ascending`;
    }
    if (sortDirection === "asc") {
      return `Sort by ${columnLabel} descending`;
    }
    return `Sort by ${columnLabel} ascending`;
  };

  return (
    <div
      className={cn(
        TABLE_CONTAINER_CLASS,
        className
      )}
    >
      <table className={TABLE_BASE_CLASS}>
        <thead className={TABLE_HEAD_CLASS}>
          <tr>
            {showSelection && (
              <th
                className={cn(
                  TABLE_HEADER_CELL_CLASS,
                  TABLE_STICKY_HEADER_CELL_CLASS,
                  "w-12"
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
                aria-sort={column.sortable ? getColumnAriaSort(column.id) : undefined}
                className={cn(
                  TABLE_HEADER_CELL_CLASS,
                  TABLE_STICKY_HEADER_CELL_CLASS,
                  column.align === "center" ? "text-center" : "",
                  column.align === "right" ? "text-right" : "",
                  column.minWidth
                )}
              >
                {column.sortable ? (
                  <button
                    type="button"
                    onClick={() => handleColumnSort(column.id)}
                    className={cn(
                      "inline-flex w-full items-center gap-1 text-xs font-semibold leading-4 tracking-wide text-slate-600 hover:text-slate-900",
                      column.align === "center"
                        ? "justify-center"
                        : column.align === "right"
                          ? "justify-end"
                          : "justify-start"
                    )}
                    aria-label={getSortButtonAriaLabel(column.label, column.id)}
                    title={`Sort by ${column.label}`}
                  >
                    <span>{column.label}</span>
                    <AppIcon
                      name={getColumnSortIndicatorIcon(column.id)}
                      boxClassName="h-3 w-3"
                      size={12}
                      className="text-slate-500"
                    />
                  </button>
                ) : (
                  <span className="text-xs font-semibold leading-4 tracking-wide text-slate-600">{column.label}</span>
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className={TABLE_BODY_CLASS}>
          {data.length === 0 ? (
            <tr>
              <td
                className={cn(
                  bodyCellClass,
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
              const defaultRowClass = getWorkflowRowClassName(
                item,
                isActive,
                isSelected
              );

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
                      className={cn(bodyCellClass, "w-12")}
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
                  {visibleColumns.map((column) => {
                    const renderedCell = column.render(item, index);
                    const textValue =
                      typeof renderedCell === "string" ||
                      typeof renderedCell === "number"
                        ? String(renderedCell)
                        : null;

                    return (
                      <td
                        key={column.id}
                        className={cn(
                          bodyCellClass,
                          column.align === "center" ? "text-center" : "",
                          column.align === "right" ? "text-right" : "",
                          column.className
                        )}
                      >
                        {textValue !== null ? (
                          <span
                            className={TABLE_TEXT_TRUNCATE_CLASS}
                            title={textValue}
                          >
                            {textValue}
                          </span>
                        ) : (
                          renderedCell
                        )}
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
