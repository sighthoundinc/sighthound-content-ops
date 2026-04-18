# deft-autoresearch -- Local Changelog

Local deltas applied to upstream sh-autoresearch when vendored into Deft.
Any change to files under `scripts/` or `templates/` MUST be recorded here
so a future `deft-sync` with a version bump knows what to rebase.

## [0.1.0] - 2026-04-18

### Added
- Initial vendoring into Deft as the `deft-autoresearch` skill.
- `VERIFY_CMD` gate added to `run-experiment.sh` -- runs `task check` (or
  user-overridden command) before metric extraction. A failing VERIFY_CMD
  causes the iteration to exit with code 1 (not-improved) so the change is
  reverted, even if the metric would have improved.
- Session state relocated from `results/` to `autoresearch/sessions/<id>/`
  at repo root so `deft-sync` never overwrites it.
- TSV header extended with `verify_status` column (pass/fail/skipped).
- `start-session.sh` emits a vBRIEF stub to
  `vbrief/autoresearch-<session-id>.vbrief.json` for resilience/resume.
- `autoresearch.sh` writes the `LESSONS.md` promotion candidate note to
  repo-root `LESSONS.md` (not `deft/meta/lessons.md`).

### Paths (upstream → Deft)
- `./scripts/` → `deft/skills/deft-autoresearch/scripts/`
- `./program-template.md` → `deft/skills/deft-autoresearch/templates/program.template.md`
- `./research.env.example` → `deft/skills/deft-autoresearch/templates/research.env.example`
- `./results/` → `./autoresearch/sessions/<session-id>/`
- `./program.md` → `./autoresearch/program.md`
- `./research.env` → `./autoresearch/research.env`
