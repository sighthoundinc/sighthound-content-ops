# Content Ops Dashboard — User Manual

## 1. Start here
This workspace helps you run blog and social-post work from draft to completion.

Use it to:
- manage assigned work in one place
- move content through clear status stages
- apply filters and imports to keep work queues clean
- stay up to date through notifications

Use `My Tasks` as your first stop each day.

## 2. Daily workflow (recommended order)
1. Open `/` and review the `My Tasks Snapshot` groups (`Required by: <username>` and `Waiting on Others`).
2. Open `My Tasks` and review assigned and due work.
3. Open each item and complete required fields/checklist items.
4. Move status forward only when the current stage is complete.
5. Use filters to focus on one queue at a time (status/product/type/owner).
6. For social posts, add at least one public live link before final completion.
7. Keep `Action State` on `All` when you want full assignment visibility, including items waiting on teammates.

### My Tasks visibility rule
- `My Tasks` shows all of your assigned, non-published work (blogs + social), including items where the next step is currently on someone else.
- For social posts, task ownership is derived from workflow stage ownership (`draft/changes_requested/ready_to_publish/awaiting_live_link` → worker, `in_review/creative_approved` → reviewer) so handoff items appear in the correct action bucket.
- `Next Tasks` is mixed and prioritized across both blogs and social posts so actionable social handoffs (for example `Ready to Publish`) are not hidden behind blog-only ordering.
- `Social Tasks` list shows all matching social rows for current filters (not only a small preview subset).
- Use `Action State` filter to switch between:
  - `Required by: <username>` (actionable now)
  - `Waiting on Others` (assigned to you but blocked on another actor)
- The home page uses the same model for `My Tasks Snapshot`, showing top mixed items grouped by those two states.
- Home summary cards also include writer-relevant social handoff stage `Ready to Publish`.
- Notification panel includes `Required by: <username>` shortcuts (top actionable items) that deep-link directly to the relevant blog/social record.
- Admin quick-view mode opens on `My Tasks` with `Required by Me` filter intent so impersonated sessions start on actionable work.

## 3. Workflow rules and statuses
### Blog status language
- Writer labels: `Awaiting Editorial Review`, `Writing Approved`
- Publisher flow: `Not Started` → `Publishing in Progress` → `Waiting for Approval` → `Publishing Approved` → `Published`

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

### Record visibility (blogs + social)
- Detail drawers show latest assignment context and recent change history (latest-first) so anyone can quickly understand ownership and what changed.
- Full record pages show assignment, comments, and activity history for all authenticated users.
- Record-level history visibility is read-only and does not grant extra edit permissions.
- Section order is standardized: when present, `Comments` and `Activity` appear as the final sections on record pages/drawers.

### Workflow rules to remember
- Social editors can collaborate on the same post concurrently.
- Social post create modal requires Product, Type, and Reviewer; Title is optional.
- To submit for review, include Product, Type, and Canva link.
- Creative approval requires Product, Type, Canva link, Platforms, Caption, and Scheduled Publish Date.
- Non-admin writers can edit brief fields in Draft and Changes Requested.
- Admin/reviewer can edit brief fields at any stage when needed.
- In `Awaiting Live Link`, non-admin users can only add/update live links.
- Associated blog linkage persists when moving between workflow stages.
- Returning from execution to `Changes Requested` requires a reason.
- `Published` requires at least one valid live link (LinkedIn, Facebook, or Instagram).
- On Ideas, comments and references stay visible and are edited through `Edit Idea` (not inline).
- On Ideas, creators and admins can delete an idea from the card action row after a confirmation prompt.

## 4. Filters and search
- Search is case-insensitive and supports partial matches.
- Filters can be combined to isolate actionable work quickly.
- Filters persist until changed or cleared.
- If no results appear, clear one filter at a time to isolate the blocker.
- Dashboard filter controls are available to all users regardless of role (same filter surface for everyone).
- At wide breakpoints, dashboard filters render in a 4-column layout for denser control visibility.
- Dashboard filters are grouped into explicit sections:
  - Group 1 (Cross-Content Scope): `Sites`, `Content Type`, `Workflow (All Content)`, `Delivery (All Content)`
  - Group 2 (Blog Filters): `Blog Stage`, `Blog Writers`, `Blog Publishers`, `Blog Writer Status`, `Blog Publisher Status`
  - Group 3 (Social Filters): `Social Status`, `Social Product`
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
- Dashboard list is now a unified content table for blogs + social posts using core columns: `Type`, `Site`, `ID`, `Title`, `Status`, `Lifecycle`, `Scheduled`, `Published`, `Assigned to`, `Updated` (with optional `Product`).
- Clicking a blog row opens the blog detail drawer; clicking a social row opens its dedicated page.
- Phase A selection behavior: both blog and social rows can be selected in-table.
- Safety gating: mutation controls remain blog-only and are disabled whenever social rows are part of the current selection.
- Selected CSV/PDF export supports mixed selected rows.

