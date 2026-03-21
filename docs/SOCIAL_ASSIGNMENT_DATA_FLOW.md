# Social Post Assignment - Data Flow & Event System

## High-Level Data Flow

### Current State (No Assignment UI)

```
User tries to reassign a social post
│
├─ ❌ Can't do it via UI (no buttons/forms exist)
│
└─ Can only do it via:
   ├─ Direct database SQL (admin only, risky)
   └─ REST API call (if they know the endpoint)
```

### After Implementation (With Assignment UI)

```
┌─────────────────────────────────────────────────────────────────┐
│                User clicks "Manage Assignments"                 │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│          Modal/Form Opens: Select New Editor & Admin            │
│  ┌─ Current: John Doe (editor)                                  │
│  ├─ Change to: [Jane Smith       ▼]                             │
│  ├─ Current: None (admin)                                       │
│  └─ Change to: [Admin User       ▼]                             │
└─────────────────────────────────────────────────────────────────┘
                              │
                      Click "Update" button
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│    PATCH /api/social-posts/[id]/assignments                    │
│  Request Body:                                                  │
│  {                                                              │
│    editor_user_id: "uuid-of-jane-smith",                       │
│    admin_owner_id: "uuid-of-admin-user"                        │
│  }                                                              │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    API Handler (Backend)                        │
│  1. Validate request (has permission?)                         │
│  2. Get old assignment values (John Doe, None)                 │
│  3. Update database                                             │
│  4. Call emitEvent()                                            │
└─────────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
        ▼                     ▼                     ▼
   ┌────────────┐      ┌──────────────┐     ┌─────────────┐
   │  Database  │      │  Slack Bot   │     │ Notification│
   ├────────────┤      ├──────────────┤     │  System     │
   │ social_    │      │ Sends msg to │     ├─────────────┤
   │ posts      │      │ #marketing:  │     │ Sends notif │
   │ ├─editor_  │      │              │     │ to affected │
   │ │ user_id: │      │ "Post X      │     │ users:      │
   │ │ jane...  │      │  reassigned  │     │             │
   │ └─admin_   │      │  to Jane     │     │ - Jane      │
   │   owner_id:│      │  Smith"      │     │   (new      │
   │   admin... │      │              │     │   editor)   │
   │            │      │ + actor info │     │ - John      │
   │ activity_  │      │ + deep link  │     │   (old      │
   │ history:   │      │ + timestamp  │     │   editor)   │
   │ logs       │      │              │     │              │
   │ 'social_   │      └──────────────┘     └─────────────┘
   │  post_     │                                │
   │  assign_   │                                │
   │  ment_     │                                │
   │  changed'  │                         (logged in
   │ event      │                    notifications_
   │            │                     table)
   └────────────┘
        │
        └──────────────► User Activity History visible in:
                         - Settings → Activity History page
                         - Admin can filter & see all changes
```

---

## Event System: How It All Connects

### 1. Event Emission (What Happens)

```typescript
// When assignment changes, this gets called:
await emitEvent({
  type: 'social_post_assignment_changed',  // What happened
  contentType: 'social_post',              // What was affected
  contentId: 'post-123',                   // Which post
  oldValue: {                              // What changed FROM
    editor_user_id: 'john-uuid',
    admin_owner_id: null
  },
  newValue: {                              // What changed TO
    editor_user_id: 'jane-uuid',
    admin_owner_id: 'admin-uuid'
  },
  fieldName: 'assignment',                 // Field that changed
  actor: 'admin-user-uuid',                // Who did it
  actorName: 'Admin User',                 // Display name
  contentTitle: 'Test Social Post',        // For notification preview
  metadata: {                              // Extra context
    role: 'editor,admin',
    oldAssignee: 'John Doe',
    newAssignee: 'Jane Smith'
  },
  timestamp: new Date(),                   // When
});
```

### 2. Event Routing (Where It Goes)

```
emitEvent() call
│
├─ Route 1: Notification System
│  └─ Maps 'social_post_assignment_changed' → 'task_assigned' notification type
│     ├─ Check user preferences: "Do they want task assignment notifications?"
│     ├─ If YES: Create notification record
│     │  └─ User sees bell icon badge + message in drawer
│     └─ If NO: Notification suppressed (user's choice)
│
├─ Route 2: Slack Integration
│  └─ Call notifySlack() with event details
│     ├─ Posts to #marketing channel
│     ├─ DMs assigned user (if configured)
│     └─ If Slack is down: gracefully fails (doesn't break in-app notifications)
│
└─ Route 3: Activity History Recording
   └─ Saves to social_post_activity_history table
      ├─ Event type: 'social_post_assignment_changed'
      ├─ Old/new values: stored as JSON
      ├─ Actor info: who did it
      └─ Visible to admins in Settings → Activity History

User sees result:
├─ Bell icon notification (if enabled)
├─ Slack message (if configured)
└─ Activity History record (permanent audit trail)
```

---

## Database Schema: What Gets Stored

### Before Assignment Change

