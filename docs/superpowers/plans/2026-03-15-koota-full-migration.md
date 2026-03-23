# Koota Full Migration Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace all 30+ module-level Map state stores with Koota entities + traits; make R3F renderers reactive via `useQuery`/`useTrait` from `koota/react`; delete `GameSnapshot` and `useSyncExternalStore`.

**Architecture:** SQLite owns spatial queries, config, and persistence. Koota owns all live simulation state. R3F reads Koota directly with `useQuery()` — no polling, no tick hack, no GameSnapshot. Migration proceeds in waves: W0 (foundation) → W1–W4 (systems in parallel) → W5 (cleanup).

**Tech Stack:** Koota 0.6.5 + `koota/react` (`useQuery`, `useTrait`, `WorldProvider`), sql.js / Capacitor SQLite, React Three Fiber, Jest + ts-jest

**Spec:** `docs/superpowers/specs/2026-03-15-koota-full-migration-design.md`

**Verify after every task:** `pnpm verify` (lint + tsc + test + test:ct)

---

## Agent assignments

| Agent | Wave | Tasks |
|-------|------|-------|
| **foundation** | W0 | T01–T03 |
| **singletons** | W1 | T04–T07 (after W0) |
| **renderers** | W2 | T08–T17 (after W0) |
| **systems** | W3 | T18–T27 (after W0) |
| **entity-traits** | W4 | T28–T33 (after W0) |
| **cleanup** | W5 | T34–T40 (after W1–W4) |

---

## Dependency Graph

```
T01+T02+T03  (W0 Foundation — must complete first)
       |
       +------------------+------------------+------------------+
       |                  |                  |                  |
  W1 T04-T07         W2 T08-T17         W3 T18-T27         W4 T28-T33
  Singletons         Renderers          Background         Per-unit traits
  ResourcePool       FloorCell          AIFaction          UnitTurnState
  TurnState          TerritoryCell      FactionResearch    Experience
                     SpeechBubble       FactionStanding    AnimationState
                     HarvestOp          FactionResPool     BotLOD
                     POI                ChunkDiscovery
       |                  |                  |                  |
       +------------------+------------------+------------------+
                                    |
                               W5 T34-T40
                               Cleanup: delete GameSnapshot,
                               remove Maps, remove useSyncExternalStore,
                               update tests, rename traits, docs
```

---

## Invariants (enforce throughout)

1. `entity.set(Trait, { ...entity.get(Trait)!, field: value })` — spread + override; never mutate returned object
2. `entity.get(Trait)` returns a copy — re-read after set; never cache
3. Entity index Maps (`_territoryCellIndex`, etc.) are fine — they are lookups, not simulation state
4. All bulk cleanup via `entity.destroy()` — no more `resetXYZ()` functions
5. No new `useSyncExternalStore` patterns introduced at any point

---

## W0 Foundation

### T01: Add WorldProvider to React tree

Files: Modify `src/AppVite.tsx`

Wrap root JSX in `<WorldProvider world={world}>` from `koota/react`. Must be outside the R3F Canvas.

```tsx
import { WorldProvider } from "koota/react";
import { world } from "./ecs/world";
export function AppVite() {
  return (
    <WorldProvider world={world}>
      {/* existing JSX unchanged */}
    </WorldProvider>
  );
}
```

Steps:
- [ ] Verify koota/react imports: `node -e "const k = require('./node_modules/koota/react/index.js'); console.log(Object.keys(k))"`
- [ ] Add WorldProvider wrapper to AppVite.tsx
- [ ] `pnpm tsc` — 0 errors
- [ ] `git commit -m "feat(ecs/W0): wrap app in WorldProvider for koota/react hooks"`

---

### T02: Define all new traits in traits.ts

Files: Modify `src/ecs/traits.ts`

Add after existing traits. Check imports first: `grep "^import" src/ecs/traits.ts`

