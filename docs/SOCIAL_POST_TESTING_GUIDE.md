# Social Post Mutations Testing Guide

## Overview

This guide provides step-by-step manual and automated testing procedures for social post workflow mutations, unified event emission, notifications, activity history recording, and notification preference enforcement.

## Test Environment Setup

### Prerequisites

- Local development environment with `pnpm dev` running
- Supabase local instance or dev/staging environment
- At least 2 test user accounts with different roles (e.g., `editor`, `admin`)
- Admin access to the Settings → Notification Preferences panel
- Admin access to Activity History page (`/settings/access-logs`)

### Test Users

Create or use existing test users:

| User | Email | Role | Purpose |
| --- | --- | --- | --- |
| Editor User | editor@test.com | editor | Creates and edits social posts |
| Admin User | admin@test.com | admin | Reviews, approves, and manages workflows |
| Disabled Notif User | nofeed@test.com | editor | Has notifications disabled for testing |

## Scenario 1: Social Post Status Change Notification

### Objective

Verify that when a social post status changes, the unified event system:
1. Emits the correct notification type
2. Records activity history
3. Respects user notification preferences
4. Sends Slack notification if configured

### Test Steps

#### 1.1 Create a Test Social Post

1. Log in as **Editor User** (`editor@test.com`)
2. Navigate to `/social-posts`
3. Click **"New Social Post"** or similar action
4. Fill in required fields:
   - Title: `Test Post - Status Change [Date]`
   - Product: `general_company`
   - Type: `image`
   - Platforms: Select `LinkedIn`
   - Canva URL: `https://www.canva.com/design/test123`
5. Click **Save Draft** or **Submit for Review** depending on workflow

**Expected Result**: Post created with status `draft` or `in_review`

#### 1.2 Transition Status to `in_review`

1. From the editor page, click the status dropdown or transition button
2. Select **"Submit for Review"** (if currently in `draft`)
3. Observe the UI immediately shows loading state

**Expected Result**: Post status changes to `in_review`, no errors shown

#### 1.3 Verify Notification Appears (In-App)

1. Look at the **bell icon** (top right corner)
2. Check notification count badge increases by 1
3. Click the bell icon to open notifications drawer
4. Look for a notification matching:
   - **Title**: Something like "Social Post Submitted for Review"
   - **Message**: "Test Post - Status Change [Date]" with actor name
   - **Timestamp**: Recent (within last few seconds)

**Expected Result**: Notification appears immediately after status change

**Verification Checklist**:
- ✅ Notification type matches event (e.g., `submitted_for_review` → notification badge increases)
- ✅ Content title is correct
- ✅ Actor name is displayed
- ✅ Timestamp is recent
- ✅ Notification links to `/social-posts/[id]`

#### 1.4 Verify Activity History Recording

1. Log in as **Admin User** (`admin@test.com`)
2. Navigate to **Settings** → **Activity History** (`/settings/access-logs`)
3. Ensure filter shows:
   - **Activity Types**: `social_post_status_changed` checked
   - **Users**: Select the **Editor User** if multi-user filter available
4. Search for the social post title in the table or scroll to find recent activities
5. Look for a row matching:
   - **Category**: "Social Post Activity" or similar
   - **Action**: "Status changed: draft → in_review" (exact wording may vary)
   - **Content**: Post title
   - **User**: Editor User email
   - **Timestamp**: Recent and in your timezone

**Expected Result**: Activity record appears within 2 seconds of status change

**Verification Checklist**:
- ✅ Event type is `social_post_status_changed`
- ✅ Old/new values are correct (e.g., `draft` → `in_review`)
- ✅ Actor (Editor User) is recorded correctly
- ✅ Timestamp matches post modification time
- ✅ Content link works (click and verify navigates to `/social-posts/[id]`)

#### 1.5 Verify Slack Notification (If Configured)

1. Check Slack workspace used by test environment
2. Look in the channel configured via `SLACK_MARKETING_CHANNEL` env var
3. Find a message matching:
   - **Header**: "Social submitted for review • Test Post - Status Change [Date] (sh)"
   - **Body**: "Actor: Editor User Name" + link to app

**Expected Result**: Slack message appears in channel within 5 seconds

