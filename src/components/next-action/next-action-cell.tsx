"use client";

import { ArrowRightIcon } from "@/lib/icons";
import type { NextActionDescriptor } from "@/lib/next-action";
import { cn } from "@/lib/utils";

/**
 * <NextActionCell /> — the unified verb-first cell for list rows.
 *
 * Displays the next action a user should take on the row. When the action
 * belongs to the current user (`isMine`), the text is rendered in strong
 * slate-900 with an arrow affordance. Otherwise the waiting context is
 * rendered in slate-600 (non-actionable).
 *
 * Usage:
 *   <NextActionCell descriptor={blogNextAction({ ... })} />
 */
export function NextActionCell({
  descriptor,
  onAction,
  className,
}: {
  descriptor: NextActionDescriptor;
  onAction?: () => void;
  className?: string;
}) {
  const { label, isMine, waitingFor } = descriptor;
  if (!isMine) {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 truncate text-xs font-normal text-slate-600",
          className
        )}
        title={waitingFor}
      >
        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-slate-300" />
        <span className="truncate">{waitingFor}</span>
      </span>
    );
  }

  const content = (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 truncate text-xs font-semibold text-slate-900",
        className
      )}
    >
      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
      <span className="truncate">{label}</span>
      <ArrowRightIcon boxClassName="h-3.5 w-3.5"
        size={12}
        className="text-slate-500" />
    </span>
  );

  if (!onAction) {
    return content;
  }

  return (
    <button
      type="button"
      onClick={onAction}
      className="inline-flex items-center gap-1.5 rounded-sm px-1 py-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
    >
      {content}
    </button>
  );
}
