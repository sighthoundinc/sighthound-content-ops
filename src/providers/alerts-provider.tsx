"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { AppIcon, CloseIcon, type AppIconName } from "@/lib/icons";

type AlertType = "saving" | "success" | "warning" | "error" | "info";

type AlertItem = {
  id: string;
  type: AlertType;
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

type AlertNotificationInput = {
  message: string;
  href?: string;
  icon?: string;
};

type ShowAlertOptions = {
  durationMs?: number | null;
  actionLabel?: string;
  onAction?: () => void;
  id?: string;
  persistent?: boolean;
  deduplicationContext?: string;
  notification?: AlertNotificationInput;
};

interface AlertsContextValue {
  alerts: AlertItem[];
  showSaving: (message: string, options?: ShowAlertOptions) => string;
  showSuccess: (message: string, options?: ShowAlertOptions) => string;
  showWarning: (message: string, options?: ShowAlertOptions) => string;
  showError: (message: string, options?: ShowAlertOptions) => string;
  showInfo: (message: string, options?: ShowAlertOptions) => string;
  updateAlert: (
    id: string,
    payload: { type: AlertType; message: string } & ShowAlertOptions
  ) => void;
  dismissAlert: (id: string) => void;
}

const AlertsContext = createContext<AlertsContextValue | null>(null);

const ALERT_DEFAULT_DURATIONS: Record<AlertType, number | null> = {
  saving: 5000, // Max 5 seconds to prevent indefinite display
  success: 3600,
  warning: 4200,
  error: 5000,
  info: 3600,
};

// Global maximum duration cap: no toast can stay longer than 5 seconds
const ALERT_MAX_DURATION_MS = 5000;

const ALERT_EXIT_MS = 250;
const ALERT_LIMIT = 3;

function createId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function generateSignature(
  type: AlertType,
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

function getAlertIcon(type: AlertType): AppIconName {
  switch (type) {
    case "saving":
      return "loading";
    case "success":
      return "success";
    case "warning":
      return "warning";
    case "info":
      return "info";
    case "error":
      return "error";
  }
}

function AlertCard({
  item,
  onDismiss,
}: {
  item: AlertItem;
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

  const borderClass =
    item.type === "error"
      ? "border-rose-300"
      : item.type === "warning"
        ? "border-amber-200"
        : item.type === "success"
          ? "border-emerald-100"
          : item.type === "info"
            ? "border-[color:var(--sh-blurple-100)]"
            : "border-[color:var(--sh-gray-200)]";

  const iconColor =
    item.type === "error"
      ? "text-rose-600"
      : item.type === "warning"
        ? "text-amber-600"
        : item.type === "success"
          ? "text-emerald-600"
          : item.type === "info"
            ? "text-brand"
            : "text-navy-500";

  return (
    <div
      className={`pointer-events-auto flex w-full items-start gap-3 rounded-[10px] border bg-white px-3 py-2 shadow-sm transition-all ${borderClass} ${
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
        <AppIcon name={getAlertIcon(item.type)} className={iconColor} boxClassName="h-5 w-5" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p
            className={`text-sm ${
              item.type === "error" ? "font-medium text-ink" : "text-ink"
            }`}
          >
            {item.message}
          </p>
          {item.dedupCount > 1 ? (
            <span className="text-[10px] text-navy-500">({item.dedupCount}x)</span>
          ) : null}
        </div>
        {item.actionLabel && item.onAction ? (
          <button
            type="button"
            className="mt-1 inline-flex rounded border border-[color:var(--sh-gray-200)] bg-white px-2 py-0.5 text-xs font-medium text-navy-500 hover:bg-blurple-50"
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
        className="rounded px-1 text-xs text-navy-500 hover:bg-blurple-50 hover:text-navy-500"
        aria-label="Dismiss alert"
        onClick={() => {
          onDismiss(item.id);
        }}
      >
        <CloseIcon boxClassName="h-4 w-4" />
      </button>
    </div>
  );
}

export function AlertsProvider({ children }: { children: React.ReactNode }) {
  const [alerts, setAlerts] = useState<AlertItem[]>([]);

  const removeAlertNow = useCallback((id: string) => {
    setAlerts((previous) => previous.filter((alert) => alert.id !== id));
  }, []);

  const dismissAlert = useCallback(
    (id: string) => {
      setAlerts((previous) =>
        previous.map((alert) =>
          alert.id === id ? { ...alert, closing: true } : alert
        )
      );
      window.setTimeout(() => {
        removeAlertNow(id);
      }, ALERT_EXIT_MS);
    },
    [removeAlertNow]
  );

  const enqueueAlert = useCallback(
    (type: AlertType, message: string, options?: ShowAlertOptions) => {
      const now = Date.now();
      const signature = generateSignature(
        type,
        message,
        options?.deduplicationContext
      );
      const isPersistent =
        options?.persistent ?? (type === "error" && isKeywordError(message));

      // Enforce global max duration: no toast stays longer than 5 seconds
      const finalDuration =
        options?.durationMs ?? ALERT_DEFAULT_DURATIONS[type];
      const cappedDuration =
        finalDuration === null
          ? ALERT_MAX_DURATION_MS
          : Math.min(finalDuration, ALERT_MAX_DURATION_MS);

      let returnId = "";

      setAlerts((previous) => {
        const existing = previous.find(
          (alert) =>
            !alert.closing &&
            alert.signature === signature &&
            now - alert.lastFiredAt < 2000
        );

        if (existing) {
          returnId = existing.id;
          return previous.map((alert) =>
            alert.id === existing.id
              ? {
                  ...alert,
                  dedupCount: alert.dedupCount + 1,
                  lastFiredAt: now,
                  durationMs: cappedDuration,
                }
              : alert
          );
        }

        const id = options?.id ?? createId();
        returnId = id;
        const nextAlert: AlertItem = {
          id,
          type,
          message,
          durationMs: cappedDuration,
          actionLabel: options?.actionLabel ?? null,
          onAction: options?.onAction ?? null,
          closing: false,
          signature,
          dedupCount: 1,
          lastFiredAt: now,
          persistent: isPersistent,
        };

        const withNew = [...previous, nextAlert];
        const active = withNew.filter((alert) => !alert.closing);
        if (active.length <= ALERT_LIMIT) {
          return withNew;
        }
        const overflowAlertId = active[0]?.id ?? null;
        if (overflowAlertId) {
          window.setTimeout(() => {
            removeAlertNow(overflowAlertId);
          }, ALERT_EXIT_MS);
        }
        return withNew.map((alert) =>
          alert.id === overflowAlertId ? { ...alert, closing: true } : alert
        );
      });

      return returnId;
    },
    [removeAlertNow]
  );

  const showSaving = useCallback(
    (message: string, options?: ShowAlertOptions) =>
      enqueueAlert("saving", message, {
        ...options,
        durationMs: options?.durationMs ?? ALERT_DEFAULT_DURATIONS.saving,
      }),
    [enqueueAlert]
  );

  const showSuccess = useCallback(
    (message: string, options?: ShowAlertOptions) =>
      enqueueAlert("success", message, {
        ...options,
        durationMs: options?.durationMs ?? ALERT_DEFAULT_DURATIONS.success,
      }),
    [enqueueAlert]
  );

  const showWarning = useCallback(
    (message: string, options?: ShowAlertOptions) =>
      enqueueAlert("warning", message, {
        ...options,
        durationMs: options?.durationMs ?? ALERT_DEFAULT_DURATIONS.warning,
      }),
    [enqueueAlert]
  );

  const showError = useCallback(
    (message: string, options?: ShowAlertOptions) =>
      enqueueAlert("error", message, {
        ...options,
        durationMs: options?.durationMs ?? ALERT_DEFAULT_DURATIONS.error,
      }),
    [enqueueAlert]
  );

  const showInfo = useCallback(
    (message: string, options?: ShowAlertOptions) =>
      enqueueAlert("info", message, {
        ...options,
        durationMs: options?.durationMs ?? ALERT_DEFAULT_DURATIONS.info,
      }),
    [enqueueAlert]
  );

  const updateAlert = useCallback(
    (
      id: string,
      payload: { type: AlertType; message: string } & ShowAlertOptions
    ) => {
      const now = Date.now();
      setAlerts((previous) => {
        const found = previous.some((alert) => alert.id === id);
        if (!found && process.env.NODE_ENV === "development") {
          console.warn(
            `updateAlert called with non-existent ID: ${id}. Check progress → result chaining pattern.`
          );
        }
        // Enforce global max duration cap
        const finalDuration =
          payload.durationMs ?? ALERT_DEFAULT_DURATIONS[payload.type];
        const cappedDuration =
          finalDuration === null
            ? ALERT_MAX_DURATION_MS
            : Math.min(finalDuration, ALERT_MAX_DURATION_MS);
        return previous.map((alert) =>
          alert.id === id
            ? {
                ...alert,
                type: payload.type,
                message: payload.message,
                durationMs: cappedDuration,
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
            : alert
        );
      });
    },
    []
  );

  const value: AlertsContextValue = {
    alerts,
    showSaving,
    showSuccess,
    showWarning,
    showError,
    showInfo,
    updateAlert,
    dismissAlert,
  };

  return (
    <AlertsContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed bottom-6 left-6 z-[300] flex w-[calc(100%-3rem)] max-w-80 flex-col gap-2">
        {alerts.map((alert) => (
          <AlertCard
            key={alert.id}
            item={alert}
            onDismiss={dismissAlert}
          />
        ))}
      </div>
    </AlertsContext.Provider>
  );
}

export function useAlerts() {
  const context = useContext(AlertsContext);
  if (!context) {
    throw new Error("useAlerts must be used inside AlertsProvider.");
  }
  return context;
}
