# How to Use Sighthound Content Ops (End-User Guide)
Use this app to coordinate blog production across `sighthound.com` and `redactor.com`.
It tracks workflow, ownership, dates, and publishing state. It is not a CMS.

## 1) What this app does
You can:
- manage writing and publishing workflow status
- see assignment queues and schedule priorities
- update links/dates where your permissions allow
- collaborate with comments

You cannot:
- write blog body content in-app
- bypass permission rules without admin override capabilities

## 2) Main pages
### Dashboard (`/dashboard`)
Use Dashboard for operations scanning and bulk coordination.

Highlights:
- queue-based sidebar:
  - **Your Writing Work**
  - **Backlog**
  - **Your Publishing Work**
- clickable pipeline chips that filter the table
- focus strip (`Today`) with:
  - scheduled this week
  - ready to publish
  - delayed
- searchable/filterable table with:
  - site badges (`SH`, `RED`)
  - clamped titles for readability
  - urgency row tones (overdue/ready/publishing)
- exports:
  - Export View CSV
  - Export Selected CSV (permission-based)
- Edit Columns popover
- bottom pagination controls
- right-side blog detail panel

### Tasks (`/tasks`)
Use Tasks for day-to-day execution.
- Top 3 priority items shown first
- Expand to full paginated list
- Priority indicators:
  - `⚠ Overdue`
  - `Soon`

### Calendar (`/calendar`)
Use Calendar for schedule planning.
- month/week calendar modes
- month view grouped by week with blog lines beneath week row
- drag-and-drop scheduling (permission-based, not allowed for published blogs)
- unscheduled list for blogs with no publish date

### Blog detail (`/blogs/[id]`)
Use detail pages for record-level edits:
- assignment/status updates (permission-based)
- schedule/display date edits (permission-based)
- comments and activity history

### Ideas (`/ideas`)
- manage blog idea backlog
- convert ideas into blog records

### Social Posts (`/social-posts`)
- track social posting workflow linked to content operations

### Settings (`/settings`)
- self profile fields
- admin-level user management and role assignments

### Permissions (`/settings/permissions`) (Admin with manage permission)
- role-by-role permission matrix
- reset a role to defaults
- permission change audit log

## 3) Workflow basics
### Writer
1. Open queue/task/blog
2. Update `writer_status`
3. Maintain Google Doc URL
4. Submit draft when complete

### Publisher
1. Open queue/task/blog
2. Update `publisher_status`
3. Maintain live URL and publish metadata
4. Complete publishing when done

### Editor/Admin
1. triage backlog and assignments
2. manage schedule risk and delayed items
3. monitor metrics and publish cadence
4. adjust roles/permissions as needed

## 4) Queue behavior (Dashboard)
Queue buttons are one-click filters.

Writer queues:
- Writing Not Started
- Writing In Progress
- Needs Revision
- Completed — Waiting for Publishing

Backlog:
- Unscheduled Ideas

Publisher queues:
- Publishing Not Started
- Publishing In Progress
- Ready for Final Review
- Published

## 5) Comments and activity
- comments are per-blog
- activity log records assignment/status transitions
- use comments for operational context and handoff notes

## 6) Troubleshooting (end user)
### “I cannot update status or assignment”
- your role may not have that permission
- ask admin to review role permissions in `/settings/permissions`

### “I can’t export selected rows”
- this is controlled by `export_selected_csv` permission

### “My queue looks empty”
- confirm assignment and stage
- confirm active queue filter isn’t too narrow

### “Comments or profile updates fail”
- refresh and retry once
- if persistent, report to operator for migration/schema check

## 7) Best practices
- keep stage status current; it drives all operational views
- use queue filters instead of manual searching first
- keep scheduled dates realistic to reduce overdue noise
- use comments for decisions and blockers, not side channels
