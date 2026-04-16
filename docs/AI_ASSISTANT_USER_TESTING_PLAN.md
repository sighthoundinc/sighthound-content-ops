# AI Assistant User Testing Plan

**Status**: Ready for validation  
**Date**: 2026-04-16  
**Objective**: Validate usefulness, clarity, and accuracy of AI assistant workflow guidance

---

## Testing Goals

1. **Usefulness**: Does the AI guidance help users complete workflows faster/correctly?
2. **Clarity**: Are blockers and next steps clearly explained?
3. **Accuracy**: Do blockers match actual workflow constraints?
4. **Coverage**: Does the assistant handle all common scenarios?
5. **Edge Cases**: Are error states and unusual workflows handled gracefully?

---

## Test Scenarios

### Blog Testing (12 scenarios)

#### Scenario 1: Draft in Progress (Expected: All blockers)
- **Setup**: Fresh blog, writer assigned, no content
- **Blog state**: `writer_status: in_progress`
- **User role**: writer
- **Expected blockers**:
  - Missing: title
  - Missing: google_doc_url
  - Missing: writer should be completed before publishing
- **Validation**: All 3 blockers detected correctly
- **User feedback**: Is guidance clear enough to unblock?

#### Scenario 2: Ready for Publishing (Expected: No blockers, proceed)
- **Setup**: Blog fully filled, writer_status: completed, publisher assigned
- **Blog state**: `writer_status: completed, publisher_status: pending_review`
- **User role**: publisher
- **Expected blockers**: None (workflow ready)
- **Expected next step**: "Mark publishing complete and set live URL"
- **Validation**: Blockers empty, next steps clear
- **User feedback**: Is the next action obvious?

#### Scenario 3: Missing Publisher Assignment (Expected: Critical blocker)
- **Setup**: Writer completed, but no publisher assigned
- **Blog state**: `writer_status: completed, publisher_id: null`
- **User role**: writer
- **Expected blockers**:
  - Critical: "Publisher must be assigned before publishing"
- **Validation**: Blocker severity correct, actionable
- **User feedback**: Does user know what to do next?

#### Scenario 4: Terminal State - Already Published (Expected: Info only)
- **Setup**: Blog fully published
- **Blog state**: `writer_status: completed, publisher_status: completed`
- **User role**: writer
- **Expected blockers**: "Cannot transition from completed (terminal stage)"
- **Expected next step**: "This content has reached its final stage"
- **Validation**: No false critical severity, clear explanation
- **User feedback**: Does terminal state message feel helpful or frustrating?

#### Scenario 5: Missing Live URL Before Publishing (Expected: Critical blocker)
- **Setup**: All fields filled except live_url
- **Blog state**: `publisher_status: pending_review`
- **User role**: publisher
- **Expected blockers**:
  - Critical: "Live URL is required before completing publishing"
- **Validation**: Blocker detected before transition attempt
- **User feedback**: Clear guidance on what's needed?

#### Scenario 6: Partial Dates (Expected: Quality issue)
- **Setup**: Display date set but scheduled_publish_date missing
- **Blog state**: `display_published_date: set, scheduled_publish_date: null`
- **User role**: publisher
- **Expected quality issues**:
  - Warning: "Display published date mismatch with scheduled date"
- **Validation**: Quality check catches inconsistencies
- **User feedback**: Is date guidance non-obvious/helpful?

#### Scenario 7: No Permissions - Non-Owner (Expected: RLS denial)
- **Setup**: User tries to view blog they don't own
- **Blog state**: writer_id belongs to different user
- **User role**: writer
- **Expected result**: 403 UNAUTHORIZED
- **Error message**: "You do not have access to this content"
- **Validation**: RLS properly enforces, clean error
- **User feedback**: Is error message helpful or confusing?

#### Scenario 8: Content Not Found (Expected: 404)
- **Setup**: User requests non-existent blog ID
- **Blog ID**: Invalid/deleted
- **Expected result**: 404 NOT_FOUND
- **Error message**: "Blog not found"
- **Validation**: Graceful handling of missing content
- **User feedback**: Does user know what to do?

#### Scenario 9: Multi-Stage Workflow - From Draft to Complete (Expected: Progressive guidance)
- **Setup**: Walk through entire workflow: draft → in_progress → completed (writer) → pending_review (publisher) → completed (publisher)
- **Test point**: Check that blockers/next steps evolve correctly at each stage
- **Validation**: Guidance is accurate and progressive
- **User feedback**: Does assistant help accelerate the workflow?

#### Scenario 10: Admin Overrides (Expected: Permissive)
- **Setup**: Admin user on any blog
- **Blog state**: Partially filled
- **User role**: admin
- **Expected blockers**: Minimal (admin can override)
- **Validation**: Admin has fewer constraints
- **User feedback**: Does admin feel empowered or confused?

