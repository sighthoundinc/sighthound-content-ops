# Permission System

Last reviewed: 2026-11-25. The source of truth is `src/lib/permissions.ts` (`PERMISSION_DEFINITIONS`, `DEFAULT_ROLE_PERMISSION_TEMPLATES`, `LOCKED_ADMIN_PERMISSION_KEYS`). If this file and the code disagree, the code wins; fix this file.

For the plain-language version shown to users, see "Roles and what each can do" in `HOW_TO_USE_APP.md`.

## Roles

| Role | Purpose | Combinable |
|---|---|---|
| admin | Everything, including users, roles, assignments, settings and overrides | Yes |
| writer | Creates blogs, ideas and social posts; moves their own writing stage | Yes |
| publisher | Moves their own publishing stage | Yes |
| editor | Reviews other people's work; can be a social post reviewer | Yes |
| viewer | Read-only | No, never combined with another role |

- A user's roles live in `profiles.user_roles` (with `profiles.role` as the primary). `getUserRoles()` in `src/lib/roles.ts` resolves them; permissions are the union across roles.
- Admin always resolves to every permission.
- Viewer is exclusive (`isValidRoleSet()`), cannot be self-assigned, and has a fixed permission set that no toggle can change.

## Rules that are not simple toggles

### Blog stages
Implemented in `canTransitionWriterStatus()` / `canTransitionPublisherStatus()`; both take the acting user and the stage owner.

| Move | Permission | Who |
|---|---|---|
| Writing: start, or resume after revision | `start_writing` | Assigned writer |
| Writing: send for review | `submit_draft` | Assigned writer |
| Writing: approve or send back | `request_revision` | Anyone except the assigned writer |
| Publishing: start | `start_publishing` | Assigned publisher |
| Publishing: send for review | `submit_publishing` | Assigned publisher |
| Publishing: approve | `request_revision` | Anyone except the assigned publisher |
| Publishing: mark published | `complete_publishing` | Assigned publisher |

`edit_writer_status`, `edit_publisher_status`, `override_writer_status`, `override_publisher_status` and `repair_workflow_state` bypass both the permission and the ownership check. Only admins hold them by default.

Assigning yourself and starting in the same save is allowed. Assigning someone else needs `change_writer_assignment` / `change_publisher_assignment`.

### Social posts
Ownership, not toggles:
- The person assigned at the current stage (worker or reviewer), or an admin, moves the post.
- Only admins change assignments or reopen a brief.
- Brief fields are locked in Ready to Publish and Awaiting Live Link for everyone.
- `create_social_post` is required to create one; the chosen reviewer must hold `review_social_post`.

### Ideas
- Creating needs `create_idea`. Editing is limited to the creator or an admin. Deleting is admin-only.

### Viewer
- API: `authenticateRequest()` rejects every non-GET request from a viewer-only account.
- Database: `public.is_view_only()` plus the restrictive "Viewers cannot insert / update / delete" policies.
- UI: create, edit, delete, comment and link-save controls are hidden.
- Making someone a viewer hands their unfinished blogs and active social posts to the admin who made the change (`/api/users/profile`).

## Where rules are enforced

| Layer | What it does |
|---|---|
| UI | Hides or disables controls. Convenience only, never the security boundary. |
| API routes | `authenticateRequest()` / `requirePermission()` in `src/lib/server-permissions.ts`. Routes write with the service role, which bypasses database policies, so every route must check for itself. |
| Database | `has_permission()`, the blog insert/update triggers, `can_transition_*`, `blogs_enforce_stage_ownership`, the social post workflow triggers, and row-level policies. This covers the pages that write straight from the browser (dashboard inline and bulk edits, board moves, calendar drag, social post brief and links, ideas). |

The same rule usually exists twice: once in TypeScript (API and UI) and once in SQL (browser writes). Change both together.

Production policies are not identical to the migration files: some older policies were never dropped. Read `pg_policies` before relying on the files. One of these is intentional: "Blogs updatable by ops roles" lets a reviewer save a blog they are not assigned to; the triggers decide which fields they may change.

The MCP connector runs as an admin through the same API checks.

## Permission keys (58)

Type: **toggle** = editable per role in Settings → Permissions; **locked** = admin only, never delegable; **fixed** = not shown as a toggle.

### Blogs
| Key | Type | Default roles |
|---|---|---|
| `create_blog` | toggle | writer |
| `edit_blog_metadata` | toggle | writer, publisher, editor |
| `edit_blog_title` | toggle | writer, editor |
| `archive_blog` | toggle | admin only |
| `restore_archived_blog` | toggle | admin only |
| `delete_blog` | locked | admin |
| `view_archived_blogs` | fixed | admin only (checked by the MCP connector) |

### Writing stage
| Key | Type | Default roles |
|---|---|---|
| `start_writing` | toggle | writer |
| `submit_draft` | toggle | writer |
| `request_revision` (review blog stages) | toggle | editor |
| `edit_writer_status` | toggle | admin only |
| `edit_google_doc_link` | toggle | writer (stage owners can always edit) |
| `view_writing_queue` | toggle | writer |

