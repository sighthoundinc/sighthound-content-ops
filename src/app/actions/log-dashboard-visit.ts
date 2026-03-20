"use server";

import { logAccessEvent } from "@/lib/access-logging";

/**
 * Server action to log a dashboard visit event.
 * Called from the client-side dashboard page when it loads.
 */
export async function logDashboardVisitEvent(userId: string): Promise<void> {
  try {
    await logAccessEvent(userId, "dashboard_visit");
  } catch (error) {
    console.error("Failed to log dashboard visit event:", error);
    // Don't throw - we don't want page load to fail if logging fails
  }
}
