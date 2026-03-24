# Sighthound Content Ops — User Manual

## 1. What this app is
This is your content operations system for blogs and social posts.

It helps you:
- track writing and publishing progress
- manage assignments and ownership
- coordinate social post production and review
- keep a clear activity trail

It does NOT:
- write full content for you
- publish to your website or social channels automatically

## 1.5 Access and entry flow
- Signed-out users are routed to `Login` (`/login`)
- `Login` requires a `@sighthound.com` account and supports:
  - `Continue with Slack` (Sighthound Slack workspace)
  - `Continue with Google` (Google Workspace SSO with @sighthound.com email)
  - email/password credentials (admin-managed accounts)
- `Login` uses a decluttered premium layout:
  - Sighthound logo and brand context on the left
  - focused sign-in card on the right
- After signing in, users are routed to the workspace home page (`/`)
- First-time OAuth users (Slack or Google) are automatically provisioned with the `writer` role

## 1.55 Connected Services
Your OAuth sign-in methods are tracked globally. When you sign in via Slack or Google, the system remembers which providers you have connected.

**Where to view**: Settings page shows Google and Slack connector status
- Green = connected
- Grey = not connected

**Benefit**: If you signed in via Slack yesterday and sign in via Google today, both will show as "Connected" in your settings. This helps you understand which authentication methods are available to you.

## 1.6 Daily Standup Home Page
The home page is your daily standup—a quick view of what needs your attention.

**Warm welcome on login**:
When you sign in (via email/password or OAuth), you'll see a friendly loading message while your dashboard prepares:
- "Preparing your standup..."
- "Gathering your work queue..."
- "Loading your dashboard..."
- "Setting up your workspace..."
- "Syncing your tasks..."
- "Getting you ready to go..."

A random message is shown each session with "Welcome back." underneath. Your tasks and statuses appear immediately without delay.

**Layout:**
- Top-left: greeting with your name
- Top-right: your role(s) badge (e.g., "Writer, Publisher (Multiple roles)")
- Main section: actionable work buckets showing:
  - items needing your revision
  - items in progress
  - items approved and waiting for next stage
  - social posts awaiting action

**Behavior:**
- Shows only items **assigned to you** in your role
- High-priority items (revision requests, awaiting approval) are highlighted in red
- Clicking any bucket navigates to `My Tasks` with that filter pre-applied
- Filters auto-clear after navigation (normal browsing shows default view)
- Bottom buttons provide quick links:
  - `Go to Dashboard` (full view, all filters available)
  - `View Calendar` (schedule overview)

**When all work is caught up:**
- You'll see "All work is on track" with a summary
- Still shows `Go to Dashboard` and `View Calendar` for context switching

## 1.7 My Profile: personal preferences
In **Settings** → **My Profile**, update your personal settings in one place:
- name and display details
- timezone (default: US Eastern)
- week start day
- how many days before drafts are flagged for attention

## 1.8 Notification Preferences
Control which notifications you receive:

**Location**: Settings → Notification Preferences

**Global toggle**:
- Enable/Disable all notifications with one switch

**Individual notification types** (can be toggled separately):
- Task Assigned — when you're assigned a blog or social post
- Stage Changed — when content moves through workflow stages
- Submitted for Review — when someone submits content for your review
- Published — when content is published
- Awaiting Action — when content needs your attention
- Mention — when someone mentions you in a comment

**Slack delivery** (optional):
- Enable Slack notifications to receive messages in your Slack workspace
- Notifications are also sent as direct messages when relevant

**Important**: Disabling a notification type affects both in-app and Slack notifications.

## 2. Navigation and layout standards
The sidebar order is fixed and consistent:
1. Dashboard
2. My Tasks
3. Ideas
4. Blogs
5. Social Posts
6. Calendar
7. CardBoard
8. User Manual
9. Settings
10. Permissions

Dashboard sidebar behavior:
- sidebar supports two persistent states:
  - expanded (`240px`): icon + label
  - collapsed (`72px`): icon-only
