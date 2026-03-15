---
title: "Koota Full Migration — Module Maps → Traits, SQLite as Spatial Oracle"
domain: architecture
status: approved
last_updated: 2026-03-15
summary: "Migrate all 30+ module-level Map state stores to Koota traits. SQLite handles spatial queries, config, and persistence. R3F renderers use useQuery/useTrait from koota/react — no polling, no tick hack, no GameSnapshot."
---

# Koota Full Migration Design

## Problem

The codebase has three disconnected state layers:

1. **Koota ECS** — units and buildings only (15 traits, 4 queries)
2. **30+ module-level Maps** — every other system (territory, floor, speech, harvest, AI, diplomacy, tech, resources, turn state, chunks, etc.)
3. **GameSnapshot + useSyncExternalStore(tick)** — a hack that makes React re-render when the game ticks, used because renderers can't subscribe to module-level Maps

Result: renderers either poll every N frames (TerritoryBorderRenderer, 60-frame poll), use the tick hack (StructuralFloorRenderer), or go silently stale. The dual-store floor bug (discovery written to structuralSpace, renderer reads from DB snapshot) is the canonical symptom.

## Solution

**Approach A: Full migration.**

- All live simulation state → Koota entities + traits
- SQLite → spatial oracle, config store, persistence layer (what it already does, extended)
- R3F renderers → `useQuery()` + `useTrait()` from `koota/react` — reactive by default
- `GameSnapshot` → deleted
- `useSyncExternalStore` → deleted
- All module-level Map resets → deleted

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│ SQLite (sql.js web / Capacitor SQLite native)               │
│                                                             │
│ SPATIAL: tile coords, sector cells, chunk deltas, passability│
│ CONFIG:  model_defs, tile_defs, robot_defs (from JSON)      │
│ PERSIST: save slots, entity snapshots, turn state, deltas   │
│                                                             │
│ Queried by: initializeNewGame(), chunkLoader, pathfinding   │
└────────────────────┬────────────────────────────────────────┘
                     │ load → spawn entities
                     │ save → serialize traits → SQL
                     ↓
┌─────────────────────────────────────────────────────────────┐
│ Koota World — ALL live simulation state                     │
│                                                             │
│ EXISTING: Unit, Building, WorldPosition, Identity,          │
│           Navigation, AIController, Signal, Compute,        │
│           Hacking, Narrative, LightningRod                  │
│                                                             │
│ NEW SINGLETONS (one entity each):                          │
│   ResourcePool, TurnState                                   │
│                                                             │
│ NEW COLLECTIONS (one entity per instance):                  │
│   TerritoryCell, FloorCell, SpeechBubble, HarvestOp,       │
│   POI, AIFaction, FactionResearch, FactionStanding,         │
│   FactionResourcePool, ChunkDiscovery                       │
│                                                             │
│ NEW PER-UNIT TRAITS (added to unit entities):              │
│   UnitTurnState, Experience, AnimationState, BotLOD         │
└────────────────────┬────────────────────────────────────────┘
                     │ useQuery() / useTrait()
                     ↓
┌─────────────────────────────────────────────────────────────┐
│ React tree (<WorldProvider world={world}>)                  │
│                                                             │
│ R3F renderers: useQuery(TerritoryCell) → reactive borders   │
│                useQuery(FloorCell) → reactive floor         │
│                useQuery(SpeechBubble) → reactive bubbles    │
│                                                             │
│ UI panels: useTrait(resourceEntity, ResourcePool)           │
│            useTrait(turnEntity, TurnState)                  │
│                                                             │
│ No polling. No tick hack. No GameSnapshot.                  │
└─────────────────────────────────────────────────────────────┘
```

---

## New Traits

### Singleton traits (one entity each, world-scoped)

```ts
// Replaces: resources.ts module-level ResourcePool object
ResourcePool = trait({
  scrapMetal: 0, eWaste: 0, intactComponents: 0,
  refinedAlloys: 0, powerCells: 0, circuitry: 0,
  opticalFiber: 0, nanoComposites: 0, quantumCores: 0,
  biomimeticPolymers: 0, darkMatter: 0,
})

