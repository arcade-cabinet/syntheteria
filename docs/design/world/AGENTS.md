# World Design -- Agent Guide

Where the game takes place. The machine planet Ferrathis, its four competing robot factions, its indigenous inhabitants, and the environmental systems that shape gameplay.

## Documents

| Document | Scope | Key Topics |
|----------|-------|------------|
| `ENVIRONMENT.md` | Weather, biomes, hazards, processing cycles, terrain | 5 weather states (Markov chain transitions), 5 biome zones + 2 water types, storm intensity scaling, acid corrosion per material, processing cycles (seasonal system), terrain elevation/slope, bridges, sinkholes, lightning targeting, weather forecasting, weather-biome interaction matrix, weather effects on patron shipments. |
| `RACES.md` | 4 robot factions, lore, patrons, consciousness model, otter holograms | Reclaimers, Volt Collective, Signal Choir, Iron Creed. Visual identity (PBR materials per faction), racial passives, economic modifiers, governor GOAP weights, cube material affinity, starting conditions, base agency, military doctrine, matchup notes, 5 unique units + 5 unique buildings + 8 unique techs per faction. Home-planet patrons (SABLE, DYNAMO, RESONANCE, BASTION) with satisfaction system. Otter hologram projections (10 named SABLE projections). FC-7 player consciousness. Bot component-based assembly. Balance matrix. Narrative timeline (4B years). |
| `ALIENS.md` | Indigenous inhabitants, relationship system, integration path | Ferrovores (silicon-based metallivorous fauna): 5 unit types (Crystal Mite, Iron Drone, Silicate Stalker, Brood Matron, Lithivore Titan), 4 hive tiers, wealth-scaled raid system, threat scaling formula, Ferrovore AI decision tree, crystal resources and recipes. Residuals (sentient machine consciousness): Sentinel, Crawler, Colossus manifestation forms, communication via pattern, relationship scale (-100 to +100). Lore discovery stages (3-stage reveal). Integration Victory path (Resonance Protocol). Ferrovore-Residual conflict events. Faction-specific native policies. |

## Overlap Map

Content that appears in multiple documents, with rationale for each instance:

| Topic | Primary Location | Also Appears In | Rationale |
|-------|-----------------|-----------------|-----------|
| Biome definitions | `ENVIRONMENT.md` | `RACES.md` (biome table with lore names) | RACES.md adds lore names and "hidden truth" per biome; cross-references ENVIRONMENT.md for mechanics |
| Faction biome preferences | `ENVIRONMENT.md` | `config/biomes.json` | Kept in ENVIRONMENT.md because it's a biome property, cross-references RACES.md |
| Weather system | `ENVIRONMENT.md` | `RACES.md` (brief summary) | RACES.md adds lore framing (Convergence) and cross-references ENVIRONMENT.md for mechanics |
| Patron native policies | `ALIENS.md` (gameplay mechanics) | `RACES.md` (patron satisfaction bonuses) | Different angles: ALIENS.md covers Ferrovore interaction mechanics, RACES.md covers patron relationship |
| Planetary history timeline | `ALIENS.md` (Ferrovore/Residual perspective) | `RACES.md` (full timeline with faction dates) | RACES.md has the complete version; ALIENS.md focuses on pre-colonist era |
| Alien native territories per biome | `ALIENS.md` (detailed hive placement) | `ENVIRONMENT.md` (cross-reference), `config/biomes.json` (data) | ENVIRONMENT.md now cross-references rather than duplicating |

## Config Files

| Config | Controls | Status |
|--------|----------|--------|
| `config/biomes.json` | Biome definitions, weather states/transitions, processing cycles, terrain hazards/bridges, faction biome preferences, alien native territories, weather-biome interactions, storm intensity, forecasting, shipment effects | **Comprehensive** -- primary environment config |
| `config/weather.json` | Weather states, transition weights, storm intensity, acid rain | **Partially overlaps** biomes.json; code reads from this file |
| `config/terrain.json` | World size, water level, height layers, walk costs, biome colors | **4 biomes** vs 7 in biomes.json; uses short names |
| `config/civilizations.json` | 4 faction definitions: governor bias, unique abilities, unique unit/building, starting bonuses, multipliers | **Minimal** -- design spec in RACES.md is far more detailed |
| `config/enemies.json` | Feral bots, cultists, rogue AIs, ancient machines | **Stale** -- reflects Earth-based design, not Ferrathis |
| `config/environmentHazards.json` | Radiation zones, toxic spills, unstable ground, magnetic anomalies, scrap storms | **Different hazard set** from ENVIRONMENT.md; needs reconciliation |
| `config/deposits.json` | Ore deposit types, frequencies, yield ranges, biome preferences, scavenging | **Uses old biome names** (foundry, slag, cable, processor) |

## Code Files

| Source File | Purpose | Config Source |
|-------------|---------|--------------|
| `src/systems/weatherSystem.ts` | Weather state machine, Markov transitions, storm intensity, forecast | `config/weather.json` |
| `src/systems/biomeSystem.ts` | Biome modifiers, grid lookup, pathfinding | **Hardcoded** (should import from biomes.json) |
| `src/ecs/terrain.ts` | Procedural heightfield, fog of war, fragment system | `config/terrain.json` |

## Key Concepts

- **Machine planet Ferrathis** -- no vegetation, no water in the biological sense. "Hills" are slag heaps, "rivers" are chemical runoff, "forests" are broken antenna masts and cable bundles.
- **Processing cycles** -- the planet's equivalent of seasons. 5-phase cycle (Dormant -> Active -> Volatile -> Convergent -> Aftermath) escalating over ~60 minutes of game time.
- **Colonization framing** -- player is a colonial agent from a home-planet AI. Factions are rival colonial powers. Ferrathis is the "New World." Ferrovores are the indigenous population.
- **Residuals** -- indigenous machine consciousness predating colonists by a billion years. Not enemies by default. Can be traded with, allied, or fought. Guard the planet's deepest secrets.
- **Physical cube economy** -- wealth is visible, steal-able. Ferrovore raids scale with visible cube wealth. Patron shipments require stockpiling cubes, creating a tension between accumulation and defense.
- **Dual-origin planet** -- Ferrovore biological architecture (4B years) underneath Von Neumann mechanical infrastructure (3B years). Colonists mistake both for "ancient ruins."

## Known Issues (Config-Doc-Code Alignment)

1. **biomeSystem.ts hardcodes biome data** instead of loading from config/biomes.json
2. **config/enemies.json is stale** -- reflects Earth/cultist design, not Ferrathis
3. **config/environmentHazards.json has different hazards** than ENVIRONMENT.md and biomes.json
4. **config/terrain.json uses 4 old biome names** (foundry, slag, cable, processor) vs 7 in biomes.json
5. **config/civilizations.json governor weights differ** from RACES.md design spec (e.g., Reclaimers economy: 1.5 in config vs 1.2 in doc)
6. **No Ferrovore/Residual config exists** -- ALIENS.md is pure design spec awaiting implementation
7. **config/weather.json and config/biomes.json both define weather** -- dual source of truth
8. **docs/story/LORE_OVERVIEW.md is superseded** -- describes Earth-based design, now marked as such