- collapsed state shows labels through hover/focus tooltips only (no browser `title` fallback)
- collapse preference is global and remembered across sessions
- sidebar and page content are rendered in separate columns, so content shifts instead of being overlaid
- sidebar column is viewport-anchored (`sticky top-0 h-screen`) so navigation stays visible while page content scrolls
- only the middle navigation region scrolls (`flex-1 overflow-y-auto`); sidebar header/toggle stays pinned and always visible
- optional sidebar footer content remains fixed (non-scrolling) below the nav region
- when you navigate between pages, sidebar nav scroll resets intentionally to top for consistent behavior
- if your OS enables “Reduce Motion”, sidebar toggle/nav transitions are disabled while layout updates still apply immediately
- tooltip labels are rendered above drawers/modals and are not clipped by table scroll containers
- keyboard navigation in collapsed mode:
  - use `Tab` to move through sidebar items
  - focused items show a visible inset focus ring
  - tooltip labels open on focus (not only on hover)
  - if sidebar is toggled while focus is inside the sidebar, focus remains predictable (kept on toggle if needed) and does not jump to page body
- active item visibility in collapsed mode:
  - active item uses a strong dark background plus white icon color
  - active state remains obvious even without tooltip or label text
- click target behavior in collapsed mode:
  - each nav item keeps a minimum ~44px height for reliable click/tap targeting
  - icons remain centered in the full clickable row
  - clicking anywhere in the row activates the item (no icon-only dead zone)
- no quick-filter groups are shown in the left sidebar
- no `Recently Published` section is shown in the left sidebar
- clicking the top-left Sighthound brand in the header always returns to workspace home (`/`)

## 3. Quick role-based start
### Writer
Goal: move assigned blogs to approved writing states.

Daily flow:
1. Open `My Tasks`
2. Start assigned work
3. Write in your document workflow
4. Submit/advance when complete

### Publisher
Goal: move approved writing to published outcomes.

Daily flow:
1. Open publishing-ready work from Dashboard or Blogs
2. Review content and publishing assets
3. Publish in CMS
4. Add live URL and finalize status

### Admin
Goal: keep workflow, permissions, and data health clean.

Admin responsibilities:
- user/role management
- permission control
- cleanup and recovery workflows
- high-impact controls (including app reset)

## 4. Tables, sorting, and action bars
Global table behavior:
- sort directly from column headers (no separate Sort By dropdown)
- click a header once for ascending, click again for descending
- clicking a different header starts ascending on that column
- `site` is also sortable from table headers

Sort indicators:
- `↕` unsorted
- `↑` ascending
- `↓` descending

Status updates:
- the `Updating results...` message appears below pagination controls for stable layout

Action order is consistent across pages:
- `Copy` → `Customize` → `Import` → `Export`

View toggles (such as Table/Pipeline):
- stay aligned on the far right
- related buttons appear on the left side of the toggle

## 4.5 Icon style standard
To keep the interface clean and predictable:
- UI icons use a consistent open-source line icon set
- emoji-style icons are not used for app controls, status markers, or notifications
- icons are shown inside consistent bounding boxes for alignment
- icon weight/shape is intentionally consistent across pages

## 5. Search and filter behavior
Search is:
- case-insensitive
- partial-match friendly

Filters:
- can be combined
- persist until changed/cleared
- are designed to behave consistently across pages

If no results are found, you should see a clear empty state.
On Dashboard:
- filtered no-results includes actions to clear filters or open import
- no-data state includes actions to add a new blog or open import

## 6. Import workflow (columns + rows)
Imports support both column-level and row-level control before final submit.

You can:
- unselect non-required columns
- select/unselect specific rows in sheet preview
- exclude error rows or unwanted rows before import

Required key columns for blog-style imports:
- `SH` or `RED`
- `Full blog title`
- `Full published blog URL`
- `Blog writer name`
- `Person who published`
- `Date shown on blog (YYYY-MM-DD)`

Notes:
- non-key fields can be completed later
- validation errors are shown clearly so you can correct and retry

## 6.5. Automatic name resolution (Step 1.75)
When you import blogs with writer/publisher names, the system automatically matches those names against existing users to prevent duplicate user creation.

**How it works:**
1. After uploading your file and selecting columns, name resolution runs automatically in the background
2. A confirmation modal appears showing all resolved names
3. The system shows:
   - Which existing user was matched (if found)
   - Match confidence (e.g., "First & Last Name: 95%")
   - A "Recommended" indicator for the best match
4. You can:
   - Accept all resolutions → proceed to preview
   - Change specific matches manually → re-confirm
   - Click "Re-run Resolution" → match names again

