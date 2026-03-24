import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type CalendarTileProps = {
  dayLabel: string;
  isToday: boolean;
  isCurrentMonth: boolean;
  headerAction?: ReactNode;
  children?: ReactNode;
  bodyScrollable?: boolean;
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
  bodyScrollable = true,
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
        "relative flex h-40 flex-col rounded-xl border border-slate-200/90 bg-gradient-to-b from-white via-white to-slate-50/55 shadow-[0_1px_2px_rgba(15,23,42,0.06)] transition-[border-color,box-shadow,background-color] duration-150 motion-reduce:transition-none",
        !isCurrentMonth && "border-slate-200/70 bg-slate-50/75",
        isToday &&
          "border-indigo-300 bg-indigo-50/70 shadow-[0_0_0_1px_rgba(99,102,241,0.18),0_10px_20px_-14px_rgba(79,70,229,0.45)]",
        isFocused && "ring-2 ring-indigo-400 ring-offset-1",
        todayContainerClassName && isToday && todayContainerClassName,
        className,
      )}
    >
      <div
        className={cn(
          "flex items-center justify-between gap-2 border-b border-slate-200/80 px-3 py-2",
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
      {/* Content area (optional internal scrolling) */}
      <div
        className={cn(
          "flex-1 px-2 py-1.5",
          bodyScrollable ? "overflow-y-auto overscroll-contain" : "overflow-hidden",
          bodyClassName,
        )}
      >
        {children}
      </div>
    </article>
  );
}
