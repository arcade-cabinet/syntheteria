---
title: "World Systems"
domain: technical
status: canonical
last_updated: 2026-03-13
summary: "Unified ecumenopolis spatial model, chunk architecture (implemented in src/world/gen/), floor harvest and pit mining, world vs consumers"
depends_on:
  - "ARCHITECTURE.md"
planned_work:
  - "Wire initWorldGrid into bootstrap as single source of truth"
  - "Floor harvest resource pools and pit state"
---

# World Systems

## One Continuous Machine-World

Syntheteria is a **single persistent ecumenopolis campaign space**. It is not a conventional outdoor wilderness map plus a separate city-interior layer.

It is:
- One machine-urban world
- Divided into sectors, arcology shells, transit spaces, and breach zones
- Rendered and played at different scales without becoming fundamentally different worlds
- Infinite in extent — no artificial map-size constraints

Any existing code that still assumes outdoor hex-world as the primary target or separate city interiors as a coequal permanent mode should be treated as transitional implementation debt, not as the final design direction.

## Sector Archetypes

The major campaign locations are sector archetypes:

| Sector | Role |
|---|---|
| **Command Arcology** | Central governance, player's initial operating base |
| **Abyssal Extraction Ward** | Resource harvesting, drowned freight, pressure-lock infrastructure |
| **Archive Campus** | Data caches, memory fragments, observatory-style structures |
| **Cult Wards** | Cultist territory, ritual infrastructure, breach-adjacent |
| **Gateway Spine** | Transit corridors, ascension routes, vertical staging |
| **Breach Zone** | Storm-exposed, structurally compromised, high-risk/high-reward |

These replace the old mental model of natural overworld geography plus detachable city scenes.

## Operational Density

Dense reclaimed machine-urban regions are simply higher-complexity parts of the same world:

- "City logic" becomes district / sector logic.
- Operational interiors are still real navigable spaces.
- They are part of the same campaign fabric, not a separate mode.

## Spatial Contract

The hidden logical contract uses a square grid for navigation, placement, validation, sockets, and composites. The visible representation is driven by:

- Procedural floor surfaces (zone-driven, material-driven)
- Structural GLB kit pieces from the city catalog
- Clear operational readability

### Floor Material Zones

| Zone Type | Surface Language |
|---|---|
| Core / command sectors | Sealed concrete, painted service decks |
| Fabrication / storage / power | Reinforced plate, industrial metal |
| Corridors and transit spines | Walkway grid, diamond plate |
| Breach zones | Damaged, exposed substrate |

Floor tile GLBs are optional accents. Procedural floor rendering is the baseline.

## World vs Consumers

The **map** (gen + DB deltas) is the single source of truth. Consumers (POIs, bases, cultists, rivals, pathfinding, harvest, construction, fog) must NOT own map state — they only query via world API (`worldGrid`, `getTile`, `getChunk`).

**Design vision:**
- One ecumenopolis world map (no city/overworld split)
- 4X mechanics: explore, exploit, expand, exterminate
- Bases as expand targets; POIs as Civ 6 natural wonder-style features
- Cultists = primary scripted antagonist; rival machines = secondary
- No zones/districts as gameplay; floor materials drive appearance AND harvest

## Chunk Architecture

> **STATUS: IMPLEMENTED** in `src/world/gen/` (chunkGen, worldGrid, persist, game_map_tiles, map_deltas)

### Core Concept

The fog-of-war implementation revealed the optimal viewport pattern: the player sees only what is immediately around them. An ecumenopolis is limitless by definition. We generate the world **by viewport** using deterministic chunk generation, persist only **deltas** against the procedural baseline, and treat props/structures as **harvestable resource deposits**.

### Chunk Definition

- Each chunk = a square region of sector cells (target: 8x8 cells per chunk)
- Chunk key = `chunk_{cx}_{cz}` derived from world coordinates
- Chunks are **deterministically generated** from `worldSeed + chunkKey` — regenerated identically every time
- **No fixed map boundary** — the ecumenopolis extends in all directions infinitely

