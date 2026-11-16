"use client";

import type { ReactNode } from "react";
import Link from "next/link";

import {
  setDashboardFilterIntent,
  type DashboardFilterIntent,
} from "@/lib/dashboard-filter-state";

/** Home tile: opens My Tasks pre-filtered to the tile's stage and status. */
export function HomeBucketLink({
  intent,
  className,
  children,
}: {
  intent: DashboardFilterIntent;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Link
      href="/tasks"
      onClick={() => setDashboardFilterIntent(intent)}
      className={className}
    >
      {children}
    </Link>
  );
}
