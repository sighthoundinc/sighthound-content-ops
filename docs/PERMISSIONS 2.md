# Permission System Documentation

## Overview

Sighthound Content Relay uses a comprehensive permission system with **92 total permissions** across 4 roles:
- **Admin**: All permissions (76 delegable + 9 admin-locked = 85 total)
- **Writer**: 28 permissions by default
- **Publisher**: 23 permissions by default
- **Editor**: 17 permissions by default

Permissions control what authenticated users can do within the application. They are enforced at three levels:
1. **Database (RLS)**: Row-level security policies
2. **API**: Endpoint-level permission checks
3. **UI**: Feature hiding/disabling based on permissions

## Permission Categories

### Blog Management (15 permissions)

**Creation & Editing**
- `create_blog` — Create new blog drafts
- `edit_blog_metadata` — Edit blog cover image, featured image, metadata
- `edit_blog_title` — Edit blog title
- `edit_blog_description` — Edit blog description
- `edit_tags` — Add/remove blog tags
- `edit_blog_category` — Set blog category
- `edit_internal_notes` — Add internal notes not visible to readers
- `edit_external_links` — Add external links and resources

**Archival**
- `archive_blog` — Archive blog to hidden state
- `restore_archived_blog` — Restore archived blog
- `view_archived_blogs` — View archived blog list
- `delete_blog` — Hard delete blogs (admin-locked)

**Operations**
- `duplicate_blog` — Create copy of blog

**Workflow Fields** (ownership-based, not permission-gated)
- `edit_google_doc_link` — Update Google Doc link (ownership enforced by RLS)

### Writing Workflow (6 permissions)

- `start_writing` — Begin writing stage
- `pause_writing` — Pause writing work
- `submit_draft` — Submit draft for review
- `request_revision` — Request writer revisions
- `edit_writer_status` — Manually set writer stage (admin-like)
- `view_writing_queue` — Access writer queue

### Publishing Workflow (6 permissions)

- `start_publishing` — Begin publishing stage
- `complete_publishing` — Mark blog as published
- `edit_publisher_status` — Manually set publisher stage (admin-like)
- `upload_cover_image` — Upload custom cover image
- `view_publishing_queue` — Access publisher queue
- `edit_live_url` — Submit published live URL (ownership enforced by RLS)

### Self-Assignment (2 permissions)

- `assign_writer_self` — Claim blog as writer
- `assign_publisher_self` — Claim blog as publisher

### Assignment Management (4 permissions)

- `change_writer_assignment` — Reassign blog to different writer
- `change_publisher_assignment` — Reassign blog to different publisher
- `bulk_reassign_blogs` — Bulk reassign multiple blogs
- `transfer_user_assignments` — Transfer all assignments when user leaves

### Scheduling & Dates (5 permissions)

**Calendar** (ownership-based, not permission-gated)
- `edit_scheduled_publish_date` — Set publish date (ownership enforced)
- `edit_display_publish_date` — Set display date (ownership enforced)

**Calendar Operations**
- `calendar_drag_reschedule` — Use drag-drop to reschedule
- `reschedule_via_calendar` — Reschedule from calendar view
- `view_actual_publish_calendar` — View actual publish calendar (admin tracking)

### Calendar Views (4 permissions)

- `view_calendar` — Access calendar (all types included)
- `view_month_calendar` — Month view on calendar
- `view_week_calendar` — Week view on calendar
- `view_unscheduled_blogs` — See unscheduled blogs section

### Comments & Collaboration (6 permissions)

- `create_comment` — Add comments to blogs
- `edit_own_comment` — Edit own comments
- `delete_own_comment` — Delete own comments
- `delete_any_comment` — Delete anyone's comments
- `view_comment_history` — See all historical versions of comments
- `mention_users` — Mention users with @mention

### Ideas Module (5 permissions) — NEW

- `create_idea` — Create new ideas for content
- `view_ideas` — View all ideas list and details
- `edit_own_idea` — Edit ideas created by self
- `edit_idea_description` — Update idea title/description
- `delete_idea` — Delete ideas (admin-locked)

### Social Posts Module (8 permissions) — NEW

- `create_social_post` — Create new social posts
- `view_social_posts` — View social posts list and details
- `view_social_post_details` — View full social post workflow details
- `edit_social_post_brief` — Edit brief fields (Product, Type, Canva, etc.)
- `reopen_social_post_brief` — Reopen brief after approval (admin-locked)
- `transition_social_post` — Move social post through workflow stages
- `add_social_post_link` — Add live links to published posts
- `delete_social_post` — Hard delete social posts (admin-locked)

### Dashboard & Reporting (7 permissions)

- `view_dashboard` — Access dashboard (required for all)
- `view_my_tasks` — View My Tasks page
- `view_metrics` — View basic metrics section
- `view_more_metrics` — View extended metrics
- `view_delay_metrics` — View delay/SLA metrics
- `view_pipeline_metrics` — View pipeline health metrics
- `export_csv` — Export visible data to CSV
- `export_selected_csv` — Export selected rows to CSV

### Visibility (3 permissions) — NEW

- `view_notifications` — Access notification bell and drawer
- `view_activity_history` — View record-level activity/change history
- `view_my_tasks` — View My Tasks page

### Admin Tools (8 permissions)

- `edit_user_profile` — Edit user profiles (admin)
- `view_user_activity` — View user login and activity logs
- `impersonate_user` — Assume identity of another user for debugging
- `manage_integrations` — Configure Slack, Google, and other integrations
- `manage_notifications` — Configure notification settings
- `run_data_import` — Execute blog/idea imports from CSV
- `view_system_logs` — Access application logs
- `manage_environment_settings` — Configure app-wide settings

