"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/button";
import {
  DATA_PAGE_STACK_CLASS,
  DataPageEmptyState,
  DataPageHeader,
} from "@/components/data-page";
import { ProtectedPage } from "@/components/protected-page";
import {
  getApiErrorMessage,
  isApiFailure,
  parseApiResponseJson,
} from "@/lib/api-response";
import { ChevronRightIcon } from "@/lib/icons";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import { useAuth } from "@/providers/auth-provider";
import { useNotifications } from "@/providers/notifications-provider";

type ActivityFeedItem = {
  id: string;
  content_type: "blog" | "social_post";
  content_id: string;
  content_title: string;
  event_type: string;
  event_title: string;
  event_summary: string | null;
  changed_by_name: string | null;
  changed_at: string;
};

type TaskShortcutItem = {
  id: string;
  title: string;
  kind: "blog" | "social";
  href: string;
  statusLabel: string;
  scheduledDate: string | null;
  actionState: "action_required" | "waiting_on_others";
};
type ApiFailureShape = {
  errorCode?: string;
};

function formatRelativeTime(timestamp: number) {
  const elapsedSeconds = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
  if (elapsedSeconds < 60) {
    return `${elapsedSeconds}s ago`;
  }
  const elapsedMinutes = Math.floor(elapsedSeconds / 60);
  if (elapsedMinutes < 60) {
    return `${elapsedMinutes}m ago`;
  }
  const elapsedHours = Math.floor(elapsedMinutes / 60);
  if (elapsedHours < 24) {
    return `${elapsedHours}h ago`;
  }
  const elapsedDays = Math.floor(elapsedHours / 24);
  return `${elapsedDays}d ago`;
}

