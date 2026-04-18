# deft-autoresearch -- Boundaries Manifest

Machine-enforceable declaration of which paths are framework-owned
(overwritable by `deft-sync`) versus user-owned (MUST survive sync).

Legend (from RFC2119): !=MUST, ⊗=MUST NOT.

## Contract

- ! `deft-sync` MUST honor `USER_PATHS` and `PRESERVE_ON_SYNC` -- these
  paths are never touched during a framework update.
- ! `deft-sync` MAY freely replace anything in `FRAMEWORK_PATHS`.
- ⊗ `deft-sync` MUST NOT auto-bump the pinned upstream version recorded in
  `VERSION`. Version bumps are explicit, user-initiated, and logged to
  `CHANGELOG.md`.
- ⊗ Skill code (agents, scripts, humans) MUST NOT write to `FRAMEWORK_PATHS`
  as part of a running session; all runtime output goes to `USER_PATHS`.

## Manifest (YAML)

```yaml
skill: deft-autoresearch
version: 0.1.0

FRAMEWORK_PATHS:
  - deft/skills/deft-autoresearch/SKILL.md
  - deft/skills/deft-autoresearch/VERSION
  - deft/skills/deft-autoresearch/CHANGELOG.md
  - deft/skills/deft-autoresearch/BOUNDARIES.md
  - deft/skills/deft-autoresearch/templates/**
  - deft/skills/deft-autoresearch/scripts/**

USER_PATHS:
  - autoresearch/**
  - vbrief/autoresearch-*.vbrief.json
  - history/autoresearch/**
  - LESSONS.md

PRESERVE_ON_SYNC:
  - autoresearch/research.env
  - autoresearch/program.md
  - autoresearch/sessions/**
  - autoresearch/.gitignore
  - vbrief/autoresearch-*.vbrief.json
  - history/autoresearch/**
  - LESSONS.md

GITIGNORE_HINTS:
  - autoresearch/sessions/*/autoresearch.tsv
  - autoresearch/sessions/*/last_experiment.log
  - autoresearch/sessions/*/run.log
```

## Notes

- `autoresearch/research.env` and `autoresearch/program.md` are tracked in
  git; the active session's TSV/logs are gitignored because they are noisy
  per-machine artifacts.
- `session.env` (contains deadline + baseline + session-id) is checked in
  so resume and history are reproducible across machines.
- Promoted findings go to repo-root `LESSONS.md`, never to
  `deft/meta/lessons.md` -- the latter is framework territory and would be
  clobbered by `deft-sync`.
