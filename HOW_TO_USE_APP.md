# Content Relay — User Manual

## Quick links
- [Dashboard](/dashboard)
- [My Tasks](/tasks)
- [Blogs](/blogs)
- [Social Posts](/social-posts)
- [Ideas](/ideas)
- [Calendar](/calendar)
- [Settings](/settings)
- [User Manual page](/resources)

## 1) What this app does
Content Relay is a stage-based content operations app with two tracks: Blogs and Social Posts. It moves work from intake to published output with explicit ownership, required-field gates, and clear handoffs.

### The two tracks
| Track | What it manages | End state |
|---|---|---|
| Blogs | Writing and publishing workflow | Published blog |
| Social Posts | Creative, review, publish, live-link proof | Published social post with valid live link |

## 2) Key concepts and ownership
| Term | Meaning |
|---|---|
| Stage | Current workflow state |
| Gate | Required fields/conditions before transition |
| Handoff | Ownership transfer between actors |
| Terminal stage | Completed state with no active owner |

Ownership rule:
- Work stage = execution owner acts
- Review stage = reviewer acts
- Terminal stage = done

## 3) Social post pipeline
| Status | Owner | Required action |
|---|---|---|
| Draft | Creator/Worker | Complete essentials and submit for review |
| In Review | Reviewer | Approve or request changes |
| Changes Requested | Creator/Worker | Apply changes and resubmit |
| Creative Approved | Reviewer | Confirm handoff to execution |
| Ready to Publish | Creator/Worker | Publish post |
| Awaiting Live Link | Creator/Worker | Submit live-link proof |
| Published | Terminal | Done |

Mandatory gates:
- Social post creation in `Draft`: Product, Type, Assigned to, Reviewer
- Optional at create: Title, Platforms, Scheduled date, Associated blog
- If Title is left empty at create, the app saves it as `Untitled social post`
- `Draft → In Review`: Product, Type, Canva URL
- Execution transitions: Product, Type, Canva URL, Platforms, Caption, Scheduled Publish Date
- `Awaiting Live Link → Published`: at least one valid public live link
- In Social Posts list view, `Delete Selected` processes selected posts in one batch and shows a single summary (deleted, skipped published, and failed if any).

Rollback rule:
- Execution rollback to `Changes Requested` requires a non-empty reason.

Flow:
`Draft → In Review → (Changes Requested ↔ In Review) → Creative Approved → Ready to Publish → Awaiting Live Link → Published`

## 4) Blog pipeline
| Stage | Owner | Required action |
|---|---|---|
| Writing stages | Assigned writing owner | Draft and refine content |
| Writing Approved | Handoff point | Transfer execution to publishing |
| Publishing in Progress | Assigned publishing owner | Execute publishing prep |
| Awaiting Publishing Approval | Reviewer checkpoint | Validate readiness |
| Publishing Approved | Assigned publishing owner | Complete final publish action |
| Published | Terminal | Done |

Key rule:
- Publishing completion should not bypass writing completion and review checkpoint.
- If Actual Published Date is empty, it is auto-captured when publishing is marked complete.

## 5) Daily execution rhythm
1. Open [My Tasks](/tasks)
2. Execute `Required by me`
3. Validate required fields/checklists
4. Transition when target-stage gate is satisfied
5. Track blockers in `Waiting on Others`

What “explicit updates” means:
- Stage reflects true progress
- Rollback includes reason
- Publish includes required proof/link data

## 6) Visibility tools
| Tool | What it shows | When to use |
|---|---|---|
| [My Tasks](/tasks) | Assigned work + blocked handoffs (from unified server queue) | Daily execution |
| [Dashboard](/dashboard) | Cross-content queue health + server-backed overview cards | Triage and prioritization |
| [Calendar](/calendar) | Scheduled workload by date | Planning and sequencing |
| Notifications | Assignment and stage updates | Respond to change quickly |

Calendar overview behavior:
- `Overview` includes scheduled items from previous month, current month, and next month.
- Status pills use one normalized language/color system for mixed blog/social rows (`In Progress`, `In Review`, `Ready`, `Awaiting Live Link`, `Published`, `Changes Requested`).
- Overview row titles are single-line truncated with full-title tooltip on hover.
- Unscheduled cards with zero items no longer show expand chevrons and display passive empty-state copy (`No unscheduled blogs`, `No unscheduled social posts`).
- Top calendar controls follow one hierarchy:
  - sticky primary nav row: `← Prev`, `Today`, `Next →`, month picker popover, and `Month/Week`
  - secondary compact control row: `View`, content toggles, `Assigned to`
- `Today · <date>` chip appears near the month picker for fast temporal orientation.
- The `This Week` summary card is intentionally removed to reduce visual density.
- Day headers no longer show item count badges (reduced clutter), and month view applies a subtle current-week background band.
- The top header no longer repeats timezone/week-start text, and top controls use neutral labels (no role-heavy wording).
- Active filter pills are hidden completely when there are no active filters (no reserved blank row).
- Top controls use a single outer container with lighter inner separation (reduced border noise).
- Calendar event cards now show one metadata line by default; secondary details remain in hover tooltips.
- Unscheduled zero-count states are muted single-line messages without extra box chrome.

