# How to Use Sighthound Content Ops (End-User Guide)

This is the primary usage guide for existing and future end users.

## 1) What this app is for
Use this app to track and coordinate blog production across:
- `sighthound.com`
- `redactor.com`

You can:
- see what work is assigned
- update writing/publishing status
- manage scheduling and publish metadata
- collaborate with comments

You cannot:
- write or edit blog body content directly in this app

## 2) Main pages
### Dashboard (`/dashboard`)
Best for overall pipeline visibility and admin coordination.
- Filter/search blogs
- Adjust visible columns with **Edit Columns**
- Use bottom pagination controls
- Open blog detail panel for quick updates

### Tasks (`/tasks`)
Best for personal execution.
- Shows your top 3 prioritized pending tasks first
- Click **View all tasks** for the full list (paginated)
- Priority tags:
  - `⚠ Overdue`
  - `Soon` (due within 3 days)

### Calendar (`/calendar`)
Best for schedule planning.
- Monthly view with today/current-week emphasis
- Month jump selector
- “No Publish Date” section for unscheduled blogs

### Blog detail (`/blogs/[id]`)
Best for record-level work.
- Update assignment/status fields (role-permitted)
- Add/read comments
- Review assignment/activity history

### Add Blog (`/blogs/new`) (Admin)
Create new blog records and optionally add initial comment.

### Settings (`/settings`)
- Manage your profile name fields
- Admins can manage user roles and defaults

## 3) Common workflows
### Writer workflow
1. Open assigned task/blog
2. Update Writer Status
3. Add/maintain Google Doc URL
4. Mark writing complete when ready

### Publisher workflow
1. Open assigned task/blog
2. Update Publisher Status
3. Add Live URL when published
4. Mark publishing complete

### Admin workflow
1. Create and assign blogs
2. Adjust dates and assignees
3. Monitor dashboard/task/calendar
4. Manage user roles in settings

## 4) Task prioritization logic
Task order is optimized for action:
1. Overdue scheduled tasks first
2. Nearest scheduled date next
3. Status urgency next

This helps users focus on what needs attention now.

## 5) Commenting
- Comments are linked to blogs.
- Use comments for coordination and internal notes.
- If comments appear unavailable, contact an operator to verify DB migration state.

## 6) Status and date expectations
- Keep statuses current to maintain accurate dashboards/tasks.
- Keep scheduled dates updated; this drives ordering and urgency indicators.
- `overall_status` is system-derived from stage statuses.

## 7) Troubleshooting for end users
### I cannot save a profile update
- Refresh once and try again.
- If still blocked, contact admin/operator (may be environment migration drift).

### Comments are unavailable
- Report this to operator; they likely need to run/reconcile latest migrations.

### Task list looks incomplete
- Confirm you are assigned as writer/publisher.
- Confirm status is not already completed for that stage.

## 8) Best practices
- Keep assignment and stage statuses updated in real-time.
- Add concise comments instead of ad-hoc side-channel notes.
- Use Tasks page for daily work and Dashboard/Calendar for planning alignment.
