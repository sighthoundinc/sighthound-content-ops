# Dashboard Testing Execution Prompt for AI Agents

## Objective
Execute comprehensive functional testing of the Dashboard page (`/dashboard`) to verify all features work as specified. Report any deviations from expected behavior.

## Instructions for AI Test Agent

### Setup
1. **Authentication**: Log in with test credentials before starting. Use an account with appropriate permissions (suggest admin or editor role for full feature access).
2. **Test Environment**: Ensure you have access to a test database with diverse blog records:
   - At least 20 blogs in various states
   - Multiple sites (Sighthound, RED)
   - Different status combinations
   - Various writer and publisher assignments
   - Mix of scheduled and unscheduled dates

### Execution Guidelines

#### Test Structure
- Follow the test plan sections sequentially (Section 1 → Section 17)
- Complete all tests in each section before moving to the next
- Do not skip tests unless explicitly blocked by permissions or missing data
- If a test is blocked, note it and continue with remaining tests

#### Test Execution
1. **For each test case:**
   - Execute the exact steps listed
   - Verify the expected results match what you observe
   - Take screenshots of key results if possible
   - Document any deviations with:
     - What you expected
     - What actually happened
     - Steps to reproduce
     - Severity (Critical/High/Medium/Low)

#### Browser Interaction
- Click elements using their visible labels (e.g., "Export CSV", "Save View")
- Type in input fields precisely as specified in test steps
- Wait for animations/loading to complete before asserting results
- Scroll to view off-screen content if needed
- Use keyboard shortcuts where specified (Tab, Enter, Escape)

#### Reporting Issues
Use this template for each issue found:

```
## Issue: [Test Case ID] - [Brief Title]

**Steps to Reproduce:**
1. [Step 1]
2. [Step 2]
3. [Step 3]

**Expected Behavior:**
[From test plan]

**Actual Behavior:**
[What you observed]

**Severity:** [Critical | High | Medium | Low]

**Notes:** [Any additional context]
```

### Test Sections to Execute

Execute in this order:

| Section | Topic | Tests | Estimated Time |
|---------|-------|-------|-----------------|
| 1 | Page Load & Initial State | 5 | 3-5 min |
| 2 | Sidebar & Quick Queues | 7 | 5-8 min |
| 3 | Table Operations | 5 | 5-7 min |
| 4 | Filtering | 10 | 8-12 min |
| 5 | Column Customization | 6 | 5-8 min |
| 6 | Row Density | 2 | 2-3 min |
| 7 | Blog Detail Panel | 7 | 8-10 min |
| 8 | Bulk Actions | 11 | 10-15 min |
| 9 | CSV Export | 5 | 5-8 min |
| 10 | Saved Views | 6 | 8-10 min |
| 11 | Inline Editing | 3 | 3-5 min |
| 12 | Responsive Design | 3 | 5-8 min |
| 13 | Performance & Edge Cases | 6 | 8-12 min |
| 14 | Permissions Testing | 3 | 5-8 min |
| 15 | Keyboard Accessibility | 4 | 5-7 min |
| 16 | Error Handling | 4 | 5-8 min |
| 17 | Browser Compatibility | 3 | 5-10 min |
| **TOTAL** | **17 Sections** | **123 Tests** | **~120-160 min** |

### Reporting

#### During Testing
- Document issues immediately as they are found
- Do not wait until the end to report
- Include screenshots for visual issues

#### Final Report
Provide:
1. **Summary**: Total tests executed, passed, failed
2. **Issues Found**: List all issues with severity levels (organized by severity)
3. **Test Coverage**: Which sections were completed
4. **Blockers**: Any tests that could not be executed and why
5. **Recommendations**: Any patterns or systemic issues noted