### Publishing stage
| Key | Type | Default roles |
|---|---|---|
| `start_publishing` | toggle | publisher |
| `submit_publishing` | toggle | publisher |
| `complete_publishing` | toggle | publisher |
| `edit_publisher_status` | toggle | admin only |
| `edit_live_url` | toggle | publisher (stage owners can always edit) |
| `view_publishing_queue` | toggle | publisher |

### Scheduling and calendar
| Key | Type | Default roles |
|---|---|---|
| `edit_scheduled_publish_date` | toggle | writer, publisher (stage owners can always edit) |
| `edit_display_publish_date` | toggle | admin only (stage owners can always edit) |
| `calendar_drag_reschedule` | toggle | writer, publisher |
| `reschedule_via_calendar` | toggle | admin only |
| `view_calendar` | toggle | writer, publisher, editor, viewer |

### Comments
| Key | Type | Default roles |
|---|---|---|
| `create_comment` | toggle | writer, publisher, editor |
| `edit_own_comment` | toggle | writer, publisher, editor |
| `delete_own_comment` | toggle | writer, publisher, editor |
| `delete_any_comment` | toggle | admin only |

### Assignments
| Key | Type | Default roles |
|---|---|---|
| `change_writer_assignment` | toggle | admin only |
| `change_publisher_assignment` | toggle | admin only |
| `bulk_reassign_blogs` | toggle | admin only |
| `transfer_user_assignments` | toggle | admin only |

### Ideas and social posts
| Key | Type | Default roles |
|---|---|---|
| `create_idea` | toggle | writer, editor |
| `view_ideas` | toggle | writer, editor, viewer |
| `edit_own_idea` | fixed | writer (checked by the MCP connector) |
| `delete_idea` | locked | admin |
| `create_social_post` | toggle | writer |
| `view_social_posts` | toggle | writer, publisher, viewer |
| `review_social_post` | toggle | editor |
| `edit_social_post_brief` | fixed | writer, publisher (checked by the MCP connector) |
| `add_social_post_link` | fixed | writer, publisher (checked by the MCP connector) |
| `reopen_social_post_brief` | locked | admin |
| `delete_social_post` | locked | admin |

### Dashboard and tasks
| Key | Type | Default roles |
|---|---|---|
| `view_dashboard` | toggle | writer, publisher, editor, viewer |
| `view_my_tasks` | toggle | writer, publisher, editor, viewer |
| `export_csv` | toggle | writer, publisher, editor |
| `export_selected_csv` | toggle | admin only |

### Administration
| Key | Type | Default roles |
|---|---|---|
| `manage_users` | locked | admin |
| `assign_roles` | locked | admin |
| `manage_permissions` | locked | admin |
| `manage_environment_settings` | locked | admin |
| `repair_workflow_state` | locked | admin |
| `override_writer_status` | locked | admin |
| `override_publisher_status` | locked | admin |
| `edit_actual_publish_timestamp` | locked | admin |
| `force_publish` | locked | admin |
| `run_data_import` | fixed | admin |
| `view_system_logs` | fixed | admin |

## How an admin changes permissions

- **Per role:** Settings → Permissions. Toggles apply to writer, publisher and editor; there is a reset-to-defaults button and a change log (`permission_audit_logs`). Stored in `role_permissions`.
- **Per user:** assign roles in Settings. There are no per-user overrides.
- Production stores an explicit row for every role and toggle, so changing a default in code does not change production until the matching `role_permissions` rows are updated in a migration.

## Adding or changing a permission

1. Decide where it is enforced first. Do not add a key that nothing checks: 30 such keys were removed on 2026-11-25.
2. Add it to `PERMISSION_DEFINITIONS`, the `CanonicalAppPermissionKey` type, and the role defaults in `src/lib/permissions.ts`.
3. Check it in the API route, and in the UI for visibility.
4. If the browser writes that table directly, add the same rule in SQL: add the key to `public.permission_keys()` and `public.default_role_permissions()`, enforce it in a trigger or policy, and insert the `role_permissions` rows.
5. Write the migration as an additive, re-runnable file. Migrations are applied by hand in the Supabase SQL editor; `supabase db push` is not used.
6. Add or extend a Jest test (`tests/blog-stage-rules.test.ts`, `tests/viewer-role.test.ts`) and update this file and the user manual if users will notice.

## Known gaps

- Reviewer pickers on social posts are not filtered by `review_social_post`; an ineligible choice is rejected with an error on create.
- Ask AI does not accept the viewer role.
- The SQL lists (`permission_keys()`, `default_role_permissions()`) still contain the removed keys. They are harmless there but are not the source of truth.
- Legacy key aliases (`LEGACY_PERMISSION_KEYS`) are still resolved for old stored rows.

## See also

- `AGENTS.md`: "Permissions Enforcement" and "Permission System"
- `HOW_TO_USE_APP.md`: user-facing roles section
- `supabase/migrations/20261125130000`, `20261125130100`, `20261125140000`: viewer role and stage rules
