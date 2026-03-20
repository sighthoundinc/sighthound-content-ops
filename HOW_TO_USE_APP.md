# Sighthound Content Ops — User Guide

## 1. What this app is
This is your content operations system.

It helps you:
- track blog progress
- manage assignments
- schedule publishing
- manage social posts
- maintain history and accountability

It does NOT:
- write or edit content (use Google Docs)
- publish directly to websites

## 2. Get productive in 5 minutes (by role)
### Writer — start here
Goal: Move blogs from “Not Started” → “Completed”.

Do this daily:
1. Open My Tasks
2. Start assigned blog → set In Progress
3. Work in Google Doc
4. If changes needed → Needs Revision
5. When done → Completed

Watch-outs:
- Don’t mark complete early
- Don’t leave items stuck in progress

### Publisher — start here
Goal: Turn completed drafts into live content.

Do this daily:
1. Go to Dashboard → Ready for Publishing
2. Open blog
3. Review doc
4. Publish in CMS
5. Add Live URL
6. Mark Completed

Watch-outs:
- Cannot publish before writer completes
- Always add URL (critical for tracking)

### Editor (if used)
Goal: Improve quality, not manage workflow.

Do:
- Review during Needs Revision
- Leave comments

Avoid:
- Changing workflow states unless assigned

### Admin — start here
Goal: Keep system clean and reliable.

You handle:
- users and roles
- permissions
- cleanup (history/comments)
- reassignment
- quick-view (simulate user)

## 3. Core workflows (step-by-step)
### A. Write a blog
1. Blog assigned to you
2. Set In Progress
3. Write in Google Doc
4. Update status as needed
5. Mark Completed

### B. Publish a blog
1. Open blog in Ready for Publishing
2. Review content
3. Publish in CMS
4. Paste Live URL
5. Mark Completed

### C. Convert idea → blog
1. Go to Ideas
2. Click Convert to Blog
3. Assign writer
4. Start workflow

### D. Create a social post
1. Go to Social Posts
2. Click create (or press C)
3. Complete:
   - Setup
   - (Optional) Link blog
   - Caption
   - Review
   - Publish

### E. Bulk actions
1. Select rows
2. Choose action
3. Confirm

You’ll see:
- success count
- failed rows (if any)

## 4. Pages and how to use them
### Dashboard
Your main workspace:
- see queues (writing, publishing)
- apply filters
- act quickly

### My Tasks
Your personal task list:
- prioritized work
- quick access to assigned items

### Blogs
Library view:
- search past content
- copy URLs/titles
- export data

### CardBoard
Kanban view:
- drag between stages
- fast pipeline visibility

### Calendar
Scheduling view:
- see what’s going live
- drag to reschedule (if allowed)

### Ideas
Capture and convert:
- store ideas
- convert into blogs or posts

### Social Posts
Manage content for social:
- plan, write, publish posts

## 5. Search and filters (how they behave)
Search is:
- case-insensitive
- partial match

Works on:
- title
- URL (where available)

Filters:
- combine together
- stay active until cleared

If no results:
- you’ll see a clear empty state (not a broken screen)

## 6. Keyboard shortcuts & power usage
### Global
- ⌘K / Ctrl+K → Command palette
- C → Quick create

### Power tips
- Use filters instead of scrolling
- Use bulk select for repeated actions
- Use command palette to jump between pages

## 7. Errors and troubleshooting
This system is designed so:
- every action responds
- every error is visible

If it doesn’t, it’s a bug.

### Common errors
#### “You don’t have permission”
What it means:
- You’re not allowed to perform this action

Fix:
- Check your role
- Contact admin if needed

#### “Invalid input”
Examples:
- missing required field
- invalid date or URL

Fix:
- correct highlighted field
- try again

#### Action failed
What it means:
- system or network issue

Fix:
- retry
- if persistent, report

#### Bulk action partial failure
What it means:
- some rows failed

Fix:
- check row-level errors
- fix and retry

### Important system behavior
- Failed actions do NOT partially apply
- UI should not change unless action succeeds
- You should always see feedback

If any of this doesn’t happen → report it.

## 8. Permissions (quick reference)
- Writer:
  - edit blog fields: Yes
  - change writer status: Yes
  - change publisher status: No
  - publish blog: No
  - manage users/permissions: No
- Publisher:
  - edit blog fields: Limited
  - change writer status: No
  - change publisher status: Yes
  - publish blog: Yes
  - manage users/permissions: No
- Admin:
  - edit blog fields: Yes
  - change writer status: Yes
  - change publisher status: Yes
  - publish blog: Yes
  - manage users/permissions: Yes

## 9. Good habits (keeps system clean)
- Update status as you work
- Add live URL after publishing
- Don’t leave items stuck
- Use filters instead of scrolling
- Link social posts to blogs

## 10. When something feels off
If:
- nothing happens after an action
- UI looks wrong
- data doesn’t update

That’s not expected behavior.

Report it.

## 11. How this connects to system rules (for context)
- Workflow logic is enforced by the system (not manual)
- Permissions are strictly controlled
- Actions should never silently fail
- Data should always stay consistent

You don’t need to manage this manually, but this is why the system behaves the way it does.