Singleton traits:
```ts
export const ResourcePool = trait({
  scrapMetal: 0, eWaste: 0, intactComponents: 0,
  refinedAlloys: 0, powerCells: 0, circuitry: 0,
  opticalFiber: 0, nanoComposites: 0, quantumCores: 0,
  biomimeticPolymers: 0, darkMatter: 0,
});

export const TurnStateKoota = trait({
  turnNumber: 0,
  phase: "player" as "player" | "ai_faction" | "environment",
  activeFaction: "player" as string,
});
```

Collection traits:
```ts
export const TerritoryCell = trait({ q: 0, r: 0, owner: "" as string, strength: 0 });

export const FloorCell = trait({
  q: 0, r: 0, fragmentId: "",
  structuralZone: "", floorPresetId: "",
  discoveryState: 0,
  passable: true,
});

export const SpeechBubble = trait({
  entityId: "", text: "", expiresAtTick: 0, opacity: 1,
  wx: 0, wy: 0, wz: 0,
});

export const HarvestOp = trait({
  harvesterId: "", structureId: 0, ticksRemaining: 0,
  harvestType: "structure" as "structure" | "floor",
});

export const POITrait = trait({ q: 0, r: 0, poiType: "", name: "", discovered: false });

export const AIFactionTrait = trait({ factionId: "" as string, phase: "dormant" as string, ticksUntilDecision: 0 });

export const FactionResearch = trait({
  factionId: "" as string,
  activeResearchId: null as string | null,
  turnsCompleted: 0, completedTechsJson: "[]",
});

export const FactionStanding = trait({
  factionId: "" as string, targetFactionId: "" as string,
  standing: 0, atWar: false, allied: false, tradingWith: false,
});

export const FactionResourcePool = trait({ factionId: "" as string, resourcesJson: "{}" });

export const ChunkDiscovery = trait({ chunkX: 0, chunkZ: 0, discoveryLevel: "unexplored" as string });
```

Per-unit traits:
```ts
export const UnitTurnState = trait({ apRemaining: 0, mpRemaining: 0, hasActed: false });
export const Experience = trait({ xp: 0, level: 1, killCount: 0, harvestCount: 0 });
export const AnimationState = trait({ clipName: "", playhead: 0, blendWeight: 1 });
export const BotLOD = trait({ level: "full" as "full" | "simple" | "hidden" });
```

Steps:
- [ ] Add singleton traits to traits.ts
- [ ] Add collection traits to traits.ts
- [ ] Add per-unit traits to traits.ts
- [ ] `pnpm tsc` — 0 errors
- [ ] `git commit -m "feat(ecs/W0): define 14 new Koota traits for full state migration"`

---

### T03: Add queries to world.ts + smoke tests

Files: Modify `src/ecs/world.ts`, Create `src/ecs/__tests__/newTraits.test.ts`

Add to world.ts:
```ts
export const territoryCells = createLiveQuery(() => world.query(TerritoryCell));
export const floorCells = createLiveQuery(() => world.query(FloorCell));
export const speechBubbles = createLiveQuery(() => world.query(SpeechBubble));
export const harvestOps = createLiveQuery(() => world.query(HarvestOp));
export const pois = createLiveQuery(() => world.query(POITrait));
export const aiFactions = createLiveQuery(() => world.query(AIFactionTrait));
export const factionResearchEntities = createLiveQuery(() => world.query(FactionResearch));
export const factionStandings = createLiveQuery(() => world.query(FactionStanding));
export const factionResourcePools = createLiveQuery(() => world.query(FactionResourcePool));
export const chunkDiscoveries = createLiveQuery(() => world.query(ChunkDiscovery));
```

