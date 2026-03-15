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
}: CalendarTileProps) {
  return (
    <article
      className={cn(
        "min-h-28 rounded-md border border-neutral-200 bg-white p-2",
        !isCurrentMonth && "bg-neutral-50",
        isToday && "border-brand-400 bg-brand-50 shadow-sm",
        todayContainerClassName && isToday && todayContainerClassName,
        className,
      )}
    >
      <div
        className={cn(
          "mb-2 flex items-center justify-between gap-2",
          headerClassName,
        )}
      >
        <p
          className={cn(
            "text-sm font-medium text-neutral-900",
            !isCurrentMonth && "text-neutral-500",
            !isToday && isCurrentMonth && "text-neutral-900",
            isToday && "text-brand-700",
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
        {headerAction}
      </div>
      <div className={cn("space-y-1", bodyClassName)}>{children}</div>
    </article>
  );
}
