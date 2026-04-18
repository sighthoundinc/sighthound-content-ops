"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

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
import { useAlerts } from "@/providers/alerts-provider";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import {
  getApiErrorMessage,
  isApiFailure,
  parseApiResponseJson,
} from "@/lib/api-response";
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
const ACCESS_LOGS_ACTIVITY_DROPDOWN_ID = "access-logs-activity-dropdown";
const ACCESS_LOGS_USER_DROPDOWN_ID = "access-logs-user-dropdown";

export default function AccessLogsPage() {
  const { session, profile } = useAuth();
  const { showError } = useAlerts();
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
  const [activeDropdown, setActiveDropdown] = useState<"activity" | "user" | null>(null);
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
  const activityDropdownRef = useRef<HTMLDivElement | null>(null);
  const userDropdownRef = useRef<HTMLDivElement | null>(null);

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

    const payload = await parseApiResponseJson<{
      error?: string;
      data?: {
        activities?: UnifiedActivity[];
        total?: number;
        activityTypeLabels?: Record<ActivityType, string>;
        activityTypeCategories?: Record<ActivityType, string>;
      };
    }>(response);

    if (isApiFailure(response, payload)) {
      const errorMsg = getApiErrorMessage(payload, "Failed to load activity history.");
      setError(errorMsg);
      showError(errorMsg);
      setIsLoading(false);
      return;
    }

    const result = payload.data ?? {};
    setActivities(result.activities ?? []);
    setTotalCount(result.total ?? 0);
    if (result.activityTypeLabels) {
      setActivityTypeLabels(result.activityTypeLabels);
    }
    if (result.activityTypeCategories) {
      setActivityTypeCategories(result.activityTypeCategories);
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

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const targetNode = event.target as Node;
      const clickedInsideActivity = activityDropdownRef.current?.contains(targetNode) ?? false;
      const clickedInsideUser = userDropdownRef.current?.contains(targetNode) ?? false;
      if (!clickedInsideActivity && !clickedInsideUser) {
        setActiveDropdown(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    const handleGlobalPopoverClose = () => {
      setActiveDropdown(null);
    };
    const handleOtherDropdownOpened = (
      event: CustomEvent<{ id?: string }>
    ) => {
      if (
        event.detail?.id === ACCESS_LOGS_ACTIVITY_DROPDOWN_ID ||
        event.detail?.id === ACCESS_LOGS_USER_DROPDOWN_ID
      ) {
        return;
      }
      setActiveDropdown(null);
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setActiveDropdown(null);
      }
    };
    window.addEventListener(
      "app:close-popovers",
      handleGlobalPopoverClose as EventListener
    );
    window.addEventListener(
      "app:dropdown-opened",
      handleOtherDropdownOpened as EventListener
    );
    window.addEventListener("keydown", handleEscape);
    return () => {
      window.removeEventListener(
        "app:close-popovers",
        handleGlobalPopoverClose as EventListener
      );
      window.removeEventListener(
        "app:dropdown-opened",
        handleOtherDropdownOpened as EventListener
      );
      window.removeEventListener("keydown", handleEscape);
    };
  }, []);

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
    <ProtectedPage requiredPermissions={["manage_users"]}>
      <AppShell>
        <div className={DATA_PAGE_STACK_CLASS}>
          <nav
            aria-label="Breadcrumb"
            className="flex flex-wrap items-center gap-1 text-xs text-navy-500"
          >
            <Link href="/dashboard" className="hover:text-navy-500">
              Dashboard
            </Link>
            <span>/</span>
            <Link href="/settings" className="hover:text-navy-500">
              Settings
            </Link>
            <span>/</span>
            <span className="text-navy-500">Activity History</span>
          </nav>
          <DataPageHeader
            title="Activity History"
            description="Review sign-ins and workflow activity in clear, human-friendly language"
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
                    <div className="relative" ref={activityDropdownRef}>
                      <button
                        type="button"
                        onClick={() => {
                          setActiveDropdown((previous) => {
                            const next = previous === "activity" ? null : "activity";
                            if (next === "activity") {
                              window.dispatchEvent(
                                new CustomEvent("app:dropdown-opened", {
                                  detail: { id: ACCESS_LOGS_ACTIVITY_DROPDOWN_ID },
                                })
                              );
                            }
                            return next;
                          });
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-left text-sm text-gray-700 hover:border-gray-400 focus:outline-none focus:border-brand"
                      >
                        <span className="block truncate">
                          {pendingActivityTypes.length === 0
                            ? "Choose activity types"
                            : `${pendingActivityTypes.length} selected`}
                        </span>
                      </button>
                      {activeDropdown === "activity" && (
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
                    <label className="block text-sm font-medium text-gray-700 mb-2">Team Members</label>
                    <div className="relative" ref={userDropdownRef}>
                      <button
                        type="button"
                        onClick={() => {
                          setActiveDropdown((previous) => {
                            const next = previous === "user" ? null : "user";
                            if (next === "user") {
                              window.dispatchEvent(
                                new CustomEvent("app:dropdown-opened", {
                                  detail: { id: ACCESS_LOGS_USER_DROPDOWN_ID },
                                })
                              );
                            }
                            return next;
                          });
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-left text-sm text-gray-700 hover:border-gray-400 focus:outline-none focus:border-brand"
                      >
                        <span className="block truncate">
                          {pendingUserIds.length === 0
                            ? "Choose team members"
                            : `${pendingUserIds.length} selected`}
                        </span>
                      </button>
                      {activeDropdown === "user" && (
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
                    setActiveDropdown(null);
                    setIsSaving(false);
                  }}
                  disabled={isSaving || (JSON.stringify(pendingActivityTypes) === JSON.stringify(selectedActivityTypes) && JSON.stringify(pendingUserIds) === JSON.stringify(selectedUserIds))}
                  className="px-4 py-2 bg-brand text-white rounded-md hover:bg-blurple-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-sm font-medium"
                >
                  {isSaving ? "Saving..." : "Apply"}
                </button>
              </div>
            </div>
          )}

          {!isLoading && totalCount === 0 && !error && (
            <DataPageEmptyState title="No activity yet" description="Sign-ins and workflow actions will appear here" />
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
            <div className="space-y-3 rounded-lg border border-[color:var(--sh-gray-200)] p-4 sm:p-5">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={`skeleton-row-${i}`} className="skeleton h-12 w-full" />
              ))}
            </div>
          )}
        </div>
      </AppShell>
    </ProtectedPage>
  );
}
