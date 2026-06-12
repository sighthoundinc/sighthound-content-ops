# Inline status dropdown changes lack visible loading state

**Module**: Dashboard
**Rule violated**: Feedback & System Status (MUST)
**Priority**: Medium

## What happened
Dashboard table has inline status update dropdowns for writer_status and publisher_status. When user selects new status, API request fires but no loading spinner or 'Saving...' text appears while request completes.

## Expected behavior
Per Feedback & System Status rule: Every action must produce visible feedback. Status change should show loading state (spinner or disabled state + text) while API request completes, then success confirmation.

## Steps to reproduce
   1. Navigate to Dashboard
   2. Click inline status dropdown on blog row
   3. Select new status value
   4. Observe: No loading spinner appears during API call

## Impact
UX confusion - user uncertain if action succeeded, may click multiple times

## Additional context
Affects all inline editable fields on tables (Dashboard, Social Posts, Tasks tables)
