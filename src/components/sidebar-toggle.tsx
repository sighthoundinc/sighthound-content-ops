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
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        className={cn(
          "inline-flex items-center justify-center rounded-md p-2 transition motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-inset",
          "text-slate-600 hover:bg-slate-100 hover:text-slate-800"
        )}
      >
        <AppIcon
          name={collapsed ? "chevronRight" : "chevronLeft"}
          size={20}
          boxClassName="h-5 w-5"
        />
      </button>
    );
  }
);
