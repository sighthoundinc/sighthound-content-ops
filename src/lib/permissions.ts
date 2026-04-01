import type {
  AppPermissionKey,
  AppRole,
  BlogRecord,
  CanonicalAppPermissionKey,
  LegacyAppPermissionKey,
  PublisherStageStatus,
  WriterStageStatus,
} from "@/lib/types";

export type PermissionGroup =
  | "blog_lifecycle"
  | "writing_stage"
  | "publishing_stage"
  | "scheduling"
  | "comments_collaboration"
  | "assignments_ownership"
  | "dashboard_analytics"
  | "blog_data_editing"
  | "calendar_management"
  | "user_management"
  | "system_administration"
  | "workflow_overrides";

export type PermissionDefinition = {
  key: CanonicalAppPermissionKey;
  label: string;
  description: string;
  group: PermissionGroup;
  configurable: boolean;
};

export type RolePermissionRow = {
  role: AppRole;
  permission_key: CanonicalAppPermissionKey;
  enabled: boolean;
};

type PostgrestLikeError = {
  code?: string | null;
  message?: string | null;
  details?: string | null;
  hint?: string | null;
};

type PermissionLookup = (permission: AppPermissionKey) => boolean;

export const APP_ROLES: AppRole[] = ["admin", "writer", "publisher", "editor"];
export const MANAGED_PERMISSION_ROLES: AppRole[] = ["writer", "publisher", "editor"];

export const LEGACY_PERMISSION_KEYS: LegacyAppPermissionKey[] = [
  "submit_writing",
  "edit_writing_stage",
  "edit_publishing_stage",
  "use_calendar_drag_and_drop",
  "create_comments",
  "edit_own_comments",
  "delete_comments",
  "manage_roles",
  "override_workflow",
];

const LEGACY_PERMISSION_ALIAS_MAP: Record<
  LegacyAppPermissionKey,
  CanonicalAppPermissionKey[]
> = {
  submit_writing: ["submit_draft"],
  edit_writing_stage: ["edit_writer_status"],
  edit_publishing_stage: ["edit_publisher_status"],
  use_calendar_drag_and_drop: [
    "calendar_drag_reschedule",
    "reschedule_via_calendar",
  ],
  create_comments: ["create_comment"],
  edit_own_comments: ["edit_own_comment"],
  delete_comments: ["delete_any_comment"],
  manage_roles: ["assign_roles"],
  override_workflow: [
    "repair_workflow_state",
    "override_writer_status",
    "override_publisher_status",
    "edit_actual_publish_timestamp",
    "force_publish",
  ],
};

const BLOG_LIFECYCLE_PERMISSIONS: PermissionDefinition[] = [
  {
    key: "create_blog",
    label: "Create Blog",
    description: "Create a new blog entry.",
    group: "blog_lifecycle",
    configurable: true,
  },
  {
    key: "edit_blog_metadata",
    label: "Edit Blog Metadata",
    description: "Edit metadata like URLs and non-system fields.",
    group: "blog_lifecycle",
    configurable: true,
  },
  {
    key: "edit_blog_title",
    label: "Edit Blog Title",
    description: "Modify blog title.",
    group: "blog_lifecycle",
    configurable: true,
  },
  {
    key: "archive_blog",
    label: "Archive Blog",
    description: "Archive a blog.",
    group: "blog_lifecycle",
    configurable: true,
  },
  {
    key: "restore_archived_blog",
    label: "Restore Archived Blog",
    description: "Restore an archived blog.",
    group: "blog_lifecycle",
    configurable: true,
  },
  {
    key: "delete_blog",
    label: "Delete Blog",
    description: "Permanently delete a blog.",
    group: "blog_lifecycle",
    configurable: false,
  },
  {
    key: "delete_idea",
    label: "Delete Idea",
    description: "Delete a blog idea the user created.",
    group: "blog_lifecycle",
    configurable: true,
  },
  {
    key: "delete_social_post",
    label: "Delete Social Post",
    description: "Delete a social post the user created.",
    group: "blog_lifecycle",
    configurable: true,
  },
  {
    key: "duplicate_blog",
    label: "Duplicate Blog",
    description: "Clone an existing blog.",
    group: "blog_lifecycle",
    configurable: true,
  },
  {
    key: "view_archived_blogs",
    label: "View Archived Blogs",
    description: "View archived blog content.",
    group: "blog_lifecycle",
    configurable: true,
  },
];

