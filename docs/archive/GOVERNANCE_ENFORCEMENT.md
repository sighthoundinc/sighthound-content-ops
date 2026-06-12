# Governance Enforcement — Build & Pre-Commit Rules

This document proposes how to turn the AGENTS.md invariants into enforceable contracts via linting, pre-commit hooks, and CI gates. These are quick wins that maximize impact with minimal tooling overhead.

## 1) Error handling enforcement (ESLint rule)

**Rule**: Toast messages must never be the only error feedback UI. Errors must include inline form feedback or explicit contextual messaging in addition to any toast.

### Why
From AGENTS.md: "No action should feel uncertain or silent." Toast-only errors fade away and can be missed, especially in forms with multiple fields.

### Implementation
Custom ESLint rule: `no-toast-only-errors`

**Target patterns** (report violations):
- `showError(msg)` followed by form or unrelated content (no inline `<ErrorMessage>`, `aria-invalid`, or `error` state on inputs)
- `toast.error()` calls without a preceding validation message set in component state
- Error toast in async handler with no error state variable update

**Exceptions**:
- Errors in non-form contexts (e.g. snackbar-only global notification)
- API errors with structured field-level feedback already in response

### File
Create: `eslint-rules/no-toast-only-errors.js`

Example configuration in `eslint.config.mjs`:
```javascript
// Pseudo-code; requires custom rule implementation
rules: {
  'custom/no-toast-only-errors': 'error',
}
```

### Quick reference
- Violation: `setError(msg); showError(msg);` with no form state
- Compliant: `setFieldError(field, msg); setError(msg); showError(msg);`

---

## 2) RLS coverage scanning (Pre-commit + Document)

**Rule**: All tables that store user-scoped data must have RLS policies. Missing RLS is a security boundary violation.

### Why
From AGENTS.md: "Supabase RLS is the source of truth for authorization." Tables without RLS silently allow unauthorized access.

### Implementation
Create a pre-commit hook that:
1. Scans all migration files for `CREATE TABLE` statements
2. Checks for corresponding `CREATE POLICY` statements for that table
3. Reports tables without policies
4. Maintains a **REQUIRED_RLS_TABLES.md** document listing which tables must have RLS

**Script**: `scripts/check-rls-coverage.mjs`

```bash
# Runs as pre-commit hook
node scripts/check-rls-coverage.mjs --check
```

**Output**:
```
✓ blogs: 4 policies
✓ profiles: 3 policies
✗ app_settings: 0 policies (RLS not enabled)
  → If intentional, add to REQUIRED_RLS_TABLES.md exclusions
```

**Integration**:
```json
{
  "scripts": {
    "check:rls": "node scripts/check-rls-coverage.mjs --check",
    "check:rls-fix": "node scripts/check-rls-coverage.mjs --generate"
  }
}
```

Add to `.husky/pre-commit`:
```bash
npx lint-staged
npm run check:rls
```

### RLS tables checklist (current repo)
Based on schema audit:
- `blogs` ✓ (has RLS)
- `profiles` ✓ (has RLS)
- `blog_comments` ✓ (has RLS)
- `social_posts` ✓ (has RLS)
- `social_post_comments` ✓ (has RLS)
- `blog_ideas` ✓ (has RLS)
- `blog_idea_comments` ✓ (has RLS)
- `role_permissions` — audit-only, admin-visible; RLS enforced via trigger
- `app_settings` — global settings, minimal scope; RLS not enabled (intentional)
- `blog_import_logs` — audit trail, admin-visible; RLS enforced via API layer
- `permission_audit_logs` — audit trail, admin-visible; RLS enforced via API layer

**Document**: Create `docs/RLS_COVERAGE.md` listing all tables and their RLS status.

---

## 3) Conventional commits (Pre-commit hook)

**Rule**: Commit messages must follow conventional commits format. This ensures changelog clarity and automated versioning.

