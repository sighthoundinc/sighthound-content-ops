"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";

import { AppShell } from "@/components/app-shell";
import { CheckboxMultiSelect } from "@/components/checkbox-multi-select";
import { ConfirmationModal } from "@/components/confirmation-modal";
import { ProtectedPage } from "@/components/protected-page";
import {
  TablePaginationControls,
  TableResultsSummary,
  TableRowLimitSelect,
} from "@/components/table-controls";
import { hasWorkflowOverridePermission } from "@/lib/permissions";
import {
  clearQuickViewSnapshot,
  readQuickViewSnapshot,
  saveQuickViewSnapshot,
  type QuickViewSnapshot,
} from "@/lib/quick-view";
import { getUserRoles } from "@/lib/roles";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import {
  DEFAULT_TABLE_ROW_LIMIT,
  getTablePageCount,
  getTablePageRows,
  type SortDirection,
  type TableRowLimit,
} from "@/lib/table";
import type { AppRole, AppSettingsRecord, ProfileRecord } from "@/lib/types";
import { useAuth } from "@/providers/auth-provider";

const WEEK_DAYS = [
  { label: "Sunday", value: 0 },
  { label: "Monday", value: 1 },
  { label: "Tuesday", value: 2 },
  { label: "Wednesday", value: 3 },
  { label: "Thursday", value: 4 },
  { label: "Friday", value: 5 },
  { label: "Saturday", value: 6 },
];

const TIMEZONE_OPTIONS = [
  "UTC",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "Europe/London",
  "Europe/Berlin",
  "Asia/Dubai",
  "Asia/Karachi",
  "Asia/Singapore",
  "Asia/Tokyo",
  "Australia/Sydney",
];

const ALL_ROLES: AppRole[] = ["admin", "writer", "publisher", "editor"];

type UserSortField = "full_name" | "email" | "roles" | "is_active" | "created_at";
type EditableUserState = {
  firstName: string;
  lastName: string;
  displayName: string;
  userRoles: AppRole[];
  isActive: boolean;
};
type ActivityHistoryDeleteScope = "all" | "users";

const USER_SORT_OPTIONS: Array<{ value: UserSortField; label: string }> = [
  { value: "created_at", label: "Created Date" },
  { value: "full_name", label: "Name" },
  { value: "email", label: "Email" },
  { value: "roles", label: "Roles" },
  { value: "is_active", label: "Active Status" },
];

function splitName(fullName: string) {
  const [firstName, ...rest] = fullName.trim().split(/\s+/);
  return {
    firstName: firstName || "",
    lastName: rest.join(" "),
  };
}