Smoke test:
```ts
// src/ecs/__tests__/newTraits.test.ts
import { world } from "../world";
import { TerritoryCell, FloorCell, ResourcePool, UnitTurnState, Unit, WorldPosition, Identity } from "../traits";
import { territoryCells, floorCells } from "../world";

afterEach(() => { for (const e of [...world.entities]) e.destroy(); });

it("spawns and queries TerritoryCell", () => {
  const e = world.spawn(TerritoryCell);
  e.set(TerritoryCell, { q: 3, r: -2, owner: "reclaimers", strength: 5 });
  expect(Array.from(territoryCells)[0].get(TerritoryCell)?.owner).toBe("reclaimers");
});

it("spawns and queries FloorCell", () => {
  const e = world.spawn(FloorCell);
  e.set(FloorCell, { q: 0, r: 0, fragmentId: "f1", structuralZone: "core",
    floorPresetId: "basic", discoveryState: 2, passable: true });
  expect(Array.from(floorCells)[0].get(FloorCell)?.discoveryState).toBe(2);
});

it("spawns ResourcePool singleton", () => {
  const e = world.spawn(ResourcePool);
  e.set(ResourcePool, { scrapMetal: 42, eWaste: 0, intactComponents: 0,
    refinedAlloys: 0, powerCells: 0, circuitry: 0, opticalFiber: 0,
    nanoComposites: 0, quantumCores: 0, biomimeticPolymers: 0, darkMatter: 0 });
  expect(e.get(ResourcePool)?.scrapMetal).toBe(42);
});
```

Steps:
- [ ] Add 10 new queries to world.ts
- [ ] Write smoke test file
- [ ] `pnpm test src/ecs/__tests__/newTraits.test.ts` — 3 passing
- [ ] `pnpm verify`
- [ ] `git commit -m "feat(ecs/W0): add Koota queries and smoke tests for new traits"`

---

## W1 Singletons (after W0)

### T04: Migrate resources.ts to ResourcePool entity

Files: Modify `src/systems/resources.ts`, `src/ecs/initialization.ts`

Pattern: spawn one entity with ResourcePool trait; all getResources/addResource/subtractResource delegate to entity.set().

```ts
let _resourceEntity: Entity | null = null;

export function initResourcePoolEntity(): void {
  if (_resourceEntity) _resourceEntity.destroy();
  _resourceEntity = world.spawn(ResourcePoolTrait);
  _resourceEntity.set(ResourcePoolTrait, { scrapMetal: 0, eWaste: 0, intactComponents: 0,
    refinedAlloys: 0, powerCells: 0, circuitry: 0, opticalFiber: 0,
    nanoComposites: 0, quantumCores: 0, biomimeticPolymers: 0, darkMatter: 0 });
}

export function getResourcePoolEntity(): Entity {
  if (!_resourceEntity) throw new Error("ResourcePool entity not initialized");
  return _resourceEntity;
}

export function getResources() { return getResourcePoolEntity().get(ResourcePoolTrait)!; }

export function addResource(type: string, amount: number): void {
  const cur = getResources();
  getResourcePoolEntity().set(ResourcePoolTrait, { ...cur, [type]: (cur as any)[type] + amount });
}

export function subtractResource(type: string, amount: number): boolean {
  const cur = getResources();
  if ((cur as any)[type] < amount) return false;
  getResourcePoolEntity().set(ResourcePoolTrait, { ...cur, [type]: (cur as any)[type] - amount });
  return true;
}

export function resetResources(): void { initResourcePoolEntity(); }
```

Steps:
- [ ] Write failing test: `initResourcePoolEntity` + `addResource` mutates entity
- [ ] `pnpm test src/systems/resources.test.ts` — FAIL
- [ ] Implement in resources.ts
- [ ] Add `initResourcePoolEntity()` to `initializeNewGame()` in initialization.ts
- [ ] `pnpm verify`
- [ ] `git commit -m "feat(ecs/W1): ResourcePool as Koota entity"`

---

### T05: Update UI to read ResourcePool via useTrait

Find: `grep -rn "snap\.resources\|snapshot\.resources" src/ui/ src/rendering/ --include="*.tsx"`

Replace pattern:
```tsx
// Remove: useSyncExternalStore(subscribe, getSnapshot) + snap.resources
// Add:
import { useQuery, useTrait } from "koota/react";
import { ResourcePool as ResourcePoolTrait } from "../../ecs/traits";
const [resourceEntity] = useQuery(ResourcePoolTrait);
const resources = useTrait(resourceEntity, ResourcePoolTrait);
if (!resources) return null;
```