### Why
Conventional commits (`feat:`, `fix:`, `refactor:`, etc.) provide:
- Clear commit intent at a glance
- Automated changelog generation
- Semantic versioning signals

### Implementation
Use `commitlint` + `@commitlint/config-conventional`

**Setup**:
```bash
npm install --save-dev @commitlint/cli @commitlint/config-conventional
```

**Create**: `commitlint.config.js`
```javascript
module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      ['feat', 'fix', 'refactor', 'docs', 'test', 'chore', 'style'],
    ],
    'scope-enum': [
      2,
      'always',
      [
        'api', 'ui', 'db', 'permissions', 'admin', 'import',
        'slack', 'migrations', 'types', 'docs', 'ci',
      ],
    ],
    'type-case': [2, 'always', 'lowercase'],
    'subject-case': [2, 'always', 'lower-case'],
    'subject-full-stop': [2, 'never', '.'],
    'subject-empty': [2, 'never'],
    'header-max-length': [2, 'always', 72],
  },
};
```

**Husky hook**: `.husky/commit-msg`
```bash
npx --no -- commitlint --edit "$1"
```

**Examples**:
- ✓ `feat(ui): add inline error validation for import form`
- ✓ `fix(api): prevent duplicate permission audit logs`
- ✓ `docs: update OPERATIONS.md with new RLS policies`
- ✗ `Updated stuff` (no type/scope)
- ✗ `FEAT(UI): Added new feature.` (wrong case, period)

---

## 4) Documentation update requirement (Pre-commit validation)

**Rule**: Code changes must be accompanied by documentation updates when applicable. A PR check verifies that changed files have corresponding doc updates.

### Why
From AGENTS.md Definition of Done: "implementation is incomplete until docs reflect reality." Stale docs cause confusion and operational failures.

### Implementation
**Script**: `scripts/check-docs-sync.mjs`

Detects file changes and requires corresponding doc updates:

```javascript
// Pseudo-logic
const codeChanges = getChangedFiles(['src/**/*.ts', 'supabase/migrations/*.sql']);
const docChanges = getChangedFiles(['*.md']);

const requiresDocUpdate = {
  'src/app/api/**': ['SPECIFICATION.md', 'OPERATIONS.md'],
  'src/lib/permissions.ts': ['AGENTS.md', 'SPECIFICATION.md'],
  'supabase/migrations/*.sql': ['SPECIFICATION.md', 'OPERATIONS.md'],
  'src/lib/server-permissions.ts': ['AGENTS.md'],
  '.husky/**': ['README.md'],
};

// Report missing updates
```

**Trigger**: Pre-commit or CI check

```bash
npm run check:docs-sync
```

**Configuration**: `docs-sync.config.js`
```javascript
module.exports = {
  mappings: [
    {
      filePattern: 'src/app/api/**/*.ts',
      requiredDocs: ['SPECIFICATION.md', 'OPERATIONS.md'],
      trigger: 'new API route',
    },
    {
      filePattern: 'src/lib/permissions.ts',
      requiredDocs: ['AGENTS.md'],
      trigger: 'permission logic change',
    },
    {
      filePattern: 'supabase/migrations/*.sql',
      requiredDocs: ['SPECIFICATION.md'],
      trigger: 'schema/RLS change',
    },
  ],
};
```

**Output**:
```
✓ src/app/api/admin/new-endpoint.ts → OPERATIONS.md (updated)
✗ supabase/migrations/20260321_new_table.sql → SPECIFICATION.md (NOT updated)
  → Please update SPECIFICATION.md before committing
```

**Exception handling**:
- Allow `--skip-docs-check` flag for trivial changes (comments, cleanup)
- Require justification comment in commit message: `docs: skip (minor cleanup)`

---

## 5) Quick wins summary & rollout plan

### Phase 1: Setup (1 day)
1. Install commitlint and configure conventional commits
2. Add `.husky/commit-msg` hook
3. Test locally with a few commits

**Files to create**:
- `commitlint.config.js`
- `.husky/commit-msg`

