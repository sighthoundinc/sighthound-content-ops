# Project Rules

Use Deft as the rules framework for this repository.

Primary entrypoint:
- See `deft/main.md`

Apply Deft lazily based on task type (language/tool/interface) and follow the layered precedence defined by Deft.

Project-specific Deft files:
- `deft/PROJECT.md`
- `deft/SPECIFICATION.md`

## Rule Conflict Resolution (MUST)

If instructions appear to conflict, resolve in this order:

1. Direct task-specific user instruction for the current request.
2. Project-specific Deft rules and specifications (`deft/main.md`, `deft/PROJECT.md`, `deft/SPECIFICATION.md`).
3. This file (`AGENTS.md`) invariants.
4. Default implementation preferences.

When still ambiguous, choose the option that maximizes predictability, accessibility, and cross-page consistency.

## Change Intelligence Protocol (MUST)

For every non-trivial UI or workflow change:

1. **Reuse Before New**: Prefer extending shared components/patterns over introducing page-specific behavior.
2. **Single Source of Truth**: Keep labels, statuses, and transition logic centralized; avoid duplicating mappings in components.
3. **Explicit State UX**: Every state transition should produce a clear user-facing signal (label, badge, message, disabled state, or next action).
4. **Predictable Interactions**: Keep interaction patterns consistent across pages (ordering, placement, close-on-blur behavior, sorting behavior, and feedback positioning).
5. **Accessibility by Default**: Ensure keyboard navigation, visible focus states, and correct ARIA semantics for changed controls.
6. **Safe Evolution**: Do not change enum keys, persisted values, or API contracts unless explicitly required.

## Iconography Standard (MUST)

1. Emoji-based icons are not allowed for UI controls, status markers, or notifications.
2. Use the shared open-source icon system (`lucide-react`) via `src/lib/icons.tsx`.
3. Render icons through `AppIcon` and shared `AppIconName` keys instead of ad-hoc inline glyphs.
4. Keep icons inside explicit bounding boxes to preserve vertical rhythm and cross-table alignment.
5. Maintain consistent stroke weight and sizing patterns unless a component has a documented exception.

## Timezone and Date Display (MUST)

1. All date/time/timestamp UI in the app must display using the logged-in user's `profiles.timezone`.
2. Default fallback timezone is `America/New_York` when no user timezone is set.
3. Do not rely on system/browser timezone for user-facing timestamps.
4. Use centralized timezone-aware formatters (`src/lib/format-date.ts`) for rendering date/time values.
5. Apply this rule consistently across tables, badges, detail pages, history timelines, comments, notifications, and any date/time UI.

## State & Workflow Authority (MUST)

1. Database is the source of truth for all statuses and transitions.
2. Frontend must not allow invalid transitions (enforced via API + DB constraints).
3. Derived states (for example overall stage) are read-only and must not be manually editable.
4. Any new status or transition requires:
   - DB constraint update
   - API validation update
   - UI update (badges, filters, labels, next-action cues)
   - Documentation update

## Permissions Enforcement (MUST)

1. Supabase RLS is the source of truth for authorization.
2. Frontend permission checks are UX-only and never a security boundary.
3. Every feature must define who can view, edit, and perform privileged actions (create/delete/import/publish).
4. No feature ships without RLS coverage.

## Forms & Input Behavior (MUST)

1. All inputs expose clear validation states (error, success/valid, disabled, loading).
2. Required fields are enforced at both UI and API levels.
3. Use consistent patterns for date inputs, URL validation, and select/dropdown behavior.
4. Show inline errors near fields (toasts can supplement but not replace inline errors).
5. Never allow silent submit failure; preserve user input and provide actionable errors.

## Feedback & System Status (MUST)

1. Every action must produce visible feedback:
   - Success → confirmation
   - Error → actionable error message
   - Loading → explicit loading/disabled state
2. Long-running actions (imports, saves, scheduling) must show progress or blocking state.
3. No action should feel uncertain or silent.

## Error Handling (MUST)

1. All errors must be:
   - Human-readable
   - Actionable (what went wrong + what to do next)
2. Categorize errors:
   - Validation errors (inline)
   - System errors (toast + fallback message)
   - Permission errors (clear access message)
3. Never expose raw system errors or stack traces to users.
4. Failed actions must not leave UI in inconsistent state.

