# Dashboard Page Comprehensive Testing Plan

## Overview

This document provides comprehensive testing procedures for the Dashboard page (`src/app/dashboard/page.tsx`). The plan is designed for both manual testers and AI test agents.

**Primary Features:**
- Blog management table with filtering, sorting, and pagination
- Sidebar with quick queues and metric filters
- Saved views for custom dashboard configurations
- Column visibility and ordering customization
- Row density settings (compact/comfortable)
- Bulk actions (assignment, status updates, deletion)
- Blog detail panel with history and comments
- CSV export (full and selected rows)
- Search functionality
- Multi-filter support (site, status, writer, publisher, writer status, publisher status)

**Key Files:**
- `src/app/dashboard/page.tsx` - Main dashboard component

---

## Environment Setup

### Prerequisites
1. User must have `view_dashboard` permission
2. Test database contains at least 20 blogs in various states
3. Test blogs should have:
   - Different sites (sighthound.com, RED)
   - Different overall statuses (draft, ready_to_publish, published, delayed)
   - Different writer statuses (not_started, in_progress, needs_revision, completed)
   - Different publisher statuses (not_started, in_progress, completed)
   - Various publish dates (past, present, future)
   - Assigned to different writers and publishers
   - Some with scheduled dates, some without

### Test Data Requirements
- Minimum 5 writers/publishers for assignment filtering
- Minimum 3 blogs scheduled for current week
- Minimum 2 blogs overdue for delayed calculations
- Minimum 3 blogs in draft status (not yet assigned)

---

## Section 1: Page Load & Initial State

### Test 1.1: Page Loads Successfully
**Steps:**
1. Navigate to `/dashboard`
2. Wait for page to fully load (loading skeleton disappears)

**Expected Result:**
- ✓ Dashboard page loads without errors
- ✓ Blog table is visible with blogs rendered
- ✓ Sidebar on left shows quick queues and metric filters
- ✓ Header shows "Dashboard" title and description
- ✓ No console errors in browser dev tools

### Test 1.2: Initial Column Order
**Steps:**
1. Observe the table columns from left to right

**Expected Result:**
- ✓ Default column order: Site, Title, Writer, Writer Status, Publisher, Publisher Status, Publish Date
- ✓ Overall Status column is hidden by default
- ✓ All columns are readable and properly aligned

### Test 1.3: Initial Row Limit
**Steps:**
1. Count visible rows in the table
2. Check row limit selector at bottom right

**Expected Result:**
- ✓ 25 rows displayed by default (DEFAULT_TABLE_ROW_LIMIT)
- ✓ Row limit selector shows "25"
- ✓ Pagination controls visible if more than 25 rows exist

### Test 1.4: Initial Sort Order
**Steps:**
1. Observe table header and click on "Publish Date" column

**Expected Result:**
- ✓ Table is initially sorted by Publish Date in ascending order
- ✓ Clicking column header changes sort direction
- ✓ Sort indicator (up/down arrow) visible in column header

### Test 1.5: Initial Row Density
**Steps:**
1. Observe row height/spacing
2. Look for row density toggle (if visible)

**Expected Result:**
- ✓ Rows display in "comfortable" density by default
- ✓ Sufficient padding/spacing between rows
- ✓ Content is readable and not cramped

---

## Section 2: Sidebar & Quick Queues

### Test 2.1: Sidebar Visibility
**Steps:**
1. Observe left sidebar on dashboard page

**Expected Result:**
- ✓ Sidebar displays on the left side
- ✓ Contains "Quick Queues" section with multiple queue options
- ✓ Contains "Metrics" section with filter options
- ✓ Sidebar has reasonable width (not too narrow, not taking full screen)

### Test 2.2: Quick Queue Options
**Steps:**
1. Expand the "Quick Queues" section if collapsed
2. Note all available queue buttons

**Expected Result:**
- ✓ At least these queues are visible:
  - "Writer: Not Started"
  - "Writer: In Progress"
  - "Writer: Needs Revision"
  - "Writer: Completed (Waiting to Publish)"
  - "Backlog: Unscheduled"
  - "Publisher: Not Started"
  - "Publisher: In Progress"
  - "Publisher: Final Review"
  - "Publisher: Published"
- ✓ Each queue button is clickable

### Test 2.3: Quick Queue Filtering
**Steps:**
1. Click "Writer: Not Started" queue button
2. Observe table updates
3. Note the number of results
4. Check if a badge or indicator shows count

**Expected Result:**
- ✓ Table filters to show only blogs with writer_status = "not_started"
- ✓ All displayed blogs have Writer Status = "Draft"
- ✓ Number of rows updates accordingly
- ✓ If count is shown, it matches displayed rows (or total across pages)

