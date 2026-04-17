"use client";

import { useCallback, useMemo, useState } from "react";

/**
 * useBulkSelection — persistent selection state for list views.
 *
 * Selection is keyed by a composite `type:id` string so mixed-content
 * lists (dashboard, tasks) can distinguish blog + social post rows. This
 * hook is storage-agnostic; callers may wire it to URL state, React
 * Query cache, or localStorage as needed.
 */
export type BulkSelectionKey = string;

export type BulkSelectionAPI = {
  selected: Set<BulkSelectionKey>;
  count: number;
  isSelected: (key: BulkSelectionKey) => boolean;
  toggle: (key: BulkSelectionKey) => void;
  add: (keys: BulkSelectionKey[]) => void;
  remove: (keys: BulkSelectionKey[]) => void;
  clear: () => void;
  selectionIds: string[];
  selectionsByType: Record<string, string[]>;
};

export function useBulkSelection(): BulkSelectionAPI {
  const [selected, setSelected] = useState<Set<BulkSelectionKey>>(
    () => new Set()
  );

  const toggle = useCallback((key: BulkSelectionKey) => {
    setSelected((previous) => {
      const next = new Set(previous);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }, []);

  const add = useCallback((keys: BulkSelectionKey[]) => {
    setSelected((previous) => {
      const next = new Set(previous);
      for (const key of keys) {
        next.add(key);
      }
      return next;
    });
  }, []);

  const remove = useCallback((keys: BulkSelectionKey[]) => {
    setSelected((previous) => {
      const next = new Set(previous);
      for (const key of keys) {
        next.delete(key);
      }
      return next;
    });
  }, []);

  const clear = useCallback(() => {
    setSelected(new Set());
  }, []);

  const { selectionIds, selectionsByType } = useMemo(() => {
    const byType: Record<string, string[]> = {};
    const ids: string[] = [];
    for (const key of selected) {
      const [type, id] = key.split(":", 2);
      if (type && id) {
        if (!byType[type]) {
          byType[type] = [];
        }
        byType[type].push(id);
        ids.push(id);
      }
    }
    return { selectionIds: ids, selectionsByType: byType };
  }, [selected]);

  const isSelected = useCallback(
    (key: BulkSelectionKey) => selected.has(key),
    [selected]
  );

  return {
    selected,
    count: selected.size,
    isSelected,
    toggle,
    add,
    remove,
    clear,
    selectionIds,
    selectionsByType,
  };
}
