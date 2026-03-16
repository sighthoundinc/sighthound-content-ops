"use client";

import { hasWorkflowOverridePermission } from "@/lib/permissions";
import { getUserRoles } from "@/lib/roles";
import type {
  AppPermissionKey,
  CanonicalAppPermissionKey,
  ProfileRecord,
} from "@/lib/types";

export type PermissionLookup = (permissionKey: AppPermissionKey) => boolean;

type PermissionCheckConfig = {
  requiredPermission: CanonicalAppPermissionKey;
  capabilityName: string;
  allowWorkflowOverride?: boolean;
};

const warnedDeniedPermissions = new Set<string>();

export const FieldPermissions = {
  displayPublishDate: "edit_display_publish_date",
  scheduledPublishDate: "edit_scheduled_publish_date",
} as const satisfies Record<string, CanonicalAppPermissionKey>;

export const ExportScopePermissions = {
  viewExport: "export_csv",
  selectedExport: "export_selected_csv",
} as const satisfies Record<string, CanonicalAppPermissionKey>;

export function isPermissionDebugModeEnabled() {
  if (typeof window === "undefined") {
    return false;
  }
  const params = new URLSearchParams(window.location.search);
  return params.get("debugPermissions") === "true";
}

function warnPermissionDenied({
  capabilityName,
  requiredPermission,
}: PermissionCheckConfig) {
  if (!isPermissionDebugModeEnabled()) {
    return;
  }
  const warningKey = `${capabilityName}:${requiredPermission}`;
  if (warnedDeniedPermissions.has(warningKey)) {
    return;
  }
  warnedDeniedPermissions.add(warningKey);
  console.warn(
    `[permissions] ${capabilityName} denied. Required permission: ${requiredPermission}`
  );
}

function hasCapabilityByPermission(
  hasPermission: PermissionLookup,
  config: PermissionCheckConfig
) {
  const hasDirectPermission = hasPermission(config.requiredPermission);
  const hasOverride =
    config.allowWorkflowOverride === true &&
    hasWorkflowOverridePermission(hasPermission);

  const isAllowed = hasDirectPermission || hasOverride;
  if (!isAllowed) {
    warnPermissionDenied(config);
  }
  return isAllowed;
}

function hasCapabilityByAnyPermission(
  hasPermission: PermissionLookup,
  config: {
    requiredPermissions: CanonicalAppPermissionKey[];
    capabilityName: string;
    allowWorkflowOverride?: boolean;
  }
) {
  const hasDirectPermission = config.requiredPermissions.some((permissionKey) =>
    hasPermission(permissionKey)
  );
  const hasOverride =
    config.allowWorkflowOverride === true &&
    hasWorkflowOverridePermission(hasPermission);

  const isAllowed = hasDirectPermission || hasOverride;
  if (!isAllowed && config.requiredPermissions[0]) {
    warnPermissionDenied({
      capabilityName: config.capabilityName,
      requiredPermission: config.requiredPermissions[0],
      allowWorkflowOverride: config.allowWorkflowOverride,
    });
  }
  return isAllowed;
}

export function canCreateBlog(hasPermission: PermissionLookup) {
  return hasCapabilityByPermission(hasPermission, {
    requiredPermission: "create_blog",
    capabilityName: "canCreateBlog",
  });
}

export function canCreateComment(hasPermission: PermissionLookup) {
  return hasCapabilityByPermission(hasPermission, {
    requiredPermission: "create_comment",
    capabilityName: "canCreateComment",
  });
}

export function canViewDashboard(hasPermission: PermissionLookup) {
  return hasCapabilityByPermission(hasPermission, {
    requiredPermission: "view_dashboard",
    capabilityName: "canViewDashboard",
  });
}

export function canEditDisplayPublishDate(hasPermission: PermissionLookup) {
  return hasCapabilityByPermission(hasPermission, {
    requiredPermission: FieldPermissions.displayPublishDate,
    capabilityName: "canEditDisplayPublishDate",
    allowWorkflowOverride: true,
  });
}

