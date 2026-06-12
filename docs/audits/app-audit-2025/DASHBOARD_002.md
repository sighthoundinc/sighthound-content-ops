# Bulk action modal lacks per-field validation before submit

**Module**: Dashboard
**Rule violated**: Forms & Input Behavior (MUST)
**Priority**: High

## What happened
Bulk action confirmation dialog appears but does not validate required fields (e.g., 'Assign To' field in bulk reassign) before allowing submission. User can click submit with empty critical fields.

## Expected behavior
Per Forms & Input Behavior rule: Required fields must be enforced at UI level before submission. Bulk action should disable submit button if any required field is empty, and show inline error explaining what's missing.

## Steps to reproduce
   1. Select multiple blog rows on Dashboard
   2. Click bulk action (e.g., Reassign Writer)
   3. In confirmation dialog, leave 'Assign To' field empty
   4. Submit button is still enabled and clickable

## Impact
Invalid/incomplete bulk mutations enter workflow, potential data inconsistency

## Additional context
Violates Data Mutation Safety rule - mutations should be validated before execution
