# Autoresearch Strategy

> Agent-written, human-approved. Copy this template to `autoresearch/program.md`
> and fill in every `[placeholder]` with a concrete value. Do not begin Phase 2
> until the human replies `go` to the approval gate.

## Goal

Improve **[metric name]** on **[task description]** within a **[N]-hour** budget.

- Metric : `[metric name]` (higher | lower is better)
- Baseline : `[value]`
- Session target : `[value]` (stretch goal; not a stop condition)

## VERIFY_CMD

`task check` runs before the metric is extracted on every iteration. Any
failure discards the change regardless of metric movement.

## What you CAN modify

Files listed in `EDITABLE_FILES` (see `autoresearch/research.env`).
Current entries: `[file1] [file2] ...`

## What you MUST NOT modify

- Evaluation / metric extraction logic
- Dataset files and fixtures
- The `TRAIN_CMD` / `VERIFY_CMD` definitions
- Any file outside `EDITABLE_FILES`
- Seed / determinism knobs (`--seed`, `PYTHONHASHSEED`, etc.)

## Ranked Experiments

List 6-10 experiments highest-expected-impact first. After running each,
append status inline: `tried: kept` / `tried: discarded` / `tried: crashed`.

1. `[experiment]` -- rationale: `[one line]`
2. `[experiment]` -- rationale: `[one line]`
3. `[experiment]` -- rationale: `[one line]`
4. `[experiment]` -- rationale: `[one line]`
5. `[experiment]` -- rationale: `[one line]`
6. `[experiment]` -- rationale: `[one line]`

## Agent Workflow (per iteration)

1. `deft/skills/deft-autoresearch/scripts/check-time.sh` -- exit 1 → stop
2. Read this file + `autoresearch/sessions/<session-id>/autoresearch.tsv`
3. Pick the next untried experiment; state which and why in one line
4. Make ONE targeted change to `EDITABLE_FILES`
5. `deft/skills/deft-autoresearch/scripts/autoresearch.sh "<short description>"`
6. Emit status: `Exp #N | <change> | kept/discarded | best: <metric>`

## Stop Conditions

- `check-time.sh` returns 1 (deadline reached)
- `autoresearch.sh` returns 3 (hard deadline)
- Human interrupt
- `[optional: metric > stretch_target]`

## On Exit

- Update this file: new best metric, mark tried experiments
- Append durable findings to repo-root `LESSONS.md`
- Emit `vbrief/autoresearch-<session-id>.vbrief.json`
- Chain into `deft-pre-pr` before opening any PR
