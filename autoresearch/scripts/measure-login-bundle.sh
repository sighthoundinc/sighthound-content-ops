#!/usr/bin/env bash
# measure-login-bundle.sh — Run `next build` and emit the /login bundle size
# as a single canonical metric line the autoresearch ratchet can parse.
#
# Output contract (stdout, always):
#   LOGIN_PAGE_SIZE_KB=<float>        # primary metric (login-route chunk)
#   LOGIN_FIRST_LOAD_KB=<float>       # secondary (includes shared chunks)
#
# Exit codes:
#   0 — build succeeded and both metrics were extracted
#   2 — build failed OR the /login row could not be parsed
#
# Usage: ./autoresearch/scripts/measure-login-bundle.sh

set -uo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$REPO_ROOT"

BUILD_LOG="$(mktemp -t next-build-XXXXXX.log)"
trap 'rm -f "$BUILD_LOG"' EXIT

echo "▶ Running next build (logging to $BUILD_LOG)"
if ! npm run build >"$BUILD_LOG" 2>&1; then
    echo "✗ next build failed. Last 30 lines:"
    tail -30 "$BUILD_LOG"
    exit 2
fi

# Parse the /login row. Next prints the route table with box-drawing glyphs and
# ANSI colors; we strip ANSI first, then find a line that contains a whitespace
# /login token (not /login/foo), and extract the two size columns.
python3 - "$BUILD_LOG" <<'PYEOF'
import re
import sys

log_path = sys.argv[1]
with open(log_path, "r", encoding="utf-8", errors="replace") as fh:
    raw = fh.read()

# Strip ANSI color codes.
ansi = re.compile(r"\x1b\[[0-9;]*[A-Za-z]")
clean = ansi.sub("", raw)

# Find the /login row. Must be exactly /login (not /login/foo).
# Next output looks like: "├ ○ /login      9.79 kB    175 kB"
login_row = None
for line in clean.splitlines():
    # Route token surrounded by whitespace, not followed by '/'
    if re.search(r"\s/login(?:\s|$)", line):
        login_row = line
        break

if login_row is None:
    print("✗ Could not find /login row in next build output.", file=sys.stderr)
    print("--- last 40 lines of build log ---", file=sys.stderr)
    print("\n".join(clean.splitlines()[-40:]), file=sys.stderr)
    sys.exit(2)

# Extract the two size fields. Size strings are like "9.79 kB", "812 B", "1.2 MB".
size_re = re.compile(r"([0-9]+(?:\.[0-9]+)?)\s*(B|kB|KB|MB)\b")
sizes = size_re.findall(login_row)

if len(sizes) < 2:
    print(f"✗ Expected 2 size fields on /login row, got {len(sizes)}: {login_row!r}",
          file=sys.stderr)
    sys.exit(2)


def to_kb(value: str, unit: str) -> float:
    v = float(value)
    u = unit.upper()
    if u == "B":
        return v / 1024.0
    if u in ("KB",):
        return v
    if u == "MB":
        return v * 1024.0
    return v  # fallback


page_kb = to_kb(*sizes[0])
first_load_kb = to_kb(*sizes[1])

# Canonical machine-readable lines for the ratchet regex.
print(f"LOGIN_PAGE_SIZE_KB={page_kb:.3f}")
print(f"LOGIN_FIRST_LOAD_KB={first_load_kb:.3f}")

# Human-readable echo.
print(f"▶ /login row: {login_row.strip()}")
PYEOF
PY_EXIT=$?

if [ $PY_EXIT -ne 0 ]; then
    exit 2
fi

exit 0