### Test 2.4: Switching Between Quick Queues
**Steps:**
1. Click "Writer: In Progress"
2. Observe table filters
3. Click "Publisher: Not Started"
4. Observe table filters change again

**Expected Result:**
- ✓ Table filters update immediately when switching queues
- ✓ Previous queue is deselected (visual indicator removed)
- ✓ New queue is highlighted/selected
- ✓ Table shows only blogs matching new queue criteria

### Test 2.5: Metric Filter Options
**Steps:**
1. Locate "Metrics" section in sidebar
2. Note available metric filters

**Expected Result:**
- ✓ At least these metrics are visible:
  - "Scheduled This Week"
  - "Ready to Publish"
  - "Delayed"
- ✓ Each metric shows a count (e.g., "3" next to "Scheduled This Week")

### Test 2.6: Applying Metric Filter
**Steps:**
1. Click "Scheduled This Week" metric
2. Observe table updates
3. Verify displayed blogs match criteria

**Expected Result:**
- ✓ Table filters to show only blogs scheduled for current calendar week
- ✓ All displayed blogs have a scheduled_date within current week
- ✓ Blogs without scheduled dates are hidden
- ✓ Metric button is highlighted/active

### Test 2.7: Clearing Sidebar Filters
**Steps:**
1. Apply a quick queue filter (e.g., "Writer: Not Started")
2. Look for a "Clear" or "Reset" button/link
3. Click to clear the filter

**Expected Result:**
- ✓ If clear button exists, table returns to unfiltered view
- ✓ All queues/metrics are deselected
- ✓ Table shows all blogs again

---

## Section 3: Table Operations

### Test 3.1: Sorting by Different Columns
**Steps:**
1. Click "Title" column header
2. Observe table re-sorts
3. Click "Publish Date" column header
4. Observe sort order (ascending/descending toggle)

**Expected Result:**
- ✓ Clicking different column headers changes sort field
- ✓ Clicking same column header twice toggles sort direction
- ✓ Sort indicator (arrow) shows current sort direction
- ✓ Sorted data matches expected order (alphabetical for title, chronological for dates)

### Test 3.2: Sorting by Status Columns
**Steps:**
1. Click "Writer Status" column header
2. Observe sort order matches status progression (Draft → Writing → Needs Revision → Ready)
3. Click "Publisher Status" header
4. Observe sort order (Scheduled → Publishing → Published)

**Expected Result:**
- ✓ Status columns sort by enum order, not alphabetical
- ✓ Writer Status sorts: not_started → in_progress → needs_revision → completed
- ✓ Publisher Status sorts: not_started → in_progress → completed
- ✓ Reverse order when clicked again

### Test 3.3: Pagination Controls
**Steps:**
1. If more than 25 blogs exist, look for pagination controls at bottom
2. Click "Next" page button
3. Observe table updates with new set of rows
4. Click page number (e.g., "3")
5. Verify table shows that page's rows

**Expected Result:**
- ✓ "Previous" button is disabled on first page, enabled on subsequent pages
- ✓ "Next" button is enabled when more pages exist, disabled on last page
- ✓ Page numbers are clickable
- ✓ Current page is highlighted
- ✓ Rows update correctly when changing pages

### Test 3.4: Row Limit Change
**Steps:**
1. Click row limit selector (showing "25")
2. Select "50" from dropdown
3. Observe table re-renders with new row limit
4. Count visible rows

**Expected Result:**
- ✓ Dropdown shows options: 25, 50, 100, 250
- ✓ Table updates to show selected number of rows
- ✓ Pagination resets to page 1
- ✓ Visible row count matches selection

### Test 3.5: Results Summary
**Steps:**
1. Observe the bottom left of the table area
2. Look for text like "Showing 1-25 of 142 results"

**Expected Result:**
- ✓ Summary text displays correct range (starting row - ending row)
- ✓ Total count is accurate
- ✓ Summary updates when filtering, changing row limit, or pagination

---

## Section 4: Filtering

### Test 4.1: Search Functionality
**Steps:**
1. Click search input field (labeled "Search")
2. Type a blog title substring (e.g., "SEO")
3. Wait for table to filter
4. Observe results

**Expected Result:**
- ✓ Table filters to show only blogs with matching title
- ✓ Search is case-insensitive
- ✓ Partial matches work (substring search)
- ✓ Filtering happens in real-time or after short delay
- ✓ Row count updates to reflect filtered results

