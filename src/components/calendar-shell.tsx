import type { ReactNode, Ref } from "react";

import { cn } from "@/lib/utils";

export function CalendarWeekdayHeaderRow({
  labels,
  todayColumnIndex,
  className,
}: {
  labels: string[];
  todayColumnIndex?: number | null;
  className?: string;
}) {
  return (
    <div className={cn("grid grid-cols-7 gap-2", className)}>
      {labels.map((label, index) => (
        <div key={`${label}-${index}`} className="flex flex-col items-center justify-center gap-1">
          {todayColumnIndex === index ? (
            <span className="h-1.5 w-1.5 rounded-full bg-brand" />
          ) : (
            <span className="h-1.5 w-1.5 rounded-full bg-transparent" />
          )}
          <p className="text-center text-xs font-semibold uppercase tracking-wide text-navy-500">
            {label}
          </p>
        </div>
      ))}
    </div>
  );
}

export function CalendarGridSurface({
  children,
  gridRef,
  surfaceClassName,
  gridClassName,
  containLayout = false,
}: {
  children: ReactNode;
  gridRef?: Ref<HTMLDivElement>;
  surfaceClassName?: string;
  gridClassName?: string;
  containLayout?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border border-[color:var(--sh-gray-200)]/90 bg-[color:var(--sh-gray)]/70 p-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]",
        surfaceClassName
      )}
    >
      <div
        ref={gridRef}
        className={cn("grid grid-cols-7 gap-2", gridClassName)}
        style={containLayout ? { contain: "layout" } : undefined}
      >
        {children}
      </div>
    </div>
  );
}
