# Documentation Brief: Content Relay Web App
## Section 1 — What This App Does
### Purpose (plain English)
Content Relay is a stage-based content operations app that moves work from intake to live publication with clear ownership, required-field gates, and visible handoffs so teams can execute without guessing what to do next.

### The two tracks
| Track | What it manages | End state |
|---|---|---|
| Blogs | Long-form editorial and publishing workflow | Blog is published |
| Social Posts | Social creative + review + posting + proof-of-publication | Post is published with at least one live link |

### How they differ operationally
| Area | Blogs | Social Posts |
|---|---|---|
| Workflow shape | Writing flow plus publishing flow | Single end-to-end social status flow |
| Midpoint handoff | Writing completion hands off to publishing | Creative review hands off back to execution owner |
| Final gate | Publishing completion rules | Live link gate before `Published` |
| Terminal behavior | Published content exits active workflow | `Published` is terminal; no active owner |

## Section 2 — Key Concepts & Roles
### Roles
| Role | Practical responsibility |
|---|---|
| Creator/Worker (Assigned owner) | Executes drafting, revisions, publishing actions, and link submission |
| Reviewer | Reviews quality, requests changes, or approves forward movement |
| Admin | Configures users/permissions and can perform operational overrides/tools |

### Core concepts
| Term | Definition |
|---|---|
| Stage | A named workflow status that controls what happens next |
| Gate | A required condition that must be true before stage transition |
| Handoff | Ownership change between execution and review functions |
| Terminal stage | Final stage where no further workflow action is expected |

### Ownership rule of thumb
- Work stage = execution owner acts.
- Review stage = reviewer acts.
- Terminal stage = done, no active owner.

## Section 3 — Social Post Pipeline
### Stage-by-stage map
| Status | Owner | Required action |
|---|---|---|
| Draft | Creator/Worker | Complete essentials and submit for review |
| In Review | Reviewer | Approve or send back with changes |
| Changes Requested | Creator/Worker | Apply requested changes and resubmit |
| Creative Approved | Reviewer | Confirm approval and handoff readiness |
| Ready to Publish | Creator/Worker | Execute publishing step |
| Awaiting Live Link | Creator/Worker | Submit at least one public live link |
| Published | Terminal (no owner) | Workflow complete |

### Mandatory gates
| Transition target | Must be present |
|---|---|
| `in_review` | `product`, `type`, `canva_url` |
| `creative_approved` | `product`, `type`, `canva_url`, `platforms`, `caption`, `scheduled_date` |
| `ready_to_publish` | `product`, `type`, `canva_url`, `platforms`, `caption`, `scheduled_date` |
| `awaiting_live_link` | `product`, `type`, `canva_url`, `platforms`, `caption`, `scheduled_date` |
| `published` | All above + at least one valid live link record |

### Rollback rule
- Backward transitions from execution stages to `changes_requested` require a non-empty reason:
  - `ready_to_publish` → `changes_requested`
  - `awaiting_live_link` → `changes_requested`

### Visual flow
`Draft → In Review → (Changes Requested ↔ In Review) → Creative Approved → Ready to Publish → Awaiting Live Link → Published`

## Section 4 — Blog Pipeline
### Stage-by-stage map
| Stage | Owner | Required action |
|---|---|---|
| Writing stages (drafting/review) | Assigned writing owner | Produce and refine content until writing approval |
| Writing Approved | Handoff point | Transfer execution responsibility to publishing flow |
| Publishing in Progress | Assigned publishing owner | Prepare publish-ready metadata, timing, and final checks |
| Awaiting Publishing Approval | Reviewer/Admin checkpoint | Validate readiness and approve or request fixes |
| Publishing Approved | Assigned publishing owner | Complete final publication action |
| Published | Terminal (no owner) | Workflow complete |

### Writing → Publishing handoff (critical)
- Writing completion is the operational handoff from writing owner to publishing owner.
- Publishing work should not be marked complete before writing requirements are satisfied.
- Reviewer/admin checkpoint at `Awaiting Publishing Approval` exists to prevent premature publishing.

