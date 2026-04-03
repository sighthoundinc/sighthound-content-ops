# Unified Events Migration Guide

## Overview
The unified event system standardizes workflow event payloads across activity history, in-app notification wiring, and related messaging surfaces.

Primary source files:
- `src/lib/unified-events.ts`
- `src/lib/emit-event.ts`

## Current behavior (important)
- `emitEvent()` validates the event and records activity through `/api/events/record-activity`.
- `emitEvent()` does **not** directly enqueue client notification UI state.
- For UI notification delivery, convert events with `getNotificationFromEvent()` and send through `pushNotification()`.
- Workflow Slack delivery remains centralized in `emitWorkflowSlackEvent()` and is triggered by workflow API routes.

## Canonical unified event types
The current `UnifiedEventType` union is:
- `blog_writer_status_changed`
- `blog_publisher_status_changed`
- `blog_writer_assigned`
- `blog_publisher_assigned`
- `blog_awaiting_writer_action`
- `blog_awaiting_publisher_action`
- `blog_publish_overdue`
- `social_post_status_changed`
- `social_post_assigned`
- `social_post_reassigned`
- `social_post_awaiting_action`
- `social_post_editor_assigned`
- `social_review_overdue`
- `social_publish_overdue`
- `social_post_live_link_reminder`

## Notification mapping snapshot
- Status changes → `stage_changed`
- Assignment events (`*_assigned`) → `task_assigned`
- Reassignment (`social_post_reassigned`) → `assignment_changed`
- Awaiting/overdue/reminder events → `awaiting_action`

Mapping source: `UNIFIED_EVENT_TO_NOTIFICATION_TYPE` in `src/lib/unified-events.ts`.

## Required event payload fields
Minimum required:
- `type`
- `contentType` (`blog` or `social_post`)
- `contentId`
- `actor` (user id)

Common optional fields:
- `oldValue`
- `newValue`
- `fieldName`
- `actorName`
- `targetUserId`
- `targetUserName`
- `targetUserNames`
- `contentTitle`
- `metadata`
- `timestamp` (number; use `Date.now()`)

## Migration pattern
1. Replace ad-hoc event-like objects with a typed `UnifiedEvent`.
2. Emit via `emitEvent(event)`.
3. If UI notification is needed immediately in client context:
   - `const notification = getNotificationFromEvent(event)`
   - `pushNotification(notification)`
4. Keep Slack emission in route-level workflow handlers through `emitWorkflowSlackEvent()`.

## Example: social status transition
```typescript
import { emitEvent, getNotificationFromEvent } from "@/lib/emit-event";

const event = {
  type: "social_post_status_changed" as const,
  contentType: "social_post" as const,
  contentId: postId,
  oldValue: currentStatus,
  newValue: nextStatus,
  fieldName: "status",
  actor: currentUserId,
  actorName: currentUserName,
  targetUserId,
  targetUserName,
  contentTitle: postTitle,
  timestamp: Date.now(),
};

await emitEvent(event);
pushNotification(getNotificationFromEvent(event));
```

## Example: social assignment update
Use `social_post_assigned` for direct assignment updates and `social_post_reassigned` when you explicitly want reassignment language in notification mapping.

```typescript
await emitEvent({
  type: "social_post_assigned",
  contentType: "social_post",
  contentId: postId,
  oldValue: previousWorkerId ?? undefined,
  newValue: nextWorkerId ?? undefined,
  fieldName: "worker_user_id",
  actor: actorUserId,
  actorName,
  targetUserId: nextWorkerId ?? undefined,
  targetUserName: nextWorkerName ?? undefined,
  contentTitle: postTitle,
  metadata: { role: "assigned_to" },
  timestamp: Date.now(),
});
```

## Legacy names to avoid
These names are not part of current `UnifiedEventType` and should not be used in new code:
- `blog_assignment_changed`
- `social_post_assignment_changed`
- `awaiting_action` (as event type; this is a notification type)
- `submitted_for_review` (as unified event type)
- `completed` (as unified event type)
- `mention` (as unified event type)

## Verification checklist
- Event type exists in `UnifiedEventType`.
- Event maps in `UNIFIED_EVENT_TO_NOTIFICATION_TYPE`.
- Activity record appears in the expected history table.
- Client notification path uses `getNotificationFromEvent()` + `pushNotification()` where applicable.