#### Scenario 11: Stale Blog (Expected: Quality warning)
- **Setup**: Blog created >10 days ago, still in draft
- **Blog state**: `writer_status: in_progress, created_at: 10+ days ago`
- **User role**: writer
- **Expected quality issues**:
  - Warning: "Blog has been in draft for {N} days"
- **Validation**: Stale draft detection works
- **User feedback**: Is gentle nudge helpful or annoying?

#### Scenario 12: Multiple Issues (Expected: Prioritized list)
- **Setup**: Blog with 5+ blocking issues
- **Blog state**: No title, no doc URL, no publisher, no live URL, no date
- **User role**: writer
- **Expected blockers**: All detected, sorted by severity
- **Validation**: Blockers prioritized (critical first)
- **User feedback**: Is long list overwhelming or helpful?

---

### Social Post Testing (8 scenarios)

#### Scenario 1: Fresh Draft (Expected: Multiple blockers)
- **Setup**: New social post, minimal fields
- **Status**: `draft`
- **User role**: writer
- **Expected blockers**:
  - Missing: title (if enabled)
  - Missing: platforms
  - Missing: canva_url
  - Missing: product
  - Missing: type
- **Validation**: All mandatory fields detected
- **User feedback**: Are requirements clear?

#### Scenario 2: Ready for Publish (Expected: No blockers)
- **Setup**: All brief fields filled, admin approved caption and schedule
- **Status**: `ready_to_publish`
- **User role**: writer
- **Expected blockers**: None
- **Expected next step**: "Click Publish Post"
- **Validation**: Clear path to publishing
- **User feedback**: Does user feel confident to proceed?

#### Scenario 3: Awaiting Live Link (Expected: Info blocker)
- **Setup**: Post published, but live link not submitted
- **Status**: `awaiting_live_link`
- **User role**: writer
- **Expected blockers**:
  - Info: "At least one live link required (LinkedIn, Facebook, or Instagram)"
- **Expected next step**: "Submit live link to complete"
- **Validation**: Clear requirement, actionable
- **User feedback**: Does user know where to submit link?

#### Scenario 4: Permission Denied (Expected: RLS denial)
- **Setup**: Non-creator tries to view post
- **Status**: `draft`
- **User role**: writer (different user)
- **Expected result**: 403 UNAUTHORIZED
- **Validation**: RLS enforces ownership
- **User feedback**: Error message helpful?

#### Scenario 5: Multi-Platform Validation (Expected: Quality issue if missing)
- **Setup**: Post with platforms selected but no captions
- **Status**: `in_review`
- **User role**: admin
- **Expected quality issues**:
  - Warning: "Caption length optimal for {platform}?" (per platform)
- **Validation**: Platform-specific guidance
- **User feedback**: Is platform-specific guidance useful?

#### Scenario 6: Caption Length Warning (Expected: Quality issue)
- **Setup**: LinkedIn post with caption >3000 chars
- **Status**: `creative_approved`
- **User role**: admin
- **Expected quality issues**:
  - Warning: "Caption exceeds LinkedIn limit (3000 chars)"
- **Validation**: Platform-specific validation
- **User feedback**: Does user understand the constraint?

#### Scenario 7: Associated Blog Missing (Expected: Quality issue if linked)
- **Setup**: Post links to blog but blog is deleted
- **Status**: `in_review`
- **Associated blog**: deleted/moved
- **Expected quality issues**:
  - Warning: "Associated blog is no longer available"
- **Validation**: Detects broken associations
- **User feedback**: Clear remediation steps?

#### Scenario 8: Entire Workflow Progression (Expected: Step-by-step guidance)
- **Setup**: Follow from draft → in_review → changes_requested → creative_approved → ready_to_publish → awaiting_live_link → published
- **Test point**: Verify blockers/next steps update at each transition
- **Validation**: Guidance evolves with workflow
- **User feedback**: Did assistant help complete workflow faster?

---

## Feedback Collection Template

For each scenario, collect user feedback on:

### Blocker Accuracy (1-5 scale)
- "Blocker message was accurate to the actual constraint"
- Comments: ___________

### Blocker Clarity (1-5 scale)
- "I understood what the blocker meant and how to fix it"
- Comments: ___________

### Next Steps Usefulness (1-5 scale)
- "The suggested next steps were actionable"
- Comments: ___________

### Overall Helpfulness (1-5 scale)
- "This assistant helped me complete the workflow faster/better"
- Comments: ___________

### Missing Guidance (free text)
- "Was there anything the assistant should have told me?"
- Response: ___________

### Confusing Elements (free text)
- "Was anything confusing or misleading?"
- Response: ___________

### Edge Cases Found (free text)
- "Did you encounter any unexpected behavior?"
- Response: ___________

---

## Testing Process

### Phase 1: Internal Team Testing (2 hours)
1. **Testers**: 3-4 team members (diverse roles: writer, publisher, admin)
2. **Scenarios**: Run all 20 scenarios (12 blog + 8 social post)
3. **Environment**: Local/staging with real Supabase data
4. **Feedback**: Collect structured feedback on each scenario
5. **Bugs**: Log any crashes, errors, or incorrect results

