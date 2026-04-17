#!/usr/bin/env bash
# check-time.sh — Is the autoresearch session within its time budget?
#
# Exit codes:
#   0 — within budget (or no session registered — runs without limit)
#   1 — session has EXPIRED: agent MUST STOP, do not start another experiment
#
# Usage (call before every experiment):
#   ./scripts/check-time.sh || { echo "Session over."; exit 0; }
#
# The session deadline is written by start-session.sh to results/session.env.
# If no session file exists, this script exits 0 (unlimited mode).

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SESSION_FILE="$REPO_ROOT/results/session.env"

if [ ! -f "$SESSION_FILE" ]; then
    echo "⚠  No session registered (run start-session.sh to set a time limit)."
    exit 0
fi

# shellcheck source=/dev/null
source "$SESSION_FILE"

NOW=$(date +%s)
REMAINING=$(( SESSION_DEADLINE - NOW ))

if [ "$REMAINING" -le 0 ]; then
    EXPIRED_AGO=$(( -REMAINING / 60 ))
    echo "⏱  SESSION EXPIRED ${EXPIRED_AGO}m ago. Agent must stop immediately."
    echo "   Do NOT start another experiment. Summarise results and finish."
    exit 1
fi

REMAINING_H=$(( REMAINING / 3600 ))
REMAINING_M=$(( (REMAINING % 3600) / 60 ))

# Warn if less than one typical experiment's time (~20 min) remains
if [ "$REMAINING" -lt 1200 ]; then
    echo "⚠  Only ${REMAINING_H}h${REMAINING_M}m left — may not be enough for another run."
fi

echo "⏳ Time remaining: ${REMAINING_H}h${REMAINING_M}m  |  Best: ${SESSION_BEST_METRIC:-unknown}"
exit 0