## Data Mutation Safety (MUST)

1. All mutations must be:
   - Atomic (succeed fully or fail cleanly)
   - Validated before execution
2. Bulk actions must:
   - Show preview or confirmation
   - Provide success/failure breakdown
3. Destructive actions must require confirmation.
4. No partial silent updates.

## Documentation Update Rule (MUST)

After any feature or behavior change (when applicable):

1. Update:
   - `AGENTS.md` (if rules/invariants changed)
   - `HOW_TO_USE_APP.md` (user-facing behavior)
   - `OPERATIONS.md` (internal workflows)
   - `SPECIFICATION.md` (technical logic/behavior)
   - `README.md` (setup/scope/usage changes)
   - Any other directly impacted docs
2. Document:
   - What changed
   - Why it changed
   - Constraints/edge cases
3. Definition of done: implementation is incomplete until docs reflect reality.

## Change Risk Classification (SHOULD)

All changes should be categorized before implementation:

- **Low Risk**: UI-only, no data or permission impact.
- **Medium Risk**: Affects workflows, validation, or UX behavior.
- **High Risk**: Affects DB schema, permissions (RLS), or core logic.

Requirements:
- **Medium** → requires manual testing.
- **High** → requires test plan + rollback consideration.

## Delivery Quality Gate (MUST)

Before considering a task complete:

1. Run relevant validation steps (lint/typecheck/tests/build) when available; if not run, state exactly why.
2. Verify affected UX surfaces for consistency with existing global patterns and invariants in this file.
3. Confirm documentation updates from the rule above are applied when applicable.
4. Prefer small, reversible changes over broad rewrites unless the task explicitly requires larger refactoring.
5. Apply risk-based validation from **Change Risk Classification** where applicable.
6. **After API changes that reference profile columns or data shapes**: Run database migrations (`supabase db push --yes`) to ensure schema alignment and prevent runtime errors like "column profiles.X does not exist".

## Git Commits (MUST)

Keep commit messages short and direct:

