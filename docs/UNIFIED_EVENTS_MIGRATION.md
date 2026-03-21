# Unified Events Migration Guide

## Overview

The unified event system consolidates notification emission and activity history recording into a single `emitEvent()` call. This guide explains how to migrate existing `pushNotification()` calls to the new system.

**Benefits:**
- Single source of truth for event emission (no duplicate logic)
- Automatic activity history recording alongside notifications
- Consistent event structure across the application
- Easier to track user actions and workflows

**No-break design:** Old `pushNotification()` calls continue working. New code can adopt `emitEvent()` gradually.

---

## Current Pattern: Direct pushNotification()

```typescript
// Old pattern: separate notification call
const { pushNotification } = useNotifications();

pushNotification({
  type: 'stage_changed',
  title: 'Blog Updated',
  message: `Blog "${blog.title}" status changed to Pending Review`,
  contentType: 'blog',
  contentId: blog.id,
  contextLink: `/blogs/${blog.id}`,
});
```

**Problems:**
- Activity history not recorded automatically
- Need separate logic to log to activity table
- Event structure not validated
- Event type mapping to activity history unclear

---

## New Pattern: Unified emitEvent()

```typescript
// New pattern: single call handles both notifications and activity
const { emitEvent } = await import('@/lib/emit-event');

await emitEvent({
  type: 'blog_writer_status_changed',
  contentType: 'blog',
  contentId: blog.id,
  oldValue: previousStatus,
  newValue: 'pending_review',
  fieldName: 'writer_status',
  actor: userId,
  actorName: userName,
  contentTitle: blog.title,
  metadata: { reason: 'Writer submitted for review' },
  timestamp: new Date(),
});
```

**Benefits:**
- Single emission call
- Automatic activity history recording
- Event structure validated
- Correct notification type inferred
- Scalable for new event types

---

## Step-by-Step Migration

### Phase 1: Understand the Event Types

Supported unified event types are defined in `src/lib/unified-events.ts`:

```typescript
type UnifiedEventType =
  | 'blog_writer_status_changed'
  | 'blog_publisher_status_changed'
  | 'blog_assignment_changed'
  | 'social_post_status_changed'
  | 'social_post_assignment_changed'
  | 'awaiting_action'
  | 'completed'
  | 'mention'
  | 'submitted_for_review';
```

Each event type maps to a specific notification type automatically.

### Phase 2: Locate Mutation Handlers

Find all places where `pushNotification()` is called:

```bash
grep -r "pushNotification" src/ --include="*.ts" --include="*.tsx"
```

Priority order for migration:
1. Blog mutations (writer/publisher status, assignments)
2. Social post mutations (status, assignments)
3. Comment/mention logic
4. Generic awaiting-action patterns

### Phase 3: Identify Event Context

Before migrating, gather required fields:

```typescript
// Required fields for emitEvent():
{
  type: 'blog_writer_status_changed',              // Event type from above
  contentType: 'blog' | 'social_post',             // Content being modified
  contentId: string,                                // UUID of blog or social post
  oldValue: previousStatus,                         // Previous state value
  newValue: newStatus,                              // New state value
  fieldName: 'writer_status' | 'publisher_status' | 'assignment', // Field changed
  actor: userId,                                    // User ID who made the change
  actorName: userName,                              // Display name of actor
  contentTitle: blog.title,                         // Title for notification/history
  metadata?: Record<string, any>,                   // Optional: extra context
  timestamp: new Date(),                            // Emission time (usually now)
}
```

### Phase 4: Refactor Handler

#### Example 1: Blog Writer Status Change

**Before (direct pushNotification):**

```typescript
// In /blogs/[id]/page.tsx or API route
const handleWriterSave = async (newStatus: string) => {
  const { data, error } = await supabase
    .from('blogs')
    .update({ writer_status: newStatus })
    .eq('id', blogId)
    .select()
    .single();

  if (error) throw error;

  // Direct notification call (no activity history)
  const { pushNotification } = useNotifications();
  pushNotification({
    type: 'stage_changed',
    title: 'Blog Updated',
    message: `"${data.title}" is now ${newStatus}`,
    contentType: 'blog',
    contentId: blogId,
    contextLink: `/blogs/${blogId}`,
  });
};
```

