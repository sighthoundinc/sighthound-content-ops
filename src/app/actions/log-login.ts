"use server";

import { logAccessEvent } from "@/lib/access-logging";
import { getServerSessionUser } from "@/lib/supabase/server-session";
import { isAllowedEmail } from "@/lib/allowed-email";

/**
 * Server action to log a login event.
 *
 * The userId is resolved from the server-side session cookie and never
 * accepted from the client. This prevents spoofed login events from being
 * written into `access_logs` (which uses the service-role client).
 */
export async function logLoginEvent(): Promise<void> {
  try {
    const user = await getServerSessionUser();
    if (!user?.id) {
      // No authenticated session — drop silently.
      return;
    }
    // Defense in depth: never record logins for non-allowlisted accounts.
    if (!isAllowedEmail(user.email)) {
      return;
    }
    await logAccessEvent(user.id, "login");
  } catch (error) {
    console.error("Failed to log login event:", error);
    // Don't throw - we don't want auth to fail if logging fails
  }
}
