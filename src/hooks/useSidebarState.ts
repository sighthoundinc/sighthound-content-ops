'use client';

import { useState, useEffect } from 'react';

const SIDEBAR_STATE_KEY = 'sidebar:collapsed';
const AUTO_COLLAPSE_BREAKPOINT_PX = 1400;

/**
 * Custom hook for managing global, persistent sidebar collapsed state.
 *
 * Features:
 * - Persists to localStorage under key 'sidebar:collapsed'
 * - Early hydration support to prevent layout flicker on page load
 * - Provides both read and write access
 *
 * Usage:
 * ```tsx
 * const { collapsed, setCollapsed } = useSidebarState();
 * ```
 */
export function useSidebarState() {
  const [collapsed, setCollapsedState] = useState<boolean>(() => readSidebarStateSync());
  const [isMounted, setIsMounted] = useState<boolean>(false);

  /**
   * Mark mounted for any consumers that need hydration awareness.
   */
  useEffect(() => {
    setIsMounted(true);
  }, []);

  /**
   * Responsive auto-collapse at viewports below 1400px when the user
   * has NOT explicitly set a preference in localStorage. Once the user
   * toggles manually, their preference sticks regardless of viewport.
   */
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) {
      return;
    }
    let userHasExplicitPreference = false;
    try {
      userHasExplicitPreference = localStorage.getItem(SIDEBAR_STATE_KEY) !== null;
    } catch {
      userHasExplicitPreference = true;
    }
    if (userHasExplicitPreference) {
      return;
    }
    const mediaQuery = window.matchMedia(
      `(max-width: ${AUTO_COLLAPSE_BREAKPOINT_PX - 1}px)`
    );
    const sync = () => {
      setCollapsedState(mediaQuery.matches);
    };
    sync();
    mediaQuery.addEventListener('change', sync);
    return () => {
      mediaQuery.removeEventListener('change', sync);
    };
  }, []);

  /**
   * Update localStorage whenever collapsed state changes.
   */
  const setCollapsed = (newValue: boolean | ((prev: boolean) => boolean)) => {
    setCollapsedState((prev) => {
      const nextValue = typeof newValue === 'function' ? newValue(prev) : newValue;
      try {
        localStorage.setItem(SIDEBAR_STATE_KEY, String(nextValue));
      } catch (error) {
        console.warn('Failed to write sidebar state to localStorage:', error);
        // Continue even if localStorage fails
      }
      return nextValue;
    });
  };

  return {
    collapsed,
    setCollapsed,
    isMounted,
  };
}

/**
 * Static function to read sidebar state synchronously from localStorage.
 * Use this for early hydration in layout or root components BEFORE React renders.
 *
 * @returns boolean - true if sidebar is collapsed, false if expanded
 */
export function readSidebarStateSync(): boolean {
  if (typeof window === 'undefined') {
    return false; // Default to expanded on server
  }

  try {
    const stored = localStorage.getItem(SIDEBAR_STATE_KEY);
    return stored === 'true';
  } catch (error) {
    console.warn('Failed to read sidebar state synchronously:', error);
    return false; // Default to expanded on error
  }
}
