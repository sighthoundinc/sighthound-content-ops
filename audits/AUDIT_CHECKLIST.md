# Sighthound Content Relay — Governance Audit Checklist

**Purpose**: Verify each module complies with 5 governance rules from AGENTS.md
**Duration**: ~30 minutes total (5 min per module)
**Output**: Fill `AUDIT_RESPONSES.json` for each issue found, then run parser

---

## Rules Being Audited

1. **Forms & Input Behavior (MUST)**
   - All inputs expose clear validation states (error, success, disabled, loading)
   - Required fields enforced at UI + API
   - Inline errors shown near fields (not just toast)
   - No silent submit failure

2. **Feedback & System Status (MUST)**
   - Every action produces visible feedback (success/error/loading)
   - Long-running actions show progress
   - No uncertain or silent actions

3. **Error Handling (MUST)**
   - All errors human-readable and actionable
   - Errors categorized (validation/system/permission)
   - No raw errors or stack traces
   - Failed actions don't leave UI in inconsistent state

4. **Permissions Enforcement (MUST)**
   - Supabase RLS is source of truth (frontend checks UX-only)
   - Every feature defines who can view/edit/perform actions
   - No feature ships without RLS coverage

5. **Table Invariants (MUST)**
   - Fixed row heights (no expansion)
   - Single-line truncation with tooltip
   - Pagination controls stable (no shifting)
   - Overflow constraints enforced

---

## Module 1: Dashboard (`/dashboard`)

### Setup
1. Log in as **writer** user (non-admin)
2. Navigate to Dashboard
3. Have a blog in each queue ready (or create one)

### 1.1 Forms & Input Behavior

**Test: Status Update Inline**
- [ ] Click inline status dropdown on any blog row
- [ ] Try to submit without selecting a value → does it block or submit silently?
- [ ] Does error appear inline or only as toast?
- **Issue?** Record in `AUDIT_RESPONSES.json`

**Test: Bulk Action**
- [ ] Select 2-3 rows
- [ ] Click bulk action button
- [ ] Does it show a confirmation dialog with clear action description?
- [ ] Can you cancel?
- [ ] If action requires a field (e.g., assign to user), is field required before submit?
- **Issue?** Record in `AUDIT_RESPONSES.json`

### 1.2 Feedback & System Status

**Test: Status Change Feedback**
- [ ] Click inline status dropdown
- [ ] Change status
- **Observe**: Do you see loading state? Success confirmation? Or does it just disappear?
- **Issue?** (Missing loading state = issue. Silent success = issue)

**Test: Bulk Action Feedback**
- [ ] Select rows, click bulk action
- [ ] After confirmation, do you see progress? Final success count?
- **Issue?** (No progress indicator = issue)

### 1.3 Error Handling

**Test: Create Error (Intentional)**
- [ ] Try to perform an action you don't have permission for (e.g., as writer, try to mark published)
- **Observe**: Is error clear and actionable? Or generic?
- **Issue?** (Generic "You don't have permission" with no context = issue)

**Test: Network Error Simulation** (optional, skip if complex)
- [ ] If possible, simulate slow network or error
- **Observe**: Does error message explain what happened and what to do?

### 1.4 Permissions Enforcement

**Test: Permission-Gated Actions**
- [ ] Log in as **writer**
- [ ] Try to click any button that should be hidden (e.g., "Export Selected")
- [ ] Is button disabled or hidden?
- [ ] If you somehow trigger the action (via URL, console), does backend reject it?
- **Issue?** (Button hidden but action still works = security risk)