**Note**: If Slack notification fails, it should not affect in-app notification (graceful degradation)

---

## Scenario 2: Backward Status Transition with Reason

### Objective

Verify that rollback transitions (e.g., `ready_to_publish` → `changes_requested`) require and record a reason in activity history.

### Test Steps

#### 2.1 Create Post in `ready_to_publish` Status

1. Log in as **Admin User**
2. Navigate to a social post (or create one and transition it to `ready_to_publish`)
3. Verify status is `ready_to_publish`

#### 2.2 Initiate Backward Transition

1. Click transition dropdown or **"Request Changes"** button
2. UI should prompt for **Rollback Reason** input field
3. Enter reason: `"Caption too long, needs revision"`
4. Click **"Request Changes"** or confirm

**Expected Result**: Post transitions to `changes_requested`, reason is captured

#### 2.3 Verify Reason is Recorded in Activity History

1. Log in as **Admin User**
2. Go to **Settings** → **Activity History**
3. Filter by `social_post_status_changed` and the editor user
4. Find the rollback activity record
5. Check that the **Reason** field or metadata shows: `"Caption too long, needs revision"`

**Expected Result**: Reason is captured and visible in activity details

**Verification Checklist**:
- ✅ Backward transition is allowed only from `ready_to_publish` and `awaiting_live_link`
- ✅ Reason field is required (UI prevents submission without reason)
- ✅ Reason is stored in activity history
- ✅ Notification mentions reason in message if applicable

---

## Scenario 3: Notification Preferences Enforcement

### Objective

Verify that user notification preferences are respected and block notifications when disabled.

### Test Steps

#### 3.1 Disable All Notifications

1. Log in as **Disabled Notif User** (`nofeed@test.com`)
2. Go to **Settings** → **Notification Preferences**
3. Toggle **"Enable All Notifications"** to **OFF**
4. Click **Save**
5. Verify toggle state is saved (refresh page, confirm still OFF)

#### 3.2 Create and Transition a Social Post

1. Still logged in as **Disabled Notif User**
2. Create a new social post and transition its status (e.g., `draft` → `in_review`)
3. Wait 2 seconds

**Expected Result**: No notification appears in bell icon

**Verification Checklist**:
- ✅ Notification count badge does NOT increase
- ✅ Bell drawer remains empty (or shows no new notifications for this user)

#### 3.3 Re-enable Notifications

1. Go back to **Settings** → **Notification Preferences**
2. Toggle **"Enable All Notifications"** to **ON**
3. Click **Save**

#### 3.4 Transition Again and Verify Notification Appears

1. Create another social post and transition it
2. Bell icon notification count should increase

**Expected Result**: Notification appears immediately after re-enabling preferences

**Verification Checklist**:
- ✅ Notification badge increases
- ✅ Notification is visible in bell drawer
- ✅ No errors in browser console or server logs

#### 3.5 Disable Specific Event Type

1. Go to **Settings** → **Notification Preferences**
2. Toggle OFF only **"Stage Changed"** or **"Social Post Status"** (exact label varies)
3. Transition social post status (should be blocked from notification)
4. Toggle OFF **"Task Assigned"** or similar
5. Assign social post to another user (should be blocked from notification)

**Expected Result**: Only disabled event types are suppressed; other events still notify

---

## Scenario 4: Edge Cases & Error Handling

### 4.1 Rapid Status Transitions

#### Test

1. Create a social post in `draft` status
2. Rapidly click multiple transition buttons (e.g., Submit → Approve → Ready → Awaiting)
3. Observe UI behavior and notification badge

**Expected Result**:
- Each valid transition triggers a notification
- Invalid transitions are rejected by API (UI prevents invalid actions)
- No duplicate notifications for the same transition

**Verification Checklist**:
- ✅ No "race condition" duplicates in notifications
- ✅ Activity history shows all valid transitions in order
- ✅ No orphaned notifications for rejected transitions

### 4.2 Session Expiration During Transition

#### Test

1. Start transitioning a social post status
2. Simulate session expiration (close tab, wait for token expiry, or manually logout)
3. Observe error handling

**Expected Result**:
- UI shows error: "Session expired. Refresh and try again."
- Post status does NOT change
- No notification is sent
- No partial activity record is created