**Testing**: `npm run prepare` then try a bad commit message.

### Phase 2: RLS scanning (2-3 days)
1. Create `scripts/check-rls-coverage.mjs`
2. Document current RLS state in `docs/RLS_COVERAGE.md`
3. Add hook to `.husky/pre-commit`

**Files to create**:
- `scripts/check-rls-coverage.mjs`
- `docs/RLS_COVERAGE.md`
- Update `.husky/pre-commit`

**Testing**: Run on current codebase, verify output matches known table list.

### Phase 3: ESLint rule (3-5 days, optional)
1. Implement `eslint-rules/no-toast-only-errors.js`
2. Register in `eslint.config.mjs`
3. Run against codebase to find violations
4. Fix violations or update rule if too strict

**Files to create**:
- `eslint-rules/no-toast-only-errors.js`
- Update `eslint.config.mjs`

**Testing**: Find and fix a few violations in the codebase.

### Phase 4: Docs sync check (3-5 days, optional)
1. Create `scripts/check-docs-sync.mjs`
2. Configure mappings in `docs-sync.config.js`
3. Test against recent commits
4. Integrate into CI or pre-commit (optional; can be warning-only)

**Files to create**:
- `scripts/check-docs-sync.mjs`
- `docs-sync.config.js`
- Optional: `.husky/pre-commit` addition

**Testing**: Modify a file and verify docs check reports missing updates.

---

## 6) Integration with existing workflows

### npm scripts
Add to `package.json`:
```json
{
  "scripts": {
    "check": "run-p lint typecheck check:rls check:docs-sync",
    "check:rls": "node scripts/check-rls-coverage.mjs --check",
    "check:rls-fix": "node scripts/check-rls-coverage.mjs --generate",
    "check:docs-sync": "node scripts/check-docs-sync.mjs --check"
  }
}
```

### CI/CD (if applicable)
All checks run pre-commit; can also be run in CI before merge:
```yaml
# Example GitHub Actions (not currently in repo)
- run: npm run check:rls
- run: npm run check:docs-sync
```

### Bypass mechanisms
For exceptional cases, allow documented bypasses:
- **RLS**: `node scripts/check-rls-coverage.mjs --skip app_settings` (with reason in commit)
- **Docs**: `npm run check:docs-sync -- --skip-check` (must include `[skip-docs]` in commit message)
- **Commits**: `git commit --no-verify` (discouraged; logs warning)

---

## 7) Maintenance & evolution

### Monitoring
Track violations over time:
```bash
npm run check:rls > logs/rls-report-$(date +%Y-%m-%d).txt
npm run check:docs-sync >> logs/docs-sync-report-$(date +%Y-%m-%d).txt
```

### Updating rules
- Review commitlint rules quarterly (align with evolving scopes/types)
- Update RLS table list if schema changes (automatically flagged by script)
- Refine ESLint rule based on false positives/negatives
- Add new doc mappings as new features are added

### Documentation
- Keep `docs/RLS_COVERAGE.md` updated (auto-generated by script)
- Link this file from `README.md` and `AGENTS.md`
- Include bypass justifications in commit history for audit trail

---

## Key benefits

| Rule | Benefit | Cost |
|------|---------|------|
| Conventional commits | Automated changelogs, clear intent | ~1 min per commit (discipline) |
| RLS coverage check | Catches authorization gaps early | ~10-20 min setup, <1 min per commit |
| Docs sync | Prevents stale docs, aids onboarding | ~5-10 min per code change |
| Toast error rule | Catches silent failures, improves UX | ~30-60 min implementation, auto-checked |

---

## Next steps

1. **Review & approve** this proposal with the team
2. **Prioritize**: Start with commitlint (highest ROI, lowest effort)
3. **Implement Phase 1** (conventional commits) immediately
4. **Follow with Phase 2** (RLS scanning) within 1 week
5. **Evaluate** ESLint rule and docs sync based on team feedback

All rules can coexist and evolve independently. No blocking dependencies between phases.
