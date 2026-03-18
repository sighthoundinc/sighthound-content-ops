"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

type SystemStatusType = "saving" | "success" | "warning" | "error" | "info";

type NotificationInput = {
  message: string;
  href?: string;
  icon?: string;
};

type NotificationItem = {
  id: string;
  message: string;
  href: string | null;
  icon: string;
  createdAt: number;
  read: boolean;
};

type SystemStatusItem = {
  id: string;
  type: SystemStatusType;
  message: string;
  durationMs: number | null;
  actionLabel: string | null;
  onAction: (() => void) | null;
  closing: boolean;
  signature: string;
  dedupCount: number;
  lastFiredAt: number;
  persistent: boolean;
};

type ShowStatusOptions = {
  durationMs?: number | null;
  actionLabel?: string;
  onAction?: () => void;
  notification?: NotificationInput;
  id?: string;
  persistent?: boolean;
  deduplicationContext?: string;
};

interface SystemFeedbackContextValue {
  statuses: SystemStatusItem[];
  notifications: NotificationItem[];
  unreadCount: number;
  showSaving: (message: string, options?: ShowStatusOptions) => string;
  showSuccess: (message: string, options?: ShowStatusOptions) => string;
  showWarning: (message: string, options?: ShowStatusOptions) => string;
  showError: (message: string, options?: ShowStatusOptions) => string;
  showInfo: (message: string, options?: ShowStatusOptions) => string;
  updateStatus: (
    id: string,
    payload: { type: SystemStatusType; message: string } & ShowStatusOptions
  ) => void;
  dismissStatus: (id: string) => void;
  pushNotification: (notification: NotificationInput) => void;
  markNotificationAsRead: (id: string) => void;
  clearNotifications: () => void;
}

const SystemFeedbackContext = createContext<SystemFeedbackContextValue | null>(null);

const STATUS_DEFAULT_DURATIONS: Record<SystemStatusType, number | null> = {
  saving: null,
  success: 3600,
  warning: 4200,
  error: 5000,
  info: 3600,
};

const STATUS_EXIT_MS = 250;
const STATUS_LIMIT = 3;
const NOTIFICATION_LIMIT = 5;

function createId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function generateSignature(
  type: SystemStatusType,
  message: string,
  context?: string
): string {
  const normalized = message.toLowerCase().slice(0, 50);
  const parts = [type, normalized];
  if (context) {
    parts.push(context);
  }
  return parts.join("::");
}

function isKeywordError(message: string): boolean {
  const errorKeywords = ["permission", "failed", "blocked", "error", "denied"];
  return errorKeywords.some((keyword) =>
    message.toLowerCase().includes(keyword)
  );
}

function getStatusIcon(type: SystemStatusType) {
  if (type === "saving") {
    return (
      <span className="inline-flex h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-slate-500" />
    );
  }
  if (type === "success") {
    return <span className="text-sm font-semibold text-emerald-600">✔</span>;
  }
  if (type === "warning") {
    return <span className="text-sm font-semibold text-amber-600">⚠</span>;
  }
  if (type === "info") {
    return <span className="text-sm font-semibold text-blue-600">ℹ</span>;
  }
  return <span className="text-sm font-semibold text-rose-600">⚠</span>;
}

