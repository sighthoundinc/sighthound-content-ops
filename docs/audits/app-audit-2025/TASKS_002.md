# Inline task status change lacks validation for invalid transitions

**Module**: Tasks
**Rule violated**: Forms & Input Behavior (MUST)
**Priority**: Medium

## What happened
Tasks table allows any status change via dropdown without validating transition rules. Can change status in invalid sequence (e.g., Pending → Completed without Assigned first).

## Expected behavior
Per Forms & Input Behavior rule: Form must validate inputs against business rules. Status dropdown should only allow valid transitions based on workflow state.

## Steps to reproduce
   1. Tasks page
   2. Find Not Started task
   3. Try to jump directly to Completed
   4. No validation, state changes directly

## Impact
Invalid workflow state, violates state machine rules

## Additional context
Status transitions must be controlled by API + DB, not just UI dropdown
