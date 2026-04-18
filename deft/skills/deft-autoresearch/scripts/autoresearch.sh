#!/usr/bin/env bash
# autoresearch.sh -- ONE iteration of the research loop.
#
# Non-interactive. The agent provides the outer loop.
#
# Pre-condition: the agent has made a change to EDITABLE_FILES in the
# working tree. This script does not stage or unstage anything itself;
# it stages the whitelisted paths only when committing.
#
# Exit 0 → experiment kept (git commit created)
# Exit 1 → experiment discarded (git restore ran)
# Exit 2 → crash / verify failure / metric extraction failure
# Exit 3 → deadline reached (hard gate in run-experiment.sh)
#
# Usage: autoresearch.sh "<short description of change>"

set -euo pipefail

if [[ $# -lt 1 ]]; then
  echo "usage: autoresearch.sh \"<description>\"" >&2
  exit 2
fi

DESC="$1"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
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

tsv="${session_dir}/autoresearch.tsv"

# --- Soft pre-check -----------------------------------------------------
if ! "${SCRIPT_DIR}/check-time.sh" >/dev/null; then
  echo "check-time.sh indicated deadline; skipping experiment."
  exit 3
fi

# --- Count current iteration --------------------------------------------
iter="$(awk 'END{print NR-1}' "${tsv}")"  # TSV has header + baseline; iter 1 is the first real experiment
iter=$((iter))

# --- Run the experiment (VERIFY_CMD → TRAIN_CMD → metric) ---------------
rc=0
"${SCRIPT_DIR}/run-experiment.sh" || rc=$?

metric="$(cat "${session_dir}/last_metric" 2>/dev/null || echo "n/a")"
short_sha="n/a"
verify_status="pass"

case "${rc}" in
  0)
    # improved → stage only EDITABLE_FILES and commit
    # shellcheck disable=SC2086
    git add -- ${EDITABLE_FILES} || true
    git commit -m "experiment: ${DESC} (${metric})" >/dev/null
    short_sha="$(git rev-parse --short HEAD)"
    status="keep"

    # Update best metric in session.env + vBRIEF
    tmp="$(mktemp)"
    awk -v m="${metric}" '
      /^BEST_METRIC=/ { print "BEST_METRIC=\"" m "\""; next }
      { print }
    ' "${session_dir}/session.env" > "${tmp}" && mv "${tmp}" "${session_dir}/session.env"

    vbrief="${REPO_ROOT}/vbrief/autoresearch-${session_id}.vbrief.json"
    python3 - "${vbrief}" "${iter}" "${short_sha}" "${metric}" "${DESC}" <<'PY'
import json, sys, pathlib
path, iteration, sha, metric, desc = sys.argv[1:]
p = pathlib.Path(path)
data = json.loads(p.read_text())
data["best_metric"] = metric
data.setdefault("iterations", []).append({
  "iter": int(iteration),
  "sha": sha,
  "metric": metric,
  "status": "keep",
  "description": desc,
})
p.write_text(json.dumps(data, indent=2) + "\n")
PY
    ;;

  1)
    # not-improved OR verify failed → restore working tree
    # shellcheck disable=SC2086
    git restore -- ${EDITABLE_FILES} || true
    status="discard"
    if [[ "${metric}" == "verify_failed" ]]; then
      verify_status="fail"
    fi
    ;;

  2)
    # crash / metric extraction failed
    # shellcheck disable=SC2086
    git restore -- ${EDITABLE_FILES} || true
    status="crash"
    metric="0"
    verify_status="skipped"
    ;;

  3)
    echo "deadline reached inside run-experiment.sh"
    exit 3
    ;;

  *)
    # unknown → conservative restore
    # shellcheck disable=SC2086
    git restore -- ${EDITABLE_FILES} || true
    status="crash"
    metric="0"
    verify_status="unknown(rc=${rc})"
    ;;
esac

# --- Append to TSV -------------------------------------------------------
printf "%s\t%s\t%s\t%s\t%s\t%s\n" \
  "${iter}" "${short_sha}" "${metric}" "${status}" "${verify_status}" "${DESC}" \
  >> "${tsv}"

# --- Human-readable status line -----------------------------------------
echo "Exp #${iter} | ${DESC} | ${status} | metric=${metric} | verify=${verify_status}"
exit "${rc}"
