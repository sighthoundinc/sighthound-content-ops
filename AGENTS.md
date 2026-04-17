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

## React Hook Dependency Contract (MUST)

1. Treat `react-hooks/exhaustive-deps` warnings as correctness issues, not optional cleanup.
2. Do not suppress hook dependency warnings with inline eslint disables unless there is no practical alternative and the rationale is documented in code comments.
3. Any component-scope function referenced by `useEffect`, `useMemo`, or another `useCallback` must be stabilized with `useCallback` (with complete dependencies) or moved inside the consuming hook when single-use.
4. Dependency arrays must include all referenced props/state/derived values used by the hook logic (including debounced values used for filtering or fetching).
5. For debounced search/filter flows, effects/callbacks must depend on the debounced value intended to drive side effects, not only on the raw input.
6. No new hook dependency warnings are allowed in touched files before merge.

## Iconography Standard (MUST)

1. Emoji-based icons are not allowed for UI controls, status markers, or notifications.
2. Use the shared open-source icon system (`lucide-react`) via `src/lib/icons.tsx`.
3. Render icons through `AppIcon` and shared `AppIconName` keys instead of ad-hoc inline glyphs.
4. Keep icons inside explicit bounding boxes to preserve vertical rhythm and cross-table alignment.
5. Maintain consistent stroke weight and sizing patterns unless a component has a documented exception.

## Typography System (MUST)

1. **Font Loading**: Inter (primary sans-serif) and JetBrains Mono (technical text) are loaded via Google Fonts with `display: swap` in `src/app/layout.tsx`.
2. **Core Typography Classes**: Use utility classes from `globals.css` for standard roles:
   - `.page-title`, `.section-title`, `.subsection-label` for headings
   - `.table-header-text`, `.body-text`, `.meta-text`, `.disabled-text` for content
   - `.monospace-technical` for technical values and IDs
3. **Typography Constants**: Import `TYPOGRAPHY` from `src/lib/typography.ts` for component-level styling:
   - Use predefined constants (e.g., `TYPOGRAPHY.PAGE_TITLE`, `TYPOGRAPHY.BODY`, `TYPOGRAPHY.META`)
   - Covers all common UI roles (headings, form labels, buttons, badges, links, notifications)
4. **Type Scale Rules**:
   - Headings use `font-semibold` with `tracking-tight` for modern, confident appearance
   - Body text is `text-sm` with `leading-6` for comfortable readability
   - Meta text is `text-xs` with `leading-4` for compact secondary information
   - Never use arbitrary font sizes; stay within the 12–24px range
5. **Weight Hierarchy**: Normal (400) for body, Medium (500) for labels, Semibold (600) for headings, Bold (700) reserved for rare exceptions
6. **Line Height Optimization**: Snug (1.2) for headings, 1.5 (leading-6) for body, 1 (leading-4) for meta and table headers
7. **Letter Spacing**: Headings use `tracking-tight` (-0.015em), body uses natural Inter spacing (0). Global body applies -0.01em for subtle optical refinement.
8. **Color Consistency**: Use slate-900 for headings, slate-800 for body, slate-600 for meta, slate-400 for disabled text
9. **No Manual Overrides**: Do not apply arbitrary `text-*`, `font-*`, or `leading-*` classes to text content; use the predefined system instead.
10. **Design Documentation**: Refer to `docs/TYPOGRAPHY_SYSTEM.md` for detailed specifications, examples, and component patterns.

## Timezone and Date Display (MUST)

1. All date/time/timestamp UI in the app must display using the logged-in user's `profiles.timezone`.
2. Default fallback timezone is `America/New_York` when no user timezone is set.
3. Do not rely on system/browser timezone for user-facing timestamps.
4. Use centralized timezone-aware formatters (`src/lib/format-date.ts`) for rendering date/time values.
5. Apply this rule consistently across tables, badges, detail pages, history timelines, comments, notifications, and any date/time UI.
6. Relative time and timeline/comment timestamps must still resolve from the user's selected timezone context; do not render these from implicit browser-local assumptions.
7. Exception: admin-facing Activity History in Settings may use UTC for cross-user operational consistency; this exception is limited to that admin history surface.
8. **Date-Only Formatting Contract (CRITICAL)**:
   - For date-only fields (YYYY-MM-DD format or ISO timestamps with date components), use `formatDateOnly()` from `src/lib/utils.ts`.
   - `formatDateOnly()` parses the date part directly without timezone conversion to prevent day-shift bugs in behind-UTC timezones (e.g., showing Feb 10 instead of Feb 11).
   - Apply to all date-only display surfaces: Dashboard (scheduled, published dates), Blogs, Tasks, Social Posts, import/export, and all UI tables.
   - Never use `formatDateInTimezone()` or `new Date()` constructor for date-only values; these cause timezone conversion and day-shift errors.
   - Date-only fields stored in DB (e.g., blog publish dates, social post scheduled dates) are imported as `YYYY-MM-DDT00:00:00.000Z` (midnight UTC) and must use `formatDateOnly()` to display as the original date.

## State & Workflow Authority (MUST)

1. Database is the source of truth for all statuses and transitions.
2. Frontend must not allow invalid transitions (enforced via API + DB constraints).
3. Derived states (for example overall stage) are read-only and must not be manually editable.
4. Any new status or transition requires:
   - DB constraint update
   - API validation update
   - UI update (badges, filters, labels, next-action cues)
   - Documentation update

## Blog Transition API Authority (MUST)
1. Workflow-critical blog mutations from dashboard/task surfaces must use `POST /api/blogs/[id]/transition` instead of direct client-side `blogs.update(...)`.
2. Transition API is the permission boundary for writer/publisher status transitions, assignment changes, and scheduled/display publish date edits.
3. The route must enforce assignment/status prerequisites (for example, no publisher completion before writer completion) and return contract-normalized API errors.
4. Dashboard and My Tasks clients must parse responses with `parseApiResponseJson()`, `isApiFailure()`, and `getApiErrorMessage()`.
5. When publisher status first transitions to `completed`, `blogs.actual_published_at` must auto-capture to `now()` if currently unset.

## Runtime Schema Compatibility Retirement (MUST)
1. Do not add new runtime fallback branches for legacy blog date columns in dashboard/task/blog surfaces.
2. Blog comment actors are canonical on `blog_comments.user_id` for app runtime reads/writes.
3. Legacy compatibility is migration-history only; active app routes should target canonical schema paths.

## Permissions Enforcement (MUST)

1. Supabase RLS is the source of truth for authorization.
2. Frontend permission checks are UX-only and never a security boundary.
3. Every feature must define who can view, edit, and perform privileged actions (create/delete/import/publish).
4. No feature ships without RLS coverage.
5. Do not disable RLS on PostgREST-exposed tables in `public`; use explicit policies and service-role API paths for maintenance operations.

## Permission System (MUST)

**Total Permissions**: 92 (76 delegable + 12 admin-locked)

**Roles**:
- **Admin**: All permissions (full access)
- **Writer**: 28 permissions (create/edit blogs, writing workflow, ideas, social posts, collaboration, scheduling, dashboard)
- **Publisher**: 23 permissions (publishing workflow, social posts, scheduling, collaboration, dashboard)
- **Editor**: 17 permissions (blog editing, idea management, collaboration, workflow support, dashboard)

