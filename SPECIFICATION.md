# SPECIFICATION.md

## 1) Product scope
Content Relay manages two content pipelines:
- Blogs
- Social Posts

The product goal is predictable stage-based execution with explicit ownership and required-field validation before each transition.

## 2) Shared workflow model
### Concepts
- **Stage**: current workflow state
- **Gate**: required condition for transition
- **Handoff**: owner change from one function to another
- **Terminal stage**: complete; no further transitions expected

### Ownership contract
- Work stages are execution-owner actions.
- Review stages are reviewer actions.
- Terminal stages have no active owner.

## 3) Social post status contract
### Canonical statuses
1. `draft`
2. `in_review`
3. `changes_requested`
4. `creative_approved`
5. `ready_to_publish`
6. `awaiting_live_link`
7. `published` (terminal)

### Allowed transitions
- `draft` → `in_review`
- `in_review` → `creative_approved`
- `in_review` → `changes_requested`
- `changes_requested` → `in_review`
- `creative_approved` → `ready_to_publish`
- `ready_to_publish` → `awaiting_live_link`
- `ready_to_publish` → `changes_requested`
- `awaiting_live_link` → `published`
- `awaiting_live_link` → `changes_requested`

### Draft creation contract
- New social posts are created in `draft`.
- Required at create: `product`, `type`, `worker_user_id` (assigned owner), `reviewer_user_id`.
- Optional at create: `title`, `platforms`, `scheduled_date`, `associated_blog_id`.
- If `title` is empty at create, API normalizes it to `Untitled social post` to keep create non-blocking.

### Required fields by transition target
| Target status | Required fields |
|---|---|
| `in_review` | `product`, `type`, `canva_url` |
| `creative_approved` | `product`, `type`, `canva_url`, `platforms`, `caption`, `scheduled_date` |
| `ready_to_publish` | `product`, `type`, `canva_url`, `platforms`, `caption`, `scheduled_date` |
| `awaiting_live_link` | `product`, `type`, `canva_url`, `platforms`, `caption`, `scheduled_date` |
| `published` | all above + at least one valid live link |

### Rollback and lock rules
- Execution-stage rollback to `changes_requested` requires a non-empty reason.
- `published` transition requires at least one valid public live link.
- Execution stages lock brief edits for non-admin execution flow.

## 4) Blog workflow contract
### Operational sequence
Writing flow → Writing Approved handoff → Publishing in Progress → Awaiting Publishing Approval → Publishing Approved → Published

### Behavior rules
- Writing completion is the handoff trigger into publishing.
- Publishing completion must not bypass writing prerequisites.
- Reviewer checkpoint at `Awaiting Publishing Approval` is required before final completion.
- When publishing transitions to `completed`, `actual_published_at` is auto-captured if empty.

## 5) Queue and visibility contract
### My Tasks
- Mixed list of blog and social work.
- Action-state split:
  - `Required by me`
  - `Waiting on Others`

### Workspace home summary
- Home standup cards and `My Tasks Snapshot` share the same assignment/action-state classification model.
- Blog counts must account for direct writer/publisher ownership and pending review ownership from `task_assignments`.
- Actionable (`action_required`) ownership is the source for standup card counts, so cards stay in sync with the `Required by me` snapshot group.
- If a user has multiple associations on one blog, candidate selection must prioritize `action_required` before `waiting_on_others`.
- Social summary/snapshot ownership classification must evaluate current assignee ownership (`assigned_to_user_id`) and gracefully fall back to legacy owner columns for compatibility.
- Dashboard social metrics must keep rendering when social ownership columns are unavailable by retrying with the legacy social-owner query shape.

### Dashboard
- Cross-content queue with filtering and sorting.

### Calendar
- Date-based schedule view for planning and rescheduling.

## 6) Link behavior contract
- Internal links open in same tab.
- External links open in new tab.
- Social post final completion requires saved live-link proof.
- Slack workflow alerts include `Open link: <deep link>` for linkable blog/social records.
- Slack deep-link base URL resolution is deterministic: `NEXT_PUBLIC_APP_URL` → `APP_URL` → `https://sighthound-content-ops.vercel.app`.
- Slack delivery suppresses preview unfurls (`unfurl_links: false`, `unfurl_media: false`) while retaining clickable links.
- Blog/social comment creation emits Slack alerts with full multi-line comment text plus actor context (`By: <name>`).
- Slack comment payload rendering preserves line breaks, caps length defensively, and neutralizes ping tokens before delivery.

## 6.1) Record detail section ordering contract
- On blog detail surfaces with links and history blocks:
  - `Comments` appears before `Links`.
  - `Links` appears above assignment/change history.
  - Assignment/change history remains the final block.
- On social post detail/editor surfaces:
  - Section order is `Setup` → `Assignment` → `Associated Blog` → `Write Caption` → `Review & Publish` → `Comments` → `Current Snapshot` → `Checklist` → `Assignment & Changes`.
  - Live-link inputs are part of `Review & Publish` (not a standalone `Links` section).
  - History/changes sections are labeled `Assignment & Changes` (not `Activity`).
- This ordering applies to both full pages and detail drawers.
- Both detail pages expose a top `Next Action` strip with:
  - primary CTA and owner handoff summary
  - explicit saved/unsaved state
  - preflight readiness count and missing-field jump cues
- Both detail pages include a compact in-page section navigator (`Jump to`) with anchor links.
- Assignment/change history readability is improved via grouped day buckets and clearer empty-state guidance.
- Detail-page responsive rail contract:
  - At `xl`+, both `/blogs/[id]` and `/social-posts/[id]` render a right rail column for next-action/preflight context.
  - Below `xl`, right-rail cards collapse into the primary column in normal document flow.
  - Sticky positioning is applied to a single right-rail wrapper on `xl`+ to avoid multi-sticky collision.

## 7) API behavior contract (high-level)
- Workflow transitions are API-authoritative.
- Request validation occurs at API boundary.
- Client-side transitions cannot bypass server transition rules.
- API responses follow a stable success/error contract for predictable client behavior.

## 8) Date and timezone contract
- User-facing timestamps are rendered by user timezone preference.
- Date-only values use date-only formatter utilities to avoid timezone day shifts.

## 9) Import behavior contract
- Import supports selective column inclusion.
- Import supports row selection before commit.
- Required key columns must be present.
- Optional missing values can use deterministic fallback rules.
- Existing rows can be updated when import identity match succeeds.

## 10) Definition of done for workflow changes
A workflow change is complete only when:
1. Status/transition logic is updated and validated.
2. Required-field gates are enforced.
3. Queue ownership behavior remains consistent.
4. Documentation is updated in:
   - `README.md`
   - `HOW_TO_USE_APP.md`
   - `OPERATIONS.md`
   - `SPECIFICATION.md`