### Test 4.2: Site Filter
**Steps:**
1. Look for "Site" filter in toolbar (if visible)
2. Click to open site filter menu
3. Select "Sighthound.com"
4. Observe table updates

**Expected Result:**
- ✓ Only blogs from sighthound.com are shown
- ✓ RED blogs are hidden
- ✓ Filter badge/pill shows "Site: Sighthound" or similar
- ✓ Can select multiple sites (creates OR filter)

### Test 4.3: Status Filter
**Steps:**
1. Open status filter menu
2. Select "Draft" status
3. Observe only draft blogs display

**Expected Result:**
- ✓ Only blogs with overall_status = "draft" display
- ✓ Filter works with multiple selections
- ✓ Status label displays correctly

### Test 4.4: Writer Filter
**Steps:**
1. Open writer filter menu
2. Select a writer by name
3. Observe table shows only blogs assigned to that writer

**Expected Result:**
- ✓ Only blogs where writer_id matches the selected writer display
- ✓ Writer name displays in filter pill
- ✓ Multiple writers can be selected (OR logic)
- ✓ "Unassigned" option appears if any blogs lack a writer

### Test 4.5: Publisher Filter
**Steps:**
1. Open publisher filter menu
2. Select a publisher
3. Observe table filters

**Expected Result:**
- ✓ Only blogs assigned to selected publisher display
- ✓ Multiple publishers can be selected
- ✓ "Unassigned" option available
- ✓ Filter updates row count

### Test 4.6: Writer Status Filter
**Steps:**
1. Open "Writer Status" filter
2. Select "Needs Revision"
3. Observe only "Needs Revision" blogs display

**Expected Result:**
- ✓ Filter shows only blogs with selected writer stage
- ✓ Multiple statuses can be selected
- ✓ Table updates correctly

### Test 4.7: Publisher Status Filter
**Steps:**
1. Open "Publisher Status" filter
2. Select "In Progress"
3. Observe table updates

**Expected Result:**
- ✓ Only blogs with publisher_status = "in_progress" display
- ✓ Multiple statuses selectable
- ✓ Filter applied correctly

### Test 4.8: Combining Multiple Filters
**Steps:**
1. Select Site: Sighthound
2. Select Status: Ready to Publish
3. Select Writer: John Doe
4. Observe table shows intersection of all filters

**Expected Result:**
- ✓ Table shows only blogs matching ALL criteria
- ✓ Row count reflects combined filters
- ✓ All filter pills display in toolbar
- ✓ Filters work together (AND logic across different filter types)

### Test 4.9: Clearing Individual Filters
**Steps:**
1. Apply multiple filters
2. Click X on one filter pill to remove it
3. Observe table updates

**Expected Result:**
- ✓ Clicking X removes that specific filter
- ✓ Table re-renders with updated results
- ✓ Other filters remain active

### Test 4.10: Clear All Filters
**Steps:**
1. Apply multiple filters
2. Look for "Clear All" button/link
3. Click to clear all filters

**Expected Result:**
- ✓ All filter pills disappear
- ✓ All filters reset to empty
- ✓ Table shows all blogs again

---

## Section 5: Column Customization

### Test 5.1: Open Column Editor
**Steps:**
1. Look for "Columns" button or menu
2. Click to open column editor

**Expected Result:**
- ✓ Column editor dialog or panel opens
- ✓ Shows list of all available columns with checkboxes
- ✓ Checked columns are currently visible
- ✓ Unchecked columns are hidden

### Test 5.2: Hide Column
**Steps:**
1. In column editor, uncheck "Overall Status" column
2. Close editor or apply changes
3. Observe table columns

**Expected Result:**
- ✓ "Overall Status" column disappears from table
- ✓ Checkbox is unchecked in editor
- ✓ Table re-renders without that column
- ✓ Changes persist (or on next load if stored in localStorage)

### Test 5.3: Show Column
**Steps:**
1. In column editor, check "Overall Status" if it's hidden
2. Apply changes
3. Observe table

**Expected Result:**
- ✓ "Overall Status" column appears in table
- ✓ Column shows correct data for each blog
- ✓ Checkbox is checked in editor

### Test 5.4: Reorder Columns
**Steps:**
1. In column editor, look for reordering controls (drag handles or arrows)
2. Move "Publish Date" column before "Publisher Status"
3. Apply changes
4. Observe table column order

**Expected Result:**
- ✓ Column order in table changes to match editor
- ✓ If drag-and-drop available, columns reorder by dragging
- ✓ If arrow buttons available, up/down arrows reorder columns
- ✓ Changes persist across navigation/reload

