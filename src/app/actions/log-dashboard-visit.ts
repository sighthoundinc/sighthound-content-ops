"use server";

import { logAccessEvent } from "@/lib/access-logging";
import { getServerSessionUser } from "@/lib/supabase/server-session";
import { isAllowedEmail } from "@/lib/allowed-email";

/**
 * Server action to log a dashboard visit event.
 *
 * The userId is resolved from the server-side session cookie and never
 * accepted from the client. This prevents spoofed visit events from being
 * written into `access_logs` (which uses the service-role client).
 */
export async function logDashboardVisitEvent(): Promise<void> {
  try {
    const user = await getServerSessionUser();
    if (!user?.id) {
      return;
    }
    if (!isAllowedEmail(user.email)) {
      return;
    }
    await logAccessEvent(user.id, "dashboard_visit");
  } catch (error) {
    console.error("Failed to log dashboard visit event:", error);
    // Don't throw - we don't want page load to fail if logging fails
  }
}
