# Sighthound Content Ops — User Guide

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
- `Login` supports:
  - `Continue with Google` (Google Workspace SSO)
  - email/password credentials (admin-managed accounts)
- `Login` uses a decluttered premium layout:
  - brand context on the left
  - focused sign-in card on the right
- After signing in, users are routed to the workspace home page (`/`)

## 1.6 Daily Standup Home Page
The home page is your daily standup—a quick view of what needs your attention:

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

Filter groups in the left sidebar:
- `Writer Filters`
- `Publisher Filters`

Behavior:
- both filter groups are collapsed by default
- each group toggles independently (opening one does not open/close the other)
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
- at least one public live link (LinkedIn, Facebook, or Instagram) is required before final completion
- if live link is missing, keep the post in `Awaiting Live Link`

## 10. Keyboard shortcuts and quick create
Shortcuts are shown as clickable `Shortcut` text in the UI.

When clicked, `Shortcut` opens a modal with key combinations.

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

## 12. Permissions and sensitive actions
Permissions are role-based and strictly enforced.

Settings page organization:
- `My Profile` — update first name, last name, and display name
- `Workspace Defaults` — timezone, week start, and stale draft threshold
- `Access & Oversight` — open the Permissions panel and run Quick View as a non-admin user
- `Create User Account` + `Reassign User Work` — team admin actions
- `User Directory` — role/status filters and per-user edit/delete controls
- `Activity History Cleanup` + `Danger Zone: Wipe App Clean` — destructive admin maintenance tools

Critical rule:
- only an admin can run `Wipe App Clean`
- this reset removes operational data across the app while preserving the initiating admin account itself
- the initiating admin’s own content/activity records are also wiped as part of the reset behavior
- optional: enable `Also remove all other admin profiles and auth accounts` in the wipe confirmation modal to delete other admin accounts; leave it unchecked to preserve them

## 13. Interaction consistency expectations
For consistent UX:
- dropdowns and modals close when focus is lost (click outside)
- copy actions in Quick Actions show a global visual confirmation
- table layout remains stable during sorting, filtering, and pagination updates

If these behaviors are missing, report it as a bug.
