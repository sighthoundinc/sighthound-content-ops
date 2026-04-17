"use client";

import { useEffect, useState } from "react";

/**
 * useDensityPreference — persistent global density preference.
 *
 * Initial implementation uses localStorage (UI-only) so the feature
 * can roll out ahead of a `profiles.ui_density` migration. When the
 * DB column is added, swap the read/write calls to hit
 * `/api/users/profile` PATCH without changing consumers.
 */
export type Density = "compact" | "comfortable";
const DENSITY_STORAGE_KEY = "ui:density";
const DEFAULT_DENSITY: Density = "compact";

export function readDensitySync(): Density {
  if (typeof window === "undefined") {
    return DEFAULT_DENSITY;
  }
  try {
    const stored = window.localStorage.getItem(DENSITY_STORAGE_KEY);
    if (stored === "compact" || stored === "comfortable") {
      return stored;
    }
  } catch (error) {
    console.warn("density preference read failed", error);
  }
  return DEFAULT_DENSITY;
}

export function useDensityPreference() {
  const [density, setDensityState] = useState<Density>(() => readDensitySync());

  useEffect(() => {
    const handler = (event: StorageEvent) => {
      if (event.key === DENSITY_STORAGE_KEY && event.newValue) {
        if (event.newValue === "compact" || event.newValue === "comfortable") {
          setDensityState(event.newValue);
        }
      }
    };
    window.addEventListener("storage", handler);
    return () => {
      window.removeEventListener("storage", handler);
    };
  }, []);

  const setDensity = (next: Density) => {
    setDensityState(next);
    try {
      window.localStorage.setItem(DENSITY_STORAGE_KEY, next);
    } catch (error) {
      console.warn("density preference write failed", error);
    }
  };

  const toggle = () => {
    setDensity(density === "compact" ? "comfortable" : "compact");
  };

  return {
    density,
    setDensity,
    toggle,
    isCompact: density === "compact",
    isComfortable: density === "comfortable",
  };
}
