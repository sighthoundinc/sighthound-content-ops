# Slack Notifications Structure

## Overview
Slack notifications are sent to the `#content-ops-alerts` channel and/or direct messages to users. The system respects user notification preferences before sending.

## Message Format
All Slack messages follow a streamlined format optimized for quick scanning and clear action items:

```
[Blog|Social] [Title] ([Site])
Action: [What needs to happen or what just happened]
Assigned to: [Resolved assignee name(s) | Team]
Assigned by: [Resolved actor name | Team]
Open link: [Deep Link to Content]
```

**Examples:**

Blog assignment (actionable):
```
[Blog] "5 Key Features of ALPR Plus" (SH)
Action: Assigned - work can start
Assigned to: Sarah Chen
Assigned by: Adam Zampa
Open link: https://app.example.com/blogs/blog-id-123
```

Social post awaiting action (actionable):
```
[Social] "Social Media Campaign" (RED)
Action: Awaiting live link - awaiting submission
Assigned to: Sarah Chen
Assigned by: Adam Zampa
Open link: https://app.example.com/social-posts/post-id-456
```

Blog publication (completion):
```
[Blog] "Marketing Trends 2026" (SH)
Action: Published
Assigned to: Team
Assigned by: Adam Zampa
Open link: https://app.example.com/blogs/blog-id-789
```

---

## Blog Workflow Notifications

### 1. Writer Assignment
**Event Type:** `writer_assigned`  
**Triggered:** When a writer is assigned to a blog  
**Recipient:** Assigned writer's email  
**Label:** "Writer assigned"  
**Action:** "Writer assigned — awaiting writing"  
**Assigned to:** Resolved assignee name (fallback: `Team`)  
**Notification Type:** `task_assigned`

### 2. Ready to Publish
**Event Type:** `ready_to_publish`  
**Triggered:** When writer marks writing as complete  
**Recipient:** Assigned publisher's email  
**Label:** "Ready to publish"  
**Action:** "Ready to publish — awaiting publisher action"  
**Assigned to:** Resolved assignee name (fallback: `Team`)  
**Notification Type:** `stage_changed`  
**Note:** `writer_completed` is no longer sent (redundant signal; `ready_to_publish` carries the actionable item)

### 3. Published
**Event Type:** `published`  
**Triggered:** When publisher marks publishing as complete  
**Recipient:** Channel only  
**Label:** "Published"  
**Action:** "Published"  
**Notification Type:** `published`

---

## Social Post Workflow Notifications

### 1. Submitted for Review
**Event Type:** `social_submitted_for_review`  
**Triggered:** When social post is submitted for editorial review  
**Recipient:** Channel only  
**Label:** "Submitted for review"  
**Action:** "Submitted for review — awaiting editorial approval"  
**Assigned to:** Resolved assignee name (fallback: `Team`)  
**Notification Type:** `submitted_for_review`

### 2. Changes Requested
**Event Type:** `social_changes_requested`  
**Triggered:** When editor requests changes to a social post  
**Recipient:** Channel only  
**Label:** "Changes requested"  
**Action:** "Changes requested — awaiting creator revisions"  
**Assigned to:** Resolved assignee name (fallback: `Team`)  
**Notification Type:** `awaiting_action`

### 3. Ready to Publish
**Event Type:** `social_ready_to_publish`  
**Triggered:** When post transitions to ready_to_publish status  
**Recipient:** Channel only  
**Label:** "Ready to publish"  
**Action:** "Ready to publish — awaiting creator action"  
**Assigned to:** Resolved assignee name (fallback: `Team`)  
**Notification Type:** `stage_changed`

### 4. Awaiting Live Link
**Event Type:** `social_awaiting_live_link`  
**Triggered:** When post is awaiting live social media link submission  
**Recipient:** Channel only  
**Label:** "Awaiting live link"  
**Action:** "Awaiting live link — awaiting creator submission"  
**Assigned to:** Resolved assignee name (fallback: `Team`)  
**Notification Type:** `awaiting_action`

### 5. Published
**Event Type:** `social_published`  
**Triggered:** When social post is marked as published  
**Recipient:** Channel only  
**Label:** "Published"  
**Action:** "Published"  
**Notification Type:** `published`