// Replaces: turnSystem.ts TurnState object
TurnState = trait({
  turnNumber: 0,
  phase: "player" as "player" | "ai_faction" | "environment",
  activeFaction: "player" as EconomyFactionId | "player",
})
```

### Collection traits (one entity per world object)

```ts
// Replaces: territorySystem.ts cellOwnership Map
TerritoryCell = trait({ q: 0, r: 0, owner: "" as EconomyFactionId, strength: 0 })

// Replaces: structuralSpace.ts cellsByFragment Map
FloorCell = trait({
  q: 0, r: 0, fragmentId: "",
  structuralZone: "", floorPresetId: "",
  discoveryState: 0,  // 0=unexplored, 1=abstract, 2=detailed
  passable: true,
})

// Replaces: botSpeech.ts activeBubbles Map
SpeechBubble = trait({
  entityId: "",
  text: "",
  expiresAtTick: 0,
  opacity: 1,
  x: 0, y: 0, z: 0,
})

// Replaces: harvestSystem.ts activeHarvests array
HarvestOp = trait({
  harvesterId: "",
  structureId: 0,
  ticksRemaining: 0,
  harvestType: "structure" as "structure" | "floor",
})

// Replaces: world_points_of_interest queried at runtime
POI = trait({
  q: 0, r: 0, type: "", name: "", discovered: false,
})

// Replaces: aiCivilization.ts factions Map
AIFaction = trait({
  factionId: "" as AIFactionId,
  phase: "dormant" as AIPhase,
  ticksUntilDecision: 0,
})

// Replaces: techTree.ts factionResearch Map
FactionResearch = trait({
  factionId: "" as EconomyFactionId,
  activeResearchId: null as string | null,
  turnsCompleted: 0,
  completedTechsJson: "[]",
})

// Replaces: diplomacy.ts standings Map
FactionStanding = trait({
  factionId: "" as EconomyFactionId,
  targetFactionId: "" as EconomyFactionId,
  standing: 0,
  atWar: false,
  allied: false,
  tradingWith: false,
})

// Replaces: factionEconomy.ts factionPools Map
FactionResourcePool = trait({
  factionId: "" as EconomyFactionId,
  resourcesJson: "{}",
})

// Replaces: chunkDiscovery.ts activeChunks Map
ChunkDiscovery = trait({
  chunkX: 0, chunkZ: 0,
  discoveryLevel: "unexplored" as ChunkDiscoveryLevel,
})
```

### Per-unit traits (added to existing unit entities)

```ts
// Replaces: turnSystem.ts unitStates Map (AP/MP per unit)
UnitTurnState = trait({ apRemaining: 0, mpRemaining: 0, hasActed: false })

// Replaces: experience.ts unitXP Map
Experience = trait({ xp: 0, level: 1, killCount: 0, harvestCount: 0 })

// Replaces: EntityAnimationState.ts entityAnimationStates Map
AnimationState = trait({ clipName: "", playhead: 0, blendWeight: 1 })

