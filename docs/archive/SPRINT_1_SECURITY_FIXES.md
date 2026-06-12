# SPRINT 1: Security Fixes (API Authorization, RLS, Permissions)

**Status**: IN PROGRESS  
**Duration**: Week 1  
**Effort**: 28-30 hours  
**Blocking**: Must complete before data/form fixes

---

## Issue #1: API Authorization Not Enforced (GLOBAL_003)
**Status**: RLS Migration Created ✅  
**Effort**: 12-16 hours  
**Blocker**: YES (must complete first)

### Completed
- [x] Phase 1A: RLS Policy Audit
  - [x] Identified missing RLS SELECT/INSERT/UPDATE policies on blogs, social_posts
  - [x] Identified missing RLS on social_post_comments table
- [x] Phase 1B: Created Comprehensive RLS Migration
  - Created: `supabase/migrations/20260326100000_enforce_comprehensive_rls_policies.sql`
  - Policies added:
    - blogs: SELECT (by creator/writer/publisher/admin), INSERT (creator), UPDATE (authorized), DELETE (published check)
    - social_posts: SELECT (by creator/assigned/editor/admin), INSERT, UPDATE, DELETE (published check)
    - comments: author-only edit enforced (blog_comments, social_post_comments, blog_idea_comments)
    - task_assignments: assigned user only (privacy boundary for Issue #3)
    - social_post_links: post owner only

### Next
- [ ] Phase 1C: API Validation Layer
- [ ] Phase 1D: Testing & Verification

---

## Issue #2: Comments Editable by Anyone (IDEAS_001)
**Status**: WAITING FOR #1  
**Effort**: 4-6 hours  
**Dependencies**: Issue #1 (RLS policies)

RLS policies for comment editing are included in the comprehensive migration above.

---

## Issue #3: Users See All Team Tasks (TASKS_001)
**Status**: WAITING FOR #1  
**Effort**: 6-8 hours  
**Dependencies**: Issue #1 (RLS policies)

RLS policy for task privacy is included in the comprehensive migration above.

---

## Acceptance Criteria

✅ RLS Migration Complete - All tables have comprehensive policies  
⏳ API Testing - Pending execution and verification