### Test 5.5: Required Columns Cannot Be Hidden
**Steps:**
1. In column editor, look for columns that cannot be unchecked
2. Try to uncheck required columns

**Expected Result:**
- ✓ Required columns (likely "Title") cannot be unchecked
- ✓ Checkbox for required column is disabled or not clickable
- ✓ Tooltip explains why column cannot be hidden

### Test 5.6: Column Editor State Persistence
**Steps:**
1. Customize columns (hide/show/reorder)
2. Navigate away from dashboard
3. Return to dashboard
4. Open column editor again

**Expected Result:**
- ✓ Custom column configuration is restored
- ✓ Same columns are hidden/shown as before
- ✓ Same order is maintained
- ✓ Configuration persists in localStorage

---

## Section 6: Row Density & Display Settings

### Test 6.1: Toggle Row Density
**Steps:**
1. Look for row density toggle (gear icon or menu)
2. If in "comfortable" mode, switch to "compact"
3. Observe row height changes

**Expected Result:**
- ✓ Rows become more compact (reduced padding)
- ✓ Content remains readable
- ✓ More rows visible at once
- ✓ Toggle shows current selection

### Test 6.2: Row Density Persistence
**Steps:**
1. Set row density to "compact"
2. Navigate to another page
3. Return to dashboard

**Expected Result:**
- ✓ Row density setting is preserved
- ✓ Rows display in compact mode on return
- ✓ Setting stored in localStorage

---

## Section 7: Blog Detail Panel

### Test 7.1: Opening Blog Detail Panel
**Steps:**
1. Click on a blog title in the table
2. Observe right sidebar panel opens

**Expected Result:**
- ✓ Right panel slides in from the right
- ✓ Panel shows selected blog details
- ✓ Title, site, and status information visible
- ✓ Panel is not cut off or hidden off-screen

### Test 7.2: Blog Detail Information Display
**Steps:**
1. Open a blog detail panel
2. Verify all displayed information

**Expected Result:**
- ✓ Blog title is prominent
- ✓ Blog site (Sighthound/RED) is shown
- ✓ Writer assignment and status are visible
- ✓ Publisher assignment and status are visible
- ✓ Scheduled publish date is shown
- ✓ Overall workflow stage is displayed

### Test 7.3: Blog History Tab
**Steps:**
1. Open blog detail panel
2. Click "History" tab if present
3. Observe history entries

**Expected Result:**
- ✓ History tab shows past changes to the blog
- ✓ Each entry shows timestamp, action, and who made change
- ✓ History is chronologically ordered (most recent first)
- ✓ Changes are clearly described (e.g., "Status changed to Publishing")

### Test 7.4: Blog Comments Tab
**Steps:**
1. Open blog detail panel
2. Click "Comments" tab if present
3. Observe existing comments

**Expected Result:**
- ✓ Comments tab displays blog comments
- ✓ Each comment shows author, timestamp, and text
- ✓ Comments are chronologically ordered
- ✓ If canCreateComments permission, comment input box is visible

### Test 7.5: Add Comment
**Steps:**
1. In blog detail panel, find comment input box
2. Type a comment: "Test comment from QA"
3. Click "Add Comment" or "Save" button
4. Wait for save to complete

**Expected Result:**
- ✓ Comment is added to blog
- ✓ New comment appears in comment list
- ✓ Comment shows current user as author
- ✓ Timestamp is correct
- ✓ Comment input clears after save

### Test 7.6: Close Blog Detail Panel
**Steps:**
1. With blog detail panel open, click close button (X)
2. Or click outside panel
3. Observe panel closes

**Expected Result:**
- ✓ Panel closes smoothly
- ✓ Table is visible again
- ✓ No errors on close
- ✓ Can open another blog by clicking on it

### Test 7.7: Panel Doesn't Interfere with Scrolling
**Steps:**
1. Open blog detail panel
2. Try to scroll table left/right
3. Verify table can scroll even with panel open

**Expected Result:**
- ✓ Table scrolling works normally
- ✓ Panel doesn't block interaction with table
- ✓ Both panel and table are accessible simultaneously

---

## Section 8: Bulk Actions

### Test 8.1: Select Rows
**Steps:**
1. Look for checkbox column at left side of table
2. Click checkbox for first blog row

**Expected Result:**
- ✓ Row is highlighted/selected
- ✓ Checkbox is checked
- ✓ Bulk actions toolbar appears (if available)

### Test 8.2: Select Multiple Rows
**Steps:**
1. Click checkboxes for 3 different blogs
2. Observe selection

