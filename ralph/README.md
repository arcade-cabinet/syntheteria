# Ralph — Autonomous AI Development Loop

Ralph drives Cursor Agent to implement features from the PRD. Set up for **syntheteria-1-0**.

## Quick Start

```bash
# 1. Install Maestro CLI (for E2E tests)
curl -Ls "https://get.maestro.mobile.dev" | bash

# 2. Install Ralph deps (jq, tmux, coreutils)
brew install jq tmux coreutils

# 3. Start the loop
./ralph/start.sh syntheteria-1-0 --monitor
```

## Project: syntheteria-1-0

- **PRD**: `ralph/projects/syntheteria-1-0/prd.md`
- **Tasks**: `ralph/projects/syntheteria-1-0/prd.json` (25 user stories)
- **Progress**: `ralph/projects/syntheteria-1-0/progress.txt`

Covers all remaining work from GAMEPLAN_1_0, progress.md, PLAYWRIGHT_TO_MAESTRO_MIGRATION, and activeContext.

## Commands

| Command | Purpose |
|---------|---------|
| `./ralph/start.sh syntheteria-1-0` | Run Ralph loop (picks next story, runs agent) |
| `./ralph/start.sh syntheteria-1-0 --monitor` | Run with tmux + live status |
| `./ralph/start.sh syntheteria-1-0 --status` | Show project status |
| `./ralph/convert.sh syntheteria-1-0` | Regenerate prd.json from prd.md (uses Cursor Agent) |

## Quality Gates (per story)

- `pnpm tsc`
- `pnpm lint`
- `pnpm test`

## Source

From [danielsinewe/ralph-cursor](https://github.com/danielsinewe/ralph-cursor). Uses Cursor Agent by default.
