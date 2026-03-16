# Calendar Page Phase 3 Testing Plan

## Overview
This document outlines manual testing procedures for Phase 3 premium features implemented on the Calendar page:
1. Day-Level Event Indicators
2. Keyboard Navigation
3. Weekly Summary Bar

All code checks pass. This plan verifies user-facing behavior and experience.

## Test Environment
- **Files Modified:** `src/components/calendar-tile.tsx`, `src/app/calendar/page.tsx`
- **Views Affected:** Month view, Week view
- **Prerequisites:** Calendar page with test data (blogs and social posts scheduled)

---

## Feature 1: Day-Level Event Indicators

### Test 1.1: Indicator Visibility in Month View
**Steps:**
1. Navigate to Calendar page in Month view
2. Observe day tiles that contain events (blogs or social posts)

**Expected Result:**
- Days with events show a small indigo dot (●) next to the day number
- Dot appears in the header area, right of the day number
- Dot is subtle and does not interfere with event cards
- Empty days (no events) have no dot indicator

**Test Data Needed:**
- At least 3 days with varying event counts (1 blog, 2+ mixed events, empty days)

### Test 1.2: Indicator Consistency Across Months
**Steps:**
1. Navigate forward/backward through months
2. Observe indicator presence on days with events

**Expected Result:**
- Indicators appear consistently on event days
- Indicators persist through month navigation

### Test 1.3: Indicator with Filtered Content
**Steps:**
1. Enable all filters (Blogs + Social Posts)
2. Observe indicators on event days
3. Hide Blogs (uncheck Blogs button)
4. Observe same days

**Expected Result:**
- Indicators update based on visible (non-filtered) content
- Day shows indicator only if remaining visible events exist
- Hiding all event types removes indicators

### Test 1.4: Indicator in Week View
**Steps:**
1. Switch to Week view
2. Observe week days with events

**Expected Result:**
- Indicators may appear in Week view (optional enhancement)
- No regression in Week view rendering

---

## Feature 2: Keyboard Navigation

### Test 2.1: Arrow Key Navigation (Days)
**Steps:**
1. Navigate to Calendar page
2. Focus is auto-set to today (or first visible day)
3. Press **Left Arrow** key
4. Observe focused day changes to previous day
5. Press **Right Arrow** key repeatedly
6. Verify focus moves forward through days

**Expected Result:**
- Focused day tile has a subtle focus ring (indigo ring-2 ring-offset-2)
- Left Arrow moves focus backward one day
- Right Arrow moves focus forward one day
- Navigation wraps to previous/next month when needed
- Focus ring is visible and clear

### Test 2.2: Arrow Key Navigation (Weeks)
**Steps:**
1. With focus on a day, press **Up Arrow**
2. Verify focus moves to same day in previous week
3. Press **Down Arrow**
4. Verify focus moves to same day in next week
5. Repeat several times across month boundary

**Expected Result:**
- Up Arrow moves focus back 7 days
- Down Arrow moves focus forward 7 days
- Navigation handles month boundaries correctly
- Calendar view updates when exiting current month/week range

### Test 2.3: J/K Keys (Vim-style Navigation)
**Steps:**
1. With focus set, press **J** (lowercase or uppercase)
2. Verify focus moves to next day
3. Press **K**
4. Verify focus moves to previous day

**Expected Result:**
- J moves forward one day
- K moves backward one day
- Works identically to Right/Left arrows

### Test 2.4: Enter Key (Open Event)
**Steps:**
1. Focus on a day with at least one event
2. Press **Enter**
3. Verify the first event in the day opens in the side panel

**Expected Result:**
- Side panel opens with first event details
- Event type (Blog or Social Post) determines which panel opens
- Event order is blogs first, then social posts

**Test with Empty Day:**
1. Focus on a day with no events
2. Press **Enter**
3. Verify nothing happens (no error, no panel)

### Test 2.5: Escape Key (Close Panels)
**Steps:**
1. Open an event in a side panel (via Enter key or click)
2. Press **Escape**
3. Verify panel closes

