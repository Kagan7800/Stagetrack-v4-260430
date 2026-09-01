#!/usr/bin/env bash
# Installs the Antigravity review ruleset into a project.
# Usage:  ./install.sh /path/to/your-project
set -euo pipefail

DEST="${1:-}"
[ -z "$DEST" ] && { echo "usage: $0 /path/to/your-project"; exit 1; }
[ -d "$DEST" ] || { echo "error: $DEST is not a directory"; exit 1; }

SRC="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

FILES=(
  "GEMINI.md"
  "AGENTS.md"
  ".agents/rules/layout-performance.md"
  ".agents/workflows/code-review-repair.md"
  ".agents/workflows/launch-readiness.md"
)

# Refuse to clobber anything that already exists.
CONFLICT=0
for f in "${FILES[@]}"; do
  if [ -e "$DEST/$f" ]; then echo "EXISTS (not overwritten): $DEST/$f"; CONFLICT=1; fi
done
[ "$CONFLICT" -eq 1 ] && { echo; echo "Resolve the conflicts above, then re-run."; exit 1; }

# Warn about the legacy singular folder.
[ -d "$DEST/.agent" ] && echo "WARNING: $DEST/.agent exists (legacy name). Merge or remove it — having both is ambiguous."

mkdir -p "$DEST/.agents/rules" "$DEST/.agents/workflows"
for f in "${FILES[@]}"; do
  cp "$SRC/$f" "$DEST/$f"
  printf "installed  %-42s %6d chars\n" "$f" "$(wc -c < "$DEST/$f")"
done

echo
echo "Verify (expected checksums):"
echo "  67aec7fb066b  GEMINI.md                                  3180"
echo "  34e47ac42a43  AGENTS.md                                  9426"
echo "  19d4aea30385  .agents/rules/layout-performance.md        5655"
echo "  fd6330893e5f  .agents/workflows/code-review-repair.md    6323"
echo "  610192079b8a  .agents/workflows/launch-readiness.md      4499"
echo
echo "Actual:"
cd "$DEST" && for f in "${FILES[@]}"; do
  printf "  %s  %-42s %6d\n" "$(md5sum "$f" | cut -c1-12)" "$f" "$(wc -c < "$f")"
done

cat <<'NOTE'

Next:
  1. Customizations -> Rules: set GEMINI.md and AGENTS.md to "Always On";
     layout-performance.md to "Model Decision".
  2. Type "/" in the agent chat; confirm code-review-repair and
     launch-readiness appear.
  3. git add GEMINI.md AGENTS.md .agents && git commit
NOTE