Steps:
- [ ] Find all consumers
- [ ] Replace each with useTrait pattern
- [ ] `pnpm verify`
- [ ] `git commit -m "feat(ecs/W1): UI reads ResourcePool via useTrait"`

---

### T06: Migrate turnSystem.ts to TurnStateKoota entity

Files: Modify `src/systems/turnSystem.ts`, `src/ecs/initialization.ts`, `src/systems/turnSystem.test.ts`

```ts
let _turnEntity: Entity | null = null;

export function initTurnStateEntity(): void {
  if (_turnEntity) _turnEntity.destroy();
  _turnEntity = world.spawn(TurnStateKoota);
  _turnEntity.set(TurnStateKoota, { turnNumber: 1, phase: "player", activeFaction: "player" });
}

export function getTurnState() { return _turnEntity!.get(TurnStateKoota)!; }

export function advanceTurn(): void {
  const cur = getTurnState();
  _turnEntity!.set(TurnStateKoota, { ...cur, turnNumber: cur.turnNumber + 1, phase: "player", activeFaction: "player" });
}

export function setTurnPhase(phase: "player" | "ai_faction" | "environment", faction: string): void {
  _turnEntity!.set(TurnStateKoota, { ...getTurnState(), phase, activeFaction: faction });
}
```

Steps:
- [ ] Write failing test for TurnState entity
- [ ] Implement
- [ ] Add `initTurnStateEntity()` to initialization.ts
- [ ] `pnpm verify`
- [ ] `git commit -m "feat(ecs/W1): TurnState as Koota entity"`

---

### T07: Update HUD to read TurnState via useTrait

Same as T05 pattern. Find: `grep -rn "snap\.turnNumber\|snap\.phase" src/ui/ --include="*.tsx"`

```tsx
const [turnEntity] = useQuery(TurnStateKoota);
const turnState = useTrait(turnEntity, TurnStateKoota);
```

Steps:
- [ ] Find + replace all consumers
- [ ] `pnpm verify`
- [ ] `git commit -m "feat(ecs/W1): HUD reads TurnState via useTrait"`

---

## W2 Rendering-critical (after W0, parallel with W1/W3/W4)

### T08: Migrate structuralSpace.ts to FloorCell entities

Files: Modify `src/world/structuralSpace.ts`, Create `src/world/__tests__/floorCellEntities.test.ts`

```ts
const _floorCellIndex = new Map<string, Entity>();
function cellKey(q: number, r: number, fragmentId: string) { return `${q},${r},${fragmentId}`; }

export function spawnFloorCells(cells: Array<{q: number; r: number; fragmentId: string; structuralZone: string; floorPresetId: string; discoveryState: number; passable: boolean}>): void {
  for (const cell of cells) {
    const key = cellKey(cell.q, cell.r, cell.fragmentId);
    let entity = _floorCellIndex.get(key);
    if (!entity || !entity.isAlive()) {
      entity = world.spawn(FloorCell);
      _floorCellIndex.set(key, entity);
    }
    entity.set(FloorCell, { ...cell });
  }
}

export function getFloorCellEntity(q: number, r: number, fragmentId: string): Entity | undefined {
  return _floorCellIndex.get(cellKey(q, r, fragmentId));
}

export function setFloorCellDiscovery(q: number, r: number, fragmentId: string, state: number): void {
  const entity = getFloorCellEntity(q, r, fragmentId);
  if (!entity) return;
  entity.set(FloorCell, { ...entity.get(FloorCell)!, discoveryState: state });
}

export function resetFloorCellEntities(): void {
  for (const e of _floorCellIndex.values()) { if (e.isAlive()) e.destroy(); }
  _floorCellIndex.clear();
}
```

Also update `loadStructuralFragment()` to call `spawnFloorCells()`.
Also update `setDiscoveryAtWorldPosition()` to call `setFloorCellDiscovery()`.