### 6. Live Link Reminder
**Event Type:** `social_live_link_reminder`  
**Triggered:** Periodic reminders for posts awaiting live links (24-hour cooldown)  
**Recipient:** Channel only  
**Label:** "Live link reminder"  
**Action:** "Reminder: awaiting live link submission"  
**Assigned to:** Resolved assignee name (fallback: `Team`)  
**Notification Type:** `awaiting_action`

### Removed Events
- `social_creative_approved` — No longer sent; low-urgency internal state signal

---

## Delivery Channels

### Current Configuration
- **Primary:** `#content-ops-alerts` channel (posts all events)
- **Secondary (when targetEmail provided):** Direct message to user matching email
- **Fallback:** Webhook delivery if bot token not configured

### Environment Variables
- `SLACK_BOT_TOKEN` — Bot OAuth token for direct messages and channel posts
- `SLACK_MARKETING_CHANNEL` — Channel ID (default: `#content-ops-alerts`)
- `SLACK_WEBHOOK_URL` — Fallback webhook for channel-only delivery

---

## Notification Preferences

### User Controls
Users can toggle notifications in Settings → Notification Preferences:
- `task_assigned` — Controls writer assignments
- `stage_changed` — Controls status transitions
- `awaiting_action` — Controls reminders (changes requested, live link reminders)
- `submitted_for_review` — Controls submission notifications
- `published` — Controls publication notifications

### Slack Delivery
Users can select which notifications are delivered to Slack independently from in-app:
- **In-App:** Always available (if global toggle enabled)
- **Slack:** Only if Slack is connected AND notification type enabled
- **DM:** Coming soon (pending approval) — currently disabled

### Preference Enforcement
The `shouldSendNotification()` function in `src/lib/notification-helpers.ts` is the single source of truth:
1. Check global `notifications_enabled` toggle
2. Check specific notification type toggle (e.g., `slack_notify_on_stage_changed`)
3. All Slack notifications go through this check before sending

---

## Implementation Details

### Notification Mapping (Active Events)
| Event Type | Notification Type | Maps to Preference |
|---|---|---|
| writer_assigned | task_assigned | `notify_on_task_assigned` |
| ready_to_publish | stage_changed | `notify_on_stage_changed` |
| published | published | `notify_on_published` |
| social_submitted_for_review | submitted_for_review | `notify_on_submitted_for_review` |
| social_changes_requested | awaiting_action | `notify_on_awaiting_action` |
| social_ready_to_publish | stage_changed | `notify_on_stage_changed` |
| social_awaiting_live_link | awaiting_action | `notify_on_awaiting_action` |
| social_published | published | `notify_on_published` |
| social_live_link_reminder | awaiting_action | `notify_on_awaiting_action` |

### Removed Events (No Longer Sent)
| Event Type | Reason |
|---|---|
| writer_completed | Redundant; `ready_to_publish` carries actionable signal to publisher |
| social_creative_approved | Low-urgency internal state; no required next action for Slack audience |

### Notification Routing
```
Event triggered in app
↓
notifySlack() called with event details
↓
Check user preferences
↓
If preferences allow:
  ├─ Post to #content-ops-alerts channel
  └─ (If targetEmail provided) Send DM to matching Slack user
↓
Failure handling (non-blocking, Slack is optional delivery channel)
```

---

## Future Enhancements

### Planned Features
1. **DM Delivery (Coming Soon)** — Allow notifications to be sent as direct messages to individual users
2. **Richer Message Formatting** — Use Slack blocks for better visual hierarchy and CTA buttons
3. **Threaded Discussions** — Group related notifications into threads
4. **Action Buttons** — Direct actions from Slack (approve, request changes, etc.)

---

## Notes

- **Content-type prefix:** `[Blog]` and `[Social]` tags enable quick scanning in shared channels
- **Action-focused:** Each notification includes a clear action statement (what happened and what's next)
- **Assignment fields:** `Assigned to` and `Assigned by` show resolved user names; role-only values normalize to `Team`
- **Slack is optional:** If Slack send fails, in-app notification already succeeded; failure doesn't propagate
- **Preference-driven:** All notifications respect user settings; no "forced" notifications
- **Noise reduction:** Redundant events removed; channel shows only actionable items
- **DM support:** Blog assignments support direct messages to assigned users; social posts post to channel only
