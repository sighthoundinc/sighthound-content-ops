import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import { Button } from "@/components/button";
import { CalendarIcon, ChevronLeftIcon, ChevronRightIcon } from "@/lib/icons";
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
  todayChipLabel?: string;
  onPrev: () => void;
  onToday: () => void;
  onNext: () => void;
  onModeChange: (mode: CalendarControlMode) => void;
  onMonthInputChange: (nextMonthValue: string) => void;
  controlsBeforeMode?: ReactNode;
  className?: string;
  showPeriodLabel?: boolean;
};

export function CalendarControlBar({
  periodLabel,
  mode,
  monthInputValue,
  todayChipLabel,
  onPrev,
  onToday,
  onNext,
  onModeChange,
  onMonthInputChange,
  controlsBeforeMode,
  className,
  showPeriodLabel = true,
}: CalendarControlBarProps) {
  const [isMonthPopoverOpen, setIsMonthPopoverOpen] = useState(false);
  const [monthPickerYear, setMonthPickerYear] = useState<number>(() => {
    const [yearPart] = monthInputValue.split("-");
    const year = Number(yearPart);
    return Number.isNaN(year) ? new Date().getFullYear() : year;
  });
  const popoverRef = useRef<HTMLDivElement | null>(null);

  const selectedMonthParts = useMemo(() => {
    const [yearPart, monthPart] = monthInputValue.split("-");
    const year = Number(yearPart);
    const month = Number(monthPart);
    return {
      year: Number.isNaN(year) ? new Date().getFullYear() : year,
      month: Number.isNaN(month) ? 1 : month,
    };
  }, [monthInputValue]);

  const monthPickerLabel = useMemo(() => {
    const monthDate = new Date(
      selectedMonthParts.year,
      Math.max(0, selectedMonthParts.month - 1),
      1
    );
    return new Intl.DateTimeFormat("en-US", {
      month: "long",
      year: "numeric",
    }).format(monthDate);
  }, [selectedMonthParts.month, selectedMonthParts.year]);

  useEffect(() => {
    setMonthPickerYear(selectedMonthParts.year);
  }, [selectedMonthParts.year]);

  useEffect(() => {
    if (!isMonthPopoverOpen) {
      return;
    }
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (!target) {
        return;
      }
      if (popoverRef.current?.contains(target)) {
        return;
      }
      setIsMonthPopoverOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsMonthPopoverOpen(false);
      }
    };
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isMonthPopoverOpen]);

  const monthOptions = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  return (
    <section
      className={cn(
        "flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white p-2",
        className
      )}
    >
      {showPeriodLabel || mode === "week" ? (
        <p className="text-sm font-semibold text-slate-800 tabular-nums">{periodLabel}</p>
      ) : (
        <span aria-hidden className="hidden sm:inline-block" />
      )}
      <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
        <div className="inline-flex items-center rounded-md border border-slate-300 bg-white p-0.5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
          <Button
            type="button"
            variant="ghost"
            size="md"
            onClick={onPrev}
            aria-label={mode === "month" ? "Previous month" : "Previous week"}
            className="rounded-md px-2.5 text-slate-600 hover:bg-slate-100 active:bg-slate-200 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-1"
          >
            <span className="inline-flex items-center gap-1">
              <ChevronLeftIcon boxClassName="h-4 w-4" size={14} />
              Prev
            </span>
          </Button>
          <Button
            type="button"
            variant="primary"
            size="md"
            onClick={onToday}
            aria-label="Go to today"
            className="rounded-md px-3 shadow-sm focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-1"
          >
            Today
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="md"
            onClick={onNext}
            aria-label={mode === "month" ? "Next month" : "Next week"}
            className="rounded-md px-2.5 text-slate-600 hover:bg-slate-100 active:bg-slate-200 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-1"
          >
            <span className="inline-flex items-center gap-1">
              Next
              <ChevronRightIcon boxClassName="h-4 w-4" size={14} />
            </span>
          </Button>
        </div>
        <div className="relative" ref={popoverRef}>
          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-800 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-colors hover:bg-slate-50 active:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-1"
            aria-expanded={isMonthPopoverOpen}
            aria-haspopup="dialog"
            aria-label="Jump to month"
            onClick={() => {
              setIsMonthPopoverOpen((previous) => !previous);
            }}
          >
            <CalendarIcon boxClassName="h-4 w-4" size={14} className="text-slate-500" />
            <span>{monthPickerLabel}</span>
          </button>
          {isMonthPopoverOpen ? (
            <div className="absolute right-0 top-full z-30 mt-2 w-60 rounded-md border border-slate-200 bg-white p-3 shadow-lg">
              <div className="mb-2 flex items-center justify-between">
                <button
                  type="button"
                  className="rounded-md border border-slate-200 bg-white p-1 text-slate-600 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-1"
                  aria-label="Previous year"
                  onClick={() => {
                    setMonthPickerYear((previous) => previous - 1);
                  }}
                >
                  <ChevronLeftIcon boxClassName="h-4 w-4" size={14} />
                </button>
                <p className="text-sm font-semibold text-slate-800 tabular-nums">{monthPickerYear}</p>
                <button
                  type="button"
                  className="rounded-md border border-slate-200 bg-white p-1 text-slate-600 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-1"
                  aria-label="Next year"
                  onClick={() => {
                    setMonthPickerYear((previous) => previous + 1);
                  }}
                >
                  <ChevronRightIcon boxClassName="h-4 w-4" size={14} />
                </button>
              </div>
              <div className="grid grid-cols-3 gap-1">
                {monthOptions.map((monthLabel, monthIndex) => {
                  const monthValue = `${monthPickerYear}-${String(monthIndex + 1).padStart(2, "0")}`;
                  const isActive =
                    selectedMonthParts.year === monthPickerYear &&
                    selectedMonthParts.month === monthIndex + 1;
                  return (
                    <button
                      key={monthLabel}
                      type="button"
                      className={cn(
                        "rounded-md px-2 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-1",
                        isActive
                          ? "bg-slate-900 text-white"
                          : "text-slate-700 hover:bg-slate-100 active:bg-slate-200"
                      )}
                      onClick={() => {
                        onMonthInputChange(monthValue);
                        setIsMonthPopoverOpen(false);
                      }}
                    >
                      {monthLabel}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}
        </div>
        {todayChipLabel ? (
          <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-600">
            Today · {todayChipLabel}
          </span>
        ) : null}
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