**Expected Result:**
- Side panel closes immediately
- Calendar remains visible
- Focused day state persists

### Test 2.6: Keyboard Navigation in Week View
**Steps:**
1. Switch to Week view
2. Focus should still be set
3. Test arrow navigation (left/right/up/down)
4. Test J/K keys
5. Test Enter on an event
6. Test Escape to close

**Expected Result:**
- All keyboard controls work identically in Week view
- Week view doesn't auto-scroll when navigating within week
- Navigation outside current week updates the view

### Test 2.7: Focus Persistence
**Steps:**
1. Navigate using keyboard to a specific day
2. Click elsewhere on the page (not in a day tile)
3. Press an arrow key
4. Verify keyboard navigation resumes from last focused day

**Expected Result:**
- Focus state is preserved across interactions
- Keyboard navigation always resumes from last known position

---

## Feature 3: Weekly Summary Bar

### Test 3.1: Summary Bar Visibility
**Steps:**
1. Navigate to Calendar page
2. Look for a panel labeled "This Week" above the calendar grid
3. Observe three metrics displayed

**Expected Result:**
- Summary bar appears below the legend (SH Blog, RED Blog, Social Post)
- White background with light border
- Clean, minimal design (not a large dashboard widget)
- Always visible (not hidden or collapsed)

### Test 3.2: Summary Accuracy (Current Week)
**Steps:**
1. Count blogs scheduled for current week manually
2. Count social posts scheduled for current week manually
3. Identify days with 2+ events (busy days)
4. Compare with summary bar numbers

**Expected Result:**
- "Blogs" count matches actual blog events for current week
- "Socials" count matches actual social posts for current week
- "Busy Days" count matches days with 2+ total events
- Grammar is correct (singular/plural: "Blog" vs "Blogs", etc.)

### Test 3.3: Summary Updates on Navigation
**Steps:**
1. Note current week's summary numbers
2. Click "Next" or press Down Arrow to next week
3. Observe summary bar updates
4. Click "Prev" to return to current week
5. Verify numbers return to original

**Expected Result:**
- Summary always shows current week (not displayed week)
- "Current week" means the actual calendar week (Mon-Sun or per weekStart setting)
- Numbers update immediately when navigating
- Summary is always for the actual week, not the displayed month/week view

### Test 3.4: Summary with Filters
**Steps:**
1. Note summary numbers with all filters enabled
2. Uncheck "Blogs" button
3. Observe summary updates
4. Check "Blogs" and uncheck "Social Posts"
5. Observe summary again
6. Re-enable all filters

**Expected Result:**
- "Blogs" count becomes 0 when blogs are hidden
- "Socials" count becomes 0 when social posts are hidden
- "Busy Days" count decreases appropriately when events are filtered out
- Summary reflects only visible (non-filtered) content

### Test 3.5: Summary with View Scope Filter
**Steps:**
1. Switch view scope from "My tasks" to "All tasks" (if permitted)
2. Observe summary updates
3. Switch back to "My tasks"

**Expected Result:**
- Summary updates to reflect the selected scope
- "Current week" definition is always based on actual calendar week, not view scope

### Test 3.6: Summary Grammar
**Steps:**
1. Navigate to a week with 1 blog, 1 social post, 0 busy days
2. Verify text reads: "1 Blog", "1 Social", "0 Busy Days"
3. Navigate to a week with 2+ blogs, 2+ socials, 2+ busy days
4. Verify text reads: "X Blogs", "X Socials", "X Busy Days"

**Expected Result:**
- Singular form used when count = 1
- Plural form used when count ≠ 1
- "Socials" not "Social Posts" in the summary

---

## Cross-Feature Tests

### Test X.1: No Regressions in Drag-Drop
**Steps:**
1. In Month view, drag a blog from one day to another
2. Confirm reschedule dialog appears
3. Confirm reschedule
4. Verify event moves and indicators update

