# balance/

Multi-tier balance harness — automated game simulation, statistical aggregation, and diagnostic gap detection.

## Rules
- **Pure TS** — no React, no rendering
- **Full state reset between runs** — AI runtime, victory, score, building upgrades, config overrides
- **Each run uses a unique seed** — for variance across the batch
- **Diagnostics detect real issues** — thresholds tuned to minimize false positives
- **Systems accept `world: World`** — never use a world singleton

## Public API
- `runBalanceTier(tier, turns, runs, overrides?)` → `BatchReport` — run a complete balance tier
- `runSingleGame(config)` → `RunResult` — execute one game simulation
- `aggregateRuns(runs, tier, turns, boardSize)` → `BatchReport` — compute statistical aggregates
- `diagnoseGaps(report)` → `Diagnostic[]` — detect balance pathologies
- `printBalanceSummary(report)` — human-readable console output

## Diagnostics
| Category | Severity | Trigger |
|----------|----------|---------|
| stagnation | warning | Metric unchanged for 3+ consecutive checkpoints |
| snowball | warning | One faction > 2× all others for 3+ checkpoints |
| resource_hoarding | info | Resources grow continuously without spending |
| elimination_cascade | critical | >50% factions eliminated before midpoint |
| victory_unreachable | warning | No faction near any victory threshold at end |
| epoch_pacing | warning | Epoch advancement slower than expected |
| cult_balance | warning/info | Cult too strong (>50% units) or too weak (<3 units late game) |
| faction_homogeneity | info | All factions score similarly (CV < 10%) |

## Files
| File | Purpose |
|------|---------|
| types.ts | Report, snapshot, aggregate, and diagnostic interfaces |
| runner.ts | Single-game execution with full state reset |
| aggregator.ts | Statistical aggregation (min/max/mean/stddev/median) |
| diagnostics.ts | Gap detection across 8 categories |
| index.ts | Public API + `runBalanceTier` orchestrator |
