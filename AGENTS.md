# Project Rules

Use Deft as the rules framework for this repository.

Primary entrypoint:
- See `deft/main.md`

Apply Deft lazily based on task type (language/tool/interface) and follow the layered precedence defined by Deft.

Project-specific Deft files:
- `deft/PROJECT.md`
- `deft/SPECIFICATION.md`

## Rule Conflict Resolution (MUST)

If instructions appear to conflict, resolve in this order:

1. Direct task-specific user instruction for the current request.
2. Project-specific Deft rules and specifications (`deft/main.md`, `deft/PROJECT.md`, `deft/SPECIFICATION.md`).
3. This file (`AGENTS.md`) invariants.
4. Default implementation preferences.

When still ambiguous, choose the option that maximizes predictability, accessibility, and cross-page consistency.

## Change Intelligence Protocol (MUST)

For every non-trivial UI or workflow change:

1. **Reuse Before New**: Prefer extending shared components/patterns over introducing page-specific behavior.
2. **Single Source of Truth**: Keep labels, statuses, and transition logic centralized; avoid duplicating mappings in components.
3. **Explicit State UX**: Every state transition should produce a clear user-facing signal (label, badge, message, disabled state, or next action).
4. **Predictable Interactions**: Keep interaction patterns consistent across pages (ordering, placement, close-on-blur behavior, sorting behavior, and feedback positioning).
5. **Accessibility by Default**: Ensure keyboard navigation, visible focus states, and correct ARIA semantics for changed controls.
6. **Safe Evolution**: Do not change enum keys, persisted values, or API contracts unless explicitly required.

## Iconography Standard (MUST)

1. Emoji-based icons are not allowed for UI controls, status markers, or notifications.
2. Use the shared open-source icon system (`lucide-react`) via `src/lib/icons.tsx`.
3. Render icons through `AppIcon` and shared `AppIconName` keys instead of ad-hoc inline glyphs.
4. Keep icons inside explicit bounding boxes to preserve vertical rhythm and cross-table alignment.
5. Maintain consistent stroke weight and sizing patterns unless a component has a documented exception.

## State & Workflow Authority (MUST)

1. Database is the source of truth for all statuses and transitions.
2. Frontend must not allow invalid transitions (enforced via API + DB constraints).
3. Derived states (for example overall stage) are read-only and must not be manually editable.
4. Any new status or transition requires:
   - DB constraint update
   - API validation update
   - UI update (badges, filters, labels, next-action cues)
   - Documentation update

## Permissions Enforcement (MUST)

1. Supabase RLS is the source of truth for authorization.
2. Frontend permission checks are UX-only and never a security boundary.
3. Every feature must define who can view, edit, and perform privileged actions (create/delete/import/publish).
4. No feature ships without RLS coverage.

## Forms & Input Behavior (MUST)

1. All inputs expose clear validation states (error, success/valid, disabled, loading).
2. Required fields are enforced at both UI and API levels.
3. Use consistent patterns for date inputs, URL validation, and select/dropdown behavior.
4. Show inline errors near fields (toasts can supplement but not replace inline errors).
5. Never allow silent submit failure; preserve user input and provide actionable errors.

## Feedback & System Status (MUST)

1. Every action must produce visible feedback:
   - Success → confirmation
   - Error → actionable error message
   - Loading → explicit loading/disabled state
2. Long-running actions (imports, saves, scheduling) must show progress or blocking state.
3. No action should feel uncertain or silent.

## Error Handling (MUST)

1. All errors must be:
   - Human-readable
   - Actionable (what went wrong + what to do next)
2. Categorize errors:
   - Validation errors (inline)
   - System errors (toast + fallback message)
   - Permission errors (clear access message)
3. Never expose raw system errors or stack traces to users.
4. Failed actions must not leave UI in inconsistent state.

## Data Mutation Safety (MUST)

1. All mutations must be:
   - Atomic (succeed fully or fail cleanly)
   - Validated before execution
2. Bulk actions must:
   - Show preview or confirmation
   - Provide success/failure breakdown
3. Destructive actions must require confirmation.
4. No partial silent updates.

## Documentation Update Rule (MUST)

After any feature or behavior change (when applicable):

1. Update:
   - `AGENTS.md` (if rules/invariants changed)
   - `HOW_TO_USE_APP.md` (user-facing behavior)
   - `OPERATIONS.md` (internal workflows)
   - `SPECIFICATION.md` (technical logic/behavior)
   - `README.md` (setup/scope/usage changes)
   - Any other directly impacted docs
2. Document:
   - What changed
   - Why it changed
   - Constraints/edge cases
3. Definition of done: implementation is incomplete until docs reflect reality.

## Change Risk Classification (SHOULD)

All changes should be categorized before implementation:

- **Low Risk**: UI-only, no data or permission impact.
- **Medium Risk**: Affects workflows, validation, or UX behavior.
- **High Risk**: Affects DB schema, permissions (RLS), or core logic.

Requirements:
- **Medium** → requires manual testing.
- **High** → requires test plan + rollback consideration.

## Delivery Quality Gate (MUST)

Before considering a task complete:

1. Run relevant validation steps (lint/typecheck/tests/build) when available; if not run, state exactly why.
2. Verify affected UX surfaces for consistency with existing global patterns and invariants in this file.
3. Confirm documentation updates from the rule above are applied when applicable.
4. Prefer small, reversible changes over broad rewrites unless the task explicitly requires larger refactoring.
5. Apply risk-based validation from **Change Risk Classification** where applicable.
6. **After API changes that reference profile columns or data shapes**: Run database migrations (`supabase db push --yes`) to ensure schema alignment and prevent runtime errors like "column profiles.X does not exist".

