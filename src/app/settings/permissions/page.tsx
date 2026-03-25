"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { AppShell } from "@/components/app-shell";
import { ProtectedPage } from "@/components/protected-page";
import {
  MANAGED_PERMISSION_ROLES,
  PERMISSION_DEFINITIONS,
  PERMISSION_GROUP_LABELS,
  getRolePermissionState,
  normalizeRolePermissionRows,
} from "@/lib/permissions";
import {
  getApiErrorMessage,
  isApiFailure,
  parseApiResponseJson,
} from "@/lib/api-response";
import type { AppRole, CanonicalAppPermissionKey } from "@/lib/types";
import { useAuth } from "@/providers/auth-provider";
import { useSystemFeedback } from "@/providers/system-feedback-provider";

type PermissionAuditRow = {
  id: string;
  role: AppRole;
  permission_key: CanonicalAppPermissionKey;
  old_value: boolean;
  new_value: boolean;
  changed_by: string | null;
  changed_at: string;
  actor_name?: string | null;
};

type PermissionRow = {
  role: AppRole;
  permission_key: CanonicalAppPermissionKey;
  enabled: boolean;
};

const TASK_LABEL_OVERRIDES: Partial<Record<CanonicalAppPermissionKey, string>> = {
  create_blog: "Create blog drafts",
  edit_blog_title: "Edit blog titles",
  request_revision: "Request and approve revisions",
  edit_scheduled_publish_date: "Schedule publish dates",
  complete_publishing: "Publish blogs",
  change_writer_assignment: "Assign writers",
  change_publisher_assignment: "Assign publishers",
  view_writing_queue: "Access writing queue",
  view_publishing_queue: "Access publishing queue",
  export_csv: "Export filtered results",
  export_selected_csv: "Export selected rows",
};

const PERMISSION_UI_IMPACTS: Partial<Record<CanonicalAppPermissionKey, string[]>> = {
  complete_publishing: [
    "Publish action button",
    "Publisher status controls",
    "Publishing queue access",
  ],
  change_writer_assignment: ["Writer assignment dropdowns", "Bulk writer reassignment controls"],
  change_publisher_assignment: [
    "Publisher assignment dropdowns",
    "Bulk publisher reassignment controls",
  ],
  edit_scheduled_publish_date: [
    "Scheduled date edit fields",
    "Calendar reschedule actions",
  ],
  create_blog: ["Create blog entry action", "New blog form access"],
  export_csv: ["Export View CSV", "Export View PDF"],
  export_selected_csv: ["Export Selected CSV", "Export Selected PDF"],
};

function getTaskLabel(permissionKey: CanonicalAppPermissionKey, fallbackLabel: string) {
  return TASK_LABEL_OVERRIDES[permissionKey] ?? fallbackLabel;
}