const WRITING_STAGE_PERMISSIONS: PermissionDefinition[] = [
  {
    key: "start_writing",
    label: "Start Writing",
    description: "Move writing stage to in progress.",
    group: "writing_stage",
    configurable: true,
  },
  {
    key: "pause_writing",
    label: "Pause Writing",
    description: "Pause writing work.",
    group: "writing_stage",
    configurable: true,
  },
  {
    key: "submit_draft",
    label: "Submit Draft",
    description: "Mark writing as completed.",
    group: "writing_stage",
    configurable: true,
  },
  {
    key: "request_revision",
    label: "Request Revision",
    description: "Move draft to needs revision.",
    group: "writing_stage",
    configurable: true,
  },
  {
    key: "edit_writer_status",
    label: "Edit Writer Status",
    description: "Modify writing status with full control.",
    group: "writing_stage",
    configurable: true,
  },
  {
    key: "edit_google_doc_link",
    label: "Edit Google Doc Link",
    description: "Modify writing document link.",
    group: "writing_stage",
    configurable: true,
  },
  {
    key: "assign_writer_self",
    label: "Assign Writer to Self",
    description: "Assign yourself as writer.",
    group: "writing_stage",
    configurable: true,
  },
  {
    key: "view_writing_queue",
    label: "View Writing Queue",
    description: "View writing task queue.",
    group: "writing_stage",
    configurable: true,
  },
];

const PUBLISHING_STAGE_PERMISSIONS: PermissionDefinition[] = [
  {
    key: "start_publishing",
    label: "Start Publishing",
    description: "Move publishing stage to in progress.",
    group: "publishing_stage",
    configurable: true,
  },
  {
    key: "complete_publishing",
    label: "Complete Publishing",
    description: "Mark blog as published.",
    group: "publishing_stage",
    configurable: true,
  },
  {
    key: "edit_publisher_status",
    label: "Edit Publisher Status",
    description: "Modify publishing status with full control.",
    group: "publishing_stage",
    configurable: true,
  },
  {
    key: "assign_publisher_self",
    label: "Assign Publisher to Self",
    description: "Assign yourself as publisher.",
    group: "publishing_stage",
    configurable: true,
  },
  {
    key: "upload_cover_image",
    label: "Upload Cover Image",
    description: "Attach cover image to a blog.",
    group: "publishing_stage",
    configurable: true,
  },
  {
    key: "edit_live_url",
    label: "Edit Live URL",
    description: "Modify final published URL.",
    group: "publishing_stage",
    configurable: true,
  },
  {
    key: "view_publishing_queue",
    label: "View Publishing Queue",
    description: "View publishing task queue.",
    group: "publishing_stage",
    configurable: true,
  },
];

const SCHEDULING_PERMISSIONS: PermissionDefinition[] = [
  {
    key: "edit_scheduled_publish_date",
    label: "Edit Scheduled Publish Date",
    description: "Modify scheduled publish date.",
    group: "scheduling",
    configurable: true,
  },
  {
    key: "edit_display_publish_date",
    label: "Edit Display Publish Date",
    description: "Modify display publish date.",
    group: "scheduling",
    configurable: true,
  },
  {
    key: "calendar_drag_reschedule",
    label: "Calendar Drag Reschedule",
    description: "Move blog dates via calendar drag and drop.",
    group: "scheduling",
    configurable: true,
  },
  {
    key: "view_calendar",
    label: "View Calendar",
    description: "Access calendar view.",
    group: "scheduling",
    configurable: true,
  },
  {
    key: "view_actual_publish_calendar",
    label: "View Actual Publish Calendar",
    description: "Access real publish cadence calendar.",
    group: "scheduling",
    configurable: true,
  },
];