**Matching logic:**
The system matches against:
- exact full names
- exact display names
- exact usernames
- first name + last name combinations
- first name only
- last name only

If no matches are found, the system marks the name to create a new user.

**Important:**
- Only valid rows (no errors) participate in name resolution
- You MUST review and accept the automatic resolution before importing
- This prevents accidental duplicate user creation during import

## 7. Ideas workflow rules
On the Ideas page:
- comments and references are visible by default
- inline editing for comments/references is not used in idea cards
- use `Edit Idea` for changes to title/site/comments/references
- ideas can be converted to both blogs and social posts

## 8. Blog status language
Status labels are user-facing and standardized for clarity.

Writer-side labels include:
- `Awaiting Editorial Review`
- `Writing Approved`

Publisher-side status progression:
- `Not Started` → `Publishing in Progress` → `Waiting for Approval` → `Publishing Approved` → `Published`

## 9. Social posts: editor flow and completion rules
Dedicated social editor flow:
1. Setup
2. Link Context (optional)
3. Write Caption
4. Review & Publish

Social status model:
- `Draft`
- `In Review`
- `Changes Requested`
- `Creative Approved`
- `Ready to Publish`
- `Awaiting Live Link`
- `Published`

Next-action cues:
- Draft → Submit for Review
- In Review → Admin Review Needed
- Changes Requested → Apply Changes
- Creative Approved → Add Caption & Schedule
- Ready to Publish → Publish Post
- Awaiting Live Link → Submit Link
- Published → Done

Important:
- social editors can collaborate concurrently on the same post
- status controls only allow valid next-stage transitions (invalid jumps are blocked)
- execution stages (`Ready to Publish`, `Awaiting Live Link`) lock brief fields as read-only
- admins can use `Edit Brief` to reopen an execution-stage post back to `Creative Approved`
- sending an execution-stage post back to `Changes Requested` requires a reason
- use the `Live Links` section in Step 4 to add/save LinkedIn, Facebook, or Instagram URLs
- once at least one live link is saved in `Awaiting Live Link`, the final action changes to `Submit Link`
- at least one public live link (LinkedIn, Facebook, or Instagram) is required before final completion
- if live link is missing, keep the post in `Awaiting Live Link`

### Notifications for social posts
When social post status changes, notifications are sent automatically:
- **Status transitions** — notifications to relevant team members
- **Assignment changes** — if editor or admin is reassigned (backend ready, UI pending)
- **Slack integration** — posts to configured Slack channel and DMs relevant users

You can control which social post notifications you receive in Settings → Notification Preferences.

My Tasks integration:
- social status filter is available directly in `My Tasks`
- clicking social work buckets from workspace home pre-applies matching social task filters in `My Tasks`

## 10. Keyboard shortcuts and quick create
Shortcuts are shown as clickable `Shortcuts` text in the UI.

When clicked, `Shortcuts` opens a modal with key combinations.

Shortcut visibility:
- shown alongside core actions in dropdowns (for example Dashboard, Add New Idea, New Blog, New Social Post)

Quick Create keyboard behavior:
- `↑` / `↓` to move through options
- `Enter` to select
- `Esc` to close
- active option uses a clear visible focus state

## 11. Feedback, validation, and errors
System behavior standards:
- every action should show visible feedback (loading/success/error)
- inline field validation is shown near the field
- errors are written in actionable language
- failed actions should not leave partially applied updates

Error types you may see:
- validation errors (fix input and retry)
- permission errors (check role/access)
- system errors (retry, then report if persistent)

## 12. Activity History (admin only)
**Admin-only feature** for reviewing unified activity records across the application.

**Access**: Settings → Activity History

**What it shows**:
- All login/dashboard activity
- Blog workflow changes (writer/publisher status transitions, assignment changes)
- Social post workflow changes (status transitions, assignment changes)

**How to filter**:
1. **Activity Type**: Use checkboxes to select/unselect activity types
   - All Activity — everything combined
   - Login Only — just sign-in events
   - Dashboard Only — just dashboard visits
   - Blog Activity — blog workflow events
   - Social Post Activity — social post events
2. **User**: Use checkboxes to select/unselect specific users (multi-select available)
3. **Apply Filters**: Click Save to apply your filter selections

**Filter behavior**:
- Multiple activity types are combined with OR (shows any selected type)
- Multiple users are combined with OR (shows any selected user)
- Activity types AND users are combined with AND (must match both)