## Section 5 — Daily Execution Rhythm (External-primary)
### 5-step default
1. Open **My Tasks**.
2. Work items in **Required by me** first.
3. Check required fields/checklist before changing status.
4. Move status only when transition gates pass.
5. Update ownership context clearly after handoff actions.

### How to use `Waiting on Others`
- Use it to track assigned records that are blocked on another owner.
- Treat it as a dependency list, not an action list.
- Recheck it after reviewer or publisher activity.

### What “explicit updates” means
- Use stage changes that reflect the real workflow state.
- Include rollback reason when sending back for changes.
- Add live link proof at publish completion.
- Keep ownership and next-action context visible, not implied.

## Section 6 — Visibility & Operations Tools
| Tool | What it shows | When to use it |
|---|---|---|
| My Tasks | Assigned actionable items + blocked items | Start and run daily execution |
| Dashboard | Mixed pipeline health across blogs + social | Cross-team queue triage and bottleneck review |
| Calendar | Scheduled workload by date/week | Planning, conflict checking, rescheduling |
| Notifications | Assignment/stage updates needing attention | Immediate response to workflow changes |
| Activity History | Readable audit trail of key changes | Debugging handoffs, verifying who changed what |

## Section 7 — Transition Gates Reference (Internal-primary)
### Rule set (authoritative behavior)
1. Social transition API is authoritative for stage changes.
2. Social `Draft → In Review` requires `product`, `type`, `canva_url`.
3. Social transitions into and through execution flow require `platforms`, `caption`, and `scheduled_date` in addition to essentials.
4. Social `Published` requires at least one valid live link record.
5. Social backward transitions from execution to `Changes Requested` require a non-empty reason.
6. Execution-stage social brief fields are locked for non-admin users.
7. Blog publishing completion cannot bypass writing completion prerequisites.
8. Reviewer/admin checkpoint at `Awaiting Publishing Approval` must be satisfied before final publish completion.

### Rollback triggers and requirements
| Trigger | Requirement |
|---|---|
| Social execution rollback (`ready_to_publish` or `awaiting_live_link` back to `changes_requested`) | Reason is mandatory |
| Reviewer rejects quality/completeness | Move back to changes-required path with clear reason |

### Valid live link definition (Published gate)
A valid live link is at least one saved, public-facing URL for the published social post (for example LinkedIn, Facebook, or Instagram) that passes URL validation and is stored as a live-link record before transition to `Published`.

## Section 8 — Admin & Onboarding (Internal)
### Add and assign users
1. Add users from Settings admin tools.
2. Assign role and permissions for writing/review/publishing responsibilities.
3. Confirm each user can access their queue and stage actions.

### Intake flow for new content
1. Intake source: idea conversion, direct creation, or import.
2. Set baseline ownership (creator/assignee + reviewer where required).
3. Verify required fields for the first transition gate.
4. Move item into active queue (`My Tasks`) and begin stage progression.

### Configuration notes that affect workflow behavior
- User timezone and date preferences affect schedule/timestamp display.
- Notification preferences affect who receives in-app/Slack workflow events.
- Permission settings control which admin/advanced actions are available.
- Transition gates and ownership logic determine who can move a record forward.

## Section 9 — Quick Reference / SOP Card
### Pipeline snapshot
| Track | Core flow |
|---|---|
| Social Posts | Draft → In Review → Changes Requested/Creative Approved → Ready to Publish → Awaiting Live Link → Published |
| Blogs | Writing flow → Writing Approved handoff → Publishing in Progress → Awaiting Publishing Approval → Publishing Approved → Published |

### Ownership map
| Stage type | Who acts |
|---|---|
| Work/execution stage | Assigned execution owner |
| Review stage | Reviewer |
| Terminal stage | No owner; done |

### Gate checklist
- Do not advance status unless required fields for the target stage are complete.
- Do not publish social content without at least one valid live link.
- Do not roll back execution-stage social work without a reason.
- Do not finalize blog publishing without required writing and review checkpoints.

### Daily use card (pin/print)
1. Open My Tasks.
2. Execute `Required by me`.
3. Validate gates before transition.
4. Move status and keep ownership explicit.
5. Monitor `Waiting on Others` and notifications for handoff completion.