const COMMENTS_PERMISSIONS: PermissionDefinition[] = [
  {
    key: "create_comment",
    label: "Create Comment",
    description: "Add comment.",
    group: "comments_collaboration",
    configurable: true,
  },
  {
    key: "edit_own_comment",
    label: "Edit Own Comment",
    description: "Modify own comment.",
    group: "comments_collaboration",
    configurable: true,
  },
  {
    key: "delete_own_comment",
    label: "Delete Own Comment",
    description: "Remove own comment.",
    group: "comments_collaboration",
    configurable: true,
  },
  {
    key: "delete_any_comment",
    label: "Delete Any Comment",
    description: "Remove others' comments.",
    group: "comments_collaboration",
    configurable: true,
  },
  {
    key: "view_comment_history",
    label: "View Comment History",
    description: "View comment history.",
    group: "comments_collaboration",
    configurable: true,
  },
  {
    key: "mention_users",
    label: "Mention Users",
    description: "Mention users in comments.",
    group: "comments_collaboration",
    configurable: true,
  },
];

const ASSIGNMENT_PERMISSIONS: PermissionDefinition[] = [
  {
    key: "change_writer_assignment",
    label: "Change Writer Assignment",
    description: "Change blog writer.",
    group: "assignments_ownership",
    configurable: true,
  },
  {
    key: "change_publisher_assignment",
    label: "Change Publisher Assignment",
    description: "Change blog publisher.",
    group: "assignments_ownership",
    configurable: true,
  },
  {
    key: "bulk_reassign_blogs",
    label: "Bulk Reassign Blogs",
    description: "Reassign multiple blogs at once.",
    group: "assignments_ownership",
    configurable: true,
  },
  {
    key: "transfer_user_assignments",
    label: "Transfer User Assignments",
    description: "Transfer all assignments from one user to another.",
    group: "assignments_ownership",
    configurable: true,
  },
];

const DASHBOARD_PERMISSIONS: PermissionDefinition[] = [
  {
    key: "view_dashboard",
    label: "View Dashboard",
    description: "Access main dashboard.",
    group: "dashboard_analytics",
    configurable: true,
  },
  {
    key: "view_metrics",
    label: "View Metrics",
    description: "View operational metrics.",
    group: "dashboard_analytics",
    configurable: true,
  },
  {
    key: "view_more_metrics",
    label: "View More Metrics",
    description: "View advanced analytics.",
    group: "dashboard_analytics",
    configurable: true,
  },
  {
    key: "view_delay_metrics",
    label: "View Delay Metrics",
    description: "View publishing delay insights.",
    group: "dashboard_analytics",
    configurable: true,
  },
  {
    key: "view_pipeline_metrics",
    label: "View Pipeline Metrics",
    description: "View writing and publishing pipeline metrics.",
    group: "dashboard_analytics",
    configurable: true,
  },
  {
    key: "export_csv",
    label: "Export CSV",
    description: "Export data to CSV.",
    group: "dashboard_analytics",
    configurable: true,
  },
  {
    key: "export_selected_csv",
    label: "Export Selected CSV",
    description: "Export selected rows to CSV.",
    group: "dashboard_analytics",
    configurable: true,
  },
];

const BLOG_DATA_PERMISSIONS: PermissionDefinition[] = [
  {
    key: "edit_blog_description",
    label: "Edit Blog Description",
    description: "Edit description fields.",
    group: "blog_data_editing",
    configurable: true,
  },
  {
    key: "edit_tags",
    label: "Edit Tags",
    description: "Modify blog tags.",
    group: "blog_data_editing",
    configurable: true,
  },
  {
    key: "edit_blog_category",
    label: "Edit Blog Category",
    description: "Modify blog category.",
    group: "blog_data_editing",
    configurable: true,
  },
  {
    key: "edit_internal_notes",
    label: "Edit Internal Notes",
    description: "Modify internal notes.",
    group: "blog_data_editing",
    configurable: true,
  },
  {
    key: "edit_external_links",
    label: "Edit External Links",
    description: "Modify reference links.",
    group: "blog_data_editing",
    configurable: true,
  },
];

