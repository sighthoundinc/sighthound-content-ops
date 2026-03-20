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
  const { session } = useAuth();
  const { showError } = useSystemFeedback();

  const [logs, setLogs] = useState<AccessLog[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rowLimit, setRowLimit] = useState<TableRowLimit>(DEFAULT_TABLE_ROW_LIMIT);
  const [currentPage, setCurrentPage] = useState(1);

  const loadAccessLogs = useCallback(async () => {
    if (!session?.access_token) {
      return;
    }
    setIsLoading(true);
    setError(null);

    const effectiveRowLimit = rowLimit === "all" ? 10000 : rowLimit;
    const offset = (currentPage - 1) * effectiveRowLimit;
    const response = await fetch(
      `/api/admin/access-logs?limit=${rowLimit}&offset=${offset}`,
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
  }, [session?.access_token, currentPage, rowLimit, showError]);

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
    <ProtectedPage requiredPermissions={["manage_users"]}>
      <AppShell>
        <div className={DATA_PAGE_STACK_CLASS}>
          <DataPageHeader
            title="Access History"
            description="View login and dashboard access history for all users"
          />

          {!isLoading && totalCount === 0 && !error && (
            <DataPageEmptyState title="No access logs yet" description="Login and dashboard activity will appear here" />
          )}

          {!isLoading && totalCount > 0 && (
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