export default function SettingsPage() {
  const { hasPermission, session, profile, refreshProfile, user } = useAuth();
  const canWorkflowOverride = hasWorkflowOverridePermission(hasPermission);
  const canEditAppSettings =
    hasPermission("manage_environment_settings") || canWorkflowOverride;
  const canManageUsers = hasPermission("manage_users");
  const canManageRoles = hasPermission("assign_roles");
  const canManagePermissions = hasPermission("manage_permissions");
  const canReassignWriterAssignments =
    hasPermission("change_writer_assignment") ||
    hasPermission("transfer_user_assignments") ||
    hasPermission("bulk_reassign_blogs") ||
    canWorkflowOverride;
  const canReassignPublisherAssignments =
    hasPermission("change_publisher_assignment") ||
    hasPermission("transfer_user_assignments") ||
    hasPermission("bulk_reassign_blogs") ||
    canWorkflowOverride;
  const canManageUserDirectory = canManageUsers || canManageRoles;
  const canReassignAssignments =
    canReassignWriterAssignments || canReassignPublisherAssignments;
  const [settings, setSettings] = useState<AppSettingsRecord | null>(null);
  const [users, setUsers] = useState<ProfileRecord[]>([]);
  const [editableUsers, setEditableUsers] = useState<Record<string, EditableUserState>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newFullName, setNewFullName] = useState("");
  const [newRole, setNewRole] = useState<AppRole>("writer");
  const [userRoleFilter, setUserRoleFilter] = useState<AppRole | "all">("all");
  const [userActiveFilter, setUserActiveFilter] = useState<"all" | "active" | "inactive">(
    "all"
  );
  const [userSortField, setUserSortField] = useState<UserSortField>("created_at");
  const [userSortDirection, setUserSortDirection] = useState<SortDirection>("desc");
  const [rowLimit, setRowLimit] = useState<TableRowLimit>(DEFAULT_TABLE_ROW_LIMIT);
  const [currentPage, setCurrentPage] = useState(1);
  const [reassignFromUserId, setReassignFromUserId] = useState("");
  const [reassignToUserId, setReassignToUserId] = useState("");
  const [includeWriterAssignments, setIncludeWriterAssignments] = useState(true);
  const [includePublisherAssignments, setIncludePublisherAssignments] = useState(true);
  const [activityHistoryDeleteScope, setActivityHistoryDeleteScope] =
    useState<ActivityHistoryDeleteScope>("all");
  const [activityHistoryDeleteUserIds, setActivityHistoryDeleteUserIds] =
    useState<string[]>([]);
  const [activityCleanupIncludeComments, setActivityCleanupIncludeComments] =
    useState(false);
  const [isDeleteHistoryModalOpen, setIsDeleteHistoryModalOpen] = useState(false);
  const [isDeletingActivityHistory, setIsDeletingActivityHistory] = useState(false);
  const [quickViewTargetUserId, setQuickViewTargetUserId] = useState("");
  const [isSwitchingQuickViewUser, setIsSwitchingQuickViewUser] = useState(false);
  const [isRestoringAdminFromQuickView, setIsRestoringAdminFromQuickView] =
    useState(false);
  const [quickViewSnapshot, setQuickViewSnapshot] = useState<QuickViewSnapshot | null>(
    null
  );

  useEffect(() => {
    if (!canReassignWriterAssignments) {
      setIncludeWriterAssignments(false);
    }
  }, [canReassignWriterAssignments]);

  useEffect(() => {
    if (!canReassignPublisherAssignments) {
      setIncludePublisherAssignments(false);
    }
  }, [canReassignPublisherAssignments]);

  useEffect(() => {
    if (activityHistoryDeleteScope === "all") {
      setActivityHistoryDeleteUserIds([]);
    }
  }, [activityHistoryDeleteScope]);

  useEffect(() => {
    setQuickViewSnapshot(readQuickViewSnapshot());
  }, [user?.id]);

  const loadUsers = async () => {
    const supabase = getSupabaseBrowserClient();
    const { data: usersData, error: usersError } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });
    if (usersError) {
      throw new Error(usersError.message);
    }
    const nextUsers = (usersData ?? []) as ProfileRecord[];
    setUsers(nextUsers);
    setEditableUsers(
      Object.fromEntries(
        nextUsers.map((nextUser) => {
          const nameParts = splitName(nextUser.full_name);
          return [
            nextUser.id,
            {
              firstName: nextUser.first_name ?? nameParts.firstName,
              lastName: nextUser.last_name ?? nameParts.lastName,
              displayName: nextUser.display_name ?? nextUser.full_name,
              userRoles: getUserRoles(nextUser),
              isActive: nextUser.is_active,
            },
          ];
        })
      )
    );
  };

  const startQuickViewAsUser = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!session?.access_token || !session.refresh_token) {
      setError("Missing active session token.");
      return;
    }
    if (!profile || !getUserRoles(profile).includes("admin")) {
      setError("Only admins can start quick-view mode.");
      return;
    }
    if (!quickViewTargetUserId) {
      setError("Select a user to quick-view as.");
      return;
    }

    setError(null);
    setSuccess(null);
    setIsSwitchingQuickViewUser(true);

    const response = await fetch("/api/admin/quick-view", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        targetUserId: quickViewTargetUserId,
      }),
    });
    const payload = (await response.json()) as {
      error?: string;
      tokenHash?: string;
      targetUserId?: string;
      targetDisplayName?: string;
    };
    if (!response.ok || !payload.tokenHash || !payload.targetUserId) {
      setError(payload.error ?? "Failed to start quick-view mode.");
      setIsSwitchingQuickViewUser(false);
      return;
    }

    const snapshot: QuickViewSnapshot = {
      adminAccessToken: session.access_token,
      adminRefreshToken: session.refresh_token,
      adminUserId: profile.id,
      adminDisplayName: profile.display_name || profile.full_name,
      targetUserId: payload.targetUserId,
      targetDisplayName: payload.targetDisplayName ?? "selected user",
      startedAt: new Date().toISOString(),
    };
    saveQuickViewSnapshot(snapshot);
    setQuickViewSnapshot(snapshot);

    const supabase = getSupabaseBrowserClient();
    const { error: verifyError } = await supabase.auth.verifyOtp({
      type: "magiclink",
      token_hash: payload.tokenHash,
    });
    if (verifyError) {
      clearQuickViewSnapshot();
      setQuickViewSnapshot(null);
      setError(verifyError.message);
      setIsSwitchingQuickViewUser(false);
      return;
    }

    setQuickViewTargetUserId("");
    setIsSwitchingQuickViewUser(false);
    setSuccess(
      `Quick-view enabled. You are now acting as ${
        payload.targetDisplayName ?? "the selected user"
      }.`
    );
  };

  const restoreAdminFromQuickView = async () => {
    const snapshot = readQuickViewSnapshot();
    if (!snapshot) {
      setError("No quick-view admin session found.");
      return;
    }

    setError(null);
    setSuccess(null);
    setIsRestoringAdminFromQuickView(true);

    const supabase = getSupabaseBrowserClient();
    const { error: restoreError } = await supabase.auth.setSession({
      access_token: snapshot.adminAccessToken,
      refresh_token: snapshot.adminRefreshToken,
    });
    if (restoreError) {
      setError(restoreError.message);
      setIsRestoringAdminFromQuickView(false);
      return;
    }

    clearQuickViewSnapshot();
    setQuickViewSnapshot(null);
    setIsRestoringAdminFromQuickView(false);
    setSuccess(`Returned to admin view as ${snapshot.adminDisplayName}.`);
  };

  useEffect(() => {
    const loadData = async () => {
      const supabase = getSupabaseBrowserClient();
      setIsLoading(true);
      setError(null);

      try {
        const { data: settingsData, error: settingsError } = await supabase
          .from("app_settings")
          .select("*")
          .eq("id", 1)
          .maybeSingle();
        if (settingsError) {
          throw new Error(settingsError.message);
        }
        setSettings((settingsData as AppSettingsRecord) ?? null);
        await loadUsers();
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Failed to load settings.");
      } finally {
        setIsLoading(false);
      }
    };

    void loadData();
  }, []);

  const saveSettings = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!settings || !canEditAppSettings) {
      return;
    }

    const supabase = getSupabaseBrowserClient();
    setError(null);
    setSuccess(null);

    const { error: saveError } = await supabase
      .from("app_settings")
      .update({
        timezone: settings.timezone,
        week_start: settings.week_start,
        stale_draft_days: settings.stale_draft_days,
      })
      .eq("id", 1);

    if (saveError) {
      setError(saveError.message);
      return;
    }
    setSuccess("Settings saved.");
  };

  const saveProfileEdits = async (targetUserId: string) => {
    if (!session?.access_token) {
      setError("Missing active session token.");
      return;
    }
    const edits = editableUsers[targetUserId];
    if (!edits) {
      return;
    }

    setError(null);
    setSuccess(null);
    const response = await fetch("/api/users/profile", {
      method: "PATCH",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        targetUserId,
        firstName: edits.firstName,
        lastName: edits.lastName,
        displayName: edits.displayName,
        userRoles: canManageRoles ? edits.userRoles : undefined,
        isActive: canManageUsers ? edits.isActive : undefined,
      }),
    });
    const payload = (await response.json()) as { error?: string };
    if (!response.ok) {
      setError(payload.error ?? "Failed to save profile updates.");
      return;
    }

    await loadUsers();
    if (targetUserId === profile?.id) {
      await refreshProfile();
    }
    setSuccess("Profile updated.");
  };

  const createUser = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!session?.access_token || !canManageUsers || !canManageRoles) {
      setError("User management permission is required.");
      return;
    }

    setError(null);
    setSuccess(null);

    const response = await fetch("/api/admin/users", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        email: newEmail,
        password: newPassword,
        fullName: newFullName,
        role: newRole,
        userRoles: [newRole],
      }),
    });

    const payload = (await response.json()) as { error?: string };
    if (!response.ok) {
      setError(payload.error ?? "Failed to create user.");
      return;
    }

    setSuccess("User created successfully.");
    setNewEmail("");
    setNewPassword("");
    setNewFullName("");
    setNewRole("writer");
    await loadUsers();
  };

  const reassignEverythingFromUser = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!session?.access_token || !canReassignAssignments) {
      setError("Assignment permission is required.");
      return;
    }
    if (!reassignFromUserId || !reassignToUserId) {
      setError("Select both source and destination users.");
      return;
    }
    if (reassignFromUserId === reassignToUserId) {
      setError("Source and destination users must be different.");
      return;
    }
    if (!includeWriterAssignments && !includePublisherAssignments) {
      setError("Select at least one assignment type to transfer.");
      return;
    }
    if (includeWriterAssignments && !canReassignWriterAssignments) {
      setError("You do not have permission to transfer writer assignments.");
      return;
    }
    if (includePublisherAssignments && !canReassignPublisherAssignments) {
      setError("You do not have permission to transfer publisher assignments.");
      return;
    }

    setError(null);
    setSuccess(null);

    const response = await fetch("/api/admin/reassign-assignments", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        fromUserId: reassignFromUserId,
        toUserId: reassignToUserId,
        includeWriterAssignments,
        includePublisherAssignments,
      }),
    });
    const payload = (await response.json()) as {
      error?: string;
      transferredWriterAssignments?: number;
      transferredPublisherAssignments?: number;
      totalTransferred?: number;
    };
    if (!response.ok) {
      setError(payload.error ?? "Failed to reassign assignments.");
      return;
    }

    setSuccess(
      `Transferred ${payload.totalTransferred ?? 0} assignments (writer: ${
        payload.transferredWriterAssignments ?? 0
      }, publisher: ${payload.transferredPublisherAssignments ?? 0}).`
    );
  };

  const deleteActivityHistory = async () => {
    if (!session?.access_token) {
      setError("Missing active session token.");
      return;
    }
    if (!profile || !getUserRoles(profile).includes("admin")) {
      setError("Only admins can delete activity history.");
      return;
    }
    if (
      activityHistoryDeleteScope === "users" &&
      activityHistoryDeleteUserIds.length === 0
    ) {
      setError("Select at least one user for targeted cleanup.");
      return;
    }

    setError(null);
    setSuccess(null);
    setIsDeletingActivityHistory(true);

    const response = await fetch("/api/admin/activity-history", {
      method: "DELETE",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        scope: activityHistoryDeleteScope,
        includeCommentsActivity: activityCleanupIncludeComments,
        userIds:
          activityHistoryDeleteScope === "users"
            ? activityHistoryDeleteUserIds
            : undefined,
      }),
    });

    const payload = (await response.json()) as {
      error?: string;
      totalDeleted?: number;
      blogAssignmentHistoryDeleted?: number;
      socialPostActivityHistoryDeleted?: number;
      permissionAuditLogsDeleted?: number;
      blogCommentsDeleted?: number;
      socialPostCommentsDeleted?: number;
    };
    if (!response.ok) {
      setError(payload.error ?? "Failed to delete activity history.");
      setIsDeletingActivityHistory(false);
      return;
    }

    setIsDeleteHistoryModalOpen(false);
    setIsDeletingActivityHistory(false);
    setActivityHistoryDeleteUserIds([]);
    const commentsSummary = activityCleanupIncludeComments
      ? `, blog comments: ${payload.blogCommentsDeleted ?? 0}, social comments: ${
          payload.socialPostCommentsDeleted ?? 0
        }`
      : "";
    setSuccess(
      `Deleted ${payload.totalDeleted ?? 0} activity records (blog: ${
        payload.blogAssignmentHistoryDeleted ?? 0
      }, social: ${payload.socialPostActivityHistoryDeleted ?? 0}, permission: ${
        payload.permissionAuditLogsDeleted ?? 0
      }${commentsSummary}).`
    );
  };

  const filteredUsers = useMemo(() => {
    return users.filter((nextUser) => {
      const nextUserRoles = getUserRoles(nextUser);
      const matchesRole =
        userRoleFilter === "all" || nextUserRoles.includes(userRoleFilter);
      const matchesActive =
        userActiveFilter === "all" ||
        (userActiveFilter === "active" ? nextUser.is_active : !nextUser.is_active);
      return matchesRole && matchesActive;
    });
  }, [userActiveFilter, userRoleFilter, users]);

  const sortedUsers = useMemo(() => {
    const collator = new Intl.Collator(undefined, { sensitivity: "base" });
    const directionMultiplier = userSortDirection === "asc" ? 1 : -1;

    return [...filteredUsers].sort((left, right) => {
      let compareResult = 0;
      if (userSortField === "full_name") {
        compareResult = collator.compare(left.full_name, right.full_name);
      } else if (userSortField === "email") {
        compareResult = collator.compare(left.email, right.email);
      } else if (userSortField === "roles") {
        compareResult = collator.compare(
          getUserRoles(left).join(", "),
          getUserRoles(right).join(", ")
        );
      } else if (userSortField === "is_active") {
        compareResult = Number(right.is_active) - Number(left.is_active);
      } else if (userSortField === "created_at") {
        compareResult = left.created_at.localeCompare(right.created_at);
      }
      return compareResult * directionMultiplier;
    });
  }, [filteredUsers, userSortDirection, userSortField]);

  const pageCount = useMemo(
    () => getTablePageCount(sortedUsers.length, rowLimit),
    [rowLimit, sortedUsers.length]
  );

  useEffect(() => {
    setCurrentPage((previous) => Math.min(previous, pageCount));
  }, [pageCount]);

  useEffect(() => {
    setCurrentPage(1);
  }, [rowLimit, userActiveFilter, userRoleFilter, userSortDirection, userSortField]);

  const pagedUsers = useMemo(
    () => getTablePageRows(sortedUsers, currentPage, rowLimit),
    [currentPage, rowLimit, sortedUsers]
  );
  const isAdminUser = useMemo(
    () => (profile ? getUserRoles(profile).includes("admin") : false),
    [profile]
  );
  const isQuickViewActive = useMemo(
    () =>
      Boolean(
        quickViewSnapshot &&
          user?.id &&
          quickViewSnapshot.adminUserId &&
          user.id !== quickViewSnapshot.adminUserId
      ),
    [quickViewSnapshot, user?.id]
  );
  const activityCleanupUserOptions = useMemo(
    () =>
      users.map((nextUser) => ({
        value: nextUser.id,
        label: `${nextUser.full_name} (${nextUser.email})`,
      })),
    [users]
  );
  const quickViewTargetUsers = useMemo(
    () =>
      users.filter(
        (nextUser) => nextUser.is_active && !getUserRoles(nextUser).includes("admin")
      ),
    [users]
  );
  const isTargetedCleanupWithoutUsers =
    activityHistoryDeleteScope === "users" &&
    activityHistoryDeleteUserIds.length === 0;
  const myRoles = useMemo(
    () => (profile ? getUserRoles(profile) : []),
    [profile]
  );

  return (
    <ProtectedPage>
      <AppShell>
        <div className="space-y-7">
          <header>
            <h2 className="text-xl font-semibold text-slate-900">Settings</h2>
            <p className="text-sm text-slate-600">
              Manage profile names, timezone preferences, and team roles.
            </p>
            {canManagePermissions ? (
              <Link
                href="/settings/permissions"
                className="mt-2 inline-flex text-sm font-medium text-blue-600 underline"
              >
                Open Permissions Panel
              </Link>
            ) : null}
          </header>

          {error ? (
            <p className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {error}
            </p>
          ) : null}
          {success ? (
            <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              {success}
            </p>
          ) : null}

          {isLoading || !settings ? (
            <p className="rounded-md border border-slate-200 bg-slate-50 px-4 py-5 text-sm text-slate-500">
              Loading settings…
            </p>
          ) : (
            <>
              {profile ? (
                <section className="rounded-lg border border-slate-200 p-4">
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                    My Profile
                  </h3>
                  <div className="mt-3 rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                      Roles
                    </p>
                    <p className="mt-1 text-sm text-slate-700">
                      {myRoles.length > 0
                        ? myRoles.join(", ")
                        : "No explicit role assigned"}
                    </p>
                  </div>
                  <div className="mt-4 grid gap-3 md:grid-cols-3">
                    <label className="block">
                      <span className="mb-1 block text-sm font-medium text-slate-700">
                        First Name
                      </span>
                      <input
                        value={editableUsers[profile.id]?.firstName ?? ""}
                        onChange={(event) => {
                          setEditableUsers((previous) => ({
                            ...previous,
                            [profile.id]: {
                              ...(previous[profile.id] ?? {
                                firstName: "",
                                lastName: "",
                                displayName: "",
                                userRoles: getUserRoles(profile),
                                isActive: profile.is_active,
                              }),
                              firstName: event.target.value,
                            },
                          }));
                        }}
                        className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                      />
                    </label>
                    <label className="block">
                      <span className="mb-1 block text-sm font-medium text-slate-700">
                        Last Name
                      </span>
                      <input
                        value={editableUsers[profile.id]?.lastName ?? ""}
                        onChange={(event) => {
                          setEditableUsers((previous) => ({
                            ...previous,
                            [profile.id]: {
                              ...(previous[profile.id] ?? {
                                firstName: "",
                                lastName: "",
                                displayName: "",
                                userRoles: getUserRoles(profile),
                                isActive: profile.is_active,
                              }),
                              lastName: event.target.value,
                            },
                          }));
                        }}
                        className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                      />
                    </label>
                    <label className="block">
                      <span className="mb-1 block text-sm font-medium text-slate-700">
                        Display Name
                      </span>
                      <input
                        value={editableUsers[profile.id]?.displayName ?? ""}
                        onChange={(event) => {
                          setEditableUsers((previous) => ({
                            ...previous,
                            [profile.id]: {
                              ...(previous[profile.id] ?? {
                                firstName: "",
                                lastName: "",
                                displayName: "",
                                userRoles: getUserRoles(profile),
                                isActive: profile.is_active,
                              }),
                              displayName: event.target.value,
                            },
                          }));
                        }}
                        className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                      />
                    </label>
                  </div>
                  <div className="mt-4">
                    <button
                      type="button"
                      className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700"
                      onClick={() => {
                        void saveProfileEdits(profile.id);
                      }}
                    >
                      Save My Name
                    </button>
                  </div>
                </section>
              ) : null}

              <section className="rounded-lg border border-slate-200 p-4">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                  Calendar & Dashboard Defaults
                </h3>
                <form className="mt-4 grid gap-3 md:grid-cols-3" onSubmit={saveSettings}>
                  <label className="block">
                    <span className="mb-1 block text-sm font-medium text-slate-700">
                      Timezone
                    </span>
                    <select
                      value={settings.timezone}
                      onChange={(event) => {
                        setSettings((previous) =>
                          previous ? { ...previous, timezone: event.target.value } : previous
                        );
                      }}
                      className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                      disabled={!canEditAppSettings}
                    >
                      {TIMEZONE_OPTIONS.map((timezone) => (
                        <option key={timezone} value={timezone}>
                          {timezone}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-sm font-medium text-slate-700">
                      Week Start
                    </span>
                    <select
                      value={settings.week_start}
                      onChange={(event) => {
                        setSettings((previous) =>
                          previous ? { ...previous, week_start: Number(event.target.value) } : previous
                        );
                      }}
                      className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                      disabled={!canEditAppSettings}
                    >
                      {WEEK_DAYS.map((day) => (
                        <option key={day.value} value={day.value}>
                          {day.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-sm font-medium text-slate-700">
                      Stale Draft Days
                    </span>
                    <input
                      min={1}
                      max={120}
                      type="number"
                      value={settings.stale_draft_days}
                      onChange={(event) => {
                        setSettings((previous) =>
                          previous
                            ? {
                                ...previous,
                                stale_draft_days: Number(event.target.value) || 1,
                              }
                            : previous
                        );
                      }}
                      className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                      disabled={!canEditAppSettings}
                    />
                  </label>
                  {canEditAppSettings ? (
                    <div className="md:col-span-3">
                      <button
                        type="submit"
                        className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700"
                      >
                        Save Settings
                      </button>
                    </div>
                  ) : null}
                </form>
              </section>
              {isAdminUser ? (
                <section className="rounded-lg border border-rose-200 bg-rose-50/40 p-4">
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-rose-700">
                    Activity History Cleanup
                  </h3>
                  <p className="mt-1 text-sm text-rose-700/90">
                    Admin-only maintenance tool. This permanently deletes audit trail records.
                  </p>
                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    <label className="flex items-start gap-2 rounded-md border border-rose-200 bg-white px-3 py-2 text-sm text-slate-700">
                      <input
                        type="radio"
                        name="activity-history-delete-scope"
                        value="all"
                        checked={activityHistoryDeleteScope === "all"}
                        onChange={() => {
                          setActivityHistoryDeleteScope("all");
                        }}
                      />
                      <span>
                        <span className="font-medium text-slate-900">Delete all history</span>
                        <span className="mt-0.5 block text-xs text-slate-500">
                          Clears activity records for all users.
                        </span>
                      </span>
                    </label>
                    <label className="flex items-start gap-2 rounded-md border border-rose-200 bg-white px-3 py-2 text-sm text-slate-700">
                      <input
                        type="radio"
                        name="activity-history-delete-scope"
                        value="users"
                        checked={activityHistoryDeleteScope === "users"}
                        onChange={() => {
                          setActivityHistoryDeleteScope("users");
                        }}
                      />
                      <span>
                        <span className="font-medium text-slate-900">
                          Delete selected users only
                        </span>
                        <span className="mt-0.5 block text-xs text-slate-500">
                          Removes records where selected users are the actor.
                        </span>
                      </span>
                    </label>
                  </div>
                  {activityHistoryDeleteScope === "users" ? (
                    <div className="mt-3 max-w-xl">
                      <CheckboxMultiSelect
                        label="Users"
                        options={activityCleanupUserOptions}
                        selectedValues={activityHistoryDeleteUserIds}
                        onChange={setActivityHistoryDeleteUserIds}
                      />
                    </div>
                  ) : null}
                  <p className="mt-3 text-xs text-rose-700/90">
                    Deletes from blog assignment history, social post activity history, and
                    permission audit logs. This action cannot be undone.
                  </p>
                  <label className="mt-3 inline-flex items-center gap-2 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={activityCleanupIncludeComments}
                      onChange={(event) => {
                        setActivityCleanupIncludeComments(event.target.checked);
                      }}
                    />
                    Also delete comments activity (blog + social comments)
                  </label>
                  {isTargetedCleanupWithoutUsers ? (
                    <p className="mt-2 text-xs text-rose-700">
                      Select at least one user before running targeted cleanup.
                    </p>
                  ) : null}
                  <div className="mt-4">
                    <button
                      type="button"
                      disabled={isDeletingActivityHistory || isTargetedCleanupWithoutUsers}
                      className="rounded-md bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-500 disabled:cursor-not-allowed disabled:opacity-60"
                      onClick={() => {
                        setIsDeleteHistoryModalOpen(true);
                      }}
                    >
                      Delete Activity History
                    </button>
                  </div>
                </section>
              ) : null}
              {isAdminUser || isQuickViewActive ? (
                <section className="rounded-lg border border-indigo-200 bg-indigo-50/40 p-4">
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-indigo-700">
                    Quick View As User
                  </h3>
                  {isQuickViewActive && quickViewSnapshot ? (
                    <div className="mt-2 rounded-md border border-indigo-200 bg-white px-3 py-2 text-sm text-slate-700">
                      <p>
                        Active quick-view: acting as{" "}
                        <span className="font-semibold">
                          {quickViewSnapshot.targetDisplayName}
                        </span>
                        . Actions are recorded under this user.
                      </p>
                      <div className="mt-3">
                        <button
                          type="button"
                          disabled={isRestoringAdminFromQuickView}
                          className="rounded-md border border-indigo-300 bg-white px-3 py-2 text-sm font-medium text-indigo-700 hover:bg-indigo-100 disabled:cursor-not-allowed disabled:opacity-60"
                          onClick={() => {
                            void restoreAdminFromQuickView();
                          }}
                        >
                          {isRestoringAdminFromQuickView
                            ? "Returning..."
                            : "Return to Admin"}
                        </button>
                      </div>
                    </div>
                  ) : null}
                  {isAdminUser ? (
                    <form className="mt-3 grid gap-3 md:grid-cols-3" onSubmit={startQuickViewAsUser}>
                      <label className="block md:col-span-2">
                        <span className="mb-1 block text-sm font-medium text-slate-700">
                          Choose user
                        </span>
                        <select
                          className="w-full rounded-md border border-indigo-200 bg-white px-3 py-2 text-sm"
                          value={quickViewTargetUserId}
                          onChange={(event) => {
                            setQuickViewTargetUserId(event.target.value);
                          }}
                          required
                        >
                          <option value="">Select non-admin user</option>
                          {quickViewTargetUsers.map((nextUser) => (
                            <option key={nextUser.id} value={nextUser.id}>
                              {nextUser.full_name} ({nextUser.email})
                            </option>
                          ))}
                        </select>
                      </label>
                      <div className="md:self-end">
                        <button
                          type="submit"
                          disabled={isSwitchingQuickViewUser}
                          className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {isSwitchingQuickViewUser ? "Switching..." : "Switch View"}
                        </button>
                      </div>
                    </form>
                  ) : null}
                </section>
              ) : null}

              {canManageUserDirectory || canReassignAssignments ? (
                <>
                  {canManageUsers && canManageRoles ? (
                    <section className="rounded-lg border border-slate-200 p-4">
                      <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                        Create Internal User
                      </h3>
                      <form className="mt-4 grid gap-3 md:grid-cols-4" onSubmit={createUser}>
                      <label className="block">
                        <span className="mb-1 block text-sm font-medium text-slate-700">
                          Full Name
                        </span>
                        <input
                          required
                          value={newFullName}
                          onChange={(event) => {
                            setNewFullName(event.target.value);
                          }}
                          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                        />
                      </label>
                      <label className="block">
                        <span className="mb-1 block text-sm font-medium text-slate-700">Email</span>
                        <input
                          required
                          type="email"
                          value={newEmail}
                          onChange={(event) => {
                            setNewEmail(event.target.value);
                          }}
                          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                        />
                      </label>
                      <label className="block">
                        <span className="mb-1 block text-sm font-medium text-slate-700">
                          Password
                        </span>
                        <input
                          required
                          type="password"
                          minLength={8}
                          value={newPassword}
                          onChange={(event) => {
                            setNewPassword(event.target.value);
                          }}
                          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                        />
                      </label>
                      <label className="block">
                        <span className="mb-1 block text-sm font-medium text-slate-700">
                          Primary Role
                        </span>
                        <select
                          value={newRole}
                          onChange={(event) => {
                            setNewRole(event.target.value as AppRole);
                          }}
                          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                        >
                          {ALL_ROLES.map((role) => (
                            <option key={role} value={role}>
                              {role}
                            </option>
                          ))}
                        </select>
                      </label>
                      <div className="md:col-span-4">
                        <button
                          type="submit"
                          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700"
                        >
                          Create User
                        </button>
                      </div>
                      </form>
                    </section>
                  ) : null}

                  {canReassignAssignments ? (
                    <section className="rounded-lg border border-slate-200 p-4">
                      <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                        Reassign Everything From User
                      </h3>
                      <p className="mt-1 text-sm text-slate-600">
                        Transfer all writer/publisher assignments from one user to another.
                      </p>
                      <form className="mt-4 grid gap-3 md:grid-cols-2" onSubmit={reassignEverythingFromUser}>
                      <label className="block">
                        <span className="mb-1 block text-sm font-medium text-slate-700">
                          From User
                        </span>
                        <select
                          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                          value={reassignFromUserId}
                          onChange={(event) => {
                            setReassignFromUserId(event.target.value);
                          }}
                          required
                        >
                          <option value="">Select source user</option>
                          {users.map((nextUser) => (
                            <option key={nextUser.id} value={nextUser.id}>
                              {nextUser.full_name} ({nextUser.email})
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="block">
                        <span className="mb-1 block text-sm font-medium text-slate-700">
                          To User
                        </span>
                        <select
                          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                          value={reassignToUserId}
                          onChange={(event) => {
                            setReassignToUserId(event.target.value);
                          }}
                          required
                        >
                          <option value="">Select destination user</option>
                          {users
                            .filter((nextUser) => nextUser.is_active)
                            .map((nextUser) => (
                              <option key={nextUser.id} value={nextUser.id}>
                                {nextUser.full_name} ({nextUser.email})
                              </option>
                            ))}
                        </select>
                      </label>
                      <div className="md:col-span-2 flex flex-wrap items-center gap-4">
                        <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                          <input
                            type="checkbox"
                            disabled={!canReassignWriterAssignments}
                            checked={includeWriterAssignments}
                            onChange={(event) => {
                              setIncludeWriterAssignments(event.target.checked);
                            }}
                          />
                          Transfer writer assignments
                        </label>
                        <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                          <input
                            type="checkbox"
                            disabled={!canReassignPublisherAssignments}
                            checked={includePublisherAssignments}
                            onChange={(event) => {
                              setIncludePublisherAssignments(event.target.checked);
                            }}
                          />
                          Transfer publisher assignments
                        </label>
                      </div>
                      <div className="md:col-span-2">
                        <button
                          type="submit"
                          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700"
                        >
                          Reassign Assignments
                        </button>
                      </div>
                      </form>
                    </section>
                  ) : null}

                  {canManageUserDirectory ? (
                    <section className="rounded-lg border border-slate-200 p-4">
                      <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                        Users
                      </h3>
                    <div className="mt-4 grid gap-2 md:grid-cols-2 xl:grid-cols-5">
                      <select
                        className="rounded-md border border-slate-300 px-3 py-2 text-sm"
                        value={userRoleFilter}
                        onChange={(event) => {
                          setUserRoleFilter(event.target.value as AppRole | "all");
                        }}
                      >
                        <option value="all">All Roles</option>
                        {ALL_ROLES.map((role) => (
                          <option key={role} value={role}>
                            {role}
                          </option>
                        ))}
                      </select>
                      <select
                        className="rounded-md border border-slate-300 px-3 py-2 text-sm"
                        value={userActiveFilter}
                        onChange={(event) => {
                          setUserActiveFilter(
                            event.target.value as "all" | "active" | "inactive"
                          );
                        }}
                      >
                        <option value="all">All Activity</option>
                        <option value="active">Active Only</option>
                        <option value="inactive">Inactive Only</option>
                      </select>
                      <select
                        className="rounded-md border border-slate-300 px-3 py-2 text-sm"
                        value={userSortField}
                        onChange={(event) => {
                          setUserSortField(event.target.value as UserSortField);
                        }}
                      >
                        {USER_SORT_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            Sort: {option.label}
                          </option>
                        ))}
                      </select>
                      <select
                        className="rounded-md border border-slate-300 px-3 py-2 text-sm"
                        value={userSortDirection}
                        onChange={(event) => {
                          setUserSortDirection(event.target.value as SortDirection);
                        }}
                      >
                        <option value="asc">Sort Direction: Ascending</option>
                        <option value="desc">Sort Direction: Descending</option>
                      </select>
                      <TableRowLimitSelect
                        value={rowLimit}
                        onChange={(value) => {
                          setRowLimit(value);
                        }}
                      />
                    </div>
                    <div className="mt-2 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                      <TableResultsSummary
                        totalRows={sortedUsers.length}
                        currentPage={currentPage}
                        rowLimit={rowLimit}
                        noun="users"
                      />
                      <TablePaginationControls
                        currentPage={currentPage}
                        pageCount={pageCount}
                        onPageChange={setCurrentPage}
                      />
                    </div>
                    <div className="mt-3 overflow-x-auto rounded-md border border-slate-200">
                      <table className="min-w-full divide-y divide-slate-200 text-sm">
                        <thead className="bg-slate-100 text-left text-xs uppercase tracking-wide text-slate-600">
                          <tr>
                            <th className="px-3 py-2">Email</th>
                            <th className="px-3 py-2">Active</th>
                            <th className="px-3 py-2">First Name</th>
                            <th className="px-3 py-2">Last Name</th>
                            <th className="px-3 py-2">Display Name</th>
                            <th className="px-3 py-2">Roles</th>
                            <th className="px-3 py-2">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {sortedUsers.length === 0 ? (
                            <tr>
                              <td className="px-3 py-4 text-center text-slate-500" colSpan={7}>
                                No users found with current filters.
                              </td>
                            </tr>
                          ) : (
                            pagedUsers.map((nextUser) => {
                              const editable = editableUsers[nextUser.id];
                              if (!editable) {
                                return null;
                              }
                              return (
                                <tr key={nextUser.id}>
                                  <td className="px-3 py-2 text-slate-600">{nextUser.email}</td>
                                  <td className="px-3 py-2">
                                    <label className="inline-flex items-center gap-2 text-xs text-slate-700">
                                      <input
                                        type="checkbox"
                                        disabled={!canManageUsers}
                                        checked={editable.isActive}
                                        onChange={(event) => {
                                          setEditableUsers((previous) => ({
                                            ...previous,
                                            [nextUser.id]: {
                                              ...editable,
                                              isActive: event.target.checked,
                                            },
                                          }));
                                        }}
                                      />
                                      <span>{editable.isActive ? "Active" : "Inactive"}</span>
                                    </label>
                                  </td>
                                  <td className="px-3 py-2">
                                    <input
                                      value={editable.firstName}
                                      onChange={(event) => {
                                        setEditableUsers((previous) => ({
                                          ...previous,
                                          [nextUser.id]: {
                                            ...editable,
                                            firstName: event.target.value,
                                          },
                                        }));
                                      }}
                                      className="w-full rounded border border-slate-300 px-2 py-1 text-sm"
                                    />
                                  </td>
                                  <td className="px-3 py-2">
                                    <input
                                      value={editable.lastName}
                                      onChange={(event) => {
                                        setEditableUsers((previous) => ({
                                          ...previous,
                                          [nextUser.id]: {
                                            ...editable,
                                            lastName: event.target.value,
                                          },
                                        }));
                                      }}
                                      className="w-full rounded border border-slate-300 px-2 py-1 text-sm"
                                    />
                                  </td>
                                  <td className="px-3 py-2">
                                    <input
                                      value={editable.displayName}
                                      onChange={(event) => {
                                        setEditableUsers((previous) => ({
                                          ...previous,
                                          [nextUser.id]: {
                                            ...editable,
                                            displayName: event.target.value,
                                          },
                                        }));
                                      }}
                                      className="w-full rounded border border-slate-300 px-2 py-1 text-sm"
                                    />
                                  </td>
                                  <td className="px-3 py-2">
                                    <div className="flex flex-wrap gap-2">
                                      {ALL_ROLES.map((role) => {
                                        const isChecked = editable.userRoles.includes(role);
                                        return (
                                          <label
                                            key={role}
                                            className="inline-flex items-center gap-1 rounded border border-slate-200 px-2 py-1 text-xs text-slate-700"
                                          >
                                            <input
                                              type="checkbox"
                                              disabled={!canManageRoles}
                                              checked={isChecked}
                                              onChange={() => {
                                                setEditableUsers((previous) => {
                                                  const current = previous[nextUser.id];
                                                  if (!current) {
                                                    return previous;
                                                  }
                                                  const nextRoles = isChecked
                                                    ? current.userRoles.filter((value) => value !== role)
                                                    : [...current.userRoles, role];
                                                  return {
                                                    ...previous,
                                                    [nextUser.id]: {
                                                      ...current,
                                                      userRoles:
                                                        nextRoles.length > 0 ? nextRoles : current.userRoles,
                                                    },
                                                  };
                                                });
                                              }}
                                            />
                                            <span>{role}</span>
                                          </label>
                                        );
                                      })}
                                    </div>
                                  </td>
                                  <td className="px-3 py-2">
                                    <button
                                      type="button"
                                      className="rounded-md border border-slate-300 bg-white px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100"
                                      onClick={() => {
                                        void saveProfileEdits(nextUser.id);
                                      }}
                                    >
                                      Save User
                                    </button>
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                    </section>
                  ) : null}
                </>
              ) : null}
              <ConfirmationModal
                isOpen={isDeleteHistoryModalOpen}
                title="Delete activity history?"
                description={
                  activityHistoryDeleteScope === "all"
                    ? `This permanently deletes all activity records across the app${
                        activityCleanupIncludeComments
                          ? ", including comments activity"
                          : ""
                      }. This action cannot be undone.`
                    : `This permanently deletes activity records for ${
                        activityHistoryDeleteUserIds.length
                      } selected user(s)${
                        activityCleanupIncludeComments
                          ? ", including their comments activity"
                          : ""
                      }. This action cannot be undone.`
                }
                confirmLabel="Delete permanently"
                tone="danger"
                isConfirming={isDeletingActivityHistory}
                onCancel={() => {
                  if (!isDeletingActivityHistory) {
                    setIsDeleteHistoryModalOpen(false);
                  }
                }}
                onConfirm={() => {
                  void deleteActivityHistory();
                }}
              />
            </>
          )}
        </div>
      </AppShell>
    </ProtectedPage>
  );
}
