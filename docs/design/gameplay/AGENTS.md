# Gameplay Design — Agent Guide

What the player DOES. Core loop, economy, combat, progression, win conditions.

## Documents

| Document | Scope | Key Topics |
|----------|-------|------------|
| `OVERVIEW.md` | Game concept, vision, colonization model, 4X pillars, design philosophy | What is Syntheteria? Why first-person? The colonization tension. High-level only — details live in the other docs. |
| `MECHANICS.md` | Core loop — grind → compress → carry → furnace → build | Harvesting, compression, grabbing, belt transport, power grid, processing, fabrication. All 12 material types. |
| `MATERIALS.md` | Complete physical cube economy specification | 9 raw + 3 processed materials, extraction rates, furnace recipes, building costs, raid scaling, patron shipments, AI economy, all economy formulas. **Authoritative for material balance.** |
| `COMBAT.md` | FPS combat, bot armies, hacking, raids, defense, turrets | Damage model (config-verified), hack mechanics, raid behavior state machine, siege warfare, alien natives, ancient machines. Contains Section 14 formula reference. |
| `PROGRESSION.md` | Tech tree (5 tiers), unlock paths, difficulty curve, research mechanics | Tier breakdown, research costs, unlock dependencies, 5-act journey pacing. Cross-references config/technology.json explicitly. |
| `VICTORY.md` | 8 victory conditions, 3-act pacing, storm progression, counter-play | Colonial, Domination, Economic, Technology, Diplomatic, Integration, Survival, Story. Contains all AI governor evaluator formulas, Victory Progress Panel spec. |

## Config Files

These JSON files control gameplay balance — docs reference them but don't duplicate values:

| Config | Controls |
|--------|----------|
| `config/mining.json` | Ore extraction rates, deposit sizes, drill tiers |
| `config/furnace.json` | Furnace recipes, processing times, compression configs |
| `config/cubeMaterials.json` | Cube material properties (name, value, color, PBR) |
| `config/buildings.json` | Building types, power requirements, costs |
| `config/combat.json` | Damage, ranges, cooldowns, raid thresholds, bot stats, wall HP |
| `config/technology.json` | Tech tree tiers, research costs, unlock gates |
| `config/economy.json` | Wealth brackets, trade rates |
| `config/quests.json` | Quest progression, otter dialogue |
| `config/victory.json` | Victory condition thresholds, hold durations, storm phases, tiebreaker order |

## Canonical Authority

| Question | Authoritative Source |
|----------|---------------------|
| What materials exist and their values? | MATERIALS.md (Section 2) + config/mining.json + config/furnace.json |
| Combat damage numbers? | COMBAT.md (Section 3) + config/combat.json |
| Furnace recipes? | config/furnace.json (MECHANICS.md summarizes) |
| Victory thresholds? | VICTORY.md + config/victory.json |
| Tech tree structure? | PROGRESSION.md + config/technology.json |
| Compression timings? | config/furnace.json compression.configs |

## Cross-References

- For technical decisions and migration history: `docs/design/DECISIONS.md`
- For open/unresolved design questions: `docs/design/OPEN_QUESTIONS.md`
- For combat damage formulas and hacking math: `COMBAT.md` Section 14
- For material economy formulas: `MATERIALS.md` and `docs/technical/CORE_FORMULAS.md` (note: CORE_FORMULAS.md has gaps flagged in OPEN_QUESTIONS.md)
