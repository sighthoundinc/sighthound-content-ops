#!/usr/bin/env bash
# run-experiment.sh — Run one experiment and report whether the metric improved.
#
# Reads configuration from research.env in the project root.
# Enforces the session time budget written by start-session.sh.
#
# Exit codes:
#   0 — metric improved beyond baseline + MIN_DELTA  (caller should git commit)
#   1 — metric did not improve                        (caller should git restore)
#   2 — training crashed or metric could not be extracted
#   3 — session deadline has passed; agent MUST STOP (do not restore, just stop)
#
# Usage:
#   ./scripts/run-experiment.sh
#
# All configuration is in research.env — do not pass arguments.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
ENV_FILE="$REPO_ROOT/research.env"
RESULTS_DIR="$REPO_ROOT/results"
LOG_FILE="$RESULTS_DIR/last_experiment.log"
RESULTS_TSV="$RESULTS_DIR/autoresearch.tsv"

# ── Load config ──────────────────────────────────────────────────────────────
if [ ! -f "$ENV_FILE" ]; then
    echo "ERROR: research.env not found."
    echo "Copy research.env.example to research.env and fill in your project config."
    exit 2
fi
# shellcheck source=/dev/null
source "$ENV_FILE"

# Required variables
: "${TRAIN_CMD?research.env: TRAIN_CMD is required}"
: "${METRIC_PATTERN?research.env: METRIC_PATTERN is required}"
: "${METRIC_DIRECTION?research.env: METRIC_DIRECTION must be 'higher' or 'lower'}"
: "${BASELINE_METRIC?research.env: BASELINE_METRIC is required}"
: "${EDITABLE_FILES?research.env: EDITABLE_FILES is required}"
MIN_DELTA="${MIN_DELTA:-0.005}"

if [[ "$METRIC_DIRECTION" != "higher" && "$METRIC_DIRECTION" != "lower" ]]; then
    echo "ERROR: METRIC_DIRECTION must be 'higher' or 'lower', got '$METRIC_DIRECTION'"
    exit 2
fi

mkdir -p "$RESULTS_DIR"

# ── Hard time-limit enforcement ───────────────────────────────────────────────
# Training can take minutes. Refuse to start if the session deadline has passed.
SESSION_FILE="$RESULTS_DIR/session.env"
if [ -f "$SESSION_FILE" ]; then
    # shellcheck source=/dev/null
    source "$SESSION_FILE"
    NOW=$(date +%s)
    if [ $(( SESSION_DEADLINE - NOW )) -le 0 ]; then
        echo "⏱  Session deadline has passed. Refusing to start a new experiment."
        echo "   Agent: stop the loop, summarise results/autoresearch.tsv, finish."
        exit 3
    fi
fi

# ── Initialise TSV on first run
if [ ! -f "$RESULTS_TSV" ]; then
    printf "commit\tmetric\tstatus\tdescription\n" > "$RESULTS_TSV"
    printf "baseline\t%s\tkeep\tbaseline\n" "$BASELINE_METRIC" >> "$RESULTS_TSV"
fi

echo "╔══════════════════════════════════════════════════════╗"
echo "║  AutoResearch — running experiment                   ║"
echo "║  Baseline: $METRIC_DIRECTION is better, current=$BASELINE_METRIC"
echo "║  Command: $TRAIN_CMD"
echo "╚══════════════════════════════════════════════════════╝"
echo "Started: $(date)"
echo ""

# ── Run training ─────────────────────────────────────────────────────────────
cd "$REPO_ROOT"
set +e
eval "$TRAIN_CMD" 2>&1 | tee "$LOG_FILE"
TRAIN_EXIT=$?
set -e
echo ""

if [ $TRAIN_EXIT -ne 0 ]; then
    echo "WARNING: Training command exited with code $TRAIN_EXIT"
fi

# ── Extract metric ────────────────────────────────────────────────────────────
METRIC=$(python3 - <<PYEOF
import re, sys

log = open("$LOG_FILE").read()
m = re.search(r"$METRIC_PATTERN", log)
if m:
    print(m.group(1))
else:
    sys.exit(1)
PYEOF
) || {
    echo "ERROR: Could not extract metric using pattern: $METRIC_PATTERN"
    echo "Check that the training log contains a line matching the pattern."
    echo "Last 20 lines of log:"
    tail -20 "$LOG_FILE"
    COMMIT=$(git -C "$REPO_ROOT" rev-parse --short HEAD 2>/dev/null || echo "unknown")
    printf "%s\tN/A\tcrash\tmetric extraction failed\n" "$COMMIT" >> "$RESULTS_TSV"
    exit 2
}

echo "Metric extracted:  $METRIC  ($METRIC_DIRECTION is better)"
echo "Baseline:          $BASELINE_METRIC"
echo "Min delta:         $MIN_DELTA"

# ── Compare metric ────────────────────────────────────────────────────────────
# Capture the python comparator's exit code directly. The previous form
# (`$(...) || IMPROVED=1; IMPROVED=$?`) was broken on every platform: the
# second assignment clobbered IMPROVED with the exit code of the first
# assignment (always 0), so the ratchet always took the "improved" branch.
set +e
RESULT=$(python3 - <<PYEOF
import sys

metric   = float("$METRIC")
baseline = float("$BASELINE_METRIC")
delta    = float("$MIN_DELTA")
direction = "$METRIC_DIRECTION"

if direction == "higher":
    improved = metric > (baseline + delta)
else:
    improved = metric < (baseline - delta)

improvement = metric - baseline if direction == "higher" else baseline - metric
print(f"delta={improvement:+.4f}  improved={'yes' if improved else 'no'}")
sys.exit(0 if improved else 1)
PYEOF
)
IMPROVED=$?
set -e
echo "$RESULT"

COMMIT=$(git -C "$REPO_ROOT" rev-parse --short HEAD 2>/dev/null || echo "unknown")
DESC=$(git -C "$REPO_ROOT" diff --stat $EDITABLE_FILES 2>/dev/null | tail -1 | tr '\t' ' ' || echo "unknown changes")

if [ $IMPROVED -eq 0 ]; then
    echo ""
    echo "✓ IMPROVED — $BASELINE_METRIC → $METRIC  (Δ$(python3 -c "print(f'{float(\"$METRIC\")-float(\"$BASELINE_METRIC\"):+.4f}')") )"
    printf "%s\t%s\tkeep\t%s\n" "$COMMIT" "$METRIC" "$DESC" >> "$RESULTS_TSV"
    # Update session best metric so check-time.sh can report it.
    # Portable BSD/GNU sed: use -i.bak then remove the backup (works on
    # both macOS and Linux; GNU `sed -i '<expr>'` and BSD `sed -i '' '<expr>'`
    # are mutually incompatible).
    if [ -f "$SESSION_FILE" ]; then
        sed -i.bak "s/^SESSION_BEST_METRIC=.*/SESSION_BEST_METRIC=$METRIC/" "$SESSION_FILE"
        rm -f "$SESSION_FILE.bak"
    fi
    exit 0
else
    echo ""
    echo "✗ NO IMPROVEMENT — $METRIC does not beat $BASELINE_METRIC + $MIN_DELTA"
    printf "%s\t%s\tdiscard\t%s\n" "$COMMIT" "$METRIC" "$DESC" >> "$RESULTS_TSV"
    exit 1
fi
