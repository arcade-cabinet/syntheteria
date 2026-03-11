# Research -- Agent Guide

External analysis informing Syntheteria's design. Competitor games, industry patterns, design references.

## Documents

| Document | Scope | Last Audited |
|----------|-------|-------------|
| `4X_ANALYSIS.md` | Comparative analysis of Civ VI, Stellaris, AoE IV, Factorio, RimWorld -- what they do well, what Syntheteria takes from each, what it does differently. **Annotated 2026-03-11** with adoption status for all 6 key takeaways, all 17 mechanics tier items, and the "Feel Complete" formula. | 2026-03-11 |

## Adoption Summary (2026-03-11)

### Key Takeaways (6 recommendations)

| Status | Count | Items |
|--------|-------|-------|
| ADOPTED + IMPLEMENTED | 3 | #1 Cascading dependency loop, #3 Physical/visible economy, #6 Onboarding through core loop |
| ADOPTED + PARTIALLY DONE | 2 | #2 Wealth-based threat scaling, #4 GOAP for AI governors |
| ACKNOWLEDGED + PARTIALLY ADDRESSED | 1 | #5 Common AI failures to avoid |

### Essential Mechanics Tiers (17 systems)

| Status | Tier 1 | Tier 2 | Tier 3 |
|--------|--------|--------|--------|
| IMPLEMENTED | 5 of 6 | 0 of 5 | 2 of 6 |
| PARTIALLY DONE | 0 | 4 of 5 | 3 of 6 |
| NOT STARTED | 0 | 1 of 5 | 1 of 6 |
| **Notes** | Victory paths implemented but missing UI | Economic specialization not started | Asymmetric factions not started |

### Biggest Remaining Gap

**Meaningful rivalry** (Feel Complete #5) -- Governor infrastructure exists but AI doesn't run the full game loop (harvest-compress-carry), GOAP doesn't trigger raids, and faction-vs-faction combat is not enabled. This is the single most impactful gap for the 4X experience.

## How to Use

Reference this analysis when making design decisions about:
- **Economy systems** -- Factorio's belt logistics vs Satisfactory's conveyor approach
- **AI opponents** -- Civ VI's agenda system vs Stellaris's faction AI
- **Victory conditions** -- how other 4X games handle multiple win paths
- **Pacing** -- early/mid/late game transitions across genres
- **Adoption status** -- check annotations before implementing a recommendation that may already be done

## Cross-References

- `docs/REMAINING-WORK.md` -- single source of truth for all incomplete work
- `docs/playtests/paper-playtest-report.md` -- playtest findings (annotated)
- `src/systems/registerSystems.ts` -- which systems are wired into the game loop
- `config/` -- all 40 JSON config files driving game balance
