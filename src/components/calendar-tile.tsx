import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type CalendarTileProps = {
  dayLabel: string;
  isToday: boolean;
  isCurrentMonth: boolean;
  headerAction?: ReactNode;
  children?: ReactNode;
  className?: string;
  headerClassName?: string;
  dayLabelClassName?: string;
  bodyClassName?: string;
  todayContainerClassName?: string;
  todayDayLabelClassName?: string;
  currentMonthDayLabelClassName?: string;
  outOfMonthDayLabelClassName?: string;
  hasEvents?: boolean;
  isFocused?: boolean;
};

export function CalendarTile({
  dayLabel,
  isToday,
  isCurrentMonth,
  headerAction,
  children,
  className,
  headerClassName,
  dayLabelClassName,
  bodyClassName,
  todayContainerClassName,
  todayDayLabelClassName,
  currentMonthDayLabelClassName,
  outOfMonthDayLabelClassName,
  hasEvents,
  isFocused,
}: CalendarTileProps) {
  return (
    <article
      className={cn(
        // Base styling with clear borders and backgrounds
        "relative flex h-40 flex-col rounded-lg border border-slate-200 bg-white transition-all duration-200",
        // Out of month styling
        !isCurrentMonth && "bg-slate-50 border-slate-100",
        // Today styling with highlight
        isToday && "border-indigo-400 bg-indigo-50 shadow-md",
        // Focus ring
        isFocused && "ring-2 ring-indigo-400 ring-offset-1",
        // Custom today container class (for backwards compatibility)
        todayContainerClassName && isToday && todayContainerClassName,
        className,
      )}
    >
      <div
        className={cn(
          "flex items-center justify-between gap-2 border-b border-slate-200 px-3 py-2",
          headerClassName,
        )}
      >
        <div className="inline-flex items-center gap-1.5">
          <p
            className={cn(
              "text-sm font-semibold text-slate-900",
              !isCurrentMonth && "text-slate-400",
              !isToday && isCurrentMonth && "text-slate-900",
              isToday && "text-indigo-700",
              isToday && todayDayLabelClassName,
              isCurrentMonth &&
                !isToday &&
                currentMonthDayLabelClassName,
              !isCurrentMonth &&
                !isToday &&
                outOfMonthDayLabelClassName,
              dayLabelClassName,
            )}
          >
            {dayLabel}
          </p>
          {hasEvents ? (
            <span
              aria-hidden
              className="h-1.5 w-1.5 rounded-full bg-indigo-500"
            />
          ) : null}
        </div>
        {headerAction}
      </div>
      {/* Fixed-height scrollable content area */}
      <div
        className={cn(
          "flex-1 overflow-y-auto px-2 py-1.5",
          bodyClassName,
        )}
      >
        {children}
      </div>
    </article>
  );
}
