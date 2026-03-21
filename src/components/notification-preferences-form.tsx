"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/providers/auth-provider";
import { useAlerts } from "@/providers/alerts-provider";
import type { UserNotificationPreferences } from "@/lib/notification-helpers";

interface NotificationPreferencesFormProps {
  onSaveSuccess?: () => void;
}

const NOTIFICATION_TYPES = [
  {
    key: "notify_on_task_assigned" as const,
    label: "Task Assignment",
    description: "When you are assigned a new blog or social post",
  },
  {
    key: "notify_on_stage_changed" as const,
    label: "Stage Changes",
    description: "When a content item moves to a new workflow stage",
  },
  {
    key: "notify_on_awaiting_action" as const,
    label: "Awaiting Action",
    description: "When content requires your immediate attention or revision",
  },
  {
    key: "notify_on_mention" as const,
    label: "Mentions",
    description: "When you are mentioned in comments or discussions",
  },
  {
    key: "notify_on_submitted_for_review" as const,
    label: "Submissions",
    description: "When content is submitted for your review",
  },
  {
    key: "notify_on_published" as const,
    label: "Publications",
    description: "When content you worked on is published",
  },
  {
    key: "notify_on_assignment_changed" as const,
    label: "Assignment Changes",
    description: "When your assignment on content changes",
  },
];

export function NotificationPreferencesForm({
  onSaveSuccess,
}: NotificationPreferencesFormProps) {
  const { session } = useAuth();
  const { showSuccess, showError } = useAlerts();

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [preferences, setPreferences] = useState<UserNotificationPreferences | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  // Fetch preferences on mount
  useEffect(() => {
    const fetchPreferences = async () => {
      if (!session?.user?.id) return;

      try {
        setIsLoading(true);
        const response = await fetch("/api/users/notification-preferences", {
          method: "GET",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            "Content-Type": "application/json",
          },
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch preferences: ${response.statusText}`);
        }

        const data = (await response.json()) as UserNotificationPreferences;
        setPreferences(data);
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

    fetchPreferences();
  }, [session?.user?.id, session?.access_token, showError]);

  const handleToggleAll = (enabled: boolean) => {
    if (!preferences) return;
    setPreferences({
      notifications_enabled: enabled,
      notify_on_task_assigned: enabled,
      notify_on_stage_changed: enabled,
      notify_on_awaiting_action: enabled,
      notify_on_mention: enabled,
      notify_on_submitted_for_review: enabled,
      notify_on_published: enabled,
      notify_on_assignment_changed: enabled,
    });
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
    if (!session?.user?.id || !preferences || !hasChanges) return;

    try {
      setIsSaving(true);
      const response = await fetch("/api/users/notification-preferences", {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(preferences),
      });

      if (!response.ok) {
        throw new Error(`Failed to save preferences: ${response.statusText}`);
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
            className="h-5 w-5 cursor-pointer rounded border-slate-300 text-blue-600 focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Individual toggles */}
        {preferences.notifications_enabled && (
          <div className="space-y-3">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Notification Types
            </p>
            {NOTIFICATION_TYPES.map(({ key, label, description }) => (
              <div key={key} className="flex items-start justify-between rounded-md border border-slate-200 px-4 py-3">
                <div className="flex-1">
                  <label htmlFor={key} className="block text-sm font-medium text-slate-900">
                    {label}
                  </label>
                  <p className="mt-0.5 text-xs text-slate-600">{description}</p>
                </div>
                <input
                  id={key}
                  type="checkbox"
                  checked={preferences[key]}
                  onChange={(e) => handleTogglePreference(key, e.target.checked)}
                  className="ml-4 mt-0.5 h-5 w-5 cursor-pointer rounded border-slate-300 text-blue-600 focus:ring-2 focus:ring-blue-500"
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Save button */}
      <div className="mt-6 flex justify-end">
        <button
          onClick={handleSave}
          disabled={!hasChanges || isSaving}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          {isSaving ? "Saving..." : "Save Preferences"}
        </button>
      </div>
    </section>
  );
}
