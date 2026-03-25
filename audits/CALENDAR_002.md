# Calendar reschedule action provides no loading feedback

**Module**: Calendar
**Rule violated**: Feedback & System Status (MUST)
**Priority**: Medium

## What happened
After drag-and-drop reschedule, calendar updates silently with no loading state or success feedback. User unsure if reschedule succeeded or failed.

## Expected behavior
Per Feedback & System Status rule: Every action must show loading state and success/error feedback. Reschedule should show loading state during API call, then success confirmation.

## Steps to reproduce
   1. Drag blog on calendar
   2. Observe: No loading spinner during API call
   3. Calendar updates silently with no success message

## Impact
User uncertainty about action success, may attempt duplicate reschedules

## Additional context
Affects all async operations in calendar