**Permission Structure**:
1. **Permission Keys Function**: Centralized list in `public.permission_keys()` SQL function
2. **Admin-Locked Permissions**: Non-delegable permissions in `public.locked_admin_permission_keys()`
   - Admin-only operations: `manage_users`, `assign_roles`, `manage_permissions`, `repair_workflow_state`, delete/override operations
3. **Default Role Permissions**: Defined in `public.default_role_permissions(p_role)` function
   - New roles automatically get correct defaults from this function
   - Existing customizations preserved during migrations

**Permission Categories**:
- **Blog Management** (15): Create, edit, archive, delete (admin-locked)
- **Writing Workflow** (6): Start, submit, request revision, view queue
- **Publishing Workflow** (6): Start, complete, upload, view queue
- **Assignment** (6): Self-assign, change assignments, bulk reassign
- **Scheduling & Dates** (5): Edit dates (ownership-based for critical fields), calendar operations
- **Calendar** (4): Month/week views, unscheduled blogs, drag-drop
- **Collaboration** (6): Comments, mentions, edit/delete own
- **Ideas** (5) — NEW: Create, view, edit, delete (admin-locked)
- **Social Posts** (8) — NEW: Create, view, edit brief, transition, links, delete (admin-locked), reopen (admin-locked)
- **Dashboard** (8): View dashboard, tasks, metrics, exports
- **Visibility** (3) — NEW: Notifications, activity history, my tasks
- **Admin Tools** (8): User profiles, integrations, imports, logs

**Ownership vs Permissions**:
- Workflow-critical fields (Google Doc link, Live URL, dates) are **ownership-controlled** via RLS, not permission-gated
- Ownership: `blogs.writer_id = auth.uid()` or `blogs.publisher_id = auth.uid()`
- This ensures assigned users can always complete required workflow steps
- Permission toggles are for optional features, not core workflow

**Adding New Permissions**:
1. Add key to `public.permission_keys()` function
2. Add to `public.locked_admin_permission_keys()` if admin-only
3. Update `public.default_role_permissions()` with role access
4. Create RLS policy enforcing permission
5. Add UI check via `hasPermission()` function
6. Document in `docs/PERMISSIONS.md` and AGENTS.md

**Backward Compatibility**:
- New permissions default to `enabled` for intended roles, `disabled` for others
- Existing custom role permissions preserved during migration
- No breaking changes to API contracts or stored data

**Admin-Locked Permissions** (13 total):
- `manage_users` — User account management
- `assign_roles` — Role assignment
- `manage_permissions` — Permission matrix configuration
- `delete_blog` — Hard delete blogs
- `delete_idea` — Delete ideas
- `delete_social_post` — Delete social posts
- `reopen_social_post_brief` — Reopen social post brief for editing
- `repair_workflow_state` — Force workflow state changes
- `manage_environment_settings` — System settings configuration
- `override_writer_status` — Force writer stage transitions
- `override_publisher_status` — Force publisher stage transitions
- `edit_actual_publish_timestamp` — Set actual publish timestamps
- `force_publish` — Override publish checks

**Critical Fixes** (April 1, 2026):
- ✅ Fixed `role_permissions` table population via migration `20260401120000`
- ✅ Removed `delete_user` permission (not in database schema)
- ✅ Added `manage_environment_settings` to locked admin permissions array
- ✅ Added missing permission definitions for ideas, social posts, visibility
- ✅ All 92 permissions now synchronized between TypeScript and database

**Reference**:
- See `docs/PERMISSIONS.md` for complete permission reference
- See `docs/PERMISSION_FIXES_SUMMARY.md` for critical fixes documentation
- See `docs/BLOG_CREATION_FIX.md` for blog creation failure analysis
- See `src/lib/permissions.ts` for frontend helpers
- See `supabase/migrations/20260401110000_add_explicit_permission_coverage.sql` for expanded schema
- See `supabase/migrations/20260401120000_fix_role_permissions_population.sql` for role permissions fix

## Unified Workflow Terminology (MUST)

**UI Label Normalization** — All user-facing workflow labels use neutral, role-agnostic terminology to minimize confusion across writer, publisher, editor, and admin roles.

**Core Terminology**:
- `Writing` replaces "Writer" for content creation workflow references
- `Publishing` replaces "Publisher" for content publishing workflow references
- `Assigned to` replaces role-specific labels (e.g., "Writer", "Publisher") for ownership display
- `Content Workflow` umbrella label for workflow & assignment sections
- `Reviewer` replaces "Editor" or "Admin" when referring to review/approval role in workflow context

**Where This Applies**:
1. **Dashboard & Table Contexts**:
   - Column headers: `Writing Status`, `Publishing Status` (instead of "Writer Status", "Publisher Status")
   - Ownership column: `Assigned to` (unified across all content types)
   - Filter labels: `Writing Filters`, `Publishing Filters` (instead of "Writer Filters", "Publisher Filters")
   - Bulk action dropdowns: "No writing assignment change", "Writing: {name}" (instead of "Writer: {name}")

2. **Error & Validation Messages**:
   - "You do not have permission to change writing assignments" (instead of "writer assignments")
   - "Assign writing team before changing writing status" (instead of "Assign a writer before...")
   - All status/transition error messages use neutral `writing`/`publishing` terminology

3. **Drawer Sections**:
   - Section header: `Content Workflow` (instead of "Workflow & Assignments")
   - Field labels remain neutral: `Writing status`, `Publishing status`, `Assigned to`

4. **Database & API**:
   - **No changes**: Database keys (`writer_id`, `publisher_id`, `writer_status`, `publisher_status`) remain unchanged
   - **No changes**: API contracts remain unchanged
   - **No changes**: All internal logic and permissions still use `writer_*` and `publisher_*` keys
   - This is **UI-only normalization**; backend schema and contracts are unaffected

**Rationale**:
- Simplifies UX by removing role-specific labels that can confuse users
- Many users simultaneously hold writer, editor, and publisher roles
- Neutral terminology (writing/publishing workflows) is more intuitive than role labels
- Database and API continue using internal keys for backward compatibility and clarity

**Maintenance Rules**:
- Do not add new role-specific labels (e.g., "Writer", "Publisher") to UI surfaces
- When updating status/workflow labels, use `Writing` / `Publishing` terminology
- Error messages and user guidance should reference workflows, not roles
- Keep the mapping centralized: if label changes, update in one place and apply globally

## Workflow-Critical Field Ownership (MUST)

**Principle**: Workflow-critical fields (URLs, dates) are controlled by **ownership**, not independent permissions.

1. **Google Doc Link & Live URL**:
   - Writers and publishers can always edit these fields on their assigned blogs
   - Permission checks removed from trigger; ownership (RLS + writer_id/publisher_id) is sufficient
   - These fields are required for workflow transitions, so they must never be blockable by permission toggles

2. **Scheduled Publish Date & Display Publish Date**:
   - Writers and publishers can edit dates on their assigned blogs without separate permission toggles
   - Ownership check: `new.writer_id = auth.uid() or new.publisher_id = auth.uid()`
   - Backward compatible: explicit `edit_scheduled_publish_date` / `edit_display_publish_date` permissions still work if needed
   - Rationale: Dates are workflow-essential; assigned owners must always be able to control them

3. **Task Assignment Visibility**:
   - All authenticated users can READ task_assignments (transparency for collaboration)
   - Only assigned user + admin can UPDATE/DELETE (ownership still protected)
   - Enables dashboard/task views to show full ownership context without information silos

