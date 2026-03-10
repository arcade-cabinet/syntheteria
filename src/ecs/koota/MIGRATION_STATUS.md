# Koota Migration Status

Last updated: 2026-03-10 (P2.5 — Foundation Complete)

## Overview

The Koota ECS migration infrastructure is now complete. All Miniplex components
have Koota trait equivalents with full field parity. The bidirectional bridge
synchronizes data between both worlds each frame, allowing systems to be
migrated one at a time.

### What's Done

- **Trait definitions** (`world.ts`): All 25+ traits defined with full field parity
- **Field gaps filled**: `patrolIndex` added to Automation, `wanderDir`/`moving` added to Otter, `spriteId`/`animState`/`opacity`/`flickerSeed`/`flickerPhase` added to Hologram
- **Queries** (`queries.ts`): 40+ Koota queries mirroring all Miniplex archetypes
- **Bridge** (`bridge.ts`): Bidirectional sync with `syncBeforeFrame()` / `syncAfterFrame()`
- **Bridge spawn/destroy** (`bridge.ts`): `spawnKootaEntity()` and `destroyEntityById()` for dual-world entity lifecycle
- **Serialization** (`serialize.ts`): `serializeKootaWorld()` / `deserializeKootaWorld()` for save/load
- **Traits barrel** (`traits.ts`): Canonical import point for all traits
- **Barrel export** (`index.ts`): Complete re-exports of all traits, queries, bridge, and serialization

### What's Next

Systems are ready to be migrated from Miniplex queries to Koota queries.
The migration can happen one system at a time without breaking anything,
because the bridge keeps both worlds in sync.

---

## Trait Sync Status

All Miniplex components are now fully synced to Koota via `bridge.ts` with **full field parity**.

| Miniplex Component       | Koota Trait        | Synced | Field Mapping Notes                                 |
| ------------------------ | ------------------ | ------ | --------------------------------------------------- |
| `worldPosition`          | `Position`         | Yes    | x, y, z direct map                                  |
| `faction`                | `Faction`          | Yes    | string -> `value` field                              |
| `playerControlled`       | `IsPlayerControlled` | Yes  | isActive, yaw, pitch                                |
| `unit`                   | `Unit`             | Yes    | `components[].name` -> `type`; health defaults to 1  |
| `navigation`             | `Navigation`       | Yes    | path, pathIndex, moving                             |
| `building`               | `Building`         | Yes    | type, powered, operational                          |
| `lightningRod`           | `LightningRod`     | Yes    | `rodCapacity` -> `capacity`                          |
| `belt`                   | `Belt`             | Yes    | + NextBelt/PrevBelt relations                       |
| `wire`                   | `Wire`             | Yes    | `wireType` -> `type`; + ConnectsFrom/ConnectsTo      |
| `miner`                  | `Miner`            | Yes    | + OutputTo relation                                 |
| `processor`              | `Processor`        | Yes    | `processorType` -> `type`; + InputFrom/OutputTo      |
| `oreDeposit`             | `OreDeposit`       | Yes    | Direct field map                                    |
| `materialCube`           | `MaterialCube`     | Yes    | + HeldBy/OnBelt/InHopper relations                  |
| `placedAt`               | `PlacedAt`         | Yes    | gridX, gridZ, gridY                                 |
| `grabbable`              | `Grabbable`        | Yes    | weight                                              |
| `powderStorage`          | `PowderStorage`    | Yes    | material, amount, capacity                          |
| `hopper`                 | `Hopper`           | Yes    | slots, contents array                               |
| `cubeStack`              | `CubeStack`        | Yes    | cubes, gridX, gridZ, height                         |
| `hackable`               | `Hackable`         | Yes    | `hackProgress` -> `progress`                         |
| `signalRelay`            | `SignalRelay`      | Yes    | `signalRange` -> `range`                             |
| `automation`             | `Automation`       | Yes    | **patrolIndex now synced** + FollowTarget/WorkTarget |
| `otter`                  | `Otter`            | Yes    | **wanderDir and moving now synced**                  |
| `hologram`               | `Hologram`         | Yes    | **spriteId/animState/opacity/flicker now synced**    |
| `item`                   | `Item`             | Yes    | itemType, quantity                                  |
| `mapFragment`            | `MapFragment`      | -      | Not synced in bridge (tag-only, low priority)       |
| `heldBy` (string)        | `HeldBy` (relation)| Yes    | String ID -> Koota relation                          |
| `onBelt` (string)        | `OnBelt` (relation)| Yes    | String ID -> Koota relation                          |
| `inHopper` (string)      | `InHopper` (rel.)  | Yes    | String ID -> Koota relation                          |

