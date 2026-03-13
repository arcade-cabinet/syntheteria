# Viewport-Driven Ecumenopolis: The Minecraft/Factorio Pivot

## Core Insight

The fog-of-war implementation accidentally revealed the optimal viewport pattern: the player sees only what's immediately around them. An ecumenopolis is limitless by definition. Artificial map-size constraints are unnecessary. Instead, we generate the world **by viewport** using deterministic chunk generation, persist only **deltas** (player modifications) against the procedural baseline, and treat props/structures as **harvestable resource deposits** — the Exploit pillar of the 4X.

## Architecture: Chunk-Based Generation

### Chunks
- Each chunk = a square region of sector cells (e.g., 8×8 or 16×16 cells)
- Chunk key = `chunk_{cx}_{cz}` from world coordinates
- Chunks are **deterministically generated** from `worldSeed + chunkKey` — regenerated identically every time
- **No fixed map boundary** — the ecumenopolis extends in all directions infinitely

### Viewport Loading
- Camera position determines which chunks are in view
- Load chunks within a configurable radius (e.g., 3-chunk radius = ~24-48 cells visible)
- Unload chunks outside the radius to save memory
- **Discovered chunks persist their discovery state** in SQLite
- **Modified chunks persist deltas** (harvested resources, built structures, destroyed objects)

### Delta Persistence
- The procedural baseline is never stored — it's regenerated from seed
- Only CHANGES are saved:
  - Harvested/destroyed structures (removed from baseline)
  - Player-built structures (added to baseline)
  - Discovery state per cell
  - Modified terrain state
- This means infinite world with minimal storage

## Resource System: The Exploit Pillar

### Resource Types
Every harvestable structure/prop in the ecumenopolis contains a defined resource pool:

| Resource | Source | Use |
|----------|--------|-----|
| **Heavy Metals** | Walls, columns, structural beams | Armor, chassis, defensive structures |
| **Light Metals** | Props, shelves, containers | Electronics, sensors, light components |
| **Uranics** | Power infrastructure, reactors | Energy systems, power cells |
| **Plastics** | Pipes, insulation, capsules | Wiring, seals, basic components |
| **Oil** | Industrial machinery, engines | Lubricants, fuel cells, fabrication |
| **Microchips** | Computers, terminals, control panels | AI cores, processors, upgrades |
| **Scrap** | Any damaged/degraded structure | Universal low-quality material |
| **Rare Components** | Intact equipment, research gear | Advanced fabrication, Mark upgrades |

### Structure → Resource Pool Mapping
Each model family in the city catalog maps to a resource pool:

- **wall** → Heavy Metals (3-5), Scrap (1-2)
- **column** → Heavy Metals (2-4), Light Metals (1)
- **prop (container/crate)** → Light Metals (1-2), Plastics (1-2), random bonus
- **prop (computer/terminal)** → Microchips (1-3), Light Metals (1)
- **prop (vessel/capsule)** → Plastics (2-3), Oil (1-2)
- **utility (pipes)** → Plastics (1-3), Oil (1)
- **detail (vent/output)** → Light Metals (1), Plastics (1)
- **stair** → Heavy Metals (2), Light Metals (1)
- **door** → Heavy Metals (1-2), Light Metals (1), Microchips (0-1)
- **roof** → Heavy Metals (2-3), Plastics (1)
- **power infrastructure** → Uranics (1-3), Heavy Metals (2)
- **research equipment** → Microchips (2-4), Rare Components (0-2)

### Harvesting Mechanic
- Select a structure → Radial menu "Harvest" action
- Harvesting takes time proportional to structure durability
- Yields the resource pool with some randomness
- Structure disappears after harvesting (delta persisted)
- Some structures are too damaged and yield only Scrap

## Building System: Layered Base Construction

### Block-Based Construction
- Base building uses **textured blocks** (not GLB models)
- Blocks are 1×1×1 unit cubes with AmbientCG/PolyHaven PBR textures
- Blocks can be stacked vertically = **multi-level bases**
- Block types: foundation, wall, floor, ceiling, power conduit, storage rack

### Three GLB Model Categories
1. **World Structures** — Pre-existing ecumenopolis infrastructure (walls, columns, doors, roofs) that the player finds, harvests, or navigates around
2. **Props** — Harvestable objects scattered through the world (containers, computers, vessels, machinery) that provide resources
3. **Base Buildings** — Player-constructable functional structures placed ON or IN the block grid (fabricators, storage, relay towers, power sinks, defensive turrets)

### Layered 2.5D
- Ground level = sector floor with terrain texture
- Level 1 = existing world structures and props
- Level 2+ = player-built vertical structures
- Camera stays top-down but renders depth via lighting, shadows, and offset
- Z-layers make bases feel like actual architectural spaces

## Cultist Pressure

Cultists are NOT traditional 4X opponents:
- They appear anywhere in the ecumenopolis, story-driven
- They don't claim territory; they raid, disrupt, and pressure
- Their frequency and intensity scale with campaign progression
- They emerge from breach zones and storm-exposed sectors
- They can damage/destroy player structures
- Defeating cultist incursions yields unique resources/intel

## Migration Path

### Phase 1: Resource System (current session)
- Define resource types as TypeScript enums
- Assign resource pools to existing city model families
- Add "Harvest" action to radial menu
- Persist harvested state as delta

### Phase 2: Chunk-Based Generation
- Refactor generation.ts to produce chunks instead of full maps
- Camera-driven chunk loading/unloading
- SQLite delta persistence per chunk

### Phase 3: Block-Based Building
- Block placement system using textured cubes
- Resource costs for each block type
- Multi-level stacking

### Phase 4: Full Integration
- Cultist spawning in any chunk
- Resource economy loop: harvest → fabricate → build → defend
- Mark-based robot progression using rare resources
