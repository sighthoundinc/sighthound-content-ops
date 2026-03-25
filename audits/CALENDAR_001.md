# Drag-and-drop reschedule lacks confirmation and validation

**Module**: Calendar
**Rule violated**: Forms & Input Behavior (MUST)
**Priority**: Medium

## What happened
Calendar allows dragging blogs to reschedule with no confirmation dialog or validation. Silent drag without user acknowledgment. No validation for invalid dates (e.g., dragging to past date).

## Expected behavior
Per Forms & Input Behavior rule: Destructive actions require confirmation. Drag should show confirmation dialog before applying date change. Should validate date is in future before allowing.

## Steps to reproduce
   1. Calendar view
   2. Drag blog to different date
   3. No confirmation dialog appears
   4. Date silently changes

## Impact
Accidental reschedules, user confusion about current schedule

## Additional context
Drag should also check publish date is after today