Steps:
- [ ] Write failing test (spawnFloorCells, getFloorCellEntity, setFloorCellDiscovery)
- [ ] `pnpm test` — FAIL
- [ ] Implement functions in structuralSpace.ts
- [ ] Update loadStructuralFragment() + setDiscoveryAtWorldPosition()
- [ ] `pnpm verify`
- [ ] `git commit -m "feat(ecs/W2): FloorCell Koota entities from structuralSpace"`

---

### T09: Update StructuralFloorRenderer to useQuery(FloorCell)

Files: Modify `src/rendering/StructuralFloorRenderer.tsx`

Remove:
- `useSyncExternalStore(subscribe, getSnapshot, getSnapshot)` block
- `useMemo([gameSnapshot.tick])` pattern
- Import of `subscribe`, `getSnapshot` from gameState

Add:
```tsx
import { useQuery } from "koota/react";
import { FloorCell } from "../ecs/traits";

const cells = useQuery(FloorCell);
const discoveryMap = useMemo(() => {
  const m = new Map<string, number>();
  for (const e of cells) {
    const c = e.get(FloorCell)!;
    m.set(`${c.q},${c.r}`, c.discoveryState);
  }
  return m;
}, [cells]);
```

Steps:
- [ ] Remove tick-hack subscription
- [ ] Add useQuery(FloorCell)
- [ ] `pnpm verify`
- [ ] `git commit -m "feat(ecs/W2): StructuralFloorRenderer useQuery(FloorCell) — no tick hack"`

---

### T10: Migrate territorySystem.ts to TerritoryCell entities

Files: Modify `src/systems/territorySystem.ts`, Create `src/systems/__tests__/territoryCells.test.ts`

```ts
const _territoryCellIndex = new Map<string, Entity>();
function tcKey(q: number, r: number) { return `${q},${r}`; }

export function spawnTerritoryCell(q: number, r: number, owner: string, strength: number): void {
  const key = tcKey(q, r);
  let entity = _territoryCellIndex.get(key);
  if (!entity || !entity.isAlive()) {
    entity = world.spawn(TerritoryCellTrait);
    _territoryCellIndex.set(key, entity);
  }
  entity.set(TerritoryCellTrait, { q, r, owner, strength });
}

export function getTerritoryOwner(q: number, r: number): string | null {
  return _territoryCellIndex.get(tcKey(q, r))?.get(TerritoryCellTrait)?.owner ?? null;
}

export function clearTerritoryCells(): void {
  for (const e of _territoryCellIndex.values()) { if (e.isAlive()) e.destroy(); }
  _territoryCellIndex.clear();
}
```

Replace `cellOwnership.set(key, cell)` in `recalculateTerritory()` with `spawnTerritoryCell()`.

Steps:
- [ ] Write failing test
- [ ] Implement
- [ ] Replace recalculateTerritory() internals
- [ ] `pnpm verify`
- [ ] `git commit -m "feat(ecs/W2): TerritoryCell as Koota entities"`

---

### T11: Update territory renderers to useQuery(TerritoryCell)

Files: Modify `src/rendering/TerritoryBorderRenderer.tsx`, `src/rendering/TerritoryFillRenderer.tsx`

Remove: `useFrame` poll, `frameCounter` ref, `versionRef`

Add:
```tsx
import { useQuery } from "koota/react";
import { TerritoryCell } from "../ecs/traits";

export function TerritoryBorderRenderer() {
  const cells = useQuery(TerritoryCell);
  const geometry = useMemo(() => buildBorderGeometry(cells), [cells]);
  // render geometry
}
```

Steps:
- [ ] Remove useFrame poll from TerritoryBorderRenderer
- [ ] Replace getAllCellOwnership() with useQuery param
- [ ] Same for TerritoryFillRenderer
- [ ] `pnpm verify`
- [ ] `git commit -m "feat(ecs/W2): territory renderers useQuery — remove 60-frame poll"`

---

### T12: Migrate botSpeech.ts to SpeechBubble entities

Files: Modify `src/systems/botSpeech.ts`, Create `src/systems/__tests__/speechBubbles.test.ts`