const CALENDAR_PERMISSIONS: PermissionDefinition[] = [
  {
    key: "view_month_calendar",
    label: "View Month Calendar",
    description: "View month calendar.",
    group: "calendar_management",
    configurable: true,
  },
  {
    key: "view_week_calendar",
    label: "View Week Calendar",
    description: "View week calendar.",
    group: "calendar_management",
    configurable: true,
  },
  {
    key: "view_unscheduled_blogs",
    label: "View Unscheduled Blogs",
    description: "View blogs without scheduled publish dates.",
    group: "calendar_management",
    configurable: true,
  },
  {
    key: "reschedule_via_calendar",
    label: "Reschedule via Calendar",
    description: "Reschedule blogs via drag and drop.",
    group: "calendar_management",
    configurable: true,
  },
];

const USER_MANAGEMENT_PERMISSIONS: PermissionDefinition[] = [
  {
    key: "manage_users",
    label: "Manage Users",
    description: "Create, deactivate, and manage users.",
    group: "user_management",
    configurable: false,
  },
  {
    key: "delete_user",
    label: "Delete User",
    description: "Permanently delete user accounts.",
    group: "user_management",
    configurable: false,
  },
  {
    key: "edit_user_profile",
    label: "Edit User Profile",
    description: "Modify user profile information.",
    group: "user_management",
    configurable: false,
  },
  {
    key: "assign_roles",
    label: "Assign Roles",
    description: "Change user roles.",
    group: "user_management",
    configurable: false,
  },
  {
    key: "manage_permissions",
    label: "Manage Permissions",
    description: "Configure permission matrix.",
    group: "user_management",
    configurable: false,
  },
  {
    key: "view_user_activity",
    label: "View User Activity",
    description: "View user activity logs.",
    group: "user_management",
    configurable: false,
  },
  {
    key: "impersonate_user",
    label: "Impersonate User",
    description: "Act as another user.",
    group: "user_management",
    configurable: false,
  },
];

const SYSTEM_ADMIN_PERMISSIONS: PermissionDefinition[] = [
  {
    key: "manage_integrations",
    label: "Manage Integrations",
    description: "Configure external integrations.",
    group: "system_administration",
    configurable: false,
  },
  {
    key: "manage_notifications",
    label: "Manage Notifications",
    description: "Control notification behavior.",
    group: "system_administration",
    configurable: false,
  },
  {
    key: "run_data_import",
    label: "Run Data Import",
    description: "Run legacy import process.",
    group: "system_administration",
    configurable: false,
  },
  {
    key: "view_system_logs",
    label: "View System Logs",
    description: "Access system logs.",
    group: "system_administration",
    configurable: false,
  },
  {
    key: "repair_workflow_state",
    label: "Repair Workflow State",
    description: "Repair workflow inconsistencies.",
    group: "system_administration",
    configurable: false,
  },
  {
    key: "manage_environment_settings",
    label: "Manage Environment Settings",
    description: "Configure system settings.",
    group: "system_administration",
    configurable: false,
  },
];

const WORKFLOW_OVERRIDE_PERMISSIONS: PermissionDefinition[] = [
  {
    key: "override_writer_status",
    label: "Override Writer Status",
    description: "Force change writing stage.",
    group: "workflow_overrides",
    configurable: false,
  },
  {
    key: "override_publisher_status",
    label: "Override Publisher Status",
    description: "Force change publishing stage.",
    group: "workflow_overrides",
    configurable: false,
  },
  {
    key: "edit_actual_publish_timestamp",
    label: "Edit Actual Publish Timestamp",
    description: "Modify actual publish timestamp.",
    group: "workflow_overrides",
    configurable: false,
  },
  {
    key: "force_publish",
    label: "Force Publish",
    description: "Publish without writing completion.",
    group: "workflow_overrides",
    configurable: false,
  },
];

export const PERMISSION_DEFINITIONS: PermissionDefinition[] = [
  ...BLOG_LIFECYCLE_PERMISSIONS,
  ...WRITING_STAGE_PERMISSIONS,
  ...PUBLISHING_STAGE_PERMISSIONS,
  ...SCHEDULING_PERMISSIONS,
  ...COMMENTS_PERMISSIONS,
  ...ASSIGNMENT_PERMISSIONS,
  ...DASHBOARD_PERMISSIONS,
  ...BLOG_DATA_PERMISSIONS,
  ...CALENDAR_PERMISSIONS,
  ...USER_MANAGEMENT_PERMISSIONS,
  ...SYSTEM_ADMIN_PERMISSIONS,
  ...WORKFLOW_OVERRIDE_PERMISSIONS,
];

