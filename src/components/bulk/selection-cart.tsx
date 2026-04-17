"use client";

import { AppIcon } from "@/lib/icons";
import { cn } from "@/lib/utils";

/**
 * <SelectionCart /> — persistent floating bar that survives pagination
 * and filter changes. Sits above the bottom chrome (pagination strip).
 *
 * Rules (AGENTS.md):
 * - Bulk actions remain permission-gated; show disabled state rather than
 *   hiding controls when the current selection cannot be actioned.
 * - Pagination strip stays structurally outside the table body; this cart
 *   floats over content and does NOT disrupt table row heights.
 * - Mixed-content selection is visible but content-aware action buttons
 *   are disabled when selection mixes types.
 */
export type SelectionCartAction = {
  id: string;
  label: string;
  icon?: "copy" | "edit" | "upload" | "download" | "close" | "more";
  disabled?: boolean;
  disabledReason?: string;
  onClick: () => void;
  variant?: "default" | "danger";
};

export function SelectionCart({
  count,
  summary,
  actions,
  onClear,
  className,
}: {
  count: number;
  summary?: string;
  actions: SelectionCartAction[];
  onClear: () => void;
  className?: string;
}) {
  if (count <= 0) {
    return null;
  }

  return (
    <div
      role="region"
      aria-label="Selected items actions"
      className={cn(
        "pointer-events-auto fixed bottom-6 left-1/2 z-[250] flex -translate-x-1/2 items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-2 shadow-lg",
        className
      )}
    >
      <div className="flex items-center gap-2 pr-2 border-r border-slate-200">
        <span className="text-xs font-semibold text-slate-900">
          {count} selected
        </span>
        {summary ? (
          <span className="text-[11px] text-slate-500">{summary}</span>
        ) : null}
      </div>
      <div className="flex items-center gap-1">
        {actions.map((action) => (
          <button
            key={action.id}
            type="button"
            onClick={action.onClick}
            disabled={action.disabled}
            title={action.disabled ? action.disabledReason : undefined}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500",
              action.variant === "danger"
                ? "text-rose-700 hover:bg-rose-50 disabled:text-rose-300"
                : "text-slate-700 hover:bg-slate-100 disabled:text-slate-400",
              action.disabled && "cursor-not-allowed"
            )}
          >
            {action.icon ? (
              <AppIcon name={action.icon} boxClassName="h-4 w-4" size={14} />
            ) : null}
            {action.label}
          </button>
        ))}
      </div>
      <button
        type="button"
        onClick={onClear}
        className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
      >
        <AppIcon name="close" boxClassName="h-4 w-4" size={12} />
        Clear
      </button>
    </div>
  );
}