```ts
export function spawnSpeechBubble(entityId: string, text: string, expiresAtTick: number, wx: number, wy: number, wz: number): void {
  for (const e of Array.from(speechBubbles)) {
    if (e.get(SpeechBubbleTrait)?.entityId === entityId) { e.destroy(); break; }
  }
  const entity = world.spawn(SpeechBubbleTrait);
  entity.set(SpeechBubbleTrait, { entityId, text, expiresAtTick, opacity: 1, wx, wy, wz });
}

export function tickSpeechBubbles(currentTick: number): void {
  for (const e of Array.from(speechBubbles)) {
    const b = e.get(SpeechBubbleTrait)!;
    if (b.expiresAtTick <= currentTick) {
      e.destroy();
    } else {
      const remaining = b.expiresAtTick - currentTick;
      if (remaining < 10) e.set(SpeechBubbleTrait, { ...b, opacity: remaining / 10 });
    }
  }
}
```

Steps:
- [ ] Write 3 failing tests (spawn, expiry, replace-existing)
- [ ] Implement
- [ ] Replace activeBubbles Map usage throughout botSpeech.ts
- [ ] `pnpm verify`
- [ ] `git commit -m "feat(ecs/W2): SpeechBubble as Koota entities"`

---

### T13: Update SpeechBubbleRenderer to useQuery(SpeechBubble)

```tsx
const bubbles = useQuery(SpeechBubble);
return (
  <>
    {Array.from(bubbles).map((e) => {
      const b = e.get(SpeechBubble)!;
      return <BubbleMesh key={b.entityId} bubble={b} />;
    })}
  </>
);
```

Steps: Replace + verify + commit `"feat(ecs/W2): SpeechBubbleRenderer useQuery"`

---

### T14: Migrate harvestSystem.ts to HarvestOp entities

Replace `activeHarvests: ActiveHarvest[]` with HarvestOp entities.
- Start: `world.spawn(HarvestOp)` + `entity.set()`
- Tick: `entity.set(HarvestOp, { ...cur, ticksRemaining: cur.ticksRemaining - 1 })`
- Complete: `entity.destroy()`
- Keep `consumedStructureIds` and `consumedFloorTiles` Sets (non-reactive flags)

Steps: write test → implement → update tests → verify → commit `"feat(ecs/W2): HarvestOp as Koota entities"`

---

### T15: Update HarvestVisualRenderer to useQuery(HarvestOp)

Replace `getActiveHarvests()` with `useQuery(HarvestOp)`.

Commit: `"feat(ecs/W2): HarvestVisualRenderer useQuery(HarvestOp)"`

---

### T16: Migrate POI runtime state to POITrait entities

In initialization.ts, after loading world from DB, spawn POI entities from SQL.
In MemoryFragmentRenderer, use `useQuery(POITrait)`.

Commit: `"feat(ecs/W2): POI as Koota entities"`

---

### T17: Remove useSyncExternalStore from W2 renderers

Verify: `grep -rn "useSyncExternalStore" src/rendering/ --include="*.tsx"` → 0 results

Commit: `"refactor(ecs/W2): remove useSyncExternalStore from renderers"`

---

## W3 Background systems (after W0, parallel with W1/W2/W4)

### T18: aiCivilization.ts → AIFactionTrait entities
Spawn 4 faction entities in `initAIFactionEntities()`. Phase transitions via entity.set().
Commit: `"feat(ecs/W3): AIFaction as Koota entities"`

### T19: techTree.ts → FactionResearch entities
`completedTechs: Set` serialized as `JSON.stringify([...set])` in trait.
Commit: `"feat(ecs/W3): FactionResearch as Koota entities"`

### T20: diplomacy.ts → FactionStanding entities
One entity per faction pair. Key: `"factionA:factionB"`.
Commit: `"feat(ecs/W3): FactionStanding as Koota entities"`

### T21: factionEconomy.ts → FactionResourcePool entities
Resources as JSON string in `resourcesJson` field.
Commit: `"feat(ecs/W3): FactionResourcePool as Koota entities"`

