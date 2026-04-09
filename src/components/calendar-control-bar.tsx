import type { ReactNode } from "react";

import { Button } from "@/components/button";
import {
  SEGMENTED_CONTROL_CLASS,
  segmentedControlItemClass,
} from "@/lib/segmented-control";
import { cn } from "@/lib/utils";

type CalendarControlMode = "month" | "week";

type CalendarControlBarProps = {
  periodLabel: string;
  mode: CalendarControlMode;
  monthInputValue: string;
  onPrev: () => void;
  onToday: () => void;
  onNext: () => void;
  onModeChange: (mode: CalendarControlMode) => void;
  onMonthInputChange: (nextMonthValue: string) => void;
  controlsBeforeMode?: ReactNode;
  className?: string;
};

export function CalendarControlBar({
  periodLabel,
  mode,
  monthInputValue,
  onPrev,
  onToday,
  onNext,
  onModeChange,
  onMonthInputChange,
  controlsBeforeMode,
  className,
}: CalendarControlBarProps) {
  return (
    <section
      className={cn(
        "flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white p-2",
        className
      )}
    >
      <p className="text-sm font-semibold text-slate-800 tabular-nums">{periodLabel}</p>
      <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
        <Button
          type="button"
          variant="secondary"
          size="md"
          onClick={onPrev}
          aria-label={mode === "month" ? "Previous month" : "Previous week"}
        >
          Prev
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="md"
          onClick={onToday}
          aria-label="Go to today"
        >
          Today
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="md"
          onClick={onNext}
          aria-label={mode === "month" ? "Next month" : "Next week"}
        >
          Next
        </Button>
        <label className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700">
          <span className="sr-only">Jump to month</span>
          <input
            type="month"
            value={monthInputValue}
            onChange={(event) => {
              onMonthInputChange(event.target.value);
            }}
            className="focus-field rounded border-none bg-transparent p-0 text-sm focus:outline-none"
          />
        </label>
        {controlsBeforeMode}
        <div className={`${SEGMENTED_CONTROL_CLASS} text-sm`}>
          <button
            type="button"
            className={segmentedControlItemClass({ isActive: mode === "month" })}
            onClick={() => {
              onModeChange("month");
            }}
          >
            Month
          </button>
          <button
            type="button"
            className={segmentedControlItemClass({ isActive: mode === "week" })}
            onClick={() => {
              onModeChange("week");
            }}
          >
            Week
          </button>
        </div>
      </div>
    </section>
  );
}