## Git Commits (MUST)

Keep commit messages short and direct:

1. **Format**: `type(scope): short description` (max 50 chars)
   - Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`, `perf`
   - Examples:
     - `feat: add daily standup home page`
     - `fix: filter publisher queue by assignment`
     - `docs: update SPECIFICATION.md`
2. **Rationale**: Short messages force clarity and are easier to scan in logs
3. **Body**: Only include detailed explanations if truly necessary (most changes don't need them)
4. **Multi-file changes**: Use a single, consolidated commit message covering the whole feature
5. **Always ask before committing**: Never automatically commit and push without explicit user approval. Summarize changes, show the proposed commit message, and wait for confirmation before proceeding.

## Definition of Done (MUST)

A feature is complete only if:

1. DB schema/constraints are updated as needed.
2. API enforces validation and permissions.
3. UI reflects correct state, feedback, and next actions.
4. RLS policies are implemented for access control changes.
5. Edge cases are handled (errors, empty states, loading states).
6. Documentation is updated per the documentation rule.

## UI Table Layout Invariants (MUST)

To prevent pagination breakage, pagination control misalignment, and unpredictable row height growth:

1. **Fixed Row Heights**: Keep all table rows at stable/fixed visual height per density mode (compact/comfortable). Long content must NOT expand rows.
2. **Single-Line Truncation**: Truncate long text in table cells (titles, names, descriptions) to a single line with ellipsis (`truncate`). Always include full value via `title` attribute for tooltip on hover.
3. **Overflow Constraints**: Apply `overflow-hidden` + explicit `max-width`/`width` constraints to cells containing long content to enforce hard layout limits.
4. **Pagination Boundary**: Keep pagination controls (row limit, page controls) structurally outside the table body. Controls must never render between table rows or appear to be pushed by row expansion.

These rules apply to all table implementations (DataTable, DashboardTable, etc.) across the application.

## Table Interaction Rules (MUST)

1. Row click behavior should be consistent per table type (open detail panel or navigate).
2. Bulk actions apply only to selected rows.
3. Sorting and filtering persist within session.

## Search Behavior (MUST)

1. Search supports partial, case-insensitive matching.
2. Results should update in near real-time with debounced input where appropriate.
3. Show meaningful empty-state feedback when no results are found.

## Ideas Page Interaction Invariants (MUST)

To keep idea intake predictable and avoid split editing patterns:

1. **Comments & References Visibility**: Comments and references remain visible by default on each idea card.
2. **No Inline Editing in Idea Cards**: Do not provide inline comment/reference editing or add-comment controls inside the card body.
3. **Single Edit Path**: Update idea title/site/comments-references through the **Edit Idea** modal only.
4. **Conversion Options**: Idea cards provide conversion actions for both blogs and social posts.

## Global Feedback System: Alerts vs Notifications (MUST)

**Split system** separates ephemeral action feedback from persistent workflow events.

### Alerts (`useAlerts`)
- **Purpose**: Transient system feedback (Saved, Done, errors)
- **Placement**: Bottom-left fixed corner
- **Lifecycle**: Auto-dismiss 3–5s (persistent on errors)
- **No persistence** across sessions
- **Icons**: lucide-react via `AppIcon` (no emoji)
- **Trigger**: Direct API calls (save, delete, import, copy)
- **Provider**: `AlertsProvider` in root layout

### Notifications (`useNotifications`)
- **Purpose**: Persistent workflow state changes (task assigned, stage changed, awaiting action)
- **Placement**: Bell icon (top-right) with unread count badge
- **Lifecycle**: Persistent until explicitly marked as read or cleared
- **Visible in bell drawer** with titles, messages, timestamps, and links to context
- **Types**: `task_assigned`, `stage_changed`, `awaiting_action`, `mention`
- **Icons**: lucide-react via `AppIcon` (no emoji)
- **Trigger**: Workflow mutations (blog status changes, task assignments)
- **Provider**: `NotificationsProvider` in root layout

### Implementation
- **No emoji icons**: All feedback uses `AppIcon` from `src/lib/icons.tsx`
- **Backward compat**: Old `useSystemFeedback()` calls re-routed to `useAlerts()` via wrapper
- **Helper functions**: `src/lib/notification-helpers.ts` generates typed notification payloads
- **Blog workflows**: Status changes in `/blogs/[id]/page.tsx` emit notifications via `pushNotification()`

### Adding New Notifications
1. Define helper in `src/lib/notification-helpers.ts` returning `NotificationInput`
2. Call `pushNotification(helper(...))` in mutation handler
3. Update SPECIFICATION.md and this guide with trigger point documentation

## Social Post Dedicated Editor Workflow (MUST)

The dedicated editor at `/social-posts/[id]` follows a guided 4-step flow:

1. **Setup** — Post Title, Platform(s), Publish Date, Canva Link/Page, Product, Type.
2. **Link Context (optional)** — Associated Blog search + linked blog actions.
3. **Write Caption** — UTF-8 editor focus with formatting tools and grouped copy actions.
4. **Review & Publish** — Checklist validation, status transitions, and stage-based final CTA labels:
   - Draft incomplete → `Save Draft`
   - Draft complete → `Move to Review`
   - In Review complete → `Mark Published`