export function canEditScheduledPublishDate(hasPermission: PermissionLookup) {
  return hasCapabilityByPermission(hasPermission, {
    requiredPermission: FieldPermissions.scheduledPublishDate,
    capabilityName: "canEditScheduledPublishDate",
    allowWorkflowOverride: true,
  });
}

export function canExportCsv(hasPermission: PermissionLookup) {
  return hasCapabilityByPermission(hasPermission, {
    requiredPermission: ExportScopePermissions.viewExport,
    capabilityName: "canExportCsv",
  });
}

export function canExportSelectedCsv(hasPermission: PermissionLookup) {
  return hasCapabilityByPermission(hasPermission, {
    requiredPermission: ExportScopePermissions.selectedExport,
    capabilityName: "canExportSelectedCsv",
  });
}

export const canExportCSV = canExportCsv;
export const canExportSelectedCSV = canExportSelectedCsv;

export function canEditBlogMetadata(hasPermission: PermissionLookup) {
  return hasCapabilityByAnyPermission(hasPermission, {
    requiredPermissions: ["edit_blog_metadata", "edit_blog_title"],
    capabilityName: "canEditBlogMetadata",
    allowWorkflowOverride: true,
  });
}

export function canChangeWriterAssignment(hasPermission: PermissionLookup) {
  return hasCapabilityByPermission(hasPermission, {
    requiredPermission: "change_writer_assignment",
    capabilityName: "canChangeWriterAssignment",
    allowWorkflowOverride: true,
  });
}

export function canChangePublisherAssignment(hasPermission: PermissionLookup) {
  return hasCapabilityByPermission(hasPermission, {
    requiredPermission: "change_publisher_assignment",
    capabilityName: "canChangePublisherAssignment",
    allowWorkflowOverride: true,
  });
}

export function canArchiveBlog(hasPermission: PermissionLookup) {
  return hasCapabilityByPermission(hasPermission, {
    requiredPermission: "archive_blog",
    capabilityName: "canArchiveBlog",
    allowWorkflowOverride: true,
  });
}

export function canDeleteBlog(hasPermission: PermissionLookup) {
  return hasCapabilityByPermission(hasPermission, {
    requiredPermission: "delete_blog",
    capabilityName: "canDeleteBlog",
    allowWorkflowOverride: true,
  });
}

export function canEditWriterWorkflow(hasPermission: PermissionLookup) {
  return hasCapabilityByAnyPermission(hasPermission, {
    requiredPermissions: [
      "edit_writer_status",
      "edit_google_doc_link",
      "start_writing",
      "submit_draft",
      "request_revision",
    ],
    capabilityName: "canEditWriterWorkflow",
    allowWorkflowOverride: true,
  });
}

export function canEditPublisherWorkflow(hasPermission: PermissionLookup) {
  return hasCapabilityByAnyPermission(hasPermission, {
    requiredPermissions: [
      "edit_publisher_status",
      "edit_live_url",
      "start_publishing",
      "complete_publishing",
    ],
    capabilityName: "canEditPublisherWorkflow",
    allowWorkflowOverride: true,
  });
}

export function canViewWritingQueue(hasPermission: PermissionLookup) {
  return hasCapabilityByPermission(hasPermission, {
    requiredPermission: "view_writing_queue",
    capabilityName: "canViewWritingQueue",
    allowWorkflowOverride: true,
  });
}

export function canViewPublishingQueue(hasPermission: PermissionLookup) {
  return hasCapabilityByPermission(hasPermission, {
    requiredPermission: "view_publishing_queue",
    capabilityName: "canViewPublishingQueue",
    allowWorkflowOverride: true,
  });
}

export function canCalendarDragReschedule(hasPermission: PermissionLookup) {
  return hasCapabilityByAnyPermission(hasPermission, {
    requiredPermissions: ["calendar_drag_reschedule", "reschedule_via_calendar"],
    capabilityName: "canCalendarDragReschedule",
    allowWorkflowOverride: true,
  });
}