### Koota-only traits (no Miniplex equivalent)

- `IsSelected` — tag trait for RTS selection
- `CivilizationGovernor` — AI director for NPC factions (future)
- `HologramSource` — relation from hologram to emitter (future)

### Field gaps: RESOLVED

All previously identified field gaps have been resolved:

- **Automation**: `patrolIndex` field added to Koota trait, synced bidirectionally
- **Otter**: `wanderDir` and `moving` fields added to Koota trait, synced bidirectionally
- **Hologram**: `spriteId`, `animState`, `opacity`, `flickerSeed`, `flickerPhase` fields added, synced from Miniplex

---

## Bridge Architecture

### Sync Flow

```
Frame Start
  |
  v
syncBeforeFrame()          -- Miniplex -> Koota (all entities)
  |
  v
[Game Systems Run]         -- Read/write Miniplex OR Koota
  |
  v
syncAfterFrame()           -- Koota -> Miniplex (writeback)
  |
  v
Frame End
```

### Entity Lifecycle

- **spawnKootaEntity(data)** — Creates entity in both Miniplex and Koota, returns both handles
- **destroyEntityById(id)** — Removes entity from both worlds
- **getKootaEntity(mpId)** — Look up Koota entity by Miniplex ID
- **getMiniplexId(kEntity)** — Look up Miniplex ID by Koota entity (reverse lookup)

### Koota -> Miniplex Writeback

`syncKootaToMiniplex()` writes back these trait changes:
- Position (x, y, z)
- Navigation (path, pathIndex, moving)
- Unit (type, displayName, speed, selected, components.functional)
- Building (powered, operational)
- LightningRod (capacity, currentOutput, protectionRadius)
- Hackable (difficulty, progress, beingHacked, hacked)
- SignalRelay (range, connectedTo, signalStrength)
- Automation (routine, followTarget, patrolPoints, patrolIndex, workTarget)
- Otter (speed, wanderTimer, wanderDir, moving, stationary)
- Faction (value)
- OreDeposit (currentYield, maxYield)
- Belt (carrying, itemProgress, speed)
- Miner (drillHealth, extractionRate)
- Processor (progress, active)

---

## Serialization

### Save Format

```typescript
interface SerializedKootaWorld {
  version: 1;
  entities: Array<{
    traits: Record<string, unknown>;  // trait name -> trait data
  }>;
}
```

### Usage

```typescript
import { serializeKootaWorld, deserializeKootaWorld } from './serialize';

// Save
const snapshot = serializeKootaWorld();
const json = JSON.stringify(snapshot);

// Load
const data = JSON.parse(json);
const entities = deserializeKootaWorld(data);
```

### Limitations

- Relations (NextBelt, ConnectsFrom, etc.) are NOT serialized yet.
  They are re-created from Miniplex string IDs by the bridge on load.
- Tag traits (IsSelected) are not yet included in serialization.
- Will be expanded when Miniplex is removed.

---

## Systems Still Reading from Miniplex

Every file below imports from `ecs/world` (the Miniplex world). Each must be
migrated to import from `ecs/koota/queries` and read Koota trait data instead.

The bridge keeps both worlds in sync, so systems can be migrated one at a time.
Tests mock `../../ecs/world` directly, so system migration requires either:
1. Making the system read from Koota queries and updating tests, OR
2. Keeping the Miniplex import in the system and relying on the bridge

### Core Systems

| File                               | Imports Used                                    |
| ---------------------------------- | ----------------------------------------------- |
| `systems/movement.ts:7`           | `movingUnits`                                   |
| `systems/exploration.ts:9`        | `units`                                         |
| `systems/fragmentMerge.ts:8`      | `units`                                         |
| `systems/resources.ts:13`         | `units`                                         |

### Combat & Enemy Systems

| File                               | Imports Used                                    |
| ---------------------------------- | ----------------------------------------------- |
| `systems/combat.ts:14`            | `units`, `world`                                |
| `systems/enemies.ts:12`           | `units`, `world`                                |
| `systems/cultistAI.ts:16`         | `units`, `world`                                |
| `systems/fpsCombat.ts:15`         | `getActivePlayerBot`, `units`, `world`          |