export const PERMISSION_GROUP_LABELS: Record<PermissionGroup, string> = {
  blog_lifecycle: "Blog Lifecycle",
  writing_stage: "Writing Stage",
  publishing_stage: "Publishing Stage",
  scheduling: "Scheduling",
  comments_collaboration: "Comments & Collaboration",
  assignments_ownership: "Assignments & Ownership",
  dashboard_analytics: "Dashboard & Analytics",
  blog_data_editing: "Blog Data Editing",
  calendar_management: "Calendar Management",
  user_management: "User Management",
  system_administration: "System Administration",
  workflow_overrides: "Workflow Overrides",
};

export const ALL_PERMISSION_KEYS: CanonicalAppPermissionKey[] = PERMISSION_DEFINITIONS.map(
  (definition) => definition.key
);

export const CONFIGURABLE_PERMISSION_KEYS: CanonicalAppPermissionKey[] =
  PERMISSION_DEFINITIONS.filter((definition) => definition.configurable).map(
    (definition) => definition.key
  );

export const LOCKED_ADMIN_PERMISSION_KEYS: CanonicalAppPermissionKey[] = [
  "manage_users",
  "delete_user",
  "assign_roles",
  "manage_permissions",
  "delete_blog",
  "repair_workflow_state",
  "override_writer_status",
  "override_publisher_status",
  "edit_actual_publish_timestamp",
  "force_publish",
];

const PERMISSION_KEY_SET = new Set<CanonicalAppPermissionKey>(ALL_PERMISSION_KEYS);
const LOCKED_PERMISSION_SET = new Set<CanonicalAppPermissionKey>(
  LOCKED_ADMIN_PERMISSION_KEYS
);
const LEGACY_PERMISSION_KEY_SET = new Set<LegacyAppPermissionKey>(
  LEGACY_PERMISSION_KEYS
);

export const DEFAULT_ROLE_PERMISSION_TEMPLATES: Record<
  AppRole,
  CanonicalAppPermissionKey[]
> = {
  admin: [...ALL_PERMISSION_KEYS],
  writer: [
    "create_blog",
    "edit_blog_metadata",
    "edit_blog_title",
    "start_writing",
    "submit_draft",
    "request_revision",
    "edit_google_doc_link",
    "view_writing_queue",
    "edit_scheduled_publish_date",
    "calendar_drag_reschedule",
    "view_calendar",
    "create_comment",
    "edit_own_comment",
    "delete_own_comment",
    "mention_users",
    "view_dashboard",
    "view_metrics",
    "export_csv",
    // NEW: Ideas (3)
    "create_idea",
    "view_ideas",
    "edit_own_idea",
    // NEW: Social Posts (5)
    "create_social_post",
    "view_social_posts",
    "edit_social_post_brief",
    "transition_social_post",
    "add_social_post_link",
    // NEW: Visibility (3)
    "view_my_tasks",
    "view_notifications",
    "view_activity_history",
  ],
  publisher: [
    "edit_blog_metadata",
    "start_publishing",
    "complete_publishing",
    "edit_live_url",
    "upload_cover_image",
    "view_publishing_queue",
    "edit_scheduled_publish_date",
    "calendar_drag_reschedule",
    "view_calendar",
    "create_comment",
    "edit_own_comment",
    "delete_own_comment",
    "mention_users",
    "view_dashboard",
    "view_metrics",
    "export_csv",
    // NEW: Social Posts (4)
    "view_social_posts",
    "edit_social_post_brief",
    "transition_social_post",
    "add_social_post_link",
    // NEW: Visibility (3)
    "view_my_tasks",
    "view_notifications",
    "view_activity_history",
  ],
  editor: [
    "edit_blog_metadata",
    "edit_blog_title",
    "edit_blog_description",
    "request_revision",
    "create_comment",
    "edit_own_comment",
    "delete_own_comment",
    "mention_users",
    "view_calendar",
    "view_dashboard",
    "view_metrics",
    "export_csv",
    // NEW: Ideas (2)
    "view_ideas",
    "create_idea",
    // NEW: Visibility (3)
    "view_my_tasks",
    "view_notifications",
    "view_activity_history",
  ],
};