### Phase 2: Stakeholder Testing (1 week)
1. **Testers**: 5-10 actual users (mix of writers, publishers, admins)
2. **Task**: Use AI assistant while performing actual work
3. **Scenarios**: Focus on 6-8 most common workflows
4. **Feedback**: Weekly collection via survey
5. **Observation**: Watch 2-3 users interact with feature (optional)

### Phase 3: Edge Case Discovery (ongoing)
1. **Testers**: Developers + advanced users
2. **Focus**: Try to break the assistant (unusual workflows, rapid changes)
3. **Scenarios**: Create new scenarios as edge cases are found
4. **Documentation**: Update blockers/quality checks as needed

---

## Validation Criteria

### Must Pass (Blocking Issues)
- [ ] All 20 scenarios complete without crashes
- [ ] No RLS violations (403 errors for non-owners)
- [ ] No false positives (incorrect blockers)
- [ ] Error messages are user-friendly (no raw database errors)
- [ ] Response time <2 seconds for all scenarios
- [ ] Average blocker clarity ≥4.0/5.0
- [ ] Average next steps usefulness ≥4.0/5.0

### Should Pass (Important Issues)
- [ ] Average overall helpfulness ≥4.0/5.0
- [ ] <5 unique "missing guidance" suggestions across all testers
- [ ] <3 confusing elements per scenario
- [ ] No more than 2 edge cases found per 10 testers

### Nice to Have (Enhancement Ideas)
- [ ] Users suggest feature improvements
- [ ] Performance optimizations identified
- [ ] New scenarios discovered and documented

---

## Bug Tracking Template

### Issue Report

**Scenario**: [scenario name]  
**Steps to reproduce**: [exact steps]  
**Expected result**: [what should happen]  
**Actual result**: [what did happen]  
**Severity**: [critical/high/medium/low]  
**Screenshot**: [if applicable]  
**Blocker**: [yes/no - does this block runtime hardening?]

---

## Success Metrics

### Quantitative
- **Blocker accuracy**: ≥95% (false positive/negative <5%)
- **User satisfaction**: ≥4.0/5.0 on helpfulness
- **Completeness**: ≥90% of common scenarios covered
- **Performance**: <2s response time, 99.9% uptime during testing

### Qualitative
- Users report faster workflow completion
- Users understand blockers without additional explanation
- No unexpected behavior or surprising edge cases
- Clear path forward at each workflow stage

---

## Timeline

| Phase | Duration | Dates | Deliverables |
|-------|----------|-------|--------------|
| Phase 1: Internal Testing | 2 hours | Today | Bug list, feedback summary |
| Phase 2: Stakeholder Testing | 1 week | Week of 4/16-4/22 | User feedback report |
| Phase 3: Edge Case Discovery | 1 week | Week of 4/23-4/29 | Edge case documentation |
| **Analysis & Fixes** | 3-5 days | Week of 4/23-4/29 | Updated feature, resolved issues |
| **Runtime Hardening Kickoff** | After validation | 4/30+ | Gemini-first quality tuning + fallback reliability |

---

## Post-Testing Actions

### If Validation Passes
1. ✅ Mark "AI Assistant" feature as production-ready
2. ✅ Create user documentation (HOW_TO_USE_APP.md)
3. ✅ Update AGENTS.md with any findings
4. ✅ Proceed to runtime hardening (Gemini prompt tuning + deterministic fallback QA)

### If Issues Found
1. 🔧 Categorize by severity (critical/high/medium/low)
2. 🔧 Fix critical/high severity issues (max 2-3 days)
3. 🔧 Retest affected scenarios
4. 🔧 Document lessons learned
5. 🔧 Decide: proceed to runtime hardening or do another iteration

---

## Notes for Testers

### What to Look For
- **Accuracy**: Does the assistant match real constraints?
- **Clarity**: Would a non-technical user understand?
- **Completeness**: Are all blocking issues surfaced?
- **Actionability**: Can the user fix the issue based on guidance?
- **Performance**: Does the modal open quickly?

### How to Give Feedback
- Be specific (e.g., "Blocker message said X but should say Y")
- Include context (what were you trying to do?)
- Suggest improvements (how would you phrase it better?)
- Note surprises (anything unexpected?)

### In Case of Bugs
1. Take a screenshot
2. Note the exact steps
3. Check browser console for errors
4. Report in bug template above

---

## Next Steps

1. **Prepare test environment** (real Supabase data, test accounts for all roles)
2. **Recruit testers** (aim for 3-4 internal, 5-10 external)
3. **Schedule testing** (Phase 1: 2 hours, Phase 2: distributed over 1 week)
4. **Collect feedback** (use template above)
5. **Analyze results** (categorize by severity, impact)
6. **Fix issues** (prioritize critical/high)
7. **Retest if needed** (validate fixes)
8. **Proceed to runtime hardening** (Gemini prompt tuning + fallback checks)