### Power & Building Systems

| File                               | Imports Used                                    |
| ---------------------------------- | ----------------------------------------------- |
| `systems/power.ts:12`             | `buildings`, `lightningRods`, `units`            |
| `systems/powerRouting.ts:23`      | multiple power-related queries                   |
| `systems/buildingPlacement.ts:18` | `lightningRods`, `units`                        |
| `systems/fabrication.ts:10`       | `buildings`                                     |
| `systems/repair.ts:12`            | `buildings`, `units`                            |

### Factory Systems

| File                               | Imports Used                                    |
| ---------------------------------- | ----------------------------------------------- |
| `systems/beltTransport.ts:13`     | `belts`, `world`                                |
| `systems/mining.ts:11`            | `miners`, `world`                               |
| `systems/processing.ts:11`        | `processors`, `world`                           |
| `systems/wireBuilder.ts:20`       | `wires`, `world`                                |
| `systems/wireNetwork.ts:17`       | multiple wire/power queries                      |

### AI & Signal Systems

| File                               | Imports Used                                    |
| ---------------------------------- | ----------------------------------------------- |
| `systems/hacking.ts:13`           | `hackables`, `playerBots`, `world`              |
| `systems/signalNetwork.ts:11`     | `playerBots`, `signalRelays`, `wires`, `world`  |
| `systems/botAutomation.ts:15`     | `automatedBots`, `units`, `world`               |
| `systems/otters.ts:10`            | `otters`                                        |
| `systems/outpost.ts:15`           | `world`                                         |
| `systems/territory.ts:14`         | `World` type from `miniplex`                    |

### Rendering

| File                               | Imports Used                                    |
| ---------------------------------- | ----------------------------------------------- |
| `rendering/UnitRenderer.tsx:14`    | `buildings`, `units`                            |
| `rendering/OtterRenderer.tsx:22`   | `otters`, `units`                               |
| `rendering/HologramRenderer.tsx:19`| `otters`, `units`                               |
| `rendering/WireRenderer.tsx:19`    | `wires`, `world`                                |
| `rendering/BeltRenderer.tsx:14`    | `belts`                                         |
| `rendering/FactoryRenderer.tsx:15` | `miners`, `processors`                          |
| `rendering/SelectionHighlight.tsx:27`| multiple queries                              |
| `rendering/Flashlight.tsx:13`      | `getActivePlayerBot`                            |
| `rendering/CameraEffects.tsx:17`   | `getActivePlayerBot`                            |

### Input

| File                               | Imports Used                                    |
| ---------------------------------- | ----------------------------------------------- |
| `input/UnitInput.tsx:18`           | `buildings`, `units`                            |
| `input/FPSInput.tsx:13`           | `buildings`, `getActivePlayerBot`, `units`       |
| `input/FPSCamera.tsx:19`          | `getActivePlayerBot`, `playerBots`              |
| `input/ObjectSelectionSystem.tsx:35`| multiple queries                              |

### UI

| File                               | Imports Used                                    |
| ---------------------------------- | ----------------------------------------------- |
| `ui/FPSHUD.tsx:19`                 | `buildings`, `getActivePlayerBot`, `units`      |
| `ui/GameUI.tsx:25`                 | `buildings`, `units`                            |
| `ui/PowerOverlay.tsx:15`           | `buildings`                                     |
| `ui/InventoryView.tsx:12`          | `getActivePlayerBot`                            |

### AI (pathfinding)

| File                               | Imports Used                                    |
| ---------------------------------- | ----------------------------------------------- |
| `ai/PathfindingSystem.ts:21`       | `world`                                         |
| `ai/NavMeshDebugRenderer.tsx:21`   | `movingUnits`                                   |
| `ai/BotBrainSystem.tsx:19`         | `units`                                         |

### Other

| File                               | Imports Used                                    |
| ---------------------------------- | ----------------------------------------------- |
| `App.tsx:29`                       | `getActivePlayerBot`, `world`                   |
| `save/saveLoad.ts:11`             | `world`                                         |
| `systems/__tests__/territory.test.ts:11` | `world`                                  |

---

## Recommended Migration Order

### Phase 1: Read-only query consumers (lowest risk) -- READY

