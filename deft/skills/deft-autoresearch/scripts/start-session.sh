#!/usr/bin/env bash
# start-session.sh -- register a timed autoresearch session.
#
# Creates autoresearch/sessions/<session-id>/session.env with deadline
# and baseline, initialises the experiment TSV, and emits a vBRIEF stub
# at vbrief/autoresearch-<session-id>.vbrief.json for resume support.
#
# Usage: start-session.sh <hours> <baseline_metric>

set -euo pipefail

if [[ $# -lt 2 ]]; then
  echo "usage: start-session.sh <hours> <baseline_metric>" >&2
  exit 2
fi

MAX_HOURS="$1"
BASELINE="$2"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "${REPO_ROOT}"

config="${REPO_ROOT}/autoresearch/research.env"
if [[ ! -f "${config}" ]]; then
  echo "error: ${config} not found -- run init.sh first" >&2
  exit 2
fi

# shellcheck disable=SC1090
source "${config}"

# --- Session identity ---------------------------------------------------
timestamp="$(date -u +%Y-%m-%dT%H%M%SZ)"
slug="${SESSION_SLUG:-session}"
session_id="${timestamp}-${slug}"
session_dir="${REPO_ROOT}/autoresearch/sessions/${session_id}"
mkdir -p "${session_dir}"

# --- Deadline math ------------------------------------------------------
now_epoch="$(date +%s)"
# awk handles fractional hours; macOS date can't do `-d +N hours` portably
deadline_epoch="$(awk -v n="${now_epoch}" -v h="${MAX_HOURS}" 'BEGIN { printf "%d\n", n + (h * 3600) }')"

# --- session.env (checked in; reproducible) -----------------------------
cat > "${session_dir}/session.env" <<EOF
SESSION_ID="${session_id}"
STARTED_AT="${timestamp}"
DEADLINE_EPOCH="${deadline_epoch}"
MAX_HOURS="${MAX_HOURS}"
BASELINE_METRIC="${BASELINE}"
BEST_METRIC="${BASELINE}"
METRIC_DIRECTION="${METRIC_DIRECTION}"
MIN_DELTA="${MIN_DELTA}"
BASELINE_GIT_SHA="$(git rev-parse HEAD)"
BRANCH="$(git rev-parse --abbrev-ref HEAD)"
EOF

# --- TSV header (gitignored; local runtime noise) -----------------------
tsv="${session_dir}/autoresearch.tsv"
printf "iter\tcommit\tmetric\tstatus\tverify\tdescription\n" > "${tsv}"
printf "0\t%s\t%s\tkeep\tbaseline\tbaseline\n" "$(git rev-parse --short HEAD)" "${BASELINE}" >> "${tsv}"

# --- vBRIEF stub for resume ---------------------------------------------
vbrief="${REPO_ROOT}/vbrief/autoresearch-${session_id}.vbrief.json"
cat > "${vbrief}" <<EOF
{
  "kind": "autoresearch.session",
  "session_id": "${session_id}",
  "started_at": "${timestamp}",
  "deadline_epoch": ${deadline_epoch},
  "max_hours": ${MAX_HOURS},
  "baseline_metric": "${BASELINE}",
  "best_metric": "${BASELINE}",
  "metric_direction": "${METRIC_DIRECTION}",
  "min_delta": "${MIN_DELTA}",
  "branch": "$(git rev-parse --abbrev-ref HEAD)",
  "baseline_sha": "$(git rev-parse HEAD)",
  "status": "active",
  "iterations": []
}
EOF

# --- Plan archive -------------------------------------------------------
plan_archive="${REPO_ROOT}/history/autoresearch/plan-$(date -u +%Y-%m-%d)-${slug}.md"
if [[ ! -f "${plan_archive}" ]]; then
  mkdir -p "$(dirname "${plan_archive}")"
  if [[ -f "${REPO_ROOT}/autoresearch/program.md" ]]; then
    cp "${REPO_ROOT}/autoresearch/program.md" "${plan_archive}"
  fi
fi

# --- Export session-id for subsequent scripts ---------------------------
echo "${session_id}" > "${REPO_ROOT}/autoresearch/.current-session"

echo "session: ${session_id}"
echo "deadline: $(date -r "${deadline_epoch}" -u +%Y-%m-%dT%H:%M:%SZ 2>/dev/null || date -u -d "@${deadline_epoch}" +%Y-%m-%dT%H:%M:%SZ)"
echo "baseline: ${BASELINE} (${METRIC_DIRECTION} is better, MIN_DELTA=${MIN_DELTA})"
echo "tsv: autoresearch/sessions/${session_id}/autoresearch.tsv"
