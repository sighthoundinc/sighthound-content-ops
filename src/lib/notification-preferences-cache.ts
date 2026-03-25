import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import type { UserNotificationPreferences } from "@/lib/notification-helpers";
export type { UserNotificationPreferences } from "@/lib/notification-helpers";

/**
 * In-memory cache for notification preferences during a request/session.
 * Prevents repeated DB queries for the same user within a single request.
 *
 * Cache key: userId
 * Cache lifetime: per request (cleared between requests)
 */
const preferencesCache = new Map<string, UserNotificationPreferences>();

/**
 * Get user's notification preferences with caching.
 * First call hits DB, subsequent calls in same request return cached value.
 *
 * @param userId - The user ID to fetch preferences for
 * @returns User's notification preferences, or defaults if none exist
 */
export async function getUserNotificationPreferencesWithCache(
  userId: string
): Promise<UserNotificationPreferences> {
  // Check cache first
  if (preferencesCache.has(userId)) {
    return preferencesCache.get(userId)!;
  }

  // Fetch from DB if not cached
  const supabase = getSupabaseBrowserClient();

  const { data: preferences, error } = await supabase
    .from("notification_preferences")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (error && error.code !== "PGRST116") {
    console.error("Error fetching notification preferences:", error);
    // Return defaults on error (backward compatibility)
    return getDefaultPreferences();
  }

  // If no preferences exist, return and cache defaults
  if (!preferences) {
    const defaults = getDefaultPreferences();
    preferencesCache.set(userId, defaults);
    return defaults;
  }

  // Cache and return actual preferences
  const result: UserNotificationPreferences = {
    notifications_enabled: preferences.notifications_enabled ?? true,
    task_assigned: preferences.task_assigned ?? true,
    stage_changed: preferences.stage_changed ?? true,
    awaiting_action: preferences.awaiting_action ?? true,
    mention: preferences.mention ?? true,
    submitted_for_review: preferences.submitted_for_review ?? true,
    published: preferences.published ?? true,
    assignment_changed: preferences.assignment_changed ?? true,
  };

  preferencesCache.set(userId, result);
  return result;
}

/**
 * Get default notification preferences (all enabled).
 * Used as fallback for backward compatibility.
 */
export function getDefaultPreferences(): UserNotificationPreferences {
  return {
    notifications_enabled: true,
    task_assigned: true,
    stage_changed: true,
    awaiting_action: true,
    mention: true,
    submitted_for_review: true,
    published: true,
    assignment_changed: true,
  };
}

/**
 * Clear the preferences cache.
 * Call this at the end of a request to avoid stale data in next request.
 * (Server-side: would be called in middleware; client-side: cleared between page loads)
 */
export function clearPreferencesCache(): void {
  preferencesCache.clear();
}

/**
 * Invalidate a specific user's cached preferences.
 * Use this after updating a user's preferences to ensure fresh data on next fetch.
 */
export function invalidateUserPreferencesCache(userId: string): void {
  preferencesCache.delete(userId);
}