**Expected Result:**
- ✓ All 3 rows are highlighted
- ✓ All checkboxes are checked
- ✓ Selection count displayed (e.g., "3 selected")
- ✓ Bulk actions toolbar shows appropriate actions

### Test 8.3: Select All Rows on Page
**Steps:**
1. Click "Select All" checkbox in table header
2. Observe all rows on current page are selected

**Expected Result:**
- ✓ All visible rows are selected
- ✓ Count shows total on page (e.g., "25 selected")
- ✓ All checkboxes are checked

### Test 8.4: Deselect Individual Row
**Steps:**
1. Select multiple rows
2. Click checkbox on one selected row to deselect it

**Expected Result:**
- ✓ That row is deselected
- ✓ Checkbox is unchecked
- ✓ Selection count decreases
- ✓ Other rows remain selected

### Test 8.5: Clear All Selections
**Steps:**
1. Select multiple rows
2. Click "Clear All" or "Deselect All" option
3. Observe selections clear

**Expected Result:**
- ✓ All checkboxes become unchecked
- ✓ No rows are highlighted
- ✓ Bulk actions toolbar disappears

### Test 8.6: Bulk Assign Writer
**Steps:**
1. Select 2 blogs that have different writers
2. Look for "Assign Writer" action
3. Select a new writer from dropdown
4. Click "Assign" or confirm

**Expected Result:**
- ✓ Both blogs are assigned to new writer
- ✓ Writer Status is reset appropriately
- ✓ Table updates to show new writer
- ✓ Success message displayed
- ✓ Rows remain selected until cleared

### Test 8.7: Bulk Assign Publisher
**Steps:**
1. Select 2 blogs
2. Find "Assign Publisher" action
3. Select a new publisher
4. Confirm action

**Expected Result:**
- ✓ Both blogs assigned to new publisher
- ✓ Publisher Status updates
- ✓ Table reflects changes
- ✓ Success message displayed

### Test 8.8: Bulk Update Writer Status
**Steps:**
1. Select blogs with "Draft" writer status
2. Find "Update Writer Status" action
3. Select "In Progress" status
4. Confirm

**Expected Result:**
- ✓ All selected blogs updated to "In Progress"
- ✓ Writer Status column shows new status
- ✓ Overall Status may update if applicable
- ✓ Changes reflected immediately in table

### Test 8.9: Bulk Update Publisher Status
**Steps:**
1. Select blogs with "Not Started" publisher status
2. Find "Update Publisher Status" action
3. Select "In Progress"
4. Confirm

**Expected Result:**
- ✓ All selected blogs updated
- ✓ Publisher Status column reflects change
- ✓ Overall Status may change
- ✓ Table updates immediately

### Test 8.10: Bulk Delete
**Steps:**
1. Select 1 blog to delete
2. Find "Delete" action
3. Confirm deletion (may need to type confirmation)

**Expected Result:**
- ✓ Confirmation dialog appears
- ✓ After confirmation, blog is removed from table
- ✓ Row count decreases
- ✓ Success message shown

### Test 8.11: Bulk Action Permissions
**Steps:**
1. Log in as user with limited permissions (e.g., can view but not edit)
2. Try to select rows

**Expected Result:**
- ✓ Row selection checkbox is disabled or not visible
- ✓ Bulk actions toolbar does not appear
- ✓ No errors when trying to interact

---

## Section 9: CSV Export

### Test 9.1: Export All Blogs (CSV)
**Steps:**
1. Look for "Export" button in toolbar
2. Click "Export CSV" or "Export All"
3. Observe file download

**Expected Result:**
- ✓ File downloads (filename like "blogs_export.csv")
- ✓ File is properly formatted CSV
- ✓ All columns are included
- ✓ All rows matching current filters are exported
- ✓ Data is accurate (matches table display)

### Test 9.2: Export Selected Rows (CSV)
**Steps:**
1. Select 3 blogs
2. Look for "Export Selected" option
3. Click to export

**Expected Result:**
- ✓ File downloads with only selected rows
- ✓ All columns are included
- ✓ Only 3 rows in exported file
- ✓ Data matches selected rows in table

### Test 9.3: CSV Contains All Expected Columns
**Steps:**
1. Export CSV
2. Open file in spreadsheet application (Excel, Google Sheets, etc.)
3. Verify columns

**Expected Result:**
- ✓ CSV headers match visible columns in table
- ✓ Data types are preserved (dates formatted, status labels used, not codes)
- ✓ No extra spaces or formatting issues
- ✓ Quotation marks used for CSV values with commas

### Test 9.4: CSV Export with Filters Applied
**Steps:**
1. Apply filter (e.g., "Site: Sighthound")
2. Export CSV
3. Verify exported data

