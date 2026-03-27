# Board Authority — src/board as Central Agency

## Core Insight

src/board is the bridge between Koota ECS and Reactylon rendering. It must be the SOLE authority for:
- Terrain generation (walls, floors, rooms, corridors)
- Entity placement (salvage, enemies, cult POIs, fabrication units, lightning rods)
- Event triggers (scripted encounters, dialogue triggers, discoveries)
- Stage transitions (unlocking new zones/floors)
- Progression gating (natural difficulty curve)

## Current Problem

- Entities hardcoded in `initializeWorld.ts` at fixed positions
- Cult bases at hardcoded tile coordinates
- Scavenge sites manually spawned
- `WORLD_EXTENT = 256` constrains world to fixed size
- Board generates terrain only — zero procedural content
- Storm can exceed 100% (stormIntensity caps at 1.5, displays as 112%)
- Minimap reveals entire world (no fog of war)

## Architecture: Zones as Unlock Stages

The game is an RTS with campaign-style progression. Zones from GAME_OVERVIEW.md map directly to unlock stages:

### Stage 1: City (Awakening)
- **Unlock:** Game start
- **Board generates:** Industrial labyrinth, scattered broken machines, fabrication units needing power, lightning rods, initial salvage
- **Enemies:** None initially, then lone wandering cultists
- **Objective:** Establish operational base, repair machines, restore power
- **Scripted encounters:** First contact with a cult wanderer, dialogue about EL
- **Portal to Stage 2:** Unlocked when base is operational

### Stage 2: Coast (Expansion)
- **Unlock:** Base established + first fabrication unit powered
- **Board generates:** Coastal labyrinth, abandoned mines (mineable rooms), scattered cultist patrols
- **Enemies:** Wandering cultists, rogue machines
- **Objective:** Take over mines, build up resources and forces
- **Scripted encounters:** Discovery of coast, first mine takeover
- **Portal to Stage 3:** Unlocked when resources reach threshold

### Stage 3: Campus (Discovery)
- **Unlock:** Coastal mines operational
- **Board generates:** Science campus labyrinth, observatory room, research POIs
- **Enemies:** Moderate cultist presence, enslaved machines
- **Objective:** Discover observatory, study wormhole, unlock story
- **Scripted encounters:** Observatory revelation, wormhole insights
- **Portal to Stage 4:** Unlocked when observatory studied

### Stage 4: Enemy Territory (War)
- **Unlock:** Observatory complete + forces built up
- **Board generates:** Heavily fortified labyrinth, cult strongholds, dense enemy patrols
- **Enemies:** War parties, organized cult forces, cult leader guards
- **Objective:** Push north, defeat cult leader
- **Scripted encounters:** Cult leader confrontation, final EL secret
- **Victory:** Defeat leader, launch through wormhole

### Each Stage Is Its Own Infinite Chunk Grid

- Seed: `${worldSeed}_stage${n}`
- Own labyrinth characteristics (wall density, room size, floor types)
- Own entity spawn tables (what can appear in rooms/corridors)
- Own enemy patrol density and behavior
- Own resource distribution
- Own biome feel (city = industrial gray, coast = blue-gray, campus = green-gray, enemy = dark red)

### Portals Between Stages

- Generated as special rooms during chunk creation
- Appear when unlock condition is met
- Visual: distinct gateway mesh with glow effect
- Gameplay: walking through transitions to the new stage's chunk grid
- Can return to previous stages

## Chunk Generation Pipeline (Updated)

Current 9 phases (terrain only) → 14 phases:

1-6. Same (rooms, maze, gates, connectivity, pruning, re-open)
7. Stage-aware floor assignment (biome from stage profile, not fixed zones)
8. Resource scatter (density from stage profile)
9. Zone stamping

**NEW phases:**
10. **Salvage site placement** — rooms get ScavengeSite entities based on stage resource table
11. **Enemy spawn point placement** — corridors/rooms get enemy patrol markers based on stage danger level
12. **POI placement** — large rooms get stage-specific POIs (fabrication units in city, mines on coast, observatory in campus, cult bases in enemy territory)
13. **Portal placement** — when unlock conditions met, special rooms become portals
14. **Event trigger placement** — scripted encounter zones for dialogue/cutscenes

## What Changes in Code

### src/board/chunks.ts
- `Chunk` type gains `entities: ChunkEntitySpawn[]` field
- Each `ChunkEntitySpawn` has: `type`, `position`, `traits`, `stageId`
- Generation pipeline runs new phases 10-14

### src/board/stages.ts (NEW)
- Stage definitions (replacing zones.ts)
- `StageProfile`: biome, enemy density, resource table, POI table, unlock condition
- `getCurrentStage()`, `unlockStage()`, `getStageProfile()`

### src/game/ChunkManager.ts
- When chunk loads: iterate `chunk.entities`, spawn each into Koota world
- When chunk unloads: despawn entities that were in that chunk
- Track entity↔chunk association

### src/app/initializeWorld.ts
- Stripped to: set config, init board, spawn 2 starting robots
- ALL other spawns come from board chunk generation

### src/systems/power.ts
- Cap `stormIntensity` display at 100% or use text tiers
- Fix power balance math

### src/ui/layout/Minimap.tsx / src/components/game/Minimap.tsx
- Respect fog of war: only show explored chunks/entities
- Unexplored areas are dark/hidden

### src/config/models.ts
- Robot GLBs need Blender fix (check scale, normals, materials)

## Implementation Order

1. Create `src/board/stages.ts` with 4 stage profiles
2. Add `entities` field to `Chunk` type
3. Add entity placement phases to chunk generation
4. Wire ChunkManager to spawn/despawn entities with chunks
5. Strip `initializeWorld.ts` to just player start
6. Fix storm/power display math
7. Add fog of war to minimap
8. Fix robot GLBs via Blender MCP
9. Add portal room generation (visual only initially)
10. Add scripted encounter triggers (dialogue system)

## What This Enables

- **Infinite explorable world** that fills the viewport (POC behavior restored)
- **Emergent content** — every chunk has unique salvage, enemies, POIs
- **Natural progression** — difficulty and content type driven by stage
- **Replayability** — different seeds produce different worlds
- **Campaign feel** — scripted encounters within procedural world
- **The game described in GAME_OVERVIEW.md** — not just a labyrinth renderer
