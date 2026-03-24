"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { AppShell } from "@/components/app-shell";
import { ProtectedPage } from "@/components/protected-page";
import {
  DATA_PAGE_CONTROL_ACTIONS_CLASS,
  DATA_PAGE_CONTROL_ROW_CLASS,
  DATA_PAGE_CONTROL_STRIP_CLASS,
  DATA_PAGE_STACK_CLASS,
  DataPageEmptyState,
  DataPageHeader,
} from "@/components/data-page";
import {
  TablePaginationControls,
  TableResultsSummary,
  TableRowLimitSelect,
} from "@/components/table-controls";
import { useAuth } from "@/providers/auth-provider";
import { useSystemFeedback } from "@/providers/system-feedback-provider";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import type { ProfileRecord } from "@/lib/types";
import {
  DEFAULT_TABLE_ROW_LIMIT,
  getTablePageCount,
  getTablePageRows,
  type TableRowLimit,
} from "@/lib/table";

type ActivityType =
  | "login"
  | "dashboard_visit"
  | "blog_writer_status_changed"
  | "blog_publisher_status_changed"
  | "blog_assignment_changed"
  | "social_post_status_changed"
  | "social_post_assignment_changed";

type UnifiedActivity = {
  id: string;
  activity_type: ActivityType;
  content_type: "access_log" | "blog" | "social_post";
  user_id: string | null;
  user_name: string | null;
  user_email: string | null;
  content_id: string | null;
  content_title: string | null;
  event_description: string;
  created_at: string;
};

