# Copy URL on missing URL value copies literal 'null' string

**Module**: Blogs
**Rule violated**: Error Handling (MUST)
**Priority**: Medium
**Type**: Code Quality Issue (+ Governance Violation)

## What happened
Blog Library page has row-level copy buttons for URLs. When blog has no Live URL set, clicking copy button still succeeds but copies the string 'null' to clipboard instead of showing error.

## Expected behavior
Per Error Handling rule: Errors must be actionable and clear. Should either: (a) disable copy button if URL missing, or (b) show error toast 'URL not available - cannot copy'

## Steps to reproduce
   1. Navigate to Blogs library
   2. Find a blog row without Live URL set
   3. Click copy URL button
   4. Paste clipboard → shows literal 'null' string

## Impact
Data confusion - user believes URL copied but gets invalid value

## Additional context
Affects user trust in copy-to-clipboard functionality. Null handling should validate before copy action.