// Replaces: botLOD.ts entityLODCache Map
BotLOD = trait({ level: "full" as "full" | "simple" | "hidden" })
```

---

## What Stays Module-Level or SQLite

These do NOT move to Koota:

| State | Why | Where |
|-------|-----|-------|
| Pathfinding cache | Performance cache, no reactivity needed | Module-level (keep) |
| MaterialFactory cache | Three.js objects, not simulation state | Module-level (keep) |
| Toast timers | Pure UI, no game logic | Module-level (keep) |
| worldGrid chunk cache | Spatial/generation cache backed by SQLite | Module-level + SQLite (keep) |
| Turret cooldowns | Derived from tick, could move to trait but low value | Move to Building trait |
| Scavenge points | Lazy-cached from SQL query | SQLite query (remove cache) |

---

## Renderer changes (examples)

**TerritoryBorderRenderer** — before (poll every 60 frames):
```tsx
useFrame(() => {
  if (++frameCounter.current >= 60) {
    groupsRef.current = buildBorderGeometry(); // reads module Map
  }
});
```
After (reactive):
```tsx
const cells = useQuery(TerritoryCell, WorldPosition);
// re-renders when any TerritoryCell changes owner
```

**StructuralFloorRenderer** — before (tick hack):
```tsx
const snap = useSyncExternalStore(subscribe, getSnapshot);
const discovery = useMemo(() => readFromStructuralSpace(), [snap.tick]);
```
After (reactive):
```tsx
const floorCells = useQuery(FloorCell);
// re-renders when any FloorCell.discoveryState changes
```

**ResourceStrip / TopBar** — before (GameSnapshot):
```tsx
const snap = useSyncExternalStore(subscribe, getSnapshot);
const resources = snap.resources;
```
After (reactive):
```tsx
const [resourceEntity] = useQuery(ResourcePool);
const resources = useTrait(resourceEntity, ResourcePool);
```

---

## Migration Waves

Executed sequentially. Each wave is independently testable.

| Wave | What | Blocks |
|------|------|--------|
| **W0** | WorldProvider + all new trait definitions | Everything |
| **W1** | Singletons: ResourcePool + TurnState | W0 |
| **W2** | Rendering-critical: FloorCell, TerritoryCell, SpeechBubble, HarvestOp, POI | W0 |
| **W3** | Background: AIFaction, FactionResearch, FactionStanding, FactionResourcePool, ChunkDiscovery | W0 |
| **W4** | Per-unit traits: UnitTurnState, Experience, AnimationState, BotLOD | W0 |
| **W5** | Cleanup: delete GameSnapshot, delete module Maps, remove useSyncExternalStore, update all tests | W1–W4 |

W1–W4 can proceed in parallel after W0 completes.

---

## SQLite extended role

- **Map generation**: `loadChunk()` already queries SQLite for deltas + applies them to procedural generation. Keep and extend.
- **Coordinate queries**: `sector_cells` table (q, r, structuralZone, passable, discoveryState) is the canonical tile store. `structuralSpace.ts` becomes a thin adapter that spawns Koota `FloorCell` entities from SQL rows.
- **Config**: `model_definitions`, `tile_definitions`, `robot_definitions` loaded from JSON at `pnpm db:build:foundation`. No JSON imports at runtime — all config through DB queries.
- **Persistence**: On save, serialize Koota entities to existing tables (world_entities, turn_states, harvest_states, faction_resource_states, map_discovery). On load, reconstruct Koota entities from DB rows.

---

## Invariants

- No module-level Map that holds simulation state after W5
- No `useSyncExternalStore` in any renderer after W5
- No `getSnapshot()` in any renderer after W5
- No `useFrame` poll for state reads (useFrame is OK for animation/position interpolation)
- Every `_reset()` function removed — Koota's `entity.destroy()` handles cleanup
- `initializeNewGame()` creates Koota entities; nothing else does bulk spawning

---

## Agent Team

| Agent | Owns |
|-------|------|
| **foundation** | W0: WorldProvider, trait definitions, koota/react setup |
| **singletons** | W1: ResourcePool + TurnState entities + UI useTrait |
| **renderers** | W2: FloorCell, TerritoryCell, SpeechBubble, HarvestOp, POI |
| **systems** | W3: AIFaction, FactionResearch, FactionStanding, FactionResourcePool, ChunkDiscovery |
| **entity-traits** | W4: UnitTurnState, Experience, AnimationState, BotLOD |
| **cleanup** | W5: Delete GameSnapshot, all Maps, tests |