```sql
SELECT id, title, editor_user_id, admin_owner_id, created_by, updated_at
FROM social_posts
WHERE id = 'post-123';

-- Result:
-- id: post-123
-- title: "Test Post"
-- editor_user_id: john-uuid      ← Current editor
-- admin_owner_id: null           ← No admin assigned yet
-- created_by: john-uuid
-- updated_at: 2026-03-21 12:00:00
```

### Assignment Change Command

```sql
UPDATE social_posts
SET 
  editor_user_id = 'jane-uuid',        -- Change FROM john TO jane
  admin_owner_id = 'admin-uuid'        -- Change FROM null TO admin
WHERE id = 'post-123';

-- Trigger fires automatically:
-- - Detects changes (john ≠ jane, null ≠ admin)
-- - Calls audit_social_post_changes() function
-- - Logs activity record
```

### After Assignment Change

```sql
SELECT id, title, editor_user_id, admin_owner_id, created_by, updated_at
FROM social_posts
WHERE id = 'post-123';

-- Result:
-- id: post-123
-- title: "Test Post"
-- editor_user_id: jane-uuid       ← NEW editor
-- admin_owner_id: admin-uuid      ← NEW admin
-- created_by: john-uuid           ← Still the original creator
-- updated_at: 2026-03-21 13:45:00 ← Updated timestamp
```

### Activity History Record

```sql
SELECT * FROM social_post_activity_history
WHERE social_post_id = 'post-123'
AND event_type = 'social_post_assignment_changed'
ORDER BY created_at DESC
LIMIT 1;

-- Result:
-- id: activity-uuid
-- social_post_id: post-123
-- actor_id: admin-user-uuid              ← Who made the change
-- event_type: 'social_post_assignment_changed'
-- field_name: null
-- old_value: {                           ← What it was
--   "editor_user_id": "john-uuid",
--   "admin_owner_id": null
-- }
-- new_value: {                           ← What it is now
--   "editor_user_id": "jane-uuid",
--   "admin_owner_id": "admin-uuid"
-- }
-- metadata: {                            ← Extra context
--   "role": "editor,admin",
--   "oldAssignee": "John Doe",
--   "newAssignee": "Jane Smith"
-- }
-- created_at: 2026-03-21 13:45:00
```

---

## Notification Flow

### User A (Jane Smith) - Gets Assigned as Editor

```
Assignment changes Jane becomes editor
│
└─ Event: 'social_post_assignment_changed'
   ├─ userId: jane-uuid (targeted user)
   │
   ├─ Check preferences:
   │  └─ Does Jane have 'task_assigned' notifications enabled?
   │
   ├─ YES → Create notification:
   │  ├─ Type: 'task_assigned'
   │  ├─ Title: "New Assignment"
   │  ├─ Message: "Test Post assigned to you as Editor"
   │  ├─ Link: /social-posts/post-123
   │  └─ Jane sees bell icon badge (+1)
   │
   └─ NO → Skip notification
      └─ Jane doesn't see anything (per her preference)
```

### User B (John Doe) - Gets Reassigned Away

```
Assignment changes John is no longer editor
│
└─ Event: 'social_post_assignment_changed'
   ├─ userId: john-uuid (affected user)
   │
   ├─ Check preferences:
   │  └─ Does John have 'task_assigned' notifications enabled?
   │
   ├─ YES → Create notification:
   │  ├─ Type: 'task_assigned'
   │  ├─ Title: "Assignment Changed"
   │  ├─ Message: "Test Post reassigned from you to Jane Smith"
   │  ├─ Link: /social-posts/post-123
   │  └─ John sees bell icon badge (+1)
   │
   └─ NO → Skip notification
      └─ John doesn't see anything (per his preference)
```

### Admin (Admin User) - Views Activity

```
Admin navigates to Settings → Activity History
│
└─ Sees activity filter options:
   ├─ Activity Type: [social_post_assignment_changed ✓]
   ├─ User: [All Users ▼]
   │
   └─ Clicks "Apply Filter"
      │
      └─ Table shows:
         ┌─────────────────────────────────────┐
         │ Category│ Action │ Content │ User   │
         ├─────────────────────────────────────┤
         │ Social  │ Assign-│Test    │ Admin  │
         │ Post    │ment    │ Post   │ User   │
         │ Activity│changed:│        │        │
         │         │John→   │        │        │
         │         │Jane    │        │        │
         └─────────────────────────────────────┘
```

---

## Why The System is "Ready"

### ✅ What Exists (Backend Infrastructure)

```
Database Layer
├─ ✅ Fields: editor_user_id, admin_owner_id
├─ ✅ Indexes: social_posts_editor_status_idx
├─ ✅ Trigger: audit_social_post_changes()
└─ ✅ History table: social_post_activity_history

Application Layer
├─ ✅ Event type: 'social_post_assignment_changed'
├─ ✅ Notification mapping: → 'task_assigned'
├─ ✅ Unified events system: emitEvent() supports it
├─ ✅ Slack integration: notifySlack() handles it
└─ ✅ Preference enforcement: Checks if user wants notifications

Testing
├─ ✅ Testing guide: SOCIAL_POST_TESTING_GUIDE.md
├─ ✅ Event examples: UNIFIED_EVENTS_MIGRATION.md
└─ ✅ Implementation checklist: SOCIAL_POST_ASSIGNMENT_VISUAL_GUIDE.md
```

