# AI Assistant Feature - Testing Roadmap

**Status**: Ready for validation  
**Date**: 2026-04-16  
**Objective**: Comprehensive user testing before Step 3 (Gemini formatter layer)

---

## Quick Start (TODAY - 15 minutes)

**Use**: `docs/AI_ASSISTANT_QUICK_VALIDATION.md`

1. Run 13 smoke tests on blog and social post pages
2. Check for crashes, errors, or obvious UX issues
3. Verify button visibility and modal functionality
4. **Goal**: Confirm feature is stable enough for formal testing

**Expected Result**: ✅ 12+/13 tests passing → Proceed to Phase 1

---

## Phase 1: Internal Team Testing (2 hours)

**When**: Tomorrow or this week  
**Who**: 3-4 team members (writer, publisher, admin)  
**What**: Run all 20 test scenarios  
**How**: Use `docs/AI_ASSISTANT_USER_TESTING_PLAN.md` + `docs/AI_ASSISTANT_FEEDBACK_FORM.md`

### Test Scenarios (20 total)
- **Blogs**: 12 scenarios (draft, publishing, terminal, missing assignments, stale, etc.)
- **Social Posts**: 8 scenarios (draft, review, published, live links, platforms, etc.)

### Feedback to Collect
- Blocker accuracy (1-5 scale)
- Blocker clarity (1-5 scale)
- Next steps usefulness (1-5 scale)
- Overall helpfulness (1-5 scale)
- Missing guidance (free text)
- Confusing elements (free text)
- Edge cases (free text)

### Success Criteria
- ✅ All 20 scenarios complete without crashes
- ✅ No RLS violations (proper 403 errors)
- ✅ Average clarity ≥4.0/5.0
- ✅ Average helpfulness ≥4.0/5.0
- ✅ Response time <2 seconds

**Deliverable**: Bug list + feedback summary

---

## Phase 2: Stakeholder Testing (1 week)

**When**: Week of 4/16-4/22 (distributed)  
**Who**: 5-10 actual users (writers, publishers, admins)  
**What**: Use AI assistant during real work  
**How**: Focused testing on 6-8 most common workflows

### Testing Approach
1. User performs normal workflow (write blog, create social post)
2. Uses AI assistant at key decision points
3. Provides feedback via form or survey
4. Developers observe 2-3 users (optional)

### Key Workflows to Test
- Blog: Draft → Writer Complete → Publisher Review → Publish
- Social Post: Draft → In Review → Approved → Ready → Publish
- Error cases: Missing assignments, permission denials, stale content

### Success Criteria
- ✅ Users report faster/better workflow completion
- ✅ Users understand blockers without additional help
- ✅ <5 unique "missing guidance" suggestions
- ✅ <3 confusing elements per user

**Deliverable**: User feedback report + feature usefulness metrics

---

## Phase 3: Edge Case Discovery (ongoing)

**When**: Week of 4/23-4/29 (parallel with fixes)  
**Who**: Developers + advanced users  
**What**: Try to break the assistant  
**How**: Unusual workflows, rapid changes, concurrent edits

### Edge Cases to Test
- Workflow state changes during modal open
- Multiple users editing same content
- Network latency/failures
- Very long blocker lists (8+ issues)
- Missing associated data (deleted blogs, etc.)
- Rapid modal open/close
- Browser back button behavior

### Success Criteria
- No crashes or data loss
- Graceful handling of failures
- Clear error messages

**Deliverable**: Edge case documentation

---

## Analysis & Fixes (3-5 days)

**When**: Week of 4/23-4/29 (after Phase 2 feedback)  
**What**: Categorize issues by severity

### Issue Categories

**Critical (Blocker)** — Fix immediately
- Feature broken (crash, data loss, RLS violation)
- User cannot complete workflow
- Security/privacy issue

**High (Important)** — Fix before Step 3
- Major functionality incorrect
- Misleading guidance
- Confusing error messages

**Medium (Nice to Have)** — Backlog
- Minor accuracy issues
- UI polish
- Performance optimization

**Low (Document)** — Known limitations
- Edge cases
- Enhancement ideas
- Future improvements

### Fix Process
1. Categorize all issues
2. Fix critical/high (max 2-3 days)
3. Re-test fixed scenarios
4. Document any issues that remain
5. Decide: proceed or iterate

---

## Post-Testing Decision

### If Validation Passes (Recommended)
✅ Mark "AI Assistant" as production-ready  
✅ Create user documentation  
✅ Update AGENTS.md with findings  
✅ **Proceed to Step 3 (Gemini formatter layer)** — Target: 4/30

### If Issues Found
🔧 Apply fixes (critical/high priority)  
🔧 Re-test affected scenarios  
🔧 Document lessons learned  
🔧 Decision: proceed or iterate (max 1 more week)

---

## Testing Documents

| Document | Purpose | Audience |
|----------|---------|----------|
| `AI_ASSISTANT_QUICK_VALIDATION.md` | 15-min smoke test | Developers |
| `AI_ASSISTANT_USER_TESTING_PLAN.md` | Complete test scenarios + criteria | QA/Testers |
| `AI_ASSISTANT_FEEDBACK_FORM.md` | Structured feedback collection | Testers/Users |
| `TESTING_ROADMAP.md` (this file) | Timeline + decision framework | Project leads |

---

## Key Metrics to Track

