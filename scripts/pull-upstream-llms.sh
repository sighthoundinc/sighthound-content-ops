#!/usr/bin/env bash
# Pull the current llms.txt + llms-full.txt from each upstream MkDocs
# repository into ./snapshots/ for local reference.
#
# These snapshots are read-only mirrors. The upstream repos
# (sighthoundinc/redactor-mkdocs and sighthoundinc/developer-portal-mkdocs)
# remain canonical for live serving via Cloudflare Pages / S3 + CloudFront.
#
# Usage: scripts/pull-upstream-llms.sh
# Requires: gh CLI, authenticated against github.com (gh auth status).

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SNAP="$ROOT/snapshots"

mkdir -p "$SNAP/redactor-mkdocs" "$SNAP/developer-portal-mkdocs"

fetch() {
  local repo="$1" branch="$2" path="$3" out="$4"
  gh api \
    -H "Accept: application/vnd.github.raw" \
    "/repos/$repo/contents/$path?ref=$branch" > "$out"
  printf '  %-46s  %s bytes\n' "$repo:$path" "$(wc -c < "$out" | tr -d ' ')"
}

echo "Pulling upstream llms.txt + llms-full.txt..."
fetch "sighthoundinc/redactor-mkdocs"         main docs/llms.txt      "$SNAP/redactor-mkdocs/llms.txt"
fetch "sighthoundinc/redactor-mkdocs"         main docs/llms-full.txt "$SNAP/redactor-mkdocs/llms-full.txt"
fetch "sighthoundinc/developer-portal-mkdocs" main docs/llms.txt      "$SNAP/developer-portal-mkdocs/llms.txt"
fetch "sighthoundinc/developer-portal-mkdocs" main docs/llms-full.txt "$SNAP/developer-portal-mkdocs/llms-full.txt"

echo
echo "Done. Run 'git -C \"$ROOT\" status snapshots/' to see drift."
