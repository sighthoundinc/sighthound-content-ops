# autoresearch/ — User Territory

Runtime and configuration artifacts for the `deft-autoresearch` skill.
**`deft-sync` MUST NOT touch anything in this directory** (see
`../deft/skills/deft-autoresearch/BOUNDARIES.md`).

## Contents

| Path | Purpose | Tracked in git? |
|---|---|---|
| `research.env` | Active config (TRAIN_CMD, METRIC_PATTERN, EDITABLE_FILES, VERIFY_CMD, MAX_HOURS) | yes |
| `program.md` | Agent-written, human-approved research strategy | yes |
| `sessions/<id>/session.env` | Session deadline + baseline + best metric | yes |
| `sessions/<id>/autoresearch.tsv` | Experiment log (one row per iteration) | **no** (gitignored) |
| `sessions/<id>/last_experiment.log` | Latest TRAIN_CMD + VERIFY_CMD output | **no** (gitignored) |
| `sessions/<id>/last_metric` | Scratch file containing the most recent metric value | **no** (gitignored) |
| `.current-session` | Pointer to the active session id | **no** (gitignored) |

## Why repo root, not under `deft/`?

Framework files under `deft/skills/deft-autoresearch/` are overwritable by
`deft-sync`. Anything user-generated (your `research.env`, the agent's
`program.md`, experiment TSVs, vBRIEF session records) would be clobbered
on a framework upgrade. Keeping this directory at repo root — symmetric
with `vbrief/`, `history/`, `secrets/` — guarantees upgrade safety.

## Bootstrapping

```bash
deft/skills/deft-autoresearch/scripts/init.sh
```

Scaffolds `research.env`, `program.md`, `.gitignore`, and `LESSONS.md`
from the framework templates. Safe to re-run; never overwrites existing files.

## Related paths (also user territory)

- `../vbrief/autoresearch-<session-id>.vbrief.json` — resumable session record
- `../history/autoresearch/plan-YYYY-MM-DD-<slug>.md` — archived session plans
- `../LESSONS.md` — durable findings promoted from sessions

## Deprecated siblings (safe to delete)

The following files are left over from an earlier direct clone of
`sh-autoresearch` into this directory. They duplicate what is now
vendored under `deft/skills/deft-autoresearch/` and can be removed:

- `UPSTREAM-README.md` (renamed from original `README.md`, kept only for reference)
- `scripts/` (duplicates `deft/skills/deft-autoresearch/scripts/`)
- `program-template.md` (duplicates `deft/skills/deft-autoresearch/templates/program.template.md`)
- `research.env.example` (duplicates `deft/skills/deft-autoresearch/templates/research.env.example`)
- `examples/` (upstream illustrative examples; not required)

Removal has not been performed automatically to respect the repo's SCM
safety rules. When ready:

```bash
rm -rf autoresearch/scripts autoresearch/examples
rm autoresearch/program-template.md autoresearch/research.env.example autoresearch/UPSTREAM-README.md
```
