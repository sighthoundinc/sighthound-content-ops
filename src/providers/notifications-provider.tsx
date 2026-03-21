"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import { shouldSendNotification } from "@/lib/notification-helpers";
import { getUserNotificationPreferencesWithCache } from "@/lib/notification-preferences-cache";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import type { NotificationInput, NotificationType } from "@/lib/notification-types";

// Re-export for convenience
export type { NotificationInput, NotificationType } from "@/lib/notification-types";

type NotificationItem = {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  href: string | null;
  createdAt: number;
  read: boolean;
};

interface NotificationsContextValue {
  notifications: NotificationItem[];
  unreadCount: number;
  pushNotification: (notification: NotificationInput) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearNotification: (id: string) => void;
  clearAll: () => void;
}

const NotificationsContext = createContext<NotificationsContextValue | null>(
  null
);

const NOTIFICATION_LIMIT = 50;

function createId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function NotificationsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [userIdCache, setUserIdCache] = useState<string | null>(null);

  /**
   * Enhanced pushNotification with automatic preference enforcement.
   * This is the ONLY place notifications enter the system.
   * All emissions are automatically filtered by user preferences.
   */
  const pushNotification = useCallback(
    async (notification: NotificationInput) => {
      try {
        // Get current user from Supabase session
        const supabase = getSupabaseBrowserClient();
        const { data: sessionData } = await supabase.auth.getSession();
        const userId = sessionData?.session?.user?.id || userIdCache;

        if (userId && userId !== userIdCache) {
          setUserIdCache(userId);
        }

        // Check preferences before emitting
        if (userId) {
          try {
            const preferences =
              await getUserNotificationPreferencesWithCache(userId);

            // Enforce preferences - skip notification if not allowed
            if (!shouldSendNotification(notification.type, preferences)) {
              // Silently skip - user has disabled this notification type
              return;
            }
          } catch (error) {
            // On preference check failure, log but continue (fail-open)
            console.warn(
              "Could not check notification preferences, allowing notification",
              error
            );
          }
        }

        // Create and emit notification
        const next: NotificationItem = {
          id: createId(),
          type: notification.type,
          title: notification.title,
          message: notification.message,
          href: notification.href ?? null,
          createdAt: notification.timestamp ?? Date.now(),
          read: false,
        };
        setNotifications((previous) =>
          [next, ...previous].slice(0, NOTIFICATION_LIMIT)
        );
      } catch (error) {
        // If anything goes wrong with enforcement, still allow notification
        // (better to over-notify than under-notify)
        console.error("Error in notification enforcement, proceeding", error);
        const next: NotificationItem = {
          id: createId(),
          type: notification.type,
          title: notification.title,
          message: notification.message,
          href: notification.href ?? null,
          createdAt: notification.timestamp ?? Date.now(),
          read: false,
        };
        setNotifications((previous) =>
          [next, ...previous].slice(0, NOTIFICATION_LIMIT)
        );
      }
    },
    [userIdCache]
  );

  const markAsRead = useCallback((id: string) => {
    setNotifications((previous) =>
      previous.map((notification) =>
        notification.id === id ? { ...notification, read: true } : notification
      )
    );
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications((previous) =>
      previous.map((notification) => ({ ...notification, read: true }))
    );
  }, []);

  const clearNotification = useCallback((id: string) => {
    setNotifications((previous) =>
      previous.filter((notification) => notification.id !== id)
    );
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  const unreadCount = useMemo(
    () => notifications.filter((notification) => !notification.read).length,
    [notifications]
  );

  const value: NotificationsContextValue = {
    notifications,
    unreadCount,
    pushNotification,
    markAsRead,
    markAllAsRead,
    clearNotification,
    clearAll,
  };

  return (
    <NotificationsContext.Provider value={value}>
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationsContext);
  if (!context) {
    throw new Error(
      "useNotifications must be used inside NotificationsProvider."
    );
  }
  return context;
}
