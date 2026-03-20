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
import { createUiPermissionContract } from "@/lib/permissions/uiPermissions";
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
  TABLE_BASE_CLASS,
  TABLE_BODY_CLASS,
  TABLE_HEAD_CLASS,
  TABLE_TEXT_TRUNCATE_CLASS,
  getTablePageCount,
  getTablePageRows,
  type SortDirection,
  type TableRowLimit,
} from "@/lib/table";
import type { AppRole, AppSettingsRecord, ProfileRecord } from "@/lib/types";
import { useAuth } from "@/providers/auth-provider";
import { useSystemFeedback } from "@/providers/system-feedback-provider";

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
const INACTIVE_USERS_PURGE_CONFIRMATION_TEXT = "DELETE INACTIVE USERS";

type UserSortField = "full_name" | "email" | "roles" | "is_active" | "created_at";
type EditableUserState = {
  firstName: string;
  lastName: string;
  displayName: string;
  userRoles: AppRole[];
  isActive: boolean;
};
type ActivityHistoryDeleteScope = "all" | "users";

function splitName(fullName: string) {
  const [firstName, ...rest] = fullName.trim().split(/\s+/);
  return {
    firstName: firstName || "",
    lastName: rest.join(" "),
  };
}

export default function SettingsPage() {
  const { hasPermission, session, profile, refreshProfile, user } = useAuth();
  const { showError, showSuccess } = useSystemFeedback();
  const permissionContract = useMemo(
    () => createUiPermissionContract(hasPermission),
    [hasPermission]
  );
  const canEditAppSettings = permissionContract.canEditAppSettings;
  const canManageUsers = permissionContract.canManageUsers;
  const canDeleteUsers = permissionContract.canDeleteUsers;
  const canManageRoles = permissionContract.canManageRoles;
  const canManagePermissions = permissionContract.canManagePermissions;
  const canReassignWriterAssignments = permissionContract.canReassignWriterAssignments;
  const canReassignPublisherAssignments =
    permissionContract.canReassignPublisherAssignments;
  const canManageUserDirectory = canManageUsers || canManageRoles || canDeleteUsers;
  const canEditUsersInDirectory = canManageUsers || canManageRoles;
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
    "active"
  );
  const [userSortField] = useState<UserSortField>("created_at");
  const [userSortDirection] = useState<SortDirection>("desc");
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
  const [deleteTargetUserIds, setDeleteTargetUserIds] = useState<string[]>([]);
  const [isDeleteUsersModalOpen, setIsDeleteUsersModalOpen] = useState(false);
  const [isDeletingUsers, setIsDeletingUsers] = useState(false);
  const [isDeleteInactiveUsersModalOpen, setIsDeleteInactiveUsersModalOpen] =
    useState(false);
  const [isDeletingInactiveUsers, setIsDeletingInactiveUsers] = useState(false);
  const [inactiveUsersConfirmationText, setInactiveUsersConfirmationText] =
    useState("");
  const [isWipeAppCleanModalOpen, setIsWipeAppCleanModalOpen] = useState(false);
  const [isWipingAppClean, setIsWipingAppClean] = useState(false);
  const [wipeAppCleanRemoveOtherAdminProfiles, setWipeAppCleanRemoveOtherAdminProfiles] =
    useState(false);
  const [editTargetUserId, setEditTargetUserId] = useState<string | null>(null);
  const [isEditUserModalOpen, setIsEditUserModalOpen] = useState(false);
  const [isSavingEditedUser, setIsSavingEditedUser] = useState(false);
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
      setError(`Couldn't save settings. ${saveError.message}`);
      return;
    }
    setSuccess("Settings saved");
  };
  const updateEditableUser = (
    targetUserId: string,
    updates: Partial<EditableUserState>
  ) => {
    setEditableUsers((previous) => {
      const existing = previous[targetUserId];
      if (!existing) {
        return previous;
      }
      return {
        ...previous,
        [targetUserId]: {
          ...existing,
          ...updates,
        },
      };
    });
  };

  const saveProfileEdits = async (targetUserId: string) => {
    if (!session?.access_token) {
      setError("Missing active session token.");
      return false;
    }
    const edits = editableUsers[targetUserId];
    if (!edits) {
      return false;
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
      setError(`Couldn't update profile. ${payload.error ?? "Try again."}`);
      return false;
    }

    await loadUsers();
    if (targetUserId === profile?.id) {
      await refreshProfile();
    }
    setSuccess("Profile updated");
    return true;
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
      setError(`Couldn't create user. ${payload.error ?? "Try again."}`);
      return;
    }

    setSuccess("User created");
    setNewEmail("");
    setNewPassword("");
    setNewFullName("");
    setNewRole("writer");
    await loadUsers();
  };
  const deleteUsers = async () => {
    if (!session?.access_token || !canDeleteUsers) {
      setError("User delete permission is required.");
      return;
    }
    if (deleteTargetUserIds.length === 0) {
      setError("Select at least one user to delete.");
      return;
    }

    setError(null);
    setSuccess(null);
    setIsDeletingUsers(true);

    const response = await fetch("/api/admin/users", {
      method: "DELETE",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        userIds: deleteTargetUserIds,
      }),
    });

    const payload = (await response.json()) as {
      error?: string;
      deletedCount?: number;
      failed?: Array<{ userId: string; error: string }>;
    };
    if (!response.ok) {
      const reassignmentFailurePrefix =
        "unable to reassign authored content before delete:";
      const normalizedTopLevelError = payload.error?.toLowerCase() ?? "";
      const failedReassignmentEntry = payload.failed?.find((entry) =>
        entry.error.toLowerCase().includes(reassignmentFailurePrefix)
      );
      const topLevelReassignmentFailure =
        normalizedTopLevelError.includes(reassignmentFailurePrefix);

      if (topLevelReassignmentFailure || failedReassignmentEntry) {
        const technicalDetailsRaw = (
          failedReassignmentEntry?.error ?? payload.error ?? ""
        )
          .replace(
            /unable to reassign authored content before delete:\s*/i,
            ""
          )
          .trim();
        const technicalDetails = technicalDetailsRaw
          ? ` Details: ${technicalDetailsRaw}.`
          : "";
        setError(
          `Could not delete user because authored content could not be reassigned automatically. Reassign that user's authored records, then try again.${technicalDetails}`
        );
    } else {
        setError(payload.error ?? "Couldn't delete users. Try again.");
      }
      setIsDeletingUsers(false);
      return;
    }

    const failedCount = payload.failed?.length ?? 0;
    const firstFailureError = payload.failed?.[0]?.error;
    setSuccess(
      `Deleted ${payload.deletedCount ?? 0} user${
        (payload.deletedCount ?? 0) === 1 ? "" : "s"
      }${
        failedCount > 0 ? ` (${failedCount} failed)` : ""
      }`
    );
    if (failedCount > 0 && firstFailureError) {
      setError(`Some users could not be deleted. First failure: ${firstFailureError}`);
    }
    setUserActiveFilter("active");
    setDeleteTargetUserIds([]);
    setIsDeleteUsersModalOpen(false);
    setIsDeletingUsers(false);
    await loadUsers();
  };
  const openEditUserModal = (targetUserId: string) => {
    setEditTargetUserId(targetUserId);
    setIsEditUserModalOpen(true);
  };
  const closeEditUserModal = () => {
    if (isSavingEditedUser) {
      return;
    }
    setIsEditUserModalOpen(false);
    setEditTargetUserId(null);
  };
  const saveEditedUserFromModal = async () => {
    if (!editTargetUserId) {
      return;
    }
    setIsSavingEditedUser(true);
    const didSave = await saveProfileEdits(editTargetUserId);
    setIsSavingEditedUser(false);
    if (didSave) {
      closeEditUserModal();
    }
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
      setError(`Couldn't reassign. ${payload.error ?? "Try again."}`);
      return;
    }

    setSuccess(
      `Transferred ${payload.totalTransferred ?? 0} assignment${
        (payload.totalTransferred ?? 0) === 1 ? "" : "s"
      }`
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
  const wipeAppClean = async () => {
    if (!session?.access_token) {
      setError("Missing active session token.");
      return;
    }
    if (!profile || !getUserRoles(profile).includes("admin") || !canDeleteUsers) {
      setError("Only admins can wipe app data.");
      return;
    }

    setError(null);
    setSuccess(null);
    setIsWipingAppClean(true);

    const response = await fetch("/api/admin/wipe-app-clean", {
      method: "DELETE",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        removeOtherAdminProfiles: wipeAppCleanRemoveOtherAdminProfiles,
      }),
    });
    const payload = (await response.json()) as {
      error?: string;
      deletedAuthUsers?: number;
      preservedAuthUsers?: number;
      preservedAdminUserId?: string;
      removedOtherAdminProfiles?: boolean;
      preservedOtherAdminProfiles?: number;
      failedUserDeletes?: Array<{ userId: string; error: string }>;
      wipeSummary?: {
        truncated_table_count?: number;
      };
    };
    if (!response.ok) {
      setError(payload.error ?? "Failed to wipe app data.");
      setIsWipingAppClean(false);
      return;
    }
    if ((payload.failedUserDeletes?.length ?? 0) > 0) {
      setError(
        `App data was wiped, but ${payload.failedUserDeletes?.length ?? 0} auth user deletion(s) failed.`
      );
      setIsWipingAppClean(false);
      return;
    }

    setIsWipeAppCleanModalOpen(false);
    setIsWipingAppClean(false);
    setWipeAppCleanRemoveOtherAdminProfiles(false);
    clearQuickViewSnapshot();
    setQuickViewSnapshot(null);
    if (typeof window !== "undefined") {
      const resetDashboardStorageKeys = [
        "dashboard-filter-state:v1",
        "dashboard-saved-views:v1",
        "dashboard-active-saved-view:v1",
        "dashboard-column-view:v1",
        "dashboard-column-hidden:v1",
      ];
      for (const key of resetDashboardStorageKeys) {
        window.localStorage.removeItem(`${key}:${profile.id}`);
        window.localStorage.removeItem(`${key}:anonymous`);
      }
    }
    setDeleteTargetUserIds([]);
    setActivityHistoryDeleteUserIds([]);
    await loadUsers();
    await refreshProfile();
    setSuccess(
      `WIPE APP CLEAN complete. Cleared ${
        payload.wipeSummary?.truncated_table_count ?? 0
      } table(s), deleted ${payload.deletedAuthUsers ?? 0} other user account(s), preserved your admin account${
        payload.removedOtherAdminProfiles
          ? "."
          : `, and preserved ${payload.preservedOtherAdminProfiles ?? 0} other admin profile(s).`
      }`
    );
  };
  const deleteInactiveUsers = async () => {
    if (!session?.access_token) {
      setError("Missing active session token.");
      return;
    }
    if (!profile || !getUserRoles(profile).includes("admin") || !canDeleteUsers) {
      setError("Only admins can delete inactive users.");
      return;
    }
    if (
      inactiveUsersConfirmationText.trim() !==
      INACTIVE_USERS_PURGE_CONFIRMATION_TEXT
    ) {
      setError(
        `Type exactly "${INACTIVE_USERS_PURGE_CONFIRMATION_TEXT}" to continue.`
      );
      return;
    }

    setError(null);
    setSuccess(null);
    setIsDeletingInactiveUsers(true);

    const response = await fetch("/api/admin/users/inactive", {
      method: "DELETE",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        confirmationText: inactiveUsersConfirmationText.trim(),
      }),
    });

    const payload = (await response.json()) as {
      error?: string;
      candidateCount?: number;
      deletedCount?: number;
      failed?: Array<{ userId: string; error: string }>;
    };
    if (!response.ok) {
      setError(payload.error ?? "Failed to delete inactive users.");
      setIsDeletingInactiveUsers(false);
      return;
    }

    const failedCount = payload.failed?.length ?? 0;
    setSuccess(
      `Deleted ${payload.deletedCount ?? 0} of ${payload.candidateCount ?? 0} inactive user(s).`
    );
    if (failedCount > 0) {
      setError(
        `Some inactive users could not be deleted. First failure: ${
          payload.failed?.[0]?.error ?? "Unknown error"
        }`
      );
    }

    setIsDeleteInactiveUsersModalOpen(false);
    setInactiveUsersConfirmationText("");
    setIsDeletingInactiveUsers(false);
    setUserActiveFilter("all");
    await loadUsers();
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
  const roleOptions = useMemo(
    () =>
      ALL_ROLES.map((role) => ({
        value: role,
        label: role,
      })),
    []
  );
  const quickViewTargetUsers = useMemo(
    () =>
      users.filter(
        (nextUser) => nextUser.is_active && !getUserRoles(nextUser).includes("admin")
      ),
    [users]
  );
  const deleteTargetUsers = useMemo(
    () => users.filter((nextUser) => deleteTargetUserIds.includes(nextUser.id)),
    [deleteTargetUserIds, users]
  );
  const inactiveUsers = useMemo(
    () =>
      users.filter(
        (nextUser) => !nextUser.is_active && nextUser.id !== profile?.id
      ),
    [profile?.id, users]
  );
  const isInactiveUsersPurgeConfirmationValid =
    inactiveUsersConfirmationText.trim() ===
    INACTIVE_USERS_PURGE_CONFIRMATION_TEXT;
  const editTargetUser = useMemo(
    () => users.find((nextUser) => nextUser.id === editTargetUserId) ?? null,
    [editTargetUserId, users]
  );
  const editTargetUserDraft = useMemo(
    () => (editTargetUserId ? editableUsers[editTargetUserId] ?? null : null),
    [editTargetUserId, editableUsers]
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
          <header className="space-y-2">
            <h2 className="text-xl font-semibold text-slate-900">Settings</h2>
            <p className="text-sm text-slate-600">
              Manage your profile, configure workspace defaults, and access admin controls.
            </p>
          </header>


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
                  <p className="mt-1 text-sm text-slate-600">
                    Update your name and how others see you in the app.
                  </p>
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
                        Save Changes
                      </button>
                  </div>
                </section>
              ) : null}

              <section className="rounded-lg border border-slate-200 p-4">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                  Workspace Defaults
                </h3>
                <p className="mt-1 text-sm text-slate-600">
                  Set your timezone, preferred week start, and draft age thresholds.
                </p>
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
                        Week Starts On
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
                        Mark Drafts as Stale After (days)
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
                          Save Changes
                        </button>
                      </div>
                    ) : null}
                  </form>
              </section>
              {isAdminUser ? (
                <section className="rounded-lg border border-rose-200 bg-rose-50/40 p-4">
                  <h3 className="text-base font-semibold text-rose-900">
                    Activity History Cleanup
                  </h3>
                  <p className="mt-1 text-sm text-rose-800/90">
                    Clean up activity history and records. Useful for removing test data or reducing noise.
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
                          Remove activity records for everyone.
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
                          Remove activity records for specific team members.
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
                    Removes activity from blogs, social posts, and permissions. This action cannot be undone.
                  </p>
                  <label className="mt-3 inline-flex items-center gap-2 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={activityCleanupIncludeComments}
                      onChange={(event) => {
                        setActivityCleanupIncludeComments(event.target.checked);
                      }}
                    />
                    Also remove comments and comment activity
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
              {isAdminUser && canDeleteUsers ? (
                <section className="rounded-lg border border-rose-300 bg-rose-100/50 p-4">
                  <h3 className="text-base font-semibold text-rose-900">
                    Danger Zone: Wipe App Clean
                  </h3>
                  <p className="mt-1 text-sm text-rose-800/90">
                    Factory reset the entire app. Removes all content, users, and history—except your admin account.
                  </p>
                  <p className="mt-2 text-xs font-medium text-rose-900">
                    This action cannot be undone.
                  </p>
                  <div className="mt-4">
                      <button
                        type="button"
                        disabled={isWipingAppClean}
                        className="rounded-md bg-rose-700 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-600 disabled:cursor-not-allowed disabled:opacity-60"
                        onClick={() => {
                          setWipeAppCleanRemoveOtherAdminProfiles(false);
                          setIsWipeAppCleanModalOpen(true);
                        }}
                      >
                        Wipe App Clean
                      </button>
                  </div>
                </section>
              ) : null}
              {isAdminUser || isQuickViewActive ? (
                <section className="rounded-lg border border-indigo-200 bg-indigo-50/40 p-4">
                  <h3 className="text-base font-semibold text-indigo-900">
                    Access & Oversight
                  </h3>
                  <p className="mt-1 text-sm text-indigo-900/80">
                    Manage role permissions or temporarily view the app as another user.
                  </p>
                  {canManagePermissions ? (
                    <div className="mt-3">
                      <Link
                        href="/settings/permissions"
                        className="inline-flex rounded-md border border-indigo-300 bg-white px-3 py-2 text-sm font-medium text-indigo-700 hover:bg-indigo-100"
                      >
                        Open Permissions Panel
                      </Link>
                    </div>
                  ) : null}
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
                          Quick view as
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
                        Create User Account
                      </h3>
                      <p className="mt-1 text-sm text-slate-600">
                        Add a new team member to the app.
                      </p>
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
                        Reassign User Work
                      </h3>
                      <p className="mt-1 text-sm text-slate-600">
                        Transfer all writer and publisher work from one team member to another.
                      </p>
                      <form className="mt-4 grid gap-3 md:grid-cols-2" onSubmit={reassignEverythingFromUser}>
                      <label className="block">
                        <span className="mb-1 block text-sm font-medium text-slate-700">
                          From
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
                          To
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
                        User Directory
                      </h3>
                      <p className="mt-1 text-sm text-slate-600">
                        View all team members, edit their details, or deactivate accounts.
                      </p>
                      <div className="mt-4 grid gap-3 md:grid-cols-2">
                        <label className="block">
                          <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">
                            Role Filter
                          </span>
                          <select
                            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
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
                        </label>
                        <label className="block">
                          <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">
                            Status Filter
                          </span>
                          <select
                            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
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
                        </label>
                      </div>
                    {canDeleteUsers ? (
                      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-md border border-rose-200 bg-rose-50 px-3 py-2">
                        <p className="text-xs text-rose-800">
                          Inactive users available for permanent deletion:{" "}
                          <span className="font-semibold">{inactiveUsers.length}</span>
                        </p>
                        <button
                          type="button"
                          disabled={
                            inactiveUsers.length === 0 || isDeletingInactiveUsers
                          }
                          className="rounded-md border border-rose-300 bg-white px-3 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
                          onClick={() => {
                            setIsDeleteInactiveUsersModalOpen(true);
                          }}
                        >
                          Delete All Inactive Users
                        </button>
                      </div>
                    ) : null}
                    <div className="mt-3 overflow-auto rounded-lg border border-slate-200">
                      <table className={TABLE_BASE_CLASS}>
                        <thead className={TABLE_HEAD_CLASS}>
                          <tr>
                            <th className="px-3 py-2 font-medium whitespace-nowrap">Email</th>
                            <th className="px-3 py-2 font-medium whitespace-nowrap">Username</th>
                            <th className="px-3 py-2 font-medium whitespace-nowrap">Actions</th>
                          </tr>
                        </thead>
                        <tbody className={TABLE_BODY_CLASS}>
                          {sortedUsers.length === 0 ? (
                            <tr>
                              <td
                                className="h-12 px-3 py-2 align-middle text-center text-slate-500"
                                colSpan={3}
                              >
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
                                  <td className="h-12 max-w-[16rem] px-3 py-2 align-middle text-slate-600 overflow-hidden">
                                    <span
                                      className={TABLE_TEXT_TRUNCATE_CLASS}
                                      title={nextUser.email}
                                    >
                                      {nextUser.email}
                                    </span>
                                  </td>
                                  <td className="h-12 max-w-[16rem] px-3 py-2 align-middle overflow-hidden">
                                    <span
                                      className={TABLE_TEXT_TRUNCATE_CLASS}
                                      title={`${editable.displayName || "—"}${
                                        nextUser.is_active ? "" : " (inactive)"
                                      }`}
                                    >
                                      {editable.displayName || "—"}
                                      {nextUser.is_active ? "" : " (inactive)"}
                                    </span>
                                  </td>
                                  <td className="h-12 px-3 py-2 align-middle whitespace-nowrap">
                                    <div className="flex items-center gap-2">
                                      {canEditUsersInDirectory ? (
                                        <button
                                          type="button"
                                          className="rounded-md border border-slate-300 bg-white px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100"
                                          onClick={() => {
                                            openEditUserModal(nextUser.id);
                                          }}
                                        >
                                          Edit
                                        </button>
                                      ) : null}
                                      {canDeleteUsers ? (
                                        <button
                                          type="button"
                                          disabled={isDeletingUsers || nextUser.id === profile?.id}
                                          className="rounded-md border border-rose-300 bg-white px-3 py-1 text-xs font-medium text-rose-700 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
                                          onClick={() => {
                                            setDeleteTargetUserIds([nextUser.id]);
                                            setIsDeleteUsersModalOpen(true);
                                          }}
                                        >
                                          Delete
                                        </button>
                                      ) : null}
                                    </div>
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                      <TableResultsSummary
                        totalRows={sortedUsers.length}
                        currentPage={currentPage}
                        rowLimit={rowLimit}
                        noun="users"
                      />
                      <div className="flex flex-wrap items-center gap-2">
                        <TableRowLimitSelect
                          value={rowLimit}
                          onChange={(value) => {
                            setRowLimit(value);
                          }}
                        />
                        <TablePaginationControls
                          currentPage={currentPage}
                          pageCount={pageCount}
                          onPageChange={setCurrentPage}
                        />
                      </div>
                    </div>
                    </section>
                  ) : null}
                </>
              ) : null}
              {isEditUserModalOpen && editTargetUser && editTargetUserDraft ? (
                <div className="fixed inset-0 z-40 flex items-center justify-center p-4">
                  <button
                    type="button"
                    aria-label="Close edit user modal"
                    className="absolute inset-0 bg-slate-900/30"
                    onClick={closeEditUserModal}
                  />
                  <div className="relative z-10 w-full max-w-xl rounded-lg border border-slate-200 bg-white p-5 shadow-xl">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-base font-semibold text-slate-900">Edit User</h3>
                        <p className="mt-1 text-sm text-slate-600">
                          Update username, name fields, and roles for{" "}
                          <span className="font-medium text-slate-900">
                            {editTargetUser.email}
                          </span>
                          .
                        </p>
                      </div>
                      <button
                        type="button"
                        disabled={isSavingEditedUser}
                        className="rounded-md border border-slate-300 px-2 py-1 text-sm text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                        onClick={closeEditUserModal}
                      >
                        Close
                      </button>
                    </div>
                    <div className="mt-4 space-y-4">
                      <label className="block">
                        <span className="mb-1 block text-sm font-medium text-slate-700">
                          Username
                        </span>
                        <input
                          value={editTargetUserDraft.displayName}
                          onChange={(event) => {
                            updateEditableUser(editTargetUser.id, {
                              displayName: event.target.value,
                            });
                          }}
                          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                        />
                      </label>
                      <div className="grid gap-3 md:grid-cols-2">
                        <label className="block">
                          <span className="mb-1 block text-sm font-medium text-slate-700">
                            First Name
                          </span>
                          <input
                            value={editTargetUserDraft.firstName}
                            onChange={(event) => {
                              updateEditableUser(editTargetUser.id, {
                                firstName: event.target.value,
                              });
                            }}
                            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                          />
                        </label>
                        <label className="block">
                          <span className="mb-1 block text-sm font-medium text-slate-700">
                            Last Name
                          </span>
                          <input
                            value={editTargetUserDraft.lastName}
                            onChange={(event) => {
                              updateEditableUser(editTargetUser.id, {
                                lastName: event.target.value,
                              });
                            }}
                            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                          />
                        </label>
                      </div>
                      <div className="max-w-sm">
                        {canManageRoles ? (
                          <CheckboxMultiSelect
                            label="Roles"
                            options={roleOptions}
                            selectedValues={editTargetUserDraft.userRoles}
                            onChange={(nextValues) => {
                              const normalizedRoles = Array.from(
                                new Set(
                                  nextValues.filter((value): value is AppRole =>
                                    ALL_ROLES.includes(value as AppRole)
                                  )
                                )
                              );
                              if (normalizedRoles.length === 0) {
                                setError("A user must have at least one role.");
                                return;
                              }
                              updateEditableUser(editTargetUser.id, {
                                userRoles: normalizedRoles,
                              });
                            }}
                          />
                        ) : (
                          <label className="block">
                            <span className="mb-1 block text-sm font-medium text-slate-700">
                              Roles
                            </span>
                            <p className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                              {editTargetUserDraft.userRoles.join(", ")}
                            </p>
                          </label>
                        )}
                      </div>
                    </div>
                    <div className="mt-4 flex items-center justify-end gap-2">
                      <button
                        type="button"
                        disabled={isSavingEditedUser}
                        className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                        onClick={closeEditUserModal}
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        disabled={isSavingEditedUser}
                        className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
                        onClick={() => {
                          void saveEditedUserFromModal();
                        }}
                      >
                        {isSavingEditedUser ? "Saving..." : "Save"}
                      </button>
                    </div>
                  </div>
                </div>
              ) : null}
              {isDeleteInactiveUsersModalOpen ? (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                  <button
                    type="button"
                    aria-label="Close delete inactive users modal"
                    className="absolute inset-0 bg-slate-900/30"
                    onClick={() => {
                      if (!isDeletingInactiveUsers) {
                        setIsDeleteInactiveUsersModalOpen(false);
                        setInactiveUsersConfirmationText("");
                      }
                    }}
                  />
                  <div className="relative z-10 w-full max-w-lg rounded-lg border border-rose-200 bg-white p-5 shadow-xl">
                    <h3 className="text-base font-semibold text-slate-900">
                      Delete all inactive users?
                    </h3>
                    <p className="mt-1 text-sm text-slate-600">
                      This permanently deletes{" "}
                      <span className="font-semibold text-slate-900">
                        {inactiveUsers.length}
                      </span>{" "}
                      inactive user account(s) from authentication and app data. This action
                      cannot be undone.
                    </p>
                    <div className="mt-3 max-h-36 overflow-auto rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
                      {inactiveUsers.length === 0 ? (
                        <p className="text-xs text-slate-500">
                          No inactive users found.
                        </p>
                      ) : (
                        <ul className="space-y-1 text-xs text-slate-700">
                          {inactiveUsers.map((nextUser) => (
                            <li key={nextUser.id}>
                              {nextUser.full_name} ({nextUser.email})
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                    <label className="mt-4 block">
                      <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-600">
                        Type {INACTIVE_USERS_PURGE_CONFIRMATION_TEXT}
                      </span>
                      <input
                        value={inactiveUsersConfirmationText}
                        onChange={(event) => {
                          setInactiveUsersConfirmationText(event.target.value);
                        }}
                        className="w-full rounded-md border border-rose-300 px-3 py-2 text-sm"
                        disabled={isDeletingInactiveUsers}
                      />
                    </label>
                    <div className="mt-4 flex items-center justify-end gap-2">
                      <button
                        type="button"
                        disabled={isDeletingInactiveUsers}
                        className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                        onClick={() => {
                          setIsDeleteInactiveUsersModalOpen(false);
                          setInactiveUsersConfirmationText("");
                        }}
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        disabled={
                          isDeletingInactiveUsers ||
                          inactiveUsers.length === 0 ||
                          !isInactiveUsersPurgeConfirmationValid
                        }
                        className="rounded-md bg-rose-700 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-600 disabled:cursor-not-allowed disabled:opacity-60"
                        onClick={() => {
                          void deleteInactiveUsers();
                        }}
                      >
                        {isDeletingInactiveUsers
                          ? "Deleting..."
                          : "Delete Inactive Users"}
                      </button>
                    </div>
                  </div>
                </div>
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
              <ConfirmationModal
                isOpen={isDeleteUsersModalOpen}
                title="Delete selected user(s)?"
                description={
                  deleteTargetUsers.length > 0
                    ? `This permanently deletes ${deleteTargetUsers
                        .map((nextUser) => nextUser.full_name)
                        .join(", ")}. This action cannot be undone.`
                    : "This permanently deletes selected users. This action cannot be undone."
                }
                confirmLabel="Delete user(s)"
                tone="danger"
                isConfirming={isDeletingUsers}
                onCancel={() => {
                  if (!isDeletingUsers) {
                    setIsDeleteUsersModalOpen(false);
                  }
                }}
                onConfirm={() => {
                  void deleteUsers();
                }}
              />
              {isWipeAppCleanModalOpen ? (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                  <button
                    type="button"
                    aria-label="Close wipe app clean modal"
                    className="absolute inset-0 bg-slate-900/30"
                    onClick={() => {
                      if (!isWipingAppClean) {
                        setIsWipeAppCleanModalOpen(false);
                        setWipeAppCleanRemoveOtherAdminProfiles(false);
                      }
                    }}
                  />
                  <div className="relative z-10 w-full max-w-lg rounded-lg border border-rose-200 bg-white p-5 shadow-xl">
                    <h3 className="text-base font-semibold text-slate-900">
                      WIPE APP CLEAN?
                    </h3>
                    <p className="mt-1 text-sm text-slate-600">
                      This permanently deletes all app data and all non-admin user accounts.
                      Your currently signed-in admin account is always preserved.
                    </p>
                    <label className="mt-4 inline-flex items-start gap-2 text-sm text-slate-700">
                      <input
                        type="checkbox"
                        checked={wipeAppCleanRemoveOtherAdminProfiles}
                        onChange={(event) => {
                          setWipeAppCleanRemoveOtherAdminProfiles(
                            event.target.checked
                          );
                        }}
                        disabled={isWipingAppClean}
                      />
                      <span>
                        Also remove all other admin profiles and auth accounts (except my
                        signed-in admin account)
                      </span>
                    </label>
                    <p className="mt-3 text-xs font-medium text-rose-900">
                      This action cannot be undone.
                    </p>
                    <div className="mt-4 flex items-center justify-end gap-2">
                      <button
                        type="button"
                        disabled={isWipingAppClean}
                        className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                        onClick={() => {
                          setIsWipeAppCleanModalOpen(false);
                          setWipeAppCleanRemoveOtherAdminProfiles(false);
                        }}
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        disabled={isWipingAppClean}
                        className="rounded-md bg-rose-700 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-600 disabled:cursor-not-allowed disabled:opacity-60"
                        onClick={() => {
                          void wipeAppClean();
                        }}
                      >
                        {isWipingAppClean ? "Working..." : "Wipe app clean"}
                      </button>
                    </div>
                  </div>
                </div>
              ) : null}
            </>
          )}
        </div>
      </AppShell>
    </ProtectedPage>
  );
}