**Table columns**:
- Category (Login/Dashboard/Blog Activity/Social Post Activity)
- Action (what happened)
- Content (blog/post title, or "—" for access logs)
- User (who performed the action)
- Email (user's email)
- Timestamp (when it happened, in your timezone)

**Content links**:
- Blog activities link to the blog detail page
- Social post activities link to the social post editor
- Click any content title to view the full record

## 12.5 Notification Bell (all users)
The bell icon in the top-right corner shows your notifications and recent activity.

**What you'll see**:
- **Real-time notifications**: Task assignments, status changes, mentions
- **Recent activity**: Latest workflow events across blogs and social posts
- **Unread count**: Badge shows how many new notifications you have

**Click behavior**:
- Click the bell to open the notification drawer
- Click any notification to navigate to the relevant content
- Click "View History" to see full Activity History (admins only)
- Click "Clear All" to dismiss visible notifications

**Notification types**:
- Task Assigned — you're now responsible for a blog or social post
- Stage Changed — content moved to a new workflow stage
- Submitted for Review — someone needs your review
- Published — content went live
- Awaiting Action — something needs your attention
- Mention — someone mentioned you in a comment

## 13. Settings page organization
Settings is organized into clear sections:

### My Profile
- Update first name, last name, and display name
- Set your personal timezone
- Configure week start day (Monday or Sunday)
- Set stale draft threshold (days before drafts are flagged)

### Connected Services
- View Google and Slack connection status
- Shows which OAuth providers you've used to sign in
- Helps you track available authentication methods

### Notification Preferences
- Enable/disable all notifications
- Toggle individual notification types
- Configure Slack delivery preferences

### Workspace Defaults
- System-wide defaults (admin-configurable)

### Access & Oversight (admin-only)
- Permissions panel entry
- Quick View — switch into non-admin user context for troubleshooting

### Team Administration (admin-only)
- Create User Account
- Reassign User Work
- User Directory with role/status filters

### System Maintenance (admin-only)
- Activity History Cleanup — remove test data or old records
- Danger Zone: Wipe App Clean — factory reset (destructive)

Critical rule:
- only an admin can run `Wipe App Clean`
- this reset removes operational data across the app while preserving the initiating admin account itself
- the initiating admin's own content/activity records are also wiped as part of the reset behavior
- optional: enable `Also remove all other admin profiles and auth accounts` in the wipe confirmation modal to delete other admin accounts; leave it unchecked to preserve them

## 14. Interaction consistency expectations
For consistent UX:
- dropdowns and modals close when focus is lost (click outside)
- copy actions in Quick Actions show a global visual confirmation
- table layout remains stable during sorting, filtering, and pagination updates

If these behaviors are missing, report it as a bug.

## 15. Password reset (test-only)
**Note:** This feature is temporary and for testing purposes only. It will be removed before production deployment.

Admins can manually reset passwords for any user (admin or non-admin) via the User Directory:
1. Open Settings → User Directory
2. Click "Edit" on any user
3. Scroll to "Reset Password (Test Only)" section
4. Enter a new password (minimum 8 characters)
5. Click "Reset Password"
6. Confirm the change in the modal

The user can then log in with their new password. This is intended for testing and administrative purposes only.

## 16. Keyboard shortcuts
Shortcuts are shown as clickable `Shortcut` text in the UI.

When clicked, `Shortcut` opens a modal with available key combinations.

**Navigation shortcuts**:
- `⌘K` (Mac) or `Ctrl+K` (Windows) — Open command palette
- `Esc` — Close modals and dropdowns

**Quick Create shortcuts** (when Quick Create is open):
- `↑` / `↓` — Move through options
- `Enter` — Select current option
- `Esc` — Close without selecting

**Table shortcuts**:
- Click column headers to sort (click again to reverse)
- `↕` shows unsorted, `↑` shows ascending, `↓` shows descending

## 17. Feedback and copy actions
**Visual feedback**:
- Success actions show confirmation in bottom-left corner
- Loading states show progress indicators
- Errors show actionable messages (what went wrong + how to fix)

**Copy to clipboard**:
- Copy actions in Quick Actions show visual confirmation
- Look for the "Copied" indicator near the sidebar

**Table updates**:
- "Updating results..." appears below pagination during sorts/filters
- This prevents table jumping and keeps layout stable
