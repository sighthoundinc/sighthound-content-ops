# GitHub Standards

Legend (from RFC2119): !=MUST, ~=SHOULD, ≉=SHOULD NOT, ⊗=MUST NOT, ?=MAY.

**⚠️ See also**: [main.md](../main.md) | [project.md](../core/project.md) | [git.md](../scm/git.md)

**Stack**: gh CLI 2.0+, GitHub Actions, Conventional Commits, issue/PR workflows

## Standards

**PRs**: ! use descriptive titles (Conventional Commits format); ~ link issues; ~ request reviews
**Issues**: ~ include clear reproduction steps, expected vs actual behavior, environment details
**Reviews**: ~ provide constructive feedback; ! use appropriate status (approve/request changes/comment)
**Actions**: ~ provide fast feedback, fail fast, cache dependencies, use matrix testing
**Releases**: ~ use [Semantic Versioning](../core/versioning.md); ! include CHANGELOG.md following [Keep a Changelog](./changelog.md) format
**Changelog**: ! follow [Keep a Changelog](./changelog.md) format in CHANGELOG.md

## PR Workflow

**Standards**:
- ! Use Conventional Commits format for PR titles
- ~ Keep PRs small (< 400 lines changed ideal)
- ! Ensure all CI checks pass before requesting review
- ~ Link to related issues using `Closes #123`
- ! Request specific reviewers
- ~ Explain "why" not just "what" in description

### PR Template (.github/pull_request_template.md)

```markdown
## Description

Brief summary of the changes and their purpose.

## Type of Change

- [ ] feat: New feature
- [ ] fix: Bug fix
- [ ] docs: Documentation update
- [ ] refactor: Code refactoring
- [ ] test: Adding or updating tests
- [ ] chore: Maintenance or tooling

## Changes

- List specific changes
- Be concise but complete

## Testing

- [ ] Unit tests added/updated
- [ ] Integration tests pass
- [ ] Coverage ≥75%
- [ ] Manual testing completed

## Checklist

- [ ] Code follows project style guidelines (MUST)
- [ ] Self-reviewed code and comments (SHOULD)
- [ ] Updated documentation (SHOULD)
- [ ] No breaking changes (or documented) (MUST)
- [ ] `task check` passes (MUST)

## Related Issues

Closes #issue_number
```

### Review Guidelines

**Approval criteria (MUST be met)**:

- Code follows language standards (python.md, go.md, cpp.md)
- Tests pass with ≥75% coverage
- Conventional Commits format
- No security vulnerabilities
- Documentation updated
- No breaking changes (or properly documented)

**Review tone (SHOULD follow)**:

- Be constructive and specific
- Explain "why" not just "what"
- Suggest alternatives when requesting changes
- Praise good solutions
- Focus on correctness, maintainability, performance (in that order)

## Issue Workflow

**Best practices**:
- ~ Search for duplicates before creating
- ! Include reproduction steps, expected/actual behavior, environment details
- ~ Apply appropriate labels and assign when taking ownership
- ~ Link related issues and PRs

### Issue Template (.github/ISSUE_TEMPLATE/bug_report.md)

```markdown
---
name: Bug Report
about: Report a bug or unexpected behavior
labels: bug
---

## Description

Clear and concise description of the bug.

## Steps to Reproduce

1. Step one
2. Step two
3. Observe error

## Expected Behavior

What should happen.

## Actual Behavior

What actually happens.

## Environment

- OS: [e.g., macOS 14.0, Ubuntu 22.04]
- Version: [e.g., v1.2.3]
- Language/Runtime: [e.g., Go 1.21, Python 3.11]

## Logs/Screenshots

Paste relevant logs or attach screenshots.

## Additional Context

Any other relevant information.
```

### Issue Labels

**Priority**:

- `priority:critical` - Production down, security issue
- `priority:high` - Major functionality broken
- `priority:medium` - Important but not blocking
- `priority:low` - Nice to have

**Type**:

- `bug` - Something broken
- `feat` - New feature request
- `docs` - Documentation improvement
- `refactor` - Code improvement
- `test` - Testing related
- `chore` - Maintenance

**Status**:

- `status:blocked` - Waiting on dependency
- `status:in-progress` - Being worked on
- `status:needs-info` - Needs more information
- `status:wontfix` - Will not be addressed

### Post-1.0.0 Issue Linking

Following a v1.0.0 release, commits:

- ! link to existing or new issues for: Features, bugs, breaking changes, architecture decisions
- ≉ create issues for: Typos, formatting, dependency bumps, refactoring same code
- ~ create issues for: Anything someone might search for later, or that needs discussion

**Format**: Reference issues in commit messages using `Closes #123`, `Fixes #456`, or `Relates to #789`

## GitHub Actions Best Practices

**CI Workflows**:
- ~ Provide fast feedback (fail fast, cache dependencies)
- ~ Use matrix testing for multiple versions
- ! Run `task check` for quality gates
- ~ Upload coverage reports

**Security**:
- ! Use GitHub Secrets for CI/CD credentials
- ⊗ Commit secrets to repo
- ~ Keep secrets in `secrets/` dir locally (gitignored)
- ~ Rotate secrets regularly

## Branch Protection

**Recommended settings** for `main`:
- ! Require PR reviews (1+ approvals)
- ! Require status checks to pass
- ! Require branches to be up to date
- ~ Require conversation resolution
- ~ Require linear history
- ⊗ Allow force pushes
- ⊗ Allow deletions

## UCCPR Workflow

**UCCPR** = Update Changelog, Commit, Push, Release

Standard workflow for releasing new versions:

```bash
# 1. Update Changelog
# Add new version section to CHANGELOG.md with date and changes
vim CHANGELOG.md

# 2. Update version in code
# Update VERSION constant/variable in main script/package file
vim run  # or package.json, setup.py, etc.

# 3. Commit changes
git add CHANGELOG.md run  # and any other version files
git commit -m "chore: release v0.3.8"

# 4. Push changes
git push origin master

# 5. Create and push tag
git tag v0.3.8
git push origin v0.3.8

# 6. Create GitHub release
gh release create v0.3.8 --title "Deft v0.3.8" --notes-file CHANGELOG.md

# Or extract just this version from CHANGELOG:
gh release create v0.3.8 --title "Deft v0.3.8" --notes "$(sed -n '/## \[0.3.8\]/,/## \[0.3.7\]/p' CHANGELOG.md | head -n -1)"
```

**One-liner UCCPR** (after updating CHANGELOG.md and version):
```bash
git add CHANGELOG.md run && \
git commit -m "chore: release v0.3.8" && \
git push && \
git tag v0.3.8 && \
git push origin v0.3.8 && \
gh release create v0.3.8 --title "Deft v0.3.8" --notes-file CHANGELOG.md
```

## Compliance

- ! Use Conventional Commits for all PR titles
- ! Maintain CHANGELOG.md following [Keep a Changelog](./changelog.md) format
- ! Use [Semantic Versioning](../core/versioning.md) for releases
- ! Include CHANGELOG.md content in release notes
- ! Maintain ≥85% test coverage
- ! Pass all CI checks before merge
- ~ Request reviews from appropriate team members
- ~ Link PRs to related issues
- ~ Use gh CLI for automation where possible
- ⊗ Force-push to protected branches
- ! Keep PR scope focused and size reasonable
- ! Update documentation with code changes
