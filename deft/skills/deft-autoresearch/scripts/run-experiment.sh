#!/usr/bin/env bash
# run-experiment.sh -- run VERIFY_CMD then TRAIN_CMD and extract the metric.
#
# This is a SINGLE-iteration runner. autoresearch.sh wraps it with the
# commit/restore ratchet. It does not modify any files or git state.
#
# Exit 0 → metric improved by ≥ MIN_DELTA (caller should commit)
# Exit 1 → metric did not improve (caller should restore)
# Exit 2 → VERIFY_CMD failed or TRAIN_CMD crashed / metric not extracted
# Exit 3 → deadline exceeded before starting (hard time check)
#
# Writes: autoresearch/sessions/<id>/last_experiment.log
#         autoresearch/sessions/<id>/last_metric

set -euo pipefail

REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "${REPO_ROOT}"

config="${REPO_ROOT}/autoresearch/research.env"
# shellcheck disable=SC1090
source "${config}"

current_session_file="${REPO_ROOT}/autoresearch/.current-session"
session_id="$(cat "${current_session_file}")"
session_dir="${REPO_ROOT}/autoresearch/sessions/${session_id}"
# shellcheck disable=SC1091
source "${session_dir}/session.env"

log="${session_dir}/last_experiment.log"
metric_out="${session_dir}/last_metric"
: > "${log}"

# --- Hard deadline gate -------------------------------------------------
now_epoch="$(date +%s)"
if (( now_epoch >= DEADLINE_EPOCH )); then
  echo "HARD GATE: deadline exceeded; refusing to start experiment" | tee -a "${log}" >&2
  exit 3
fi

# --- Phase A: VERIFY_CMD (lint/typecheck/test gate) ---------------------
verify_cmd="${VERIFY_CMD:-task check}"
echo "=== VERIFY_CMD: ${verify_cmd} ===" | tee -a "${log}"
if ! bash -c "${verify_cmd}" >> "${log}" 2>&1; then
  echo "VERIFY_CMD failed -- discarding change" | tee -a "${log}" >&2
  echo "verify_failed" > "${metric_out}"
  exit 1
fi

# --- Phase B: TRAIN_CMD -------------------------------------------------
echo "=== TRAIN_CMD: ${TRAIN_CMD} ===" | tee -a "${log}"
if ! bash -c "${TRAIN_CMD}" >> "${log}" 2>&1; then
  echo "TRAIN_CMD crashed -- see ${log}" | tee -a "${log}" >&2
  exit 2
fi

# --- Phase C: Metric extraction -----------------------------------------
metric="$(python3 - "${METRIC_PATTERN}" "${log}" <<'PY'
import re, sys, pathlib
pattern = sys.argv[1]
text = pathlib.Path(sys.argv[2]).read_text(errors="replace")
matches = re.findall(pattern, text)
if not matches:
    sys.exit(4)
# take the last occurrence so late-reported final metrics win
value = matches[-1]
if isinstance(value, tuple):
    value = value[0]
print(value)
PY
)" || {
  echo "metric extraction failed: pattern=${METRIC_PATTERN}" | tee -a "${log}" >&2
  exit 2
}

echo "${metric}" > "${metric_out}"
echo "extracted metric: ${metric} (best so far: ${BEST_METRIC})"

# --- Phase D: Ratchet comparison ----------------------------------------
cmp="$(python3 - "${metric}" "${BEST_METRIC}" "${MIN_DELTA}" "${METRIC_DIRECTION}" <<'PY'
import sys
new, best, min_delta, direction = sys.argv[1:]
new = float(new); best = float(best); min_delta = float(min_delta)
if direction == "higher":
    delta = new - best
else:
    delta = best - new
print("improved" if delta >= min_delta else "no_change")
PY
)"

if [[ "${cmp}" == "improved" ]]; then
  exit 0
else
  exit 1
fi