### Viewport Loading

- Camera position determines which chunks are in view
- Load chunks within a configurable radius (e.g., 3-chunk radius = ~24-48 cells visible)
- Unload chunks outside the radius to save memory
- **Discovered chunks persist their discovery state** in SQLite
- **Modified chunks persist deltas** (harvested resources, built structures, destroyed objects)

### Delta Persistence

The procedural baseline is never stored — it is regenerated from seed. Only changes are saved:

- Harvested/destroyed structures (removed from baseline)
- Player-built structures (added to baseline)
- Discovery state per cell
- Modified terrain state

This yields an infinite world with minimal storage.

### Resource System (The Exploit Pillar)

Every harvestable structure/prop **and floor tile** in the ecumenopolis contains a defined resource pool:

| Resource | Source | Use |
|---|---|---|
| Heavy Metals | Walls, columns, structural beams, **floor tiles (metal, concrete)** | Armor, chassis, defensive structures |
| Light Metals | Props, shelves, containers | Electronics, sensors, light components |
| Uranics | Power infrastructure, reactors | Energy systems, power cells |
| Plastics | Pipes, insulation, capsules | Wiring, seals, basic components |
| Oil | Industrial machinery, engines | Lubricants, fuel cells, fabrication |
| Microchips | Computers, terminals, control panels | AI cores, processors, upgrades |
| Scrap | Any damaged/degraded structure, **harvested floors** | Universal low-quality material |
| Rare Components | Intact equipment, research gear | Advanced fabrication, Mark upgrades |

Structure-to-resource mapping is defined per model family in the city catalog config. **Floor materials** have their own FLOOR_* resource pools (metal_panel → ferrousScrap + scrap; concrete_slab → heavy_metals + scrap).

### Floor Harvest and Pit Mining

**Floor tiles are harvestable.** The Fabricator bot can strip-mine floor tiles, creating **procedurally generated pits**. This prevents resource fatigue (metals, concrete are the most abundantly consumed).

- **Strip mining**: Harvest a floor tile → yields materials (heavy_metals, scrap, etc.) → tile becomes a **pit**
- **Undermaterials**: When a floor is harvested, the tile reveals an **undermaterial** layer (sand, soil, gravel) for deep digging. Source: `/Volumes/home/assets/2DPhotorealistic` (Textures/polyhaven, TERRAIN). Seeded in `game_config.undermaterials`; run `UNDERMATERIALS_SRC=/path pnpm tsx scripts/ingest-undermaterials.ts` to discover textures.
- **Pit state**: Harvested floor → pit with undermaterial visible. Pit tiles are impassable (or require ramp/bridge)
- **Deep dig** (optional extension): sand → subsoil → bedrock with diminishing returns

### Building System

- Base building uses **textured blocks** (1x1x1 cubes with PBR textures), not GLB models
- Blocks can be stacked vertically for multi-level bases
- Three GLB model categories:
  1. **World Structures** — pre-existing ecumenopolis infrastructure (walls, columns, doors, roofs)
  2. **Props** — harvestable objects (containers, computers, vessels, machinery)
  3. **Base Buildings** — player-constructable functional structures (fabricators, storage, relay towers, turrets)

### Migration Path (Planned Phases)

1. **Resource System** — resource types, resource pools per model family, harvest action, delta persistence
2. **Chunk-Based Generation** — refactor generation.ts to produce chunks, camera-driven loading/unloading, SQLite delta persistence
3. **Block-Based Building** — block placement, resource costs, multi-level stacking
4. **Full Integration** — cultist spawning in any chunk, complete economy loop

## Storm Relationship

The storm is omnipresent but usually seen through domes, arcology shells, breaches, exposed superstructure, and energy sinks. This keeps the hypercane and wormhole visually central without requiring a natural-terrain overworld.

