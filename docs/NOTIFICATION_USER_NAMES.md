# User Names in Notifications

Commit: `f6ca254` - Updated notification system to display actual user names instead of role labels.

## Overview
All notifications (Slack + in-app) now show the actual user responsible, not generic role labels like "Writer" or "Editor".

## Changes Made

### 1. **New Event Fields** (`UnifiedEvent`)
```typescript
// New fields added
targetUserName?: string;  // "Sarah Chen", "Alex Rodriguez", etc.
targetUserId?: string;    // UUID of the assigned user
```

### 2. **Message Builder Updates**
Notification messages now use actual user names with fallback:

```typescript
const targetUser = event.targetUserName || "team member";
```

## Before & After Examples

### Example 1: Blog Assignment

**BEFORE (In-App):**
```
Title: Blog Assignment
Message: "Q4 Strategy Blog" assigned to Writer
```

**AFTER (In-App):**
```
Title: Blog Assignment
Message: "Q4 Strategy Blog" assigned to Sarah Chen
```

**BEFORE (Slack):**
```
[Blog] Writer assigned
"Q4 Strategy Blog" (SH)
Next: Writing
```

**AFTER (Slack):**
```
[Blog] Writer assigned
"Q4 Strategy Blog" (SH)
Assigned to: Sarah Chen
Next: Writing
```

---

### Example 2: Awaiting Action

**BEFORE (In-App):**
```
Title: Action Needed
Message: "Campaign Post" needs publisher attention
```

**AFTER (In-App):**
```
Title: Action Needed
Message: "Campaign Post" awaiting action from Marcus Johnson
```

**BEFORE (Slack):**
```
[Social] Ready to publish
"Campaign Post" (SH)
Next: Publishing
```

**AFTER (Slack):**
```
[Social] Ready to publish
"Campaign Post" (SH)
Assigned to: Marcus Johnson
Next: Publishing
```

---

### Example 3: Social Post Reassignment

**BEFORE (In-App):**
```
Title: Social Post Reassigned
Message: "Black Friday Launch" reassigned to creative_approved
```

**AFTER (In-App):**
```
Title: Social Post Reassigned
Message: "Black Friday Launch" reassigned to Jordan Chen
```

**BEFORE (Slack):**
```
[Social] Creative approved
"Black Friday Launch" (RED)
```

**AFTER (Slack):**
```
[Social] Creative approved
"Black Friday Launch" (RED)
Assigned to: Jordan Chen
```

---

## Implementation Details

### Event Emission Pattern
When emitting events, include `targetUserName`:

```typescript
const { emitEvent } = await import("@/lib/emit-event");

await emitEvent({
  type: "blog_writer_assigned",
  contentType: "blog",
  contentId: blog.id,
  actor: currentUserId,
  actorName: currentUserName,
  targetUserName: "Sarah Chen",  // NEW: actual user name
  targetUserId: assignedUserId,   // NEW: for traceability
  contentTitle: blog.title,
  timestamp: Date.now(),
});
```

### Fallback Logic
If `targetUserName` is not provided:
- In-app: Shows "team member"
- Slack: Shows "team"

```typescript
const targetUser = event.targetUserName || "team member";
```

### Activity History
Target user information is now recorded:
```typescript
metadata: {
  target_user_name: event.targetUserName,
  target_user_id: event.targetUserId,
}
```

## Files Updated

1. **`src/lib/unified-events.ts`**
   - Added `targetUserName` and `targetUserId` fields to `UnifiedEvent`
   - Updated activity history recording to include target user

2. **`src/lib/emit-event.ts`**
   - Modified `buildNotificationMessage()` to use actual user names
   - Updated `getNotificationFromEvent()` to include metadata

3. **`src/lib/notification-types.ts`**
   - Extended `NotificationInput` with metadata field

4. **`supabase/functions/slack-notify/index.ts`**
   - Added `targetUserName` to `NotifyPayload` interface
   - Updated `buildMessage()` to include "Assigned to:" line

## Backward Compatibility

✅ Fully backward compatible
- `targetUserName` and `targetUserId` are optional
- System falls back gracefully if not provided
- No breaking changes to event types or delivery logic

## Testing Checklist

- [x] TypeScript compilation passes (`npm run typecheck`)
- [x] ESLint passes (`npm run lint`)
- [x] No new dependencies added
- [x] Event types unchanged
- [x] Delivery mechanisms unchanged (only display layer modified)

## Integration Notes

When calling `emitEvent()` from assignment handlers:

1. Fetch the target user's display name
2. Pass as `targetUserName` parameter
3. Include `targetUserId` for traceability
4. System handles fallback if missing

Example for assignment changes:

```typescript
const assignedUser = users.find(u => u.id === newAssignedId);

await emitEvent({
  type: "blog_writer_assigned",
  contentType: "blog",
  contentId: blog.id,
  actor: currentUser.id,
  actorName: currentUser.full_name,
  targetUserName: assignedUser?.full_name,  // "Sarah Chen"
  targetUserId: assignedUser?.id,
  contentTitle: blog.title,
  timestamp: Date.now(),
});
```

## Future Enhancements

Possible future improvements:
- Include multiple target users (e.g., "Sarah Chen, Marcus Johnson")
- Add user avatars/profiles to Slack messages
- Customize formatting per user role
- Add user @mentions in Slack notifications
