"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AppIcon, type AppIconName } from "@/lib/icons";
import { setDashboardFilterIntent } from "@/lib/dashboard-filter-state";
import { useAuth } from "@/providers/auth-provider";

interface DashboardSummary {
  writerCounts: Record<string, number>;
  publisherCounts: Record<string, number>;
  socialPostCounts: Record<string, number>;
  userRoles: string[];
}

interface WorkBucket {
  id: string;
  title: string;
  count: number;
  href: string;
  icon: AppIconName;
  priority: "high" | "normal";
}

export default function HomePage() {
  const { session, profile } = useAuth();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const getUserDisplayName = () => {
    return profile?.display_name || profile?.full_name || "there";
  };

  const getRoleDisplay = () => {
    if (!summary?.userRoles) return "";
    return summary.userRoles.join(", ");
  };

  const shouldShowMultiRoleNote = summary && summary.userRoles.length > 1;

  useEffect(() => {
    if (!session?.access_token) {
      setIsLoading(false);
      return;
    }
    const fetchSummary = async () => {
      try {

        const response = await fetch("/api/dashboard/summary", {
          headers: {
            authorization: `Bearer ${session.access_token}`,
          },
        });
        if (!response.ok) {
          throw new Error("Failed to fetch work summary");
        }
        const data = (await response.json()) as DashboardSummary;
        setSummary(data);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error loading summary");
        setSummary(null);
      } finally {
        setIsLoading(false);
      }
    };

    void fetchSummary();
  }, [session?.access_token]);

  const buildWorkBuckets = (data: DashboardSummary): WorkBucket[] => {
    const buckets: WorkBucket[] = [];

    if (data.userRoles.includes("writer") || data.userRoles.includes("admin")) {
      const needsRevision = data.writerCounts.needs_revision ?? 0;
      const inProgress = data.writerCounts.in_progress ?? 0;
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

    if (data.userRoles.includes("admin") || data.userRoles.includes("publisher")) {
      const awaitingLink = data.socialPostCounts.awaiting_live_link ?? 0;
      const inReview = data.socialPostCounts.in_review ?? 0;

      if (awaitingLink > 0) {
        buckets.push({
          id: "social-awaiting-link",
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
    }

    return buckets.sort((a, b) => {
      if (a.priority === "high" && b.priority !== "high") return -1;
      if (a.priority !== "high" && b.priority === "high") return 1;
      return b.count - a.count;
    });
  };

  const workBuckets = summary ? buildWorkBuckets(summary) : [];
  const hasWork = workBuckets.length > 0;

  const handleBucketClick = (bucket: WorkBucket) => {
    // Determine filter type and value based on bucket ID
    if (bucket.id.startsWith("writer-")) {
      const statusMap: Record<string, string> = {
        "writer-needs-revision": "needs_revision",
        "writer-in-progress": "in_progress",
        "writer-completed": "completed",
        "writer-not-started": "not_started",
      };
      const value = statusMap[bucket.id];
      if (value) {
        setDashboardFilterIntent({ type: "writer_status", value });
      }
    } else if (bucket.id.startsWith("publisher-")) {
      const statusMap: Record<string, string> = {
        "publisher-in-progress": "in_progress",
        "publisher-completed": "completed",
        "publisher-not-started": "not_started",
      };
      const value = statusMap[bucket.id];
      if (value) {
        setDashboardFilterIntent({ type: "publisher_status", value });
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
              ? "Loading your work queue..."
              : hasWork
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

        {!isLoading && !hasWork && !error && (
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
            <p className="mt-4 text-sm text-slate-600">Loading your work queue...</p>
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
