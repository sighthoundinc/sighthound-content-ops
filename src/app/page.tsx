// Server Component (no "use client"). The home page renders server-side
// using data fetched in fetchHomeData(); only the bucket tiles' onClick
// handler lives in a client component (HomeBucketLink).
//
// Disable Next's route-level caching: dashboard data is per-user and must
// not be collapsed across requests.

import Link from "next/link";

import { buttonClass } from "@/components/button";
import { AppIcon, CheckIcon } from "@/lib/icons";

import { fetchHomeData } from "./home-data";
import { HomeBucketLink } from "./home-bucket-link";
import { buildWorkBuckets } from "./home-work-buckets";

export const dynamic = "force-dynamic";

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
  const requiredByLabel = displayName ?? "You";

  return (
    <main className="min-h-screen bg-[color:var(--sh-gray)] px-4 py-8 sm:px-6 lg:py-12">
      <div className="mx-auto max-w-6xl">
        <section className="relative overflow-hidden rounded-lg border border-[color:var(--sh-navy-700)] bg-ink p-8 shadow-brand-md sm:p-10">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blurple-100">
                Today&apos;s relay
              </p>
              <h1 className="page-title mt-3 !text-white">
                Hi {userName},
              </h1>
            </div>
            {summary && roleDisplay && (
              <span className="inline-flex items-center gap-2 whitespace-nowrap rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-white">
                {roleDisplay}
                {hasMultipleRoles && " (Multiple roles)"}
              </span>
            )}
          </div>
          <p className="body-text mt-3 max-w-2xl !text-white/70">
            {hasAnyWork
              ? "Jump into what needs your attention now."
              : "All caught up—no pending work right now."}
          </p>
        </section>

        {error && (
          <div className="mt-6 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
            {error}
          </div>
        )}

        {hasWork && (
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {workBuckets.map((bucket) => (
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
                  </span>
                </div>
                <h2 className="mt-auto pt-6 text-base font-semibold text-ink group-active:text-white">
                  {bucket.title}
                </h2>
              </HomeBucketLink>
            ))}
          </div>
        )}

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
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-navy-500">
                  Required by: {requiredByLabel}
                </p>
                {tasksSnapshot.requiredByMe.length === 0 ? (
                  <p className="mt-2 text-sm text-navy-500">No items right now.</p>
                ) : (
                  <ul className="mt-2 space-y-2">
                    {tasksSnapshot.requiredByMe.map((task) => (
                      <li key={task.id}>
                        <Link
                          href={task.href}
                          className="pressable block rounded-md border border-[color:var(--sh-gray-200)] bg-[color:var(--sh-gray)] px-3 py-2 hover:bg-blurple-50"
                        >
                          <p className="truncate text-sm font-medium text-ink">{task.title}</p>
                          <p className="mt-1 text-xs text-navy-500">
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
                <p className="text-xs font-semibold uppercase tracking-wide text-navy-500">
                  Waiting on Others
                </p>
                {tasksSnapshot.waitingOnOthers.length === 0 ? (
                  <p className="mt-2 text-sm text-navy-500">No waiting items right now.</p>
                ) : (
                  <ul className="mt-2 space-y-2">
                    {tasksSnapshot.waitingOnOthers.map((task) => (
                      <li key={task.id}>
                        <Link
                          href={task.href}
                          className="pressable block rounded-md border border-[color:var(--sh-gray-200)] bg-white px-3 py-2 hover:bg-blurple-50"
                        >
                          <p className="truncate text-sm font-medium text-ink">{task.title}</p>
                          <p className="mt-1 text-xs text-navy-500">
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
    </main>
  );
}
