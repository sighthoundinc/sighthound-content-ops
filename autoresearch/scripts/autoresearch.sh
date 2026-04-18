#!/usr/bin/env bash
# autoresearch.sh — Run ONE autoresearch iteration (non-interactive).
#
# The agent calls this after making a code change. It handles:
#   1. Time-budget check  (refuses to start if deadline passed, exit 3)
#   2. Verifying editable files were actually changed
#   3. Running the experiment via run-experiment.sh
#   4. Committing on improvement or restoring on no-improvement / crash
#
# Usage:
#   ./scripts/autoresearch.sh [experiment_description]
#
# The AGENT provides the outer loop:
#   - Call start-session.sh ONCE before the first experiment.
#   - Call check-time.sh at the top of each loop iteration.
#   - Make ONE targeted code change to editable files.
#   - Call this script.
#   - Repeat until check-time.sh exits 1 or this script exits 3.
#
# See program.md §Agent Workflow for the full protocol.
# Results are logged to results/autoresearch.tsv (gitignored).

set -euo pipefail

# Script lives in <project>/autoresearch/scripts/ — go up two to project root.
REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
AUTORESEARCH_DIR="$REPO_ROOT/autoresearch"
ENV_FILE="$REPO_ROOT/research.env"
DESCRIPTION="${1:-(no description)}"

# ── Load config ───────────────────────────────────────────────────────────────────
if [ ! -f "$ENV_FILE" ]; then
    echo "ERROR: research.env not found."
    echo "Copy research.env.example to research.env and fill in your project config."
    exit 1
fi
# shellcheck source=/dev/null
source "$ENV_FILE"

: "${BASELINE_METRIC?research.env: BASELINE_METRIC is required}"
: "${EDITABLE_FILES?research.env: EDITABLE_FILES is required}"
RESULTS_DIR="$REPO_ROOT/results"
RESULTS_TSV="$RESULTS_DIR/autoresearch.tsv"
SESSION_FILE="$RESULTS_DIR/session.env"

cd "$REPO_ROOT"
mkdir -p "$RESULTS_DIR"

# ── 1. Time-budget check ─────────────────────────────────────────────────
if [ -f "$SESSION_FILE" ]; then
    # shellcheck source=/dev/null
    source "$SESSION_FILE"
    NOW=$(date +%s)
    REMAINING=$(( SESSION_DEADLINE - NOW ))
    if [ "$REMAINING" -le 0 ]; then
        echo "⏱  Session deadline has passed. Refusing to start."
        echo "   Agent: STOP the loop. Summarise results from $RESULTS_TSV."
        exit 3
    fi
    REMAINING_H=$(( REMAINING / 3600 ))
    REMAINING_M=$(( (REMAINING % 3600) / 60 ))
    echo "⏳  Time remaining: ${REMAINING_H}h${REMAINING_M}m  |  Baseline: $BASELINE_METRIC"
fi

# ── 2. Verify editable files were changed ──────────────────────────────
CHANGED=$(git diff --name-only $EDITABLE_FILES 2>/dev/null || true)
if [ -z "$CHANGED" ]; then
    echo "ERROR: No changes detected in editable files."
    echo "  Make a targeted code change before calling this script."
    echo "  Editable files: $EDITABLE_FILES"
    exit 1
fi

echo ""
echo "Changes to test:"
git diff --stat $EDITABLE_FILES
echo ""

# ── 3. Run the experiment ──────────────────────────────────────────────
set +e
"$AUTORESEARCH_DIR/scripts/run-experiment.sh"
RESULT=$?
set -e

# ── 4. Commit or restore ──────────────────────────────────────────────
case $RESULT in
    0)
        NEW_METRIC=$(python3 -c "
import re, sys
log = open('$RESULTS_DIR/last_experiment.log').read()
m = re.search(r'$METRIC_PATTERN', log)
print(m.group(1) if m else '$BASELINE_METRIC')
" 2>/dev/null || echo "$BASELINE_METRIC")
        echo ""
        echo "✓ IMPROVED ($BASELINE_METRIC → $NEW_METRIC) — committing"
        git add $EDITABLE_FILES
        # Build a commitlint-compliant subject. This repo's rules require:
        #   - type from allowlist (perf suits a bundle-size win)
        #   - scope from allowlist (ui for UI changes)
        #   - lower-case subject
        #   - header <= 72 chars
        # The description from the agent may contain capitals or colons, so
        # lower-case it and truncate the whole subject to fit the budget.
        # Subject-only commit to avoid body line-length rule issues.
        # The metric delta is captured in results/autoresearch.tsv anyway.
        COMMIT_SUBJECT_PREFIX="perf(ui): "
        # Sanitize: lower-case and strip newlines; truncate to 72 minus prefix.
        COMMIT_SUBJECT_BODY=$(printf '%s' "$DESCRIPTION" | tr '[:upper:]' '[:lower:]' | tr -d '\n')
        MAX_SUBJECT=72
        PREFIX_LEN=${#COMMIT_SUBJECT_PREFIX}
        BUDGET=$(( MAX_SUBJECT - PREFIX_LEN ))
        if [ ${#COMMIT_SUBJECT_BODY} -gt $BUDGET ]; then
            COMMIT_SUBJECT_BODY="${COMMIT_SUBJECT_BODY:0:$BUDGET}"
        fi
        git commit -m "${COMMIT_SUBJECT_PREFIX}${COMMIT_SUBJECT_BODY}"
        # Persist new best so the next iteration uses it.
        # Portable BSD/GNU sed: use -i.bak then remove the backup.
        sed -i.bak "s/^BASELINE_METRIC=.*/BASELINE_METRIC=$NEW_METRIC/" "$ENV_FILE"
        rm -f "$ENV_FILE.bak"
        echo "New best: $NEW_METRIC  (written to research.env)"
        ;;
    1)
        echo ""
        echo "✗ NO IMPROVEMENT — restoring editable files"
        git restore $EDITABLE_FILES
        echo "Restored to baseline: $BASELINE_METRIC"
        ;;
    2)
        echo ""
        echo "💥 CRASH — restoring editable files"
        git restore $EDITABLE_FILES
        ;;
    3)
        # Deadline expired (run-experiment.sh already printed the message)
        # Do NOT restore — training never started, no files changed
        echo "Agent: stop the loop."
        exit 3
        ;;
esac

echo ""
echo "Log: $RESULTS_TSV"
exit $RESULT
