# Documentation Changelog

Tracks changes to authoritative documentation under `docs/` and repo-root docs. Code changes are tracked in Git history; this log captures doc-level decisions, supersessions, and policy shifts.

Newest entries first.

## 2026-10-01

### Added — `docs/blog-writing-instructions.md`

- Added a practical public-blog playbook for Sighthound and Redactor writers, including domain selection, editorial workflow, post structure, SEO, citations, resource links, and a pre-publish checklist.
- Documented precedence between the canonical style guide, current marketing positioning, product reality, and dated internal ledgers; flagged known claim conflicts and the style guide’s word-count inconsistency.
- Dated mutable product and roadmap guidance to the October 1, 2026 snapshot and require re-verification before publication.

### Changed — `AGENTS.md` (repo root)

- Indexed the blog-writing playbook under content authoring authority and clarified that it supplements the canonical style guide.

### Updated — `docs/blog-writing-instructions.md`

- Added a scoped Sighthound/Retriever overlay from the supplied October 2026 instructions while retaining the dual-domain style-guide authority and identifying internal source versions that still require verification.
- Tightened Retriever/ALPR+ naming, metrics, demo/API, roadmap, escalation, customer-story, competitor/partner, responsible-use, CTA, citation, and visual-asset guardrails; removed the unapproved case-study link and ALPR figures.
- Added concise guardrails for the queued Sighthound ALPR topics and expanded the pre-publish checklist.

## 2026-06-12

### Changed — Repository restructure (docs/archive convention)

- Moved 43 historical root reports (sprints, phases, governance, audits, fix logs, AI-assistant history, design history) into flat `docs/archive/` with an index `docs/archive/README.md`. Three space-named files renamed to kebab-case (`ai-assistant-mvp-spec.md`, `ai-assistant-premium-ux-upgrade.md`, `phase-0-deterministic-workflow-intelligence.md`).
- Moved 10 historical completion docs from `docs/` into `docs/archive/`.
- Moved root `audits/` audit kit to `docs/audits/app-audit-2025/` (self-contained, `__dirname`-relative).
- Moved `critical-data/` to `data/legacy-import/`; updated the default path in `scripts/import-legacy-xlsx.mjs` (env override `LEGACY_XLSX_PATH` unchanged).
- Untracked generated `reports/` output and gitignored `/reports/`; archived the superseded `/login` autoresearch program (`program 2.md` → `docs/archive/autoresearch-program-login-bundle.md`).
- Added `Repository structure` section to `README.md` and layout conventions to `AGENTS.md`. Canonical root docs and all runtime/CI paths unchanged.

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
