# Social Post Field Requirements Matrix

## Overview
This document defines exactly which fields are mandatory or optional at each workflow stage, and who is responsible for providing them.

---

## Field Ownership by Role

### Worker (Non-Admin)
**Responsible for providing:**
- Product
- Type
- Canva URL
- Live Links (when publishing)

### Admin (Reviewer)
**Responsible for providing:**
- Title
- Platforms
- Caption
- Scheduled Publish Date

### Optional (Either)
- Canva Page
- Associated Blog
- (Can be filled by anyone at any time)

---

## Stage-by-Stage Requirements

### Draft
**Status:** Created by Worker with minimal setup  
**Owner:** Worker

| Field | Mandatory | Optional | Who Provides | Notes |
|-------|-----------|----------|--------------|-------|
| Product | ✅ | | Worker | Required for creation |
| Type | ✅ | | Worker | Required for creation |
| Canva URL | ✅ | | Worker | Required for creation |
| Title | | ✅ | Either | Worker can start; Admin will finalize |
| Platforms | | ✅ | Either | Worker can start; Admin will finalize |
| Scheduled Date | | ✅ | Either | Worker can start; Admin will finalize |
| Caption | | ✅ | Either | Worker can start; Admin will finalize |
| Associated Blog | | ✅ | Either | Optional throughout |
| Canva Page | | ✅ | Either | Optional throughout |

**Action:** Worker submits for review without Title or Platforms  
**Transition Requirement:** None (draft has no mandatory requirements beyond creation)

---

### In Review
**Status:** Admin is reviewing  
**Owner:** Admin

| Field | Mandatory | Optional | Who Provides | Notes |
|-------|-----------|----------|--------------|-------|
| Product | ✅ | | Worker | Already provided |
| Type | ✅ | | Worker | Already provided |
| Canva URL | ✅ | | Worker | Already provided |
| Title | ✅ | | Admin | **NEW REQUIREMENT** - Admin must add before moving to Creative Approved |
| Platforms | ✅ | | Admin | **NEW REQUIREMENT** - Admin must add before moving to Creative Approved |
| Scheduled Date | | ✅ | Either | Will be required at Ready to Publish |
| Caption | | ✅ | Either | Will be required at Ready to Publish |
| Associated Blog | | ✅ | Either | Optional throughout |
| Canva Page | | ✅ | Either | Optional throughout |

**Action:** Admin reviews, adds Title + Platforms, then approves  
**Transition Requirement:** Title + Platforms must be present before moving to Creative Approved

---

### Changes Requested
**Status:** Worker is revising based on feedback  
**Owner:** Worker

| Field | Mandatory | Optional | Who Provides | Notes |
|-------|-----------|----------|--------------|-------|
| Product | ✅ | | Worker | Already provided |
| Type | ✅ | | Worker | Already provided |
| Canva URL | ✅ | | Worker | Already provided |
| Title | ✅ | | Already provided | No new requirements |
| Platforms | ✅ | | Already provided | No new requirements |
| Scheduled Date | | ✅ | Either | Optional for revision |
| Caption | | ✅ | Either | Optional for revision |
| Associated Blog | | ✅ | Either | Optional throughout |
| Canva Page | | ✅ | Either | Optional throughout |

**Action:** Worker makes requested changes, resubmits for review  
**Transition Requirement:** Same as In Review (Title + Platforms already present)

---

### Creative Approved
**Status:** Admin has approved creative; now preparing for execution  
**Owner:** Admin

| Field | Mandatory | Optional | Who Provides | Notes |
|-------|-----------|----------|--------------|-------|
| Product | ✅ | | Worker | Already provided |
| Type | ✅ | | Worker | Already provided |
| Canva URL | ✅ | | Worker | Already provided |
| Title | ✅ | | Admin | Already provided |
| Platforms | ✅ | | Admin | Already provided |
| Scheduled Date | ✅ | | Admin | **NEW REQUIREMENT** - Admin must add before Ready to Publish |
| Caption | ✅ | | Admin | **NEW REQUIREMENT** - Admin must add before Ready to Publish |
| Associated Blog | | ✅ | Either | Optional throughout |
| Canva Page | | ✅ | Either | Optional throughout |

