"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/providers/auth-provider";
import { useAlerts } from "@/providers/alerts-provider";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import type { UserNotificationPreferences } from "@/lib/notification-helpers";
import {
  getApiErrorMessage,
  isApiFailure,
  parseApiResponseJson,
} from "@/lib/api-response";

const API_BASE = "/api/users/notification-preferences";
const INTEGRATIONS_API = "/api/users/integrations";

interface NotificationPreferencesFormProps {
  onSaveSuccess?: () => void;
}

interface IntegrationStatus {
  slack_connected: boolean;
}

type ContentType = "blogs" | "social_posts";

interface NotificationType {
  key: keyof Omit<UserNotificationPreferences, "notifications_enabled" | "slack_delivery_dm" | "slack_delivery_channel">;
  label: string;
  blogDescription: string;
  socialPostDescription: string;
}

const NOTIFICATION_TYPES: NotificationType[] = [
  {
    key: "notify_on_task_assigned" as const,
    label: "Task Assignment",
    blogDescription: "When a blog is assigned to you as writer or publisher",
    socialPostDescription: "When a social post is assigned to you for creation or review",
  },
  {
    key: "notify_on_stage_changed" as const,
    label: "Stage Changes",
    blogDescription: "When a blog moves between writing and publishing stages",
    socialPostDescription: "When a social post progresses through review, approval, or publication stages",
  },
  {
    key: "notify_on_awaiting_action" as const,
    label: "Awaiting Action",
    blogDescription: "When a blog needs your revision or review",
    socialPostDescription: "When a social post is awaiting your input (e.g., live links needed)",
  },
  {
    key: "notify_on_mention" as const,
    label: "Mentions",
    blogDescription: "When you're mentioned in blog comments",
    socialPostDescription: "When you're mentioned in social post comments",
  },
  {
    key: "notify_on_submitted_for_review" as const,
    label: "Submissions",
    blogDescription: "When a blog is submitted for review",
    socialPostDescription: "When a social post is submitted for review",
  },
  {
    key: "notify_on_published" as const,
    label: "Publications",
    blogDescription: "When a blog is published live",
    socialPostDescription: "When a social post is published",
  },
  {
    key: "notify_on_assignment_changed" as const,
    label: "Assignment Changes",
    blogDescription: "When your assignment changes or is removed",
    socialPostDescription: "When your assignment changes or is removed",
  },
];

const CHANNEL_NAMES = {
  in_app: "In-App",
  slack: "Slack",
};

const CONTENT_TYPES: Array<{ id: ContentType; label: string }> = [
  { id: "blogs", label: "Blogs" },
  { id: "social_posts", label: "Social Posts" },
];


