# Comment editing lacks permission boundary validation

**Module**: Ideas
**Rule violated**: Permissions Enforcement (MUST)
**Priority**: High

## What happened
Idea comments are editable by clicking an edit button on comment. No permission check visible - appears any user can edit any comment (needs verification via code review of API).

## Expected behavior
Per Permissions Enforcement rule: Every feature must define who can view/edit/perform actions. Only comment author + admin should be able to edit comments. RLS policy must enforce this at DB level.

## Steps to reproduce
   1. Navigate to Ideas
   2. Add comment as User A
   3. Log in as User B
   4. Check if User B can click edit on User A's comment

## Impact
Data integrity risk - any user could modify others' comments

## Additional context
Requires RLS policy verification on blog_comments and social_post_comments tables