### ❌ What's Missing (Just UI)

```
Frontend Layer
├─ ❌ No modal/form to select editor
├─ ❌ No modal/form to select admin
├─ ❌ No "Manage Assignments" button
└─ ❌ No way to trigger assignment change

Backend API
└─ ❌ No PATCH /api/social-posts/[id]/assignments endpoint
   (but DB & event system are ready for it)
```

---

## Time Estimate Breakdown

```
If building assignment UI right now:

┌─────────────────────────────────────┐
│ Component         │ Time │ Difficulty│
├─────────────────────────────────────┤
│ DB + Triggers     │ 0h   │ ✅ Done   │
│ Event Types       │ 0h   │ ✅ Done   │
│ Notification Map  │ 0h   │ ✅ Done   │
│ Slack Integration │ 0h   │ ✅ Done   │
│ ─────────────────────────────────── │
│ API Endpoint      │ 0.5h │ ⭐ Easy   │
│ Modal Component   │ 1h   │ ⭐ Easy   │
│ Integration       │ 0.5h │ ⭐ Easy   │
│ Testing           │ 0.5h │ ⭐⭐ OK   │
├─────────────────────────────────────┤
│ TOTAL             │ 2.5h │ ⭐ EASY   │
└─────────────────────────────────────┘

Comparison:
- Building blog assignment: 4h (from scratch)
- Building social post assignment: 2.5h (copying pattern)

Why so fast?
- Database already set up ✅
- Event system proven ✅
- Blog pattern to copy ✅
- Just need UI + API ❌
```

---

## Visual Summary: Why "70% Done"

```
Social Post Assignment Support
┌────────────────────────────────────────────────────┐
│ Database Schema          [████████████████░░░] 100% ✅
│ Event Types              [████████████████░░░] 100% ✅
│ Audit/Logging            [████████████████░░░] 100% ✅
│ Notification System      [████████████████░░░] 100% ✅
│ Slack Integration        [████████████████░░░] 100% ✅
│ ─────────────────────────────────────────────── 
│ UI Components            [░░░░░░░░░░░░░░░░░░░]   0% ❌
│ API Endpoint             [░░░░░░░░░░░░░░░░░░░]   0% ❌
│ ─────────────────────────────────────────────── 
│ TOTAL COMPLETION:        [████████████░░░░░░░]  70%
└────────────────────────────────────────────────────┘

Missing: 1 API endpoint + UI forms/buttons (2-3 hours)
Blocking: Product/Design decision on whether to build it
```

---

## Quick Reference: What Gets Notified?

### When Assignment Changes, Who Gets Notified?

```
Scenario: John (editor) → Jane (new editor) + Admin assigned

┌─────────────────────────────────────────────────────┐
│                   NOTIFICATIONS SENT               │
├─────────────────────────────────────────────────────┤
│                                                     │
│ Jane Smith (new editor):                           │
│ ├─ Type: task_assigned                            │
│ ├─ Title: "New Assignment"                        │
│ ├─ Message: "Test Post assigned to you as Editor" │
│ └─ Link: /social-posts/post-123                   │
│                                                     │
│ John Doe (old editor):                            │
│ ├─ Type: task_assigned                            │
│ ├─ Title: "Assignment Changed"                    │
│ ├─ Message: "Test Post reassigned to Jane Smith"  │
│ └─ Link: /social-posts/post-123                   │
│                                                     │
│ Admin User (new admin):                           │
│ ├─ Type: task_assigned                            │
│ ├─ Title: "New Assignment"                        │
│ ├─ Message: "Test Post assigned to you as Admin"  │
│ └─ Link: /social-posts/post-123                   │
│                                                     │
│ Slack Channel (#marketing):                       │
│ ├─ Message: "*Assignment changed* • Test Post"    │
│ ├─ Actor: Admin User                             │
│ └─ Deep Link to app                              │
│                                                     │
│ Activity History (Permanent Audit):               │
│ ├─ Event: social_post_assignment_changed         │
│ ├─ Old: {editor: john, admin: none}             │
│ ├─ New: {editor: jane, admin: admin-user}       │
│ └─ Visible to all admins at any time            │
│                                                     │
└─────────────────────────────────────────────────────┘
```

---

## Summary

**Social post assignment event support** is the system that:
1. Allows reassigning who edits and approves social posts
2. Automatically notifies affected users
3. Logs all changes permanently
4. Integrates with Slack and notifications

**Status**: 70% done (UI missing, everything else works)

**Complexity**: ⭐⭐ Easy (2-3 hours if product approves)

**Why not now**: Product/design haven't decided if this feature is needed