### T22: chunkDiscovery.ts → ChunkDiscovery entities
One entity per chunk. `unloadChunk()` calls `entity.destroy()`.
Commit: `"feat(ecs/W3): ChunkDiscovery as Koota entities"`

### T23: governorSystem.ts — read aiFactions query
Replace aiCivilization Map reads with `Array.from(aiFactions)`.
Commit: `"refactor(ecs/W3): governorSystem reads aiFactions query"`

### T24: rivalEncounters.ts — use aiFactions query
Commit: `"refactor(ecs/W3): rivalEncounters reads aiFactions query"`

### T25: victoryConditions.ts — read territoryCells query
Commit: `"refactor(ecs/W3): victoryConditions reads territoryCells query"`

### T26: worldPersistence.ts — serialize/deserialize new trait entities
Update save to serialize FactionResearch, FactionStanding, FactionResourcePool from Koota.
Update load to re-spawn entities from DB rows.
Commit: `"feat(ecs/W3): persist/restore W3 trait entities in save/load"`

### T27: signalNetwork.ts — verify Signal trait wiring
Verify existing Signal trait is reactive. Remove any module Map if present.
Commit: `"refactor(ecs/W3): signalNetwork uses Signal trait — remove any Map"`

---

## W4 Per-unit traits (after W0, parallel with W1/W2/W3)

### T28: UnitTurnState trait on unit entities

Files: Modify `src/ecs/factory.ts`, `src/systems/turnSystem.ts`, `src/systems/turnSystem.test.ts`

Add to world.spawn() in factory.ts:
```ts
const entity = world.spawn(AIController, Identity, WorldPosition, MapFragment, Unit, Navigation, UnitTurnState);
entity.set(UnitTurnState, { apRemaining: 0, mpRemaining: 0, hasActed: false });
```

Replace `unitStates: Map<string, UnitTurnState>` with entity.get(UnitTurnState).

Helper:
```ts
function findUnitById(id: string) {
  for (const e of units) {
    if (e.get(Identity)?.id === id) return e;
  }
  return null;
}
```

Steps:
- [ ] Write failing test
- [ ] Add UnitTurnState to factory.ts spawn
- [ ] Replace unitStates Map lookups in turnSystem.ts
- [ ] Remove `unitStates: Map` declaration
- [ ] `pnpm verify`
- [ ] `git commit -m "feat(ecs/W4): UnitTurnState trait on unit entities — remove unitStates Map"`

---

### T29: Experience trait on unit entities
Add to spawn. Replace `unitXP.get(id)` with `entity.get(Experience)`. Remove Map.
Commit: `"feat(ecs/W4): Experience trait on unit entities"`

### T30: AnimationState trait on unit entities
Add to spawn. Replace `entityAnimationStates.get(id)` with `entity.get(AnimationState)`. Remove Map.
Commit: `"feat(ecs/W4): AnimationState trait on unit entities"`

### T31: BotLOD trait on unit entities

Add to spawn. In UnitMesh useFrame:
```ts
// Replace: getLODLevel(entityId, ...)
// With:
const lod = entity.get(BotLOD)?.level ?? "full";
```
Update botLOD.ts to call `entity.set(BotLOD, { level: newLevel })`. Remove `entityLODCache: Map`.
Commit: `"feat(ecs/W4): BotLOD trait on unit entities — remove entityLODCache"`

### T32: turretCooldown into Building trait
Add `cooldownExpiresAtTick: 0` to Building trait. Replace turretCooldowns Map.
Commit: `"feat(ecs/W4): turret cooldown on Building trait"`

### T33: scavengePoints — replace cache with SQL query
Replace `scavengePoints: ScavengePoint[] | null` lazy cache with direct SQL query.
Commit: `"feat(ecs/W4): scavengePoints direct SQL — remove cache"`

---

## W5 Cleanup (after ALL of W1–W4)

### T34: Delete GameSnapshot and listeners from gameState.ts

Find remaining consumers first:
```bash
grep -rn "getSnapshot\|subscribe\|GameSnapshot\|useSyncExternalStore" src/ --include="*.ts" --include="*.tsx" | grep -v ".test." | grep -v "node_modules"
```
Expected: 0 results. Fix any stragglers.

