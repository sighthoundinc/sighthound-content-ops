"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

import { AppShell } from "@/components/app-shell";
import { EmptyState } from "@/components/empty-state";
import { ProtectedPage } from "@/components/protected-page";
import { Skeleton } from "@/components/skeleton";
import { AppIcon } from "@/lib/icons";
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
  const { profile } = useAuth();
  const [tab, setTab] = useState<InboxTab>("required");
  const [required, setRequired] = useState<SnapshotItem[]>([]);
  const [waiting, setWaiting] = useState<SnapshotItem[]>([]);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const timezone = profile?.timezone ?? "America/New_York";

  useEffect(() => {
    let isMounted = true;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [snapshot, feed] = await Promise.all([
          fetch("/api/dashboard/tasks-snapshot", { cache: "no-store" }).then(
            async (response) => {
              if (!response.ok) {
                return null;
              }
              return response.json();
            }
          ),
          fetch("/api/activity-feed?limit=25", { cache: "no-store" }).then(
            async (response) => {
              if (!response.ok) {
                return null;
              }
              return response.json();
            }
          ),
        ]);

        if (!isMounted) {
          return;
        }

        if (snapshot?.requiredByMe) {
          setRequired(normalizeSnapshotItems(snapshot.requiredByMe));
        }
        if (snapshot?.waitingOnOthers) {
          setWaiting(normalizeSnapshotItems(snapshot.waitingOnOthers));
        }
        if (Array.isArray(feed?.activities)) {
          setActivity(normalizeActivityItems(feed.activities));
        }
      } catch (loadError) {
        console.error("inbox load failed", loadError);
        if (isMounted) {
          setError("Couldn’t load your inbox. Please refresh to retry.");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }
    void load();
    return () => {
      isMounted = false;
    };
  }, []);

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
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-5 px-6 py-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Inbox</h1>
          <p className="meta-text mt-1 text-slate-600">
            Everything you need to act on, in one place.
          </p>
        </div>
        <div className="flex items-center gap-1">
          <Link
            href="/tasks"
            className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
          >
            <AppIcon name="task" boxClassName="h-4 w-4" size={14} />
            Open tasks
          </Link>
        </div>
      </header>
      <nav className="flex items-center gap-1 border-b border-slate-200">
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
        <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {error}
        </div>
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
                className="flex items-start gap-3 rounded-lg border border-transparent px-3 py-2 transition hover:border-slate-200 hover:bg-white"
              >
                <AppIcon
                  name={item.kind === "blog" ? "blog" : "social"}
                  boxClassName="h-8 w-8 rounded-md bg-slate-50"
                  size={16}
                  className="text-slate-600"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-900">
                    {item.title}
                  </p>
                  <p className="truncate text-xs text-slate-600">
                    {item.action} · {item.actor}
                  </p>
                </div>
                <time className="shrink-0 text-[11px] text-slate-500">
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
                className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2 transition hover:border-slate-300"
              >
                <AppIcon
                  name={item.kind === "blog" ? "blog" : "social"}
                  boxClassName="h-8 w-8 rounded-md bg-slate-50"
                  size={16}
                  className="text-slate-600"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-900">
                    {item.title}
                  </p>
                  <p className="truncate text-xs text-slate-600">
                    {item.statusLabel}
                  </p>
                </div>
                <AppIcon
                  name="arrowRight"
                  boxClassName="h-4 w-4"
                  size={12}
                  className="text-slate-400"
                />
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
          ? "border-slate-900 text-slate-900"
          : "border-transparent text-slate-600 hover:text-slate-900"
      )}
    >
      {label}
      <span
        className={cn(
          "rounded-full px-1.5 py-0.5 text-[10px] font-semibold",
          isActive
            ? "bg-slate-900 text-white"
            : "bg-slate-100 text-slate-600"
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
  return value
    .map((entry) => {
      if (typeof entry !== "object" || entry === null) {
        return null;
      }
      const record = entry as Record<string, unknown>;
      const kind = record.content_type === "social_post" ? "social" : "blog";
      const id = String(record.id ?? "");
      if (!id) {
        return null;
      }
      const title = String(record.title ?? "Untitled");
      const href = kind === "social" ? `/social-posts/${id}` : `/blogs/${id}`;
      const statusLabel = String(record.status_display ?? "Needs attention");
      const updatedAt =
        typeof record.updated_at === "string" ? record.updated_at : null;
      return { id, kind, title, href, statusLabel, updatedAt };
    })
    .filter((entry): entry is SnapshotItem => entry !== null);
}

function normalizeActivityItems(value: unknown): ActivityItem[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .map((entry, index) => {
      if (typeof entry !== "object" || entry === null) {
        return null;
      }
      const record = entry as Record<string, unknown>;
      const kind = String(record.content_type ?? "blog").toLowerCase() ===
      "social_post"
        ? "social"
        : "blog";
      const id = String(record.id ?? `activity-${index}`);
      const title = String(record.title ?? "Untitled");
      const action = String(record.event_type ?? "updated").replace(/_/g, " ");
      const actor = String(record.actor_name ?? record.user_display_name ?? "Team");
      const createdAt = String(record.created_at ?? new Date().toISOString());
      const recordId = String(record.record_id ?? record.content_id ?? "");
      const href =
        kind === "social"
          ? `/social-posts/${recordId || id}`
          : `/blogs/${recordId || id}`;
      return { id, kind, title, action, actor, createdAt, href };
    })
    .filter((entry): entry is ActivityItem => entry !== null);
}