## Traversal Model

The long-term design target is one campaign space supporting:

- Local mode changes (zoom, interaction emphasis)
- Sector entry / breach states
- Denser facility regions
- Different camera and interaction emphasis in different parts of the same world

These are variations of one world, not a separate world/city dichotomy.

## Progression Within the Ecumenopolis

- Fragmented perception — fog of war, earned visibility
- Map merging — connecting discovered sectors
- Earned strategic clarity — automation replaces manual scouting
- Local unit attachment early, broader automation later

All progression happens within the ecumenopolis, not through a world/city split.

## Naming Conventions

Public-facing runtime contracts should prefer:

| Use | Avoid |
|---|---|
| `ecumenopolis` | `overworld` |
| `sector` | `biome` |
| `district` | `tile` |
| `substation` | `city entry` |
| `anchor` | `terrain` |

## Spatial Contract Packages

Canonical world-domain types live in:

| Package | Responsibility |
|---|---|
| `src/world/contracts.ts` | Core world-domain types |
| `src/world/snapshots.ts` | `WorldSessionSnapshot`, `PersistedWorldSnapshot`, `CityRuntimeSnapshot`, `PoiState`, `NearbyPoiContext` |
| `src/world/poiSession.ts` | POI session state management |
| `src/world/session.ts` | Active session consumption |
| `src/world/runtimeState.ts` | Runtime state projection |
| `src/world/locationContext.ts` | Location-aware context for UI |
| `src/world/citySiteActions.ts` | Site action availability and status |
| `src/db/worldPersistence.ts` | SQLite persistence layer |
| `src/ecs/initialization.ts` | ECS bootstrap from persisted state |

Do not recreate equivalent view-model types inside UI code. If a UI surface needs a sector/session shape, import the shared snapshot type.

### City Config / Runtime Packages

| Package | Responsibility |
|---|---|
| `src/city/config/cityConfigValidation.ts` | Manifest/composite/scenario integrity checks |
| `src/city/runtime/layoutResolution.ts` | Deterministic scenario-to-render-space placement math |
| `src/city/topology.ts` | Edge-direction and neighbor topology helpers |
| `src/city/catalog/cityUnderstanding.ts` | Snap-class, footprint-class, directory-summary derivation |
| `src/city/catalog/cityDirectorySemantics.ts` | Directory-level semantic definitions |
| `src/city/runtime/cityKitLabState.ts` | City Kit Lab filter/view-model state |
| `src/city/composites/compositeSemantics.ts` | Semantic validation of higher-order composites |

If a TSX surface needs city scenario placements, consume `resolveCityScenarioPlacements()` from `src/city/runtime/layoutResolution.ts` instead of reimplementing scene math locally.

## Coordination Rules

- Do not introduce duplicate session or nearby-site shapes in TSX while contracts are stabilizing.
- If a UI component needs a new domain field, add it to the shared world/city package contract first, then consume it from TSX.
- If a TSX component currently owns city placement math, migrate it to `src/city/runtime/layoutResolution.ts`.
- `CityKitLab.tsx` consumes `src/city/runtime/cityKitLabState.ts` for filter options, scenario summaries, and catalog view state.
- `CitySiteModal.tsx` and site-briefing surfaces treat `src/world/citySiteActions.ts` and `src/world/locationContext.ts` as the source of truth for interaction logic.

## Visual Validation

Ecumenopolis generation is not validated by type-safe contracts alone. The implementation must maintain screenshot-backed validation for:

- A deterministic generated campaign overview
- A closer command-arcology anchor-cluster view
- A starting-sector inspection scene
- Readable robot placement for the starting chassis roster
- AI-owned robot movement in the live ecumenopolis scene
- Readable anchored local-context bubbles
- District overlays, substations, and embedded conduit traces

These images must come from the same runtime render stack the player sees.