**Expected Result:**
- Drag-drop functionality works unchanged
- Focus state doesn't interfere with dragging
- Indicators update after reschedule

### Test X.2: No Regressions in Event Panels
**Steps:**
1. Click on a blog event card
2. Verify blog detail panel opens (right sidebar)
3. Test keyboard navigation (arrow keys) while panel is open
4. Press Escape
5. Verify panel closes and focus returns

**Expected Result:**
- Event panel opens/closes normally
- Keyboard handlers don't interfere with panel interaction
- Escape key closes panel correctly

### Test X.3: No Regressions in Quick Create
**Steps:**
1. Click the "+" button on an empty day
2. Verify quick create menu appears
3. Press keyboard keys (arrows, Enter)
4. Verify quick create menu doesn't interfere

**Expected Result:**
- Quick create menu opens normally
- Keyboard navigation doesn't interfere
- Quick create flows work as before

### Test X.4: Focus Ring Visibility
**Steps:**
1. Navigate using arrow keys to multiple days
2. Verify focus ring is always visible and clear
3. Test in both light and dark scenarios (if possible)

**Expected Result:**
- Focus ring is visible on all day tiles
- Ring style is consistent (indigo, offset by 2px)
- Ring doesn't obscure important content

---

## Browser/Environment Tests

### Test B.1: Keyboard Focus on Page Load
**Steps:**
1. Reload the Calendar page
2. Immediately press an arrow key
3. Verify calendar responds (focus was already set)

**Expected Result:**
- Focus is auto-set to today or first visible day
- Keyboard navigation works immediately without manual focus

### Test B.2: Keyboard Navigation Across Views
**Steps:**
1. Start in Month view, navigate with keyboard
2. Switch to Week view
3. Verify focus is maintained or reset appropriately
4. Continue keyboard navigation in Week view

**Expected Result:**
- Focus persists across view switches or resets sensibly
- No keyboard errors or state corruption

---

## Performance Check

### Test P.1: Keyboard Responsiveness
**Steps:**
1. Rapidly press arrow keys (5-10 presses per second)
2. Observe response time

**Expected Result:**
- Navigation is immediate (no lag)
- No duplicate events or focus jumps
- UI remains responsive

### Test P.2: Summary Bar Performance
**Steps:**
1. Load calendar with large dataset (100+ events)
2. Scroll and navigate
3. Observe summary bar updates

**Expected Result:**
- Summary bar computes and displays without lag
- No performance degradation from Phase 3 features

---

## Sign-Off Checklist

- [ ] All arrow key tests pass
- [ ] J/K navigation works
- [ ] Enter key opens events
- [ ] Escape closes panels
- [ ] Event indicators appear on event days
- [ ] Indicators update with filters
- [ ] Weekly summary shows correct counts
- [ ] Summary updates on navigation
- [ ] Summary respects filters
- [ ] No regressions in drag-drop
- [ ] No regressions in event panels
- [ ] Focus ring is visible and clear
- [ ] Keyboard responsive
- [ ] Works in both Month and Week views
- [ ] Works with all filter combinations

---

## Known Limitations / Non-Issues

1. **Indicator only in header:** The event indicator dot appears only in the day header, not in the body. This is by design to avoid clutter.
2. **Single focused day:** Only one day can be focused at a time. This is expected for keyboard navigation.
3. **Summary is "This Week":** Always shows the actual current week, not the displayed week in Month view. This is intentional for planning purposes.

---

## Issues Found

If you encounter unexpected behavior, document:
- **Step to Reproduce:** Exact steps that trigger the issue
- **Expected Behavior:** What should happen
- **Actual Behavior:** What actually happens
- **Environment:** Browser, OS, calendar data context
- **Severity:** Critical (breaks feature), High (workaround available), Low (cosmetic)

---

## Next Steps

After completing this test plan:
1. Document any issues found
2. Create bug reports for regressions
3. Request code review if not already done
4. Deploy to staging environment
5. Perform additional QA if needed