4. **Override Rule**: When a field is workflow-critical, ownership takes precedence over permission toggles.
   - If a user owns a blog (writer_id or publisher_id matches), they can edit workflow-critical fields
   - Permission toggles are for optional features (export, archive, admin overrides), not core workflow

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

## Delete Confirmation Pattern (MUST)

1. All delete confirmations in app UI must use the shared `ConfirmationModal` component from `src/components/confirmation-modal.tsx`.
2. Do not use browser-native `window.confirm()` for delete flows.
3. Do not use alert/toast action buttons as the primary delete confirmation mechanism.
4. Confirmation copy must clearly state permanence (`This action cannot be undone.`).
5. Keep the visual/interaction pattern consistent across ideas, blogs, social posts, dashboard bulk actions, and future entities.

## Destructive SQL Safety (MUST)

1. SQL maintenance routines (for example wipe/reset/cleanup functions) must never use bare `DELETE FROM ...` statements; always include an explicit predicate.
2. For intentional full-table cleanup, use explicit predicates such as `WHERE true` to satisfy safe-delete guards consistently across environments.
3. API routes that depend on maintenance RPCs must handle recoverable SQL safety failures (for example `DELETE requires a WHERE clause`) and provide a safe fallback path with explicit-predicate deletes.
4. Treat SQLSTATE `21000` + `DELETE requires a WHERE clause` as a regression signal that requires immediate forward-migration correction.

## Wipe App Clean Safety Contract (MUST)

1. `DELETE /api/admin/wipe-app-clean` must preserve only the currently signed-in admin account.
2. All other auth users (including other admins) must be deleted as part of wipe completion.
3. Public content and history data must be fully removed (blogs, social posts, ideas, comments, activity, imports, and related operational records).
4. Wipe SQL must use explicit predicates (`WHERE true` or equivalent explicit conditions) and never rely on broad implicit deletes.
5. Wipe results must return a clear summary (tables wiped, preserved admin user) so operators can verify completion.

## Contract-Driven Engineering (MUST)

1. **API Contracts are locked**:
   - Every API route must define and enforce input shape, output shape, and error format.
   - Use shared API contract normalization (`src/lib/api-contract.ts`) so responses are predictable and versioned.
   - Error responses must always include a stable machine-readable `errorCode` and human-readable `error` message.
   - Non-JSON or edge responses (downloads, streams, redirects, 204/205/304 no-body responses) must be explicit pass-through responses and must not be force-wrapped into JSON envelopes.
   - Frontend API parsing must go through `src/lib/api-response.ts`, which must safely handle non-JSON and no-body responses without throwing.
2. **Component Contracts are locked**:
   - Reusable UI primitives behave as APIs and must not have page-specific exceptions.
   - `DataTable` invariants are global: fixed row-height classes by density, single-line truncation for plain-text cells, and pagination compatibility through shared table controls.
3. **Workflow Contracts are locked**:
   - Stage transitions and required fields must be centralized and enforced by API/DB authority.
   - UI may guide transitions but cannot bypass workflow constraints.
   - Social workflow UI mappings in `src/lib/status.ts` (`SOCIAL_POST_STATUS_LABELS`, `SOCIAL_POST_NEXT_ACTION_LABELS`, `SOCIAL_POST_ALLOWED_TRANSITIONS`) must remain sourced from `src/lib/social-post-workflow.ts`; guard regressions with `src/lib/social-post-workflow.contract.test.ts`.
4. **UX Contracts are locked**:
   - Tables, drawers, toasts, and navigation patterns must remain behaviorally consistent across pages.
   - New pages reuse existing interaction contracts instead of introducing variants.
5. **No Bypass Rule**:
   - Do not mutate operational workflow state by bypassing contract boundaries.
   - Preferred path: client action → API contract validation → DB mutation.
6. **Boundary Validation is mandatory**:
   - API request bodies validated at route boundaries.
   - UI props and import payloads validated against explicit schemas/types before mutation.
7. **Contracts must stay visible**:
   - Keep contract rules synchronized across `AGENTS.md`, `SPECIFICATION.md`, and source-level types/interfaces.

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
3. User-facing manual coverage:
   - `HOW_TO_USE_APP.md` and `/resources` must include role-based quick links for Writer, Publisher, Editor/Reviewer, and Admin navigation paths.
   - Anchor text should be explicit enough that users can jump to the right section without searching.
4. Definition of done: implementation is incomplete until docs reflect reality.

## OAuth Provider Connection Flow (MUST)

1. **Connection initiation**: Users connect Google/Slack from Settings, not from login page
2. **Direct OAuth flow**: Settings renders `Connect` button (not anchor link); clicking initiates `signInWithOAuth()` directly without redirect to login
3. **Post-OAuth redirect**: After provider auth completes, user is returned to `/settings?reconnect=provider` (not `/login?reconnect=...`)
4. **Status persistence**: Connected status (google_connected, slack_connected) is stored in `user_integrations` and fetched on Settings mount
5. **Independence principle**: Logging in with a provider does not auto-mark it as "connected" in Settings. Users explicitly control connection status.
6. **Error handling**: OAuth errors are caught and displayed as user-friendly alerts in Settings without page navigation
7. **Loading states**: Connect/Disconnect buttons show loading text ("Connecting...", "Disconnecting...") during API operations
8. **No breaking changes**: This is a UX fix only; no API contracts or data shapes were modified

## Auth User Provisioning Trigger Safety (MUST)

1. Any trigger attached to `auth.users` that writes to `public` schema tables must use fully-qualified table references (for example `public.user_integrations`).
2. Sync/side-effect trigger functions on `auth.users` must be `SECURITY DEFINER` and exception-safe (log warning, return `NEW`).
3. Optional sync failures (for example integrations/preferences bootstrap rows) must never abort auth user creation.
4. Regression signal: errors such as `relation "user_integrations" does not exist` during `auth.admin.createUser` indicate trigger qualification drift and require immediate migration fix.

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
1. Use fast-by-default validation: run affected-scope checks first (changed files/modules/routes), and avoid full-suite checks unless explicitly requested by the user or required by risk.
2. Enforce a strict validation time budget of **3 minutes maximum** per task iteration; if checks exceed or are likely to exceed this budget, stop and ask the user whether to continue with broader/full checks.
3. Escalate validation depth by risk:
   - **Low Risk**: no mandatory automated checks unless user requests.
   - **Medium Risk**: run targeted checks for touched surfaces.
   - **High Risk**: ask user approval, then run broader checks relevant to the changed risk surface.
4. Use failure-fast ordering when validations are run: cheapest/high-signal checks first, heavier checks last.
5. Always report exactly what was run, what was skipped, and why; never imply checks passed if they were not executed.
6. Verify affected UX surfaces for consistency with existing global patterns and invariants in this file.
7. Confirm documentation updates from the rule above are applied when applicable.
8. Prefer small, reversible changes over broad rewrites unless the task explicitly requires larger refactoring.
9. Apply risk-based validation from **Change Risk Classification** where applicable.
10. **After API changes that reference profile columns or data shapes**: Run database migrations (`supabase db push --yes`) to ensure schema alignment and prevent runtime errors like "column profiles.X does not exist".
5. **After API changes that reference profile columns or data shapes**: Run database migrations (`supabase db push --yes`) to ensure schema alignment and prevent runtime errors like "column profiles.X does not exist".

