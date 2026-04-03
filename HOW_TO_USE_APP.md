# Sighthound Content Relay — User Manual

## Vision
- **Company vision**: build a predictable content execution engine where planning, review, and publishing handoffs stay clear across every campaign.
- **App vision**: make each record actionable with one owner, one next step, and complete stage visibility from draft to live.
- **Operational promise**: reduce missed handoffs and scheduling drift by keeping teams aligned in one shared workflow system.

## 1. Start here
This workspace helps you run blog and social-post work from draft to completion.

Use it to:
- manage assigned work in one place
- move content through clear status stages
- apply filters and imports to keep work queues clean
- stay up to date through notifications

Use [My Tasks](/tasks) as your first stop each day.

Quick app links: [Home](/) · [Dashboard](/dashboard) · [My Tasks](/tasks) · [Blogs](/blogs) · [Social Posts](/social-posts) · [Ideas](/ideas) · [Calendar](/calendar) · [Settings](/settings)

## Role-based quick navigation
Start with the role you are actively working as right now:
- [Writer quick start](#writer-quick-start)
- [Publisher quick start](#publisher-quick-start)
- [Editor/Reviewer quick start](#editorreviewer-quick-start)
- [Admin quick start](#admin-quick-start)
- [Shared navigation map](#shared-navigation-map)
- [When you are stuck](#when-you-are-stuck)

### Shared navigation map
- [`Dashboard`](/dashboard): cross-content queue view with filtering and sorting.
- [`My Tasks`](/tasks): your assignment-first execution queue.
- [`Blogs`](/blogs): published/reference lookup and copy/export utilities.
- [`Social Posts`](/social-posts): social workflow list, board, calendar, and full editor.
- [`Ideas`](/ideas): intake and conversion into blog/social records.
- [`Calendar`](/calendar): scheduling and capacity planning across content.
- [`Settings`](/settings): profile, connectors, notifications, and admin tools.

### Writer quick start
1. Go to [My Tasks](/tasks) and focus on `Required by: <username>`.
2. Open each assigned record and complete required fields/checklist items.
3. For social posts, ensure Product, Type, and Canva link are complete before submitting for review.
4. Move records forward only when validation/checklist signals are clear.
5. Use `Waiting on Others` to track handoffs blocked on reviewers or publishers.

### Publisher quick start
1. Start in [My Tasks](/tasks) and filter to publishing-stage work.
2. Blogs move into `Publishing in Progress` automatically once writing is marked complete and a publisher is assigned.
3. Confirm schedule, caption/platform requirements (social), and publishing readiness.
4. Publish only when stage prerequisites are complete and approvals are in place.
5. Add/update required links (`Live URL` for blogs, social live links for social posts).
6. Use [Calendar](/calendar) for near-term scheduling conflicts and rescheduling context.

### Editor/Reviewer quick start
1. Open [My Tasks](/tasks) for items in review-facing stages.
2. Review quality and required fields before approval.
3. If revisions are needed, send clear `Changes Requested` guidance.
4. Approve only when the next owner can execute without missing context.
5. Use record activity history to verify what changed and who changed it.

### Admin quick start
1. Use [Dashboard](/dashboard) and [My Tasks](/tasks) for workflow health and bottlenecks.
2. Use [Settings](/settings) to manage users, roles, permissions, and connectors.
3. Use `Activity History` for audit review and operational troubleshooting.
4. Use quick-view to validate non-admin experience from the target user's perspective.
5. Use destructive tools (cleanup, wipe) only after confirming scope and impact.

### When you are stuck
- Recheck status and transition requirements: [Workflow rules and statuses](#3-workflow-rules-and-statuses).
- Recheck queue narrowing: [Filters and search](#5-filters-and-search).
- Recheck import quality: [Import workflow](#5-import-workflow).
- Recheck alerting and update signals: [Notifications and feedback](#8-notifications-and-feedback).
- Use fallback fixes: [Troubleshooting quick fixes](#10-troubleshooting-quick-fixes).

## 2. Daily workflow (recommended order)
1. Open [Home](/) and review the `My Tasks Snapshot` groups (`Required by: <username>` and `Waiting on Others`).
2. Open [My Tasks](/tasks) and review assigned and due work.
3. Open each item and complete required fields/checklist items.
4. Move status forward only when the current stage is complete.
5. Use filters to focus on one queue at a time (status/product/type/owner).
6. For social posts, add at least one public live link before final completion.
7. Keep `Action State` on `All` when you want full assignment visibility, including items waiting on teammates.

### My Tasks visibility rule
- `My Tasks` shows all of your assigned, non-published work (blogs + social), including items where the next step is currently on someone else.
- For social posts, task ownership is derived from workflow stage ownership (`draft/changes_requested/ready_to_publish/awaiting_live_link` → worker, `in_review/creative_approved` → reviewer) so handoff items appear in the correct action bucket.
- `Next Tasks` is mixed and prioritized across both blogs and social posts so actionable social handoffs (for example `Ready to Publish`) are not hidden behind blog-only ordering.
- The main tasks table is a single mixed list (blogs + social), not split into separate blog/social sections.
- The `Content` column/filter supports:
  - `Blog`
  - `Social Post (All)`
  - `Social: Image`, `Social: Carousel`, `Social: Video`, `Social: Link`
- Choose `Social Post (All)` to see every social row regardless of subtype; choose a social subtype to narrow to only that subtype.
- Site filtering on mixed task rows is standardized to two options only: `Sighthound (SH)` and `Redactor (RED)`.
- Use `Action State` filter to switch between:
  - `Required by: <username>` (actionable now)
  - `Waiting on Others` (assigned to you but blocked on another actor)
- Blog publishing ownership at approval stage:
  - `Publishing Approved` is still actionable for the assigned publisher and appears under `Required by: <username>` for that publisher.
  - Admin review assignments are actionable only during `Awaiting Publishing Approval`; once a blog reaches `Publishing Approved`, those admin-assignment rows move to `Waiting on Others`.
- The [Home](/) page uses the same model for `My Tasks Snapshot`, showing all associated active items grouped by those two states.
- If you are associated to the same blog in multiple ways (for example writer + publisher), it appears once in the snapshot.
- For multi-association blog rows, `Required by: <username>` wins over `Waiting on Others` when any associated role is actionable.
- Home summary cards also include writer-relevant social handoff stage `Ready to Publish`.
- Notification panel includes `Required by: <username>` shortcuts (top actionable items) that deep-link directly to the relevant blog/social record.
- Admin quick-view mode opens on [My Tasks](/tasks) with `Required by Me` filter intent so impersonated sessions start on actionable work.

## 3. Workflow rules and statuses
### Blog status language
- Writer labels: `Awaiting Editorial Review`, `Writing Approved`
- Publisher flow: `Not Started` → `Publishing in Progress` → `Awaiting Publishing Approval` → `Publishing Approved` → `Published`

### Social post status model
- `Draft`
- `In Review`
- `Changes Requested`
- `Creative Approved`
- `Ready to Publish`
- `Awaiting Live Link`
- `Published`

### Social next actions
- Draft → Submit for Review
- In Review → Review Needed
- Changes Requested → Apply Changes
- Creative Approved → Add Caption & Schedule
- Ready to Publish → Publish Post
- Awaiting Live Link → Submit Link
- Published → Done

### Social post editor usability defaults
- Use the right-sidebar primary button as the standard transition action.
- Keep `Advanced transition controls` for exceptional/manual transitions only.
- Before stage-changing primary transitions, review the compact confirmation summary (`status change`, `next owner`, `locking behavior`) and confirm.
- Use `Transition Preflight` in the sidebar to see missing required fields and jump directly to each field.
- In Setup, complete required-now fields first, then required-before-approval fields; optional fields are grouped in `Optional Details`.
- In Live Links, paste one URL to auto-detect the platform quickly, then use platform-specific fields for final edits if needed.
- Snapshot panel shows `Assigned to`, `Reviewer`, `Current owner`, and `Next owner` so handoffs stay explicit.
- When sending a post to `Changes Requested`, complete the structured template (category + checklist + optional context) instead of writing only free text.
- In `New Social Post`, use quick presets for common combinations and rely on remembered last-used `product`, `type`, and `platforms`.
- From the [Social Posts](/social-posts) list panel, use `Work in Full View` to open the editor at the most relevant section for the post's current stage.
- Keyboard-first actions in full editor:
  - `Alt+Shift+J`: jump to the next missing required field in transition preflight
  - `Alt+Shift+Enter`: run the primary sidebar action
  - use the sidebar `Shortcut` link to open the shortcuts modal and view these keys

### Record visibility (blogs + social)
- Detail drawers show latest assignment context and recent change history (latest-first) so anyone can quickly understand ownership and what changed.
- Full record pages show assignment, comments, and activity history for all authenticated users.
- Record-level history visibility is read-only and does not grant extra edit permissions.
- Section order is standardized: when present, `Comments` and `Activity` appear as the final sections on record pages/drawers.
- Timezone-rendered times preserve correct AM/PM around midnight/noon (for example, `12:34 AM` stays AM and does not flip to PM).

### Workflow rules to remember
- Social editors can collaborate on the same post concurrently.
- Social post create modal requires Product, Type, and Reviewer; Title is optional.
- To submit for review, include Product, Type, and Canva link.
- Creative approval requires Product, Type, Canva link, Platforms, Caption, and Scheduled Publish Date.
- On `Add Blog`, date fields default to today and work for all users:
  - `Scheduled Publish Date` defaults to today
  - `Display Publish Date` defaults to match Scheduled Publish Date via a sync checkbox
  - Checkbox labeled "Same as Scheduled Publish Date" is checked by default; uncheck to set a different display date
  - When checkbox is checked, display date auto-updates when you change scheduled date
  - When checkbox is unchecked, display date remains independent (changing scheduled date does not affect it)
  - If you uncheck, change scheduled date, then recheck the checkbox: display date syncs back to the new scheduled date
  - Both dates can be freely edited by any user creating a blog (no permission gating on create)
  - Display Published Date can never be empty; if not explicitly set, it always defaults to Scheduled Publish Date
  - This behavior is automatic and handled by the database, so you don't need to worry about missing dates
  - After creation, assigned writers and publishers can keep editing workflow dates on their assigned blogs
  - Writer defaults to your own user automatically when opening the form
  - Publisher stays editable and remembers your last selected publisher for the next new blog when that user is still available
  - If you choose `Unassigned` or the remembered publisher no longer exists, the saved publisher preference is cleared automatically
- Workflow-critical blog fields follow ownership:
  - Assigned writers and publishers can edit Google Doc URL and Live URL on blogs they own in the workflow
  - Assigned writers and publishers can edit scheduled and display publish dates on blogs they own in the workflow
  - These core workflow fields are not meant to be blocked by separate permission toggles
- When writing is marked `Writing Approved`, assigned publisher work is auto-jogged from `Not Started` to `Publishing in Progress` (unless an explicit publishing stage is submitted in the same transition).
- At `Publishing Approved`, the assigned publisher remains the next actor for completion; admin review assignments are no longer actionable at that stage.
- Non-admin writers can edit brief fields in Draft and Changes Requested.
- Admin/reviewer can edit brief fields at any stage when needed.
- In `Awaiting Live Link`, non-admin users can only add/update live links.
- Associated blog linkage persists when moving between workflow stages.
- Returning from execution to `Changes Requested` requires a reason.
- `Published` requires at least one valid live link (LinkedIn, Facebook, or Instagram).
- Required rollback/reopen reasons are entered through in-app dialogs (not browser prompts).
- On Ideas, comments and references stay visible and are edited through `Edit Idea` (not inline).
- All delete actions use the same in-app confirmation modal pattern (not browser dialogs and not toast-action confirms).

## 4. Task assignment transparency
- All authenticated users can see who owns each task.
- This is intentional so handoffs, blockers, and next-step ownership stay visible across the team.
- Only the assigned user and admins can change task assignments.

## 5. Filters and search
- Search is case-insensitive and supports partial matches.
- Filters can be combined to isolate actionable work quickly.
- Filters persist until changed or cleared.
- If no results appear, clear one filter at a time to isolate the blocker.
- Dashboard filter controls are available to all users regardless of role (same filter surface for everyone).
- At wide breakpoints, dashboard filters render in a 4-column layout for denser control visibility.
- Social ownership and dashboard social totals are stabilized from explicit assignee IDs, so assigned social work does not disappear when relation lookups fail.
- Dashboard filters are grouped into explicit sections:
  - Group 1 (Cross-Content Scope): `Sites`, `Content Type`, `Workflow (All Content)`, `Delivery (All Content)`
  - Group 2 (Blog Filters): `Blog Stage`, `Blog Writers`, `Blog Publishers`, `Blog Writer Status`, `Blog Publisher Status`
  - Group 3 (Social Filters): `Social Status`, `Social Product`
- `Sites` in mixed views is constrained to `Sighthound (SH)` and `Redactor (RED)`.
- `Content Type` supports both umbrella and subtype scopes:
  - `Blog`
  - `Social Post (All)`
  - `Social: Image`, `Social: Carousel`, `Social: Video`, `Social: Link`
- `Social Post (All)` includes all social subtypes; subtype options narrow to only the selected subtype.
- Scope-safe behavior:
  - Blog-only filters do not hide social rows.
  - Social-only filters do not hide blog rows.
- Dashboard uses one filter-pill row as the single source of truth for active filters (each pill can be removed directly).
- Bulk Actions panel appears whenever rows are selected; if you cannot run bulk mutations, controls remain visible but disabled with helper text.
- Dashboard Overview cards are cross-content (blogs + social posts):
  - `Open Work`
  - `Scheduled Next 7 Days`
  - `Awaiting Review`
  - `Ready to Publish`
  - `Awaiting Live Link`
  - `Published Last 7 Days`
- Dashboard header context is cross-content by design (blog + social pipeline health).

### Table sorting and controls
- Click table headers to sort ascending/descending.
- Sort indicators: `↕` (unsorted), `↑` (ascending), `↓` (descending).
- Global action order: `Copy` → `Customize` → `Import` → `Export`.
- Primary table surfaces ([Dashboard](/dashboard), [My Tasks](/tasks), [Blogs](/blogs), [Social Posts](/social-posts) list view) use the same control layout:
  - top strip: results summary + actions
  - bottom strip: `Rows per page` + pagination
- Default table settings on those surfaces:
  - default density: `Compact`
  - default rows per page: `10`
  - rows-per-page options: `10`, `20`, `50`, `All`
- Rows are colorized by workflow state to improve scanability:
  - `Published/Completed` rows use green tones
  - `Needs Revision/Changes Requested` rows use red tones
  - `In Review` rows use violet tones
  - `Ready to Publish` rows use sky tones
  - `Awaiting Live Link` rows use amber tones
  - `In Progress` rows use blue tones
- Dashboard list is now a unified content table for blogs + social posts using core columns: `Content`, `Site`, `ID`, `Title`, `Status`, `Lifecycle`, `Scheduled`, `Published`, `Assigned to`, `Updated` (with optional `Product`).
- `Content` labels can include social subtype context (for example `Social Post · Carousel`) while filters keep an umbrella `Social Post (All)` option.
- In Dashboard, blog `Published` date reflects the blog's **Actual Published Date** (actual published timestamp date), not display/scheduled fallback dates.
- Clicking a blog row opens the blog detail drawer; clicking a social row opens its dedicated page.
- Phase A selection behavior: both blog and social rows can be selected in-table.
- Safety gating: mutation controls remain blog-only and are disabled whenever social rows are part of the current selection.
- Selected CSV/PDF export supports mixed selected rows.
- Exception: `Settings` and `Activity History` tables keep specialized admin layouts and are intentionally outside this global table consistency contract.

### Consistency guarantees
- Core table behavior is standardized across pages (sorting, truncation, row density, pagination controls).
- Drawers and action feedback follow shared patterns; behavior should feel the same regardless of module.
- Workflow actions are validated before they are accepted, so invalid transitions are blocked consistently.
- Blog detail, My Tasks, and Dashboard blog workflow edits use the same transition API path, so permission checks and transition alerts stay consistent across surfaces.
- Blog and social post create actions now use canonical create API routes (`POST /api/blogs`, `POST /api/social-posts`), so create-time Slack alerts are emitted consistently across creation surfaces.
- Automated reminder sweeps (awaiting live link + overdue review/publish checks) send Slack alerts through the same centralized workflow notification path.
- When an action fails, feedback uses standardized error wording (and may include a short error code) for easier troubleshooting.

## 5. Import workflow
1. Upload your sheet.
2. Map/select columns and unselect non-required columns.
3. Use sheet preview to select/unselect rows before import.
4. Exclude error rows and correct key-field issues.
5. Run import and update optional fields later if needed.
6. `Draft Doc Link` and `Actual Publish Date` are optional; if provided, format validation still applies.
7. Automatic fallbacks are applied for missing selected values:
   - missing Live URL + SH/sighthound site aliases → `https://www.sighthound.com/blog/`
   - missing Live URL + RED/redactor site aliases → `https://www.redactor.com/blog/`
   - missing selected Draft Doc Link → `https://docs.google.com/`
   - missing selected Actual Publish Date → uses Display Publish Date
8. If a blog already exists (matched by Live URL), import updates/overwrites it with the latest imported values and selected fallback values.

Required key columns:
- `SH` or `RED`
- `Full blog title`
- `Full published blog URL`
- `Blog writer name`
- `Person who published`
- `Date shown on blog (YYYY-MM-DD)`

Name resolution behavior:
- Step 1.75 selections are applied directly during import (selected existing users are reused as chosen).
- Matching is confidence-scored using exact and loose contains/token-overlap checks across full name, display name, username, first/last name, and email variants.
- If no existing user is selected for a name, import creates a placeholder user profile with a unique `@sighthound.com` email alias.
- Placeholder-user creation during import uses hardened auth triggers so integration bootstrap failures do not block import completion.

## 6. Calendar workflow and navigation
- Use [Calendar](/calendar) with `Month` view for planning density and `Week` view for detailed daily execution.
- Month tiles intentionally show a compact list; when a day has many items, click `+N more` to jump directly to that week.
- [`Social Posts`](/social-posts) calendar view follows the same month/week behavior and overflow pattern as the main calendar.
- In social calendar month mode, each day shows up to 3 posts; `+N more` switches to week mode focused on that date for full-day detail.
- Drag-and-drop rescheduling on blogs is permission-based and unavailable for published blogs.
- Use the `+` button on a day to quick-create a blog or social post prefilled with that date.
- Unscheduled work appears below the grid so no content is hidden from operational review.
- In both calendar surfaces, weekday ordering and “today” markers follow your personal `week start` + `timezone` settings.

## 7. Shortcuts and fast navigation
- Use the clickable `Shortcut` label to open the shortcuts modal.
- Command palette: `⌘K` (Mac) or `Ctrl+K` (Windows).
- `Esc` closes open dropdowns and modals.
- Quick Create: `↑/↓` to move, `Enter` to select, `Esc` to close.
- Social Post editor ([Social Posts](/social-posts) detail view): `Alt+Shift+J` (next required field), `Alt+Shift+Enter` (primary action).
- Calendar keyboard navigation ([Calendar](/calendar) and [Social Posts Calendar](/social-posts?view=calendar)): `Arrow` keys or `J/K` to move day focus, `Enter` to open first item in focused day, `Esc` to close open side panels.
- Navigation behavior: internal app links open in the same tab; external links open in a new tab.

## 8. Notifications and feedback
### Notification bell
- Tracks creations, assignments, stage changes, submissions, publications, and mentions.
- Unread badge shows what still needs review.
- Click a notification to jump to the related record.
- Activity items use plain-language titles and change summaries (for example, "Publishing Stage Updated" instead of raw status keys).
- Bell sections are split into:
  - `Required by: <name>` (top actionable shortcuts)
  - `Updates` (unread inbox items)
  - `Recent Activity` (readable feed items not duplicated in inbox)
- Bell actions:
  - `View All` opens [`/updates`](/updates) for all authenticated users
  - `Mark all read` marks inbox items as read
  - `Clear my inbox` hides inbox items from active view without permanent deletion
- Opening the bell does not trigger reminder jobs; it only reads feed/task data.

### View All updates feed
- Open from bell `View All` to access [`/updates`](/updates).
- Feed behavior:
  - `Recent activity` is capped to the latest 50 items.
  - `Inbox updates` are your persistent per-user in-app notifications.
  - `Cleared inbox updates` can be shown/hidden and restored.
- Clear is reversible:
  - `Clear` moves a single item to cleared
  - `Clear my inbox` moves all inbox items to cleared
  - `Restore` / `Restore all` moves cleared items back to inbox
- This page is intended as a readable operational feed, not an admin-only audit tool.

### Notification preferences
- [`Settings`](/settings) → `Notification Preferences` controls all notification types.
- **Global toggle**: Master switch to enable or disable all notifications.
- **Per-type toggles**: Enable/disable specific notification types (task assignments, stage changes, submissions, etc.).
- **In-app**: Always available when enabled.
- **Slack**: Sends workspace-level workflow notifications to `#content-ops-alerts` when Slack notifications are enabled.
- **No personal Slack DMs**: Direct-message workflow notifications are not used.

### Unified notification behavior
- Workflow actions use a shared event system so the same action can update activity history, in-app notifications, and Slack together.
- Overdue review, overdue publish, and live-link reminder events use the same pipeline as assignments and stage changes.
- If a notification preference is disabled, the related in-app and Slack delivery should be skipped consistently.

### Slack notification format
Slack notifications follow a clear, actionable format:
```
[Blog|Social] Title (Site)
Action: What needs to happen or what just happened
Assigned to: User name(s) (fallback: Team)
Assigned by: User name (fallback: Team)
Open link: Link to content
```
Example:
- `[Social] ALPR for EV enforcement (alpr_plus)`
- `Action: Submitted for review - awaiting editorial approval`
- `Assigned to: Sarah Chen` (fallback: `Assigned to: Team`)
- `Assigned by: Adam Zampa` (fallback: `Assigned by: Team`)
- `Open link: https://sighthound-content-ops.vercel.app/social-posts/<id>`

This format enables quick scanning in busy channels and shows exactly who is responsible for the next step.

### Action feedback
- Success/error alerts appear at the bottom-left and auto-dismiss quickly.
- Delete confirmation is handled through a dedicated in-app modal before deletion executes.
- Copy actions show a visual copied confirmation.
- Workflow links now include quick `Open` + `Copy` controls in-place for high-value URLs (for example Google Doc URL, blog Live URL, and social saved live links).
- Missing URLs still show disabled `Open` + `Copy` controls so required workflow links are easy to scan.
- CSV/PDF export flows remain direct browser downloads/print flows and are not blocked by JSON API parsing behavior.

### Activity history wording
- Assignment and change logs are intentionally non-technical for operators.
- You will see readable labels (like "Writing Stage", "Publishing Stage", "Draft Link", "Live Link") instead of internal field keys.
- User IDs are not shown in history rows; assignments show names when available.

## 9. Connected services (Google and Slack)
### Connect a provider
1. Open [Settings](/settings) → Connected Services
2. Find the service (Google or Slack) and click `Connect`
3. Complete the provider's sign-in flow in the browser
4. You'll be returned to [Settings](/settings); the service now shows `Connected`
5. Reconnect callbacks are idempotent: if the provider is already marked connected, status remains connected without creating duplicate records

### Disconnect a provider
1. Open [Settings](/settings) → Connected Services
2. Find the service and click `Disconnect`
3. Confirm the action

**Note**: Connecting a provider from Settings does not change your sign-in method. OAuth connection is independent of how you log in each time.

## 10. Troubleshooting quick fixes
- Cannot move status: finish required checklist items and save first.
- Social post stuck before completion: add at least one valid public live link.
- Missing results: clear filters/search and reapply one by one.
- Import errors: unselect invalid rows, verify required columns, then retry.
- If branding assets fail, the app now falls back automatically and remains usable:
  - login logo: `text-logo SVG` → `text-logo PNG` → `badge SVG` → text lockup
  - app header badge: `animated GIF` → `badge SVG` → `SH` lockup
- Wipe App Clean behavior: this action deletes all content/history and all other user accounts (including other admins); only your currently signed-in admin account is preserved.
- Add User or import fails with `Database error creating new user`: ask an admin to run latest Supabase migrations (including `20260326103000_harden_auth_user_integrations_trigger.sql`) and retry.
- Missing notifications: verify notification toggles and connector status in [Settings](/settings).
- Provider connect failed: ensure you have an active session, then retry from [Settings](/settings) → Connected Services.
- If you briefly see “Failed to update connected service status” but the badge later turns connected, refresh Settings once to confirm the persisted state.
- If you see “Concurrent modification detected. Refresh and retry.” while changing workflow state, another update landed first—refresh the page and retry your change.
- Cannot access Activity History or system/import log views: confirm your account has admin access and required permissions.
- Unexpected UI state: refresh once, retry action, then report the item ID and failed step.
- For maintainers running end-to-end stabilization checks before release, run `npm run check:full`.
