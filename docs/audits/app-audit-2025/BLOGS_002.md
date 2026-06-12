# Long blog titles cause text wrapping instead of truncation with tooltip

**Module**: Blogs
**Rule violated**: Table Invariants (MUST)
**Priority**: Medium

## What happened
Blog Library table shows titles in truncation rule violation. Very long titles wrap to multiple lines instead of truncating to single line with ellipsis. When rows wrap, pagination controls shift unpredictably.

## Expected behavior
Per Table Invariants rule: Single-line truncation with ellipsis + tooltip on hover. Row height must remain fixed. Pagination controls must never shift due to content expansion.

## Steps to reproduce
   1. Navigate to Blogs library
   2. Find blog with title > 80 characters
   3. Observe: Title text wraps to 2-3 lines
   4. Change page → pagination controls shifted upward

## Impact
Unpredictable table layout, difficult pagination navigation

## Additional context
Requires truncate CSS class + max-width constraint on title cells
