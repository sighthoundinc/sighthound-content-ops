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
        "relative flex h-40 flex-col rounded-xl border border-[color:var(--sh-gray-200)]/90 bg-gradient-to-b from-white via-white to-[color:var(--sh-gray)]/55 shadow-[0_1px_2px_rgba(15,23,42,0.06)] transition-[border-color,box-shadow,background-color] duration-150 motion-reduce:transition-none",
        !isCurrentMonth && "border-[color:var(--sh-gray-200)]/70 bg-[color:var(--sh-gray)]/75",
        isToday &&
          "border-brand bg-blurple-50/80 shadow-[0_0_0_1px_rgba(79,70,229,0.24),0_14px_24px_-16px_rgba(79,70,229,0.5)]",
        isFocused && "ring-2 ring-brand ring-offset-2 ring-offset-white",
        todayContainerClassName && isToday && todayContainerClassName,
        className,
      )}
    >
      <div
        className={cn(
          "flex items-center justify-between gap-2 border-b border-[color:var(--sh-gray-200)]/80 px-3 py-2",
          headerClassName,
        )}
      >
        <div className="inline-flex items-center gap-1.5">
          <p
            className={cn(
              "text-sm font-semibold text-ink",
              !isCurrentMonth && "text-navy-500/60",
              !isToday && isCurrentMonth && "text-ink",
              isToday && "text-blurple-700",
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
              className="h-1.5 w-1.5 rounded-full bg-brand"
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
