# High-Priority Governance Violations — Triage & Implementation Sequencing

**Total**: 8 high-priority findings  
**Risk Level**: 🔴 Critical path for product hardening  
**Estimated Effort**: 40-60 hours  
**Recommended Timeline**: 2-3 weeks (depending on team size)

---

## Risk Classification

### 🔒 **Security/Privacy Risks** (3 issues — Fix First)
1. **[GLOBAL_003](./audits/GLOBAL_003.md)** — API not enforcing permissions
2. **[IDEAS_001](./audits/IDEAS_001.md)** — Comments editable by anyone
3. **[TASKS_001](./audits/TASKS_001.md)** — Users see all team tasks

**Why first**: These are authorization boundary violations. Must be fixed before any other changes to prevent security regressions.

### 📊 **Data Integrity Risks** (2 issues — Fix Second)
4. **[DASHBOARD_002](./audits/DASHBOARD_002.md)** — Bulk actions allow invalid state
5. **[GLOBAL_004](./audits/GLOBAL_004.md)** — Bulk actions lack confirmation

**Why second**: These allow invalid mutations to enter database. Must fix before rolling out any data changes.

### 📋 **Form Validation Gaps** (2 issues — Fix Third)
6. **[SOCIAL_POSTS_001](./audits/SOCIAL_POSTS_001.md)** — Required Platform field not enforced
7. **[SOCIAL_POSTS_003](./audits/SOCIAL_POSTS_003.md)** — Canva URL not validated

**Why third**: These are workflow-specific and don't block other fixes, but required before publishing social posts.

### 📢 **UX/Error Messaging** (1 issue — Fix Last)
8. **[GLOBAL_001](./audits/GLOBAL_001.md)** — Generic error messages

**Why last**: Critical for user experience but doesn't block functionality. Can be done incrementally across all endpoints.

---

## Detailed Triage by Issue

### 🔴 ISSUE 1: API Authorization Not Validated (GLOBAL_003)

| Aspect | Details |
| --- | --- |
| **Risk** | CRITICAL — Security boundary violation |
| **Category** | Permissions Enforcement |
| **Affected Systems** | All API endpoints using PostgREST |
| **Scope** | Global |
| **Effort** | 12-16 hours |
| **Dependencies** | None — independent |
| **Acceptance Criteria** | 1. RLS audit complete on all tables<br>2. Every mutation endpoint has RLS policy<br>3. API validates permissions before mutation<br>4. Test: Cannot trigger export as non-admin via API<br>5. Test: Cannot mutate data without RLS allowing it |
| **Implementation Steps** | 1. Audit all tables for missing RLS policies<br>2. Create RLS policies for each table<br>3. Add API validation for permission-gated endpoints<br>4. Test with curl/Postman to verify backend rejection<br>5. Update AGENTS.md with RLS enforcement checklist |
| **Must Complete Before** | Issues #2, #3, #4, #5 |

### 🔴 ISSUE 2: Comments Editable by Anyone (IDEAS_001)

| Aspect | Details |
| --- | --- |
| **Risk** | CRITICAL — Data integrity/privacy |
| **Category** | Permissions Enforcement |
| **Affected Systems** | blog_comments, social_post_comments tables |
| **Scope** | Ideas, Social Posts |
| **Effort** | 4-6 hours |
| **Dependencies** | Requires ISSUE #1 (RLS policies) |
| **Acceptance Criteria** | 1. RLS policy enforces author-only edit<br>2. Only comment author + admin can update<br>3. Test: User B cannot edit User A's comment<br>4. Test: API rejects non-author edits with 403 |
| **Implementation Steps** | 1. Review current comment edit API<br>2. Add RLS policy to comments tables<br>3. Test permission boundary with multiple users<br>4. Verify UI edit button hidden for non-authors |
| **Must Complete Before** | Public social posts/ideas features |

