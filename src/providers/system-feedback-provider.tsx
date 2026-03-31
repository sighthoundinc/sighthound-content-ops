/**
 * @deprecated Use `AlertsProvider` and `NotificationsProvider` directly.
 *
 * This file is kept for backward compatibility only. All new code should import from:
 * - `alerts-provider.tsx` for alerts (ephemeral toasts like "Saved", "Done")
 * - `notifications-provider.tsx` for workflow notifications (task assignments, stage changes)
 *
 * Migration path:
 * - Replace `useSystemFeedback()` with `useAlerts()` for action feedback
 * - Replace `useSystemFeedback()` with `useNotifications()` for workflow updates
 * - Replace `SystemFeedbackProvider` with `AlertsProvider` and `NotificationsProvider`
 */

"use client";

import { useAlerts } from "./alerts-provider";
export { AlertsProvider as SystemFeedbackProvider } from "./alerts-provider";

// Create a wrapper hook that provides the old interface for backward compatibility
export function useSystemFeedback() {
  const alerts = useAlerts();
  
  return {
    // Old names for alerts
    statuses: alerts.alerts,
    notifications: [],
    unreadCount: 0,
    showSaving: alerts.showSaving,
    showSuccess: alerts.showSuccess,
    showWarning: alerts.showWarning,
    showError: alerts.showError,
    showInfo: alerts.showInfo,
    updateStatus: alerts.updateAlert,
    dismissStatus: alerts.dismissAlert,
    // Old notification methods (now no-ops for backward compatibility)
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    pushNotification: (_notification: { message: string; href?: string; icon?: string }) => {},
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    markNotificationAsRead: (_id: string) => {},
    clearNotifications: () => {},
  };
}
