// Server Component (no "use client"). The home page renders server-side
// using data fetched in fetchHomeData(); only the bucket tiles' onClick
// handler lives in a client component (HomeBucketLink).
//
// Disable Next's route-level caching: dashboard data is per-user and must
// not be collapsed across requests.

import type { Metadata } from "next";
import Link from "next/link";

import { AppShell } from "@/components/app-shell";

import { buttonClass } from "@/components/button";
import { AppIcon, CheckIcon } from "@/lib/icons";
import { pageTitle } from "@/lib/page-title";
import { UI_VOCAB } from "@/lib/ui-vocab";
import { formatDateOnly } from "@/lib/utils";

import { fetchHomeData } from "./home-data";
import { HomeBucketLink } from "./home-bucket-link";
import { buildWorkBuckets, isTerminalBucket } from "./home-work-buckets";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: pageTitle("Home") };

const SNAPSHOT_PREVIEW_LIMIT = 8;

export default async function HomePage() {
  const { displayName, summary, tasksSnapshot, error } = await fetchHomeData();

  const userName = displayName ?? "there";
  const roleList = summary?.userRoles ?? [];
  const roleDisplay = roleList.join(", ");
  const hasMultipleRoles = roleList.length > 1;

  const workBuckets = summary ? buildWorkBuckets(summary) : [];
  const hasWork = workBuckets.length > 0;
  const hasSnapshotItems =
    tasksSnapshot.requiredByMe.length > 0 ||
    tasksSnapshot.waitingOnOthers.length > 0;
  const hasAnyWork = hasWork || hasSnapshotItems;
  // Approved/published tiles are reference only; they must not make the
  // greeting claim there is something to act on.
  const hasPendingWork =
    workBuckets.some((bucket) => !isTerminalBucket(bucket)) || hasSnapshotItems;
  const attentionBuckets = workBuckets.filter((bucket) => bucket.priority === "high");
  const otherBuckets = workBuckets.filter((bucket) => bucket.priority !== "high");
  const bucketGroups = [
    { id: "attention", heading: "Needs attention", buckets: attentionBuckets },
    { id: "other", heading: "In progress and done", buckets: otherBuckets },
  ].filter((group) => group.buckets.length > 0);
  const requiredByLabel = displayName ?? "You";
  // Home is a snapshot, not the queue: show the first few of each list and
  // send the rest to My Tasks. Both lists arrive sorted by publish date.
  const requiredPreview = tasksSnapshot.requiredByMe.slice(0, SNAPSHOT_PREVIEW_LIMIT);
  const waitingPreview = tasksSnapshot.waitingOnOthers.slice(0, SNAPSHOT_PREVIEW_LIMIT);
  const hiddenRequiredCount = tasksSnapshot.requiredByMe.length - requiredPreview.length;
  const hiddenWaitingCount = tasksSnapshot.waitingOnOthers.length - waitingPreview.length;

  return (
    <AppShell>
      <div className="mx-auto max-w-6xl">
        <section className="relative overflow-hidden rounded-lg border border-[color:var(--sh-navy-700)] bg-ink p-8 shadow-brand-md sm:p-10">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blurple-100">
                Today&apos;s relay
              </p>
              <h1 className="mt-3 text-2xl font-semibold leading-snug tracking-tight text-white">
                Hi {userName},
              </h1>
            </div>
            {summary && roleDisplay && (
              <span className="inline-flex max-w-full flex-wrap items-center gap-x-2 gap-y-0.5 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-white">
                {roleDisplay}
                {hasMultipleRoles && " (Multiple roles)"}
              </span>
            )}
          </div>
          <p className="mt-3 max-w-2xl text-sm font-normal leading-6 text-white/70">
            {hasPendingWork
              ? "Jump into what needs your attention now."
              : error
                ? "We couldn’t load your work right now."
                : "All caught up—no pending work right now."}
          </p>
        </section>

        {error && (
          <div
            role="alert"
            className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800"
          >
            <span>{error}</span>
            <Link
              href="/"
              prefetch={false}
              className={buttonClass({ variant: "secondary", size: "sm" })}
            >
              {UI_VOCAB.errors.retry}
            </Link>
          </div>
        )}

        {bucketGroups.map((group) => (
          <section key={group.id} className="mt-6" aria-labelledby={`home-buckets-${group.id}`}>
            <h2
              id={`home-buckets-${group.id}`}
              className="text-xs font-semibold uppercase tracking-wide text-navy-500"
            >
              {group.heading}
            </h2>
          <div className="mt-2 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {group.buckets.map((bucket) => (
              <HomeBucketLink
                key={bucket.id}
                bucketId={bucket.id}
                className={`group pressable flex min-h-40 flex-col rounded-lg border p-5 shadow-brand-xs sm:p-6 ${
                  bucket.priority === "high"
                    ? "border-rose-300 bg-rose-50 text-ink hover:border-rose-400 hover:bg-rose-100 active:bg-ink active:text-white active:border-ink"
                    : "border-[color:var(--sh-gray-200)] bg-white text-ink hover:border-[color:var(--sh-gray-400)] hover:bg-blurple-50 active:bg-ink active:text-white active:border-ink"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <AppIcon
                    name={bucket.icon}
                    boxClassName={`h-9 w-9 rounded-lg border ${
                      bucket.priority === "high"
                        ? "border-rose-200 bg-rose-100 text-rose-600"
                        : "border-[color:var(--sh-gray-200)] bg-[color:var(--sh-gray)] text-navy-500"
                    }`}
                    size={17}
                  />
                  <span
                    className={`inline-flex items-center justify-center rounded-full px-2 py-1 text-xs font-semibold ${
                      bucket.priority === "high"
                        ? "bg-rose-200 text-rose-800"
                        : "bg-[color:var(--sh-gray-200)] text-ink"
                    }`}
                  >
                    {bucket.count}
                    <span className="sr-only"> {bucket.count === 1 ? "item" : "items"}:</span>
                  </span>
                </div>
                <h3 className="mt-auto pt-6 text-base font-semibold text-ink group-active:text-white">
                  {bucket.title}
                </h3>
              </HomeBucketLink>
            ))}
          </div>
          </section>
        ))}

        {hasSnapshotItems && (
          <section className="mt-6 rounded-lg border border-[color:var(--sh-gray-200)] bg-white p-5 shadow-brand-xs sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <h2 className="section-title">My Tasks Snapshot</h2>
              <Link
                href="/tasks"
                className="text-brand hover:text-blurple-700 text-sm font-medium underline-offset-2 hover:underline"
              >
                View all
              </Link>
            </div>
            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wide text-navy-500">
                  Required by: {requiredByLabel} ({tasksSnapshot.requiredByMe.length})
                </p>
                {tasksSnapshot.requiredByMe.length === 0 ? (
                  <p className="mt-2 text-sm text-navy-500">No items right now.</p>
                ) : (
                  <ul className="mt-2 space-y-2">
                    {requiredPreview.map((task) => (
                      <li key={task.id}>
                        <Link
                          href={task.href}
                          className="pressable block rounded-md border border-[color:var(--sh-gray-200)] bg-[color:var(--sh-gray)] px-3 py-2 hover:bg-blurple-50"
                        >
                          <p className="truncate text-sm font-medium text-ink">{task.title}</p>
                          <p className="mt-1 text-xs text-navy-500">
                            {task.kind === "blog" ? "Blog" : "Social"} · {task.statusLabel}
                            {task.scheduledDate ? ` · ${formatDateOnly(task.scheduledDate) || task.scheduledDate}` : ""}
                          </p>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
                {hiddenRequiredCount > 0 ? (
                  <Link
                    href="/tasks"
                    className="mt-2 inline-flex text-sm font-medium text-brand underline-offset-2 hover:text-blurple-700 hover:underline"
                  >
                    +{hiddenRequiredCount} more in My Tasks
                  </Link>
                ) : null}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wide text-navy-500">
                  Waiting on Others ({tasksSnapshot.waitingOnOthers.length})
                </p>
                {tasksSnapshot.waitingOnOthers.length === 0 ? (
                  <p className="mt-2 text-sm text-navy-500">No waiting items right now.</p>
                ) : (
                  <ul className="mt-2 space-y-2">
                    {waitingPreview.map((task) => (
                      <li key={task.id}>
                        <Link
                          href={task.href}
                          className="pressable block rounded-md border border-[color:var(--sh-gray-200)] bg-white px-3 py-2 hover:bg-blurple-50"
                        >
                          <p className="truncate text-sm font-medium text-ink">{task.title}</p>
                          <p className="mt-1 text-xs text-navy-500">
                            {task.kind === "blog" ? "Blog" : "Social"} · {task.statusLabel}
                            {task.scheduledDate ? ` · ${formatDateOnly(task.scheduledDate) || task.scheduledDate}` : ""}
                          </p>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
                {hiddenWaitingCount > 0 ? (
                  <Link
                    href="/tasks"
                    className="mt-2 inline-flex text-sm font-medium text-brand underline-offset-2 hover:text-blurple-700 hover:underline"
                  >
                    +{hiddenWaitingCount} more in My Tasks
                  </Link>
                ) : null}
              </div>
            </div>
          </section>
        )}

        {!hasAnyWork && !error && (
          <div className="mt-6 rounded-lg border border-[color:var(--sh-gray-200)] bg-white p-10 text-center shadow-brand-xs">
            <CheckIcon boxClassName="mx-auto h-12 w-12 rounded-lg border border-emerald-200 bg-emerald-50"
              size={32}
              className="text-emerald-600" />
            <h2 className="section-title mt-4">
              All work is on track
            </h2>
            <p className="body-text mt-2 text-navy-500">
              No items awaiting action right now.
              {hasMultipleRoles &&
                " No blogs need writing, and all completed writing is approved for publishing."}
            </p>
          </div>
        )}

        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/dashboard"
            className={buttonClass({ variant: "primary", size: "cta" })}
          >
            Go to Dashboard
          </Link>
          <Link
            href="/calendar"
            className={buttonClass({ variant: "secondary", size: "cta" })}
          >
            View Calendar
          </Link>
        </div>
      </div>
    </AppShell>
  );
}
