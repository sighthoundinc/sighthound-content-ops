# AutoResearch

An autonomous ML experimentation framework inspired by [Karpathy's autoresearch](https://github.com/karpathy/autoresearch).

**Repository**: https://github.com/sighthoundinc/sh-autoresearch

An AI agent explores your project, writes the research strategy, proposes one code change
per iteration, runs the experiment, and keeps the change only if the metric improves.
You approve the strategy once before the loop starts. The loop runs until the time budget
expires. You wake up to a better model.

```
Agent explores → Agent writes strategy → Human approves → Agent runs loop → Better model
```

## Core Concepts

| Concept | What it means |
|---------|--------------|
| **Research strategy** (`program.md`) | Agent-written doc (human approves before loop starts): goal, editable files, ranked experiments |
| **Configuration** (`research.env`) | Training command, metric extractor, baseline, time budget |
| **Single editable file(s)** | Agent only touches files listed in `EDITABLE_FILES` |
| **Fixed evaluation** | Metric is always extracted the same way — never changed during the loop |
| **Git ratchet** | `git commit` if metric improves, `git restore` if not — codebase can only get better |
| **Time budget** | Stops after `MAX_HOURS` so you don't wake up to a runaway loop |

## Quickstart

### Option A: Fully automated (recommended)

Copy the scripts into your project, then give the agent a single prompt — it
does everything else.

```bash
git clone https://github.com/sighthoundinc/sh-autoresearch autoresearch
chmod +x autoresearch/scripts/*.sh
./autoresearch/scripts/init.sh 2      # bootstraps branch, stubs, detects TRAIN_CMD
```

Then paste **Prompt 4 (all-in-one)** from the Agent Prompts section below.
The agent explores the project, writes `research.env` and `program.md`, then
**pauses for your approval** before starting any experiments. One thumbs-up
and it runs the loop autonomously from there.

### Option B: Manual setup

```bash
cp research.env.example research.env  # fill in TRAIN_CMD, METRIC_PATTERN, etc.
cp program-template.md program.md     # or let the agent write it via Prompt 1
chmod +x scripts/*.sh
```

Then use Prompt 1 (agent writes strategy + approval), or Prompt 2/3 if `program.md` is
already written.

## Agent Prompts

Four prompts for different stages. **Prompt 4 is the recommended starting point** —
the human only needs to specify a time budget and give one approval.

---

### Prompt 4 — All-in-one (explore + run + wrap-up)

Use this on any project after running `./scripts/init.sh`. The agent explores,
writes the config and strategy, **pauses for approval**, then runs the loop and
wraps up. Human input: one time budget number, one approval.

```
Run a complete autoresearch session on this project for [N] hours.

Phase 1 — Bootstrap (skip any step already done):
  1. Run ./scripts/init.sh [N] to set up the branch, results dir, and detect
     config stubs (if not already run).
  2. Read the codebase: find the training script, understand what metric is
     being optimised and where it appears in training output.
  3. Run the training command once to record the baseline metric value.
  4. Complete research.env — fill in METRIC_PATTERN, BASELINE_METRIC,
     EDITABLE_FILES. Verify by running ./scripts/run-experiment.sh.
  5. Complete program.md — replace all [placeholders] with real values: actual
     file names, current hyperparameter values, and 6-10 ranked experiments
     (highest expected impact first). Mark any already-tried experiments.

Phase 1.5 — APPROVAL GATE (do not proceed until approved):
  Present a concise findings report:
    │ Training command : <TRAIN_CMD>
    │ Metric           : <name> = <baseline value> (<higher/lower> is better)
    │ Editable files   : <list>
    │ Experiments      : <N> planned
    │
    │ Top 5 experiments (ranked by expected impact):
    │   1. <experiment> — <one-line rationale>
    │   2. <experiment> — <one-line rationale>
    │   3. <experiment> — <one-line rationale>
    │   4. <experiment> — <one-line rationale>
    │   5. <experiment> — <one-line rationale>
    │
    │ Time budget      : [N] hours (~<N*3> experiments at ~20 min each)
    └ Reply 'go' to start, or give feedback to revise the strategy first.

  STOP HERE and wait for the human's response.
  - If they say 'go' (or equivalent): proceed to Phase 2.
  - If they give feedback: update program.md accordingly, then re-present.

Phase 2 — Research loop:
  6. ./scripts/start-session.sh [N] <baseline from step 3>
  7. For each iteration:
     a. ./scripts/check-time.sh — exits 1 → skip to Phase 3
     b. Read program.md + results/autoresearch.tsv
     c. Pick the next untried experiment; briefly state which and why
     d. Make ONE targeted change to the editable files
     e. ./scripts/autoresearch.sh "<short description>"
     f. Print: Exp #N | <change> | kept/discarded | best: <metric>
     g. Every 3 experiments: print the full results/autoresearch.tsv table

Phase 3 — Wrap-up:
  8. STOP — do not start another experiment
  9. Update program.md: new best metric, mark tried experiments
  10. Print final summary:
        Duration | experiments run | improvements kept
        Trajectory: <baseline> → ... → <final best>
        Best change: <what improved and by how much>
        Next 2 experiments to try next session
```

---

### Prompt 1 — Explore project and write research strategy

Use this when `program.md` and `research.env` don't exist yet and you want the
agent to write them. Ends with a structured findings report for your approval.
Use Prompt 2 or 3 to start the loop after you've approved.

```
Explore this project and write the autoresearch strategy documents.

1. Read the project structure: find the training script, identify what metric is
   being optimised and where it is printed in the training output.
2. Run the training command once (or read existing results) to record the baseline
   metric value.
3. Identify editable files — code controlling model architecture, training
   hyperparameters, or configuration. EXCLUDE: evaluation logic, dataset files,
   the --seed flag, and anything that would change the metric extractor.
4. Check git log and results/autoresearch.tsv (if they exist) for prior experiments
   so the strategy avoids repeating work that already failed.
5. Write research.env by filling in research.env.example:
   - TRAIN_CMD: the exact command to run one experiment
   - METRIC_PATTERN: a Python regex with ONE capture group matching the metric line
   - METRIC_DIRECTION: "higher" or "lower"
   - BASELINE_METRIC: the value recorded in step 2
   - EDITABLE_FILES: space-separated list of files from step 3
   - MAX_HOURS=2, MIN_DELTA: smallest meaningful improvement
6. Write program.md by filling in program-template.md:
   - Be specific: use real file names, real current values, concrete experiments
   - Rank experiments by expected impact, highest first
   - Mark anything already tried as "tried: failed" in the What you CAN modify section
7. Verify setup: ./scripts/run-experiment.sh should complete and extract the metric.

Do NOT start the autoresearch loop. Present a findings report for approval:
  │ Training command : <TRAIN_CMD>
  │ Metric           : <name> = <baseline value> (<higher/lower> is better)
  │ Editable files   : <list>
  │
  │ Proposed experiments (ranked by expected impact):
  │   1. <experiment> — <one-line rationale>
  │   2. <experiment> — <one-line rationale>
  │   3. <experiment> — <one-line rationale>
  │   4. <experiment> — <one-line rationale>
  │   5. <experiment> — <one-line rationale>
  │   ... (all planned experiments)
  └ Awaiting approval. Reply 'go' to start the loop, or give feedback to revise.
```

---

### Prompt 2 — Run autoresearch loop (unmonitored)

Use this to start a timed loop and leave it running. The agent works autonomously
until the time budget expires. See also `program.md §Agent Workflow`.

```
Run the autoresearch loop for [N] hours. Follow program.md §Agent Workflow exactly:
1. Start the session: ./scripts/start-session.sh [N] <current_best_metric>
2. Before every experiment: ./scripts/check-time.sh — stop immediately if it exits 1
3. Read program.md and results/autoresearch.tsv, pick the next untried experiment,
   make ONE targeted change, then run:
   ./scripts/autoresearch.sh "<short description of change>"
4. When check-time.sh exits 1 or autoresearch.sh exits 3, STOP — no more experiments —
   update program.md to reflect the new best metric and tried experiments,
   then summarise what improved.
```

---

### Prompt 3 — Run autoresearch loop with active monitoring

Use this when you want live status updates after each experiment rather than just
a final summary. Useful for shorter sessions where you plan to stay engaged.

```
Run and monitor the autoresearch loop for [N] hours.

Setup:
  ./scripts/start-session.sh [N] <current_best_metric>

For each experiment iteration:
  1. ./scripts/check-time.sh — if it exits 1, go to Wrap-up below
  2. Read program.md and results/autoresearch.tsv
  3. Choose the next untried experiment; briefly state which one and why
  4. Make ONE targeted change to the editable files
  5. ./scripts/autoresearch.sh "<description>"
  6. Print a one-line status:
       Exp #N | <change tried> | kept/discarded | best: <metric>
  7. Every 3 experiments, print the full results/autoresearch.tsv table
  8. Repeat from step 1

Wrap-up (when check-time.sh exits 1 or autoresearch.sh exits 3):
  - STOP immediately — do not start another experiment
  - Update program.md: new best metric, mark tried experiments
  - Print a final summary:
      Session duration | experiments run | improvements kept
      Metric trajectory: <baseline> → <exp1> → ... → <final best>
      Top change: <what worked best and by how much>
      Next to try: <top 2 untried experiments for the next session>
```

---

## Configuration (`research.env`)

```bash
# The command that runs your training experiment
TRAIN_CMD="python train.py --epochs 30 --seed 42"

# Python regex (with ONE capture group) to extract the metric from stdout
METRIC_PATTERN="Test F1=([0-9.]+)"

# "higher" = bigger is better (F1, accuracy, AUC)
# "lower"  = smaller is better (loss, error, perplexity)
METRIC_DIRECTION="higher"

# Current best metric — the ratchet only keeps changes that beat this
BASELINE_METRIC="0.500"

# Space-separated list of files the agent can modify
EDITABLE_FILES="model.py train.py"

# Time budget in hours (default 2 — see research.env.example for guidance)
MAX_HOURS=2

# Only keep if improvement exceeds this (prevents committing noise)
MIN_DELTA=0.005
```

See `research.env.example` for full documentation.

## Running a Single Experiment

To run one experiment without the full loop (useful when testing your config):

```bash
./scripts/run-experiment.sh
```

Exit codes:
- `0` — metric improved (you should `git commit`)
- `1` — metric did not improve (you should `git restore <editable files>`)
- `2` — training crashed or metric could not be extracted

## How the Agent Works

`autoresearch.sh` is a **non-interactive single-iteration runner** — it does not
prompt for input. The agent provides the outer loop by calling it after each change.

### Two-layer time enforcement

Time limits use two independent checks so neither can be bypassed:

1. **Soft check** (`check-time.sh`) — agent calls before making any change.
   Exits 1 when deadline passes. Gives the agent a chance to stop cleanly before
   starting a potentially long training run.

2. **Hard check** (`run-experiment.sh`) — refuses to start training if the
   deadline has passed (exit code 3). Catches the case where the agent forgets
   to call `check-time.sh`.

### Agent workflow per iteration

1. `./scripts/check-time.sh` — exits 1 → stop; exits 0 → continue
2. Read `program.md` + `results/autoresearch.tsv`
3. Make ONE targeted code change to editable files
4. `./scripts/autoresearch.sh "<description of change>"`
5. Repeat until `check-time.sh` returns 1 or `autoresearch.sh` returns 3

See `program.md §Agent Workflow` for the exact copy-paste prompt to give the agent.

## Repository Layout

```
AutoResearch/
├── research.env.example       — Configuration template (copy to research.env)
├── program-template.md        — Research strategy template (copy to program.md)
├── scripts/
│   ├── init.sh               — Bootstrap: branch + stubs + auto-detect TRAIN_CMD
│   ├── start-session.sh      — Register a timed session (agent calls ONCE)
│   ├── check-time.sh         — Check time budget (agent calls before each experiment)
│   ├── run-experiment.sh     — Run ONE experiment; exit 0/1/2/3
│   └── autoresearch.sh       — ONE iteration: check → run → commit/restore
├── examples/
│   ├── pytorch-classifier/   — PyTorch image classifier example
│   └── generic/              — Generic ML task example
└── results/                   — Created at runtime (gitignored)
    ├── autoresearch.tsv       — Experiment history (tab-separated)
    ├── last_experiment.log    — Output of the most recent training run
    └── session.env            — Active session deadline + best metric
```

## Experiment Log

Results are written to `results/autoresearch.tsv` (tab-separated, not committed):

```
commit    metric    status     description
baseline  0.500     keep       baseline
a1b2c3d   0.531     keep       cosine LR schedule with warmup
b2c3d4e   0.518     discard    GRU hidden 64→128 (no improvement)
c3d4e5f   0.000     crash      OOM: model too large
```

## Requirements

- `bash` (≥ 4.0)
- `python3` (for metric extraction)
- `git` (for branching and ratchet)
- A training command that writes stdout/stderr you can grep

## Examples

See the `examples/` directory for complete worked examples:
- `examples/pytorch-classifier/` — PyTorch image classifier (F1 metric)
- `examples/generic/` — any task with a scalar metric