export function canManageUsers(hasPermission: PermissionLookup) {
  return hasCapabilityByPermission(hasPermission, {
    requiredPermission: "manage_users",
    capabilityName: "canManageUsers",
  });
}
export function canDeleteUsers(hasPermission: PermissionLookup) {
  return hasCapabilityByPermission(hasPermission, {
    requiredPermission: "delete_user",
    capabilityName: "canDeleteUsers",
  });
}

export function canManageRoles(hasPermission: PermissionLookup) {
  return hasCapabilityByPermission(hasPermission, {
    requiredPermission: "assign_roles",
    capabilityName: "canManageRoles",
  });
}

export function canManagePermissions(hasPermission: PermissionLookup) {
  return hasCapabilityByPermission(hasPermission, {
    requiredPermission: "manage_permissions",
    capabilityName: "canManagePermissions",
  });
}

export function canEditAppSettings(hasPermission: PermissionLookup) {
  return hasCapabilityByPermission(hasPermission, {
    requiredPermission: "manage_environment_settings",
    capabilityName: "canEditAppSettings",
    allowWorkflowOverride: true,
  });
}

export function canReassignWriterAssignments(hasPermission: PermissionLookup) {
  return hasCapabilityByAnyPermission(hasPermission, {
    requiredPermissions: [
      "change_writer_assignment",
      "transfer_user_assignments",
      "bulk_reassign_blogs",
    ],
    capabilityName: "canReassignWriterAssignments",
    allowWorkflowOverride: true,
  });
}

export function canReassignPublisherAssignments(hasPermission: PermissionLookup) {
  return hasCapabilityByAnyPermission(hasPermission, {
    requiredPermissions: [
      "change_publisher_assignment",
      "transfer_user_assignments",
      "bulk_reassign_blogs",
    ],
    capabilityName: "canReassignPublisherAssignments",
    allowWorkflowOverride: true,
  });
}

export function canViewAllTaskScope(profile: ProfileRecord | null) {
  if (!profile) {
    return false;
  }
  return getUserRoles(profile).includes("admin");
}

export function createUiPermissionContract(hasPermission: PermissionLookup) {
  return {
    canOverrideWorkflow: hasWorkflowOverridePermission(hasPermission),
    canCreateBlog: canCreateBlog(hasPermission),
    canCreateComment: canCreateComment(hasPermission),
    canViewDashboard: canViewDashboard(hasPermission),
    canEditBlogMetadata: canEditBlogMetadata(hasPermission),
    canChangeWriterAssignment: canChangeWriterAssignment(hasPermission),
    canChangePublisherAssignment: canChangePublisherAssignment(hasPermission),
    canEditScheduledPublishDate: canEditScheduledPublishDate(hasPermission),
    canEditDisplayPublishDate: canEditDisplayPublishDate(hasPermission),
    canArchiveBlog: canArchiveBlog(hasPermission),
    canDeleteBlog: canDeleteBlog(hasPermission),
    canEditWriterWorkflow: canEditWriterWorkflow(hasPermission),
    canEditPublisherWorkflow: canEditPublisherWorkflow(hasPermission),
    canViewWritingQueue: canViewWritingQueue(hasPermission),
    canViewPublishingQueue: canViewPublishingQueue(hasPermission),
    canExportCsv: canExportCsv(hasPermission),
    canExportSelectedCsv: canExportSelectedCsv(hasPermission),
    canCalendarDragReschedule: canCalendarDragReschedule(hasPermission),
    canManageUsers: canManageUsers(hasPermission),
    canDeleteUsers: canDeleteUsers(hasPermission),
    canManageRoles: canManageRoles(hasPermission),
    canManagePermissions: canManagePermissions(hasPermission),
    canEditAppSettings: canEditAppSettings(hasPermission),
    canReassignWriterAssignments: canReassignWriterAssignments(hasPermission),
    canReassignPublisherAssignments: canReassignPublisherAssignments(hasPermission),
  };
}

export type UiPermissionContract = ReturnType<typeof createUiPermissionContract>;
