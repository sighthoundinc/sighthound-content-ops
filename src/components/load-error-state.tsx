"use client";

import { Button } from "@/components/button";
import { WarningIcon } from "@/lib/icons";
import { UI_VOCAB } from "@/lib/ui-vocab";
import { cn } from "@/lib/utils";

export type LoadErrorStateProps = {
  /** Short heading. Defaults to the shared load-failure title. */
  title?: string;
  /** What failed, in plain language (e.g. "Couldn't load tasks."). */
  description?: string;
  /** Re-runs the failed load. Omit only when no retry is possible. */
  onRetry?: () => void;
  isRetrying?: boolean;
  className?: string;
};

/**
 * Load-failure state.
 *
 * Render this INSTEAD of an empty state whenever a page's data failed to
 * load. A failed load must never present as "No tasks" / "All caught up":
 * the user cannot tell the difference between an outage and a clear queue.
 * Toasts may supplement this, but they auto-dismiss and cannot replace it.
 */
export function LoadErrorState({
  title = UI_VOCAB.errors.loadFailedTitle,
  description = UI_VOCAB.errors.loadFailedDescription,
  onRetry,
  isRetrying = false,
  className,
}: LoadErrorStateProps) {
  return (
    <div
      role="alert"
      className={cn(
        "flex w-full flex-col items-center justify-center gap-3 rounded-lg border border-rose-200 bg-rose-50 px-6 py-10 text-center",
        className
      )}
    >
      <span className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-rose-200 bg-white text-rose-700">
        <WarningIcon size={20} boxClassName="h-5 w-5" />
      </span>
      <div className="flex flex-col gap-1">
        <p className="subsection-label text-ink">{title}</p>
        <p className="body-text max-w-md text-navy-500">{description}</p>
      </div>
      {onRetry ? (
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={onRetry}
          disabled={isRetrying}
        >
          {UI_VOCAB.errors.retry}
        </Button>
      ) : null}
    </div>
  );
}
