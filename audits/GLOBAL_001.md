# Generic error messages lack actionable next steps

**Module**: Global
**Rule violated**: Error Handling (MUST)
**Priority**: High

## What happened
Across all modules, error toasts show generic messages like 'Something went wrong' or 'Failed to update' without explaining what failed or what user should do next.

## Expected behavior
Per Error Handling rule: All errors must be human-readable and actionable. Should explain (a) what went wrong, (b) why it happened, (c) what to do next.

## Steps to reproduce
   1. Trigger any API error across modules
   2. Observe error toast
   3. Message gives no clear guidance for fix

## Impact
User frustration, support tickets, unclear error resolution path

## Additional context
Requires error message standardization across API layer
