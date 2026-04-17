"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AppIcon, type AppIconName } from "@/lib/icons";
import { UI_VOCAB } from "@/lib/ui-vocab";
import { cn } from "@/lib/utils";

/**
 * <NeedsYouHero /> — top-of-dashboard triage card answering
 * "what do you need to do first?" rather than "what exists?".
 *
 * Fetches `/api/dashboard/tasks-snapshot` and renders up to 3 items
 * from the `requiredByMe` group with a direct "Open" CTA for each.
 * When the user is caught up the card collapses into a short empty
 * confirmation; it never blocks the rest of the dashboard.
 *
 * Rules (AGENTS.md):
 * - Reads are permission-aware via existing snapshot endpoint.
 * - Copy sources from `UI_VOCAB.emptyStates.tasksDescription` where applicable.
 * - Icons come from `AppIcon`; no emoji.
 */

type SnapshotItem = {
  id: string;
  kind: "blog" | "social";
  title: string;
  href: string;
  statusLabel: string;
};

type NeedsYouHeroProps = {
  /**
   * Render a compact stacked layout at smaller viewports. Callers pass
   * `compact` for mobile snapshots; default layout is the dashboard hero.
   */
  compact?: boolean;
  /** Max items to show. Default 3 for hero; callers may pass 5 for mobile. */
  maxItems?: number;
  className?: string;
};

export function NeedsYouHero({
  compact = false,
  maxItems = 3,
  className,
}: NeedsYouHeroProps) {
  const [items, setItems] = useState<SnapshotItem[] | null>(null);
  const [waitingCount, setWaitingCount] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const response = await fetch("/api/dashboard/tasks-snapshot", {
          cache: "no-store",
        });
        if (!response.ok) {
          throw new Error(`snapshot ${response.status}`);
        }
        const payload = await response.json();
        if (cancelled) {
          return;
        }
        const required = normalizeSnapshotItems(payload?.requiredByMe);
        const waiting = normalizeSnapshotItems(payload?.waitingOnOthers);
        setItems(required.slice(0, maxItems));
        setWaitingCount(waiting.length);
      } catch (loadError) {
        console.warn("needs-you hero load failed", loadError);
        if (!cancelled) {
          setError("Couldn't load your queue. Refresh to retry.");
        }
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [maxItems]);

  const title = useMemo(() => {
    if (items === null) {
      return "Loading your queue…";
    }
    if (items.length === 0) {
      return "You're caught up";
    }
    return `${items.length === 1 ? "1 item" : `${items.length} items`} need you right now`;
  }, [items]);

  if (error) {
    return (
      <div
        className={cn(
          "rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700",
          className
        )}
      >
        {error}
      </div>
    );
  }

  return (
    <section
      className={cn(
        "rounded-lg border border-slate-200 bg-white p-4 shadow-[var(--elevation-1)]",
        className
      )}
      aria-label="What needs you right now"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            Right now
          </p>
          <h2 className="section-title mt-1">{title}</h2>
          <p className="meta-text mt-1 text-slate-600">
            {items === null
              ? "One moment while we check your blog and social queue."
              : items.length === 0
                ? waitingCount > 0
                  ? `${waitingCount} item${waitingCount === 1 ? "" : "s"} waiting on others.`
                  : UI_VOCAB.emptyStates.tasksDescription
                : `Pick one and clear it — ${waitingCount} waiting on others.`}
          </p>
        </div>
        <Link
          href="/tasks"
          className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
        >
          <AppIcon name="task" boxClassName="h-4 w-4" size={14} />
          Open all tasks
        </Link>
      </div>
      {items && items.length > 0 ? (
        <ul
          className={cn(
            "mt-3 gap-2",
            compact ? "flex flex-col" : "grid grid-cols-1 md:grid-cols-3"
          )}
        >
          {items.map((item) => (
            <li key={item.id}>
              <Link
                href={item.href}
                className="group flex h-full items-start gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 transition hover:border-slate-300 hover:bg-white"
              >
                <AppIcon
                  name={item.kind === "blog" ? "blog" : ("social" as AppIconName)}
                  boxClassName="h-8 w-8 rounded-md bg-white"
                  size={16}
                  className="text-slate-600"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-900">
                    {item.title}
                  </p>
                  <p className="truncate text-xs text-slate-600">{item.statusLabel}</p>
                </div>
                <AppIcon
                  name="arrowRight"
                  boxClassName="h-4 w-4 mt-2"
                  size={12}
                  className="text-slate-400 group-hover:text-slate-900"
                />
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}

function normalizeSnapshotItems(value: unknown): SnapshotItem[] {
  if (!Array.isArray(value)) {
    return [];
  }
  const items: SnapshotItem[] = [];
  for (const entry of value) {
    if (typeof entry !== "object" || entry === null) {
      continue;
    }
    const record = entry as Record<string, unknown>;
    const id = typeof record.id === "string" ? record.id : "";
    if (!id) {
      continue;
    }
    const kind = record.content_type === "social_post" ? "social" : "blog";
    items.push({
      id,
      kind,
      title: typeof record.title === "string" ? record.title : "Untitled",
      href: kind === "social" ? `/social-posts/${id}` : `/blogs/${id}`,
      statusLabel:
        typeof record.status_display === "string"
          ? record.status_display
          : "Needs attention",
    });
  }
  return items;
}
