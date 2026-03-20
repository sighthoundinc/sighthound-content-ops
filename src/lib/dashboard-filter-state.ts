/**
 * Dashboard filter state management via sessionStorage.
 * Allows home page to pass filter intent to tasks page without URL params.
 * 
 * Filters are ONLY applied when explicitly navigating from home page buckets.
 * Normal navigation to /tasks shows default (no filters).
 */

export type DashboardFilterType = 
  | "writer_status"
  | "publisher_status"
  | "social_status";

export interface DashboardFilterIntent {
  type: DashboardFilterType;
  value: string;
}

const FILTER_STATE_KEY = "dashboardFilterIntent";
const FILTER_SOURCE_KEY = "dashboardFilterSource"; // Tracks if filter came from home page

/**
 * Store a filter intent to be applied when the tasks page loads.
 * Only filters coming from home page buckets will be applied.
 * Auto-clears after retrieval.
 */
export function setDashboardFilterIntent(intent: DashboardFilterIntent): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(FILTER_STATE_KEY, JSON.stringify(intent));
    sessionStorage.setItem(FILTER_SOURCE_KEY, "home_bucket");
  } catch (error) {
    console.error("Failed to set dashboard filter intent:", error);
  }
}

/**
 * Retrieve the pending filter intent from session storage.
 * Only returns the intent if it came from home page buckets.
 * Automatically clears both the intent and source after retrieval.
 * Returns null if no intent is pending or if it didn't come from home.
 */
export function getDashboardFilterIntent(): DashboardFilterIntent | null {
  if (typeof window === "undefined") return null;
  try {
    const source = sessionStorage.getItem(FILTER_SOURCE_KEY);
    const stored = sessionStorage.getItem(FILTER_STATE_KEY);
    
    // Only apply filter if it came from home page bucket
    const shouldApply = source === "home_bucket" && stored;
    
    if (shouldApply) {
      // Clear both after retrieval
      sessionStorage.removeItem(FILTER_STATE_KEY);
      sessionStorage.removeItem(FILTER_SOURCE_KEY);
      return JSON.parse(stored) as DashboardFilterIntent;
    }
    
    return null;
  } catch (error) {
    console.error("Failed to get dashboard filter intent:", error);
    return null;
  }
}

/**
 * Clear any pending filter intent without retrieving it.
 */
export function clearDashboardFilterIntent(): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(FILTER_STATE_KEY);
    sessionStorage.removeItem(FILTER_SOURCE_KEY);
  } catch (error) {
    console.error("Failed to clear dashboard filter intent:", error);
  }
}
