import { createAdminClient } from "@/lib/supabase/server";

export type AccessEventType = "login" | "dashboard_visit";

/**
 * Log an access event (login or dashboard visit).
 * Called server-side only.
 */
export async function logAccessEvent(
  userId: string,
  eventType: AccessEventType
): Promise<void> {
  try {
    const adminClient = createAdminClient();

    const { error } = await adminClient.from("access_logs").insert({
      user_id: userId,
      event_type: eventType,
      created_at: new Date().toISOString(),
    });

    if (error) {
      console.error(`Failed to log ${eventType} event:`, error);
    }
  } catch (err) {
    console.error(`Error logging access event:`, err);
    // Don't throw - logging failures should not break auth or page load
  }
}
