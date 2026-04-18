#!/usr/bin/env bash
# init.sh -- scaffold user-territory layout for deft-autoresearch.
#
# Safe to re-run: existing files are never overwritten.
# Writes only to <repo-root>/autoresearch/, <repo-root>/vbrief/,
# <repo-root>/history/autoresearch/, and <repo-root>/LESSONS.md.
# Never modifies anything under deft/.
#
# Usage: deft/skills/deft-autoresearch/scripts/init.sh [hours]

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SKILL_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"

MAX_HOURS="${1:-2}"

autoresearch_dir="${REPO_ROOT}/autoresearch"
mkdir -p "${autoresearch_dir}/sessions"
mkdir -p "${REPO_ROOT}/vbrief"
mkdir -p "${REPO_ROOT}/history/autoresearch"

# --- research.env (user-owned config) -----------------------------------
if [[ ! -f "${autoresearch_dir}/research.env" ]]; then
  cp "${SKILL_DIR}/templates/research.env.example" "${autoresearch_dir}/research.env"
  echo "  created autoresearch/research.env (fill in TRAIN_CMD, METRIC_PATTERN, EDITABLE_FILES)"
else
  echo "  kept    autoresearch/research.env (already exists)"
fi

# --- program.md (user-owned strategy) -----------------------------------
if [[ ! -f "${autoresearch_dir}/program.md" ]]; then
  cp "${SKILL_DIR}/templates/program.template.md" "${autoresearch_dir}/program.md"
  echo "  created autoresearch/program.md (agent will fill in during Phase 1)"
else
  echo "  kept    autoresearch/program.md (already exists)"
fi

# --- .gitignore (session runtime noise) ---------------------------------
gitignore="${autoresearch_dir}/.gitignore"
if [[ ! -f "${gitignore}" ]]; then
  cat > "${gitignore}" <<'EOF'
# autoresearch runtime artifacts (noisy, per-machine)
sessions/*/autoresearch.tsv
sessions/*/last_experiment.log
sessions/*/run.log
# keep session.env tracked for reproducible resumes
!sessions/*/session.env
EOF
  echo "  created autoresearch/.gitignore"
fi

# --- LESSONS.md (repo-root promotion target) ----------------------------
if [[ ! -f "${REPO_ROOT}/LESSONS.md" ]]; then
  cat > "${REPO_ROOT}/LESSONS.md" <<'EOF'
# Lessons

Durable findings promoted from agent sessions (autoresearch, pre-PR, etc.).
This file lives at repo root so `deft-sync` never touches it.

Do NOT promote here from inside `deft/meta/lessons.md` -- that file is
framework territory and is owned by the Deft upstream.
EOF
  echo "  created LESSONS.md at repo root"
fi

# --- Branch detection ---------------------------------------------------
branch="$(git -C "${REPO_ROOT}" rev-parse --abbrev-ref HEAD 2>/dev/null || echo "unknown")"
if [[ "${branch}" == "main" || "${branch}" == "master" ]]; then
  echo ""
  echo "WARNING: you are on '${branch}'. Create a feature branch before starting a session:"
  echo "  git checkout -b autoresearch/<slug>-$(date +%Y-%m-%d)"
fi

# --- Agent hint ---------------------------------------------------------
echo ""
echo "deft-autoresearch initialised."
echo "Next steps:"
echo "  1. Edit autoresearch/research.env (TRAIN_CMD, METRIC_PATTERN, EDITABLE_FILES)"
echo "  2. Let the agent fill in autoresearch/program.md via Phase 1 exploration"
echo "  3. Approve the Phase 1.5 gate, then run:"
echo "       deft/skills/deft-autoresearch/scripts/start-session.sh ${MAX_HOURS} <baseline>"