export function isCanonicalPermissionKey(
  value: string
): value is CanonicalAppPermissionKey {
  return PERMISSION_KEY_SET.has(value as CanonicalAppPermissionKey);
}

export function isAppPermissionKey(value: string): value is AppPermissionKey {
  return (
    isCanonicalPermissionKey(value) ||
    LEGACY_PERMISSION_KEY_SET.has(value as LegacyAppPermissionKey)
  );
}

export function toCanonicalPermissionKeys(
  permissionKey: string | AppPermissionKey
): CanonicalAppPermissionKey[] {
  if (isCanonicalPermissionKey(permissionKey)) {
    return [permissionKey];
  }
  if (LEGACY_PERMISSION_KEY_SET.has(permissionKey as LegacyAppPermissionKey)) {
    return LEGACY_PERMISSION_ALIAS_MAP[permissionKey as LegacyAppPermissionKey] ?? [];
  }
  return [];
}

export function isLockedAdminPermission(permissionKey: CanonicalAppPermissionKey) {
  return LOCKED_PERMISSION_SET.has(permissionKey);
}

export function getDefaultRolePermissions(
  role: AppRole
): CanonicalAppPermissionKey[] {
  return DEFAULT_ROLE_PERMISSION_TEMPLATES[role] ?? [];
}

export function isRolePermissionsSchemaMissingError(
  error: PostgrestLikeError | null | undefined
) {
  if (!error) {
    return false;
  }
  const code = (error.code ?? "").toUpperCase();
  const text = `${error.message ?? ""} ${error.details ?? ""} ${error.hint ?? ""}`.toLowerCase();
  return (
    (code === "42P01" || code === "PGRST205" || code === "PGRST204") &&
    (text.includes("role_permissions") || text.includes("schema cache"))
  );
}

export function normalizeRolePermissionRows(rows: unknown): RolePermissionRow[] {
  if (!Array.isArray(rows)) {
    return [];
  }

  const rowByKey = new Map<string, RolePermissionRow>();
  for (const candidate of rows) {
    if (!candidate || typeof candidate !== "object") {
      continue;
    }
    const row = candidate as Record<string, unknown>;
    const role = row.role;
    const rawPermissionKey = row.permission_key;
    const enabled = row.enabled;
    if (
      (role === "admin" ||
        role === "writer" ||
        role === "publisher" ||
        role === "editor") &&
      typeof rawPermissionKey === "string" &&
      typeof enabled === "boolean"
    ) {
      const canonicalPermissionKeys = toCanonicalPermissionKeys(rawPermissionKey);
      for (const canonicalPermissionKey of canonicalPermissionKeys) {
        rowByKey.set(`${role}:${canonicalPermissionKey}`, {
          role,
          permission_key: canonicalPermissionKey,
          enabled,
        });
      }
    }
  }

  return Array.from(rowByKey.values());
}

export function getRolePermissionState(
  role: AppRole,
  rolePermissionRows: RolePermissionRow[] = []
) {
  const state: Record<CanonicalAppPermissionKey, boolean> = Object.fromEntries(
    ALL_PERMISSION_KEYS.map((permissionKey) => [permissionKey, false])
  ) as Record<CanonicalAppPermissionKey, boolean>;

  if (role === "admin") {
    for (const permissionKey of ALL_PERMISSION_KEYS) {
      state[permissionKey] = true;
    }
    return state;
  }

  for (const permissionKey of getDefaultRolePermissions(role)) {
    if (isLockedAdminPermission(permissionKey)) {
      continue;
    }
    state[permissionKey] = true;
  }

  for (const row of rolePermissionRows) {
    if (row.role !== role) {
      continue;
    }
    if (isLockedAdminPermission(row.permission_key)) {
      continue;
    }
    state[row.permission_key] = row.enabled;
  }

  for (const lockedPermission of LOCKED_ADMIN_PERMISSION_KEYS) {
    state[lockedPermission] = false;
  }
  return state;
}

