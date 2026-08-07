#!/usr/bin/env bash
# Capture roadmap walkthrough screenshots against the LOCAL dev server.
#
# Reads a plan file of lines:  name<TAB>url<TAB>selector
# and writes public/roadmap/shots/<name>.png, element-scoped to the selector.
#
# Why a script rather than ad-hoc commands: 19 entries need shots, the framing
# has to be consistent across all of them, and a rerun after a UI change should
# reproduce the same images rather than a new set of hand-aimed crops.
#
# The session cookie is imported once, after a first navigation, because the
# browser refuses a cookie whose domain does not match the current page.
set -uo pipefail

BROWSE="${BROWSE:-$HOME/.claude/skills/gstack/browse/dist/browse}"
BASE="${BASE:-http://localhost:3001}"
OUT="${OUT:-public/roadmap/shots}"
PLAN="${1:?usage: capture-roadmap-shots.sh <plan.tsv> [cookie-file]}"
COOKIE_FILE="${2:-}"

[ -x "$BROWSE" ] || { echo "browse binary not found at $BROWSE"; exit 1; }
mkdir -p "$OUT"

# Wide enough that cards render at their desktop layout (the existing shots are
# ~616px wide), tall enough that a long panel is fully in the page.
"$BROWSE" viewport 900x1600 >/dev/null 2>&1

if [ -n "$COOKIE_FILE" ] && [ -f "$COOKIE_FILE" ]; then
  "$BROWSE" goto "$BASE/dashboard" >/dev/null 2>&1
  "$BROWSE" cookie-import "$COOKIE_FILE" >/dev/null 2>&1
  echo "session imported"
fi

ok=0; fail=0
while IFS=$'\t' read -r name url sel; do
  case "$name" in ''|'#'*) continue ;; esac
  "$BROWSE" goto "$url" >/dev/null 2>&1
  sleep 4                                   # lazy panels + data fetches settle

  # Tag the target so the screenshot is element-scoped and stable, and assert it
  # exists before capturing: a missing selector must fail loudly, not silently
  # produce a full-page image that nobody notices is wrong.
  found=$("$BROWSE" js "(() => { const e = document.querySelector(\"$sel\"); if (e) e.setAttribute('data-shot','1'); return e ? 'YES' : 'NO'; })()" 2>/dev/null | tr -d '"' | tail -1)
  if [ "$found" != "YES" ]; then
    echo "  MISS  $name  ($sel on $url)"; fail=$((fail+1)); continue
  fi

  # Guard: the sandbox identity must never reach a published image.
  leak=$("$BROWSE" js "(() => { const e=document.querySelector('[data-shot=\"1\"]'); const t=e?e.innerText:''; return /Sandbox Test Agent|sandbox-test-agent|Do Not Publish/i.test(t) ? 'LEAK' : 'CLEAN'; })()" 2>/dev/null | tr -d '"' | tail -1)
  if [ "$leak" = "LEAK" ]; then
    echo "  LEAK  $name  (sandbox identity inside the frame, refusing)"; fail=$((fail+1)); continue
  fi

  "$BROWSE" screenshot "[data-shot='1']" "$OUT/$name.png" >/dev/null 2>&1
  if [ -s "$OUT/$name.png" ]; then
    dims=$(python3 -c "import struct;d=open('$OUT/$name.png','rb').read();w,h=struct.unpack('>II',d[16:24]);print(f'{w}x{h}')" 2>/dev/null)
    echo "  ok    $name  $dims"; ok=$((ok+1))
  else
    echo "  FAIL  $name  (screenshot empty)"; fail=$((fail+1))
  fi
done < "$PLAN"

echo "captured $ok, failed $fail"
[ "$fail" -eq 0 ]