#### Report Format
```markdown
# Dashboard Testing Report

## Summary
- **Total Tests Executed**: X
- **Tests Passed**: X
- **Tests Failed**: X
- **Execution Time**: X min
- **Test Date**: [Date]
- **Tester**: [AI Agent Name]

## Critical Issues
[List all Critical severity issues]

## High Priority Issues
[List all High severity issues]

## Medium Priority Issues
[List all Medium severity issues]

## Low Priority Issues
[List all Low severity issues]

## Test Coverage by Section
- [ ] Section 1: Page Load & Initial State (5/5)
- [ ] Section 2: Sidebar & Quick Queues (7/7)
- [ ] Section 3: Table Operations (5/5)
... [etc]

## Blockers
[Any tests that could not be executed]

## Recommendations
[Patterns noticed, potential improvements, risks identified]
```

### Special Instructions

#### Permissions Testing (Section 14)
- If you have admin access, test as read-only user by:
  - Opening browser DevTools console
  - Checking what buttons/features are visible
  - Attempting to perform actions and observing if disabled
- Document permission-based UI differences

#### Performance Testing (Section 13)
- Test with network throttling enabled if possible (Slow 3G or Slow 4G)
- Note load times and UI responsiveness
- Look for loading spinners/skeletons

#### Error Handling (Section 16)
- For network error test:
  - Use browser DevTools → Network tab → Offline mode
  - Or throttle to "GPRS" (offline)
- For invalid state:
  - Clear browser localStorage and refresh (only if test directs)

#### Browser Compatibility (Section 17)
- If testing in multiple browsers, note any browser-specific differences
- For mobile testing, use browser responsive design mode
- Document screen size when testing responsive design

### Important Notes

1. **Element Selection**: Use visible text labels when referencing UI elements
   - ✅ "Click the 'Export CSV' button"
   - ❌ "Click button[data-testid='export-csv']"

2. **Timing**: Some features may have delays
   - Wait up to 2 seconds for table filters to apply
   - Wait for animations to complete before asserting new state

3. **Data Expectations**: 
   - If fewer blogs exist than expected, note this and test with available data
   - Don't create test data yourself unless instructed

4. **Scope**: This testing plan covers functional behavior only
   - Not testing visual design (colors, fonts, spacing) in detail
   - Not testing SEO or performance metrics beyond stated thresholds

5. **Failures**: 
   - If a fundamental feature fails (e.g., table won't load), skip dependent tests and note as blocker
   - If a filter fails, still test other filters independently

### Success Criteria

Testing is complete and successful when:
- ✅ All executable test sections have been completed
- ✅ All issues discovered have been documented with the template
- ✅ A final report has been provided with summary and categorized issues
- ✅ No critical defects remain that would prevent basic dashboard usage

### Help & Troubleshooting

If you encounter issues executing this plan:

1. **Can't find an element**: 
   - Scroll the page to ensure element is visible
   - Check if element requires clicking a button/menu first to become visible
   - Try navigating to a different state (e.g., if column editor doesn't exist, it may need to be opened)

2. **Test data missing**:
   - Note which test data is missing (e.g., "No blogs with 'Delayed' status")
   - Skip that specific test and note as blocker
   - Continue with other tests

3. **Permission denied**:
   - Log in with different user role if available
   - Document that feature as permission-restricted
   - Continue with other tests

4. **Unclear step**:
   - Refer to the detailed test plan document for additional context
   - Use reasonable interpretation (e.g., "Look for" means search visually, not with CTRL+F)

---

## Quick Reference: Test Plan Sections

**Foundation** (Sections 1-3): Core page load and table functionality  
**User Interactions** (Sections 4-11): Filtering, customization, inline editing  
**Technical** (Sections 12-17): Responsive design, performance, accessibility, permissions

Start with Foundation sections to verify basics, then proceed through User Interactions and Technical sections.

**Estimated Total Time**: 2-3 hours for complete execution  
**Recommended Approach**: Execute all sections in one session for continuity, or complete by section grouping (Foundation → UI → Technical)