## Post-Task Validation Confirmation (MUST)

After completing any task, the agent must explicitly ask the user whether to run validation commands (for example lint, typecheck, tests, or build) before running them.

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

## Admin Password Reset (TEST-ONLY) (MUST)

**Important**: This feature is temporary and for testing purposes only. It must be removed before production deployment.

- **Location**: Settings page → Edit User modal → "Reset Password (Test Only)" section
- **Permission**: Requires `manage_users` permission (admin-only)
- **Behavior**: Admins can manually set passwords for any user (admin or non-admin)
- **UI**: Password reset button in edit user modal opens confirmation dialog with password input
- **API**: `PATCH /api/admin/users/[userId]/password` validates password (min 8 chars) and uses Supabase admin auth to update
- **Security**: Protected by standard permission checks; intended for testing only
- **Removal**: Delete before go-live; flag for removal in code review

## UI Table Layout Invariants (MUST)

To prevent pagination breakage, pagination control misalignment, and unpredictable row height growth:

1. **Fixed Row Heights**: Keep all table rows at stable/fixed visual height per density mode (compact/comfortable). Long content must NOT expand rows.
2. **Single-Line Truncation**: Truncate long text in table cells (titles, names, descriptions) to a single line with ellipsis (`truncate`). Always include full value via `title` attribute for tooltip on hover.
3. **Overflow Constraints**: Apply `overflow-hidden` + explicit `max-width`/`width` constraints to cells containing long content to enforce hard layout limits.
4. **Pagination Boundary**: Keep pagination controls (row limit, page controls) structurally outside the table body. Controls must never render between table rows or appear to be pushed by row expansion.

These rules apply to all table implementations (DataTable, DashboardTable, etc.) across the application.
## Global Table Consistency Contract (MUST)

1. Primary operational table surfaces must share one consistent table UX contract:
   - `/dashboard`
   - `/tasks`
   - `/blogs`
   - `/social-posts` (list view)
2. These surfaces must use shared table controls from `src/components/table-controls.tsx` for:
   - visible results summary (`TableResultsSummary`)
   - rows-per-page selector (`TableRowLimitSelect`)
   - pagination controls (`TablePaginationControls`)
3. Control-strip layout contract:
   - top strip: summary (left) + action controls (right)
   - action order: `Copy` → `Customize` → `Import` → `Export` (when each action is present)
   - bottom strip: rows-per-page selector + pagination controls
4. Default behavior contract:
   - default row density: `compact`
   - default row limit: `10`
   - row-limit options: `10`, `20`, `50`, `all`
5. Workflow row colorization is enabled globally on operational tables:
   - published/completed rows use emerald tones
   - awaiting live-link and similar waiting states use amber tones
   - ready-to-publish/approval-ready states use sky tones
   - review/pending-review states use violet tones
   - changes-requested/needs-revision states use rose tones
   - in-progress writing/execution states use blue tones
   - unknown/neutral states use slate tones
   - active/selected rows keep the same status tone with stronger shade variants
6. Explicit exceptions: Settings and Activity History tables are excluded from this contract and may keep specialized admin-oriented layouts.

## Table Interaction Rules (MUST)

1. Row click behavior should be consistent per table type (open detail panel or navigate).
2. Bulk actions apply only to selected rows.
3. Sorting and filtering persist within session.

## Search Behavior (MUST)

1. Search supports partial, case-insensitive matching.
2. Results should update in near real-time with debounced input where appropriate.
3. Show meaningful empty-state feedback when no results are found.
4. Dashboard and Social Posts list filtering must use short client-side debounce before expensive row filtering (current standard: `180ms`).

## Filter Pills and Bulk Panel Pattern (MUST)

1. Use a single canonical filter-pill surface per page (no duplicate chip bars for the same filter state).
2. Filter pills must support one-click removal for each active filter and preserve stable ordering for scanability.
3. Bulk panel must appear when row selection exists, with a clear selection count and `Clear Selection` control.
4. Mutation actions inside bulk panel remain permission-gated, but unauthorized states must be visible with disabled controls and helper text (never silently hidden).
5. Bulk panel control order should remain consistent: assignment/status inputs first, primary apply action next, destructive action last.
## Dashboard Unified Content Row Contract (MUST)

1. Dashboard list must use a unified row contract across blogs and social posts with core fields:
   - `content_type`, `site`, `id`, `title`, `status_display`, `lifecycle_bucket`, `scheduled_date`, `published_date`, `owner_display`, `updated_at`
2. Non-core fields (for example social `product`) must be optional/customizable columns, not required core columns.
3. Row click behavior is content-aware:
   - blog rows open blog detail drawer
   - social rows navigate to `/social-posts/[id]`
4. Dashboard supports mixed row selection (blogs + social), but mutation controls must remain safely gated.
5. Blog mutation actions may run only when the current selection is blog-only; they must disable for mixed or social-only selections.
6. Export and copy flows must use the unified visible-column model while preserving blog-only URL copy semantics.
7. Dashboard filters follow a Lens-first compact contract:
   - Default filter row includes `Lens`, `Content Type`, `Status`, `Assigned to`, and `Site`.
   - Filter option labels include contextual counts based on the current active filter context.
   - `More filters` reveals advanced filters (`Delivery`, blog stage/assignment/status filters, social status/product filters).
   - Users can optionally save `Lens shortcuts` for one-click lens reapplication.
   - Advanced visibility is scope-aware:
     - blog advanced controls show only when selected content scope includes blog.
     - social advanced controls show only when selected content scope includes social.
   - Blog advanced filters apply only to blog rows (social rows pass through).
   - Social advanced filters apply only to social rows (blog rows pass through).
8. Dashboard and My Tasks must share one mixed-content classification helper (`src/lib/content-classification.ts`) for labels and filter matching semantics.
9. Mixed-content filter values are canonical:
   - `blog`
   - `social_post` (umbrella value that matches all social subtypes)
   - `social_image`, `social_carousel`, `social_video`, `social_link` (subtype slices)
10. Content display labels on mixed tables are derived from shared classification helpers and may include subtype context (`Social Post · Image|Carousel|Video|Link`).
11. Site filters on mixed-content tables must expose only canonical site options:
   - `Sighthound (SH)` → `sighthound.com`
   - `Redactor (RED)` → `redactor.com`
   - social rows without an associated blog site resolve to canonical `Sighthound (SH)` fallback for deterministic filtering.

## Workspace Home Snapshot Contract (MUST)

1. `GET /api/dashboard/tasks-snapshot` must return full grouped results for associated active tasks (no top-N truncation).
2. `requiredByMe` contains all associated blog/social tasks where the logged-in user is currently responsible for action.
3. `waitingOnOthers` contains all associated blog/social tasks where another user currently owns the next action.
4. Grouping logic must remain aligned with the same action-state ownership model used by `/tasks`.
5. Blog items must be deduplicated to one snapshot row per blog even when the logged-in user has multiple associations (for example writer + publisher + reviewer assignment).
6. If multiple blog associations exist, selection precedence must favor `action_required` over `waiting_on_others`.
7. Blog publishing action-state ownership is stage-specific:
   - `publisher_review` admin assignments are actionable only at `publisher_status = pending_review`.
   - `publisher_status = publisher_approved` is actionable for the assigned publisher and must classify as `waiting_on_others` for admin review assignments.

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
- **Global Duration Cap (MUST)**: No toast, regardless of type, can display longer than 5 seconds. All alerts auto-dismiss within 5000ms max, even if status updates are forgotten or network latency delays completion. This prevents orphaned "Updating.." toasts from cluttering the sidebar indefinitely.

