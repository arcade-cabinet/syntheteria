# factions/

Faction and cult definitions, world initialization, and inter-faction relations.

## Rules
- **Definitions are static data** — `FACTION_DEFINITIONS` and `CULT_DEFINITIONS` are readonly
- **Relations are runtime state** — `setRelation`, `modifyStanding` mutate live state
- **`initFactions()` spawns faction entities** — called once during world setup
- **Standing is numeric (-100..+100)** — mapped to `RelationType` via thresholds

## Public API
- `FACTION_DEFINITIONS` — readonly array of `FactionDef` (id, name, color, persona)
- `CULT_DEFINITIONS` — readonly array of `CultDef` (sect definitions)
- `initFactions(world, config)` — create faction entities in the ECS world
- `getRelation()`, `setRelation()`, `isHostile()` — relation queries
- `getStanding()`, `modifyStanding()`, `setStanding()` — numeric standing
- `relationFromStanding(score)` — convert numeric to ally/neutral/hostile

## Files
| File | Purpose |
|------|---------|
| definitions.ts | `FACTION_DEFINITIONS` — player/AI faction data |
| cults.ts | `CULT_DEFINITIONS` — EL Cult sect data |
| init.ts | `initFactions()` — ECS entity creation |
| relations.ts | Diplomatic relation state + queries |
| types.ts | `FactionDef`, `CultDef` interfaces |