### Admin-Only (9 permissions - Locked)

- `manage_users` — Create/delete users and manage accounts
- `assign_roles` — Assign roles to users
- `manage_permissions` — Customize permission matrices per role
- `repair_workflow_state` — Force workflow state changes (recovery)
- `override_writer_status` — Force writer stage transitions
- `override_publisher_status` — Force publisher stage transitions
- `edit_actual_publish_timestamp` — Set when blog actually published
- `force_publish` — Override publish validation
- `delete_blog` — Hard delete published blogs
- `reopen_social_post_brief` — Reopen brief fields after approval
- `delete_idea` — Delete ideas
- `delete_social_post` — Delete social posts

## Default Permission Matrix

### Writer Role (28 permissions)

✅ Blog: create, edit metadata/title, duplicate, archive, restore, view archived  
✅ Writing: start, pause, submit draft, request revision, view queue  
✅ Scheduling: edit scheduled date, edit display date, calendar drag, view calendar  
✅ Ideas: create, view, edit own, edit description  
✅ Social Posts: create, view, edit brief, transition, add links  
✅ Collaboration: create comment, edit own, delete own, mention users  
✅ Dashboard: view dashboard, view my tasks, view notifications, view activity, view metrics, export CSV  

### Publisher Role (23 permissions)

✅ Blog: edit metadata  
✅ Publishing: start, complete, upload cover, view queue, edit publisher status  
✅ Scheduling: edit scheduled date, edit display date, calendar drag, view calendar  
✅ Social Posts: view, edit brief, transition, add links  
✅ Collaboration: create comment, edit own, delete own, mention users  
✅ Dashboard: view dashboard, view my tasks, view notifications, view activity, view metrics, export CSV  

### Editor Role (17 permissions)

✅ Blog: edit metadata, edit title, edit description  
✅ Collaboration: create comment, edit own, delete own, mention users  
✅ Ideas: view, create  
✅ Workflow: request revision  
✅ Calendar: view calendar, view month, view week  
✅ Dashboard: view dashboard, view my tasks, view notifications, view activity, view metrics, export CSV  

### Admin Role

✅ All 92 permissions including admin-locked operations

## Permission Enforcement Patterns

### Pattern 1: Explicit Permission Gates
Some features require explicit permission checks (UI-level guard):
```typescript
if (!hasPermission('view_dashboard')) {
  return <AccessDenied />;
}
```

### Pattern 2: Ownership-Based Control (RLS)
Workflow-critical fields are controlled by database ownership, not explicit permissions:
- **Google Doc Link**: Writer owns editing (via `blogs.writer_id`)
- **Live URL**: Publisher owns editing (via `blogs.publisher_id`)
- **Scheduled/Display Dates**: Assigned owner controls (writer or publisher)
- **Task assignments**: All authenticated users can READ; assigned user can UPDATE

This is more flexible than strict permissions since assigned users always need to edit critical workflow fields.

### Pattern 3: Role-Based Capabilities
Some capabilities are tied to assigned role in workflow (not separate permission):
- `edit_writer_status` allows manual override of writer stage
- `edit_publisher_status` allows manual override of publisher stage
- Only admins and editors can use these

## Using Permissions in Code

### Frontend Permission Check
```typescript
import { hasPermission } from '@/lib/permissions';

if (hasPermission('create_blog')) {
  // Show create button
}
```

### API Endpoint Protection
```typescript
export async function POST(req: NextRequest) {
  const user = await getUser();
  if (!user || !hasPermission('create_blog')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  // Process creation
}
```

### Database RLS Policy
```sql
-- Users can create blogs only if they have create_blog permission
create policy "users_can_create_blogs"
on public.blogs for insert
with check (
  auth.uid() is not null
  and public.has_permission('create_blog')
);
```

## Adding New Permissions

When adding a new feature that needs permission control:

1. **Add permission key** to `permission_keys()` function in migration
2. **Update `default_role_permissions()`** with appropriate role access
3. **Lock with admin** in `locked_admin_permission_keys()` if needed
4. **Add RLS policy** enforcing the permission
5. **Add UI check** where permission should be verified
6. **Document in AGENTS.md** and this file

## Backward Compatibility

The permission system maintains backward compatibility:
- Existing permission customizations are preserved when new permissions are added
- New permissions default to `enabled` for granted roles, `disabled` for others
- No existing rows are deleted or changed unexpectedly

## Admin Permission Customization

Admins can customize permissions per role via the Settings page:
- Toggle individual permissions on/off per role
- Admin-locked permissions cannot be disabled for non-admin roles
- Changes are logged in `permission_audit_logs` table

## Common Permission Scenarios

**"User should see dashboard but not create blogs"**
→ Grant: `view_dashboard`  
→ Deny: `create_blog`, `edit_blog_metadata`, etc.

**"User should only edit their own blogs"**
→ Grant: `edit_blog_metadata`, `edit_blog_title`, dates (via ownership)  
→ Deny: `change_writer_assignment`, `bulk_reassign_blogs`

**"User is reviewer, not executor"**
→ Grant: `edit_blog_description`, `request_revision`, `view_dashboard`  
→ Deny: `start_writing`, `submit_draft`, `start_publishing`

**"User manages integrations but cannot override workflows"**
→ Grant: `manage_integrations`, `manage_notifications`  
→ Deny: `override_writer_status`, `override_publisher_status`, `repair_workflow_state`

## See Also

- `AGENTS.md` — System architecture and invariants
- `SPECIFICATION.md` — Feature specifications and workflows
- `src/lib/permissions.ts` — Permission checking utilities
- `src/lib/has_permission()` — Database RLS function
