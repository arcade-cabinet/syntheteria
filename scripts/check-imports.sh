#!/usr/bin/env bash
# scripts/check-imports.sh — Architectural import gate enforcement
#
# Run: bash scripts/check-imports.sh
# CI:  Add to pnpm verify or run standalone
#
# Rules enforced:
#   1. systems/ and traits/ must NOT import from views/
#   2. No imports from pending/
#   3. No imports from the deleted view/ (singular) package

set -euo pipefail

errors=0

echo "=== Import Gate Check ==="

# Rule 1: systems/ and traits/ must not import views/
echo ""
echo "Rule 1: systems/ + traits/ must not import views/"
violations=$(rg 'from ["'"'"'].*\/views' src/systems/ src/traits/ --glob '*.{ts,tsx}' 2>/dev/null || true)
if [ -n "$violations" ]; then
  echo "  FAIL — systems/traits importing from views/:"
  echo "$violations"
  errors=$((errors + 1))
else
  echo "  PASS"
fi

# Rule 2: No imports from pending/
echo ""
echo "Rule 2: No imports from pending/"
violations=$(rg 'from ["'"'"'].*pending\/' src/ --glob '*.{ts,tsx}' 2>/dev/null || true)
if [ -n "$violations" ]; then
  echo "  FAIL — imports from pending/:"
  echo "$violations"
  errors=$((errors + 1))
else
  echo "  PASS"
fi

# Rule 3: No imports from deleted view/ (singular) package
echo ""
echo "Rule 3: No imports from deleted src/view/"
violations=$(rg 'from ["'"'"'].*\/view["'"'"']' src/ --glob '*.{ts,tsx}' 2>/dev/null || true)
if [ -n "$violations" ]; then
  echo "  FAIL — stale imports from view/:"
  echo "$violations"
  errors=$((errors + 1))
else
  echo "  PASS"
fi

# Rule 4: No imports from deleted rendering/ package
echo ""
echo "Rule 4: No imports from deleted src/rendering/"
violations=$(rg 'from ["'"'"'].*\/rendering["'"'"']' src/ --glob '*.{ts,tsx}' 2>/dev/null || true)
if [ -n "$violations" ]; then
  echo "  FAIL — stale imports from rendering/:"
  echo "$violations"
  errors=$((errors + 1))
else
  echo "  PASS"
fi

echo ""
if [ "$errors" -gt 0 ]; then
  echo "=== $errors rule(s) violated ==="
  exit 1
else
  echo "=== All import gates pass ==="
  exit 0
fi