Home page consistency rule:
- The top standup cards and `My Tasks Snapshot` use the same assignment/action-state model.
- If a review assignment appears under `Required by me`, the matching status count should also be reflected in the standup cards.
- If you are associated to the same blog in multiple ways, `Required by me` takes precedence over waiting-state classification.
- Social task ownership checks use the current assignee model first and fall back to legacy owner columns when required for compatibility.
- Dashboard overview social counts follow the same compatibility fallback so social work does not disappear from overview cards if ownership columns are temporarily unavailable.
- Dashboard cards and snapshots are optimized for a fast, smooth experience and refresh seamlessly in the background as you move through the app.

### Dashboard filtering (quick use)
- Start with `Lens` for common triage views:
  - `All Work`
  - `Needs My Action`
  - `Awaiting Review`
  - `Ready to Publish`
  - `Awaiting Live Link`
  - `Published Last 7 Days`
- Use `Save current lens` to pin frequently used lenses under `Lens shortcuts`.
- Use compact default filters for quick narrowing: `Content Type`, `Status`, `Assigned to`, `Site`.
- Filter option labels include contextual counts so you can preview result size before selecting.
- Open `More filters` only when needed for delivery and detailed blog/social workflow filters.
- Advanced filters are context-aware:
  - Blog advanced filters affect only blog rows.
  - Social advanced filters affect only social rows.
- Search applies a short debounce so filtering stays smooth while typing on larger datasets.

### Detail page section order
Blog detail views:
1. `Comments`
2. `Links`
3. `Assignment & Changes`

Social post editor views:
1. `Setup`
2. `Assignment`
3. `Associated Blog`
4. `Write Caption`
5. `Review & Publish`
6. `Comments`
7. `Current Snapshot`
8. `Checklist`
9. `Assignment & Changes`

Naming rule:
- Social post history sections must use `Assignment & Changes` (not `Activity`).

Shared detail-page usability helpers:
- Top `Next Action` strip shows the primary action, current/next owner, and readiness hints.
- `Jump to` links let you jump directly to major sections.
- Save state is explicit: `Unsaved changes` vs `All changes saved`.
- `Assignment & Changes` is grouped by day for easier scanning.
- Responsive right rail behavior is consistent on both detail pages:
  - `lg` and above: right rail is visible and sticky.
  - Below `lg`: right-rail cards move into the main vertical flow (no side column).

## 7) Transition gates reference
- Never transition without required target-stage fields.
- Never publish social content without a saved valid live link.
- Never rollback execution-stage social work without a reason.
- Never finalize blog publishing before writing handoff and reviewer checkpoint.

## 8) Setup and intake basics
- Create work from direct create or conversion from [Ideas](/ideas).
- Assign clear ownership before first transition.
- Confirm first-stage required fields at creation time.
- Use [Settings](/settings) to configure profile/timezone/notifications.
- Your selected timezone in Settings is used across comments, timelines, tables, calendar, and record history displays.
- The only UTC exception is admin Activity History in Settings, which stays in UTC for cross-user operations.
- Keep deployments on latest database migrations so dashboard/task queues remain responsive at higher data volume.
- Protected pages require a valid signed-in session; if your session expires you’ll be redirected to [Login](/login) and can continue after signing in again.

## 9) Quick SOP card
1. Open [My Tasks](/tasks)
2. Work `Required by me`
3. Check transition gates
4. Move stage
5. Confirm handoff or wait-state

## 10) Associated Content: Navigating between blogs and social posts
### Quick navigation patterns
- **Dashboard**: Click the "Associated Content" badge on any row:
  - Blog row → Shows count + titles of linked social posts → Click to navigate to `/social-posts?associated_blog={blogId}`
  - Social row → Shows associated blog title → Click to navigate to `/blogs?filter={blogId}`
- **Blog detail drawer**: "Associated Social Posts" section shows all posts linked to that blog
  - Each post title is clickable → Opens full social post detail page
  - View post type, status, platforms, and scheduled date at a glance
- **Social post detail page**: "Associated Blog" context card shows the linked blog
  - Blog title is clickable → Opens full blog detail view
  - Shows blog's writer/publisher status and scheduled dates
  - Quick links to draft doc and live blog URL for reference

### Social posts list filtering
- Use the "Associated Blog" dropdown filter to narrow by linked blog:
  - Default: `All Blogs` (shows all social posts)
  - Select a blog name to show only social posts linked to that blog
  - Selected filter appears in the active filter pills (removable with X)
  - Combine with Status filter for precise triage
- Filter respects deep-linked URL params: `?associated_blog={blogId}`
- Click "Clear all filters" to reset to default view

### Workflow example: Blog → Social posts
1. Open [Dashboard](/dashboard)
2. Find a blog row with linked social posts (badge shows count)
3. Click the "Associated Content" badge → Filtered social posts list
4. Review all social posts for that blog
5. Click a social post title → Opens full social post editor

### Workflow example: Social post → Blog context
1. Open [Social Posts](/social-posts)
2. Click a social post title → Enters full editor view
3. Scroll to "Associated Blog" section (before Comments)
4. Review linked blog status and scheduled dates
5. Click blog title or "Open blog" button → Navigates to blog detail page

## 11) Slack workflow alerts
|- Workflow updates are posted to `#content-ops-alerts`.
|- Each Slack workflow alert includes a clickable `Open link:` line when the item is linkable.
|- If app URL config is missing, links still work via fallback base URL: `https://sighthound-content-ops.vercel.app`.
|- Link previews are intentionally suppressed to keep channel alerts compact.
|- New blog/social comments also post to Slack with full comment text (multi-line), plus author and record context.