### 🔴 ISSUE 3: Users See All Team Tasks (TASKS_001)

| Aspect | Details |
| --- | --- |
| **Risk** | CRITICAL — Privacy/information leak |
| **Category** | Permissions Enforcement |
| **Affected Systems** | Tasks table + My Tasks page |
| **Scope** | Tasks page |
| **Effort** | 6-8 hours |
| **Dependencies** | Requires ISSUE #1 (RLS policies) |
| **Acceptance Criteria** | 1. RLS filters tasks by assigned_user_id<br>2. Writers see only own tasks<br>3. Admins see all tasks<br>4. Test: Writer A cannot see Writer B's tasks<br>5. Verify API returns filtered results |
| **Implementation Steps** | 1. Create RLS policy on tasks table<br>2. Filter by `assigned_to_user_id = auth.uid()`<br>3. Add admin override<br>4. Test with multiple user accounts<br>5. Update SPECIFICATION.md permissions section |
| **Must Complete Before** | Tasks feature release |

### 🟠 ISSUE 4: Bulk Actions Lack Field Validation (DASHBOARD_002)

| Aspect | Details |
| --- | --- |
| **Risk** | HIGH — Allows invalid mutations |
| **Category** | Forms & Input Behavior + Data Mutation Safety |
| **Affected Systems** | Dashboard bulk action modal |
| **Scope** | Dashboard |
| **Effort** | 8-10 hours |
| **Dependencies** | None — independent (but pair with Issue #5) |
| **Acceptance Criteria** | 1. Submit button disabled until required fields filled<br>2. Inline error shows "Assign To is required"<br>3. Cannot submit empty Assign To field<br>4. Test: Select rows → no Assign To → Submit disabled<br>5. Select rows → choose assignee → Submit enabled |
| **Implementation Steps** | 1. Find bulk action modal component<br>2. Add form validation on required fields<br>3. Disable submit button if validation fails<br>4. Show inline error message<br>5. Test with multiple bulk actions<br>6. Apply same pattern to all bulk modals |
| **Must Complete Before** | Bulk operations go live |

### 🟠 ISSUE 5: Bulk Actions Lack Confirmation & Preview (GLOBAL_004)

| Aspect | Details |
| --- | --- |
| **Risk** | HIGH — Data loss from accidental bulk mutations |
| **Category** | Data Mutation Safety |
| **Affected Systems** | All bulk operations (Dashboard, Blogs, Tasks) |
| **Scope** | Global |
| **Effort** | 10-12 hours |
| **Dependencies** | Related to Issue #4 (validation) but independent |
| **Acceptance Criteria** | 1. Bulk action shows affected row count<br>2. Shows list of affected items (name, ID)<br>3. User must confirm before execution<br>4. API returns per-row success/failure<br>5. UI shows "5 updated, 0 failed"<br>6. Test: Select 10 rows → preview shows 10 → execute |
| **Implementation Steps** | 1. Enhance bulk action modal with preview section<br>2. Show affected row count and details<br>3. Add "Show affected rows" expand/collapse<br>4. Add confirmation checkbox/button<br>5. Execute mutation and show results breakdown<br>6. Apply to all bulk operations |
| **Must Complete Before** | Bulk delete feature |

### 🟠 ISSUE 6: Required Platform Field Not Enforced (SOCIAL_POSTS_001)

| Aspect | Details |
| --- | --- |
| **Risk** | HIGH — Incomplete posts in workflow |
| **Category** | Forms & Input Behavior |
| **Affected Systems** | Social Post Editor Step 1 |
| **Scope** | Social Posts |
| **Effort** | 4-6 hours |
| **Dependencies** | None — independent |
| **Acceptance Criteria** | 1. Platform field is required (not optional)<br>2. Cannot proceed to Step 2 without selecting<br>3. Inline error: "Platform is required"<br>4. Test: Leave Platform empty → Next disabled<br>5. Test: Select platform → Next enabled |
| **Implementation Steps** | 1. Identify Step 1 form validation logic<br>2. Add Platform to required fields list<br>3. Disable Next button if Platform empty<br>4. Show inline error on Platform field<br>5. Test all required field combinations<br>6. Apply same pattern to other steps |
| **Must Complete Before** | Social post creation feature |

### 🟠 ISSUE 7: Canva URL Not Validated (SOCIAL_POSTS_003)

| Aspect | Details |
| --- | --- |
| **Risk** | HIGH — Invalid data in workflow |
| **Category** | Forms & Input Behavior |
| **Affected Systems** | Social Post Editor Step 1 |
| **Scope** | Social Posts |
| **Effort** | 6-8 hours |
| **Dependencies** | None — independent |
| **Acceptance Criteria** | 1. URL field validates HTTP/HTTPS format<br>2. Shows error for invalid URLs<br>3. Ideally confirms it's Canva domain<br>4. Test: Paste 'hello' → error appears<br>5. Test: Paste valid URL → no error<br>6. Test: Paste non-Canva URL → warning |
| **Implementation Steps** | 1. Find URL input field validation<br>2. Add regex or URL parser for format check<br>3. Add domain whitelist check (optional)<br>4. Show inline error for invalid URLs<br>5. Test with various invalid inputs<br>6. Consider URL preview/verification<br>7. Update error message with guidance |
| **Must Complete Before** | Social post creation feature |

### 🟡 ISSUE 8: Generic Error Messages (GLOBAL_001)

| Aspect | Details |
| --- | --- |
| **Risk** | MEDIUM — User frustration, support load |
| **Category** | Error Handling |
| **Affected Systems** | All API error responses |
| **Scope** | Global |
| **Effort** | 16-20 hours (systematic) |
| **Dependencies** | None — independent |
| **Acceptance Criteria** | 1. All errors include what/why/what-to-do<br>2. No generic "Something went wrong"<br>3. Error codes are stable (not error IDs)<br>4. Consistent format across all endpoints<br>5. Test: Trigger permission error → clear message<br>6. Test: Trigger validation error → field guidance |
| **Implementation Steps** | 1. Create error message standardization spec<br>2. Define error categories (validation/system/permission)<br>3. Update API error response format<br>4. Map all errors to new format<br>5. Update error handling middleware<br>6. Test all error paths<br>7. Update SPECIFICATION.md Error Handling<br>8. Document for future developers |
| **Must Complete Before** | Production launch |

---

## Implementation Sequence & Timeline

### ✅ **Sprint 1 (Week 1): Security & Authorization**

**Priority**: CRITICAL — Must complete all 3 before shipping any data changes

1. **Day 1-2**: ISSUE #1 — API Authorization Audit & RLS Enforcement
   - Audit all tables for RLS policies
   - Create missing RLS policies
   - Add API validation layer

2. **Day 3**: ISSUE #2 — Comments Permission Boundary
   - Add RLS policy to comments tables
   - Test permission boundary

3. **Day 4**: ISSUE #3 — Tasks Visibility Filter
   - Implement RLS filter by user assignment
   - Test privacy boundary

4. **Day 5**: Validation & Hardening
   - Full integration testing
   - Security review of all RLS policies
   - Document all RLS rules

**Definition of Done**:
- [ ] All RLS policies in place
- [ ] API validation verified
- [ ] No permission bypass possible via API
- [ ] Security review passed
- [ ] Team trained on RLS enforcement

---

### ✅ **Sprint 2 (Week 2): Data Integrity & Form Validation**

**Priority**: HIGH — Enables safe mutations and form standardization

1. **Day 1-2**: ISSUE #4 & #5 Together — Bulk Action Hardening
   - Add field validation to bulk action modals
   - Add preview + confirmation UI
   - Test with multiple actions

2. **Day 3-4**: ISSUE #6 & #7 Together — Social Post Editor Validation
   - Add Platform required field validation
   - Add Canva URL format validation
   - Test all validation combinations

3. **Day 5**: Integration & Testing
   - Full end-to-end testing
   - Verify no regressions
   - Document validation patterns for future forms

**Definition of Done**:
- [ ] All bulk actions have preview + confirmation
- [ ] All required fields block submission
- [ ] All URL fields validate format
- [ ] No invalid mutations possible
- [ ] QA sign-off on all forms

---

### ✅ **Sprint 3 (Week 3): UX & Error Handling**

**Priority**: MEDIUM — Improves user experience and support load

1. **Day 1-3**: ISSUE #8 — Error Message Standardization
   - Define error format spec
   - Update all error responses
   - Implement consistent error handling

2. **Day 4-5**: Testing & Documentation
   - Test all error paths
   - Verify no regressions
   - Update docs with error handling patterns

**Definition of Done**:
- [ ] All errors are human-readable
- [ ] All errors are actionable
- [ ] Error format consistent across API
- [ ] Documentation updated
- [ ] Support team trained

---

## Dependencies & Blocking Issues

```
ISSUE #1 (RLS Enforcement)
  ├─ BLOCKS ISSUE #2 (Comment permissions)
  ├─ BLOCKS ISSUE #3 (Task visibility)
  └─ UNBLOCKS: All other fixes (independent after)

ISSUE #4 (Field validation)
  └─ ENABLES ISSUE #5 (Bulk confirmation)

ISSUE #6 (Platform required)
  └─ RELATED TO ISSUE #7 (URL validation)
```

**Critical Path**: Issues #1 → #2, #3 → (#4, #5 parallel) → (#6, #7 parallel) → #8

---

## Team Assignment Recommendations

### Team Structure for Parallel Work

**Backend Team (8-10 hours)**
- ISSUE #1: RLS audit + enforcement
- ISSUE #2: Comments RLS policy
- ISSUE #3: Tasks RLS filter
- ISSUE #8: Error message standardization

**Frontend Team (18-20 hours)**
- ISSUE #4: Bulk action validation
- ISSUE #5: Bulk action preview + confirmation
- ISSUE #6: Platform required field
- ISSUE #7: Canva URL validation

### Single Developer (40-60 hours)
1. Week 1: Issues #1, #2, #3 (backend focus)
2. Week 2: Issues #4, #5, #6, #7 (frontend)
3. Week 3: Issue #8 + testing

---

## Success Metrics

After all high-priority fixes are complete:

| Metric | Target |
| --- | --- |
| **Security**: No API bypasses possible | 100% |
| **Data Integrity**: No invalid mutations allowed | 100% |
| **Form Validation**: Required fields always enforced | 100% |
| **Error Messages**: All actionable | 100% |
| **Re-audit Pass Rate**: High-priority issues resolved | 8/8 |

---

## Verification Checklist

Use this to verify fixes are production-ready:

- [ ] All RLS policies tested with multiple users
- [ ] All permission boundaries verified
- [ ] All form validations prevent invalid submission
- [ ] All bulk actions show confirmation + preview
- [ ] All error messages tested and actionable
- [ ] No regressions in existing functionality
- [ ] Team trained on new patterns
- [ ] Documentation updated
- [ ] Re-audit passed all 8 issues
- [ ] Security review approved

---

## Next Steps

1. **Assign issues to team members** (today)
2. **Start Sprint 1** (security focus) — must complete before any other work
3. **Daily standups** — track progress, surface blockers
4. **Weekly review** — verify no regressions, update timeline if needed
5. **Re-run audit** — after each sprint to verify fixes
6. **Documentation** — update patterns as you build

---

## Questions?

- **Issue Details**: See `audits/[ISSUE_ID].md`
- **Audit Framework**: See `audits/AUDIT_CHECKLIST.md`
- **Governance Rules**: See `AGENTS.md`