**Expected Result:**
- ✓ Exported CSV contains only blogs matching filter
- ✓ All filtered blogs are included
- ✓ Non-matching blogs are excluded

### Test 9.5: CSV Data Accuracy
**Steps:**
1. Export CSV
2. Open in spreadsheet
3. Compare a few rows with table display
4. Verify data matches

**Expected Result:**
- ✓ Blog titles match exactly
- ✓ Writer/Publisher names match
- ✓ Status labels are correct
- ✓ Dates are formatted consistently
- ✓ No data corruption or truncation

---

## Section 10: Saved Views

### Test 10.1: Save Current View
**Steps:**
1. Apply filters and custom columns
2. Look for "Save View" option
3. Enter name: "My Custom View"
4. Click "Save"

**Expected Result:**
- ✓ New view is saved
- ✓ View appears in saved views list/dropdown
- ✓ Success message displayed
- ✓ View retains all custom settings (filters, columns, sort)

### Test 10.2: Load Saved View
**Steps:**
1. Create another filter/column configuration
2. Click on previously saved "My Custom View" from dropdown
3. Observe table updates

**Expected Result:**
- ✓ All saved filters are applied
- ✓ Column order and visibility are restored
- ✓ Sort field and direction are restored
- ✓ Table shows saved view configuration

### Test 10.3: Edit Saved View
**Steps:**
1. Load a saved view
2. Modify filters or columns
3. Look for "Update View" or "Save As" option
4. Choose "Update View"

**Expected Result:**
- ✓ Saved view is updated with new configuration
- ✓ Next time view is loaded, new config is present
- ✓ Changes are persisted

### Test 10.4: Delete Saved View
**Steps:**
1. Look for saved views dropdown
2. Find delete option for a saved view
3. Confirm deletion

**Expected Result:**
- ✓ Saved view is removed from list
- ✓ View can no longer be loaded
- ✓ Success message shown

### Test 10.5: Saved View Persistence
**Steps:**
1. Save a view
2. Close browser/tab
3. Reopen dashboard
4. Check saved views list

**Expected Result:**
- ✓ Saved view is still available
- ✓ View configuration is intact
- ✓ All saved views are listed

### Test 10.6: Maximum Saved Views
**Steps:**
1. Create 60 saved views (more than max)
2. Observe behavior

**Expected Result:**
- ✓ System limits to 50 views maximum (as per code)
- ✓ Oldest views may be removed or warning shown
- ✓ New views created within limit

---

## Section 11: Inline Editing (If Available)

### Test 11.1: Edit Publish Date
**Steps:**
1. Click on publish date cell for a blog
2. If editable, observe date picker appears
3. Select new date
4. Confirm change

**Expected Result:**
- ✓ Date picker opens (if user has permission)
- ✓ New date can be selected
- ✓ Blog update reflected in table
- ✓ If no permission, cell not editable

### Test 11.2: Edit Writer Status
**Steps:**
1. Click on Writer Status cell (if editable)
2. Observe status dropdown
3. Select new status
4. Confirm

**Expected Result:**
- ✓ Status dropdown appears
- ✓ New status can be selected
- ✓ Overall Status may update accordingly
- ✓ Changes reflected immediately

### Test 11.3: Edit Publisher Status
**Steps:**
1. Click on Publisher Status cell
2. Change status
3. Confirm

**Expected Result:**
- ✓ Status updates in table
- ✓ Overall Status reflects change
- ✓ History is updated

---

## Section 12: Responsive Design & Mobile (If Applicable)

### Test 12.1: Desktop View (1920px+)
**Steps:**
1. View dashboard on desktop or large screen
2. All columns visible
3. Sidebar visible

**Expected Result:**
- ✓ All content visible without horizontal scroll
- ✓ Layout properly spaced
- ✓ No content overflow

### Test 12.2: Tablet View (768px)
**Steps:**
1. View dashboard on tablet or resize to 768px
2. Check sidebar and table layout

**Expected Result:**
- ✓ Sidebar may collapse or hide
- ✓ Table remains usable
- ✓ Column visibility appropriate for screen size
- ✓ No content cut off

### Test 12.3: Mobile View (375px)
**Steps:**
1. View on mobile or resize to 375px
2. Verify usability

**Expected Result:**
- ✓ Table is scrollable horizontally
- ✓ Essential columns visible first
- ✓ Sidebar hidden (collapsed/drawer)
- ✓ Buttons are tap-friendly size

---

## Section 13: Performance & Edge Cases