### Consistency guarantees
- Core table behavior is standardized across pages (sorting, truncation, row density, pagination controls).
- Drawers and action feedback follow shared patterns; behavior should feel the same regardless of module.
- Workflow actions are validated before they are accepted, so invalid transitions are blocked consistently.
- When an action fails, feedback uses standardized error wording (and may include a short error code) for easier troubleshooting.

## 5. Import workflow
1. Upload your sheet.
2. Map/select columns and unselect non-required columns.
3. Use sheet preview to select/unselect rows before import.
4. Exclude error rows and correct key-field issues.
5. Run import and update optional fields later if needed.
6. `Draft Doc Link` and `Actual Publish Date` are optional; if provided, format validation still applies.

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
- Use `Month` view for planning density and `Week` view for detailed daily execution.
- Month tiles intentionally show a compact list; when a day has many items, click `+N more` to jump directly to that week.
- Drag-and-drop rescheduling on blogs is permission-based and unavailable for published blogs.
- Use the `+` button on a day to quick-create a blog or social post prefilled with that date.
- Unscheduled work appears below the grid so no content is hidden from operational review.

## 7. Shortcuts and fast navigation
- Use the clickable `Shortcut` label to open the shortcuts modal.
- Command palette: `⌘K` (Mac) or `Ctrl+K` (Windows).
- `Esc` closes open dropdowns and modals.
- Quick Create: `↑/↓` to move, `Enter` to select, `Esc` to close.
- Navigation behavior: internal app links open in the same tab; external links open in a new tab.

## 8. Notifications and feedback
### Notification bell
- Tracks assignments, stage changes, submissions, publications, and mentions.
- Unread badge shows what still needs review.
- Click a notification to jump to the related record.
- Activity items use plain-language titles and change summaries (for example, "Publishing Stage Updated" instead of raw status keys).

### Notification preferences
- `Settings → Notification Preferences` controls all notification types.
- **Global toggle**: Master switch to enable or disable all notifications.
- **Per-type toggles**: Enable/disable specific notification types (task assignments, stage changes, submissions, etc.).
- **In-app**: Always available when enabled.
- **Slack**: Only sends if Slack is connected and that notification type is enabled.
- **Slack delivery method**: Choose between direct messages (coming soon, pending approval) or #content-ops-alerts channel.
- **Slack delivery fallback**: If channel delivery fails, the system still attempts DM/webhook paths when configured.

### Unified notification behavior
- Workflow actions use a shared event system so the same action can update activity history, in-app notifications, and Slack together.
- Overdue review, overdue publish, and live-link reminder events use the same pipeline as assignments and stage changes.
- If a notification preference is disabled, the related in-app and Slack delivery should be skipped consistently.

### Slack notification format
Slack notifications follow a clear, actionable format:
```
[Blog|Social] Event Label • Title (Site)
Action: What needs to happen or what just happened
Owner: Role responsible (when relevant)
Open: Link to content
```

Example: `[Social] Awaiting live link • "Campaign Post" (SH)` with action "Awaiting live link — awaiting creator submission"

This format enables quick scanning in busy channels and shows exactly who is responsible for the next step.

### Action feedback
- Success/error alerts appear at the bottom-left and auto-dismiss quickly.
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
1. Open Settings → Connected Services
2. Find the service (Google or Slack) and click `Connect`
3. Complete the provider's sign-in flow in the browser
4. You'll be returned to Settings; the service now shows `Connected`

### Disconnect a provider
1. Open Settings → Connected Services
2. Find the service and click `Disconnect`
3. Confirm the action

**Note**: Connecting a provider from Settings does not change your sign-in method. OAuth connection is independent of how you log in each time.

## 10. Troubleshooting quick fixes
- Cannot move status: finish required checklist items and save first.
- Social post stuck before completion: add at least one valid public live link.
- Missing results: clear filters/search and reapply one by one.
- Import errors: unselect invalid rows, verify required columns, then retry.
- Wipe App Clean behavior: this action deletes all content/history and all other user accounts (including other admins); only your currently signed-in admin account is preserved.
- Add User or import fails with `Database error creating new user`: ask an admin to run latest Supabase migrations (including `20260326103000_harden_auth_user_integrations_trigger.sql`) and retry.
- Missing notifications: verify notification toggles and connector status in `Settings`.
- Provider connect failed: ensure you have an active session, then retry from Settings → Connected Services.
- Cannot access Activity History or system/import log views: confirm your account has admin access and required permissions.
- Unexpected UI state: refresh once, retry action, then report the item ID and failed step.
