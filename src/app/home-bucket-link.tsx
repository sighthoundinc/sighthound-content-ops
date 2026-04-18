"use client";

import type { ReactNode } from "react";
import Link from "next/link";

import { setDashboardFilterIntent } from "@/lib/dashboard-filter-state";
import {
  ACTIVE_SOCIAL_STATUSES,
  ACTIVE_WRITER_STATUSES,
} from "@/lib/task-logic";

// Static lookup maps hoisted to module scope — computed ONCE at module load
// instead of on every click. Keeps the click handler small and allocation-free.
const WRITER_STATUS_MAP: Record<string, string> = Object.fromEntries(
  ACTIVE_WRITER_STATUSES.map((s) => [`writer-${s.replace(/_/g, "-")}`, s])
);

const PUBLISHER_STATUS_MAP: Record<string, string> = {
  "publisher-in-progress": "in_progress",
  "publisher-pending-review": "pending_review",
  "publisher-approved": "publisher_approved",
  "publisher-completed": "completed",
  "publisher-not-started": "not_started",
};

const SOCIAL_STATUS_MAP: Record<string, string> = Object.fromEntries(
  ACTIVE_SOCIAL_STATUSES.map((s) => [`social-${s.replace(/_/g, "-")}`, s])
);

function recordFilterIntent(bucketId: string) {
  if (bucketId.startsWith("writer-")) {
    const value = WRITER_STATUS_MAP[bucketId];
    if (value) setDashboardFilterIntent({ type: "writer_status", value });
  } else if (bucketId.startsWith("publisher-")) {
    const value = PUBLISHER_STATUS_MAP[bucketId];
    if (value) setDashboardFilterIntent({ type: "publisher_status", value });
  } else if (bucketId.startsWith("social-")) {
    const value = SOCIAL_STATUS_MAP[bucketId];
    if (value) setDashboardFilterIntent({ type: "social_status", value });
  }
}

export function HomeBucketLink({
  bucketId,
  className,
  children,
}: {
  bucketId: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Link
      href="/tasks"
      onClick={() => recordFilterIntent(bucketId)}
      className={className}
    >
      {children}
    </Link>
  );
}
