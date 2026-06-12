# Governance Enforcement — Quick Start Implementation Guide

Start here. This is the fast path to turning governance rules into enforced contracts.

## Priority order (do first → last)

### ⚡ Priority 1: Conventional Commits (Highest ROI, 30 min)

**Why first**: Lowest friction, immediate clarity on intent, foundation for automation.

**Tasks**:
1. `npm install --save-dev @commitlint/cli @commitlint/config-conventional`
2. Create `commitlint.config.js` (copy from GOVERNANCE_ENFORCEMENT.md section 3)
3. Add `.husky/commit-msg` hook:
   ```bash
   mkdir -p .husky
   echo 'npx --no -- commitlint --edit "$1"' > .husky/commit-msg
   chmod +x .husky/commit-msg
   ```
4. Test:
   ```bash
   git commit --allow-empty -m "bad commit"
   # Should fail ❌
   
   git commit --allow-empty -m "feat(ui): add new component"
   # Should pass ✓
   ```

**Files changed**: `package.json`, `commitlint.config.js`, `.husky/commit-msg`

**Cost**: ~30 min setup + ~1 min discipline per commit

---

### 🔒 Priority 2: RLS Coverage Scanning (Security, 2-3 hours)

**Why second**: Prevents authorization gaps. Non-blocking (runs as check, not blocker initially).

**Tasks**:
1. Create `scripts/check-rls-coverage.mjs` using template below
2. Create `docs/RLS_COVERAGE.md` with table inventory (from GOVERNANCE_ENFORCEMENT.md)
3. Test:
   ```bash
   node scripts/check-rls-coverage.mjs --check
   ```
4. *(Optional)* Add to `.husky/pre-commit`:
   ```bash
   npm run check:rls || true
   # Run as warning for now, not blocker
   ```
5. Add npm scripts to `package.json`:
   ```json
   "check:rls": "node scripts/check-rls-coverage.mjs --check"
   ```

**Files changed**: `scripts/check-rls-coverage.mjs`, `docs/RLS_COVERAGE.md`, `package.json`, `.husky/pre-commit` (optional)

**Cost**: ~2-3 hours (mostly understanding migration structure)

---

### 📝 Priority 3: Documentation Sync Check (Optional, 2-3 hours)

**Why third**: Keeps docs current. Start as warning-only, escalate to blocker later.

**Tasks**:
1. Create `scripts/check-docs-sync.mjs`
2. Create `docs-sync.config.js` with file→doc mappings
3. Add npm script:
   ```json
   "check:docs-sync": "node scripts/check-docs-sync.mjs --check"
   ```
4. Test on a recent change:
   ```bash
   npm run check:docs-sync
   ```
5. *(Optional)* Integrate into CI (currently not in repo)

**Files changed**: `scripts/check-docs-sync.mjs`, `docs-sync.config.js`, `package.json`

**Cost**: ~2-3 hours

---

### 🎯 Priority 4: ESLint Rule for Error Handling (Optional, 3-5 hours)

**Why last**: Good to have, but lower impact than commit/RLS/docs checks. Skip if team is busy.

**Tasks**:
1. Create `eslint-rules/no-toast-only-errors.js`
2. Register in `eslint.config.mjs`
3. Run against codebase:
   ```bash
   npm run lint
   ```
4. Fix or document violations

**Skip for now**: This requires careful rule tuning to avoid false positives. Wait for feedback on other rules first.

---

## Implementation checklist

### Week 1
- [ ] Install and configure commitlint (Priority 1)
- [ ] Test with team: commit messages fail as expected
- [ ] Document in team Slack/Discord: "All commits must use conventional commits format"

### Week 2
- [ ] Create and test RLS coverage script (Priority 2)
- [ ] Run against current schema, validate results
- [ ] Add to pre-commit as warning (not blocker)
- [ ] Document RLS table status in `docs/RLS_COVERAGE.md`

### Week 3+ (if bandwidth)
- [ ] Add docs-sync check (Priority 3)
- [ ] Test on recent commits
- [ ] Decide: blocker or warning-only

### Later (optional)
- [ ] ESLint rule for error handling (Priority 4)
- [ ] Integrate into CI/CD pipeline

---

## Quick validation

### After Priority 1 (commitlint)
```bash
# Should fail
git commit --allow-empty -m "oops"

# Should pass
git commit --allow-empty -m "feat(ui): test message"
```

### After Priority 2 (RLS check)
```bash
npm run check:rls
# Should list all tables and their RLS status
```

### After Priority 3 (docs sync)
```bash
npm run check:docs-sync
# Should check recent changes for doc updates
```

---

## Rollback if needed

All changes are reversible:
- Remove `.husky/commit-msg` to disable commitlint
- Comment out `npm run check:rls` in `.husky/pre-commit` to disable RLS checks
- Delete `scripts/check-docs-sync.mjs` to disable docs checks

---

## Next: Read the full spec

See `GOVERNANCE_ENFORCEMENT.md` for:
- Detailed reasoning for each rule
- Full implementation examples
- Integration with CI/CD
- Maintenance guidelines