### 4.3 Permission Denial

#### Test

1. Log in as **Editor User** (non-admin)
2. Try to transition a social post directly to `published` (admin-only action)
3. Observe UI behavior

**Expected Result**:
- UI prevents or greys out disallowed transitions
- If attempted, API returns 403 Forbidden
- No notification sent for failed action
- Error message shown: "You do not have permission for that transition"

### 4.4 Missing Required Fields

#### Test

1. Create social post without Canva URL (if required)
2. Try to transition to `ready_to_publish`
3. Observe validation

**Expected Result**:
- Transition is blocked
- Inline error shown: "Canva URL is required"
- No notification sent
- Post remains in previous status

---

## Scenario 5: Activity History Filtering

### Objective

Verify that admin users can filter activity history by event type and user.

### Test Steps

#### 5.1 Filter by Event Type

1. Log in as **Admin User**
2. Go to **Settings** → **Activity History**
3. Uncheck all activity types except `social_post_status_changed`
4. Observe table updates to show ONLY social post status changes

**Expected Result**: Only `social_post_status_changed` activities are displayed

**Verification Checklist**:
- ✅ Other event types (login, dashboard visit, blog changes) are hidden
- ✅ Social post status changes are visible
- ✅ Counts update correctly

#### 5.2 Filter by User

1. Multi-select only the **Editor User** in the user filter
2. Observe table updates

**Expected Result**: Only activities by Editor User are shown

#### 5.3 Combine Filters (AND Logic)

1. Select:
   - Activity Type: `social_post_status_changed`
   - User: `editor@test.com`
2. Observe results

**Expected Result**: Only social post status changes BY the editor are shown

---

## Scenario 6: Slack Notification Integration

### Objective

Verify Slack notifications are sent and respect preferences.

### Prerequisites

- Slack workspace with bot token (`SLACK_BOT_TOKEN`)
- Slack channel configured (`SLACK_MARKETING_CHANNEL`, default: `#marketing`)
- Test user email must have matching Slack account

### Test Steps

#### 6.1 Verify Channel Notification

1. Log in as **Editor User**
2. Transition a social post status (e.g., `draft` → `in_review`)
3. Check Slack channel:
   - Message should appear with format: `*Social submitted for review* • Post Title (site)`
   - Includes actor name and deep link to app

**Expected Result**: Message appears in Slack channel within 5 seconds

#### 6.2 Verify DM Notification

1. Ensure test user's email matches their Slack account email
2. Assign social post to that user or trigger notification targeting them
3. Check Slack DMs for message from Content Ops bot

**Expected Result**: Direct message appears with similar content to channel message

#### 6.3 Slack Failure Doesn't Break Notifications

1. Temporarily disable Slack credentials or use invalid token
2. Transition a social post status
3. Observe in-app notification still appears

**Expected Result**: In-app notification succeeds even if Slack fails (graceful degradation)

**Verification Checklist**:
- ✅ Browser console shows Slack notification error (warning level)
- ✅ In-app notification still appears
- ✅ Activity history is recorded
- ✅ Server logs show Slack failure but system continues normally

---

## Automated Testing (For CI/CD)

### Unit Test Template

```typescript
// src/lib/emit-event.test.ts
import { emitEvent } from '@/lib/emit-event';
import { getSupabaseClient } from '@/lib/supabase/server';
import { notifySlack } from '@/lib/notifications';

jest.mock('@/lib/supabase/server');
jest.mock('@/lib/notifications');
jest.mock('@/app/api/events/record-activity');

describe('Social Post Event Emission', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should emit social_post_status_changed event', async () => {
    const event = {
      type: 'social_post_status_changed' as const,
      contentType: 'social_post' as const,
      contentId: 'post-123',
      oldValue: 'draft',
      newValue: 'in_review',
      fieldName: 'status',
      actor: 'user-456',
      actorName: 'Test Editor',
      contentTitle: 'Test Social Post',
      timestamp: new Date(),
    };

    await emitEvent(event);

    // Verify Slack notification was attempted
    expect(notifySlack).toHaveBeenCalledWith({
      eventType: 'social_submitted_for_review',
      socialPostId: 'post-123',
      title: 'Test Social Post',
      site: 'general_company',
      actorName: 'Test Editor',
    });

    // Verify activity history was recorded
    expect(recordActivity).toHaveBeenCalledWith(
      expect.objectContaining({
        event_type: 'social_post_status_changed',
        content_id: 'post-123',
        field_name: 'status',
        old_value: 'draft',
        new_value: 'in_review',
      })
    );
  });

  it('should respect notification preferences', async () => {
    // Mock user preferences to disable notifications
    (getUserNotificationPreferencesWithCache).mockResolvedValue({
      notifications_enabled: false,
      submitted_for_review: false,
    });

    const event = { /* ... */ };
    await emitEvent(event);

    // Verify Slack notification was NOT called
    expect(notifySlack).not.toHaveBeenCalled();
  });
});
```

