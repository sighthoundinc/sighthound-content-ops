#!/usr/bin/env bash
# check-time.sh -- soft time-budget check.
#
# Exit 0 → continue the loop
# Exit 1 → deadline reached; agent should stop and enter Phase 3 (wrap-up)
# Exit 2 → config error (no active session)

set -euo pipefail

REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
current_session_file="${REPO_ROOT}/autoresearch/.current-session"

if [[ ! -f "${current_session_file}" ]]; then
  echo "error: no active session (${current_session_file} missing). Run start-session.sh." >&2
  exit 2
fi

session_id="$(cat "${current_session_file}")"
session_env="${REPO_ROOT}/autoresearch/sessions/${session_id}/session.env"

if [[ ! -f "${session_env}" ]]; then
  echo "error: session file ${session_env} missing." >&2
  exit 2
fi

# shellcheck disable=SC1090
source "${session_env}"

now_epoch="$(date +%s)"
if (( now_epoch >= DEADLINE_EPOCH )); then
  remaining=$(( now_epoch - DEADLINE_EPOCH ))
  echo "deadline reached (${remaining}s past). stop the loop." >&2
  exit 1
fi

remaining_s=$(( DEADLINE_EPOCH - now_epoch ))
remaining_m=$(( remaining_s / 60 ))
echo "continue: ${remaining_m}m remaining (best: ${BEST_METRIC})"
exit 0