export function resolvePermissionsForRoles(
  roles: AppRole[],
  rolePermissionRows: RolePermissionRow[] = []
) {
  const resolved = new Set<AppPermissionKey>();

  if (roles.includes("admin")) {
    for (const permissionKey of ALL_PERMISSION_KEYS) {
      resolved.add(permissionKey);
    }
  } else {
    for (const role of roles) {
      const rolePermissionState = getRolePermissionState(role, rolePermissionRows);
      for (const permissionKey of ALL_PERMISSION_KEYS) {
        if (rolePermissionState[permissionKey]) {
          resolved.add(permissionKey);
        }
      }
    }
  }

  for (const legacyPermissionKey of LEGACY_PERMISSION_KEYS) {
    const aliases = LEGACY_PERMISSION_ALIAS_MAP[legacyPermissionKey];
    if (aliases.some((canonicalPermissionKey) => resolved.has(canonicalPermissionKey))) {
      resolved.add(legacyPermissionKey);
    }
  }

  return Array.from(resolved);
}

export function hasWorkflowOverridePermission(hasPermission: PermissionLookup) {
  return (
    hasPermission("repair_workflow_state") ||
    hasPermission("override_writer_status") ||
    hasPermission("override_publisher_status") ||
    hasPermission("edit_actual_publish_timestamp") ||
    hasPermission("force_publish")
  );
}

export function canTransitionWriterStatus(
  currentStatus: WriterStageStatus,
  nextStatus: WriterStageStatus,
  hasPermission: PermissionLookup
) {
  if (currentStatus === nextStatus) {
    return true;
  }
  if (
    hasPermission("repair_workflow_state") ||
    hasPermission("override_writer_status") ||
    hasPermission("edit_writer_status")
  ) {
    return true;
  }
  if (nextStatus === "in_progress") {
    return (
      (currentStatus === "not_started" && hasPermission("start_writing")) ||
      (currentStatus === "needs_revision" && hasPermission("start_writing"))
    );
  }
  if (nextStatus === "pending_review") {
    return currentStatus === "in_progress" && hasPermission("submit_draft");
  }
  if (nextStatus === "needs_revision") {
    return currentStatus === "pending_review" && hasPermission("request_revision");
  }
  if (nextStatus === "completed") {
    return currentStatus === "pending_review" && hasPermission("submit_draft");
  }
  return false;
}

export function canTransitionPublisherStatus(
  currentStatus: PublisherStageStatus,
  nextStatus: PublisherStageStatus,
  hasPermission: PermissionLookup
) {
  if (currentStatus === nextStatus) {
    return true;
  }
  if (
    hasPermission("repair_workflow_state") ||
    hasPermission("override_publisher_status") ||
    hasPermission("edit_publisher_status")
  ) {
    return true;
  }
  if (nextStatus === "in_progress") {
    return currentStatus === "not_started" && hasPermission("start_publishing");
  }
  if (nextStatus === "pending_review") {
    return currentStatus === "in_progress" && hasPermission("submit_draft");
  }
  if (nextStatus === "publisher_approved") {
    return currentStatus === "pending_review" && hasPermission("submit_draft");
  }
  if (nextStatus === "completed") {
    return (
      currentStatus === "publisher_approved" && hasPermission("complete_publishing")
    );
  }
  return false;
}

export function canAdvanceWriterStatus(blog: BlogRecord): {
  allowed: boolean;
  blockedReason?: string;
} {
  // Block if moving beyond "in_progress" without Google Doc
  if (!blog.google_doc_url && blog.writer_status !== "in_progress" && blog.writer_status !== "not_started") {
    return {
      allowed: false,
      blockedReason: "Google Doc link required to advance beyond writing stage",
    };
  }
  return { allowed: true };
}

export function canAdvancePublisherStatus(blog: BlogRecord): {
  allowed: boolean;
  blockedReason?: string;
} {
  // Block if moving to review stages without Google Doc
  if (!blog.google_doc_url && blog.publisher_status !== "not_started") {
    return {
      allowed: false,
      blockedReason: "Google Doc link required to advance publisher status",
    };
  }
  return { allowed: true };
}
