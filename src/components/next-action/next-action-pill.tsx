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
          "inline-flex items-center gap-2 rounded-full border border-[color:var(--sh-gray-200)] bg-[color:var(--sh-gray)] px-3 py-1 text-xs text-navy-500",
          className
        )}
      >
        <span className="h-2 w-2 rounded-full bg-[color:var(--sh-gray-400)]" />
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
        "inline-flex items-center gap-2 rounded-full bg-ink px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand disabled:cursor-not-allowed disabled:bg-[color:var(--sh-gray-400)]",
        className
      )}
    >
      <span className="h-2 w-2 rounded-full bg-emerald-400" />
      <span className="truncate">{label}</span>
      <ArrowRightIcon boxClassName="h-3.5 w-3.5" size={12} />
    </button>
  );
}