**After (unified emitEvent):**

```typescript
import { emitEvent } from '@/lib/emit-event';

const handleWriterSave = async (newStatus: string) => {
  const { data, error } = await supabase
    .from('blogs')
    .update({ writer_status: newStatus })
    .eq('id', blogId)
    .select()
    .single();

  if (error) throw error;

  // Unified event emission (notifications + activity history)
  await emitEvent({
    type: 'blog_writer_status_changed',
    contentType: 'blog',
    contentId: blogId,
    oldValue: previousStatus,
    newValue: newStatus,
    fieldName: 'writer_status',
    actor: userId,
    actorName: userDisplayName,
    contentTitle: data.title,
    metadata: {
      revisionReason: revisionReason || undefined,
    },
    timestamp: new Date(),
  });

  // Optional: Still show local alert for UX feedback
  const { pushAlert } = useAlerts();
  pushAlert({ type: 'success', message: 'Blog saved' });
};
```

#### Example 2: Blog Assignment Change

**Before:**

```typescript
const handleDetailsSave = async (newWriterId: string) => {
  const { data } = await supabase
    .from('blogs')
    .update({ writer_id: newWriterId })
    .eq('id', blogId)
    .select()
    .single();

  const { pushNotification } = useNotifications();
  pushNotification({
    type: 'task_assigned',
    title: 'New Assignment',
    message: `"${data.title}" assigned to you`,
    contentType: 'blog',
    contentId: blogId,
    contextLink: `/blogs/${blogId}`,
  });
};
```

**After:**

```typescript
import { emitEvent } from '@/lib/emit-event';

const handleDetailsSave = async (newWriterId: string) => {
  const { data } = await supabase
    .from('blogs')
    .update({ writer_id: newWriterId })
    .eq('id', blogId)
    .select()
    .single();

  await emitEvent({
    type: 'blog_assignment_changed',
    contentType: 'blog',
    contentId: blogId,
    oldValue: previousWriterId,
    newValue: newWriterId,
    fieldName: 'assignment',
    actor: currentUserId,
    actorName: currentUserName,
    contentTitle: data.title,
    metadata: {
      role: 'writer',
      oldAssignee: previousWriterName,
      newAssignee: newWriterName,
    },
    timestamp: new Date(),
  });

  const { pushAlert } = useAlerts();
  pushAlert({ type: 'success', message: 'Assignment updated' });
};
```

### Phase 5: React Component Context

If calling from a React component, import dynamically:

```typescript
'use client';

import { useNotifications } from '@/providers/notifications-provider';
import { useAlerts } from '@/hooks/use-alerts';

export function BlogEditor({ blogId }: { blogId: string }) {
  const { pushNotification } = useNotifications();
  const { pushAlert } = useAlerts();

  const handleSave = async () => {
    // ... update logic ...

    // For unified events in React, use dynamic import
    const { emitEvent } = await import('@/lib/emit-event');
    
    await emitEvent({
      type: 'blog_writer_status_changed',
      contentType: 'blog',
      contentId: blogId,
      oldValue: previousStatus,
      newValue: newStatus,
      fieldName: 'writer_status',
      actor: userId,
      actorName: userDisplayName,
      contentTitle: blog.title,
      timestamp: new Date(),
    });

    pushAlert({ type: 'success', message: 'Blog saved' });
  };

  return <div>...</div>;
}
```

### Phase 6: API Route Context

If calling from an API route (server-side), import normally:

```typescript
import { emitEvent } from '@/lib/emit-event';
import { createClient } from '@/lib/supabase';

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const { newStatus } = await req.json();
  const supabase = createClient();

  // Update database
  const { data } = await supabase
    .from('blogs')
    .update({ writer_status: newStatus })
    .eq('id', params.id)
    .select()
    .single();

  // Emit unified event
  await emitEvent({
    type: 'blog_writer_status_changed',
    contentType: 'blog',
    contentId: params.id,
    oldValue: previousStatus,
    newValue: newStatus,
    fieldName: 'writer_status',
    actor: userId,
    actorName: userDisplayName,
    contentTitle: data.title,
    timestamp: new Date(),
  });

  return Response.json({ success: true });
}
```

