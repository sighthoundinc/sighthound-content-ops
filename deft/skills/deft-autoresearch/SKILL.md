---
name: deft-autoresearch
description: >
  Autonomous, metric-gated, time-bounded experimentation loop. An agent
  proposes one code change per iteration, runs VERIFY_CMD + a training/eval
  command, extracts a scalar metric, and keeps the change only if the metric
  improves. Framework scripts are version-pinned; all user artifacts live at
  repo root under `autoresearch/` and survive framework upgrades.
---

# Deft Autoresearch -- Metric-Gated Autonomous Loop

Absorbs the sh-autoresearch execution pattern into Deft's framework, with
strict separation between framework territory (this directory, overwritable
by `deft-sync`) and user territory (`autoresearch/` at repo root, never
touched by `deft-sync`).

Legend (from RFC2119): !=MUST, ~=SHOULD, ≉=SHOULD NOT, ⊗=MUST NOT, ?=MAY.

**See also**: [deft-pre-pr](../deft-pre-pr/SKILL.md) | [deft-build](../deft-build/SKILL.md) | [BOUNDARIES.md](./BOUNDARIES.md) | [contracts/boundary-maps.md](../../contracts/boundary-maps.md)

## Triggers

Invoke this skill when user input matches any of:

- "autoresearch"
- "optimize metric" / "optimise metric"
- "overnight experiments"
- "run the loop"
- "metric-driven refactor"
- "keep iterating until X improves"

## When to Use

- ! A clear scalar metric exists (F1, loss, latency, bundle size, coverage, error rate)
- ! A deterministic command produces that metric on stdout/stderr
- ! Scope can be constrained to a small whitelist of editable files
- ~ You want unattended iteration across a fixed time budget
- ≉ No mechanical success metric exists -- use `deft-build` + `deft-pre-pr` instead
- ⊗ Workflow state, permissions, billing, or auth is in scope -- autoresearch MUST NOT run against critical production contracts

## Chain Contract

- Chains **from**: `deft-setup` (optional), `deft-build` (optional), direct user invocation
- Chains **to**: `deft-pre-pr` (! mandatory before any PR containing autoresearch commits)
- Exit statement: `"deft-autoresearch complete -- exiting skill. Chain to deft-pre-pr before opening PR."`

## Separation of Framework vs User Territory

See [BOUNDARIES.md](./BOUNDARIES.md) for the machine-enforceable manifest.

**Framework (this directory, `deft-sync` may overwrite):**
- `SKILL.md`, `VERSION`, `CHANGELOG.md`, `BOUNDARIES.md`
- `templates/program.template.md`, `templates/research.env.example`
- `scripts/*.sh`

**User artifacts (repo root, `deft-sync` MUST preserve):**
- `autoresearch/research.env` -- active config (tracked in git)
- `autoresearch/program.md` -- agent-written, human-approved strategy (tracked in git)
- `autoresearch/sessions/<session-id>/` -- runtime state (gitignored except session.env)
- `vbrief/autoresearch-<session-id>.vbrief.json` -- structured resume record
- `history/autoresearch/plan-YYYY-MM-DD-<slug>.md` -- archived session plan
- `LESSONS.md` at repo root -- promoted findings (never `deft/meta/lessons.md`)

## Phases

### Phase 0 -- Preflight

- ! Verify `autoresearch/` exists at repo root; if not, run `deft/skills/deft-autoresearch/scripts/init.sh` to scaffold it
- ! Verify the repo is on a feature branch, not `main`/`master` (branch name `autoresearch/<slug>-YYYY-MM-DD` recommended)
- ! Verify `task check` exists and passes on the current baseline; this is the `VERIFY_CMD` gate
- ⊗ Begin a session if the working tree is dirty -- stash or commit first

### Phase 1 -- Exploration & Strategy Draft

The agent explores the project and fills in `autoresearch/research.env` and `autoresearch/program.md` from the templates:

- ! Identify the metric command, regex pattern, and direction (higher/lower is better)
- ! Record the baseline metric value by running the command once
- ! Identify `EDITABLE_FILES` -- code controlling the hypothesis space. ⊗ Never include evaluation logic, dataset fixtures, or files that would alter the metric extractor
- ! Check `autoresearch/sessions/*/autoresearch.tsv` (if any) and git log for prior experiments to avoid repeating failed work
- ! Write a ranked list of 6-10 experiments (highest expected impact first) into `program.md`

### Phase 1.5 -- APPROVAL GATE