### Integration Test Template

```typescript
// src/app/api/social-posts/[postId]/transition.test.ts
import { PATCH } from './route';

describe('Social Post Transition API', () => {
  it('should transition status and emit event', async () => {
    const req = new Request('http://localhost:3000/api/social-posts/post-123/transition', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        toStatus: 'in_review',
        reason: null,
      }),
    });

    const res = await PATCH(req, { params: { postId: 'post-123' } });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.post.status).toBe('in_review');
  });

  it('should require reason for backward transition', async () => {
    const req = new Request('http://localhost:3000/api/social-posts/post-123/transition', {
      method: 'PATCH',
      body: JSON.stringify({
        toStatus: 'changes_requested',
        reason: null, // Missing reason
      }),
    });

    const res = await PATCH(req, { params: { postId: 'post-123' } });
    expect(res.status).toBe(400);

    const data = await res.json();
    expect(data.error).toContain('reason');
  });
});
```

---

## Checklist: Sign-Off for Testing

Before marking Task 4 complete, verify:

- [ ] Scenario 1: Status change notifications appear in-app
- [ ] Scenario 1: Activity history records status changes correctly
- [ ] Scenario 1: Slack notifications sent if configured
- [ ] Scenario 2: Backward transitions require and record reason
- [ ] Scenario 3: Notification preferences are respected (global and per-type)
- [ ] Scenario 4.1: Rapid transitions don't cause duplicates
- [ ] Scenario 4.2: Session expiration handled gracefully
- [ ] Scenario 4.3: Permissions are enforced (no unauthorized transitions)
- [ ] Scenario 4.4: Required field validation blocks invalid transitions
- [ ] Scenario 5: Activity history filtering works correctly
- [ ] Scenario 6: Slack integration works (if configured)
- [ ] No console errors during any test
- [ ] Activity history records have correct timestamps (in user's timezone if applicable)
- [ ] Notifications include correct metadata (actor, content title, reason if applicable)

---

## Troubleshooting Common Issues

### Issue: Notification Not Appearing

**Causes**:
1. User has notification preferences disabled
2. Event type not mapped in `UNIFIED_EVENT_TO_NOTIFICATION_TYPE`
3. Notification emitted for wrong user (targeted user, not current user)

**Fix**:
1. Check `/settings/notifications-preferences`
2. Verify event type in `src/lib/unified-events.ts`
3. Check `userId` parameter in `notifySlack()` call

### Issue: Activity History Not Recording

**Causes**:
1. `social_post_activity_history` table not created
2. `/api/events/record-activity` endpoint missing or erroring
3. Database trigger not firing

**Fix**:
1. Run migrations: `supabase db push --yes`
2. Check server logs for `/api/events/record-activity` errors
3. Verify trigger: `select * from pg_trigger where tgname like '%social%'`

### Issue: Slack Message Not Appearing

**Causes**:
1. Credentials not set: `SLACK_BOT_TOKEN` or `SLACK_WEBHOOK_URL`
2. Bot token lacks permissions (chat:write, users:read)
3. Channel name incorrect

**Fix**:
1. Verify env vars: `echo $SLACK_BOT_TOKEN`
2. Check bot scope in Slack app settings
3. Use `#channel-name` format in `SLACK_MARKETING_CHANNEL`

---

## Next Steps

After completing all test scenarios:
1. Document any bugs or edge cases discovered
2. Update code comments if behavior differs from expectation
3. Mark Task 4 as complete in TODO list
4. Create PRs for any fixes or improvements needed
