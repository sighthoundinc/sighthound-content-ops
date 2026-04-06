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
| [My Tasks](/tasks) | Assigned work + blocked handoffs | Daily execution |
| [Dashboard](/dashboard) | Cross-content queue health | Triage and prioritization |
| [Calendar](/calendar) | Scheduled workload by date | Planning and sequencing |
| Notifications | Assignment and stage updates | Respond to change quickly |

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

## 9) Quick SOP card
1. Open [My Tasks](/tasks)
2. Work `Required by me`
3. Check transition gates
4. Move stage
5. Confirm handoff or wait-state

## 10) Slack workflow alerts
- Workflow updates are posted to `#content-ops-alerts`.
- Each Slack workflow alert includes a clickable `Open link:` line when the item is linkable.
- If app URL config is missing, links still work via fallback base URL: `https://sighthound-content-ops.vercel.app`.
- Link previews are intentionally suppressed to keep channel alerts compact.
- New blog/social comments also post to Slack with full comment text (multi-line), plus author and record context.
