"use client";

import { cn } from "@/lib/utils";

/**
 * Skeleton primitive.
 *
 * Paired with the `.skeleton` keyframe defined in globals.css. Use in place
 * of centered spinners on tables, drawers, and detail pages per the UX
 * upgrade plan.
 *
 * Respects reduced-motion via CSS (shimmer paused in globals.css when
 * `prefers-reduced-motion` is set — shimmer is cosmetic, not required).
 */
export function Skeleton({
  className,
  style,
}: {
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      aria-hidden="true"
      className={cn("skeleton", className)}
      style={style}
    />
  );
}

/**
 * Compact skeleton row matching the compact density table height.
 * Renders configurable column widths so a list can mirror the final layout.
 */
export function TableSkeletonRow({
  columns,
  className,
}: {
  columns: Array<number | string>;
  className?: string;
}) {
  return (
    <div
      role="presentation"
      className={cn(
        "grid items-center gap-3 px-3 py-2 border-b border-slate-100",
        className
      )}
      style={{
        gridTemplateColumns: columns
          .map((width) =>
            typeof width === "number" ? `${width}fr` : width
          )
          .join(" "),
      }}
    >
      {columns.map((_, index) => (
        <Skeleton key={index} className="h-4 w-full" />
      ))}
    </div>
  );
}

/**
 * Full table skeleton — N rows by default. Use on first-page loads where
 * the table shape is known up-front.
 */
export function TableSkeleton({
  rows = 8,
  columns,
  className,
}: {
  rows?: number;
  columns: Array<number | string>;
  className?: string;
}) {
  return (
    <div className={cn("w-full", className)}>
      {Array.from({ length: rows }).map((_, index) => (
        <TableSkeletonRow key={index} columns={columns} />
      ))}
    </div>
  );
}

/**
 * Detail drawer skeleton — title, meta row, two body blocks.
 * Use while record data is in flight on detail drawer / detail page.
 */
export function DetailSkeleton() {
  return (
    <div className="flex flex-col gap-4 p-5">
      <Skeleton className="h-7 w-3/5" />
      <div className="flex gap-3">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-24" />
      </div>
      <div className="flex flex-col gap-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-11/12" />
        <Skeleton className="h-4 w-10/12" />
      </div>
      <div className="mt-3 flex flex-col gap-2">
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-20 w-full" />
      </div>
    </div>
  );
}
