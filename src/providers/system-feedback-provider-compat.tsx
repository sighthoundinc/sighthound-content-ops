/**
 * @deprecated
 * This is a compatibility wrapper for the old SystemFeedbackProvider.
 * Use `AlertsProvider` and `NotificationsProvider` directly, or `useAlerts()` and `useNotifications()`.
 *
 * This file re-exports the new providers and hooks with their original names for backward compatibility.
 * It will be removed in a future version after all call sites are migrated.
 */

"use client";

export { AlertsProvider as SystemFeedbackProvider } from "./alerts-provider";
export { useAlerts as useSystemFeedback } from "./alerts-provider";