### Quantitative
| Metric | Target | Acceptable | Monitor |
|--------|--------|-----------|---------|
| Blocker accuracy | ≥95% | ≥90% | <5% false positive/negative |
| User satisfaction | ≥4.5/5.0 | ≥4.0/5.0 | Average across all testers |
| Response time | <1.5s | <2s | 95th percentile |
| Crash rate | 0% | <0.1% | Any crash is critical |
| RLS violations | 0% | 0% | Any violation is critical |

### Qualitative
- Users report workflow acceleration
- Users understand guidance without explanation
- No confusing/misleading messages
- Clear next steps at each stage
- Appropriate error handling

---

## Timeline Summary

| Milestone | Target | Status |
|-----------|--------|--------|
| Quick validation | Today | 🟡 Ready |
| Phase 1 (internal) | Tomorrow-this week | 🔵 Scheduled |
| Phase 2 (stakeholders) | Week of 4/16-4/22 | 🔵 Scheduled |
| Phase 3 (edge cases) | Week of 4/23-4/29 | 🔵 Scheduled |
| Analysis & fixes | 3-5 days | 🔵 Scheduled |
| **Step 3 kickoff** | **4/30+** | 🟢 Target |

---

## Roles & Responsibilities

### Project Lead
- Approve testing schedule
- Review test results
- Make go/no-go decision for Step 3
- Assign resources

### QA/Testers
- Execute test scenarios
- Collect user feedback
- Document edge cases
- Report issues

### Developers
- Quick validation (smoke test)
- Fix critical/high issues
- Address edge cases
- Support Phase 2 (observe 2-3 users)

### Users (Stakeholders)
- Perform Phase 2 testing during normal work
- Provide honest feedback
- Report issues found
- Suggest improvements

---

## Risk Mitigation

### Risk: Validation takes longer than expected
- **Mitigation**: Parallelize Phase 2 across multiple users
- **Backup**: Start Step 3 with Phase 1/2 results; iterate in parallel

### Risk: Major issues found late in testing
- **Mitigation**: Do quick validation first; escalate critical issues immediately
- **Backup**: Allocate 2-3 days for fixes + re-test

### Risk: Users have different expectations
- **Mitigation**: Define success criteria upfront; educate testers on feature scope
- **Backup**: Document limitations as "future enhancements"

### Risk: Performance issues at scale
- **Mitigation**: Monitor response times during Phase 2
- **Backup**: Cache blockers for common scenarios (Step 3)

---

## Communication Plan

### Daily (During Testing)
- Share bug reports in #dev or relevant channel
- Escalate critical issues immediately
- Update test progress

### Weekly (Summaries)
- Phase 1 summary (after 2 hours)
- Phase 2 progress update (mid-week)
- Phase 2 final report (end of week)
- Analysis & recommendations (following week)

### Stakeholder Updates
- Pre-testing: Share testing plan, expected timeline
- During: Brief updates on progress
- Post-testing: Share results, decision on Step 3

---

## Success Criteria Summary

**Testing is successful if:**

1. ✅ All critical tests pass (no crashes, RLS works, errors are clear)
2. ✅ User satisfaction ≥4.0/5.0 on key metrics
3. ✅ Blockers are accurate (≥95% match reality)
4. ✅ Guidance is clear and actionable
5. ✅ <10 significant issues found across all phases
6. ✅ No security/privacy concerns
7. ✅ Stakeholders agree feature is valuable
8. ✅ Team confidence in proceeding to Step 3

**If all criteria met → Proceed to Step 3 immediately**

**If 1-2 criteria not met → Fix and re-test (max 3-5 days)**

**If 3+ criteria not met → Redesign and re-test (2-week delay)**

---

## Next Actions

### RIGHT NOW (Today)
1. [ ] Review this document with team
2. [ ] Review quick validation checklist
3. [ ] Prepare test environment (real Supabase data)
4. [ ] Schedule Phase 1 (tomorrow or this week)

### THIS WEEK
1. [ ] Execute quick validation (15 min)
2. [ ] Execute Phase 1 (2 hours, 3-4 testers)
3. [ ] Collect Phase 1 feedback
4. [ ] Fix any critical issues
5. [ ] Recruit Phase 2 testers

### NEXT WEEK
1. [ ] Phase 2 testing (distributed across week)
2. [ ] Phase 3 edge case discovery
3. [ ] Analyze all feedback
4. [ ] Fix critical/high issues
5. [ ] Final decision on Step 3

---

## Sign-Off

**Project Lead**: _______________________  
**Date**: _______________________  
**Approval**: ✅ Approved / 🔄 Revise / ❌ On Hold

**Notes**:
```


```

---

## Appendix: Common Test Issues

### If Modal Won't Open
- Check console for JS errors
- Verify endpoint `/api/ai/assistant` is working
- Check user permissions (RLS)
- Try hard refresh (Cmd+Shift+R)

### If Blockers Are Inaccurate
- Verify test data in Supabase
- Check workflow rules in `src/lib/workflow-rules.ts`
- Review blocker-detector logic
- Check quality-checker rules

### If Response Time Is Slow
- Monitor Network tab in dev tools
- Check database query performance
- Verify Supabase connection is stable
- Consider adding response caching

### If Users Are Confused
- Gather specific examples ("at what point were you confused?")
- Review exact error messages
- Check if guidance is too technical
- Suggest clearer phrasing

