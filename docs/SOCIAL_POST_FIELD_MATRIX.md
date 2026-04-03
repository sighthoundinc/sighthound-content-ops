# Social Post Field Requirements Matrix

## Source of truth
- Create payload contract: `src/app/api/social-posts/route.ts`
- Transition validation contract: `src/lib/social-post-workflow.ts`
- Transition enforcement: `src/app/api/social-posts/[id]/transition/route.ts`

## Create-time requirements
When creating a social post via `POST /api/social-posts`:

Required:
- `product`
- `type`
- `reviewer_user_id`

Conditionally required:
- `worker_user_id` is required for admin-created assignment changes; non-admin create flow defaults worker to current user.

Optional at create:
- `title`
- `platforms`
- `scheduled_date`
- `canva_url`
- `canva_page`
- `caption`
- `associated_blog_id`

## Transition requirements by target status
The transition API validates required fields based on **next status**, not current status.

| Target status | Required fields |
| --- | --- |
| `draft` | None |
| `in_review` | `product`, `type`, `canva_url` |
| `changes_requested` | None |
| `creative_approved` | `product`, `type`, `canva_url`, `platforms`, `caption`, `scheduled_date` |
| `ready_to_publish` | `product`, `type`, `canva_url`, `platforms`, `caption`, `scheduled_date` |
| `awaiting_live_link` | `product`, `type`, `canva_url`, `platforms`, `caption`, `scheduled_date` |
| `published` | `product`, `type`, `canva_url`, `platforms`, `caption`, `scheduled_date` + at least one `social_post_links` row |

## Ownership by stage
| Status | Current owner |
| --- | --- |
| `draft` | Worker |
| `in_review` | Reviewer |
| `changes_requested` | Worker |
| `creative_approved` | Reviewer |
| `ready_to_publish` | Worker |
| `awaiting_live_link` | Worker |
| `published` | None (terminal) |

## Execution-stage edit guardrails
Execution stages:
- `ready_to_publish`
- `awaiting_live_link`

Locked brief fields for non-admin transition updates:
- `title`
- `platforms`
- `product`
- `type`
- `canva_url`
- `canva_page`

Additional non-admin restriction:
- In `awaiting_live_link`, non-admin users cannot submit general brief field updates through transition payloads.

## Rollback and publish constraints
- Backward transitions to `changes_requested` from execution stages require a reason:
  - `ready_to_publish` → `changes_requested`
  - `awaiting_live_link` → `changes_requested`
- `published` is blocked unless at least one valid live link exists in `social_post_links`.

## Admin reopen path
To reopen execution-stage posts for brief edits:
- `POST /api/social-posts/[id]/reopen-brief`
- Allowed for admin users only.
- Reopens workflow status to `creative_approved`.