**Test: Role-Specific States**
- [ ] Log in as **publisher**
- [ ] Navigate Dashboard
- [ ] Can you see writer queues? Can you act on them?
- **Issue?** (Publisher shouldn't interact with writer queue)

### 1.5 Table Invariants

**Test: Row Height Stability**
- [ ] Look at Dashboard table
- [ ] Do all rows have consistent height?
- [ ] Scroll through table — does height change per row?
- **Issue?** (Rows expanding = issue)

**Test: Text Truncation**
- [ ] Find a blog with a very long title
- [ ] Does title truncate with ellipsis?
- [ ] Hover over it — do you see full title in tooltip?
- **Issue?** (Text wrapping or no tooltip = issue)

**Test: Pagination Stability**
- [ ] Look at pagination controls at bottom
- [ ] Change page
- [ ] Does pagination stay in same place, or does table shift?
- **Issue?** (Shifting = issue)

---

## Module 2: Blogs (`/blogs`)

### Setup
1. Log in as **any user**
2. Navigate to `/blogs`

### 2.1 Forms & Input Behavior

**Test: Search Input**
- [ ] Type in search box
- [ ] Does it respond immediately or with delay?
- [ ] Try invalid characters — any error?
- **Issue?** (No feedback on invalid input = issue)

### 2.2 Feedback & System Status

**Test: Filter Application**
- [ ] Click a filter (e.g., status, site)
- [ ] Do you see loading state while results update?
- [ ] Does table update immediately or with delay?
- **Issue?** (Silent update with no loading state = issue)

**Test: Export Action**
- [ ] Click Export button
- [ ] Do you see loading state? Progress?
- [ ] Or does it silently download?
- **Issue?** (Silent download = issue, should show "Preparing export...")

### 2.3 Error Handling

**Test: Copy URL Action**
- [ ] Click copy button on a blog row
- [ ] Do you see confirmation (e.g., "Copied!")? Toast? Visual feedback?
- [ ] Try on a row without URL — is there an error or does it copy "null"?
- **Issue?** (Silent copy of invalid value = issue)

### 2.4 Permissions Enforcement

**Test: Export Permissions**
- [ ] Log in as **writer** (typically no export permission)
- [ ] Can you see Export button?
- [ ] If you see it, does it work or throw error?
- **Issue?** (Button visible but non-functional = confusing UX)

### 2.5 Table Invariants

**Test: Column Width & Truncation**
- [ ] Scroll through table
- [ ] Are all columns consistent width?
- [ ] Do titles/URLs truncate properly?
- [ ] Hover for tooltip?
- **Issue?** (Text wrapping = issue)

---

## Module 3: Social Posts (`/social-posts` + `/social-posts/[id]`)

### Setup
1. Log in as **admin**
2. Navigate to `/social-posts`

### 3.1 Forms & Input Behavior

**Test: Editor Step 1 (Setup)**
- [ ] Click "Create Social Post" or new row
- [ ] Try to move to Step 2 without filling required fields
- [ ] Does it block? Show inline error?
- **Issue?** (Silent progress or only toast = issue)

**Test: Editor Step 3 (Caption)**
- [ ] Reach caption step
- [ ] Leave caption empty, try to move to Step 4
- [ ] Does it block?
- **Issue?**

### 3.2 Feedback & System Status

**Test: Autosave in Editor**
- [ ] Type in caption
- [ ] Wait 2-3 seconds
- [ ] Do you see "Saving..." or similar?
- [ ] Or does it save silently with no feedback?
- **Issue?** (Silent save = issue)

**Test: Status Change in Table**
- [ ] Click status on a post row (if editable inline)
- [ ] Change status
- [ ] Do you see loading? Success feedback?
- **Issue?**

### 3.3 Error Handling

**Test: Invalid Link Input**
- [ ] In Step 1, try to paste invalid Canva URL
- [ ] Does it validate? Show error?
- [ ] Or accept it and fail later?
- **Issue?** (Late validation = issue)

**Test: Caption with Invalid Characters**
- [ ] Try to submit caption with special characters platform doesn't support
- [ ] Is error clear about which platform and what characters?
- **Issue?**

### 3.4 Permissions Enforcement

**Test: Editor Access**
- [ ] Log in as **writer** (shouldn't be able to edit posts)
- [ ] Can you access social posts page?
- [ ] Can you edit a post?
- **Issue?** (Writer can edit post = permission leak)

### 3.5 Table Invariants

**Test: Post Title Truncation**
- [ ] Find post with long title in table
- [ ] Does it truncate with ellipsis?
- [ ] Hover for full title?
- **Issue?**

---

## Module 4: Ideas (`/ideas`)

### Setup
1. Log in as **any user**
2. Navigate to `/ideas`

### 4.1 Forms & Input Behavior

**Test: Edit Idea Modal**
- [ ] Click "Edit" on any idea
- [ ] Try to clear required field (e.g., title), save
- [ ] Does it block with inline error?
- **Issue?**

**Test: Conversion to Blog**
- [ ] Click "Convert to Blog"
- [ ] Are all required fields pre-filled or do they require input?
- [ ] Try to submit without assigning writer
- [ ] Does it block?
- **Issue?**

### 4.2 Feedback & System Status

**Test: Comment Addition**
- [ ] Add a comment to an idea
- [ ] Do you see loading state?
- [ ] Success confirmation?
- **Issue?**

### 4.3 Error Handling

**Test: Conversion Error**
- [ ] Try to convert to blog with missing required field (e.g., no site selected)
- [ ] Is error clear about what's missing?
- **Issue?** (Generic "Failed to convert" = issue)

### 4.4 Permissions Enforcement

**Test: Comment Editing**
- [ ] Add a comment
- [ ] Can you edit your own comment? Someone else's?
- [ ] Should only be editable by author + admin
- **Issue?** (Non-author can edit = issue)

### 4.5 Table/Card Invariants

**Test: Idea Card Layout**
- [ ] Do idea cards have consistent height?
- [ ] Long titles — do they truncate or wrap?
- **Issue?**

---

## Module 5: Calendar (`/calendar`)

### Setup
1. Log in as **publisher** (has reschedule permission)
2. Navigate to `/calendar`

### 5.1 Forms & Input Behavior

**Test: Drag & Drop Date Change**
- [ ] Drag a blog to a different date
- [ ] Does it show a confirmation dialog?
- [ ] Can you cancel?
- **Issue?** (Silent drag = issue)

### 5.2 Feedback & System Status

**Test: Reschedule Feedback**
- [ ] Drag a blog
- [ ] After confirmation, do you see loading? Success?
- [ ] Or does calendar silently update?
- **Issue?**

### 5.3 Error Handling

**Test: Invalid Date Drag**
- [ ] Try to drag past a published blog (shouldn't be allowed)
- [ ] Or to an invalid date (e.g., past)
- [ ] Is error clear?
- **Issue?**

### 5.4 Permissions Enforcement

**Test: Reschedule as Non-Publisher**
- [ ] Log in as **writer**
- [ ] Can you drag blogs on calendar?
- [ ] Should be disabled
- **Issue?** (Drag allowed when shouldn't = issue)

### 5.5 Calendar Layout Invariants

**Test: Row Heights**
- [ ] Switch to week view
- [ ] Are blog lines consistent height?
- [ ] Do they expand if long title?
- **Issue?**

---

## Module 6: Tasks (`/tasks`)

### Setup
1. Log in as **any user**
2. Navigate to `/tasks`

### 6.1 Forms & Input Behavior

**Test: Inline Status Update**
- [ ] Click status on a task
- [ ] Try to set invalid status (e.g., jump stages)
- [ ] Does it block?
- **Issue?**

### 6.2 Feedback & System Status

**Test: Status Change Feedback**
- [ ] Change task status
- [ ] Do you see loading? Success?
- **Issue?**

### 6.3 Error Handling

**Test: Overdue Task Update**
- [ ] Find an overdue task
- [ ] Try to mark complete
- [ ] Is there any validation (e.g., can't complete overdue without note)?
- [ ] Or does it allow silent completion?
- **Issue?**

### 6.4 Permissions Enforcement

**Test: Task Visibility**
- [ ] Log in as **writer** assigned to tasks
- [ ] Can you see all team's tasks or only yours?
- [ ] Should only see own tasks
- **Issue?** (Can see others' tasks = issue)

### 6.5 Table Invariants

**Test: Pagination**
- [ ] Expand full list
- [ ] Change page
- [ ] Is pagination stable?
- [ ] Do rows have consistent height?
- **Issue?**

---

## Submission Instructions

1. **For each issue found**, add an entry to `AUDIT_RESPONSES.json` (template provided separately)
2. **Be specific**: Include exact steps, what you expected vs. what happened
3. **Include priority gut-check**: High/Medium/Low (we'll validate later)
4. **Run parser**: `node audits/audit_parser.js < audits/AUDIT_RESPONSES.json`
5. **Commit findings**: All generated issue files will be in `audits/` directory

---

## Questions During Testing?

- If something seems broken but you're unsure if it's a rule violation, **log it anyway**
- Format: Use the AUDIT_RESPONSES template
- We'll validate during synthesis phase
