"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AppIcon, type AppIconName } from "@/lib/icons";
import { setDashboardFilterIntent } from "@/lib/dashboard-filter-state";
import {
  ACTIVE_PUBLISHER_STATUSES,
  ACTIVE_SOCIAL_STATUSES,
  ACTIVE_WRITER_STATUSES,
  validateTaskLogicConsistency,
} from "@/lib/task-logic";
import { useAuth } from "@/providers/auth-provider";
import {
  getApiErrorMessage,
  isApiFailure,
  parseApiResponseJson,
} from "@/lib/api-response";

interface DashboardSummary {
  writerCounts: Record<string, number>;
  publisherCounts: Record<string, number>;
  socialPostCounts: Record<string, number>;
  userRoles: string[];
}
interface SnapshotTask {
  id: string;
  title: string;
  kind: "blog" | "social";
  href: string;
  statusLabel: string;
  scheduledDate: string | null;
  actionState: "action_required" | "waiting_on_others";
}
interface TasksSnapshot {
  requiredByMe: SnapshotTask[];
  waitingOnOthers: SnapshotTask[];
}

interface WorkBucket {
  id: string;
  title: string;
  count: number;
  href: string;
  icon: AppIconName;
  priority: "high" | "normal";
}

const LOADING_MESSAGES = [
  "Preparing your standup...",
  "Gathering your work queue...",
  "Loading your dashboard...",
  "Setting up your workspace...",
  "Syncing your tasks...",
  "Getting you ready to go...",
] as const;

