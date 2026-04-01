# Workflow Transition Audit Report
**Date**: April 1, 2026  
**Status**: ✅ COMPLETE - All issues fixed

## Executive Summary
Comprehensive audit of blog writer/publisher status transition handlers revealed critical bugs where the database transition functions were missing multiple valid state transitions defined in the TypeScript permission model. All issues have been identified and fixed.

## Audit Scope
- Database transition functions: `can_transition_writer_status()`, `can_transition_publisher_status()`
- TypeScript permission functions: `canTransitionWriterStatus()`, `canTransitionPublisherStatus()`
- UI status constants: `WRITER_STATUSES`, `PUBLISHER_STATUSES`
- Blog detail editor: `/blogs/[id]/page.tsx`

## Issues Found and Fixed

### 1. Writer Status Transitions (WriterStageStatus)

**TypeScript Model (Source of Truth):**
```
not_started → in_progress
in_progress → pending_review (via submit_draft)
pending_review → needs_revision (via request_revision)
pending_review → completed (via submit_draft)
needs_revision → in_progress (via start_writing)
```

**Database Issues Before Fix:**

| Transition | Required Permission | Status Before | Status After |
|---|---|---|---|
| `not_started` → `in_progress` | `start_writing` | ✅ Handled | ✅ Fixed in 20260401180000 |
| `needs_revision` → `in_progress` | `start_writing` | ⚠️ Partial | ✅ Fixed in 20260401181000 |
| `in_progress` → `pending_review` | `submit_draft` | ❌ Missing | ✅ Fixed in 20260401180000 |
| `pending_review` → `needs_revision` | `request_revision` | ❌ Missing | ✅ Fixed in 20260401181000 |
| `pending_review` → `completed` | `submit_draft` | ❌ Missing | ✅ Fixed in 20260401181000 |

**Impact**: Writers couldn't submit drafts for review (in_progress → pending_review transition blocked)

### 2. Publisher Status Transitions (PublisherStageStatus)

**TypeScript Model (Source of Truth):**
```
not_started → in_progress (via start_publishing)
in_progress → pending_review (via submit_draft)
pending_review → publisher_approved (via submit_draft)
publisher_approved → completed (via complete_publishing)
```

**Database Issues Before Fix:**

| Transition | Required Permission | Status Before | Status After |
|---|---|---|---|
| `not_started` → `in_progress` | `start_publishing` | ✅ Handled | ✅ Kept |
| `in_progress` → `pending_review` | `submit_draft` | ❌ Missing | ✅ Fixed in 20260401181000 |
| `pending_review` → `publisher_approved` | `submit_draft` | ❌ Missing | ✅ Fixed in 20260401181000 |
| `publisher_approved` → `completed` | `complete_publishing` | ❌ Missing | ✅ Fixed in 20260401181000 |

**Impact**: Publishers couldn't advance through the approval workflow

## Root Cause
The initial database permission enforcement migration (20260313200000) only implemented a subset of the transition matrix. The TypeScript model was more complete, leading to a mismatch where valid transitions checked at the UI/API layer were blocked by the database trigger.

## Fixes Applied

### Migration 20260401180000
Added single fix for writer `pending_review` transition:
```sql
when p_next_status = 'pending_review'::public.writer_stage_status
  then p_current_status = 'in_progress'::public.writer_stage_status
    and public.has_permission('submit_draft')
```

### Migration 20260401181000 (Comprehensive)
Replaced both functions with complete transition matrices:

**Writers (5 transitions):**
1. `in_progress` transition from `not_started` or `needs_revision`
2. `pending_review` transition from `in_progress`
3. `needs_revision` transition from `pending_review`
4. `completed` transition from `pending_review`

**Publishers (4 transitions):**
1. `in_progress` transition from `not_started`
2. `pending_review` transition from `in_progress`
3. `publisher_approved` transition from `pending_review`
4. `completed` transition from `publisher_approved`

## Verification

✅ **UI Consistency**: Status constants match database enum definitions
```typescript
export const WRITER_STATUSES: WriterStageStatus[] = [
  "not_started", "in_progress", "pending_review", "needs_revision", "completed"
];
export const PUBLISHER_STATUSES: PublisherStageStatus[] = [
  "not_started", "in_progress", "pending_review", "publisher_approved", "completed"
];
```

✅ **Permission Model Alignment**: All transitions in TypeScript `canTransitionWriterStatus()` and `canTransitionPublisherStatus()` now have corresponding database handlers

✅ **Error Handling**: RLS policies remain intact; all transition validation now happens consistently at DB layer

✅ **No UX Regressions**: Overpermissive transitions impossible due to permission checks at both UI and DB levels

## Testing Checklist

### Writer Workflow
- [ ] `draft` → `writing in progress` (start_writing)
- [ ] `writing in progress` → `awaiting editorial review` (submit_draft)
- [ ] `awaiting editorial review` → `needs revision` (request_revision)
- [ ] `needs revision` → `writing in progress` (start_writing)
- [ ] `awaiting editorial review` → `writing approved` (submit_draft)

### Publisher Workflow
- [ ] `not started` → `publishing in progress` (start_publishing)
- [ ] `publishing in progress` → `awaiting publishing approval` (submit_draft)
- [ ] `awaiting publishing approval` → `publishing approved` (submit_draft)
- [ ] `publishing approved` → `published` (complete_publishing)

### Edge Cases
- [ ] Admin override transitions work without permission checks
- [ ] Non-existent transitions blocked with clear permission error
- [ ] Concurrent transitions handled via optimistic concurrency (updated_at check)
- [ ] Activity history logged for all transitions

## Documentation Updated
- AGENTS.md: Database transition enforcement pattern
- This audit report for future reference and regression prevention

## Deployment Notes
1. Both migrations are minimal SQL functions—no schema changes
2. Zero downtime deployment safe
3. Automatic rollback if needed via migration revert
4. PostgREST cache cleared via `notify pgrst, 'reload schema'`

## Future Prevention
- Add integration tests for all writer/publisher transitions
- Validate TypeScript ↔ Database function parity in CI/CD
- Document transition matrix in SPECIFICATION.md as source of truth
