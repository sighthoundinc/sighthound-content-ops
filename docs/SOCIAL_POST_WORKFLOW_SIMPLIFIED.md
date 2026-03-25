# Social Post Workflow: 3 Core Principles

## 🎯 The Model (Super Simple)

**Worker starts → Admin prepares → Worker finishes**

---

## 1️⃣ Field Ownership (Final)

### Worker owns:
- Product
- Type
- Canva URL
- Live Links

### Admin owns:
- Title
- Platforms
- Caption
- Scheduled Date

### Optional (safe to edit anytime):
- Associated Blog
- Canva Page

---

## 2️⃣ Fields Become Mandatory Only at Transitions

Fields are **not required during a stage**—they're only validated **when moving to the next stage**.

### Transition Requirements:

| Transition | Required Fields | Who Provides |
|-----------|-----------------|--------------|
| `draft` → `in_review` | Product, Type, Canva URL | Worker |
| `in_review` → `creative_approved` | + Title, Platforms | Admin |
| `creative_approved` → `ready_to_publish` | + Caption, Scheduled Date | Admin |
| `awaiting_live_link` → `published` | + ≥1 Live Link | Worker |

**That's it.** No other "required" logic anywhere.

**Why this works:**
- Worker isn't blocked by Admin fields early
- Admin can review at their own pace
- Each stage has one clear responsibility
- No confusion about "inside stage" vs "at transition"

---

## 3️⃣ Fields Lock Permanently Once Execution Starts

**Execution stages:** `ready_to_publish`, `awaiting_live_link`

### What's LOCKED:
```
Product, Type, Canva URL, Canva Page
Title, Platforms, Caption, Scheduled Date
```

### What's still editable:
```
Associated Blog (optional, not critical)
Live Links (only in awaiting_live_link stage)
```

### How to unlock (admin only):
Transition backward: `ready_to_publish` or `awaiting_live_link` → `changes_requested` (with reason)

---

## 📊 Stage Behavior at a Glance

| Stage | Owner | What Happens | Field Status |
|-------|-------|--------------|--------------|
| **Draft** | Worker | Creates, can edit anything | All editable |
| **In Review** | Admin | Reviews, adds Title + Platforms | All editable |
| **Changes Requested** | Worker | Fixes issues | All editable |
| **Creative Approved** | Admin | Adds Caption + Scheduled Date | All editable |
| **Ready to Publish** | Worker | Publishes externally | **LOCKED** (except optional) |
| **Awaiting Live Link** | Worker | Adds live links | **LOCKED** (except optional + links) |
| **Published** | — | Done | Read-only |

---

## 🔒 Field Locking Rule (Single Source of Truth)

**In `src/lib/social-post-workflow.ts`:**

```typescript
export const LOCKED_BRIEF_FIELDS = [
  "title", "platforms", "product", "type", "canva_url", "canva_page"
];

export function isExecutionStage(status: SocialPostStatus): boolean {
  return status === "ready_to_publish" || status === "awaiting_live_link";
}
```

These fields CANNOT be edited during execution stages. Period.

---

## ✅ Enforcement (3 Levels)

### 1. API Level
`POST /api/social-posts/[id]/transition`
- Validates `REQUIRED_FIELDS_FOR_STATUS` before allowing transitions
- Rejects any locked field updates during execution

### 2. Database Level
RLS policies + trigger `enforce_social_post_workflow_transition`
- Prevents locked field edits at the database
- Returns: `"Brief fields cannot be edited in execution stages. Use Edit Brief."`

### 3. UI Level
- Form fieldset: `disabled={isExecutionLocked}`
- Checklist: Shows which fields are required for **next transition**
- "Edit Brief" button: Admin-only, visible during execution

---

## 📝 Simple Checklist

Before each transition, check:

1. **Before `in_review`:** Product ✅ Type ✅ Canva URL ✅
2. **Before `creative_approved`:** + Title ✅ Platforms ✅
3. **Before `ready_to_publish`:** + Caption ✅ Scheduled Date ✅
4. **Before `published`:** + Live Link ✅ (≥1)

---

## 🚀 Examples

### Example 1: Ali Creates
```
Ali: "Create post"
   Product: ALPR Plus ✅
   Type: Image ✅
   Canva URL: https://... ✅
   
Ali: "Submit for Review" → transitions to in_review ✅
(No blocker. Title + Platforms not needed yet.)
```

### Example 2: Admin Reviews
```
Admin: "Review this post in in_review"
   Sees: Title ❌ Platforms ❌
   Adds: Title: "New Feature" ✅
         Platforms: LinkedIn, Facebook ✅
         
Admin: "Approve Creative" → transitions to creative_approved ✅
```

### Example 3: Admin Prepares
```
Admin: "Prepare post in creative_approved"
   Sees: Caption ❌ Scheduled Date ❌
   Adds: Caption: "Check out..." ✅
         Scheduled Date: 2026-03-28 ✅
         
Admin: "Move to Ready to Publish" → transitions to ready_to_publish ✅
(All brief fields now LOCKED)
```

### Example 4: Ali Publishes
```
Ali: "Publish post (in ready_to_publish)"
   Fields greyed out (locked) ✅
   Ali publishes on LinkedIn/Facebook/Instagram
   Ali: "Mark Awaiting Link" → awaiting_live_link ✅
   
Ali: "Add live link"
   Adds: Live Link: https://linkedin.com/feed/... ✅
   Ali: "Submit Link" → published ✅
```

---

## 🎯 Why This Is Better

✅ **Clear ownership:** Worker vs Admin, no ambiguity  
✅ **No blockers:** Fields required only when needed  
✅ **Permanent lock:** Execution is stable, no accidental edits  
✅ **Single transition rule:** Required fields validated at transitions, nowhere else  
✅ **Enforceable:** API + DB + UI all use the same list  

---

## 🚫 What Changed

**Removed:**
- ❌ "Required inside stage" logic
- ❌ "Either can edit anytime" flexibility
- ❌ Complex stage-based role tables
- ❌ Conditional field requirements

**Kept:**
- ✅ Field ownership
- ✅ Transition validation
- ✅ Field locking

**Result:** Simpler, more enforceable, clearer for everyone.