export default function UpdatesPage() {
  const { session, loading: authLoading } = useAuth();
  const {
    notifications,
    clearedNotifications,
    allNotifications,
    clearNotification,
    markAsRead,
    markAllAsRead,
    clearAll,
    restoreNotification,
    restoreAllCleared,
  } = useNotifications();
  const [showCleared, setShowCleared] = useState(false);
  const [activityFeed, setActivityFeed] = useState<ActivityFeedItem[]>([]);
  const [requiredTaskShortcuts, setRequiredTaskShortcuts] = useState<TaskShortcutItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const notificationSourceIds = useMemo(
    () =>
      new Set(
        allNotifications.map((notification) => notification.sourceId).filter(Boolean)
      ),
    [allNotifications]
  );
  const recentActivityItems = useMemo(
    () =>
      activityFeed.filter((activity) => !notificationSourceIds.has(`activity:${activity.id}`)),
    [activityFeed, notificationSourceIds]
  );


  const loadUpdates = useCallback(async () => {
    if (authLoading) {
      return;
    }
    const supabase = getSupabaseBrowserClient();
    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken =
      session?.access_token ?? sessionData.session?.access_token ?? null;
    if (!accessToken) {
      setError(null);
      setRequiredTaskShortcuts([]);
      setActivityFeed([]);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const [taskResponse, activityResponse] = await Promise.all([
        fetch("/api/dashboard/tasks-snapshot", {
          headers: {
            authorization: `Bearer ${accessToken}`,
          },
        }),
        fetch("/api/activity-feed", {
          headers: {
            authorization: `Bearer ${accessToken}`,
          },
        }),
      ]);
      const taskPayload = await parseApiResponseJson<{ requiredByMe?: TaskShortcutItem[] }>(
        taskResponse
      );
      if (!isApiFailure(taskResponse, taskPayload)) {
        setRequiredTaskShortcuts(taskPayload.requiredByMe ?? []);
      } else {
        setRequiredTaskShortcuts([]);
      }

      const activityPayload = await parseApiResponseJson<{
        data?: { activities?: ActivityFeedItem[] };
      } & ApiFailureShape>(activityResponse);
      const activityUnauthorized =
        activityResponse.status === 401 ||
        activityPayload.errorCode === "UNAUTHORIZED";
      if (isApiFailure(activityResponse, activityPayload) && !activityUnauthorized) {
        throw new Error(
          getApiErrorMessage(activityPayload, "Failed to load updates feed.")
        );
      }
      if (activityUnauthorized) {
        setActivityFeed([]);
        return;
      }
      setActivityFeed((activityPayload.data?.activities ?? []).slice(0, 50));
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Failed to load updates.");
      setRequiredTaskShortcuts([]);
      setActivityFeed([]);
    } finally {
      setIsLoading(false);
    }
  }, [authLoading, session?.access_token]);

  useEffect(() => {
    void loadUpdates();
  }, [loadUpdates]);

  return (
    <ProtectedPage>
      <AppShell>
        <div className={DATA_PAGE_STACK_CLASS}>
          <nav
            aria-label="Breadcrumb"
            className="flex flex-wrap items-center gap-1 text-xs text-navy-500"
          >
            <Link href="/dashboard" className="hover:text-navy-500">
              Dashboard
            </Link>
            <span>/</span>
            <span className="text-navy-500">Activity History</span>
          </nav>
          <DataPageHeader
            title="Activity History"
            description="Readable updates from across the app."
            primaryAction={
              <div className="flex flex-wrap items-center gap-2">
                <Button type="button" variant="secondary" size="sm" onClick={markAllAsRead}>
                  Mark all read
                </Button>
                <Button type="button" variant="secondary" size="sm" onClick={clearAll}>
                  Clear my inbox
                </Button>
                <Button type="button" variant="secondary" size="sm" onClick={() => void loadUpdates()}>
                  Refresh
                </Button>
              </div>
            }
          />

          {error ? (
            <p className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {error}
            </p>
          ) : null}

          <section className="rounded-lg border border-[color:var(--sh-gray-200)] bg-white p-4">
            <div className="mb-2 flex items-center justify-between gap-2">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-navy-500">
                Required by me ({requiredTaskShortcuts.length})
              </h2>
            </div>
            {requiredTaskShortcuts.length === 0 ? (
              <DataPageEmptyState
                title="Nothing required from you right now."
                description="Tasks that need your action will appear here."
              />
            ) : (
              <ul className="space-y-2">
                {requiredTaskShortcuts.map((task) => (
                  <li key={task.id}>
                    <Link
                      href={task.href}
                      className="block rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-ink hover:bg-emerald-100"
                    >
                      <p className="font-medium">{task.title}</p>
                      <p className="mt-0.5 text-xs text-navy-500">
                        {task.kind === "blog" ? "Blog" : "Social"} • {task.statusLabel}
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="rounded-lg border border-[color:var(--sh-gray-200)] bg-white p-4">
            <div className="mb-2 flex items-center justify-between gap-2">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-navy-500">
                Inbox updates ({notifications.length})
              </h2>
            </div>
            {notifications.length === 0 ? (
              <DataPageEmptyState
                title="No inbox updates."
                description="New updates will appear here."
              />
            ) : (
              <ul className="space-y-2">
                {notifications.map((notification) => (
                  <li key={notification.id}>
                    <div
                      className={`rounded-md border px-3 py-2 ${
                        notification.read
                          ? "border-[color:var(--sh-gray-200)] bg-white"
                          : "border-[color:var(--sh-blurple-100)] bg-blurple-50"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-ink">
                            {notification.title}
                          </p>
                          <p className="mt-0.5 text-sm text-navy-500">{notification.message}</p>
                          <p className="mt-1 text-xs text-navy-500">
                            {formatRelativeTime(notification.createdAt)}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-1">
                          {!notification.read ? (
                            <Button
                              type="button"
                              variant="secondary"
                              size="xs"
                              onClick={() => {
                                markAsRead(notification.id);
                              }}
                            >
                              Mark read
                            </Button>
                          ) : null}
                        </div>
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        {notification.href ? (
                          <Link
                            href={notification.href}
                            className="inline-flex items-center gap-1 rounded border border-[color:var(--sh-gray-200)] bg-white px-2 py-1 text-xs text-navy-500 hover:bg-blurple-50"
                          >
                            Open
                            <ChevronRightIcon boxClassName="h-3 w-3" size={11} />
                          </Link>
                        ) : null}
                        <Button
                          type="button"
                          variant="secondary"
                          size="xs"
                          onClick={() => {
                            clearNotification(notification.id);
                          }}
                        >
                          Clear
                        </Button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="rounded-lg border border-[color:var(--sh-gray-200)] bg-white p-4">
            <div className="mb-2 flex items-center justify-between gap-2">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-navy-500">
                Cleared inbox updates ({clearedNotifications.length})
              </h2>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="xs"
                  onClick={() => {
                    setShowCleared((previous) => !previous);
                  }}
                >
                  {showCleared ? "Hide cleared" : "Show cleared"}
                </Button>
                {showCleared && clearedNotifications.length > 0 ? (
                  <Button type="button" variant="secondary" size="xs" onClick={restoreAllCleared}>
                    Restore all
                  </Button>
                ) : null}
              </div>
            </div>
            {!showCleared ? (
              <p className="text-sm text-navy-500">Cleared updates are hidden.</p>
            ) : clearedNotifications.length === 0 ? (
              <p className="text-sm text-navy-500">No cleared updates.</p>
            ) : (
              <ul className="space-y-2">
                {clearedNotifications.map((notification) => (
                  <li key={notification.id}>
                    <div className="rounded-md border border-[color:var(--sh-gray-200)] bg-[color:var(--sh-gray)] px-3 py-2">
                      <p className="text-sm font-medium text-ink">{notification.title}</p>
                      <p className="mt-0.5 text-sm text-navy-500">{notification.message}</p>
                      <div className="mt-2">
                        <Button
                          type="button"
                          variant="secondary"
                          size="xs"
                          onClick={() => {
                            restoreNotification(notification.id);
                          }}
                        >
                          Restore
                        </Button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="rounded-lg border border-[color:var(--sh-gray-200)] bg-white p-4">
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-navy-500">
              Recent activity (50 max)
            </h2>
            {isLoading ? (
              <p className="text-sm text-navy-500">Loading updates...</p>
            ) : recentActivityItems.length === 0 ? (
              <DataPageEmptyState
                title="No recent activity."
                description="Activity from blogs and social posts will appear here."
              />
            ) : (
              <ul className="space-y-2">
                {recentActivityItems.map((activity) => (
                  <li key={activity.id}>
                    <Link
                      href={
                        activity.content_type === "blog"
                          ? `/blogs/${activity.content_id}`
                          : `/social-posts/${activity.content_id}`
                      }
                      className="block rounded-md border border-[color:var(--sh-gray-200)] bg-white px-3 py-2 hover:bg-blurple-50"
                    >
                      <p className="text-sm font-medium text-ink">{activity.event_title}</p>
                      {activity.event_summary ? (
                        <p className="mt-0.5 text-sm text-navy-500">{activity.event_summary}</p>
                      ) : null}
                      <p className="mt-1 text-xs text-navy-500">
                        {activity.content_title}
                        {activity.changed_by_name ? ` • ${activity.changed_by_name}` : ""}
                        {" • "}
                        {formatRelativeTime(new Date(activity.changed_at).getTime())}
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </AppShell>
    </ProtectedPage>
  );
}
