// Server Component (no "use client"). The home page renders server-side
// using data fetched in fetchHomeData(); only the bucket tiles' onClick
// handler lives in a client component (HomeBucketLink).
//
// Disable Next's route-level caching: dashboard data is per-user and must
// not be collapsed across requests.

import Link from "next/link";

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
    <main className="min-h-screen bg-gradient-to-b from-slate-100 via-slate-50 to-white px-4 py-12 sm:px-6 lg:py-20">
      <div className="mx-auto max-w-5xl">
        <section className="rounded-2xl border border-slate-200 bg-white/95 p-8 shadow-sm backdrop-blur-sm sm:p-10">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <h1 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
                Hi {userName},
              </h1>
            </div>
            {summary && roleDisplay && (
              <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-slate-600 whitespace-nowrap">
                {roleDisplay}
                {hasMultipleRoles && " (Multiple roles)"}
              </span>
            )}
          </div>
          <p className="mt-3 max-w-2xl text-base text-slate-600 sm:text-lg">
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
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {workBuckets.map((bucket) => (
              <HomeBucketLink
                key={bucket.id}
                bucketId={bucket.id}
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
              </HomeBucketLink>
            ))}
          </div>
        )}

        {hasSnapshotItems && (
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

        {!hasAnyWork && !error && (
          <div className="mt-6 rounded-xl border border-slate-200 bg-white p-8 text-center">
            <CheckIcon boxClassName="h-12 w-12 mx-auto"
              size={32}
              className="text-emerald-600" />
            <h2 className="mt-4 text-lg font-semibold text-slate-900">
              All work is on track
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              No items awaiting action right now.
              {hasMultipleRoles &&
                " No blogs need writing, and all completed writing is approved for publishing."}
            </p>
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