function SystemStatusCard({
  item,
  onDismiss,
}: {
  item: SystemStatusItem;
  onDismiss: (id: string) => void;
}) {
  const [isVisible, setIsVisible] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [remainingMs, setRemainingMs] = useState<number | null>(item.durationMs);
  const timeoutRef = useRef<number | null>(null);
  const timerStartRef = useRef<number | null>(null);

  const clearTimer = useCallback(() => {
    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    timerStartRef.current = null;
  }, []);

  useEffect(() => {

    window.requestAnimationFrame(() => {
      setIsVisible(true);
    });
  }, []);

  const startTimer = useCallback(() => {
    if (item.persistent || remainingMs === null || remainingMs <= 0 || item.closing) {
      return;
    }
    clearTimer();
    timerStartRef.current = Date.now();
    timeoutRef.current = window.setTimeout(() => {
      onDismiss(item.id);
    }, remainingMs);
  }, [clearTimer, item.closing, item.id, item.persistent, onDismiss, remainingMs]);

  useEffect(() => {
    setRemainingMs(item.durationMs);
  }, [item.durationMs, item.message, item.type]);

  useEffect(() => {
    if (item.closing) {
      setIsVisible(false);
      clearTimer();
      return;
    }
    if (isPaused) {
      clearTimer();
      return;
    }
    startTimer();
    return clearTimer;
  }, [clearTimer, isPaused, item.closing, startTimer]);

  const handlePause = () => {
    if (remainingMs === null || item.closing) {
      return;
    }
    if (timerStartRef.current !== null) {
      const elapsed = Date.now() - timerStartRef.current;
      setRemainingMs((previous) =>
        previous === null ? null : Math.max(0, previous - elapsed)
      );
    }
    setIsPaused(true);
  };

  const handleResume = () => {
    if (remainingMs === null || item.closing) {
      return;
    }
    setIsPaused(false);
  };

  return (
    <div
      className={`pointer-events-auto flex w-full items-start gap-3 rounded-[10px] border bg-white px-3 py-2 shadow-sm transition-all ${
        item.type === "error"
          ? "border-rose-300"
          : item.type === "warning"
            ? "border-amber-200"
          : item.type === "success"
            ? "border-emerald-100"
            : item.type === "info"
              ? "border-blue-100"
            : "border-slate-200"
      } ${
        item.closing ? "translate-y-0 opacity-0 duration-[250ms]" : ""
      } ${
        !item.closing && isVisible
          ? "translate-y-0 opacity-100 duration-[180ms]"
          : "translate-y-3 opacity-0 duration-[180ms]"
      }`}
      onMouseEnter={handlePause}
      onMouseLeave={handleResume}
    >
      <span className="mt-0.5 inline-flex shrink-0 items-center justify-center">
        {getStatusIcon(item.type)}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p className={`text-sm ${item.type === "error" ? "font-medium text-slate-900" : "text-slate-800"}`}>{item.message}</p>
          {item.dedupCount > 1 ? (
            <span className="text-[10px] text-slate-500">({item.dedupCount}x)</span>
          ) : null}
        </div>
        {item.actionLabel && item.onAction ? (
          <button
            type="button"
            className="mt-1 inline-flex rounded border border-slate-300 bg-white px-2 py-0.5 text-xs font-medium text-slate-700 hover:bg-slate-100"
            onClick={() => {
              item.onAction?.();
            }}
          >
            {item.actionLabel}
          </button>
        ) : null}
      </div>
      <button
        type="button"
        className="rounded px-1 text-xs text-slate-500 hover:bg-slate-100 hover:text-slate-700"
        aria-label="Dismiss status"
        onClick={() => {
          onDismiss(item.id);
        }}
      >
        ✕
      </button>
    </div>
  );
}

