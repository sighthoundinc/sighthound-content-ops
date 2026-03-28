# Cleanup Audit — Phase 4 Report

## Executive Summary

Deep codebase audit completed using `depcheck`, `ts-prune`, and manual inspection.
Findings categorized into low-risk (DELETE), medium-risk (REVIEW), and protected (KEEP) buckets.

---

## DELETE (Safe Removals)

### Unused Dependencies (confirmed no usage in codebase)

1. **`cmdk`** (runtime dep)
   - Status: Completely unused across src/
   - Risk: LOW
   - Action: `npm uninstall cmdk`

2. **`@tailwindcss/postcss`** (dev dep)
   - Status: Not required for modern Tailwind setup
   - Risk: LOW
   - Action: `npm uninstall --save-dev @tailwindcss/postcss`

### Unused Exports (Functions not called anywhere)

1. **`canExportCSV()`** in `src/lib/permissions/uiPermissions.ts:149`
   - Defined but never imported/called
   - Risk: LOW
   - Action: Delete export and function body

2. **`canExportSelectedCSV()`** in `src/lib/permissions/uiPermissions.ts:150`
   - Defined but never imported/called
   - Risk: LOW
   - Action: Delete export and function body

---

## REVIEW (Requires Manual Confirmation)

### Legacy Delete Route Patterns (Require Migration to Modern Pattern)

1. **`src/app/api/blogs/[id]/delete/route.ts`**
   - Current pattern: `POST /api/blogs/[id]/delete`
   - Target pattern: `DELETE /api/blogs/[id]`
   - Migration status: Social posts already use modern pattern
   - Risk: MEDIUM (requires route migration, API consumer updates)
   - Action: 
     - Create `src/app/api/blogs/[id]/route.ts` with DELETE handler
     - Copy DELETE logic from `/delete/route.ts`
     - Run full test cycle on blog deletion workflows
     - Update any API consumers calling old route
     - After verification, delete `/delete/route.ts` subdirectory

2. **`src/app/api/ideas/[id]/delete/route.ts`**
   - Current pattern: `POST /api/ideas/[id]/delete`
   - Target pattern: `DELETE /api/ideas/[id]`
   - Risk: MEDIUM (requires route migration, API consumer updates)
   - Action:
     - Create `src/app/api/ideas/[id]/route.ts` with DELETE handler
     - Copy DELETE logic from `/delete/route.ts`
     - Run full test cycle on idea deletion workflows
     - Update any API consumers calling old route
     - After verification, delete `/delete/route.ts` subdirectory

### Possibly Unused Dev Dependencies

3. **`@commitlint/cli` & `@commitlint/config-conventional`**
   - Reported as unused by depcheck
   - Status: Verify if lint rules are active (`commitlint.config.ts` exists?)
   - Risk: LOW (if not used, can remove; if active, keep)
   - Action: Check for `.git/hooks/commit-msg` and `commitlint.config.ts`

4. **`eslint-config-next`**
   - Status: May be superceded by modern eslint flat config
   - Risk: LOW
   - Action: Verify `eslint.config.mjs` doesn't depend on it before removal

5. **`depcheck` & `ts-prune`**
   - These tools are only needed during cleanup; can be uninstalled post-audit
   - Risk: LOW
   - Action: Safe to uninstall after cleanup is complete

### Missing Dependency Alert

6. **`@eslint/eslintrc`** in `eslint.config.mjs`
   - Reported as missing import by depcheck
   - Risk: LOW (likely false positive or not imported in `eslint.config.mjs` yet)
   - Action: Run eslint and verify it works; if no errors, can ignore

---

## KEEP (Critical Files/Components)

### Protected API Routes
- All auth, permissions, RLS-protected routes in `src/app/api/`
- `src/app/api/social-posts/[id]/route.ts` (modern DELETE pattern)
- `src/app/api/admin/wipe-app-clean/route.ts` (critical safety function)
- `src/app/api/blogs/overdue-checks/route.ts` (scheduled background task)

### Critical Lib Files (Core System)
- `src/lib/api-contract.ts` (API safety boundary)
- `src/lib/server-permissions.ts` (auth boundary)
- `src/lib/roles.ts` (permission model)
- `src/lib/permissions/` (all files)
- `src/lib/notification-helpers.ts` (event routing)
- `src/lib/format-date.ts` (timezone-aware display)
- `src/lib/social-post-workflow.ts` (workflow state machine)
- `src/lib/types.ts` (type contracts)

### Critical Workflow Files
- All migration files in `supabase/migrations/`
- `src/lib/profile-schema.ts` (user profile validation)
- `src/app/actions/` (server actions)

### Active Page Routes
- All `page.tsx` files (entry points, see Phase 5 report above)
- All next-gen middleware/layout files

---

## Action Plan Summary

### Phase A: Delete (Safe Immediate Actions)
1. `npm uninstall cmdk`
2. `npm uninstall --save-dev @tailwindcss/postcss`
3. Delete function bodies for `canExportCSV` and `canExportSelectedCSV` in `src/lib/permissions/uiPermissions.ts`
4. Commit: `cleanup: remove unused cmdk dep and export functions`

### Phase B: Review (Confirmation Required)
1. Verify commit-lint and eslint setup (manual inspection)
2. Confirm legacy delete route usage (grep API consumers)
3. Plan delete route migration: blogs first, then ideas

### Phase C: Migration (If Approved)
1. Create `src/app/api/blogs/[id]/route.ts` with DELETE handler
2. Create `src/app/api/ideas/[id]/route.ts` with DELETE handler
3. Run full test cycle (dev server, blog/idea deletion workflows)
4. Delete legacy `/delete/route.ts` subdirectories
5. Commit: `refactor: migrate delete routes to modern DELETE pattern`

---

## Scan Results Archive
- `reports/depcheck.txt` — Full unused dependency scan
- `reports/ts-prune.txt` — Full unused export scan

---

## Next Steps
1. Review this classification and approve action items
2. Run Phase A deletions (low-risk package/function removal)
3. Verify Phase B findings (commit-lint, eslint, route usage)
4. Plan Phase C migration (if routes need consolidation)