### Test 13.1: Large Dataset Loading
**Steps:**
1. With 1000+ blogs in database, load dashboard
2. Observe loading time

**Expected Result:**
- ✓ Initial load completes in < 5 seconds
- ✓ Table pagination prevents slowness
- ✓ Default row limit (25) loads quickly
- ✓ No UI freezing

### Test 13.2: Search Performance
**Steps:**
1. With large dataset, search for common term
2. Observe filter performance

**Expected Result:**
- ✓ Search completes quickly (< 1 second)
- ✓ No UI lag
- ✓ Results are accurate

### Test 13.3: Pagination Performance
**Steps:**
1. Navigate between pages (especially with 1000+ blogs)
2. Observe page load time

**Expected Result:**
- ✓ Page changes are instant or < 1 second
- ✓ Table updates smoothly
- ✓ No loading spinner on pagination (data pre-fetched if possible)

### Test 13.4: Empty Dataset
**Steps:**
1. With no blogs in database, load dashboard
2. Observe state

**Expected Result:**
- ✓ Page loads without errors
- ✓ "No results" message displayed
- ✓ Quick queues show 0 counts
- ✓ Table is empty but still structured

### Test 13.5: Single Blog Dataset
**Steps:**
1. With only 1 blog, load dashboard
2. Observe pagination and controls

**Expected Result:**
- ✓ Table shows 1 blog
- ✓ Pagination controls are disabled (only 1 page)
- ✓ "1 of 1" shown in pagination
- ✓ No page number buttons

### Test 13.6: Special Characters in Blog Title
**Steps:**
1. Create blog with title: "Testing "Quotes" & Ampersands <>"
2. Search for blog
3. Export to CSV
4. Verify rendering

**Expected Result:**
- ✓ Title displays correctly in table
- ✓ Search finds blog
- ✓ CSV properly escapes special characters
- ✓ No corrupted data

---

## Section 14: Permissions Testing

### Test 14.1: Read-Only User
**Steps:**
1. Log in as user with only `view_dashboard` permission
2. Navigate to dashboard
3. Try to edit, delete, or bulk actions

**Expected Result:**
- ✓ Dashboard visible
- ✓ Table and filters work
- ✓ Sidebar visible but no destructive actions available
- ✓ Edit/delete buttons disabled or hidden
- ✓ Row selection disabled

### Test 14.2: Editor User
**Steps:**
1. Log in as user with write permissions
2. Try bulk actions

**Expected Result:**
- ✓ Bulk action buttons visible
- ✓ Can select rows
- ✓ Can assign writers/publishers
- ✓ Can update statuses
- ✓ Can delete (with confirmation)

### Test 14.3: Admin User
**Steps:**
1. Log in as admin
2. Verify all features are available

**Expected Result:**
- ✓ All options available
- ✓ No disabled buttons
- ✓ All exports available
- ✓ All bulk actions available

---

## Section 15: Keyboard Accessibility

### Test 15.1: Tab Navigation
**Steps:**
1. Press Tab repeatedly while on dashboard
2. Observe focus moves through interactive elements

**Expected Result:**
- ✓ Focus visible (outline or highlight)
- ✓ Tab order is logical (left to right, top to bottom)
- ✓ No focus traps
- ✓ All buttons/inputs reachable via Tab

### Test 15.2: Keyboard Select
**Steps:**
1. Tab to a blog row checkbox
2. Press Space to select
3. Observe row is selected

**Expected Result:**
- ✓ Space bar toggles checkbox
- ✓ Row is selected/deselected
- ✓ Works for all rows

### Test 15.3: Keyboard Open Panel
**Steps:**
1. Tab to a blog title
2. Press Enter to open detail panel

**Expected Result:**
- ✓ Detail panel opens
- ✓ Focus moves to panel (or panel is accessible)

### Test 15.4: Keyboard Close Panel
**Steps:**
1. With detail panel open, press Escape

**Expected Result:**
- ✓ Panel closes
- ✓ Focus returns to table

---

## Section 16: Error Handling

### Test 16.1: Network Error on Load
**Steps:**
1. Simulate network error (browser dev tools)
2. Load dashboard
3. Observe error handling

**Expected Result:**
- ✓ Error message displayed to user
- ✓ Retry button available
- ✓ User can retry loading
- ✓ No blank page or console errors

### Test 16.2: Invalid Filter State
**Steps:**
1. Manually set invalid filter state in localStorage
2. Load dashboard

**Expected Result:**
- ✓ Page loads with defaults
- ✓ Invalid filters are ignored/sanitized
- ✓ No errors

