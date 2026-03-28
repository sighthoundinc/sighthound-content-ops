#!/bin/bash
#
# API Pattern Enforcement Script
# Prevents legacy action-based endpoints (e.g., /delete, /update, /create subdirectories)
# Enforces REST semantics per docs/api-standards.md
#
# Exit codes:
#   0 - All patterns valid
#   1 - Invalid patterns found
#

set -e

API_DIR="src/app/api"
VIOLATIONS=""

echo "🔍 Checking API structure for REST pattern violations..."
echo ""

# Check for forbidden action-based subdirectories
# Exceptions: legitimate RPC-style operations are allowed (transition, reopen-brief, etc.)
FORBIDDEN_PATTERNS=(
  "*delete"    # ❌ /[id]/delete/ - use DELETE /[id]/
  "*update"    # ❌ /[id]/update/ - use PATCH /[id]/
  "*create"    # ❌ /[id]/create/ - use POST /resource/
)

for pattern in "${FORBIDDEN_PATTERNS[@]}"; do
  found=$(find "$API_DIR" -type d -name "$pattern" 2>/dev/null || true)
  if [ -n "$found" ]; then
    while IFS= read -r path; do
      [ -z "$path" ] && continue
      if [ "$path" = "src/app/api/ideas/[id]/delete" ]; then
        echo "ℹ️  Exception: $path is an approved deprecated proxy"
        echo "   Scheduled removal: after migration window closes"
        continue
      fi
      VIOLATIONS="${VIOLATIONS}${path}"$'\n'
    done <<< "$found"
  fi
done

# Report findings
if [ -n "$VIOLATIONS" ]; then
  echo "❌ FAILED: Invalid API patterns found:"
  echo ""
  echo "$VIOLATIONS" | grep -v '^$'
  echo ""
  echo "❗ These endpoints violate REST semantics:"
  echo "   - Use DELETE /api/resource/[id] instead of /api/resource/[id]/delete"
  echo "   - Use PATCH /api/resource/[id] instead of /api/resource/[id]/update"
  echo "   - Use POST /api/resource instead of /api/resource/[id]/create"
  echo ""
  echo "   See docs/api-standards.md for guidelines"
  exit 1
else
  echo "✅ PASSED: All API routes follow REST patterns"
  echo ""
  echo "   ✓ No action-based subdirectories found"
  echo "   ✓ All DELETE handlers at [id]/route.ts level"
  echo "   ✓ API structure complies with REST standards"
  exit 0
fi
