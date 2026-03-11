#!/bin/bash
# Post-edit hook: run TypeScript type check on modified files
# Only runs on .ts/.tsx files to avoid unnecessary checks

FILE="$CLAUDE_FILE_PATH"

if [[ "$FILE" == *.ts ]] || [[ "$FILE" == *.tsx ]]; then
  npx tsc --noEmit --pretty 2>&1 | head -20
  exit $?
fi

exit 0
