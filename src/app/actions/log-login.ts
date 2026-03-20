"use server";

import { logAccessEvent } from "@/lib/access-logging";

/**
 * Server action to log a login event.
 * Called from the client-side auth provider when a session is established.
 */
export async function logLoginEvent(userId: string): Promise<void> {
  try {
    await logAccessEvent(userId, "login");
  } catch (error) {
    console.error("Failed to log login event:", error);
    // Don't throw - we don't want auth to fail if logging fails
  }
}
