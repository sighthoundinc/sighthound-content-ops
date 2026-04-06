# Slack Notifications Structure
## Overview
Slack workflow notifications are channel-based and delivered to `#content-ops-alerts` through `supabase/functions/slack-notify`.
For workflow create/transition/reminder flows, emission is centralized in `src/lib/server-slack-emitter.ts`.
This keeps Slack delivery logic consistent across all UI surfaces that trigger the same workflow action.

## Centralized emission contract
Use `emitWorkflowSlackEvent()` for all workflow create/transition/reminder Slack events.

Current centralized API-route emitters:
- `src/app/api/blogs/route.ts`
- `src/app/api/social-posts/route.ts`
- `src/app/api/blogs/[id]/transition/route.ts`
- `src/app/api/social-posts/[id]/transition/route.ts`
- `src/app/api/social-posts/reminders/route.ts`
- `src/app/api/social-posts/overdue-checks/route.ts`
- `src/app/api/blogs/overdue-checks/route.ts`
Client-side direct Slack emits are not valid for create/transition/reminder paths.

## Message format
All messages follow:
- Line 1: `[Blog|Social] <Title> (<Site>)`
- Line 2: `Action: <action text>`
- Line 3: `Assigned to: <resolved user name(s) | Team>`
- Line 4: `Assigned by: <resolved actor name | Team>`
- Line 5 (optional): `Open link: <deep link>`

Role labels are normalized out of assignee/actor lines. If no resolvable user name exists, fallback is `Team`.

## Active Slack workflow events
Blog workflow events:
- `blog_created`
- `writer_assigned`
- `writer_completed` (edge-function supported for backward compatibility)
- `ready_to_publish`
- `published`
- `blog_publish_overdue`

Social workflow events:
- `social_post_created`
- `social_submitted_for_review`
- `social_changes_requested`
- `social_creative_approved`
- `social_ready_to_publish`
- `social_awaiting_live_link`
- `social_published`
- `social_live_link_reminder`
- `social_review_overdue`
- `social_publish_overdue`

## Routing and behavior
- Slack delivery is channel-first (`#content-ops-alerts`).
- Delivery uses bot-token posting when available, with webhook fallback.
- Bot-token and webhook sends suppress previews while keeping links clickable (`unfurl_links: false`, `unfurl_media: false`).
- Slack failures are non-blocking and do not fail the primary workflow mutation response.
- Reminder and overdue sweeps use cooldown claim logic before emission to reduce duplicate notifications.

## Open link resilience
- `Open link:` is built from canonical record IDs (`blogId` / `socialPostId`) in the Slack edge function, not from payload `appUrl`.
- Base app URL resolution order:
  1. `NEXT_PUBLIC_APP_URL`
  2. `APP_URL`
  3. `https://sighthound-content-ops.vercel.app` (default fallback)
- This guarantees deep links are included even when payload-level URL data is missing.

## Environment variables
- `SLACK_BOT_TOKEN`
- `SLACK_MARKETING_CHANNEL` (default `#content-ops-alerts`)
- `SLACK_WEBHOOK_URL`

## Notes
- Unified event emission (`emitEvent`) remains the source for activity history and in-app notification coupling.
- The centralized Slack emitter is the source for workflow transition/reminder Slack delivery.
