"use client";

import { format } from "date-fns";

import type { QuickQueueKey } from "@/app/dashboard/page";

type QuickQueueCounts = {
  writerInProgress: number;
  writerNeedsRevision: number;
  writerCompletedWaitingPublishing: number;
  backlogUnscheduledIdeas: number;
  publisherNotStarted: number;
  publisherInProgress: number;
  publisherFinalReview: number;
  publisherPublished: number;
};

type RecentlyPublishedItem = {
  id: string;
  site: string;
  title: string;
  actual_published_at: string | null;
  published_at: string | null;
};

export function DashboardSidebar({
  quickQueueCounts,
  activeQuickQueue,
  recentlyPublished,
  onApplyQuickQueueFilter,
  onOpenBlog,
}: {
  quickQueueCounts: QuickQueueCounts;
  activeQuickQueue: QuickQueueKey | null;
  recentlyPublished: RecentlyPublishedItem | null;
  onApplyQuickQueueFilter: (queue: QuickQueueKey) => void;
  onOpenBlog: (blogId: string) => void;
}) {
  const writingItems: Array<{ key: QuickQueueKey; label: string; count: number }> = [
    {
      key: "writer_in_progress",
      label: "Drafting",
      count: quickQueueCounts.writerInProgress,
    },
    {
      key: "writer_needs_revision",
      label: "Needs Revision",
      count: quickQueueCounts.writerNeedsRevision,
    },
    {
      key: "writer_completed_waiting_publish",
      label: "Ready for Publishing",
      count: quickQueueCounts.writerCompletedWaitingPublishing,
    },
    {
      key: "backlog_unscheduled",
      label: "Backlog",
      count: quickQueueCounts.backlogUnscheduledIdeas,
    },
  ];

  const publishingItems: Array<{ key: QuickQueueKey; label: string; count: number }> = [
    {
      key: "publisher_not_started",
      label: "Not Started",
      count: quickQueueCounts.publisherNotStarted,
    },
    {
      key: "publisher_in_progress",
      label: "In Progress",
      count: quickQueueCounts.publisherInProgress,
    },
    {
      key: "publisher_final_review",
      label: "Final Review",
      count: quickQueueCounts.publisherFinalReview,
    },
    {
      key: "publisher_published",
      label: "Published",
      count: quickQueueCounts.publisherPublished,
    },
  ];

  const publishedAt =
    recentlyPublished?.actual_published_at ?? recentlyPublished?.published_at ?? null;
  const publishedDateLabel =
    publishedAt ? format(new Date(publishedAt), "MMM d") : null;
  const siteIndicator =
    recentlyPublished?.site === "sighthound.com"
      ? "SH"
      : recentlyPublished?.site === "redactor.com"
        ? "RED"
        : "";

  return (
    <div className="space-y-3">
      <details className="rounded-md border border-slate-200 bg-slate-50">
        <summary className="cursor-pointer px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-600">
          Writing Filters
        </summary>
        <div className="space-y-1 border-t border-slate-200 p-2">
          {writingItems.map((item) => (
            <button
              key={item.key}
              type="button"
              className={`flex w-full items-center justify-between rounded px-2 py-1.5 text-left text-xs transition ${
                activeQuickQueue === item.key
                  ? "bg-slate-900 text-white"
                  : "text-slate-700 hover:bg-white"
              }`}
              onClick={() => {
                onApplyQuickQueueFilter(item.key);
              }}
            >
              <span>{item.label}</span>
              <span className="tabular-nums">{item.count}</span>
            </button>
          ))}
        </div>
      </details>

      <details className="rounded-md border border-slate-200 bg-slate-50">
        <summary className="cursor-pointer px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-600">
          Publishing Filters
        </summary>
        <div className="space-y-1 border-t border-slate-200 p-2">
          {publishingItems.map((item) => (
            <button
              key={item.key}
              type="button"
              className={`flex w-full items-center justify-between rounded px-2 py-1.5 text-left text-xs transition ${
                activeQuickQueue === item.key
                  ? "bg-slate-900 text-white"
                  : "text-slate-700 hover:bg-white"
              }`}
              onClick={() => {
                onApplyQuickQueueFilter(item.key);
              }}
            >
              <span>{item.label}</span>
              <span className="tabular-nums">{item.count}</span>
            </button>
          ))}
        </div>
      </details>

      <div className="rounded-md border border-slate-200 bg-slate-50 p-2">
        <p className="px-1 text-xs font-semibold uppercase tracking-wide text-slate-600">
          Recently Published
        </p>
        {recentlyPublished ? (
          <button
            type="button"
            className="mt-2 block w-full rounded border border-slate-200 bg-white px-2 py-2 text-left hover:bg-slate-50"
            onClick={() => {
              onOpenBlog(recentlyPublished.id);
            }}
          >
            <p className="text-[11px] text-slate-500">
              {publishedDateLabel ?? "—"} {siteIndicator ? `· ${siteIndicator}` : ""}
            </p>
            <p className="mt-0.5 truncate text-xs font-medium text-slate-800">
              {recentlyPublished.title}
            </p>
          </button>
        ) : (
          <p className="mt-2 px-1 text-xs text-slate-500">No recently published blogs.</p>
        )}
      </div>
    </div>
  );
}