### Notifications (`useNotifications`)
- **Purpose**: Persistent workflow state changes (assignments, submissions, publications, status transitions)
- **Placement**: Bell icon (top-right) with unread count badge
- **Lifecycle**: Persistent until explicitly marked as read or cleared
- **Visible in bell drawer** with titles, messages, timestamps, and links to context
- **Types**: `task_assigned`, `stage_changed`, `awaiting_action`, `mention`, `submitted_for_review`, `published`, `assignment_changed`
- **Icons**: lucide-react via `AppIcon` (no emoji)
- **Trigger**: Workflow mutations (blog status changes, task assignments, submissions, publications)
- **Provider**: `NotificationsProvider` in root layout

### Slack Notification Display Contract (MUST)
- Applies to all Slack-enabled workflow and comment notifications.
- Workflow/assignment event display lines must follow:
  1. `[Blog|Social] <Title> (<Site>)`
  2. `Action: <action text>`
  3. `Assigned to: <resolved user name(s) | Team>`
  4. `Assigned by: <resolved actor name | Team>`
  5. `Open link: <app-url>` when deep-linkable content exists
- Comment-created event display lines must follow:
  1. `[Blog|Social] <Title> (<Site>)`
  2. `Action: New comment`
  3. `By: <resolved actor name | Team>`
  4. `Comment:` followed by full multi-line comment text
  5. `Open link: <app-url>` when deep-linkable content exists
- Role labels (`Writer`, `Editor`, `Publisher`, etc.) are not valid assignee/actor display values and must be normalized to resolved names or `Team`.
- If multiple assignees exist, join with comma + space.
- `Open link` must be resilient and must not depend on payload `appUrl`; deep-link base URL resolves in order: `NEXT_PUBLIC_APP_URL` → `APP_URL` → `https://sighthound-content-ops.vercel.app`.
- Slack posts must keep links clickable while suppressing previews by setting `unfurl_links: false` and `unfurl_media: false` in both bot-token (`chat.postMessage`) and webhook delivery payloads.
- Full comment text in Slack must preserve line breaks, cap length defensively, and neutralize Slack ping tokens (`@here`, `@channel`, `@everyone`, and mention tokens) to prevent accidental mass mentions.

### Notification Preferences Enforcement (MUST)

**Automatic enforcement at emission point** ensures all notifications respect user preferences without requiring code changes throughout the codebase.