export function NotificationPreferencesForm({
  onSaveSuccess,
}: NotificationPreferencesFormProps) {
  const { user } = useAuth();
  const { showSuccess, showError } = useAlerts();

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<ContentType>("blogs");
  const [preferences, setPreferences] = useState<UserNotificationPreferences | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [integrations, setIntegrations] = useState<IntegrationStatus>({ slack_connected: false });
  const [allInAppChecked, setAllInAppChecked] = useState(true);
  const [allSlackChecked, setAllSlackChecked] = useState(true);

  // Fetch preferences and integration status on mount
  useEffect(() => {
    const fetchData = async () => {
      if (!user?.id) return;

      try {
        setIsLoading(true);
        const supabase = getSupabaseBrowserClient();
        const { data: sessionData } = await supabase.auth.getSession();
        const accessToken = sessionData?.session?.access_token;

        if (!accessToken) {
          throw new Error("No access token available");
        }

        // Fetch preferences
        const prefsResponse = await fetch(API_BASE, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
        });
        const prefsData = await parseApiResponseJson<UserNotificationPreferences>(
          prefsResponse
        );
        if (isApiFailure(prefsResponse, prefsData)) {
          throw new Error(
            getApiErrorMessage(
              prefsData,
              "Failed to fetch notification preferences."
            )
          );
        }
        setPreferences(prefsData);

        // Fetch integration status
        try {
          const integrationsResponse = await fetch(INTEGRATIONS_API, {
            method: "GET",
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
          });
          const integrationsData =
            await parseApiResponseJson<IntegrationStatus>(integrationsResponse);
          if (!isApiFailure(integrationsResponse, integrationsData)) {
            setIntegrations({
              slack_connected: Boolean(integrationsData.slack_connected),
            });
          }
        } catch (intError) {
          console.warn("Warning: Could not fetch integration status", intError);
          // Continue with defaults if integration fetch fails
        }

        setHasChanges(false);
      } catch (error) {
        console.error("Error fetching notification preferences:", error);
        showError(
          "Failed to load notification preferences. Using default settings."
        );
        // Set defaults on error
        setPreferences({
          notifications_enabled: true,
          notify_on_task_assigned: true,
          notify_on_stage_changed: true,
          notify_on_awaiting_action: true,
          notify_on_mention: true,
          notify_on_submitted_for_review: true,
          notify_on_published: true,
          notify_on_assignment_changed: true,
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [user?.id, showError]);

  const handleToggleAll = (enabled: boolean) => {
    if (!preferences) return;
    setPreferences({
      ...preferences,
      notifications_enabled: enabled,
      notify_on_task_assigned: enabled,
      notify_on_stage_changed: enabled,
      notify_on_awaiting_action: enabled,
      notify_on_mention: enabled,
      notify_on_submitted_for_review: enabled,
      notify_on_published: enabled,
      notify_on_assignment_changed: enabled,
      slack_notify_on_task_assigned: enabled,
      slack_notify_on_stage_changed: enabled,
      slack_notify_on_awaiting_action: enabled,
      slack_notify_on_mention: enabled,
      slack_notify_on_submitted_for_review: enabled,
      slack_notify_on_published: enabled,
      slack_notify_on_assignment_changed: enabled,
    });
    setAllInAppChecked(enabled);
    setAllSlackChecked(enabled);
    setHasChanges(true);
  };

  const handleToggleAllInApp = (enabled: boolean) => {
    if (!preferences) return;
    setPreferences({
      ...preferences,
      notify_on_task_assigned: enabled,
      notify_on_stage_changed: enabled,
      notify_on_awaiting_action: enabled,
      notify_on_mention: enabled,
      notify_on_submitted_for_review: enabled,
      notify_on_published: enabled,
      notify_on_assignment_changed: enabled,
    });
    setAllInAppChecked(enabled);
    setHasChanges(true);
  };

  const handleToggleAllSlack = (enabled: boolean) => {
    if (!preferences) return;
    setPreferences({
      ...preferences,
      slack_notify_on_task_assigned: enabled,
      slack_notify_on_stage_changed: enabled,
      slack_notify_on_awaiting_action: enabled,
      slack_notify_on_mention: enabled,
      slack_notify_on_submitted_for_review: enabled,
      slack_notify_on_published: enabled,
      slack_notify_on_assignment_changed: enabled,
    });
    setAllSlackChecked(enabled);
    setHasChanges(true);
  };

  const handleTogglePreference = (
    key: keyof Omit<UserNotificationPreferences, "notifications_enabled">,
    enabled: boolean
  ) => {
    if (!preferences) return;
    setPreferences({
      ...preferences,
      [key]: enabled,
    });
    setHasChanges(true);
  };

  const handleSave = async () => {
    if (!user?.id || !preferences || !hasChanges) return;

    try {
      setIsSaving(true);
      const supabase = getSupabaseBrowserClient();
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;

      if (!accessToken) {
        throw new Error("No access token available");
      }

      const response = await fetch(API_BASE, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(preferences),
      });
      const payload = await parseApiResponseJson<Record<string, unknown>>(response);
      if (isApiFailure(response, payload)) {
        throw new Error(
          getApiErrorMessage(payload, "Failed to save notification preferences.")
        );
      }

      setHasChanges(false);
      showSuccess("Notification preferences saved successfully.");
      onSaveSuccess?.();
    } catch (error) {
      console.error("Error saving notification preferences:", error);
      showError("Failed to save notification preferences. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="rounded-lg border border-slate-200 p-4">
        <p className="text-sm text-slate-500">Loading notification preferences…</p>
      </div>
    );
  }

  if (!preferences) {
    return (
      <div className="rounded-lg border border-slate-200 p-4">
        <p className="text-sm text-slate-500">
          Unable to load notification preferences.
        </p>
      </div>
    );
  }

  return (
    <section className="rounded-lg border border-slate-200 p-4">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
        Notification Preferences
      </h3>
      <p className="mt-1 text-sm text-slate-600">
        Control which notifications you receive across the app.
      </p>

      <div className="mt-6 space-y-4">
        {/* Global Toggle */}
        <div className="flex items-center justify-between rounded-md border border-slate-200 bg-slate-50 px-4 py-3">
          <div>
            <label htmlFor="global-toggle" className="block text-sm font-medium text-slate-900">
              All Notifications
            </label>
            <p className="mt-0.5 text-xs text-slate-600">
              Master toggle to enable or disable all notifications at once
            </p>
          </div>
          <input
            id="global-toggle"
            type="checkbox"
            checked={preferences.notifications_enabled}
            onChange={(e) => handleToggleAll(e.target.checked)}
            className="h-5 w-5 cursor-pointer rounded border-slate-300 text-slate-600 focus:ring-2 focus:ring-slate-500"
          />
        </div>

        {/* Content Type Tabs */}
        {preferences.notifications_enabled && (
          <div className="space-y-3">
            <div className="flex gap-1 border-b border-slate-200">
              {CONTENT_TYPES.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-4 py-2 text-sm font-medium transition-colors ${
                    activeTab === tab.id
                      ? "border-b-2 border-slate-900 text-slate-900"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Notification Types Table */}
            <div className="overflow-hidden rounded-lg border border-slate-200">
              <table className="w-full">
                <thead className="bg-slate-50">
                  <tr className="border-b border-slate-200">
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-700">
                      Notification Type
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-slate-700">
                      <div className="flex flex-col items-center gap-1">
                        <span>{CHANNEL_NAMES.in_app}</span>
                        <input
                          type="checkbox"
                          checked={allInAppChecked}
                          onChange={(e) => handleToggleAllInApp(e.target.checked)}
                          className="h-4 w-4 cursor-pointer rounded border-slate-300 text-slate-600 focus:ring-2 focus:ring-slate-500"
                          title="Toggle all in-app notifications"
                          aria-label="Toggle all in-app notifications"
                        />
                      </div>
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-slate-700">
                      <div className="flex flex-col items-center gap-1">
                        <div>
                          {CHANNEL_NAMES.slack}
                          {!integrations.slack_connected && (
                            <span className="ml-1 text-xs font-normal text-slate-500">(not connected)</span>
                          )}
                        </div>
                        <input
                          type="checkbox"
                          checked={allSlackChecked}
                          onChange={(e) => handleToggleAllSlack(e.target.checked)}
                          disabled={!integrations.slack_connected}
                          className="h-4 w-4 cursor-pointer rounded border-slate-300 text-slate-600 disabled:cursor-not-allowed disabled:opacity-50 focus:ring-2 focus:ring-slate-500"
                          title={!integrations.slack_connected ? "Connect Slack to enable notifications" : "Toggle all Slack notifications"}
                          aria-label="Toggle all Slack notifications"
                        />
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {NOTIFICATION_TYPES.map((notif) => {
                    const key = notif.key;
                    const slackKey = `slack_${key}` as keyof UserNotificationPreferences;
                    const description = activeTab === "blogs" ? notif.blogDescription : notif.socialPostDescription;
                    return (
                      <tr key={key} className="hover:bg-slate-50">
                        <td className="px-4 py-3">
                          <div className="text-sm font-medium text-slate-900">{notif.label}</div>
                          <p className="mt-1 text-xs text-slate-600">{description}</p>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <input
                            type="checkbox"
                            checked={preferences[key]}
                            onChange={(e) => handleTogglePreference(key, e.target.checked)}
                            className="h-5 w-5 cursor-pointer rounded border-slate-300 text-slate-600 focus:ring-2 focus:ring-slate-500"
                            aria-label={`${notif.label} - In-App`}
                          />
                        </td>
                        <td className="px-4 py-3 text-center">
                          <input
                            type="checkbox"
                            checked={(preferences[slackKey] as boolean) ?? preferences[key]}
                            onChange={(e) => {
                              setPreferences({
                                ...preferences,
                                [slackKey]: e.target.checked,
                              });
                              setHasChanges(true);
                            }}
                            disabled={!integrations.slack_connected}
                            className="h-5 w-5 cursor-pointer rounded border-slate-300 text-slate-600 disabled:cursor-not-allowed disabled:opacity-50 focus:ring-2 focus:ring-slate-500"
                            aria-label={`${notif.label} - Slack`}
                            title={!integrations.slack_connected ? "Connect Slack to enable notifications" : undefined}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {!integrations.slack_connected && (
              <p className="text-xs text-slate-500">
                Connect your Slack account above to receive Slack notifications.
              </p>
            )}
          </div>
        )}

        {/* Slack Delivery Methods */}
        {preferences.notifications_enabled && integrations.slack_connected && (
          <div className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm font-semibold text-slate-900">
              Slack Delivery Method
            </p>
            <p className="text-xs text-slate-600">
              Choose how Slack notifications are delivered when enabled above.
            </p>
            <div className="space-y-2">
              <div className="flex items-start gap-3 opacity-50">
                <input
                  type="checkbox"
                  disabled
                  checked={false}
                  className="mt-0.5 h-5 w-5 cursor-not-allowed rounded border-slate-300 text-slate-300 focus:ring-2 focus:ring-slate-500"
                />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-slate-900">
                      Direct Message (DM)
                    </span>
                    <span className="inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                      Coming Soon
                    </span>
                  </div>
                  <p className="text-xs text-slate-600">
                    Send notifications as direct messages to you in Slack (pending approval)
                  </p>
                </div>
              </div>
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={preferences.slack_delivery_channel ?? true}
                  onChange={(e) => {
                    setPreferences({
                      ...preferences,
                      slack_delivery_channel: e.target.checked,
                    });
                    setHasChanges(true);
                  }}
                  className="h-5 w-5 cursor-pointer rounded border-slate-300 text-slate-600 focus:ring-2 focus:ring-slate-500"
                />
                <div>
                  <span className="text-sm font-medium text-slate-900">
                    #content-ops-alerts Channel
                  </span>
                  <p className="text-xs text-slate-600">
                    Post notifications in the #content-ops-alerts channel
                  </p>
                </div>
              </label>
            </div>
            <p className="text-xs text-slate-500">
              Notifications will be posted to the #content-ops-alerts channel.
            </p>
          </div>
        )}
      </div>

      {/* Save button */}
      <div className="mt-6 flex justify-end">
        <button
          onClick={handleSave}
          disabled={!hasChanges || isSaving}
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2"
        >
          {isSaving ? "Saving..." : "Save Preferences"}
        </button>
      </div>
    </section>
  );
}
