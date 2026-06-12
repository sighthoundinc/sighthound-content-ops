# Autosave in editor provides no visible feedback

**Module**: Social Posts
**Rule violated**: Feedback & System Status (MUST)
**Priority**: Medium

## What happened
Social Post editor has autosave on caption field but provides no 'Saving...' indicator, loading spinner, or success confirmation. User has no way to know if autosave succeeded or what the current save state is.

## Expected behavior
Per Feedback & System Status rule: Every action must produce visible feedback. Autosave should show brief 'Saving...' indicator while request completes, then silent success or error toast if fails.

## Steps to reproduce
   1. Open social post editor
   2. Type in caption field
   3. Wait 2-3 seconds for autosave
   4. No loading state, no success feedback visible

## Impact
User uncertainty about save state - may lose work if unsure

## Additional context
Affects all autosave fields (caption, title, etc.)
