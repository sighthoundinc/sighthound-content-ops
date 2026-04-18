#!/usr/bin/env bash
# measure-route-bundle.sh — Run `next build` and emit the specified route's
# bundle size as canonical metric lines the autoresearch ratchet can parse.
#
# Usage:
#   ./autoresearch/scripts/measure-route-bundle.sh <route>
#
# Examples:
#   ./autoresearch/scripts/measure-route-bundle.sh /
#   ./autoresearch/scripts/measure-route-bundle.sh /login
#   ./autoresearch/scripts/measure-route-bundle.sh /dashboard
#
# Output contract (stdout, always):
#   ROUTE_PAGE_SIZE_KB=<float>        # primary metric (route-specific chunk)
#   ROUTE_FIRST_LOAD_KB=<float>       # secondary (includes shared chunks)
#
# Exit codes:
#   0 — build succeeded and both metrics were extracted
#   1 — invalid arguments
#   2 — build failed OR the route row could not be parsed

set -uo pipefail

if [ $# -lt 1 ]; then
    echo "Usage: $0 <route>" >&2
    echo "  e.g.: $0 /" >&2
    echo "        $0 /login" >&2
    exit 1
fi

ROUTE="$1"

REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$REPO_ROOT"

BUILD_LOG="$(mktemp -t next-build-XXXXXX.log)"
trap 'rm -f "$BUILD_LOG"' EXIT

echo "▶ Running next build for route '$ROUTE' (log: $BUILD_LOG)"
if ! npm run build >"$BUILD_LOG" 2>&1; then
    echo "✗ next build failed. Last 30 lines:"
    tail -30 "$BUILD_LOG"
    exit 2
fi

python3 - "$BUILD_LOG" "$ROUTE" <<'PYEOF'
import re
import sys

log_path = sys.argv[1]
route = sys.argv[2]

with open(log_path, "r", encoding="utf-8", errors="replace") as fh:
    raw = fh.read()

# Strip ANSI color codes.
ansi = re.compile(r"\x1b\[[0-9;]*[A-Za-z]")
clean = ansi.sub("", raw)

# Find the row for the exact route. Route token must be surrounded by
# whitespace and not followed by another path segment. Root "/" is special:
# match "/" followed by whitespace (not "/foo").
if route == "/":
    row_re = re.compile(r"\s/(?:\s|$)")
else:
    esc = re.escape(route)
    row_re = re.compile(rf"\s{esc}(?:\s|$)")

route_row = None
for line in clean.splitlines():
    if row_re.search(line):
        route_row = line
        break

if route_row is None:
    print(f"✗ Could not find '{route}' row in next build output.", file=sys.stderr)
    print("--- last 40 lines of build log ---", file=sys.stderr)
    print("\n".join(clean.splitlines()[-40:]), file=sys.stderr)
    sys.exit(2)

# Extract the two size fields. Next prints them as e.g. "9.79 kB", "812 B",
# "1.2 MB". Normalize to KB so the metric pattern is unit-independent.
size_re = re.compile(r"([0-9]+(?:\.[0-9]+)?)\s*(B|kB|KB|MB)\b")
sizes = size_re.findall(route_row)

if len(sizes) < 2:
    print(
        f"✗ Expected 2 size fields on '{route}' row, got {len(sizes)}: {route_row!r}",
        file=sys.stderr,
    )
    sys.exit(2)


def to_kb(value: str, unit: str) -> float:
    v = float(value)
    u = unit.upper()
    if u == "B":
        return v / 1024.0
    if u == "KB":
        return v
    if u == "MB":
        return v * 1024.0
    return v


page_kb = to_kb(*sizes[0])
first_load_kb = to_kb(*sizes[1])

print(f"ROUTE_PAGE_SIZE_KB={page_kb:.3f}")
print(f"ROUTE_FIRST_LOAD_KB={first_load_kb:.3f}")
print(f"▶ '{route}' row: {route_row.strip()}")
PYEOF
PY_EXIT=$?

if [ $PY_EXIT -ne 0 ]; then
    exit 2
fi

exit 0
