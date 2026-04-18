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

interface NotificationPreferencesFormProps {
  onSaveSuccess?: () => void;
}

type ContentType = "blogs" | "social_posts";

interface NotificationType {
  key: keyof Omit<UserNotificationPreferences, "notifications_enabled" | "user_id" | "created_at" | "updated_at">;
  label: string;
  blogDescription: string;
  socialPostDescription: string;
}

const NOTIFICATION_TYPES: NotificationType[] = [
  {
    key: "task_assigned" as const,
    label: "Task Assignment",
    blogDescription: "When a blog is assigned to you as writer or publisher",
    socialPostDescription: "When a social post is assigned to you for creation or review",
  },
  {
    key: "stage_changed" as const,
    label: "Stage Changes",
    blogDescription: "When a blog moves between writing and publishing stages",
    socialPostDescription: "When a social post progresses through review, approval, or publication stages",
  },
  {
    key: "awaiting_action" as const,
    label: "Awaiting Action",
    blogDescription: "When a blog needs your revision or review",
    socialPostDescription: "When a social post is awaiting your input (e.g., live links needed)",
  },
  {
    key: "mention" as const,
    label: "Mentions",
    blogDescription: "When you're mentioned in blog comments",
    socialPostDescription: "When you're mentioned in social post comments",
  },
  {
    key: "submitted_for_review" as const,
    label: "Submissions",
    blogDescription: "When a blog is submitted for review",
    socialPostDescription: "When a social post is submitted for review",
  },
  {
    key: "published" as const,
    label: "Publications",
    blogDescription: "When a blog is published live",
    socialPostDescription: "When a social post is published",
  },
  {
    key: "assignment_changed" as const,
    label: "Assignment Changes",
    blogDescription: "When your assignment changes or is removed",
    socialPostDescription: "When your assignment changes or is removed",
  },
];


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
  const [allInAppChecked, setAllInAppChecked] = useState(true);

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


        setHasChanges(false);
      } catch (error) {
        console.error("Error fetching notification preferences:", error);
        showError(
          "Failed to load notification preferences. Using default settings."
        );
        // Set defaults on error
        setPreferences({
          notifications_enabled: true,
          task_assigned: true,
          stage_changed: true,
          awaiting_action: true,
          mention: true,
          submitted_for_review: true,
          published: true,
          assignment_changed: true,
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
      task_assigned: enabled,
      stage_changed: enabled,
      awaiting_action: enabled,
      mention: enabled,
      submitted_for_review: enabled,
      published: enabled,
      assignment_changed: enabled,
    });
    setAllInAppChecked(enabled);
    setHasChanges(true);
  };

  const handleToggleAllInApp = (enabled: boolean) => {
    if (!preferences) return;
    setPreferences({
      ...preferences,
      task_assigned: enabled,
      stage_changed: enabled,
      awaiting_action: enabled,
      mention: enabled,
      submitted_for_review: enabled,
      published: enabled,
      assignment_changed: enabled,
    });
    setAllInAppChecked(enabled);
    setHasChanges(true);
  };

  const handleTogglePreference = (
    key: keyof Omit<
      UserNotificationPreferences,
      "notifications_enabled" | "user_id" | "created_at" | "updated_at"
    >,
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
      showSuccess("Notification preferences saved.");
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
      <div className="rounded-lg border border-[color:var(--sh-gray-200)] p-4">
        <p className="text-sm text-navy-500">Loading notification preferences…</p>
      </div>
    );
  }

  if (!preferences) {
    return (
      <div className="rounded-lg border border-[color:var(--sh-gray-200)] p-4">
        <p className="text-sm text-navy-500">
          Unable to load notification preferences.
        </p>
      </div>
    );
  }

  return (
    <section className="rounded-lg border border-[color:var(--sh-gray-200)] p-4">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-navy-500">
        Notification Preferences
      </h3>
      <p className="mt-1 text-sm text-navy-500">
        Control which notifications you receive across the app.
      </p>

      <div className="mt-6 space-y-4">
        {/* Global Toggle */}
        <div className="flex items-center justify-between rounded-md border border-[color:var(--sh-gray-200)] bg-[color:var(--sh-gray)] px-4 py-3">
          <div>
            <label htmlFor="global-toggle" className="block text-sm font-medium text-ink">
              All Notifications
            </label>
            <p className="mt-0.5 text-xs text-navy-500">
              Master toggle to enable or disable all notifications at once
            </p>
          </div>
          <input
            id="global-toggle"
            type="checkbox"
            checked={preferences.notifications_enabled}
            onChange={(e) => handleToggleAll(e.target.checked)}
            className="h-5 w-5 cursor-pointer rounded border-[color:var(--sh-gray-200)] text-navy-500 focus:ring-2 focus:ring-brand"
          />
        </div>

        {/* Content Type Tabs */}
        {preferences.notifications_enabled && (
          <div className="space-y-3">
            <div className="flex gap-1 border-b border-[color:var(--sh-gray-200)]">
              {CONTENT_TYPES.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-4 py-2 text-sm font-medium transition-colors ${
                    activeTab === tab.id
                      ? "border-b-2 border-ink text-ink"
                      : "text-navy-500 hover:text-ink"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Notification Types Table */}
            <div className="overflow-hidden rounded-lg border border-[color:var(--sh-gray-200)]">
              <table className="w-full">
                <thead className="bg-[color:var(--sh-gray)]">
                  <tr className="border-b border-[color:var(--sh-gray-200)]">
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-navy-500">
                      Notification Type
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-navy-500">
                      <div className="flex flex-col items-center gap-1">
                        <span>Enabled</span>
                        <input
                          type="checkbox"
                          checked={allInAppChecked}
                          onChange={(e) => handleToggleAllInApp(e.target.checked)}
                          className="h-4 w-4 cursor-pointer rounded border-[color:var(--sh-gray-200)] text-navy-500 focus:ring-2 focus:ring-brand"
                          title="Toggle all notifications"
                          aria-label="Toggle all notifications"
                        />
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[color:var(--sh-gray-200)]">
                  {NOTIFICATION_TYPES.map((notif) => {
                    const key = notif.key;
                    const description = activeTab === "blogs" ? notif.blogDescription : notif.socialPostDescription;
                    return (
                      <tr key={key} className="hover:bg-blurple-50">
                        <td className="px-4 py-3">
                          <div className="text-sm font-medium text-ink">{notif.label}</div>
                          <p className="mt-1 text-xs text-navy-500">{description}</p>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <input
                            type="checkbox"
                            checked={preferences[key]}
                            onChange={(e) => handleTogglePreference(key, e.target.checked)}
                            className="h-5 w-5 cursor-pointer rounded border-[color:var(--sh-gray-200)] text-navy-500 focus:ring-2 focus:ring-brand"
                            aria-label={`${notif.label}`}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Save button */}
      <div className="mt-6 flex justify-end">
        <button
          onClick={handleSave}
          disabled={!hasChanges || isSaving}
          className="rounded-md bg-ink px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 hover:bg-navy-700 focus:outline-none focus:ring-2 focus:ring-brand focus:ring-offset-2"
        >
          {isSaving ? "Saving..." : "Save Preferences"}
        </button>
      </div>
    </section>
  );
}