export default function AccessLogsPage() {
  const { session, profile } = useAuth();
  const { showError } = useSystemFeedback();
  const isAdmin = profile?.role === "admin";

  const [activities, setActivities] = useState<UnifiedActivity[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rowLimit, setRowLimit] = useState<TableRowLimit>(DEFAULT_TABLE_ROW_LIMIT);
  const [currentPage, setCurrentPage] = useState(1);
  // Applied filters (used for API calls)
  const [selectedActivityTypes, setSelectedActivityTypes] = useState<ActivityType[]>([
    "login",
    "dashboard_visit",
  ]);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>(profile?.id ? [profile.id] : []);
  // Pending filters (shown in dropdowns, waiting for Save)
  const [pendingActivityTypes, setPendingActivityTypes] = useState<ActivityType[]>([
    "login",
    "dashboard_visit",
  ]);
  const [pendingUserIds, setPendingUserIds] = useState<string[]>(profile?.id ? [profile.id] : []);
  const [isDropdownOpen, setIsDropdownOpen] = useState<{activity: boolean; user: boolean}>({activity: false, user: false});
  const [isSaving, setIsSaving] = useState(false);
  const [users, setUsers] = useState<ProfileRecord[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [activityTypeLabels, setActivityTypeLabels] = useState<Record<ActivityType, string>>({
    login: "Signed In",
    dashboard_visit: "Opened Dashboard",
    blog_writer_status_changed: "Writing Stage Updated",
    blog_publisher_status_changed: "Publishing Stage Updated",
    blog_assignment_changed: "Blog Assignment Updated",
    social_post_status_changed: "Status Updated",
    social_post_assignment_changed: "Social Post Assignment Updated",
  });
  const [activityTypeCategories, setActivityTypeCategories] = useState<Record<ActivityType, string>>({
    login: "Access",
    dashboard_visit: "Access",
    blog_writer_status_changed: "Blog Activity",
    blog_publisher_status_changed: "Blog Activity",
    blog_assignment_changed: "Blog Activity",
    social_post_status_changed: "Social Post Activity",
    social_post_assignment_changed: "Social Post Activity",
  });

  const loadActivityHistory = useCallback(async () => {
    if (!session?.access_token) {
      return;
    }
    setIsLoading(true);
    setError(null);

    const effectiveRowLimit = rowLimit === "all" ? 10000 : rowLimit;
    const offset = (currentPage - 1) * effectiveRowLimit;
    
    const params = new URLSearchParams();
    params.append("limit", String(rowLimit));
    params.append("offset", String(offset));
    
    if (isAdmin && selectedActivityTypes.length > 0) {
      params.append("activity_types", selectedActivityTypes.join(","));
    }
    if (isAdmin && selectedUserIds.length > 0) {
      params.append("user_ids", selectedUserIds.join(","));
    }
    
    const response = await fetch(
      `/api/admin/activity-history?${params.toString()}`,
      {
        headers: {
          authorization: `Bearer ${session.access_token}`,
        },
      }
    );

    const payload = (await response.json()) as {
      error?: string;
      activities?: UnifiedActivity[];
      total?: number;
      activityTypeLabels?: Record<ActivityType, string>;
      activityTypeCategories?: Record<ActivityType, string>;
    };

    if (!response.ok) {
      const errorMsg = payload.error ?? "Failed to load activity history.";
      setError(errorMsg);
      showError(errorMsg);
      setIsLoading(false);
      return;
    }

    setActivities(payload.activities ?? []);
    setTotalCount(payload.total ?? 0);
    if (payload.activityTypeLabels) {
      setActivityTypeLabels(payload.activityTypeLabels);
    }
    if (payload.activityTypeCategories) {
      setActivityTypeCategories(payload.activityTypeCategories);
    }
    setIsLoading(false);
  }, [session?.access_token, currentPage, rowLimit, showError, isAdmin, selectedActivityTypes, selectedUserIds]);

  const loadUsers = useCallback(async () => {
    if (!isAdmin) {
      return;
    }
    setIsLoadingUsers(true);
    try {
      const supabase = getSupabaseBrowserClient();
      const { data: usersData, error: usersError } = await supabase
        .from("profiles")
        .select("id, full_name, display_name, email")
        .order("full_name", { ascending: true });
      if (!usersError && usersData) {
        setUsers(usersData as ProfileRecord[]);
      }
    } catch (err) {
      console.error("Failed to load users:", err);
    }
    setIsLoadingUsers(false);
  }, [isAdmin]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      setIsDropdownOpen({activity: false, user: false});
    };
    
    if (isDropdownOpen.activity || isDropdownOpen.user) {
      document.addEventListener("click", handleClickOutside);
      return () => document.removeEventListener("click", handleClickOutside);
    }
  }, [isDropdownOpen]);

  useEffect(() => {
    if (isAdmin) {
      void loadUsers();
    }
  }, [isAdmin, loadUsers]);

  useEffect(() => {
    void loadActivityHistory();
  }, [loadActivityHistory]);

  useEffect(() => {
    if (!error) {
      return;
    }
    showError(error);
  }, [error, showError]);

  const pageCount = useMemo(
    () => getTablePageCount(totalCount, rowLimit),
    [totalCount, rowLimit]
  );

  const displayRows = useMemo(
    () => getTablePageRows(activities, currentPage, rowLimit),
    [activities, currentPage, rowLimit]
  );

  const handleRowLimitChange = (newLimit: TableRowLimit) => {
    setRowLimit(newLimit);
    setCurrentPage(1);
  };

  const formatTimestamp = (iso8601: string): string => {
    try {
      const date = new Date(iso8601);
      // For non-admins: use their timezone
      // For admins: use UTC for consistency when viewing other users
      const timezone = isAdmin ? "UTC" : (profile?.timezone ?? "America/New_York");
      return new Intl.DateTimeFormat("en-US", {
        year: "numeric",
        month: "short",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
        timeZone: timezone,
        timeZoneName: "short",
      }).format(date);
    } catch {
      return iso8601;
    }
  };

  return (
    <ProtectedPage>
      <AppShell>
        <div className={DATA_PAGE_STACK_CLASS}>
          <DataPageHeader
            title="Activity History"
            description="View access and workflow activity in plain language"
          />

          {error && (
            <div className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3">
              <p className="text-sm text-rose-700">{error}</p>
            </div>
          )}

          {isAdmin && !isLoading && (
            <div className="rounded-md border border-gray-200 bg-white p-4">
              <div className="flex flex-col gap-4">
                {/* Filter Dropdowns */}
                <div className="flex flex-wrap gap-4">
                  {/* Activity Type Dropdown */}
                  <div className="min-w-[16rem] flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Activity Types</label>
                    <div className="relative">
                      <button
                        onClick={() => setIsDropdownOpen({...isDropdownOpen, activity: !isDropdownOpen.activity})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-left text-sm text-gray-700 hover:border-gray-400 focus:outline-none focus:border-blue-500"
                      >
                        <span className="block truncate">
                          {pendingActivityTypes.length === 0
                            ? "Select activity types"
                            : `${pendingActivityTypes.length} selected`}
                        </span>
                      </button>
                      {isDropdownOpen.activity && (
                        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg">
                          <div className="max-h-48 overflow-y-auto p-2 space-y-2">
                            {Object.entries(activityTypeLabels).map(([type, label]) => (
                              <label key={type} className="flex items-center gap-2 cursor-pointer px-2 py-1 hover:bg-gray-50 rounded">
                                <input
                                  type="checkbox"
                                  checked={pendingActivityTypes.includes(type as ActivityType)}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setPendingActivityTypes([...pendingActivityTypes, type as ActivityType]);
                                    } else {
                                      setPendingActivityTypes(pendingActivityTypes.filter((t) => t !== type));
                                    }
                                  }}
                                  className="rounded border-gray-300"
                                />
                                <span className="text-sm text-gray-700">{label}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* User Dropdown */}
                  <div className="min-w-[16rem] flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Users</label>
                    <div className="relative">
                      <button
                        onClick={() => setIsDropdownOpen({...isDropdownOpen, user: !isDropdownOpen.user})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-left text-sm text-gray-700 hover:border-gray-400 focus:outline-none focus:border-blue-500"
                      >
                        <span className="block truncate">
                          {pendingUserIds.length === 0
                            ? "Select users"
                            : `${pendingUserIds.length} selected`}
                        </span>
                      </button>
                      {isDropdownOpen.user && (
                        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg">
                          <div className="max-h-48 overflow-y-auto p-2 space-y-2">
                            {isLoadingUsers ? (
                              <p className="text-sm text-gray-500 px-2 py-1">Loading users...</p>
                            ) : users.length > 0 ? (
                              users.map((user) => (
                                <label key={user.id} className="flex items-center gap-2 cursor-pointer px-2 py-1 hover:bg-gray-50 rounded">
                                  <input
                                    type="checkbox"
                                    checked={pendingUserIds.includes(user.id)}
                                    onChange={(e) => {
                                      if (e.target.checked) {
                                        setPendingUserIds([...pendingUserIds, user.id]);
                                      } else {
                                        setPendingUserIds(pendingUserIds.filter((id) => id !== user.id));
                                      }
                                    }}
                                    className="rounded border-gray-300"
                                  />
                                  <span className="text-sm text-gray-700 truncate">
                                    {user.display_name || user.full_name}
                                  </span>
                                </label>
                              ))
                            ) : (
                              <p className="text-sm text-gray-500 px-2 py-1">No users available</p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Save Button */}
                <button
                  onClick={() => {
                    setIsSaving(true);
                    setSelectedActivityTypes(pendingActivityTypes);
                    setSelectedUserIds(pendingUserIds);
                    setCurrentPage(1);
                    setIsDropdownOpen({activity: false, user: false});
                    setIsSaving(false);
                  }}
                  disabled={isSaving || (JSON.stringify(pendingActivityTypes) === JSON.stringify(selectedActivityTypes) && JSON.stringify(pendingUserIds) === JSON.stringify(selectedUserIds))}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-sm font-medium"
                >
                  {isSaving ? "Saving..." : "Apply Filters"}
                </button>
              </div>
            </div>
          )}

          {!isLoading && totalCount === 0 && !error && (
            <DataPageEmptyState title="No activity yet" description="Login and dashboard activity will appear here" />
          )}

          {!isLoading && totalCount > 0 && !error && (
            <>
              <div className={DATA_PAGE_CONTROL_STRIP_CLASS}>
                <TableResultsSummary
                  totalRows={totalCount}
                  currentPage={currentPage}
                  rowLimit={rowLimit}
                  noun="entries"
                />
                <div className={DATA_PAGE_CONTROL_ACTIONS_CLASS}>
                  <TableRowLimitSelect
                    value={rowLimit}
                    onChange={handleRowLimitChange}
                  />
                </div>
              </div>

              <div className="overflow-x-auto border border-gray-200 rounded">
                <table className="w-full border-collapse text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium text-gray-700">Category</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-700">Action</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-700">Content</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-700">User</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-700">Email</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-700">Timestamp</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayRows.map((activity) => (
                      <tr key={activity.id} className="border-b border-gray-200 hover:bg-gray-50">
                        <td className="px-4 py-3 text-gray-700">{activityTypeCategories[activity.activity_type]}</td>
                        <td className="px-4 py-3 text-gray-700">{activity.event_description}</td>
                        <td className="px-4 py-3 text-gray-600 truncate" title={activity.content_title || ""}>
                          {activity.content_type === "access_log" ? "—" : activity.content_title || "Unknown"}
                        </td>
                        <td className="px-4 py-3 text-gray-700">{activity.user_name ?? "Unknown"}</td>
                        <td className="px-4 py-3 text-gray-600 truncate" title={activity.user_email || ""}>
                          {activity.user_email ?? "—"}
                        </td>
                        <td className="px-4 py-3 text-gray-600 whitespace-nowrap text-xs">{formatTimestamp(activity.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className={DATA_PAGE_CONTROL_ROW_CLASS}>
                <div />
                <div className={DATA_PAGE_CONTROL_ACTIONS_CLASS}>
                  <TablePaginationControls
                    currentPage={currentPage}
                    pageCount={pageCount}
                    onPageChange={setCurrentPage}
                  />
                </div>
              </div>
            </>
          )}

          {isLoading && (
            <div className="flex items-center justify-center py-12">
              <div className="text-gray-500">Loading activity...</div>
            </div>
          )}
        </div>
      </AppShell>
    </ProtectedPage>
  );
}