Then delete from gameState.ts:
- `interface GameSnapshot { ... }`
- `let snapshot: GameSnapshot | null`
- `function buildSnapshot(): GameSnapshot { ... }`
- `export function getSnapshot(): GameSnapshot { ... }`
- `export function subscribe(...): ... { ... }`
- `const listeners: Set<() => void>`
- `listeners.forEach(l => l())` in simulationTick

Steps:
- [ ] Verify 0 remaining consumers
- [ ] Delete dead code from gameState.ts
- [ ] `pnpm tsc` — fix any stragglers
- [ ] `pnpm verify`
- [ ] `git commit -m "feat(ecs/W5): delete GameSnapshot getSnapshot subscribe listeners"`

---

### T35: Remove all migrated module-level Maps

Audit: `grep -rn "^const.*= new Map\|^let.*= new Map\|^const.*= new Set\|^let.*= new Set" src/systems/ src/world/ --include="*.ts" | grep -v ".test."`

Delete each migrated Map declaration and its reset function.
Remove reset calls from initialization.ts.

Steps: delete each → `pnpm tsc` after each → `pnpm verify` → commit `"refactor(ecs/W5): remove all migrated module Maps and reset functions"`

---

### T36: Remove useSyncExternalStore from all UI

Final check: `grep -rn "useSyncExternalStore" src/ --include="*.tsx" --include="*.ts" | grep -v ".test."` → 0 results.

Commit: `"refactor(ecs/W5): remove all useSyncExternalStore usage"`

---

### T37: Update tests to Koota entity patterns

Find: `grep -rn "resetTerritorySystem\|resetHarvestSystem\|resetResources\|resetTurnSystem\|cellOwnership\|activeBubbles\|activeHarvests" src/ --include="*.test.ts"`

For each test file:
- afterEach: `for (const e of [...world.entities]) e.destroy()` instead of `resetXYZ()`
- Replace Map manipulation with spawn/set functions
- Replace Map assertions with query + entity.get(Trait) assertions

`pnpm test` — all passing.
Commit: `"test(ecs/W5): update all tests to Koota entity patterns"`

---

### T38: Rename transition-era trait names

- `TurnStateKoota` → `TurnState`
- `POITrait` → `POI`
- `AIFactionTrait` → `AIFaction`

Find all: `grep -rn "TurnStateKoota\|POITrait\|AIFactionTrait" src/ --include="*.ts" --include="*.tsx" -l`
Edit each file. `pnpm tsc && pnpm verify`.
Commit: `"refactor(ecs/W5): rename transition-era trait names"`

---

### T39: Final audit

No simulation Maps:
```bash
grep -rn "= new Map\b\|= new Set\b" src/systems/ src/world/ --include="*.ts" | grep -v ".test.\|_index\|pathfinding\|material\|toast\|chunk[Cc]ache"
```
Expected: only index Maps and caches.

No useSyncExternalStore:
```bash
grep -rn "useSyncExternalStore" src/ --include="*.tsx" --include="*.ts" | grep -v ".test."
```
Expected: 0.

---

### T40: Update docs

Update `docs/memory-bank/systemPatterns.md` state management section:
> All live simulation state is stored in Koota entities + traits. R3F renderers use `useQuery()` and `useTrait()` from `koota/react` — reactive by default, no polling, no tick hack. SQLite is the spatial oracle (tile coords, chunk data) and persistence layer. No module-level Map state for simulation data. Entity index Maps are lookup structures, not state stores.

Update `docs/memory-bank/progress.md`, `activeContext.md`, `techContext.md` to reflect migration complete.

Commit: `"docs: update system patterns for Koota full migration complete"`

---

## Quick reference

```bash
pnpm tsc                         # type check only
pnpm test                        # jest unit tests
pnpm test:ct                     # playwright component tests
pnpm verify                      # lint + tsc + test + test:ct (full CI)
pnpm test src/path/to/file.test.ts  # single file
```