**Action:** Admin adds Caption + Scheduled Date, then moves to Ready to Publish  
**Transition Requirement:** Caption + Scheduled Date must be present before moving to Ready to Publish

---

### Ready to Publish
**Status:** Post is locked and ready for execution (Worker publishes)  
**Owner:** Worker  
**Field Lock Status:** Brief fields LOCKED (see below)

| Field | Mandatory | Optional | Who Provides | Notes |
|-------|-----------|----------|--------------|-------|
| Product | ✅ LOCKED | | Worker | Cannot edit - locked in execution stage |
| Type | ✅ LOCKED | | Worker | Cannot edit - locked in execution stage |
| Canva URL | ✅ LOCKED | | Worker | Cannot edit - locked in execution stage |
| Title | ✅ LOCKED | | Admin | Cannot edit - locked in execution stage |
| Platforms | ✅ LOCKED | | Admin | Cannot edit - locked in execution stage |
| Scheduled Date | ✅ LOCKED | | Admin | Cannot edit - locked in execution stage |
| Caption | ✅ LOCKED | | Admin | Cannot edit - locked in execution stage |
| Associated Blog | | ✅ | Either | Can still be edited (not locked) |
| Canva Page | | ✅ | Either | Can still be edited (not locked) |

**Action:** Worker publishes post on social platforms  
**Transition Requirement:** All brief fields present; moves to Awaiting Live Link  
**Edit Brief:** Only Admin can use "Edit Brief" button to reopen to Creative Approved if changes needed

---

### Awaiting Live Link
**Status:** Post is published; Worker submitting live links  
**Owner:** Worker  
**Field Lock Status:** Brief fields LOCKED

| Field | Mandatory | Optional | Who Provides | Notes |
|-------|-----------|----------|--------------|-------|
| Product | ✅ LOCKED | | Worker | Cannot edit - locked in execution stage |
| Type | ✅ LOCKED | | Worker | Cannot edit - locked in execution stage |
| Canva URL | ✅ LOCKED | | Worker | Cannot edit - locked in execution stage |
| Title | ✅ LOCKED | | Admin | Cannot edit - locked in execution stage |
| Platforms | ✅ LOCKED | | Admin | Cannot edit - locked in execution stage |
| Scheduled Date | ✅ LOCKED | | Admin | Cannot edit - locked in execution stage |
| Caption | ✅ LOCKED | | Admin | Cannot edit - locked in execution stage |
| Associated Blog | | ✅ | Either | Can still be edited (not locked) |
| Canva Page | | ✅ | Either | Can still be edited (not locked) |

**Action:** Worker adds live links (at least 1 required)  
**Transition Requirement:** ≥1 valid live link in social_post_links table before moving to Published

---

### Published
**Status:** Post is complete and done  
**Owner:** None (terminal state)

| Field | Mandatory | Optional | Who Provides | Notes |
|-------|-----------|----------|--------------|-------|
| Product | ✅ | | Worker | Required for published |
| Type | ✅ | | Worker | Required for published |
| Canva URL | ✅ | | Worker | Required for published |
| Title | ✅ | | Admin | Required for published |
| Platforms | ✅ | | Admin | Required for published |
| Scheduled Date | ✅ | | Admin | Required for published |
| Caption | ✅ | | Admin | Required for published |
| Associated Blog | | ✅ | Either | Optional throughout |
| Canva Page | | ✅ | Either | Optional throughout |
| Live Links | ✅ | | Worker | At least 1 required (≥1 in social_post_links) |

**Action:** None (terminal state)  
**Transition Requirement:** N/A (no further transitions)

---

## Summary Table: When Each Field Becomes Mandatory

| Field | Becomes Mandatory At | Provided By | Notes |
|-------|---------------------|-------------|-------|
| Product | Draft (creation) | Worker | Required from day 1 |
| Type | Draft (creation) | Worker | Required from day 1 |
| Canva URL | Draft (creation) | Worker | Required from day 1 |
| Title | In Review | Admin | Worker can provide but Admin finalizes |
| Platforms | In Review | Admin | Worker can provide but Admin finalizes |
| Caption | Ready to Publish | Admin | Added in Creative Approved stage |
| Scheduled Date | Ready to Publish | Admin | Added in Creative Approved stage |
| Live Links | Published | Worker | Submitted in Awaiting Live Link stage |
| Associated Blog | Never (optional) | Either | Can be added anytime |
| Canva Page | Never (optional) | Either | Can be added anytime |

