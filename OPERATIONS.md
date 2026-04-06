# OPERATIONS.md

## Purpose
This runbook describes how to operate Content Relay safely in day-to-day environments while preserving workflow continuity for blogs and social posts.

## 1) Operational model
- Core workflow authority is database + API transition contracts.
- UI is guidance and feedback; transition validity is enforced server-side.
- All workflow-critical actions should flow through canonical API routes.

## 2) Environments and release gate
### Recommended flow
1. Validate changes in local development.
2. Promote to staging and confirm stage transitions + required gates.
3. Run full verification before release.

### Verification command
```bash
npm run check:full
```

## 3) Core workflow contracts to verify after each release
### Social posts
- Status flow remains:
  - `draft`
  - `in_review`
  - `changes_requested`
  - `creative_approved`
  - `ready_to_publish`
  - `awaiting_live_link`
  - `published`
- Draft create gate remains: Product, Type, Assigned to, Reviewer.
- Optional draft-create fields remain non-blocking: Title, Platforms, Scheduled date, Associated blog.
- Empty create title should auto-normalize to `Untitled social post` instead of failing create.
- `published` requires at least one valid live link.
- Execution-stage rollback to `changes_requested` requires a reason.

### Blogs
- Writing flow handoff to publishing remains enforced.
- Publishing completion cannot bypass prerequisite writing completion and review checkpoint.

## 4) API contract integrity
- Use canonical mutation routes for workflow transitions.
- Keep request validation at route boundaries.
- Keep response shape stable (success/error envelope) for predictable client handling.
- Avoid direct state mutation bypasses from client to DB.

## 5) Import operations
- Import should support selective columns and selective rows.
- Required key columns must be present for successful import.
- Missing optional fields use deterministic fallback behavior where configured.
- Existing rows can be updated by import when identity match rules are met.

## 6) Date/time and scheduling reliability
- Render user-facing date/time from user timezone preferences.
- Use shared date formatting utilities for consistency.
- Keep date-only rendering on date-only formatters to prevent timezone day shift.

## 7) Notification and reminder behavior
- Workflow reminders and notifications should be emitted through centralized event paths.
- Notification preference toggles should be respected at emission time.
- Delivery failures should degrade safely without blocking core workflow transitions.

## 8) Common failure patterns and quick response
| Symptom | Likely cause | Response |
|---|---|---|
| Transition rejected | Missing required target-stage fields | Complete required fields and retry |
| Social cannot publish | No valid live link saved | Save at least one valid public link, retry |
| Inconsistent queue ownership | Assignment/state mismatch | Refresh queue and re-run transition with current state |
| Import partial failures | Key columns/row validation issues | Fix invalid rows, re-run import on valid selection |

## 9) Database and migration operations
- Treat `supabase/migrations` as append-only.
- Add new timestamped migrations; do not rewrite applied migration history.
- Run migration push when schema-affecting changes are introduced.

## 10) Documentation maintenance rule
When workflow behavior changes, update:
- `README.md`
- `HOW_TO_USE_APP.md`
- `SPECIFICATION.md`
- `OPERATIONS.md`

Keep all four docs aligned on:
- stage names
- transition gates
- ownership rules
- usage flow
