"use client";

import { ArrowRightIcon } from "@/lib/icons";
import type { NextActionDescriptor } from "@/lib/next-action";
import { cn } from "@/lib/utils";

/**
 * <NextActionPill /> — for detail pages, dashboards, and bell popovers.
 *
 * Larger than <NextActionCell /> and intentionally interactive. Use for
 * the single primary action on any surface where the user should "do the
 * next thing" (dashboard hero row, record sidebar, inbox row).
 */
export function NextActionPill({
  descriptor,
  onAction,
  disabled = false,
  className,
}: {
  descriptor: NextActionDescriptor;
  onAction?: () => void;
  disabled?: boolean;
  className?: string;
}) {
  const { label, isMine, waitingFor } = descriptor;

  if (!isMine) {
    return (
      <div
        className={cn(
          "inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-600",
          className
        )}
      >
        <span className="h-2 w-2 rounded-full bg-slate-300" />
        <span className="truncate">{waitingFor}</span>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onAction}
      disabled={disabled}
      className={cn(
        "inline-flex items-center gap-2 rounded-full bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 disabled:cursor-not-allowed disabled:bg-slate-300",
        className
      )}
    >
      <span className="h-2 w-2 rounded-full bg-emerald-400" />
      <span className="truncate">{label}</span>
      <ArrowRightIcon boxClassName="h-3.5 w-3.5" size={12} />
    </button>
  );
}
