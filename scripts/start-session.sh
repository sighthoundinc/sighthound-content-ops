#!/usr/bin/env bash
# start-session.sh — Register a timed autoresearch session.
#
# Writes deadline and current best metric to results/session.env so that
# check-time.sh and run-experiment.sh can enforce the budget.
#
# The agent MUST call this before its first experiment.
# run-experiment.sh will refuse to start if the deadline has passed (exit 3).
#
# Usage:
#   ./scripts/start-session.sh <max_hours> [current_best_metric]
#
# Examples:
#   ./scripts/start-session.sh 2 0.847
#   ./scripts/start-session.sh 4             # uses BASELINE_METRIC from research.env

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE="$REPO_ROOT/research.env"
RESULTS_DIR="$REPO_ROOT/results"
SESSION_FILE="$RESULTS_DIR/session.env"

MAX_HOURS="${1:-2}"

# Resolve current best metric: arg > research.env > 0
CURRENT_BEST="${2:-}"
if [ -z "$CURRENT_BEST" ] && [ -f "$ENV_FILE" ]; then
    # shellcheck source=/dev/null
    source "$ENV_FILE"
    CURRENT_BEST="${BASELINE_METRIC:-0}"
fi
CURRENT_BEST="${CURRENT_BEST:-0}"

mkdir -p "$RESULTS_DIR"

# Compute deadline (GNU date or BSD date)
if date -d "+${MAX_HOURS} hours" +%s &>/dev/null 2>&1; then
    DEADLINE=$(date -d "+${MAX_HOURS} hours" +%s)
else
    DEADLINE=$(date -v "+${MAX_HOURS}H" +%s)
fi

DEADLINE_STR=$(date -d "@$DEADLINE" '+%Y-%m-%d %H:%M:%S' 2>/dev/null \
           || date -r "$DEADLINE"   '+%Y-%m-%d %H:%M:%S')

cat > "$SESSION_FILE" << EOF
# AutoResearch session — written by start-session.sh
# Do not edit manually.
SESSION_DEADLINE=$DEADLINE
SESSION_BEST_METRIC=$CURRENT_BEST
SESSION_MAX_HOURS=$MAX_HOURS
EOF

echo "╔══════════════════════════════════════════════════════════════╗"
echo "║  AutoResearch session started                                 ║"
printf "║  Budget:   %-49s║\n" "${MAX_HOURS}h  (expires $DEADLINE_STR)"
printf "║  Best:     %-49s║\n" "$CURRENT_BEST"
printf "║  State:    %-49s║\n" "results/session.env"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""
echo "Agent: check time before EVERY experiment:"
echo "  ./scripts/check-time.sh || { echo 'Session over.'; exit 0; }"
