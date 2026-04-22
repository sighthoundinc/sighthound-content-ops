# Documentation Changelog

Tracks changes to authoritative documentation under `docs/` and repo-root docs. Code changes are tracked in Git history; this log captures doc-level decisions, supersessions, and policy shifts.

Newest entries first.

## 2026-04-22

### Added — `docs/content-style-guide.md` (v2026.04)

- New dual-domain content style guide for `www.sighthound.com` and `www.redactor.com`.
- **Supersedes** the prior Google Doc "Sighthound Content Style Guide" (pre-2026). The Google Doc is deprecated and should be marked as such by whoever owns the Drive; this file is the single source of truth going forward.
- Covers both domains and all product lines: Sighthound Redactor, ALPR+, Vehicle Analytics (MMCG), Compute, and Cloud API / SDK.
- Introduces mechanical rules replacing aspirational guidance: banned-word list, banned structural patterns, mandatory post anatomy (TL;DR + Key Takeaways + Q&A H2s), entity-density SEO, primary-source citation requirements, named-author E-E-A-T requirements, product-specific CTAs, cross-domain linking rules, and a pre-publish checklist.
- Owned by **Content Relay**; operational alerts go to Slack `#content-ops-alerts`.

### Added — `docs/content-relay/exceptions.md`

- Empty exceptions log referenced from the style guide §24.
- All style-guide exceptions must be granted in writing, per post, and logged here.

### Added — `docs/CHANGELOG.md`

- This file. Documentation-level changelog.

### Changed — `AGENTS.md` (repo root)

- Added a "Content authoring authority" block under the existing authoritative-documentation list, pointing to the new style guide, exceptions log, and this changelog.
