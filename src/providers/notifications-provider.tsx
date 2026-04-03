"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
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
  sourceId: string | null;
  type: NotificationType;
  title: string;
  message: string;
  href: string | null;
  createdAt: number;
  read: boolean;
  cleared: boolean;
};

interface NotificationsContextValue {
  notifications: NotificationItem[];
  clearedNotifications: NotificationItem[];
  allNotifications: NotificationItem[];
  unreadCount: number;
  pushNotification: (notification: NotificationInput) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearNotification: (id: string) => void;
  clearAll: () => void;
  restoreNotification: (id: string) => void;
  restoreAllCleared: () => void;
}

const NotificationsContext = createContext<NotificationsContextValue | null>(
  null
);

const NOTIFICATION_LIMIT = 200;
const NOTIFICATION_STORAGE_KEY_PREFIX = "notifications:v2";

function getStorageKey(userId: string) {
  return `${NOTIFICATION_STORAGE_KEY_PREFIX}:${userId}`;
}

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
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    const hydrate = async () => {
      const supabase = getSupabaseBrowserClient();
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData?.session?.user?.id ?? null;
      setUserIdCache(userId);
      if (!userId) {
        setNotifications([]);
        setIsHydrated(true);
        return;
      }
      if (typeof window === "undefined") {
        setIsHydrated(true);
        return;
      }
      const stored = window.localStorage.getItem(getStorageKey(userId));
      if (!stored) {
        setNotifications([]);
        setIsHydrated(true);
        return;
      }
      try {
        const parsed = JSON.parse(stored) as NotificationItem[];
        if (!Array.isArray(parsed)) {
          setNotifications([]);
          setIsHydrated(true);
          return;
        }
        setNotifications(
          parsed
            .filter(
              (item): item is NotificationItem =>
                Boolean(item?.id) &&
                typeof item.type === "string" &&
                typeof item.title === "string" &&
                typeof item.message === "string" &&
                typeof item.createdAt === "number"
            )
            .slice(0, NOTIFICATION_LIMIT)
        );
      } catch {
        setNotifications([]);
      }
      setIsHydrated(true);
    };
    void hydrate();
  }, []);

  useEffect(() => {
    if (!isHydrated || !userIdCache || typeof window === "undefined") {
      return;
    }
    window.localStorage.setItem(
      getStorageKey(userIdCache),
      JSON.stringify(notifications)
    );
  }, [isHydrated, notifications, userIdCache]);

  const upsertNotification = useCallback(
    (notification: NotificationInput) => {
      const sourceId = notification.sourceId ?? notification.metadata?.sourceId ?? null;
      const fallbackId = createId();
      const nextNotification: NotificationItem = {
        id: sourceId ?? fallbackId,
        sourceId,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        href: notification.href ?? null,
        createdAt: notification.timestamp ?? Date.now(),
        read: false,
        cleared: false,
      };
      setNotifications((previous) => {
        const existingIndex = sourceId
          ? previous.findIndex((item) => item.sourceId === sourceId)
          : -1;
        if (existingIndex === -1) {
          return [nextNotification, ...previous].slice(0, NOTIFICATION_LIMIT);
        }
        const existing = previous[existingIndex];
        const merged: NotificationItem = {
          ...existing,
          type: nextNotification.type,
          title: nextNotification.title,
          message: nextNotification.message,
          href: nextNotification.href,
          createdAt: nextNotification.createdAt,
        };
        const next = [...previous];
        next.splice(existingIndex, 1);
        return [merged, ...next].slice(0, NOTIFICATION_LIMIT);
      });
    },
    []
  );

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
            if (!shouldSendNotification(notification.type, preferences, userId)) {
              // Silently skip - user has disabled this notification type
              return;
            }
          } catch (error) {
            // On preference check failure, log but continue (fail-open)
            console.warn(
              "Could not check notification preferences, allowing notification",
              { userId, type: notification.type, error }
            );
          }
        }

        // Create and emit notification
        upsertNotification(notification);
      } catch (error) {
        // If anything goes wrong with enforcement, still allow notification
        // (better to over-notify than under-notify)
        console.error("Error in notification enforcement, proceeding", error);
        const next: NotificationItem = {
          id: createId(),
          sourceId: notification.sourceId ?? notification.metadata?.sourceId ?? null,
          type: notification.type,
          title: notification.title,
          message: notification.message,
          href: notification.href ?? null,
          createdAt: notification.timestamp ?? Date.now(),
          read: false,
          cleared: false,
        };
        setNotifications((previous) =>
          [next, ...previous].slice(0, NOTIFICATION_LIMIT)
        );
      }
    },
    [upsertNotification, userIdCache]
  );

  const markAsRead = useCallback((id: string) => {
    setNotifications((previous) =>
      previous.map((notification) =>
        notification.id === id ? { ...notification, read: true } : notification
      )
    );
  }, []);

  const restoreNotification = useCallback((id: string) => {
    setNotifications((previous) =>
      previous.map((notification) =>
        notification.id === id ? { ...notification, cleared: false } : notification
      )
    );
  }, []);

  const restoreAllCleared = useCallback(() => {
    setNotifications((previous) =>
      previous.map((notification) => ({ ...notification, cleared: false }))
    );
  }, []);

  const visibleNotifications = useMemo(
    () => notifications.filter((notification) => !notification.cleared),
    [notifications]
  );
  const clearedNotifications = useMemo(
    () => notifications.filter((notification) => notification.cleared),
    [notifications]
  );

  const markAllAsRead = useCallback(() => {
    setNotifications((previous) =>
      previous.map((notification) =>
        notification.cleared ? notification : { ...notification, read: true }
      )
    );
  }, []);

  const clearNotification = useCallback((id: string) => {
    setNotifications((previous) =>
      previous.map((notification) =>
        notification.id === id ? { ...notification, cleared: true } : notification
      )
    );
  }, []);

  const clearAll = useCallback(() => {
    setNotifications((previous) =>
      previous.map((notification) => ({ ...notification, cleared: true }))
    );
  }, []);

  const unreadCount = useMemo(
    () =>
      visibleNotifications.filter((notification) => !notification.read).length,
    [visibleNotifications]
  );

  const value: NotificationsContextValue = {
    notifications: visibleNotifications,
    clearedNotifications,
    allNotifications: notifications,
    unreadCount,
    pushNotification,
    markAsRead,
    markAllAsRead,
    clearNotification,
    clearAll,
    restoreNotification,
    restoreAllCleared,
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
