"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";

type NotificationType =
  | "task_assigned"
  | "stage_changed"
  | "awaiting_action"
  | "mention";

export type NotificationInput = {
  type: NotificationType;
  title: string;
  message: string;
  href?: string;
  timestamp?: number;
};

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

  const pushNotification = useCallback((notification: NotificationInput) => {
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
  }, []);

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