### Test 16.3: Deleted Blog While Viewing
**Steps:**
1. Open blog detail panel
2. In another tab, delete that blog
3. In original tab, try to interact with blog

**Expected Result:**
- ✓ Graceful handling (error message or auto-refresh)
- ✓ No console errors
- ✓ Panel closes or shows error

### Test 16.4: Permission Change Mid-Session
**Steps:**
1. User has export permission, starts export
2. Permission is revoked
3. Try to export again

**Expected Result:**
- ✓ Export button disabled or permission error shown
- ✓ Clear message to user about permission
- ✓ No crash or unexpected behavior

---

## Section 17: Browser Compatibility

### Test 17.1: Chrome/Edge (Chromium)
**Steps:**
1. Open dashboard in Chrome or Edge
2. Test all features

**Expected Result:**
- ✓ All features work
- ✓ No visual glitches
- ✓ Performance is good

### Test 17.2: Firefox
**Steps:**
1. Open dashboard in Firefox
2. Test features

**Expected Result:**
- ✓ All features work
- ✓ Layout matches other browsers
- ✓ No console errors

### Test 17.3: Safari (Mac/iOS)
**Steps:**
1. Open dashboard in Safari
2. Test responsiveness and features

**Expected Result:**
- ✓ All features functional
- ✓ Touch interactions work on iOS
- ✓ No browser-specific bugs

---

## Sign-Off Checklist

### Core Functionality
- [ ] Page loads without errors
- [ ] Default columns and sort order correct
- [ ] Table displays blogs correctly
- [ ] Pagination works
- [ ] Row limit selector works

### Sidebar & Filtering
- [ ] Quick queues filter correctly
- [ ] Metric filters work
- [ ] Search functionality works
- [ ] Site/status/writer/publisher filters work
- [ ] Multiple filters combine correctly
- [ ] Filters clear properly

### Table Operations
- [ ] Sorting works on all columns
- [ ] Status columns sort by enum order
- [ ] Column customization works
- [ ] Column changes persist
- [ ] Row density toggle works

### Blog Detail Panel
- [ ] Panel opens correctly
- [ ] Panel displays accurate information
- [ ] History tab works (if present)
- [ ] Comments can be added
- [ ] Panel closes cleanly

### Bulk Actions
- [ ] Row selection works
- [ ] Bulk actions available (if permitted)
- [ ] Bulk assign writer/publisher works
- [ ] Bulk status update works
- [ ] Bulk delete works with confirmation

### CSV Export
- [ ] Export all works
- [ ] Export selected works
- [ ] CSV format is correct
- [ ] Data accuracy verified
- [ ] Special characters handled

### Saved Views
- [ ] Views can be saved
- [ ] Saved views can be loaded
- [ ] Saved views can be updated
- [ ] Saved views can be deleted
- [ ] Persistence verified

### Performance & Stability
- [ ] Large dataset loads without lag
- [ ] Search performs well
- [ ] Empty dataset handled gracefully
- [ ] No console errors
- [ ] No UI freezing

### Accessibility
- [ ] Tab navigation works
- [ ] Keyboard shortcuts work
- [ ] Proper focus management
- [ ] Error messages clear
- [ ] Read-only users prevented from editing

---

## Known Limitations

1. **localStorage Dependency:** Column customization and saved views rely on browser localStorage. Clearing browser data will reset these preferences.

2. **Single User Context:** Dashboard settings are per-user and stored locally. Multi-device sync is not available.

3. **Real-time Updates:** Dashboard does not auto-refresh when blogs are updated by other users. Manual refresh required.

4. **Bulk Action Limits:** Large bulk operations (1000+ rows) may have performance considerations.

---

## Bug Report Template

If issues are found during testing, document using this template:

```
**Title:** [Brief description of issue]

**Steps to Reproduce:**
1. [Step 1]
2. [Step 2]
3. [Step 3]

**Expected Behavior:**
[What should happen]

**Actual Behavior:**
[What actually happens]

**Screenshots/Video:**
[Attach if possible]

**Environment:**
- Browser: [Chrome/Firefox/Safari/Edge]
- OS: [Windows/Mac/Linux]
- Screen Size: [Desktop/Tablet/Mobile]
- User Role: [Admin/Editor/Viewer]

**Severity:**
[Critical / High / Medium / Low]

**Additional Notes:**
[Any other relevant information]
```

---

## Next Steps After Testing

1. Document all found issues using the bug report template
2. Prioritize bugs by severity
3. Assign bugs to development team
4. Create regression test suite for critical paths
5. Schedule retesting after fixes
6. Update this test plan based on findings and new features