export default function HomePage() {
  const { session, profile, loading: authLoading } = useAuth();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [tasksSnapshot, setTasksSnapshot] = useState<TasksSnapshot>({
    requiredByMe: [],
    waitingOnOthers: [],
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loadingMessage] = useState(
    () => LOADING_MESSAGES[Math.floor(Math.random() * LOADING_MESSAGES.length)]
  );

  const getUserDisplayName = () => {
    return profile?.display_name || profile?.full_name || "there";
  };
  const requiredByLabel = profile?.display_name || profile?.full_name || "You";

  const getRoleDisplay = () => {
    if (!summary?.userRoles) return "";
    return summary.userRoles.join(", ");
  };

  const shouldShowMultiRoleNote = summary && summary.userRoles.length > 1;

  useEffect(() => {
    // Wait for auth to fully load before fetching summary
    // This ensures we have a valid session and avoid race conditions on OAuth redirect
    if (authLoading || !session?.access_token) {
      if (!authLoading && !session) {
        setIsLoading(false);
      }
      return;
    }

    const fetchSummary = async () => {
      try {
        const [summaryResponse, snapshotResponse] = await Promise.all([
          fetch("/api/dashboard/summary", {
            headers: {
              authorization: `Bearer ${session.access_token}`,
            },
          }),
          fetch("/api/dashboard/tasks-snapshot", {
            headers: {
              authorization: `Bearer ${session.access_token}`,
            },
          }),
        ]);
        const summaryPayload = await parseApiResponseJson<DashboardSummary>(
          summaryResponse
        );
        if (isApiFailure(summaryResponse, summaryPayload)) {
          throw new Error(
            getApiErrorMessage(summaryPayload, "Failed to fetch work summary")
          );
        }
        setSummary(summaryPayload);
        const snapshotPayload = await parseApiResponseJson<TasksSnapshot>(
          snapshotResponse
        );
        if (!isApiFailure(snapshotResponse, snapshotPayload)) {
          setTasksSnapshot(snapshotPayload);
        } else {
          setTasksSnapshot({ requiredByMe: [], waitingOnOthers: [] });
        }
        setError(null);
      } catch (err) {
        console.error("Dashboard summary load failed:", err);
        setError("Couldn't load dashboard summary. Please try again.");
        setSummary(null);
        setTasksSnapshot({ requiredByMe: [], waitingOnOthers: [] });
      } finally {
        setIsLoading(false);
      }
    };

    void fetchSummary();
  }, [session, session?.access_token, authLoading]);

  const buildWorkBuckets = (data: DashboardSummary): WorkBucket[] => {
    const buckets: WorkBucket[] = [];

    if (data.userRoles.includes("writer") || data.userRoles.includes("admin")) {
      const needsRevision = data.writerCounts.needs_revision ?? 0;
      const inProgress = data.writerCounts.in_progress ?? 0;
      const pendingReview = data.writerCounts.pending_review ?? 0;
      const completed = data.writerCounts.completed ?? 0;
      const notStarted = data.writerCounts.not_started ?? 0;

      if (needsRevision > 0) {
        buckets.push({
          id: "writer-needs-revision",
          title: "Awaiting Your Revision",
          count: needsRevision,
          href: "/dashboard",
          icon: "warning",
          priority: "high",
        });
      }

      if (inProgress > 0) {
        buckets.push({
          id: "writer-in-progress",
          title: "Writing in Progress",
          count: inProgress,
          href: "/dashboard",
          icon: "writing",
          priority: "normal",
        });
      }

      if (pendingReview > 0) {
        buckets.push({
          id: "writer-pending-review",
          title: "Submitted for Editorial Review",
          count: pendingReview,
          href: "/dashboard",
          icon: "writing",
          priority: "normal",
        });
      }

      if (completed > 0) {
        buckets.push({
          id: "writer-completed",
          title: "Writing Approved",
          count: completed,
          href: "/dashboard",
          icon: "check",
          priority: "normal",
        });
      }

      if (notStarted > 0 && data.userRoles.includes("admin")) {
        buckets.push({
          id: "writer-not-started",
          title: "Not Started (Admin View)",
          count: notStarted,
          href: "/dashboard",
          icon: "home",
          priority: "normal",
        });
      }
    }

    if (data.userRoles.includes("publisher") || data.userRoles.includes("admin")) {
      const inProgress = data.publisherCounts.in_progress ?? 0;
      const pendingReview = data.publisherCounts.pending_review ?? 0;
      const publisherApproved = data.publisherCounts.publisher_approved ?? 0;
      const completed = data.publisherCounts.completed ?? 0;
      const notStarted = data.publisherCounts.not_started ?? 0;

      if (inProgress > 0) {
        buckets.push({
          id: "publisher-in-progress",
          title: "Awaiting Publishing Approval",
          count: inProgress,
          href: "/dashboard",
          icon: "warning",
          priority: "high",
        });
      }

      if (pendingReview > 0) {
        buckets.push({
          id: "publisher-pending-review",
          title: "Awaiting Publishing Review",
          count: pendingReview,
          href: "/dashboard",
          icon: "warning",
          priority: "high",
        });
      }

      if (publisherApproved > 0) {
        buckets.push({
          id: "publisher-approved",
          title: "Publishing Approved — Ready to Publish",
          count: publisherApproved,
          href: "/dashboard",
          icon: "check",
          priority: "high",
        });
      }

      if (completed > 0) {
        buckets.push({
          id: "publisher-completed",
          title: "Published",
          count: completed,
          href: "/dashboard",
          icon: "check",
          priority: "normal",
        });
      }

      if (notStarted > 0) {
        buckets.push({
          id: "publisher-not-started",
          title: "Awaiting Publishing Review",
          count: notStarted,
          href: "/dashboard",
          icon: "home",
          priority: "normal",
        });
      }
    }

    if (
      data.userRoles.includes("admin") ||
      data.userRoles.includes("publisher") ||
      data.userRoles.includes("editor") ||
      data.userRoles.includes("writer")
    ) {
      const draft = data.socialPostCounts.draft ?? 0;
      const changesRequested = data.socialPostCounts.changes_requested ?? 0;
      const inReview = data.socialPostCounts.in_review ?? 0;
      const creativeApproved = data.socialPostCounts.creative_approved ?? 0;
      const readyToPublish = data.socialPostCounts.ready_to_publish ?? 0;
      const awaitingLink = data.socialPostCounts.awaiting_live_link ?? 0;

      if (draft > 0) {
        buckets.push({
          id: "social-draft",
          title: "Social Posts in Draft",
          count: draft,
          href: "/social-posts",
          icon: "writing",
          priority: "normal",
        });
      }

      if (changesRequested > 0) {
        buckets.push({
          id: "social-changes-requested",
          title: "Social Posts Need Changes",
          count: changesRequested,
          href: "/social-posts",
          icon: "warning",
          priority: "high",
        });
      }

      if (readyToPublish > 0) {
        buckets.push({
          id: "social-ready-to-publish",
          title: "Social Posts Ready to Publish",
          count: readyToPublish,
          href: "/social-posts",
          icon: "writing",
          priority: "high",
        });
      }

      if (awaitingLink > 0) {
        buckets.push({
          id: "social-awaiting-live-link",
          title: "Social Posts Awaiting Live Link",
          count: awaitingLink,
          href: "/social-posts",
          icon: "warning",
          priority: "high",
        });
      }

      if (inReview > 0) {
        buckets.push({
          id: "social-in-review",
          title: "Social Posts in Review",
          count: inReview,
          href: "/social-posts",
          icon: "writing",
          priority: "normal",
        });
      }

      if (creativeApproved > 0) {
        buckets.push({
          id: "social-creative-approved",
          title: "Social Posts Creative Approved",
          count: creativeApproved,
          href: "/social-posts",
          icon: "check",
          priority: "normal",
        });
      }
    }

    const sorted = buckets.sort((a, b) => {
      if (a.priority === "high" && b.priority !== "high") return -1;
      if (a.priority !== "high" && b.priority === "high") return 1;
      return b.count - a.count;
    });

    validateTaskLogicConsistency(
      {
        writerCounts: Object.keys(data.writerCounts),
        publisherCounts: Object.keys(data.publisherCounts),
        socialPostCounts: Object.keys(data.socialPostCounts),
      },
      sorted.map((b) => b.id)
    );

    return sorted;
  };

  const workBuckets = summary ? buildWorkBuckets(summary) : [];
  const hasWork = workBuckets.length > 0;
  const hasSnapshotItems =
    tasksSnapshot.requiredByMe.length > 0 || tasksSnapshot.waitingOnOthers.length > 0;
  const hasAnyWork = hasWork || hasSnapshotItems;

  const handleBucketClick = (bucket: WorkBucket) => {
    // Determine filter type and value based on bucket ID
    if (bucket.id.startsWith("writer-")) {
      // Derived from ACTIVE_WRITER_STATUSES — stays in sync automatically
      const statusMap: Record<string, string> = Object.fromEntries(
        ACTIVE_WRITER_STATUSES.map((s) => [`writer-${s.replace(/_/g, "-")}`, s])
      );
      const value = statusMap[bucket.id];
      if (value) {
        setDashboardFilterIntent({ type: "writer_status", value });
      }
    } else if (bucket.id.startsWith("publisher-")) {
      const statusMap: Record<string, string> = {
        "publisher-in-progress": "in_progress",
        "publisher-pending-review": "pending_review",
        "publisher-approved": "publisher_approved",
        "publisher-completed": "completed",
        "publisher-not-started": "not_started",
      };
      const value = statusMap[bucket.id];
      if (value) {
        setDashboardFilterIntent({ type: "publisher_status", value });
      }
    } else if (bucket.id.startsWith("social-")) {
      // Derived from ACTIVE_SOCIAL_STATUSES — stays in sync automatically
      const statusMap: Record<string, string> = Object.fromEntries(
        ACTIVE_SOCIAL_STATUSES.map((s) => [`social-${s.replace(/_/g, "-")}`, s])
      );
      const value = statusMap[bucket.id];
      if (value) {
        setDashboardFilterIntent({ type: "social_status", value });
      }
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-100 via-slate-50 to-white px-4 py-12 sm:px-6 lg:py-20">
      <div className="mx-auto max-w-5xl">
        <section className="rounded-2xl border border-slate-200 bg-white/95 p-8 shadow-sm backdrop-blur-sm sm:p-10">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <h1 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
                Hi {getUserDisplayName()},
              </h1>
            </div>
            {summary && getRoleDisplay() && (
              <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-slate-600 whitespace-nowrap">
                {getRoleDisplay()}
                {shouldShowMultiRoleNote && " (Multiple roles)"}
              </span>
            )}
          </div>
          <p className="mt-3 max-w-2xl text-base text-slate-600 sm:text-lg">
            {isLoading
              ? loadingMessage
              : hasAnyWork
              ? "Jump into what needs your attention now."
              : "All caught up—no pending work right now."}
          </p>
        </section>

        {error && (
          <div className="mt-6 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
            {error}
          </div>
        )}

        {!isLoading && hasWork && (
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {workBuckets.map((bucket) => (
              <Link
                key={bucket.id}
                href="/tasks"
                onClick={() => handleBucketClick(bucket)}
                className={`group rounded-xl border p-4 transition sm:p-5 ${
                  bucket.priority === "high"
                    ? "border-rose-300 bg-rose-50 text-slate-900 hover:border-rose-400 hover:bg-rose-100 active:bg-slate-900 active:text-white active:border-slate-900"
                    : "border-slate-200 bg-white text-slate-900 hover:border-slate-300 hover:bg-slate-50 active:bg-slate-900 active:text-white active:border-slate-900"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <AppIcon
                    name={bucket.icon}
                    boxClassName={`h-9 w-9 rounded-lg border ${
                      bucket.priority === "high"
                        ? "border-rose-200 bg-rose-100 text-rose-600"
                        : "border-slate-200 bg-slate-50 text-slate-700"
                    }`}
                    size={17}
                  />
                  <span
                    className={`inline-flex items-center justify-center rounded-full px-2 py-1 text-xs font-semibold ${
                      bucket.priority === "high"
                        ? "bg-rose-200 text-rose-800"
                        : "bg-slate-200 text-slate-800"
                    }`}
                  >
                    {bucket.count}
                  </span>
                </div>
                <h2 className="mt-4 text-base font-semibold text-slate-900 group-active:text-white">
                  {bucket.title}
                </h2>
              </Link>
            ))}
          </div>
        )}

        {!isLoading && hasSnapshotItems && (
          <section className="mt-6 rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-base font-semibold text-slate-900">My Tasks Snapshot</h2>
              <Link
                href="/tasks"
                className="text-sm font-medium text-slate-700 underline-offset-2 hover:text-slate-900 hover:underline"
              >
                View all
              </Link>
            </div>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Required by: {requiredByLabel}
                </p>
                {tasksSnapshot.requiredByMe.length === 0 ? (
                  <p className="mt-2 text-sm text-slate-500">No items right now.</p>
                ) : (
                  <ul className="mt-2 space-y-2">
                    {tasksSnapshot.requiredByMe.map((task) => (
                      <li key={task.id}>
                        <Link
                          href={task.href}
                          className="block rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 transition hover:bg-slate-100"
                        >
                          <p className="truncate text-sm font-medium text-slate-900">{task.title}</p>
                          <p className="mt-1 text-xs text-slate-600">
                            {task.kind === "blog" ? "Blog" : "Social"} · {task.statusLabel}
                            {task.scheduledDate ? ` · ${task.scheduledDate}` : ""}
                          </p>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Waiting on Others
                </p>
                {tasksSnapshot.waitingOnOthers.length === 0 ? (
                  <p className="mt-2 text-sm text-slate-500">No waiting items right now.</p>
                ) : (
                  <ul className="mt-2 space-y-2">
                    {tasksSnapshot.waitingOnOthers.map((task) => (
                      <li key={task.id}>
                        <Link
                          href={task.href}
                          className="block rounded-lg border border-slate-200 bg-white px-3 py-2 transition hover:bg-slate-50"
                        >
                          <p className="truncate text-sm font-medium text-slate-900">{task.title}</p>
                          <p className="mt-1 text-xs text-slate-600">
                            {task.kind === "blog" ? "Blog" : "Social"} · {task.statusLabel}
                            {task.scheduledDate ? ` · ${task.scheduledDate}` : ""}
                          </p>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </section>
        )}

        {!isLoading && !hasAnyWork && !error && (
          <div className="mt-6 rounded-xl border border-slate-200 bg-white p-8 text-center">
            <AppIcon
              name="check"
              boxClassName="h-12 w-12 mx-auto"
              size={32}
              className="text-emerald-600"
            />
            <h2 className="mt-4 text-lg font-semibold text-slate-900">
              All work is on track
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              No items awaiting action right now.
              {shouldShowMultiRoleNote &&
                " No blogs need writing, and all completed writing is approved for publishing."}
            </p>
          </div>
        )}

        {error && (
          <div className="mt-6 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
            {error}
          </div>
        )}

        {isLoading && (
          <div className="mt-6 rounded-xl border border-slate-200 bg-white p-8 text-center">
            <div className="inline-flex animate-spin rounded-full border-4 border-slate-300 border-t-slate-900 h-8 w-8" />
            <p className="mt-4 text-sm text-slate-600">{loadingMessage}</p>
            <p className="mt-1 text-xs text-slate-500">Welcome back.</p>
          </div>
        )}

        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/dashboard"
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            Go to Dashboard
          </Link>
          <Link
            href="/calendar"
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            View Calendar
          </Link>
        </div>
      </div>
    </main>
  );
}