- ! Present a structured findings report:

  ```
  │ Metric           : <name> = <baseline> (<higher|lower> is better)
  │ VERIFY_CMD       : task check
  │ Training command : <TRAIN_CMD>
  │ Editable files   : <list>
  │ Time budget      : <N> hours (~<N*3> experiments)
  │
  │ Top 5 experiments (ranked by expected impact):
  │   1. <experiment> -- <one-line rationale>
  │   2. ...
  └ Reply 'go' to start, or give feedback to revise.
  ```

- ! STOP and wait for explicit human approval before Phase 2
- ⊗ Auto-proceed on implicit approval, silence, or ambiguous responses
- ~ If feedback is given, update `program.md`, archive the revision to `history/autoresearch/plan-YYYY-MM-DD-<slug>.md`, and re-present

### Phase 2 -- Research Loop

Per iteration, the agent:

1. Run `deft/skills/deft-autoresearch/scripts/check-time.sh` -- exit 1 → skip to Phase 3
2. Read `autoresearch/program.md` and current session TSV
3. Pick the next untried experiment; state which and why in one line
4. Make ONE targeted change to whitelisted `EDITABLE_FILES`
5. Run `deft/skills/deft-autoresearch/scripts/autoresearch.sh "<short description>"` which:
   - Re-checks time budget (hard gate)
   - Runs `VERIFY_CMD` (default `task check`) -- ! any failure discards the change, no metric extraction
   - Runs `TRAIN_CMD`, extracts the metric
   - `git commit` if metric improved by ≥ `MIN_DELTA`; `git restore` otherwise
   - Appends to `autoresearch/sessions/<session-id>/autoresearch.tsv`
6. Emit a one-line status: `Exp #N | <change> | kept/discarded | best: <metric>`
7. Every 3 iterations, print the full TSV

! `VERIFY_CMD` runs **before** metric extraction. A change that improves the metric but breaks lint/tests/typecheck is auto-discarded. This is a strict upgrade over vanilla sh-autoresearch.

### Phase 3 -- Wrap-up

- ! STOP immediately when `check-time.sh` or `autoresearch.sh` returns the time-exceeded exit code -- do not start another experiment
- ! Update `autoresearch/program.md` with the new best metric and mark tried experiments
- ! Promote durable findings to `LESSONS.md` at repo root (⊗ never write to `deft/meta/lessons.md`)
- ! Emit `vbrief/autoresearch-<session-id>.vbrief.json` so `resilience/continue-here.md` can resume
- ! Print the final summary:

  ```
  Session duration | experiments run | improvements kept
  Metric trajectory: <baseline> → ... → <final best>
  Top change: <what worked and by how much>
  Next 2 experiments to try next session: <ranked>
  ```

- ! Exit with `"deft-autoresearch complete -- exiting skill. Chain to deft-pre-pr before opening PR."`

## Script Contract

All scripts live under `deft/skills/deft-autoresearch/scripts/` and read config from `./autoresearch/research.env` (resolved from repo root).

| Script | Purpose | Exit codes |
|---|---|---|
| `init.sh` | Scaffold `./autoresearch/` from templates; auto-detect `TRAIN_CMD` | 0 success |
| `start-session.sh <hours> <baseline>` | Register session deadline + baseline | 0 success, 2 config error |
| `check-time.sh` | Soft time check; agent calls before each iteration | 0 continue, 1 deadline reached |
| `run-experiment.sh` | Run VERIFY_CMD + TRAIN_CMD + metric extract (one try) | 0 improved, 1 not-improved, 2 crash, 3 deadline |
| `autoresearch.sh <desc>` | One full iteration: check → run → commit/restore → log | 0 improved+committed, 1 not-improved+restored, 2 crash, 3 deadline |

## Verification Integration

- ! `VERIFY_CMD` (default `task check`) must pass on every iteration **before** the metric is extracted
- ! The repo's own verification ladder (`verification/verification.md`) is the floor, not the ceiling -- autoresearch cannot lower it
- ! Autoresearch commits land on a feature branch only; PR creation requires `deft-pre-pr` to pass a full RWLDL cycle

## Anti-Patterns

- ⊗ Run autoresearch on `main`/`master` or directly against production code
- ⊗ Include evaluation/metric/dataset files in `EDITABLE_FILES`
- ⊗ Skip `VERIFY_CMD` to "make the loop faster" -- breaking tests to win a metric is always a regression
- ⊗ Store runtime state (TSV, logs, session.env) under `deft/` -- it will be wiped on upgrade
- ⊗ Write promoted findings to `deft/meta/lessons.md` -- use repo-root `LESSONS.md` instead
- ⊗ Auto-proceed past the Phase 1.5 approval gate
- ⊗ Open a PR without chaining through `deft-pre-pr`
- ⊗ Edit `templates/` or `scripts/` in this skill as a workaround -- changes will be lost on `deft-sync`; open an upstream PR or document local deltas in `CHANGELOG.md`
