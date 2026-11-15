"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";

import { AppShell } from "@/components/app-shell";
import { EmptyState } from "@/components/empty-state";
import { LoadErrorState } from "@/components/load-error-state";
import { ProtectedPage } from "@/components/protected-page";
import { Skeleton } from "@/components/skeleton";
import { AppIcon, ArrowRightIcon, TaskIcon } from "@/lib/icons";
import { isApiFailure, parseApiResponseJson } from "@/lib/api-response";
import { UI_VOCAB } from "@/lib/ui-vocab";
import { formatDateInTimezone } from "@/lib/format-date";
import { useAuth } from "@/providers/auth-provider";
import { cn } from "@/lib/utils";

/**
 * Unified Inbox scaffold.
 *
 * Consolidates the user's pending actions from existing APIs:
 *   - /api/dashboard/tasks-snapshot   → required-by-me & waiting-on-others
 *   - /api/activity-feed              → recent activity
 *   - notifications provider state    → unread notifications
 *
 * This page is a scaffold intentionally — it ships the surface with
 * deep-link routing to detail pages. Archive/snooze wire-up requires
 * the `notification_states` migration (not in this change) and will
 * land in a follow-up PR without changing this component's contract.
 */

type InboxTab = "required" | "waiting" | "activity";

type SnapshotItem = {
  id: string;
  kind: "blog" | "social";
  title: string;
  href: string;
  statusLabel: string;
  updatedAt: string | null;
};

type ActivityItem = {
  id: string;
  kind: "blog" | "social";
  title: string;
  action: string;
  actor: string;
  createdAt: string;
  href: string;
};

export default function InboxPage() {
  return (
    <ProtectedPage>
      <AppShell>
        <InboxView />
      </AppShell>
    </ProtectedPage>
  );
}

