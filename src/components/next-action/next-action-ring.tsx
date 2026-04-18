"use client";

import type { PreflightReport } from "@/lib/preflight";
import { cn } from "@/lib/utils";

/**
 * <NextActionRing /> — circular progress ring visualising preflight
 * readiness for a record. Renders next to the status cell so users can
 * see "3 of 5 fields complete" at a glance.
 *
 * Data comes from the centralized preflight helpers in src/lib/preflight.ts.
 * Behavior is read-only — it does not drive transitions.
 */
export function NextActionRing({
  report,
  size = 18,
  className,
}: {
  report: PreflightReport;
  size?: number;
  className?: string;
}) {
  const radius = (size - 3) / 2;
  const circumference = 2 * Math.PI * radius;

  const totalRequired = Math.max(report.requiredCount, 1);
  const missingCount = report.missing.length;
  const completedCount = Math.max(0, report.requiredCount - missingCount);
  const progress = Math.max(0, Math.min(1, completedCount / totalRequired));
  const dashOffset = circumference * (1 - progress);

  const stroke = report.ready
    ? "stroke-emerald-500"
    : missingCount === report.requiredCount
      ? "stroke-[color:var(--sh-gray-400)]"
      : "stroke-amber-500";

  const label = report.ready
    ? "All required fields complete"
    : `${completedCount} of ${report.requiredCount} required fields complete`;

  return (
    <span
      role="img"
      aria-label={label}
      title={label}
      className={cn("inline-flex items-center justify-center", className)}
      style={{ width: size, height: size }}
    >
      <svg
        viewBox={`0 0 ${size} ${size}`}
        width={size}
        height={size}
        aria-hidden="true"
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          className="stroke-[color:var(--sh-gray-200)]"
          strokeWidth={2}
          fill="none"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          className={cn("transition-[stroke-dashoffset] duration-200", stroke)}
          strokeWidth={2}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
    </span>
  );
}
