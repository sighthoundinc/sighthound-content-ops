import { useState, useCallback } from "react";
import type { SortDirection } from "@/lib/table";

export interface FilterValue {
  id: string;
  label: string;
}

export interface FilterDefinition {
  id: string;
  label: string;
  options: FilterValue[];
}

export interface FilterState {
  search: string;
  activeFilters: Record<string, string[]>;
  sortField?: string;
  sortDirection: SortDirection;
}

export interface UseFilterStateOptions {
  initialSearch?: string;
  initialFilters?: Record<string, string[]>;
  initialSortField?: string;
  initialSortDirection?: SortDirection;
}

/**
 * Custom hook for centralized filter state management.
 * Handles search, multiple filter types, and sorting in a unified way.
 *
 * @example
 * const {
 *   search,
 *   setSearch,
 *   activeFilters,
 *   setFilters,
 *   toggleFilter,
 *   clearFilters,
 *   sortField,
 *   sortDirection,
 *   setSort,
 * } = useFilterState({
 *   initialSearch: "",
 *   initialFilters: { status: ["published"] },
 * });
 */
export function useFilterState({
  initialSearch = "",
  initialFilters = {},
  initialSortField = undefined,
  initialSortDirection = "asc",
}: UseFilterStateOptions = {}) {
  const [search, setSearch] = useState(initialSearch);
  const [activeFilters, setActiveFilters] = useState<Record<string, string[]>>(
    initialFilters
  );
  const [sortField, setSortField] = useState<string | undefined>(initialSortField);
  const [sortDirection, setSortDirection] = useState<SortDirection>(
    initialSortDirection
  );

  const updateFilter = useCallback(
    (filterId: string, values: string[]) => {
      setActiveFilters((prev) => {
        if (values.length === 0) {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { [filterId]: _, ...rest } = prev;
          return rest;
        }
        return {
          ...prev,
          [filterId]: values,
        };
      });
    },
    []
  );

  const toggleFilter = useCallback(
    (filterId: string, value: string) => {
      setActiveFilters((prev) => {
        const currentValues = prev[filterId] ?? [];
        const newValues = currentValues.includes(value)
          ? currentValues.filter((v) => v !== value)
          : [...currentValues, value];

        if (newValues.length === 0) {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { [filterId]: _, ...rest } = prev;
          return rest;
        }

        return {
          ...prev,
          [filterId]: newValues,
        };
      });
    },
    []
  );

  const clearAllFilters = useCallback(() => {
    setSearch("");
    setActiveFilters({});
    setSortField(undefined);
    setSortDirection("asc");
  }, []);

  const clearSearch = useCallback(() => {
    setSearch("");
  }, []);

  const clearFiltersOnly = useCallback(() => {
    setActiveFilters({});
  }, []);

  const setSort = useCallback(
    (field: string | undefined, direction: SortDirection = "asc") => {
      setSortField(field);
      setSortDirection(direction);
    },
    []
  );

  const hasActiveFilters =
    search.length > 0 ||
    Object.keys(activeFilters).length > 0;

  const getFilterValues = useCallback(
    (filterId: string): string[] => activeFilters[filterId] ?? [],
    [activeFilters]
  );

  const isFilterActive = useCallback(
    (filterId: string, value: string): boolean => {
      return (activeFilters[filterId] ?? []).includes(value);
    },
    [activeFilters]
  );

  return {
    // Search state
    search,
    setSearch,
    clearSearch,

    // Filter state
    activeFilters,
    updateFilter,
    toggleFilter,
    clearFiltersOnly,
    getFilterValues,
    isFilterActive,

    // Sort state
    sortField,
    sortDirection,
    setSort,

    // Combined actions
    clearAllFilters,
    hasActiveFilters,
  };
}