function InboxView() {
  const { profile, session } = useAuth();
  const accessToken = session?.access_token ?? null;
  const [tab, setTab] = useState<InboxTab>("required");
  const [required, setRequired] = useState<SnapshotItem[]>([]);
  const [waiting, setWaiting] = useState<SnapshotItem[]>([]);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activityError, setActivityError] = useState<string | null>(null);

  const timezone = profile?.timezone ?? "America/New_York";

  const loadInbox = useCallback(async () => {
    if (!accessToken) {
      return;
    }
    setLoading(true);
    setError(null);
    const headers = { authorization: `Bearer ${accessToken}` };
    const [snapshotResponse, feedResponse] = await Promise.all([
      fetch("/api/dashboard/tasks-snapshot", { cache: "no-store", headers }).catch(
        () => null
      ),
      fetch("/api/activity-feed", { cache: "no-store", headers }).catch(
        () => null
      ),
    ]);

    // The task snapshot drives Required/Waiting. If it fails, the inbox
    // must show a failure, never the "all caught up" empty state.
    const snapshotPayload = snapshotResponse
      ? await parseApiResponseJson<{
          requiredByMe?: unknown;
          waitingOnOthers?: unknown;
        }>(snapshotResponse)
      : null;
    if (!snapshotResponse || isApiFailure(snapshotResponse, snapshotPayload)) {
      console.error("inbox snapshot load failed", snapshotResponse?.status);
      setRequired([]);
      setWaiting([]);
      setActivity([]);
      setError("Couldn’t load your inbox. Please try again.");
      setLoading(false);
      return;
    }
    setRequired(normalizeSnapshotItems(snapshotPayload?.requiredByMe));
    setWaiting(normalizeSnapshotItems(snapshotPayload?.waitingOnOthers));

    const feedPayload = feedResponse
      ? await parseApiResponseJson<{ data?: { activities?: unknown } }>(
          feedResponse
        )
      : null;
    if (!feedResponse || isApiFailure(feedResponse, feedPayload)) {
      console.error("inbox activity load failed", feedResponse?.status);
      setActivity([]);
      setActivityError("Couldn’t load recent activity. Please try again.");
    } else {
      setActivity(normalizeActivityItems(feedPayload?.data?.activities));
      setActivityError(null);
    }
    setLoading(false);
  }, [accessToken]);

  useEffect(() => {
    void loadInbox();
  }, [loadInbox]);

  const activeItems = useMemo(() => {
    if (tab === "required") {
      return required;
    }
    if (tab === "waiting") {
      return waiting;
    }
    return activity;
  }, [tab, required, waiting, activity]);

  const counts = useMemo(
    () => ({
      required: required.length,
      waiting: waiting.length,
      activity: activity.length,
    }),
    [required.length, waiting.length, activity.length]
  );

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-5 px-0 py-2 sm:px-6 sm:py-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="page-title">Inbox</h1>
          <p className="meta-text mt-1 text-navy-500">
            Everything you need to act on, in one place.
          </p>
        </div>
        <div className="flex items-center gap-1">
          <Link
            href="/tasks"
            className="inline-flex items-center gap-1 rounded-md border border-[color:var(--sh-gray-200)] bg-white px-3 py-1.5 text-xs font-medium text-navy-500 hover:bg-blurple-50"
          >
            <TaskIcon boxClassName="h-4 w-4" size={14} />
            Open tasks
          </Link>
        </div>
      </header>
      <nav className="flex flex-wrap items-center gap-1 border-b border-[color:var(--sh-gray-200)]">
        <TabButton
          label="Required"
          count={counts.required}
          isActive={tab === "required"}
          onClick={() => setTab("required")}
        />
        <TabButton
          label="Waiting"
          count={counts.waiting}
          isActive={tab === "waiting"}
          onClick={() => setTab("waiting")}
        />
        <TabButton
          label="Activity"
          count={counts.activity}
          isActive={tab === "activity"}
          onClick={() => setTab("activity")}
        />
      </nav>
      {loading ? (
        <div className="flex flex-col gap-2">
          {[0, 1, 2, 3].map((key) => (
            <Skeleton key={key} className="h-12 w-full rounded-lg" />
          ))}
        </div>
      ) : error ? (
        <LoadErrorState
          description={error}
          onRetry={() => {
            void loadInbox();
          }}
        />
      ) : tab === "activity" && activityError ? (
        <LoadErrorState
          description={activityError}
          onRetry={() => {
            void loadInbox();
          }}
        />
      ) : activeItems.length === 0 ? (
        <EmptyState
          icon="bell"
          title={UI_VOCAB.emptyStates.inboxTitle}
          description={UI_VOCAB.emptyStates.inboxDescription}
        />
      ) : tab === "activity" ? (
        <ul className="flex flex-col gap-1">
          {(activeItems as ActivityItem[]).map((item) => (
            <li key={item.id}>
              <Link
                href={item.href}
                className="flex items-start gap-3 rounded-lg border border-transparent px-3 py-2 transition hover:border-[color:var(--sh-gray-200)] hover:bg-white"
              >
                <AppIcon
                  name={item.kind === "blog" ? "blog" : "social"}
                  boxClassName="h-8 w-8 rounded-md bg-[color:var(--sh-gray)]"
                  size={16}
                  className="text-navy-500"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-ink">
                    {item.title}
                  </p>
                  <p className="truncate text-xs text-navy-500">
                    {item.action} · {item.actor}
                  </p>
                </div>
                <time className="shrink-0 text-xs text-navy-500">
                  {formatDateInTimezone(item.createdAt, timezone, "MMM d")}
                </time>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <ul className="flex flex-col gap-1">
          {(activeItems as SnapshotItem[]).map((item) => (
            <li key={item.id}>
              <Link
                href={item.href}
                className="flex items-center gap-3 rounded-lg border border-[color:var(--sh-gray-200)] bg-white px-3 py-2 transition hover:border-[color:var(--sh-gray-200)]"
              >
                <AppIcon
                  name={item.kind === "blog" ? "blog" : "social"}
                  boxClassName="h-8 w-8 rounded-md bg-[color:var(--sh-gray)]"
                  size={16}
                  className="text-navy-500"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-ink">
                    {item.title}
                  </p>
                  <p className="truncate text-xs text-navy-500">
                    {item.statusLabel}
                  </p>
                </div>
                <ArrowRightIcon boxClassName="h-4 w-4"
                  size={12}
                  className="text-navy-500/60" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function TabButton({
  label,
  count,
  isActive,
  onClick,
}: {
  label: string;
  count: number;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "relative inline-flex items-center gap-1.5 border-b-2 px-3 py-2 text-xs font-medium transition",
        isActive
          ? "border-ink text-ink"
          : "border-transparent text-navy-500 hover:text-ink"
      )}
    >
      {label}
      <span
        className={cn(
          "rounded-full px-1.5 py-0.5 text-xs font-semibold",
          isActive
            ? "bg-ink text-white"
            : "bg-blurple-50 text-navy-500"
        )}
      >
        {count}
      </span>
    </button>
  );
}

function normalizeSnapshotItems(value: unknown): SnapshotItem[] {
  if (!Array.isArray(value)) {
    return [];
  }
  // Shape comes from /api/dashboard/tasks-snapshot (SnapshotTask). Blog ids
  // are suffixed (`<uuid>:blog`), so always route with the server's `href`.
  return value
    .map((entry) => {
      if (typeof entry !== "object" || entry === null) {
        return null;
      }
      const record = entry as Record<string, unknown>;
      const id = String(record.id ?? "");
      const href = typeof record.href === "string" ? record.href : "";
      if (!id || !href) {
        return null;
      }
      const kind: SnapshotItem["kind"] = record.kind === "social" ? "social" : "blog";
      const title = String(record.title ?? "Untitled");
      const statusLabel = String(record.statusLabel ?? "Needs attention");
      const updatedAt =
        typeof record.createdAt === "string" ? record.createdAt : null;
      return { id, kind, title, href, statusLabel, updatedAt };
    })
    .filter((entry): entry is SnapshotItem => entry !== null);
}

function normalizeActivityItems(value: unknown): ActivityItem[] {
  if (!Array.isArray(value)) {
    return [];
  }
  // Shape comes from /api/activity-feed (ActivityRecord).
  return value
    .map((entry) => {
      if (typeof entry !== "object" || entry === null) {
        return null;
      }
      const record = entry as Record<string, unknown>;
      const id = String(record.id ?? "");
      const contentId = String(record.content_id ?? "");
      const createdAt = typeof record.changed_at === "string" ? record.changed_at : "";
      if (!id || !contentId || !createdAt) {
        return null;
      }
      const kind: ActivityItem["kind"] =
        record.content_type === "social_post" ? "social" : "blog";
      const title = String(record.content_title ?? "Untitled");
      const action = String(
        record.event_title ?? String(record.event_type ?? "Updated").replace(/_/g, " ")
      );
      const actor = String(record.changed_by_name ?? "Team");
      const href =
        kind === "social" ? `/social-posts/${contentId}` : `/blogs/${contentId}`;
      return { id: `${kind}-${id}`, kind, title, action, actor, createdAt, href };
    })
    .filter((entry): entry is ActivityItem => entry !== null);
}
