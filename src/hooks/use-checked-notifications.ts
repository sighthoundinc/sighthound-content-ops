import { useCallback, useEffect, useState } from "react";
import { useNotifications } from "@/providers/notifications-provider";
import { useAuth } from "@/providers/auth-provider";
import {
  shouldSendNotification,
  type NotificationInput,
} from "@/lib/notification-helpers";
import {
  getUserNotificationPreferencesWithCache,
  type UserNotificationPreferences,
} from "@/lib/notification-preferences-cache";

/**
 * Hook for emitting notifications with automatic preference enforcement.
 * Checks user's preferences before adding notification to the in-app queue.
 *
 * Usage:
 * ```tsx
 * const { pushCheckedNotification } = useCheckedNotifications();
 * pushCheckedNotification(blogPublishedNotification(...));
 * ```
 *
 * The hook will:
 * 1. Check if the notification type is enabled in user preferences
 * 2. Check if notifications are globally enabled
 * 3. Only push to in-app queue if preferences allow it
 * 4. Cache preferences per request to avoid repeated DB queries
 */
export function useCheckedNotifications() {
  const { pushNotification } = useNotifications();
  const { user } = useAuth();
  const [preferences, setPreferences] = useState<UserNotificationPreferences | null>(null);
  const [isLoadingPreferences, setIsLoadingPreferences] = useState(true);

  // Load user preferences once on mount
  useEffect(() => {
    if (!user?.id) {
      setIsLoadingPreferences(false);
      return;
    }

    const loadPreferences = async () => {
      try {
        const prefs = await getUserNotificationPreferencesWithCache(user.id);
        setPreferences(prefs);
      } catch (error) {
        console.error("Failed to load notification preferences:", error);
        // Continue with defaults on error
        setPreferences(null);
      } finally {
        setIsLoadingPreferences(false);
      }
    };

    void loadPreferences();
  }, [user?.id]);

  // Emit notification only if preferences allow it
  const pushCheckedNotification = useCallback(
    (notification: NotificationInput) => {
      // Don't emit during preference loading (rare race condition)
      if (isLoadingPreferences) {
        return;
      }

      // Check preferences - if null (error or not loaded), default to allowing emission
      if (shouldSendNotification(notification.type, preferences)) {
        pushNotification(notification);
      }
    },
    [preferences, isLoadingPreferences, pushNotification]
  );

  return {
    pushCheckedNotification,
    isLoadingPreferences,
    preferences,
  };
}