#### Architecture
- **Single Source of Truth**: `shouldSendNotification()` in `src/lib/notification-helpers.ts` enforces preferences
- **Enforcement Point**: `pushNotification()` in `src/providers/notifications-provider.tsx` checks preferences before emitting
- **Automatic Coverage**: All existing and future notification calls are automatically filtered
- **Session-Level Caching**: Preferences cached per request via `getUserNotificationPreferencesWithCache()` to avoid N+1 DB queries
- **Slack Integration**: `notifySlack()` respects preferences and treats Slack as optional delivery channel (failures don't propagate to in-app notifications)

#### User Preferences
- **Global Toggle**: `notifications_enabled` (master switch to disable all notifications)
- **7 Notification Types**: Individual toggles for each notification category
- **UI Location**: Settings → Notification Preferences
- **Database**: `notification_preferences` table with RLS policies
- **Auto-Provisioning**: New users get default preferences via trigger

#### Database Schema
- Table: `notification_preferences` in public schema
- Columns: `user_id` (FK to auth.users), `notifications_enabled`, 7 type toggles, timestamps
- Compatibility: if DB stores legacy `notify_on_*` toggle columns, API/cache must normalize to canonical keys (`task_assigned`, `stage_changed`, `awaiting_action`, `mention`, `submitted_for_review`, `published`, `assignment_changed`)
- RLS: Users see/edit only own preferences; admins can audit all
- Trigger: Auto-creates preferences for new auth users

#### API Endpoints
- `GET /api/users/notification-preferences` — Fetch current user's preferences
- `PATCH /api/users/notification-preferences` — Update preferences and invalidate cache

#### Implementation Details
- **Preference Check**: Called synchronously in `pushNotification()` before notification added to queue
- **Failure Handling**: Preferences failures are logged but don't block notifications (fail-open)
- **Backward Compatibility**: Defaults to all-enabled if preferences don't exist
- **Cache Invalidation**: Called on PATCH to ensure subsequent emissions use fresh data
- **Runtime performance guardrail**: Notification emission should reuse cached user identity (`userIdCache`) and only call `supabase.auth.getSession()` when cache is empty.

### Implementation
- **No emoji icons**: All feedback uses `AppIcon` from `src/lib/icons.tsx`
- **Direct provider usage**: App routes/hooks must import `useAlerts()` and `useNotifications()` directly; deprecated system-feedback compatibility wrappers are removed
- **Helper functions**: `src/lib/notification-helpers.ts` generates typed notification payloads
- **Blog workflows**: Status changes in `/blogs/[id]/page.tsx` emit notifications via `pushNotification()`

### Adding New Notifications
1. Define helper in `src/lib/notification-helpers.ts` returning `NotificationInput`
2. Call `pushNotification(helper(...))` in mutation handler
3. Update SPECIFICATION.md and this guide with trigger point documentation

### Notification Types & Trigger Points

**Existing Types**:
- `task_assigned` — User is assigned a new blog (writer or publisher role)
- `task_assigned` also covers create notifications where a newly created blog/social post is immediately assigned
- `stage_changed` — Blog writer/publisher status transitions (e.g., In Progress → Pending Review)
- `awaiting_action` — Blog needs revision or is awaiting review
- `mention` — User is mentioned in a comment

**New Activity Types** (user-centric actions):
- `submitted_for_review` — Writer/Publisher submits a blog for review (transitions to `pending_review`)
  - **Example**: "Blog A submitted by Writer B" (triggered on writer status → pending_review)
  - **Example**: "Blog C submitted by Publisher D" (triggered on publisher status → pending_review)
- `published` — Blog is published live (publisher status transitions to `completed`)
  - **Example**: "Blog E published by Publisher F"
- `assignment_changed` — Blog writer/publisher assignment changes (via details form)
  - **Example**: "Blog G reassigned to Writer H as Writer by Admin I"
  - **Example**: "Blog J reassigned to Publisher K as Publisher by Admin L"

**Trigger Sources**:
- **Blog Detail Page** (`/blogs/[id]/page.tsx`):
  - `handleDetailsSave()`: Emits `assignment_changed` for writer/publisher assignment changes
  - `handleWriterSave()`: Emits `stage_changed` + `submitted_for_review` on writer status changes (especially pending_review)
  - `handlePublisherSave()`: Emits `stage_changed` + `submitted_for_review` on publisher pending_review, + `published` on completion

### Activity History Feed

In addition to real-time notifications, the bell drawer displays a unified activity feed from multiple content types. This provides users with a complete audit trail across all major content:

- **Source**: `/api/activity-feed` endpoint fetches the 50 most recent activities from:
  - `blog_assignment_history` table (blog activities)
  - `social_post_activity_history` table (social post activities)
- **Displayed in**: Bell drawer under "Recent Activity" section, separate from real-time notifications
- **Content types**: Blogs and Social Posts (with icons to distinguish them)
- **Data includes**: Status transitions, assignment changes, field updates with old/new values
- **Format**: Event type (e.g., "writer_status_changed"), content title, actor name, and relative timestamp
- **Click behavior**: Clicking a blog activity navigates to `/blogs/[id]`; clicking a social post activity navigates to `/social-posts/[id]`
- **Load trigger**: Activity feed is fetched when the notification panel opens
- **Display limit**: Shows up to 10 most recent activities merged from all sources; full history available via "View History" link
- **Sorting**: Activities are merged and sorted by timestamp (most recent first) across all content types
- **Inbox sync performance contract**: Bell activity fan-out to in-app notifications must process the top 10 entries concurrently (`Promise.allSettled`) so one failed emit cannot block the rest.

## Activity History Filtering (Multi-Select) (MUST)

**Admin-only feature** for reviewing unified activity records across the application.

### Location
- UI: `/settings/access-logs` (page title: "Activity History")
- API: `GET /api/admin/activity-history`

### Activity Types Supported
- `login` — User sign-in events
- `dashboard_visit` — Dashboard page visits
- `blog_writer_status_changed` — Blog writer workflow transitions
- `blog_publisher_status_changed` — Blog publisher workflow transitions
- `blog_assignment_changed` — Blog writer/publisher assignment changes
- `social_post_status_changed` — Social post workflow transitions
- `social_post_assignment_changed` — Social post assignment changes

### Multi-Select Filtering
- **Activity Type Filter**: Checkboxes for selecting multiple activity types (independent toggle per type)
- **User Filter**: Checkboxes for selecting multiple users (independent toggle per user)
- **Default Selection**: All activity types selected on page load (users: none selected)
- **Behavior**: Filters apply as union (OR) within each category and intersection (AND) across categories

### Table Display
- **Columns**: Category (login/dashboard/blog/social), Action (event description), Content (title or "—" for access logs), User, Email, Timestamp
- **Content links**: Blog activities link to blog detail page; social post activities link to social post page
- **Access log content**: Shows "—" (em-dash) instead of content title
- **Timestamps**: Formatted per user's timezone setting (admins default to UTC for consistency)

### Activity Message Language (MUST)
- Activity titles and change summaries must be operator-friendly and avoid raw technical keys.
- Never expose raw field keys or enum values in user-facing history rows (for example, avoid `publisher_status`, `pending_review`, `publisher_approved` in UI copy).
- Never expose raw UUIDs in user-facing change summaries; resolve to names when available and otherwise use neutral wording (for example, "Team member" or "Reassigned").
- Keep wording consistent across all activity surfaces: detail timelines, dashboard drawers, notification feed, and Activity History page.

### API Response Structure
Endpoint returns:
- `activities`: Array of unified activity records
- `total`: Total count for pagination
- `activityTypeLabels`: Map of activity type → human-readable label
- `activityTypeCategories`: Map of activity type → category (Login/Dashboard/Blog Activity/Social Post Activity)

### Implementation Details
- **Query params**: `?activity_types=type1,type2&user_ids=user1,user2&limit=100&offset=0`
- **Data sources**: Merges `access_logs`, `blog_assignment_history`, `social_post_activity_history` tables
- **Sort order**: Most recent activities first (timestamp descending)
- **RLS enforcement**: Admin role required; non-admins cannot access this endpoint

## User Preferences (MUST)

**Settings**: Per-user columns in `profiles`
- `timezone` (default: `America/New_York`) — all date/time display
- `week_start` (default: 1 = Monday) — calendar views
- `stale_draft_days` (default: 10) — dashboard draft flagging

**Editable by**: All users (self) + admins (for any user)
**API endpoint**: `PATCH /api/users/profile` with `timezone`, `weekStart`, `staleDraftDays`
**UI**: Settings → My Profile
**Scope**: Per-user, not global

## Social Post Dedicated Editor Workflow (MUST)
The dedicated editor at `/social-posts/[id]` follows a guided 4-step flow:
1. **Setup** — Post Title, Platform(s), Publish Date, Canva Link/Page, Product, Type.
2. **Associated Blog (optional)** — Associated Blog search + linked blog actions.
3. **Write Caption** — UTF-8 editor focus with formatting tools and grouped copy actions.
4. **Review & Publish** — Checklist validation, role-aware transition controls, live-link URL entry, and stage-based final CTA labels.

Dedicated editor section order contract:
- `Setup`
- `Assignment`
- `Associated Blog`
- `Write Caption`
- `Review & Publish`
- `Comments`
- `Current Snapshot`
- `Checklist`
- `Assignment & Changes`
- Do not label this final section as `Activity` on social post surfaces.

P0 UX invariants for the dedicated editor:
- Primary stage progression uses the sidebar final CTA; raw status controls are secondary under an advanced disclosure.
- The sidebar includes a transition preflight summary that lists missing required fields and supports jump-to-field actions.
- Setup keeps required-now fields prominent while optional brief fields remain de-emphasized in an optional disclosure.
- Live-link workflow supports quick paste with platform auto-detection while retaining platform-specific link inputs.
- Current snapshot includes explicit handoff context (`Assigned to`, `Reviewer`, `Current owner`, `Next owner`) and latest rollback reason when available.
- A top `Next Action` strip surfaces primary CTA, owner handoff context, preflight readiness count, and saved/unsaved state.
- A `Jump to` mini navigator links to all major editor sections to reduce scroll/search friction.

P1 UX invariants for social workflow ergonomics:
- `Changes Requested` transitions must use a structured template (category + checklist + optional context) rather than free-text-only reasons.
- Social post create flow should preload remembered defaults for `product`, `type`, and `platforms`, and expose quick preset buttons for common combos.
- Primary stage-changing CTA actions in the dedicated editor must present a compact confirmation summary (`status change`, `next owner`, `locking behavior`) before transition submission.

P2 UX invariants for social workflow continuity:
- List-to-editor continuity must pass a status-derived focus target when opening `Work in Full View` from `/social-posts`, and `/social-posts/[id]` must auto-focus the matching editor section (`setup`, `review-publish`, `live-links`) once on load.
- Keyboard-first helpers in `/social-posts/[id]` must include:
  - `Alt+Shift+J` → jump to the next missing transition-required field
  - `Alt+Shift+Enter` → run the primary sidebar action
- Shortcut handlers must respect existing ownership, validation, and disabled-state guards (shortcuts cannot bypass transition rules).
- Shortcut discoverability uses a clickable `Shortcut` label in the editor sidebar that opens the shared shortcuts modal.

Workflow authority invariants:
- Status transitions are API-authoritative and must use `POST /api/social-posts/[postId]/transition`.
- Allowed backward transitions are locked to:
  - `ready_to_publish` → `changes_requested`
  - `awaiting_live_link` → `changes_requested`
- Execution-stage rollback requires a non-empty reason.
- `published` requires at least one valid link in `social_post_links`.
- Execution stages (`ready_to_publish`, `awaiting_live_link`) are brief-locked (no in-place brief editing).
- Admin-only brief editing path uses `POST /api/social-posts/[postId]/reopen-brief`, which reopens to `creative_approved` and logs activity.

Reminder + notification invariants:
- Awaiting-live-link reminder sweeps use `POST /api/social-posts/reminders`.
- Reminder dedupe is enforced with `social_posts.last_live_link_reminder_at` using a 24-hour cooldown.
- Social and blog workflow/comment create/transition/reminder Slack events must emit through `emitWorkflowSlackEvent()` in `src/lib/server-slack-emitter.ts`.
- Create/comment/transition/reminder routes must not invoke `slack-notify` directly; use the centralized helper instead.
- Covered centralized create/comment/transition/reminder routes include:
  - `POST /api/blogs`
  - `POST /api/blogs/[id]/comments`
  - `POST /api/social-posts`
  - `POST /api/social-posts/[id]/comments`
  - `POST /api/blogs/[id]/transition`
  - `POST /api/social-posts/[id]/transition`
  - `POST /api/social-posts/reminders`
  - `POST /api/social-posts/overdue-checks`
  - `POST /api/blogs/overdue-checks`

## Shortcut Display Invariants (MUST)

Keyboard shortcut information must live in exactly one place: the shared shortcuts modal. Main pages and detail editors must not advertise keybindings inline.

1. Do NOT render key-combo text on pages or sidebars (for example `Shortcut: ⌥⇧J`, `Primary action: ⌥⇧↵`, or `Press Q to open, ESC to close`).
2. The only discoverability affordance allowed on a page is a clickable text labeled `Shortcut` (or `Shortcuts`) that opens the shared shortcuts modal.
3. The shortcuts modal is the single source of truth for all global, create, and page-aware shortcut keys, grouped per page scope (`pageShortcuts` in `src/components/app-shell.tsx`).
4. Dropdown/command menu items (for example Quick Create rows `New Blog`, `New Idea`, `New Social Post`) may display a per-item `KbdShortcut` badge next to the action. This is an item affordance, not on-page prose, and remains allowed.
5. Keydown handlers (for example `Alt+Shift+J`, `Alt+Shift+Enter` on `/blogs/[id]` and `/social-posts/[id]`) stay functional; only the on-page text description is removed.
6. `aria-keyshortcuts` attributes on primary action buttons are kept for accessibility (screen reader / assistive technology), since they do not render visible text.
7. Do not reintroduce explanatory sentences like `Use Up/Down to move and Enter to select` in Quick Create or similar panels. Arrow-key behavior is expected and the single `Shortcut` link is sufficient for discoverability.
8. Naming: the clickable discoverability affordance uses the singular word `Shortcut` (title-case). Inside the modal, keep the heading `Shortcuts`.

## UI Label Standards (MUST)

**Avoid labeling user roles in section headers** unless explicitly necessary for admin-only features:

1. **Do NOT use**: "Required (Editor)", "Optional / Editor & Admin", "Schedule (Admin)"
2. **Use instead**: "Required", "Optional", "Schedule"
3. **Exception**: Only explicitly mention user roles when it clarifies permission boundaries for admin-only sections (e.g., "Admin Only" for sensitive operations)
4. **Rationale**: User roles are implicit from context and capability; explicit role labels clutter the UI and reduce clarity
5. **Apply globally** across all form sections, drawer panels, and preview panes (Social Posts, Blogs, Tasks, etc.)

**Section label examples:**
- "Basic Information" → Primary content fields
- "Required" → Must-fill fields
- "Optional" → Nice-to-have fields
- "Schedule" → Publishing/workflow dates
- "Advanced Settings" → Power-user options
- "Admin Only" → Restricted to admins (exception case)

## Sidebar Pattern (MUST)

**Global collapsible sidebar** with two stable states: expanded (240px, icons + labels) and collapsed (72px, icons only).

See `docs/SIDEBAR_PATTERN.md` for complete specification including:
- Global state persistence via localStorage (`sidebar:collapsed`)
- Layout behavior (content margin adjustment, no overlays)
- Icon consistency and recognition requirements
- Tooltip requirements for collapsed state (non-negotiable)
- Active state styling, transition timing (200ms ease-in-out)
- Grouping behavior and spacing rules
- Accessibility requirements (aria-label, keyboard nav)
- Performance considerations and naming conventions
- Testing & validation checklist

**Key requirements**:
1. Sidebar state is **global and persistent** across sessions
2. Collapsed state requires **tooltips on hover** (usability critical)
3. All icons must be recognizable **without text labels**
4. Content must **shift, not overlay** when sidebar toggles
5. Use chevron toggle (ChevronLeft/ChevronRight) in sidebar header
6. No emoji icons—use lucide-react via `AppIcon`
7. Fixed icon size (20px), consistent stroke weight, outline style
8. Test on initial load (no flicker) and across page navigations
9. Sidebar root stays viewport-anchored (`sticky top-0 h-screen flex flex-col`) for always-visible navigation
10. Sidebar scrolling is isolated to the middle nav section (`flex-1 overflow-y-auto`); header/toggle remains visible and must never scroll out of view
11. Sidebar nav scroll position resets intentionally to top on route changes to avoid random/restored scroll jumps across pages
12. When `prefers-reduced-motion` is enabled, sidebar toggle/nav transitions are disabled (`motion-reduce:transition-none`) while layout updates remain immediate and stable

**Risk**: Medium (UI-only, affects layout and navigation consistency)

**Owner**: Design + Frontend (audit existing sidebar implementation and enforce this spec globally)

## Layout Invariants (MUST)

1. No horizontal overflow in action/control bars.
   - Use `flex-wrap`, `min-w-0`, `max-w-full`.
2. Exactly one scroll container per table region.
   - Never nest overflow containers around tables.
3. Layout-critical state must initialize before first paint.
   - No post-mount corrections for layout state.
4. Viewport breakpoints must not degrade usable content width.
   - Sidebar presence must be accounted for.
   - Prefer later breakpoints over cramped layouts.
5. Z-index hierarchy must remain consistent.
   - `Tooltip < Drawer < Modal < Toast`.
   - Do not override locally without system-level change.

## Calendar Rendering and Scroll Stability (MUST)

1. Month view must avoid nested per-day scroll regions to prevent wheel-capture jitter and flicker.
2. Month tiles render a compact event list (up to 3 visible cards) with a `+N more` affordance for overflow.
3. Clicking `+N more` transitions to week view focused on that date so hidden month items remain quickly accessible.
4. Dense calendar cards must prefer lightweight hover behavior (native `title` metadata) over heavy inline hover popovers.
5. Calendar visual polish should prioritize subtle depth (borders/shadows/gradients) without introducing motion-heavy effects (for example, backdrop blur in dense grids).
6. `/calendar` and `/social-posts` calendar mode must share the same structural shell primitives (`src/components/calendar-shell.tsx`) for weekday headers and day-grid framing.
7. `/social-posts` calendar mode must follow the same compact-month overflow contract as `/calendar` (max 3 visible cards per tile, `+N more` to focused week view).
8. Calendar weekday ordering and “today” highlighting must use user preference inputs (`profiles.week_start`, `profiles.timezone`) with `America/New_York` fallback.
9. `/social-posts` calendar mode must maintain keyboard parity with `/calendar` (`Arrow` keys or `J/K` day movement, `Enter` open first item, `Escape` close panel).

## Social Post Ownership & Transition Enforcement (MUST)

**Authority Layer**: Ownership replaces role-based permissions. The database field `assigned_to_user_id` is the single source of truth for who can act on a post at each stage.

**Schema**:
- `social_posts.created_by` (immutable, creator identity)
- `social_posts.editor_id` (nullable, assigned editor for review stages)
- `social_posts.assigned_to_user_id` (non-null for non-published, owner of current action)

**Transition Authority**:
- Single endpoint: `POST /api/social-posts/[id]/transition`
- Enforces ownership check: 403 if `assigned_to_user_id !== currentUserId`
- Enforces transition matrix: 400 if not in `TRANSITION_GRAPH[currentStatus]`
- Validates required fields: 400 if missing for next status
- Requires reason for rollbacks: 400 if reason missing on backward transitions
- Atomic update: status + assignment + activity log in single transaction
- Concurrency protection: `WHERE status = currentStatus` prevents race conditions

**Ownership Derivation** (deterministic per `getNextAssignment()`):
- `draft` → creator
- `in_review` → editor_id
- `changes_requested` → creator
- `creative_approved` → editor_id
- `ready_to_publish` → creator
- `awaiting_live_link` → creator
- `published` → null (terminal)

**Field Locking During Execution**:
- Execution stages (`ready_to_publish`, `awaiting_live_link`) lock brief fields: `title`, `platforms`, `product`, `type`, `canva_url`, `canva_page`
- Only `POST /api/social-posts/[id]/reopen-brief` (admin-only) can unlock by reopening to `creative_approved`
- Transition endpoint rejects ANY locked field in payload

**Live Link Gate**:
- `published` status requires at least one valid row in `social_post_links`
- Validation checks DB state (not request payload)
- Returns 400 if no links exist

**Activity Logging**:
- Non-blocking fire-and-forget insert to `social_post_activity_history`
- Logs: `activity_type`, `old_status`, `new_status`, `reason`, `user_id`, `created_at`
- Failures do not block transition response

**UI Implications**:
- Show assigned owner and next action in list/card views
- Only display primary CTA for assigned user
- Show "waiting" state for non-assigned users
- No role-based UI branching (ownership is the control)
- Use `useSocialPostTransition` hook for safe client-side checks

**Testing**:
- Test cases in `tests/api/social-posts-transition.test.ts`
- Critical: ownership enforcement (403), transition validation (400), field locking, concurrency (409), required fields, live links
- Full workflow cycle: creator draft → editor review → creator publish

## Social Post Field Requirements (MUST)

**⚠️ Reference**: See `docs/SOCIAL_POST_WORKFLOW_SIMPLIFIED.md` for the complete model and examples.

**Core principle**: Fields become mandatory **only at transitions**, not during stages.

### Field Ownership
- **Worker**: Product, Type, Canva URL, Live Links
- **Admin**: Platforms, Caption, Scheduled Date
- **Optional**: Title, Associated Blog, Canva Page (either can edit anytime)

### Required Fields at Transitions
1. `draft` → `in_review`: Product, Type, Canva URL
2. `in_review` → `creative_approved`: + Platforms, Caption, Scheduled Date
3. `creative_approved` → `ready_to_publish`: Product, Type, Canva URL, Platforms, Caption, Scheduled Date
4. `awaiting_live_link` → `published`: + ≥1 Live Link

### Enforcement
- API: `REQUIRED_FIELDS_FOR_STATUS` in `src/lib/social-post-workflow.ts`
- DB: RLS trigger `enforce_social_post_workflow_transition`
- UI: Checklist shows fields required for **next transition** only
- Guardrails: non-admin writers can edit brief fields in `draft` and `changes_requested`; admins can edit brief fields in any stage
- Awaiting live link: non-admin users can only submit live links in `awaiting_live_link`

**Rationale**: Worker isn't blocked by Admin fields early. Admin can review at their own pace. Each transition has one clear responsibility.

## Record-Level Visibility (MUST)

1. For Blogs and Social Posts, assignment, comments, and record-level activity history must be visible to all authenticated users in both detail drawers and full record pages.
2. This visibility is read-only for non-privileged actions and must not be gated behind `admin` or `manage_users`.
3. Record-level activity history must use canonical columns (`changed_by`, `event_type`, `field_name`, `old_value`, `new_value`, `changed_at`) to keep formatting and UI rendering stable across surfaces.
4. Global/system activity pages under Settings remain admin-only and are separate from record-level history visibility.
5. In any page or detail drawer that includes record-level comments/links/assignment history, keep ordering predictable:
   - `Comments` must render above link and assignment/change sections.
   - `Links`, when shown as a standalone section, should render below comments.
   - Social post assignment/status history sections must be labeled `Assignment & Changes` (not `Activity`).
   - Assignment/change history remains the final section.
6. Detail pages (`/blogs/[id]`, `/social-posts/[id]`) must expose a top actionability strip:
   - `Next Action` summary + primary CTA
   - explicit saved/unsaved indicator
   - compact preflight readiness signal
   - section jump navigator (`Jump to`) for major blocks
7. Blog detail keyboard parity:
   - `Alt+Shift+J` jumps to next missing preflight field
   - `Alt+Shift+Enter` triggers the primary next action when available
8. Detail-page responsive right-rail behavior:
   - `lg`+ viewports render side-by-side content with a sticky right rail for next-action/preflight context.
   - Below `lg`, right-rail cards render inline in main content flow (non-sticky) to avoid cramped side columns.

## Link Target Behavior (MUST)

1. Internal app links (for example `/blogs/[id]`, `/tasks`, `/settings`) must open in the same tab.
2. External links (for example `https://...`) must open in a new tab with safe rel attributes.
3. Shared link primitives must enforce this rule consistently; avoid per-page target exceptions.

## Link Quick Actions (MUST)

1. Useful workflow URLs must expose both `Open` and `Copy` actions in-place (for example Google Doc URL, Live URL, and saved social live links).
2. Use the shared `LinkQuickActions` component in `src/components/link-quick-actions.tsx` instead of page-level ad-hoc buttons/links.
3. Copy actions must provide immediate feedback through the global alerts system.
4. Disabled/empty URL states must remain visible (do not hide actions when a link is missing).
5. Open behavior must continue to follow Link Target Behavior rules (internal same-tab, external new-tab).

## Blog Import Fallback Contract (MUST)

When blog import rows are missing selected values, apply deterministic fallbacks before validation/upsert:

1. Missing `liveUrl`:
   - `SH`/`sighthound`/`sighthound.com` → `https://www.sighthound.com/blog/`
   - `RED`/`redactor`/`redactor.com` → `https://www.redactor.com/blog/`
2. Missing `draftDocLink` (only when `draftDocLink` column is selected) → `https://docs.google.com/`
3. Missing `actualPublishDate` (only when `actualPublishDate` column is selected) → copy `displayPublishDate`
4. Fallbacks must run in both client preview preprocessing and server import API to keep behavior consistent and authoritative.

## Ask AI Workflow Assistant Contract (MUST)

1. `POST /api/ai/assistant` must support an optional natural-language `prompt` input.
2. Ask AI remains advisory-only:
   - no data mutation
   - no workflow transition side effects
   - no content generation
3. Deterministic context extraction, blocker detection, and required-field gate logic remain authoritative.
4. Prompt interpretation must always have a deterministic local path so guidance works without external AI dependencies.
5. Gemini integration is optional enrichment:
   - enabled when `GEMINI_API_KEY` is configured
   - failures/timeouts must degrade safely to deterministic output
6. Prompt-aware responses must include:
   - `questionIntent`
   - `answer`
   - `responseSource` (`deterministic` or `gemini`)
   - optional `aiModel` when Gemini is used
