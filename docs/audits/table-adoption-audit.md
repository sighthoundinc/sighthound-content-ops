# Table Adoption Audit

**Date:** 2026-06-18
**Status:** Operational table chrome convergence in progress
**Confidence:** High

## Summary

The app has moved beyond the original “custom table to `DataTable`” migration. `DataTable` is now adopted on Blogs, Social Posts list mode, and My Tasks, while Dashboard keeps the specialized `DashboardTable` wrapper for mixed blog/social content. The current consistency work is focused on making the surrounding operational table chrome feel like one product: results summary, action order, customization menus, selection panels, pagination, loading/empty placement, and update feedback.

## Current status

| Page | Location | Current implementation | Status | Notes |
|---|---|---|---|---|
| Dashboard | `src/app/dashboard/page.tsx` | `DashboardTable` plus shared action dropdown primitives | Partial | Keeps custom mixed-content table and saved-view column editor; copy/export dropdowns now use shared operational primitives. |
| Blogs | `src/app/blogs/page.tsx` | `DataTable` plus `OperationalTableFrame` | Adopted | Table controls, copy/customize/import/export order, selection bar, and pagination use shared operational chrome. |
| Social Posts | `src/app/social-posts/page.tsx` | `DataTable` in list mode plus `OperationalTableFrame` | Adopted for list view | Board and calendar modes are intentionally separate; list mode uses shared operational chrome and keeps mandatory/optional column rules. |
| My Tasks | `src/app/tasks/page.tsx` | `DataTable` plus `OperationalTableFrame` | Adopted | Copy/customize/import/export controls and pagination use shared operational chrome while preserving task action-state behavior. |
| Settings | `src/app/settings/page.tsx` | Specialized admin tables/grids | Excluded | Settings and Activity History are admin-oriented exceptions and do not need the operational table contract. |
| Calendar | `src/app/calendar/page.tsx` | Calendar shell / stream rendering | Excluded | Calendar is not a traditional operational table and keeps calendar-specific layout rules. |

## Shared primitives

- `src/components/data-table.tsx` remains the common table body component for list-style operational tables.
- `src/components/dashboard-table.tsx` remains the mixed-content dashboard table wrapper.
- `src/lib/table.ts` remains the source for density, pagination, table container, header, and body class contracts.
- `src/components/table-controls.tsx` remains the source for results summary, row-limit, and pagination controls.
- `src/components/operational-table.tsx` now centralizes operational table chrome:
  - `OperationalTableFrame`
  - `OperationalTableActions`
  - `OperationalTableDropdown`
  - `OperationalTableMenuItem`
  - `OperationalTableSelectionBar`
  - `OperationalTableCustomizeMenu`

## Adoption rules

1. New operational list tables should use `DataTable` unless they have a documented reason for a specialized wrapper.
2. New operational table sections should use `OperationalTableFrame` or the smaller operational action primitives.
3. Table action order remains `Copy` → `Customize` → `Import` → `Export` when those actions are present.
4. At most one primary action should appear in a horizontal table control strip.
5. Pagination controls stay outside the table body.
6. Row heights remain density-controlled and stable.
7. Long text cells remain single-line truncated with a `title` value where possible.
8. Sort indicators must use `AppIcon`, not Unicode glyphs.

## Remaining follow-ups

- Consider moving Dashboard’s richer saved-view column editor into a shared advanced column-view primitive if another page needs saved views.
- Consider adding Social Posts copy/import actions only as a deliberate feature follow-up, not as part of chrome-only convergence.
- Consider replacing inline selected-row bars with the floating `SelectionCart` only after confirming it does not obscure pagination or dense table content on small screens.
- Keep visual QA focused on no horizontal overflow, stable pagination placement, and dropdown layering.
