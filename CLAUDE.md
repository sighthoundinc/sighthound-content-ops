# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Next.js dev server
npm run dev:full     # Next.js + TypeScript watch mode (parallel)
npm run build        # Production build
npm run check        # Lint + typecheck in parallel (run before committing)
npm run lint         # ESLint only
npm run typecheck    # tsc --noEmit only
```

There are no automated tests. `npm run check` is the validation gate.

## Stack

- **Next.js 15** (App Router), **TypeScript 5**, **React 18**
- **Tailwind CSS v4** via `@tailwindcss/postcss` — no `tailwind.config.ts` file
- **Supabase** (Postgres + Auth + RLS + Storage)
- **Vercel** deployment

## Architecture

### Auth & Permissions

- `src/middleware.ts` — checks for `sb-*` cookies; redirects to `/login` if missing
- `src/providers/auth-provider.tsx` — `useAuth()` hook; provides `user`, `profile`, `hasPermission()`, `session`
- `src/lib/server-permissions.ts` — `requirePermission(request, key)` used on every API route; returns `{ context }` or `{ error, status }`
- `src/lib/permissions.ts` — 50+ granular permission keys; role templates
- Permissions are DB-stored per role with overrides; resolved at login and cached in auth context

### API Routes

All API routes wrap with `withApiContract()` from `src/lib/api-contract.ts`. Pattern:

```ts
export const GET = withApiContract(async function GET(request: NextRequest) {
  const auth = await requirePermission(request, "some_permission");
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { profile, adminClient } = auth.context;
  // ...
});
```

`adminClient` is a Supabase service-role client that bypasses RLS. Use it on server only.

### Data Model

Key tables: `profiles`, `blogs`, `social_posts`, `blog_ideas`, `role_permissions`, `task_assignments`, `app_settings`

**Blogs** have a two-stage pipeline:
- `writer_status`: `not_started → in_progress → pending_review → needs_revision → completed`
- `publisher_status`: `not_started → in_progress → pending_review → publisher_approved → completed`
- `overall_status`: computed from both stages

**Social posts** have a single linear status: `draft → in_review → changes_requested → creative_approved → ready_to_publish → awaiting_live_link → published`

Ownership fields on social posts: `worker_user_id`, `reviewer_user_id`, `created_by`, `assigned_to_user_id` (derived), `editor_user_id` (legacy), `admin_owner_id` (legacy)

### Task Logic — Single Source of Truth

`src/lib/task-logic.ts` is the canonical definition for what counts as "active work":

- `ACTIVE_SOCIAL_STATUSES` — all non-terminal social post statuses
- `ACTIVE_WRITER_STATUSES` / `ACTIVE_PUBLISHER_STATUSES` — all non-terminal blog stage statuses
- `initialSocialPostCounts()` / `initialWriterCounts()` / `initialPublisherCounts()` — used to init dashboard summary count objects
- `isSocialTaskForUser()` / `isBlogTaskForUser()` — ownership checks

All DB queries filtering social post statuses must use `.in("status", ACTIVE_SOCIAL_STATUSES)` — never hardcode the list inline.

`src/lib/task-action-state.ts` — `getSocialTaskActionState()` classifies a social post as `action_required` vs `waiting_on_others` based on status stage and which ownership field matches the user.

### UI Patterns

- `src/components/data-table.tsx` — universal table used on all list pages
- `src/components/app-shell.tsx` — main layout with sidebar nav
- `src/components/data-page.tsx` — page-level layout primitives (`DataPageHeader`, `DataPageToolbar`, etc.)
- `ProtectedPage` component wraps pages requiring permissions
- `PermissionGate` component for conditional rendering based on permissions

### Dashboard / Home

`src/app/page.tsx` (home `/`) fetches from two API endpoints:
- `/api/dashboard/summary` — per-status counts scoped to current user; drives "work buckets"
- `/api/dashboard/tasks-snapshot` — top 8 tasks split into `requiredByMe` / `waitingOnOthers`

Work bucket IDs follow the pattern `{type}-{status-with-dashes}` (e.g. `social-ready-to-publish`, `writer-needs-revision`). Click handlers use `setDashboardFilterIntent()` to pass filter state to `/tasks` via session storage.

### Schema Evolution Pattern

API routes that query social posts have a 3-level fallback for columns that may not exist in all environments:
1. Full query with all ownership columns
2. Fallback without `worker_user_id`/`reviewer_user_id`/`assigned_to_user_id`
3. Final fallback with `created_by` only

Check `isMissingSocialOwnershipColumnError()` in any social API route for the pattern.

### Path Alias

`@/` maps to `src/`. All imports use this alias.
