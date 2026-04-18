# [Project Name] AutoResearch

Replace this template with your own research strategy. Be specific — the agent reads
this document to decide what to change each iteration.

## Goal

**Maximise / minimise `<metric>` on `<evaluation set>`.**

Current baseline: **`<metric>` = `<value>`**

Describe what the metric measures and why it matters for your task.

## What you CAN modify

List the editable files defined in `research.env` and what's fair game inside each:

**`model.py`**:
- Hidden layer sizes (currently X) — try 2×, 4×
- Number of layers (currently N) — try N+1, N+2
- Dropout rate (currently X) — try 0.1, 0.3, 0.5
- Activation functions — try ReLU, GELU, SiLU

**`train.py`** — training hyperparameters only:
- Learning rate (currently X) — try X/3, X/10
- LR scheduler — try cosine warmup+cooldown, step decay
- Batch size (currently N) — try N/2, N*2
- Regularisation — try weight decay, label smoothing

## What you CANNOT modify

- **`data/`** — dataset is fixed, never regenerated mid-loop
- **Evaluation logic** — the function/script that computes the metric is frozen
- The `--seed` flag — reproducibility is non-negotiable
- Any file not listed above under "What you CAN modify"
- Do NOT install new packages

## Experiment Priorities

Try these in order — ranked by expected impact. Each is a single, targeted change:

1. **[Highest-impact change]** — reason why
2. **[Second change]** — reason why
3. **[Third change]** — reason why
4. **[Architecture change]** — reason why
5. **[LR/optimiser change]** — reason why
6. **Combine #1 + #2** — stack the two best changes
7. **[More radical idea]** — if simpler ideas plateau

Add as many as you can think of. The agent works through them in order and loops back
to combinations after exhausting the list.

## Simplicity Criterion

- Improvement < `MIN_DELTA` (from `research.env`) → discard even if technically positive
- Improvement requires ugly, complex code → probably not worth keeping
- Improvement comes from deleting code → always keep (simpler + better is a win)

## Agent Workflow (Copy-Paste Prompt)

Use this prompt to start a session:

```
Run the autoresearch loop for [N] hours. Follow program.md §Agent Workflow exactly:
0. If program.md or research.env are incomplete, explore the project, fill them in,
   then present the findings report below and WAIT for approval before continuing.
1. Start the session: ./scripts/start-session.sh [N] <current_best_metric>
2. Before every experiment: ./scripts/check-time.sh — stop immediately if it exits 1
3. Read program.md and results/autoresearch.tsv, pick the next untried experiment,
   make ONE targeted change, then run:
   ./scripts/autoresearch.sh "<short description of change>"
4. When check-time.sh exits 1 or autoresearch.sh exits 3, STOP — no more experiments —
   update program.md to reflect the new best metric and tried experiments,
   then summarise what improved.
```

Findings report format (present before step 1, wait for 'go'):

```
│ Training command : <TRAIN_CMD>
│ Metric           : <name> = <baseline> (<higher/lower> is better)
│ Editable files   : <list>
│ Experiments      : <N> planned
│
│ Top experiments (ranked by expected impact):
│   1. <experiment> — <one-line rationale>
│   2. <experiment> — <one-line rationale>
│   ...
│
│ Time budget      : [N] hours
└ Reply 'go' to start, or give feedback to revise.
```

## The Ratchet Protocol

Each iteration (managed by `scripts/autoresearch.sh`):

1. Agent calls `./scripts/check-time.sh` — exits 1 means **stop immediately**
2. Agent reads this doc + `results/autoresearch.tsv` (experiment history)
3. Agent picks the next untried experiment
4. Agent implements ONE targeted change to editable files
5. Agent calls `./scripts/autoresearch.sh "<description>"`
   - exit 0: improvement committed, `BASELINE_METRIC` updated in `research.env`
   - exit 1: no improvement, files restored
   - exit 2: crash, files restored
   - exit 3: deadline passed — **stop immediately**

**HARD STOP RULE**: When `check-time.sh` exits 1 or `autoresearch.sh` exits 3,
stop the loop immediately. Do not ask for permission. Do not start another
experiment. Summarise results from `results/autoresearch.tsv` and wait.

## Crash Handling

If the experiment crashes (OOM, import error, syntax error):
- If it is a trivial bug in your change, fix it and re-run (counts as the same experiment)
- If the idea is fundamentally broken, restore and move on
- Log status `crash` in `results/autoresearch.tsv`

## End-of-Session Documentation

After the loop ends (time expired or all experiments exhausted):
1. Update the "Current baseline" line at the top with the new best metric
2. Move tried experiments from the priority list to the "What you CAN modify" notes
   (mark as `tried: failed` or `ACTIVE` as appropriate)
3. Refresh the priority list for the next session

Do NOT update docs after every experiment — only once at the end of the session.
