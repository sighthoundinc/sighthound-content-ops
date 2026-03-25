# Inconsistent row height across tables causes pagination shift

**Module**: Global
**Rule violated**: Table Invariants (MUST)
**Priority**: Medium

## What happened
Multiple tables (Dashboard, Blogs, Social Posts, Tasks) have content that expands row heights unpredictably - long titles wrap, different line heights per cell. This causes pagination controls to shift when changing pages.

## Expected behavior
Per Table Invariants rule: Fixed row heights (no expansion), single-line truncation with tooltip, pagination stable. All rows in table must have fixed height regardless of content.

## Steps to reproduce
   1. Dashboard table
   2. Look at rows - some are taller than others based on content
   3. Change page → pagination controls shift position

## Impact
Unpredictable table layout, difficult navigation, poor UX

## Additional context
Global pattern issue affecting all DataTable instances