These systems only iterate Miniplex queries and read data. Switch their imports
from `ecs/world` to `ecs/koota/queries` and update field access to match Koota
trait shapes.

1. `systems/movement.ts` — uses `movingUnits`, straightforward swap
2. `systems/exploration.ts` — uses `units` for position reads
3. `systems/fragmentMerge.ts` — uses `units` for fragment merging
4. `systems/otters.ts` — uses `otters`, self-contained system
5. `rendering/BeltRenderer.tsx` — uses `belts`, read-only rendering
6. `rendering/FactoryRenderer.tsx` — uses `miners`, `processors`
7. `ai/NavMeshDebugRenderer.tsx` — uses `movingUnits`, debug only

### Phase 2: Systems that read + write Miniplex entities

These systems mutate Miniplex entities directly. Migration requires the
bridge writeback (`syncAfterFrame`) which is now implemented.

8-19. power, resources, hacking, signalNetwork, botAutomation, combat,
      enemies, fabrication, repair, beltTransport, mining, processing

### Phase 3: Entity lifecycle (spawning/destroying)

These use `world.add()` / `world.remove()`. They must use
`spawnKootaEntity()` and `destroyEntityById()` instead.

20-24. enemies, cultistAI, buildingPlacement, outpost, App.tsx

### Phase 4: Input, rendering, UI (React components)

These need Koota React bindings (`useQuery` from `koota/react`).

25-39. FPSCamera, FPSInput, UnitInput, ObjectSelection, renderers, HUD, UI

### Phase 5: Persistence and testing

40-42. saveLoad.ts, territory test, PathfindingSystem

---

## Prerequisites for Removing Miniplex

Before `miniplex` can be removed from `package.json`:

1. **All 42+ files** listed above must import from `ecs/koota/` instead of `ecs/world`
2. **Entity spawning** must use `kootaWorld.spawn()` instead of `world.add()`
3. **Entity destruction** must use `kEntity.destroy()` instead of `world.remove()`
4. **`ecs/world.ts`** — delete file
5. **`ecs/koota/bridge.ts`** — delete file (no longer needed)
6. **`ecs/types.ts`** — keep or adapt as shared interfaces
7. **Field mapping gaps** — RESOLVED (all fields synced)
8. **`getActivePlayerBot()`** — reimplement as a Koota query helper
9. **React bindings** — install/configure `koota/react` for `useQuery()` in components
10. **Run full test suite** — `npx jest --no-coverage` + manual gameplay verification
11. **Remove `miniplex`** from `package.json` dependencies

---

## Koota Query Reference

All Koota queries are defined in `queries.ts`. Key aliases for migration:

| Miniplex Query       | Koota Query          | Notes                           |
| -------------------- | -------------------- | ------------------------------- |
| `units`              | `allUnits`           | Unit + Position + MapFragment   |
| `movingUnits`        | `movingUnits`        | Unit + Navigation + Position    |
| `buildings`          | `allBuildings`       | Building + Position             |
| `lightningRods`      | `lightningRods`      | LightningRod + Building + Pos.  |
| `otters`             | `otters` / `allOtters` | Otter + Position              |
| `belts`              | `allBelts`           | Belt + Position                 |
| `wires`              | `allWires`           | Wire + ConnectsFrom + ConnectsTo|
| `miners`             | `allMiners`          | Miner + Building + Position     |
| `processors`         | `allProcessors`      | Processor + Building + Position |
| `items`              | `items` / `allItems` | Item + Position                 |
| `hackables`          | `hackableEntities`   | Hackable + Position             |
| `signalRelays`       | `signalRelays`       | SignalRelay + Position          |
| `automatedBots`      | `automatedUnits`     | Automation + Unit + Position    |
| `holograms`          | `holograms`          | Hologram + Position             |
| `playerBots`         | `playerBots`         | IsPlayerControlled + Unit + Pos.|

---

## File Inventory

| File | Purpose | Status |
| ---- | ------- | ------ |
| `world.ts` | Koota world + trait definitions | Complete (all fields) |
| `traits.ts` | Barrel export for traits | Complete |
| `queries.ts` | Koota query definitions (40+) | Complete |
| `bridge.ts` | Bidirectional Miniplex <-> Koota sync | Complete |
| `serialize.ts` | Save/load Koota world to JSON | Complete |
| `index.ts` | Barrel export for everything | Complete |
| `MIGRATION_STATUS.md` | This file | Updated |
