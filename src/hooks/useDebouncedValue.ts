"use client";

import { useEffect, useState } from "react";

/**
 * Debounces rapidly changing values (for example search inputs) so expensive
 * filtering/sorting logic runs after a short idle period.
 */
export function useDebouncedValue<T>(value: T, delayMs: number) {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedValue(value);
    }, delayMs);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [delayMs, value]);

  return debouncedValue;
}
