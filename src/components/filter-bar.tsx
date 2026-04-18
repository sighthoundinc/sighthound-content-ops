import { FilterChip } from "./filter-chip";
import { Button } from "./button";
import { cn } from "@/lib/utils";

export interface FilterBarFilter {
  /** Unique identifier for the filter */
  id: string;
  /** Display label */
  label: string;
  /** Optional value to display */
  value?: string;
}

export interface FilterBarProps {
  /** Array of active filters to display */
  filters: FilterBarFilter[];
  /** Callback when a filter is removed */
  onRemoveFilter: (filterId: string) => void;
  /** Callback when clear all is clicked */
  onClearAll: () => void;
  /** Show clear all button only if filters present */
  showClearAll?: boolean;
  /** Custom className for the wrapper */
  className?: string;
  /** Placeholder text when no filters active */
  emptyMessage?: string;
}

/**
 * FilterBar component for displaying and managing active filters.
 * Shows all active filters as chips and provides a clear all button.
 *
 * @example
 * <FilterBar
 *   filters={[
 *     { id: "status", label: "Status", value: "Published" },
 *     { id: "site", label: "Site", value: "Sighthound" },
 *   ]}
 *   onRemoveFilter={(id) => handleRemoveFilter(id)}
 *   onClearAll={() => handleClearAllFilters()}
 * />
 */
export function FilterBar({
  filters,
  onRemoveFilter,
  onClearAll,
  showClearAll = true,
  className,
  emptyMessage,
}: FilterBarProps) {
  if (filters.length === 0 && !emptyMessage) {
    return null;
  }

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-2 rounded-lg border border-[color:var(--sh-gray-200)] bg-[color:var(--sh-gray)] p-3",
        className
      )}
    >
      {filters.length === 0 ? (
        <p className="text-sm text-navy-500">{emptyMessage || "No active filters"}</p>
      ) : (
        <>
          <div className="flex flex-wrap gap-2">
            {filters.map((filter) => (
              <FilterChip
                key={filter.id}
                label={filter.label}
                value={filter.value}
                onRemove={() => onRemoveFilter(filter.id)}
              />
            ))}
          </div>
          {showClearAll && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onClearAll}
              className="ml-auto text-navy-500 hover:text-ink"
            >
              Clear All
            </Button>
          )}
        </>
      )}
    </div>
  );
}
