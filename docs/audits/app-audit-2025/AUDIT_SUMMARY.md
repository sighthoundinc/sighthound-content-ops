# Governance Audit Summary

**Tester**: Code Review & Static Analysis
**Role**: admin
**Date**: 2026-03-25
**Environment**: source code analysis
**Duration**: 180 minutes

## Overview
- **Total findings**: 17
- **High priority**: 8
- **Medium priority**: 9
- **Low priority**: 0
- **Code quality issues**: 1

## Findings by Priority

### High Priority (8)

- [Dashboard — Bulk action modal lacks per-field validation before submit](./DASHBOARD_002.md)
- [Global — Generic error messages lack actionable next steps](./GLOBAL_001.md)
- [Global — API authorization not validated - frontend permission checks may be insufficient](./GLOBAL_003.md)
- [Global — Bulk actions lack confirmation dialogs and preview](./GLOBAL_004.md)
- [Ideas — Comment editing lacks permission boundary validation](./IDEAS_001.md)
- [Social Posts — Editor Step 1: Can progress without required Platform field](./SOCIAL_POSTS_001.md)
- [Social Posts — Canva URL field accepts invalid URLs without validation](./SOCIAL_POSTS_003.md)
- [Tasks — Non-assigned users can view all team tasks (should see only own)](./TASKS_001.md)

### Medium Priority (9)

- [Blogs — Copy URL on missing URL value copies literal 'null' string](./BLOGS_001.md)
- [Blogs — Long blog titles cause text wrapping instead of truncation with tooltip](./BLOGS_002.md)
- [Calendar — Drag-and-drop reschedule lacks confirmation and validation](./CALENDAR_001.md)
- [Calendar — Calendar reschedule action provides no loading feedback](./CALENDAR_002.md)
- [Dashboard — Inline status dropdown changes lack visible loading state](./DASHBOARD_001.md)
- [Global — Inconsistent row height across tables causes pagination shift](./GLOBAL_002.md)
- [Ideas — Idea conversion to blog dialog lacks required field validation](./IDEAS_002.md)
- [Social Posts — Autosave in editor provides no visible feedback](./SOCIAL_POSTS_002.md)
- [Tasks — Inline task status change lacks validation for invalid transitions](./TASKS_002.md)

## By Module

- **Blogs**: 2 issue(s)
- **Calendar**: 2 issue(s)
- **Dashboard**: 2 issue(s)
- **Global**: 4 issue(s)
- **Ideas**: 2 issue(s)
- **Social Posts**: 3 issue(s)
- **Tasks**: 2 issue(s)

## By Rule Violated

- **Data Mutation Safety (MUST)**: 1 issue(s)
- **Error Handling (MUST)**: 2 issue(s)
- **Feedback & System Status (MUST)**: 3 issue(s)
- **Forms & Input Behavior (MUST)**: 6 issue(s)
- **Permissions Enforcement (MUST)**: 3 issue(s)
- **Table Invariants (MUST)**: 2 issue(s)