1. **Format**: `type(scope): short description` (max 50 chars)
   - Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`, `perf`
   - Examples:
     - `feat: add daily standup home page`
     - `fix: filter publisher queue by assignment`
     - `docs: update SPECIFICATION.md`
2. **Rationale**: Short messages force clarity and are easier to scan in logs
3. **Body**: Only include detailed explanations if truly necessary (most changes don't need them)
4. **Multi-file changes**: Use a single, consolidated commit message covering the whole feature
5. **Always ask before committing**: Never automatically commit and push without explicit user approval. Summarize changes, show the proposed commit message, and wait for confirmation before proceeding.

## Definition of Done (MUST)

A feature is complete only if:

1. DB schema/constraints are updated as needed.
2. API enforces validation and permissions.
3. UI reflects correct state, feedback, and next actions.
4. RLS policies are implemented for access control changes.
5. Edge cases are handled (errors, empty states, loading states).
6. Documentation is updated per the documentation rule.

## Admin Password Reset (TEST-ONLY) (MUST)

**Important**: This feature is temporary and for testing purposes only. It must be removed before production deployment.

- **Location**: Settings page → Edit User modal → "Reset Password (Test Only)" section
- **Permission**: Requires `manage_users` permission (admin-only)
- **Behavior**: Admins can manually set passwords for any user (admin or non-admin)
- **UI**: Password reset button in edit user modal opens confirmation dialog with password input
- **API**: `PATCH /api/admin/users/[userId]/password` validates password (min 8 chars) and uses Supabase admin auth to update
- **Security**: Protected by standard permission checks; intended for testing only
- **Removal**: Delete before go-live; flag for removal in code review

## UI Table Layout Invariants (MUST)

To prevent pagination breakage, pagination control misalignment, and unpredictable row height growth:

1. **Fixed Row Heights**: Keep all table rows at stable/fixed visual height per density mode (compact/comfortable). Long content must NOT expand rows.
2. **Single-Line Truncation**: Truncate long text in table cells (titles, names, descriptions) to a single line with ellipsis (`truncate`). Always include full value via `title` attribute for tooltip on hover.
3. **Overflow Constraints**: Apply `overflow-hidden` + explicit `max-width`/`width` constraints to cells containing long content to enforce hard layout limits.
4. **Pagination Boundary**: Keep pagination controls (row limit, page controls) structurally outside the table body. Controls must never render between table rows or appear to be pushed by row expansion.

These rules apply to all table implementations (DataTable, DashboardTable, etc.) across the application.

## Table Interaction Rules (MUST)

1. Row click behavior should be consistent per table type (open detail panel or navigate).
2. Bulk actions apply only to selected rows.
3. Sorting and filtering persist within session.

## Search Behavior (MUST)

1. Search supports partial, case-insensitive matching.
2. Results should update in near real-time with debounced input where appropriate.
3. Show meaningful empty-state feedback when no results are found.

## Ideas Page Interaction Invariants (MUST)

To keep idea intake predictable and avoid split editing patterns:

1. **Comments & References Visibility**: Comments and references remain visible by default on each idea card.
2. **No Inline Editing in Idea Cards**: Do not provide inline comment/reference editing or add-comment controls inside the card body.
3. **Single Edit Path**: Update idea title/site/comments-references through the **Edit Idea** modal only.
4. **Conversion Options**: Idea cards provide conversion actions for both blogs and social posts.

## Global Feedback System: Alerts vs Notifications (MUST)

**Split system** separates ephemeral action feedback from persistent workflow events.

### Alerts (`useAlerts`)
- **Purpose**: Transient system feedback (Saved, Done, errors)
- **Placement**: Bottom-left fixed corner
- **Lifecycle**: Auto-dismiss 3–5s (persistent on errors)
- **No persistence** across sessions
- **Icons**: lucide-react via `AppIcon` (no emoji)
- **Trigger**: Direct API calls (save, delete, import, copy)
- **Provider**: `AlertsProvider` in root layout
- **Global Duration Cap (MUST)**: No toast, regardless of type, can display longer than 5 seconds. All alerts auto-dismiss within 5000ms max, even if status updates are forgotten or network latency delays completion. This prevents orphaned "Updating.." toasts from cluttering the sidebar indefinitely.

### Notifications (`useNotifications`)
- **Purpose**: Persistent workflow state changes (assignments, submissions, publications, status transitions)
- **Placement**: Bell icon (top-right) with unread count badge
- **Lifecycle**: Persistent until explicitly marked as read or cleared
- **Visible in bell drawer** with titles, messages, timestamps, and links to context
- **Types**: `task_assigned`, `stage_changed`, `awaiting_action`, `mention`, `submitted_for_review`, `published`, `assignment_changed`
- **Icons**: lucide-react via `AppIcon` (no emoji)
- **Trigger**: Workflow mutations (blog status changes, task assignments, submissions, publications)
- **Provider**: `NotificationsProvider` in root layout

### Notification Preferences Enforcement (MUST)

**Automatic enforcement at emission point** ensures all notifications respect user preferences without requiring code changes throughout the codebase.

#### Architecture
- **Single Source of Truth**: `shouldSendNotification()` in `src/lib/notification-helpers.ts` enforces preferences
- **Enforcement Point**: `pushNotification()` in `src/providers/notifications-provider.tsx` checks preferences before emitting
- **Automatic Coverage**: All existing and future notification calls are automatically filtered
- **Session-Level Caching**: Preferences cached per request via `getUserNotificationPreferencesWithCache()` to avoid N+1 DB queries
- **Slack Integration**: `notifySlack()` respects preferences and treats Slack as optional delivery channel (failures don't propagate to in-app notifications)

#### User Preferences
- **Global Toggle**: `notifications_enabled` (master switch to disable all notifications)
- **7 Notification Types**: Individual toggles for each notification category
- **UI Location**: Settings → Notification Preferences
- **Database**: `notification_preferences` table with RLS policies
- **Auto-Provisioning**: New users get default preferences via trigger

#### Database Schema
- Table: `notification_preferences` in public schema
- Columns: `user_id` (FK to auth.users), `notifications_enabled`, 7 type toggles, timestamps
- RLS: Users see/edit only own preferences; admins can audit all
- Trigger: Auto-creates preferences for new auth users

#### API Endpoints
- `GET /api/users/notification-preferences` — Fetch current user's preferences
- `PATCH /api/users/notification-preferences` — Update preferences and invalidate cache

#### Implementation Details
- **Preference Check**: Called synchronously in `pushNotification()` before notification added to queue
- **Failure Handling**: Preferences failures are logged but don't block notifications (fail-open)
- **Backward Compatibility**: Defaults to all-enabled if preferences don't exist
- **Cache Invalidation**: Called on PATCH to ensure subsequent emissions use fresh data

### Implementation
- **No emoji icons**: All feedback uses `AppIcon` from `src/lib/icons.tsx`
- **Backward compat**: Old `useSystemFeedback()` calls re-routed to `useAlerts()` via wrapper
- **Helper functions**: `src/lib/notification-helpers.ts` generates typed notification payloads
- **Blog workflows**: Status changes in `/blogs/[id]/page.tsx` emit notifications via `pushNotification()`

### Adding New Notifications
1. Define helper in `src/lib/notification-helpers.ts` returning `NotificationInput`
2. Call `pushNotification(helper(...))` in mutation handler
3. Update SPECIFICATION.md and this guide with trigger point documentation

### Notification Types & Trigger Points

**Existing Types**:
- `task_assigned` — User is assigned a new blog (writer or publisher role)
- `stage_changed` — Blog writer/publisher status transitions (e.g., In Progress → Pending Review)
- `awaiting_action` — Blog needs revision or is awaiting review
- `mention` — User is mentioned in a comment

**New Activity Types** (user-centric actions):
- `submitted_for_review` — Writer/Publisher submits a blog for review (transitions to `pending_review`)
  - **Example**: "Blog A submitted by Writer B" (triggered on writer status → pending_review)
  - **Example**: "Blog C submitted by Publisher D" (triggered on publisher status → pending_review)
- `published` — Blog is published live (publisher status transitions to `completed`)
  - **Example**: "Blog E published by Publisher F"
- `assignment_changed` — Blog writer/publisher assignment changes (via details form)
  - **Example**: "Blog G reassigned to Writer H as Writer by Admin I"
  - **Example**: "Blog J reassigned to Publisher K as Publisher by Admin L"

**Trigger Sources**:
- **Blog Detail Page** (`/blogs/[id]/page.tsx`):
  - `handleDetailsSave()`: Emits `assignment_changed` for writer/publisher assignment changes
  - `handleWriterSave()`: Emits `stage_changed` + `submitted_for_review` on writer status changes (especially pending_review)
  - `handlePublisherSave()`: Emits `stage_changed` + `submitted_for_review` on publisher pending_review, + `published` on completion

### Activity History Feed

In addition to real-time notifications, the bell drawer displays a unified activity feed from multiple content types. This provides users with a complete audit trail across all major content:

- **Source**: `/api/activity-feed` endpoint fetches the 50 most recent activities from:
  - `blog_assignment_history` table (blog activities)
  - `social_post_activity_history` table (social post activities)
- **Displayed in**: Bell drawer under "Recent Activity" section, separate from real-time notifications
- **Content types**: Blogs and Social Posts (with icons to distinguish them)
- **Data includes**: Status transitions, assignment changes, field updates with old/new values
- **Format**: Event type (e.g., "writer_status_changed"), content title, actor name, and relative timestamp
- **Click behavior**: Clicking a blog activity navigates to `/blogs/[id]`; clicking a social post activity navigates to `/social-posts/[id]`
- **Load trigger**: Activity feed is fetched when the notification panel opens
- **Display limit**: Shows up to 10 most recent activities merged from all sources; full history available via "View History" link
- **Sorting**: Activities are merged and sorted by timestamp (most recent first) across all content types

## Activity History Filtering (Multi-Select) (MUST)

**Admin-only feature** for reviewing unified activity records across the application.

### Location
- UI: `/settings/access-logs` (page title: "Activity History")
- API: `GET /api/admin/activity-history`

### Activity Types Supported
- `login` — User sign-in events
- `dashboard_visit` — Dashboard page visits
- `blog_writer_status_changed` — Blog writer workflow transitions
- `blog_publisher_status_changed` — Blog publisher workflow transitions
- `blog_assignment_changed` — Blog writer/publisher assignment changes
- `social_post_status_changed` — Social post workflow transitions
- `social_post_assignment_changed` — Social post assignment changes

### Multi-Select Filtering
- **Activity Type Filter**: Checkboxes for selecting multiple activity types (independent toggle per type)
- **User Filter**: Checkboxes for selecting multiple users (independent toggle per user)
- **Default Selection**: All activity types selected on page load (users: none selected)
- **Behavior**: Filters apply as union (OR) within each category and intersection (AND) across categories

### Table Display
- **Columns**: Category (login/dashboard/blog/social), Action (event description), Content (title or "—" for access logs), User, Email, Timestamp
- **Content links**: Blog activities link to blog detail page; social post activities link to social post page
- **Access log content**: Shows "—" (em-dash) instead of content title
- **Timestamps**: Formatted per user's timezone setting (admins default to UTC for consistency)

### API Response Structure
Endpoint returns:
- `activities`: Array of unified activity records
- `total`: Total count for pagination
- `activityTypeLabels`: Map of activity type → human-readable label
- `activityTypeCategories`: Map of activity type → category (Login/Dashboard/Blog Activity/Social Post Activity)

### Implementation Details
- **Query params**: `?activity_types=type1,type2&user_ids=user1,user2&limit=100&offset=0`
- **Data sources**: Merges `access_logs`, `blog_assignment_history`, `social_post_activity_history` tables
- **Sort order**: Most recent activities first (timestamp descending)
- **RLS enforcement**: Admin role required; non-admins cannot access this endpoint

## User Preferences (MUST)

**Settings**: Per-user columns in `profiles`
- `timezone` (default: `America/New_York`) — all date/time display
- `week_start` (default: 1 = Monday) — calendar views
- `stale_draft_days` (default: 10) — dashboard draft flagging

**Editable by**: All users (self) + admins (for any user)
**API endpoint**: `PATCH /api/users/profile` with `timezone`, `weekStart`, `staleDraftDays`
**UI**: Settings → My Profile
**Scope**: Per-user, not global

## Social Post Dedicated Editor Workflow (MUST)
The dedicated editor at `/social-posts/[id]` follows a guided 4-step flow:
1. **Setup** — Post Title, Platform(s), Publish Date, Canva Link/Page, Product, Type.
2. **Link Context (optional)** — Associated Blog search + linked blog actions.
3. **Write Caption** — UTF-8 editor focus with formatting tools and grouped copy actions.
4. **Review & Publish** — Checklist validation, role-aware transition controls, live-link URL entry, and stage-based final CTA labels.

Workflow authority invariants:
- Status transitions are API-authoritative and must use `POST /api/social-posts/[postId]/transition`.
- Allowed backward transitions are locked to:
  - `ready_to_publish` → `changes_requested`
  - `awaiting_live_link` → `changes_requested`
- Execution-stage rollback requires a non-empty reason.
- `published` requires at least one valid link in `social_post_links`.
- Execution stages (`ready_to_publish`, `awaiting_live_link`) are brief-locked (no in-place brief editing).
- Admin-only brief editing path uses `POST /api/social-posts/[postId]/reopen-brief`, which reopens to `creative_approved` and logs activity.

Reminder + notification invariants:
- Awaiting-live-link reminder sweeps use `POST /api/social-posts/reminders`.
- Reminder dedupe is enforced with `social_posts.last_live_link_reminder_at` using a 24-hour cooldown.
- Social transition and reminder Slack events are emitted by API routes, not direct ad-hoc client writes.

## UI Label Standards (MUST)

**Avoid labeling user roles in section headers** unless explicitly necessary for admin-only features:

1. **Do NOT use**: "Required (Editor)", "Optional / Editor & Admin", "Schedule (Admin)"
2. **Use instead**: "Required", "Optional", "Schedule"
3. **Exception**: Only explicitly mention user roles when it clarifies permission boundaries for admin-only sections (e.g., "Admin Only" for sensitive operations)
4. **Rationale**: User roles are implicit from context and capability; explicit role labels clutter the UI and reduce clarity
5. **Apply globally** across all form sections, drawer panels, and preview panes (Social Posts, Blogs, Tasks, etc.)

**Section label examples:**
- "Basic Information" → Primary content fields
- "Required" → Must-fill fields
- "Optional" → Nice-to-have fields
- "Schedule" → Publishing/workflow dates
- "Advanced Settings" → Power-user options
- "Admin Only" → Restricted to admins (exception case)
