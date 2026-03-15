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
- clickable pipeline sections that filter the table (writer and publisher lanes)
- focus strip (`Today`) with:
  - scheduled this week
  - ready to publish
  - delayed (scheduled publish date is in the past and overall status is not `Published`)
- metrics are clickable and act as table filters
- searchable/filterable table with:
  - site badges (`SH`, `RED`)
  - clamped titles for readability
  - urgency row tones (overdue/ready/publishing)
  - inline writer/publisher stage update dropdowns (permission-based)
- active filter chips + one-click clear-all behavior
- exports:
  - Export View CSV
  - Export Selected CSV (permission-based)
- Edit Columns popover
- bottom pagination controls
- right-side blog detail panel
### Blog Library (`/blogs`)
Use Blog Library as a fast reference index for published and historical content.

Default behavior:
- published blogs only
- sorted by display publish date, newest first

Key behavior:
- minimal table for lookup/copy workflows:
  - Sr #
  - Blog Title
  - Live URL
  - Published Date
  - Site badge (`SH`/`RED`)
- copy interactions:
  - row-level copy controls for title/URL (shown on row hover)
  - copy-all titles
  - copy-all URLs
- filters:
  - published / unpublished scope
  - stage filter
  - website filter
- exports:
  - View Export: CSV + PDF (`export_csv`)
  - Selected Export: CSV (`export_selected_csv`)

### CardBoard (`/blogs/cardboard`)
Use CardBoard for kanban-style pipeline management.
- drag cards between stages (`Idea`, `Writing`, `Reviewing`, `Publishing`, `Published`)
- stage moves enforce workflow permissions and required fields
- stage columns open corresponding table filters in `/blogs`
- quick-add from `Idea` for fast backlog intake
- card-level quick actions (open links, copy title/URL, edit)

### Tasks (`/tasks`)
Use Tasks for day-to-day execution.
- Top 3 priority items shown first
- Expand to full paginated list
- Priority indicators:
  - `⚠ Overdue`
  - `Due Soon`
  - `Upcoming`

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

### Social Post Editor (`/social-posts/[id]`)
- focused editor for one social post at a time
- autosave + manual save
- caption formatting helpers (LinkedIn-friendly)
- blog lookup/linking, platform selection, checklist, and copy utilities

### Settings (`/settings`)
- self profile fields
- admin-level user management and role assignments
- admin-only activity cleanup:
  - delete all activity history
  - delete history for selected users
  - optional comments cleanup (blog + social comments)
- admin quick-view as non-admin user:
  - switch into writer/publisher/editor perspective
  - actions are executed/logged as selected user until return

### Permissions (`/settings/permissions`) (Admin with manage permission)
- role-by-role permission matrix
- reset a role to defaults
- permission change audit log
- shown in sidebar only for admin users

## 3) Workflow basics
Lifecycle used across CardBoard + filtering:
- `Idea → Writing → Reviewing → Publishing → Published`
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
Queue buttons are one-click filters (they do not mutate blog state).

Writer queues:
- Drafting
- Needs Revision
- Ready for Publishing

Backlog:
- Backlog (unscheduled ideas)

Publisher queues:
- Not Started
- In Progress
- Final Review
- Published

## 5) Comments and activity
- comments are per-blog
- social post comments and activity history are tracked in social workflow
- activity log records assignment/status transitions and permission changes
- use comments for operational context and handoff notes

## 6) Troubleshooting (end user)
### “I cannot update status or assignment”
- your role may not have that permission
- ask admin to review role permissions in `/settings/permissions`

### “I can’t export rows”
- View Export requires `export_csv` (Dashboard view CSV, Blog Library view CSV/PDF)
- Selected Export requires `export_selected_csv` (Dashboard selected CSV, Blog Library selected CSV)

### “My queue looks empty”
- confirm assignment and stage
- confirm active queue filter isn’t too narrow

### “Comments or profile updates fail”
- refresh and retry once
- if persistent, report to operator for migration/schema check

### “I’m seeing actions under the wrong user”
- check whether admin quick-view mode is active
- use “Return to Admin” before continuing admin operations

## 7) Best practices
- keep stage status current; it drives all operational views
- use queue filters instead of manual searching first
- keep scheduled dates realistic to reduce overdue noise
- use comments for decisions and blockers, not side channels
- use Blog Library (`/blogs`) for fast title/URL lookup and copy tasks