export default function PermissionsSettingsPage() {
  const { refreshPermissions, session } = useAuth();
  const { showError, showSuccess } = useSystemFeedback();
  const [selectedRole, setSelectedRole] = useState<AppRole>("writer");
  const [simulatedRole, setSimulatedRole] = useState<AppRole | "off">("off");
  const [permissionRows, setPermissionRows] = useState<PermissionRow[]>([]);
  const [auditRows, setAuditRows] = useState<PermissionAuditRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isResetting, setIsResetting] = useState(false);
  const [savingPermissionKey, setSavingPermissionKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!error) {
      return;
    }
    showError(error);
  }, [error, showError]);

  useEffect(() => {
    if (!success) {
      return;
    }
    showSuccess(success);
  }, [showSuccess, success]);

  const loadPermissions = useCallback(async () => {
    if (!session?.access_token) {
      return;
    }
    setIsLoading(true);
    setError(null);
    const response = await fetch("/api/admin/permissions", {
      headers: {
        authorization: `Bearer ${session.access_token}`,
      },
    });
    const payload = await parseApiResponseJson<{
      error?: string;
      rolePermissions?: unknown;
      auditLogs?: PermissionAuditRow[];
    }>(response);
    if (isApiFailure(response, payload)) {
      setError(getApiErrorMessage(payload, "Failed to load permissions."));
      setIsLoading(false);
      return;
    }
    setPermissionRows(normalizeRolePermissionRows(payload.rolePermissions ?? []));
    setAuditRows(payload.auditLogs ?? []);
    setIsLoading(false);
  }, [session?.access_token]);

  useEffect(() => {
    void loadPermissions();
  }, [loadPermissions]);

  const groupedDefinitions = useMemo(() => {
    const definitions = PERMISSION_DEFINITIONS.filter((definition) => definition.configurable);
    return definitions.reduce<Record<string, typeof definitions>>((acc, definition) => {
      if (!acc[definition.group]) {
        acc[definition.group] = [];
      }
      acc[definition.group].push(definition);
      return acc;
    }, {});
  }, []);

  const rolePermissionState = useMemo(
    () => getRolePermissionState(selectedRole, permissionRows),
    [permissionRows, selectedRole]
  );
  const simulationPermissionState = useMemo(
    () =>
      simulatedRole === "off"
        ? null
        : getRolePermissionState(simulatedRole, permissionRows),
    [permissionRows, simulatedRole]
  );
  const isSimulationActive = simulatedRole !== "off";

  const togglePermission = async (
    permissionKey: CanonicalAppPermissionKey,
    enabled: boolean
  ) => {
    if (isSimulationActive) {
      setError("Disable role simulation before changing permissions.");
      return;
    }
    if (!session?.access_token) {
      setError("Missing active session token.");
      return;
    }
    setSavingPermissionKey(permissionKey);
    setError(null);
    setSuccess(null);

    const response = await fetch("/api/admin/permissions", {
      method: "PATCH",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        role: selectedRole,
        permissionKey,
        enabled,
      }),
    });
    const payload = await parseApiResponseJson<Record<string, unknown>>(response);
    if (isApiFailure(response, payload)) {
      setError(getApiErrorMessage(payload, "Failed to save permission."));
      setSavingPermissionKey(null);
      return;
    }

    await loadPermissions();
    await refreshPermissions();
    setSuccess(`${selectedRole}.${permissionKey} updated.`);
    setSavingPermissionKey(null);
  };

  const resetRolePermissions = async () => {
    if (isSimulationActive) {
      setError("Disable role simulation before resetting permissions.");
      return;
    }
    if (!session?.access_token) {
      setError("Missing active session token.");
      return;
    }
    setIsResetting(true);
    setError(null);
    setSuccess(null);

    const response = await fetch("/api/admin/permissions", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        role: selectedRole,
      }),
    });
    const payload = await parseApiResponseJson<{ changedCount?: number }>(response);
    if (isApiFailure(response, payload)) {
      setError(getApiErrorMessage(payload, "Failed to reset role permissions."));
      setIsResetting(false);
      return;
    }

    await loadPermissions();
    await refreshPermissions();
    setSuccess(
      `Reset ${selectedRole} permissions to defaults (${payload.changedCount ?? 0} updated).`
    );
    setIsResetting(false);
  };

  return (
    <ProtectedPage requiredPermissions={["manage_permissions"]}>
      <AppShell>
        <div className="space-y-6">
          <header className="space-y-2">
            <h2 className="text-xl font-semibold text-slate-900">Permissions</h2>
            <p className="text-sm text-slate-600">
              Configure what each role can do across blog workflows.
            </p>
          </header>

          {isSimulationActive ? (
            <p className="rounded-md border border-indigo-200 bg-indigo-50 px-3 py-2 text-sm text-indigo-700">
              Viewing dashboard as <span className="font-semibold">{simulatedRole}</span>. Changes
              are disabled in simulation mode.
            </p>
          ) : null}

          <section className="rounded-lg border border-slate-200 p-4">
            <div className="flex flex-wrap items-center gap-3">
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <span className="font-medium">Role:</span>
                <select
                  value={selectedRole}
                  onChange={(event) => {
                    setSelectedRole(event.target.value as AppRole);
                  }}
                  className="rounded-md border border-slate-300 px-3 py-2 text-sm"
                >
                  {MANAGED_PERMISSION_ROLES.map((role) => (
                    <option key={role} value={role}>
                      {role}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <span className="font-medium">View as role:</span>
                <select
                  value={simulatedRole}
                  onChange={(event) => {
                    setSimulatedRole(event.target.value as AppRole | "off");
                  }}
                  className="rounded-md border border-slate-300 px-3 py-2 text-sm"
                >
                  <option value="off">Off</option>
                  <option value="writer">Writer</option>
                  <option value="publisher">Publisher</option>
                  <option value="editor">Editor</option>
                </select>
              </label>
              <button
                type="button"
                disabled={isResetting || isLoading || isSimulationActive}
                className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                onClick={() => {
                  void resetRolePermissions();
                }}
              >
                {isResetting ? "Resetting..." : `Reset ${selectedRole} to defaults`}
              </button>
            </div>

            {isLoading ? (
              <p className="mt-4 text-sm text-slate-500">Loading permissions…</p>
            ) : (
              <div className="mt-4 space-y-4">
                {Object.entries(groupedDefinitions).map(([group, definitions]) => (
                  <section key={group} className="rounded-md border border-slate-200">
                    <header className="border-b border-slate-200 bg-slate-50 px-3 py-2">
                      <h3 className="text-sm font-semibold text-slate-700">
                        {PERMISSION_GROUP_LABELS[group as keyof typeof PERMISSION_GROUP_LABELS]}
                      </h3>
                    </header>
                    <ul className="divide-y divide-slate-100">
                      {definitions.map((definition) => (
                        <li
                          key={`${selectedRole}-${definition.key}`}
                          className="flex items-start justify-between gap-3 px-3 py-2"
                        >
                          <div>
                            <p className="text-sm font-medium text-slate-900">
                              {getTaskLabel(definition.key, definition.label)}
                            </p>
                            <p className="text-xs text-slate-500">{definition.description}</p>
                            {PERMISSION_UI_IMPACTS[definition.key]?.length ? (
                              <p className="mt-1 text-xs text-slate-600">
                                Enables: {PERMISSION_UI_IMPACTS[definition.key]?.join(" • ")}
                              </p>
                            ) : null}
                          </div>
                          <input
                            type="checkbox"
                            checked={Boolean(
                              (simulationPermissionState ?? rolePermissionState)[definition.key]
                            )}
                            disabled={
                              isSimulationActive || savingPermissionKey === definition.key
                            }
                            title={
                              isSimulationActive
                                ? "Disable role simulation to change permissions."
                                : undefined
                            }
                            onChange={(event) => {
                              void togglePermission(definition.key, event.target.checked);
                            }}
                          />
                        </li>
                      ))}
                    </ul>
                  </section>
                ))}
              </div>
            )}
          </section>

          <section className="rounded-lg border border-slate-200 p-4">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
              Permission Changes
            </h3>
            {auditRows.length === 0 ? (
              <p className="mt-3 text-sm text-slate-500">No permission changes recorded yet.</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {auditRows.map((audit) => (
                  <li key={audit.id} className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
                    <p className="text-sm text-slate-800">
                      <span className="font-medium">{audit.actor_name ?? audit.changed_by ?? "Unknown actor"}</span>{" "}
                      changed{" "}
                      <span className="font-medium">
                        {audit.role}.{audit.permission_key}
                      </span>{" "}
                      from <span className="font-medium">{String(audit.old_value)}</span> to{" "}
                      <span className="font-medium">{String(audit.new_value)}</span>.
                    </p>
                    <p className="text-xs text-slate-500">
                      {new Date(audit.changed_at).toLocaleString()}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </AppShell>
    </ProtectedPage>
  );
}

