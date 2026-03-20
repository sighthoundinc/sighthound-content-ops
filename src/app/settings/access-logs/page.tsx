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

type AccessLog = {
  id: string;
  user_id: string;
  event_type: "login" | "dashboard_visit";
  created_at: string;
  email?: string;
  full_name?: string;
};

const EVENT_TYPE_LABELS: Record<AccessLog["event_type"], string> = {
  login: "Login",
  dashboard_visit: "Dashboard Visit",
};

const EVENT_TYPE_CATEGORIES: Record<AccessLog["event_type"], string> = {
  login: "Login",
  dashboard_visit: "Activity",
};

export default function AccessLogsPage() {
  const { session, profile } = useAuth();
  const { showError } = useSystemFeedback();
  const isAdmin = profile?.role === "admin";

  const [logs, setLogs] = useState<AccessLog[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rowLimit, setRowLimit] = useState<TableRowLimit>(DEFAULT_TABLE_ROW_LIMIT);
  const [currentPage, setCurrentPage] = useState(1);
  const [activityType, setActivityType] = useState<"all" | "login" | "dashboard_visit">("all");
  const [selectedUserId, setSelectedUserId] = useState<string | "all">("all");
  const [users, setUsers] = useState<ProfileRecord[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);

  const loadAccessLogs = useCallback(async () => {
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
    if (isAdmin && selectedUserId !== "all") {
      params.append("user_id", selectedUserId);
    }
    if (isAdmin && activityType !== "all") {
      params.append("event_type", activityType);
    }
    
    const response = await fetch(
      `/api/admin/access-logs?${params.toString()}`,
      {
        headers: {
          authorization: `Bearer ${session.access_token}`,
        },
      }
    );

    const payload = (await response.json()) as {
      error?: string;
      logs?: AccessLog[];
      total?: number;
    };

    if (!response.ok) {
      const errorMsg = payload.error ?? "Failed to load access logs.";
      setError(errorMsg);
      showError(errorMsg);
      setIsLoading(false);
      return;
    }

    setLogs(payload.logs ?? []);
    setTotalCount(payload.total ?? 0);
    setIsLoading(false);
  }, [session?.access_token, currentPage, rowLimit, showError, isAdmin, selectedUserId, activityType]);

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
    if (isAdmin) {
      void loadUsers();
    }
  }, [isAdmin, loadUsers]);

  useEffect(() => {
    void loadAccessLogs();
  }, [loadAccessLogs]);

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
    () => getTablePageRows(logs, currentPage, rowLimit),
    [logs, currentPage, rowLimit]
  );

  const handleRowLimitChange = (newLimit: TableRowLimit) => {
    setRowLimit(newLimit);
    setCurrentPage(1);
  };

  const formatTimestamp = (iso8601: string): string => {
    try {
      const date = new Date(iso8601);
      // Format in user's timezone
      return new Intl.DateTimeFormat("en-US", {
        year: "numeric",
        month: "short",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
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
            description="View your dashboard activity"
          />

          {error && (
            <div className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3">
              <p className="text-sm text-rose-700">{error}</p>
            </div>
          )}

          {isAdmin && !isLoading && (
            <div className="rounded-md border border-gray-200 bg-white p-4 space-y-3">
              <div className="grid grid-cols-2 gap-4 max-w-md">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Activity Type</label>
                  <select
                    value={activityType}
                    onChange={(e) => {
                      setActivityType(e.target.value as "all" | "login" | "dashboard_visit");
                      setCurrentPage(1);
                    }}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  >
                    <option value="all">All Activity</option>
                    <option value="login">Login Only</option>
                    <option value="dashboard_visit">Dashboard Only</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">User</label>
                  <select
                    value={selectedUserId}
                    onChange={(e) => {
                      setSelectedUserId(e.target.value as string);
                      setCurrentPage(1);
                    }}
                    disabled={isLoadingUsers}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm disabled:bg-gray-100"
                  >
                    <option value="all">All Users</option>
                    {users.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.display_name || user.full_name} ({user.email})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          {!isLoading && totalCount === 0 && !error && (
            <DataPageEmptyState title="No access logs yet" description="Login and dashboard activity will appear here" />
          )}

          {!isLoading && totalCount > 0 && !error && (
            <>
              <div className={DATA_PAGE_CONTROL_STRIP_CLASS}>
                <TableResultsSummary
                  totalRows={totalCount}
                  currentPage={currentPage}
                  rowLimit={rowLimit}
                  noun="logs"
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
                      <th className="px-4 py-3 text-left font-medium text-gray-700">User</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-700">Email</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-700">Timestamp</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayRows.map((log) => (
                      <tr key={log.id} className="border-b border-gray-200 hover:bg-gray-50">
                        <td className="px-4 py-3 text-gray-700">{EVENT_TYPE_CATEGORIES[log.event_type]}</td>
                        <td className="px-4 py-3 text-gray-700">{EVENT_TYPE_LABELS[log.event_type]}</td>
                        <td className="px-4 py-3 text-gray-700">{log.full_name ?? "Unknown"}</td>
                        <td className="px-4 py-3 text-gray-600 truncate" title={log.email}>{log.email ?? "—"}</td>
                        <td className="px-4 py-3 text-gray-600 whitespace-nowrap text-xs">{formatTimestamp(log.created_at)}</td>
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
              <div className="text-gray-500">Loading access history...</div>
            </div>
          )}
        </div>
      </AppShell>
    </ProtectedPage>
  );
}
