# Governance Enforcement: Quick Wins Summary

**TL;DR**: Turn AGENTS.md rules into automated contracts via pre-commit hooks and linting. Four rules, phased rollout, 8–12 hours total effort for maximum impact.

---

## The Problem

AGENTS.md defines critical governance rules (error handling, RLS coverage, documentation updates), but they're guidelines—not enforced. This leads to:
- Silent authorization failures (missing RLS)
- Stale documentation causing operational confusion
- Error-only toast messages that fade away
- Inconsistent commit messages

---

## The Solution: Four Quick-Win Rules

| Rule | Mechanism | Effort | Impact | Phase |
|------|-----------|--------|--------|-------|
| **Conventional Commits** | commitlint (pre-commit) | 30 min | High (clarity, changelog automation) | 1 |
| **RLS Coverage** | Shell script scan (pre-commit) | 2-3 hrs | Critical (security) | 2 |
| **Docs Sync** | Node.js script (pre-commit) | 2-3 hrs | High (prevents stale docs) | 3 |
| **Error Handling** | ESLint rule | 3-5 hrs | Medium (UX) | 4 (optional) |

---

## Rule Details

### 1. Conventional Commits (Phase 1)
**What**: Enforce commit message format (`feat(scope): description`)  
**Why**: Clear intent, automated changelog, semantic versioning  
**Tool**: @commitlint/cli + husky  
**Blocker**: Yes (commit fails if format is wrong)  
**Reversible**: Yes (remove `.husky/commit-msg`)

```bash
✓ feat(ui): add error validation
✓ fix(api): prevent duplicate logs
✗ oops (no type/scope)
```

---

### 2. RLS Coverage Scanning (Phase 2)
**What**: Ensure all user-scoped tables have RLS policies  
**Why**: Prevents silent authorization bypass  
**Tool**: Custom Node.js script scanning migrations  
**Blocker**: No (warning initially, blocker after audit)  
**Reversible**: Yes (remove from pre-commit)

```bash
✓ blogs: 4 policies
✓ profiles: 3 policies
✗ app_settings: 0 policies
  (intentional for global settings)
```

---

### 3. Documentation Sync Check (Phase 3)
**What**: Code changes must have corresponding doc updates  
**Why**: From AGENTS.md: "implementation is incomplete until docs reflect reality"  
**Tool**: Custom Node.js script with file→doc mappings  
**Blocker**: No (warning-only initially)  
**Reversible**: Yes (skip script)

```bash
✓ src/app/api/new-endpoint.ts → OPERATIONS.md (updated)
✗ supabase/migrations/new_table.sql → SPECIFICATION.md (NOT updated)
```

---

### 4. ESLint Rule for Error Handling (Phase 4 - Optional)
**What**: Toast errors must not be the only error UI  
**Why**: From AGENTS.md: "No action should feel uncertain or silent"  
**Tool**: Custom ESLint rule  
**Blocker**: Optional (can be warning-only)  
**Reversible**: Yes (disable rule)

```javascript
✗ setError(msg); showError(msg); // No form state
✓ setFieldError(f, msg); setError(msg); showError(msg);
```

---

## Implementation Roadmap

### Week 1 (Phase 1)
1. Install commitlint + config (30 min)
2. Test with team (20 min)
3. Total: **~50 min**

### Week 2 (Phase 2)
1. Build RLS scanner script (1.5 hrs)
2. Audit schema, document results (1 hr)
3. Add to pre-commit (30 min)
4. Total: **~3 hrs**

### Week 3 (Phase 3)
1. Build docs-sync script (1.5 hrs)
2. Configure mappings (1 hr)
3. Test and validate (30 min)
4. Total: **~3 hrs**

### Week 4+ (Phase 4 - Optional)
1. ESLint rule implementation (3-5 hrs)
2. Fix violations or tune rule (1-2 hrs)
3. Total: **~4-7 hrs**

**Total effort**: 7–13 hours (excluding ongoing discipline cost)

---

## Benefits & ROI

### Immediate (Week 1)
✅ Commit messages become self-documenting  
✅ Automated changelog generation possible  
✅ Team clarity on intent

### Short-term (Week 2-3)
✅ Authorization bugs caught before merge  
✅ Stale docs no longer block operations  
✅ Reduced onboarding confusion

### Long-term (Weeks 4+)
✅ CI/CD integration points  
✅ Runbook accuracy improves  
✅ Code review friction decreases  
✅ Governance becomes "contracts, not comments"

---

## Current State

**Today**:
- ESLint: ✅ active (next/core-web-vitals, next/typescript)
- Husky: ✅ active (lint-staged on pre-commit)
- Commitlint: ❌ not configured
- RLS scanner: ❌ not built
- Docs sync: ❌ not built
- Error rule: ❌ not built

**After Phase 1-3**:
- ESLint: ✅ + custom rule (optional)
- Husky: ✅ + commit-msg + RLS check + docs check
- Commitlint: ✅ configured & enforced
- RLS scanner: ✅ runs pre-commit
- Docs sync: ✅ runs pre-commit
- Error rule: ⏳ optional

---

## Files to Create/Modify

### Phase 1
- `commitlint.config.js` (new)
- `.husky/commit-msg` (new)
- `package.json` (add @commitlint/cli/config)

### Phase 2
- `scripts/check-rls-coverage.mjs` (new)
- `docs/RLS_COVERAGE.md` (new)
- `.husky/pre-commit` (update)
- `package.json` (add check:rls script)

### Phase 3
- `scripts/check-docs-sync.mjs` (new)
- `docs-sync.config.js` (new)
- `package.json` (add check:docs-sync script)

### Phase 4 (optional)
- `eslint-rules/no-toast-only-errors.js` (new)
- `eslint.config.mjs` (update with custom rule)

---

## Success Criteria

### Phase 1
- Bad commits rejected (e.g., "oops" fails)
- Good commits accepted (e.g., "feat(ui): ..." passes)

### Phase 2
- Script lists all tables and their RLS status
- Output matches known schema inventory

### Phase 3
- Script detects missing doc updates for code changes
- Can skip with `--skip-check` flag for trivial changes

### Phase 4
- ESLint rule finds at least one existing violation
- Team agrees rule is useful (not too noisy)

---

## Rollback Plan

All phases are independently reversible:
- **Phase 1**: Delete `.husky/commit-msg`
- **Phase 2**: Remove `npm run check:rls` from `.husky/pre-commit`
- **Phase 3**: Delete `scripts/check-docs-sync.mjs`
- **Phase 4**: Disable custom ESLint rule in config

No data migration or undo complexity—purely tooling.

---

## Next Steps

1. **Read** `GOVERNANCE_ENFORCEMENT.md` for full details
2. **Read** `GOVERNANCE_QUICK_START.md` for step-by-step implementation
3. **Start** with Phase 1 (commitlint) this week
4. **Plan** Phase 2-3 for next 2-3 weeks
5. **Evaluate** Phase 4 based on team feedback

---

## Questions?

- **Phase questions**: See `GOVERNANCE_ENFORCEMENT.md` section matching the phase
- **Implementation questions**: See `GOVERNANCE_QUICK_START.md` with templates
- **Maintenance**: See `GOVERNANCE_ENFORCEMENT.md` section 7

---

**Prepared**: March 20, 2026  
**Status**: Ready to implement  
**Prerequisite**: None (no blocking dependencies)
