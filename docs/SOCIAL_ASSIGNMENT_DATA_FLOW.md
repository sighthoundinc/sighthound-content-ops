# Social Post Assignment Data Flow

## Overview
This document describes the current assignment model for social posts and how assignment changes propagate through activity/event layers.

## Assignment data model
Current ownership fields on `social_posts`:
- `created_by` — who created the post
- `worker_user_id` — execution owner
- `reviewer_user_id` — review/approval owner

Deprecated fields are still present for compatibility but are not the active model:
- `editor_user_id`
- `admin_owner_id`

## Where assignments are set today

### Create flow
- Endpoint: `POST /api/social-posts`
- Required assignment input at create: `reviewer_user_id`
- `worker_user_id` is optional in payload and defaults to current user for non-admin create flow.

### Edit flow
- In the dedicated editor (`src/app/social-posts/[id]/page.tsx`), admin users can update:
  - `worker_user_id`
  - `reviewer_user_id`
- Current implementation performs direct Supabase update from client context (no dedicated assignment API endpoint yet).

## Assignment event flow
After assignment values change in the dedicated editor:
1. UI updates `social_posts.worker_user_id` / `social_posts.reviewer_user_id`.
2. UI emits `emitEvent()` calls with `social_post_assigned` for changed ownership fields.
3. `emitEvent()` validates event typing/mapping and writes activity records through `/api/events/record-activity`.
4. Event payloads include actor/target metadata for consistent display-layer rendering.

Important nuance:
- `emitEvent()` does not directly enqueue client bell notifications by itself.
- If immediate in-app notification UI is required in that surface, pair with `getNotificationFromEvent()` + `pushNotification()`.

## Workflow ownership interaction
Stage ownership is status-driven:
- Worker-owned: `draft`, `changes_requested`, `ready_to_publish`, `awaiting_live_link`
- Reviewer-owned: `in_review`, `creative_approved`
- No owner: `published`

Transition ownership enforcement lives in:
- `src/lib/social-post-workflow.ts`
- `src/app/api/social-posts/[id]/transition/route.ts`

## Slack interaction
- Workflow create/transition/reminder Slack messages are emitted through `emitWorkflowSlackEvent()`.
- Assignment edits in the dedicated editor currently do not use a dedicated Slack assignment emitter path.
- Slack delivery target is channel-based (`#content-ops-alerts`), not DM-based.

## Current gap
There is no canonical `PATCH /api/social-posts/[id]/assignments` route yet. If assignment updates are moved to API contract authority, add that endpoint and migrate client direct mutations to it.