---

## Event Field Reference

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `type` | UnifiedEventType | ✓ | Event category (see Phase 1) |
| `contentType` | 'blog' \| 'social_post' | ✓ | Content being modified |
| `contentId` | string | ✓ | UUID of content |
| `oldValue` | any | ✓ | Previous value |
| `newValue` | any | ✓ | New value |
| `fieldName` | string | ✓ | Field name (e.g., 'writer_status', 'assignment') |
| `actor` | string | ✓ | User ID making change |
| `actorName` | string | ✓ | Display name of actor |
| `contentTitle` | string | ✓ | Title for notifications/history |
| `metadata` | Record<string, any> | ✗ | Optional context (reason, revision, etc.) |
| `timestamp` | Date | ✓ | Emission time |

---

## Coexistence Pattern (No Breaking Changes)

Old and new patterns can coexist during migration:

```typescript
// Old pattern still works (backward compatible)
const { pushNotification } = useNotifications();
pushNotification({
  type: 'stage_changed',
  title: 'Blog Updated',
  message: '...',
  contentType: 'blog',
  contentId: blogId,
  contextLink: `/blogs/${blogId}`,
});

// New pattern (recommended for new code)
const { emitEvent } = await import('@/lib/emit-event');
await emitEvent({
  type: 'blog_writer_status_changed',
  // ...
});
```

**Recommendation:** Migrate gradually by feature/workflow rather than all at once.

---

## Testing Strategy

### Unit Tests

```typescript
import { emitEvent } from '@/lib/emit-event';

describe('Blog Status Change Emission', () => {
  it('should emit blog_writer_status_changed event', async () => {
    const mockEvent = {
      type: 'blog_writer_status_changed' as const,
      contentType: 'blog' as const,
      contentId: 'blog-123',
      oldValue: 'draft',
      newValue: 'pending_review',
      fieldName: 'writer_status',
      actor: 'user-456',
      actorName: 'John Doe',
      contentTitle: 'Test Blog',
      timestamp: new Date(),
    };

    await emitEvent(mockEvent);

    // Verify notification was pushed
    expect(pushNotification).toHaveBeenCalledWith({
      type: 'stage_changed',
      title: expect.any(String),
      contentType: 'blog',
      contentId: 'blog-123',
    });

    // Verify activity history was recorded
    expect(recordActivity).toHaveBeenCalledWith(
      expect.objectContaining({
        event_type: 'blog_writer_status_changed',
        content_id: 'blog-123',
      })
    );
  });
});
```

### Integration Tests

1. Update blog status via mutation handler
2. Verify notification appears in notification bell
3. Verify activity appears in Activity History page
4. Verify notification respects user preferences

---

## Rollout Order (Recommended)

1. **Week 1**: Migrate blog writer status changes (`blog_writer_status_changes` events)
2. **Week 2**: Migrate blog publisher status changes and assignments
3. **Week 3**: Migrate social post mutations
4. **Week 4**: Migrate remaining patterns (mentions, awaiting-action)

This phased approach allows for:
- Easy rollback per feature
- Focused testing per workflow
- Gradual team adoption
- Early feedback incorporation

---

## Troubleshooting

### Event Type Not in Union

**Error:** `Type '"invalid_event"' is not assignable to type 'UnifiedEventType'`

**Solution:** Add new event type to `UnifiedEventType` union in `src/lib/unified-events.ts` if needed.

### Activity History Not Recording

**Check:**
1. Is the `social_post_activity_history` or `blog_assignment_history` table created?
2. Does the API route `/api/events/record-activity` exist?
3. Check server logs for `recordActivity` errors (graceful degradation logs warning but doesn't break notifications)

### Notification Not Appearing

**Check:**
1. Is user's notification preference enabled for this event type?
2. Is the event type correctly mapped in `UNIFIED_EVENT_TO_NOTIFICATION_TYPE`?
3. Verify `getNotificationFromEvent()` produces valid `NotificationInput`

---

## Questions?

Refer to:
- `AGENTS.md` — System rules and invariants
- `SPECIFICATION.md` — Technical specifications
- `src/lib/unified-events.ts` — Event type definitions
- `src/lib/emit-event.ts` — Emission implementation
