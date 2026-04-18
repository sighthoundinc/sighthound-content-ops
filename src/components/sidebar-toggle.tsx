"use client";

import { forwardRef } from "react";

import { AppIcon } from "@/lib/icons";
import { cn } from "@/lib/utils";

/**
 * Sidebar toggle button component.
 *
 * Renders a button that toggles the sidebar between expanded and collapsed states.
 * Shows a chevronLeft icon when expanded (indicates "collapse to left")
 * and chevronRight when collapsed (indicates "expand to right").
 *
 * Features:
 * - Accessible with aria-label
 * - Consistent icon styling
 * - Smooth visual feedback on hover
 *
 * Usage:
 * ```tsx
 * <SidebarToggle collapsed={collapsed} onToggle={handleToggle} />
 * ```
 */
type SidebarToggleProps = {
  collapsed: boolean;
  onToggle: () => void;
};

export const SidebarToggle = forwardRef<HTMLButtonElement, SidebarToggleProps>(
  function SidebarToggle({ collapsed, onToggle }, ref) {
    return (
      <button
        ref={ref}
        type="button"
        onClick={onToggle}
        aria-label={collapsed ? "Open sidebar" : "Close sidebar"}
        className={cn(
          "group flex items-center justify-center rounded-md transition motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-inset",
          collapsed
            ? "w-full min-h-11 px-2 py-2 hover:bg-blurple-50"
            : "h-9 w-9 p-2 text-navy-500 hover:bg-blurple-50 hover:text-ink"
        )}
      >
        <AppIcon
          name={collapsed ? "chevronRight" : "chevronLeft"}
          size={14}
          boxClassName="h-4 w-4 shrink-0"
          className={cn(
            collapsed
              ? "text-navy-500/60 group-hover:text-navy-500"
              : "text-navy-500 group-hover:text-navy-500"
          )}
        />
      </button>
    );
  }
);