export function SystemFeedbackProvider({ children }: { children: React.ReactNode }) {
  const [statuses, setStatuses] = useState<SystemStatusItem[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  const removeStatusNow = useCallback((id: string) => {
    setStatuses((previous) => previous.filter((status) => status.id !== id));
  }, []);

  const dismissStatus = useCallback(
    (id: string) => {
      setStatuses((previous) =>
        previous.map((status) =>
          status.id === id ? { ...status, closing: true } : status
        )
      );
      window.setTimeout(() => {
        removeStatusNow(id);
      }, STATUS_EXIT_MS);
    },
    [removeStatusNow]
  );

  const pushNotification = useCallback((notification: NotificationInput) => {
    const next: NotificationItem = {
      id: createId(),
      message: notification.message,
      href: notification.href ?? null,
      icon: notification.icon ?? "🔔",
      createdAt: Date.now(),
      read: false,
    };
    setNotifications((previous) => [next, ...previous].slice(0, NOTIFICATION_LIMIT));
  }, []);

  const enqueueStatus = useCallback(
    (type: SystemStatusType, message: string, options?: ShowStatusOptions) => {
      const now = Date.now();
      const signature = generateSignature(
        type,
        message,
        options?.deduplicationContext
      );
      const isPersistent =
        options?.persistent ??
        (type === "error" && isKeywordError(message));

      let returnId = "";

      // Single setState call to handle both dedup check and new/update logic
      setStatuses((previous) => {
        // Check if we can dedup (within 2s window)
        const existing = previous.find(
          (status) =>
            !status.closing &&
            status.signature === signature &&
            now - status.lastFiredAt < 2000
        );

        if (existing) {
          returnId = existing.id;
          // Update existing toast with incremented count and reset timer
          return previous.map((status) =>
            status.id === existing.id
              ? {
                  ...status,
                  dedupCount: status.dedupCount + 1,
                  lastFiredAt: now,
                  durationMs:
                    options?.durationMs ??
                    STATUS_DEFAULT_DURATIONS[type],
                }
              : status
          );
        }

        // Create new status item
        const id = options?.id ?? createId();
        returnId = id;
        const nextStatus: SystemStatusItem = {
          id,
          type,
          message,
          durationMs: options?.durationMs ?? STATUS_DEFAULT_DURATIONS[type],
          actionLabel: options?.actionLabel ?? null,
          onAction: options?.onAction ?? null,
          closing: false,
          signature,
          dedupCount: 1,
          lastFiredAt: now,
          persistent: isPersistent,
        };

        const withNew = [...previous, nextStatus];
        const active = withNew.filter((status) => !status.closing);
        if (active.length <= STATUS_LIMIT) {
          return withNew;
        }
        const overflowStatusId = active[0]?.id ?? null;
        if (overflowStatusId) {
          window.setTimeout(() => {
            removeStatusNow(overflowStatusId);
          }, STATUS_EXIT_MS);
        }
        return withNew.map((status) =>
          status.id === overflowStatusId ? { ...status, closing: true } : status
        );
      });

      if (options?.notification) {
        pushNotification(options.notification);
      }

      return returnId;
    },
    [pushNotification, removeStatusNow]
  );

  const showSaving = useCallback(
    (message: string, options?: ShowStatusOptions) =>
      enqueueStatus("saving", message, {
        ...options,
        durationMs: options?.durationMs ?? STATUS_DEFAULT_DURATIONS.saving,
      }),
    [enqueueStatus]
  );

  const showSuccess = useCallback(
    (message: string, options?: ShowStatusOptions) =>
      enqueueStatus("success", message, {
        ...options,
        durationMs: options?.durationMs ?? STATUS_DEFAULT_DURATIONS.success,
      }),
    [enqueueStatus]
  );
  const showWarning = useCallback(
    (message: string, options?: ShowStatusOptions) =>
      enqueueStatus("warning", message, {
        ...options,
        durationMs: options?.durationMs ?? STATUS_DEFAULT_DURATIONS.warning,
      }),
    [enqueueStatus]
  );

  const showError = useCallback(
    (message: string, options?: ShowStatusOptions) =>
      enqueueStatus("error", message, {
        ...options,
        durationMs: options?.durationMs ?? STATUS_DEFAULT_DURATIONS.error,
      }),
    [enqueueStatus]
  );

  const showInfo = useCallback(
    (message: string, options?: ShowStatusOptions) =>
      enqueueStatus("info", message, {
        ...options,
        durationMs: options?.durationMs ?? STATUS_DEFAULT_DURATIONS.info,
      }),
    [enqueueStatus]
  );

  const updateStatus = useCallback(
    (
      id: string,
      payload: { type: SystemStatusType; message: string } & ShowStatusOptions
    ) => {
      const now = Date.now();
      setStatuses((previous) => {
        const found = previous.some((status) => status.id === id);
        if (!found && process.env.NODE_ENV === "development") {
          console.warn(
            `updateStatus called with non-existent ID: ${id}. Check progress → result chaining pattern.`
          );
        }
        return previous.map((status) =>
          status.id === id
            ? {
                ...status,
                type: payload.type,
                message: payload.message,
                durationMs:
                  payload.durationMs ?? STATUS_DEFAULT_DURATIONS[payload.type],
                actionLabel: payload.actionLabel ?? null,
                onAction: payload.onAction ?? null,
                closing: false,
                signature: generateSignature(
                  payload.type,
                  payload.message,
                  payload.deduplicationContext
                ),
                dedupCount: 1,
                lastFiredAt: now,
                persistent:
                  payload.persistent ??
                  (payload.type === "error" &&
                    isKeywordError(payload.message)),
              }
            : status
        );
      });
      if (payload.notification) {
        pushNotification(payload.notification);
      }
    },
    [pushNotification]
  );

  const markNotificationAsRead = useCallback((id: string) => {
    setNotifications((previous) =>
      previous.map((notification) =>
        notification.id === id ? { ...notification, read: true } : notification
      )
    );
  }, []);

  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  const unreadCount = useMemo(
    () => notifications.filter((notification) => !notification.read).length,
    [notifications]
  );

  const value: SystemFeedbackContextValue = {
    statuses,
    notifications,
    unreadCount,
    showSaving,
    showSuccess,
    showWarning,
    showError,
    showInfo,
    updateStatus,
    dismissStatus,
    pushNotification,
    markNotificationAsRead,
    clearNotifications,
  };

  return (
    <SystemFeedbackContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed bottom-6 left-6 z-[100] flex w-[calc(100%-3rem)] max-w-80 flex-col gap-2">
        {statuses.map((status) => (
          <SystemStatusCard
            key={status.id}
            item={status}
            onDismiss={dismissStatus}
          />
        ))}
      </div>
    </SystemFeedbackContext.Provider>
  );
}

export function useSystemFeedback() {
  const context = useContext(SystemFeedbackContext);
  if (!context) {
    throw new Error("useSystemFeedback must be used inside SystemFeedbackProvider.");
  }
  return context;
}

