# Social Post Workflow (Current Contract)

## Source of truth
- `src/lib/social-post-workflow.ts`
- `src/app/api/social-posts/[id]/transition/route.ts`
- `src/app/api/social-posts/[id]/reopen-brief/route.ts`

## Canonical statuses
1. `draft`
2. `in_review`
3. `changes_requested`
4. `creative_approved`
5. `ready_to_publish`
6. `awaiting_live_link`
7. `published`

`published` is terminal.

## Allowed transitions
- `draft` → `in_review`
- `in_review` → `creative_approved`
- `in_review` → `changes_requested`
- `changes_requested` → `in_review`
- `creative_approved` → `ready_to_publish`
- `ready_to_publish` → `awaiting_live_link`
- `ready_to_publish` → `changes_requested`
- `awaiting_live_link` → `published`
- `awaiting_live_link` → `changes_requested`

## Ownership model by status
- Worker-owned stages:
  - `draft`
  - `changes_requested`
  - `ready_to_publish`
  - `awaiting_live_link`
- Reviewer-owned stages:
  - `in_review`
  - `creative_approved`
- No owner:
  - `published`

Ownership derivation is encoded via `getStatusActorId()` / `getNextAssignment()`.

## Transition requirements
Required fields are validated for the **target status**:

- Transitioning to `in_review` requires:
  - `product`
  - `type`
  - `canva_url`
- Transitioning to `creative_approved`, `ready_to_publish`, `awaiting_live_link`, or `published` requires:
  - `product`
  - `type`
  - `canva_url`
  - `platforms`
  - `caption`
  - `scheduled_date`
- Transitioning to `published` also requires at least one valid `social_post_links` row.

## Execution-stage guardrails
- Execution stages are `ready_to_publish` and `awaiting_live_link`.
- Transition API blocks locked brief fields for non-admin users during execution updates:
  - `title`
  - `platforms`
  - `product`
  - `type`
  - `canva_url`
  - `canva_page`
- Non-admin users cannot submit general brief updates while in `awaiting_live_link`; that stage is effectively live-link only for non-admin flow.

## Rollback and reopen rules
- Backward transitions from execution to `changes_requested` require a non-empty reason:
  - `ready_to_publish` → `changes_requested`
  - `awaiting_live_link` → `changes_requested`
- Admin reopen path:
  - `POST /api/social-posts/[id]/reopen-brief`
  - Reopens execution-stage posts to `creative_approved`.

## Next-action labels
Current next-action labels from `NEXT_ACTION_LABELS`:
- `draft` → `Submit for Review`
- `in_review` → `Review & Approve`
- `changes_requested` → `Apply Changes`
- `creative_approved` → `Move to Ready`
- `ready_to_publish` → `Mark Awaiting Link`
- `awaiting_live_link` → `Submit Link`
- `published` → `Done`
