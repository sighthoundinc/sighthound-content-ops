# Idea conversion to blog dialog lacks required field validation

**Module**: Ideas
**Rule violated**: Forms & Input Behavior (MUST)
**Priority**: Medium

## What happened
Convert to Blog modal appears with pre-filled fields but no validation preventing blank required fields (Title, Writer assignment). User can submit with empty critical fields.

## Expected behavior
Per Forms & Input Behavior rule: Required fields must block submission. Title and Writer assignment should block conversion with inline error if left empty.

## Steps to reproduce
   1. Ideas page → Convert to Blog
   2. Clear Title field
   3. Leave Writer unassigned
   4. Click convert → submits without error

## Impact
Incomplete blog records created, violates required field enforcement

## Additional context
All modals should inherit form validation pattern