---

## Locked Fields During Execution

**Execution Stages:** `ready_to_publish`, `awaiting_live_link`

**Fields that are LOCKED (cannot edit):**
- Product
- Type
- Canva URL
- Canva Page (locked with other brief fields)
- Title
- Platforms
- Caption
- Scheduled Date

**Fields that are NOT LOCKED (can still edit):**
- Associated Blog
- Live Links (can add/edit in awaiting_live_link)

**How to Edit Locked Fields:**
- **Admin only:** Click "Edit Brief" button (admin-only action)
- **Effect:** Reopens post to `creative_approved` (unlocking all fields)
- **Logged:** Activity is logged for audit trail
- **Reason:** Optional reason can be provided when reopening

---

## Enforcement Points

### API Level (`src/lib/social-post-workflow.ts`)
- `REQUIRED_FIELDS_FOR_STATUS` defines mandatory fields for each status
- Validation happens at transition endpoint
- Locked field check prevents updates to brief fields during execution

### Database Level (RLS + Triggers)
- `enforce_social_post_workflow_transition` trigger prevents locked field edits
- Returns: `"Brief fields cannot be edited in execution stages. Use Edit Brief."`

### UI Level
- Fieldset wraps form with `disabled={isExecutionLocked}` during execution stages
- Checklist shows which fields are required for next stage
- "Edit Brief" button visible only to admin when post is in execution

---

## Examples

### Example 1: Ali Creates Post
1. Ali creates post with **Product: ALPR Plus, Type: Image, Canva URL: [link]** ✅
2. Ali can optionally add Title, Platforms, etc. (optional at this stage)
3. Ali clicks "Submit for Review" → transitions to `in_review` ✅
4. **No blocker:** Title and Platforms are NOT required yet

### Example 2: Admin Reviews and Approves
1. Admin sees post in `in_review`
2. Admin checks checklist: "Title" ❌, "Platforms" ❌
3. Admin adds **Title: "New Feature Launch"** ✅
4. Admin selects **Platforms: LinkedIn, Facebook** ✅
5. Admin clicks "Approve Creative" → transitions to `creative_approved` ✅

### Example 3: Admin Prepares for Publishing
1. Post is in `creative_approved`
2. Admin checks checklist: "Caption" ❌, "Scheduled Date" ❌
3. Admin writes **Caption: "Check out our new..."** ✅
4. Admin sets **Scheduled Date: 2026-03-28** ✅
5. Admin clicks "Move to Ready to Publish" → transitions to `ready_to_publish` ✅
6. **All brief fields are now LOCKED**

### Example 4: Worker Publishes
1. Ali sees post in `ready_to_publish` with brief fields grayed out (locked)
2. Ali publishes on LinkedIn/Facebook/Instagram
3. Ali clicks "Mark Awaiting Link"→ transitions to `awaiting_live_link` ✅
4. Ali adds **Live Link: https://linkedin.com/feed/update/...**  ✅
5. Ali clicks "Submit Link" → transitions to `published` ✅

### Example 5: Admin Needs to Reopen Brief
1. Post is in `ready_to_publish`, brief fields are locked
2. Admin realizes Caption needs to be updated
3. Admin (only) can click **"Edit Brief"** button
4. Post reopens to `creative_approved`, all fields unlocked
5. Admin makes changes, approves again → back to `ready_to_publish`
6. Brief fields locked again

---

## Implementation Status

✅ **LOCKED:** This matrix is now the source of truth  
✅ **CODE:** `REQUIRED_FIELDS_FOR_STATUS` in `src/lib/social-post-workflow.ts`  
✅ **DB:** RLS policies and triggers enforce locking  
✅ **UI:** Checklist + validation in right sidebar shows requirements per stage
