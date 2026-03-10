# Koota Migration Status

Last updated: 2026-03-09 (P2.5)

## Trait Sync Status

All Miniplex components are now fully synced to Koota via `bridge.ts`.

| Miniplex Component       | Koota Trait        | Synced | Field Mapping Notes                                 |
| ------------------------ | ------------------ | ------ | --------------------------------------------------- |
| `worldPosition`          | `Position`         | Yes    | x, y, z direct map                                  |
| `faction`                | `Faction`          | Yes    | string → `value` field                              |
| `playerControlled`       | `IsPlayerControlled` | Yes  | isActive, yaw, pitch                                |
| `unit`                   | `Unit`             | Yes    | `components[].name` → `type`; health defaults to 1  |
| `navigation`             | `Navigation`       | Yes    | path, pathIndex, moving                             |
| `building`               | `Building`         | Yes    | type, powered, operational                          |
| `lightningRod`           | `LightningRod`     | Yes    | `rodCapacity` → `capacity`                          |
| `belt`                   | `Belt`             | Yes    | + NextBelt/PrevBelt relations                       |
| `wire`                   | `Wire`             | Yes    | `wireType` → `type`; + ConnectsFrom/ConnectsTo      |
| `miner`                  | `Miner`            | Yes    | + OutputTo relation                                 |
| `processor`              | `Processor`        | Yes    | `processorType` → `type`; + InputFrom/OutputTo      |
| `oreDeposit`             | `OreDeposit`       | Yes    | Direct field map                                    |
| `materialCube`           | `MaterialCube`     | Yes    | + HeldBy/OnBelt/InHopper relations                  |
| `placedAt`               | `PlacedAt`         | Yes    | gridX, gridZ, gridY                                 |
| `grabbable`              | `Grabbable`        | Yes    | weight                                              |
| `powderStorage`          | `PowderStorage`    | Yes    | material, amount, capacity                          |
| `hopper`                 | `Hopper`           | Yes    | slots, contents array                               |
| `cubeStack`              | `CubeStack`        | Yes    | cubes, gridX, gridZ, height                         |
| `hackable`               | `Hackable`         | Yes    | `hackProgress` → `progress`                         |
| `signalRelay`            | `SignalRelay`      | Yes    | `signalRange` → `range`                             |
| `automation`             | `Automation`       | Yes    | + FollowTarget/WorkTarget relations; no patrolIndex  |
| `otter`                  | `Otter`            | Yes    | wanderDir/moving not synced (Koota lacks these)     |
| `hologram`               | `Hologram`         | Yes    | spriteId/animState/opacity/flicker not in Koota     |
| `item`                   | `Item`             | Yes    | itemType, quantity                                  |
| `mapFragment`            | `MapFragment`      | -      | Not synced in bridge (tag-only, low priority)       |
| `heldBy` (string)        | `HeldBy` (relation)| Yes    | String ID → Koota relation                          |
| `onBelt` (string)        | `OnBelt` (relation)| Yes    | String ID → Koota relation                          |
| `inHopper` (string)      | `InHopper` (rel.)  | Yes    | String ID → Koota relation                          |

### Koota-only traits (no Miniplex equivalent)

These traits exist in `world.ts` but have no Miniplex counterpart:
- `IsSelected` — tag trait for RTS selection
- `MapFragment` — defined but not bridged (mapFragment exists in Miniplex but not synced)
- `CivilizationGovernor` — AI director for NPC factions (future)
- `HologramSource` — relation from hologram to emitter (future)

### Field gaps (Koota trait has fewer fields than Miniplex)

- **Automation**: Miniplex has `patrolIndex`; Koota does not. Systems using patrol must track index locally or Koota trait needs a field added.
- **Otter**: Miniplex has `wanderDir` and `moving`; Koota has `questIndex` instead. Otter movement system will need adaptation.
- **Hologram**: Miniplex has `spriteId`, `animState`, `opacity`, `flickerSeed`, `flickerPhase`; Koota has `sourceEmitterId`, `emissiveColor`. HologramRenderer reads directly from Miniplex `entity.hologram` and `entity.otter`.

---

## Systems Still Reading from Miniplex

Every file below imports from `ecs/world` (the Miniplex world). Each must be migrated to import from `ecs/koota/queries` and read Koota trait data instead.

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

### Phase 1: Read-only query consumers (lowest risk)

These systems only iterate Miniplex queries and read data. Switch their imports from `ecs/world` to `ecs/koota/queries` and update field access to match Koota trait shapes.

1. **`systems/movement.ts`** — uses `movingUnits`, straightforward swap
2. **`systems/exploration.ts`** — uses `units` for position reads
3. **`systems/fragmentMerge.ts`** — uses `units` for fragment merging
4. **`systems/otters.ts`** — uses `otters`, self-contained system
5. **`rendering/BeltRenderer.tsx`** — uses `belts`, read-only rendering
6. **`rendering/FactoryRenderer.tsx`** — uses `miners`, `processors`
7. **`ai/NavMeshDebugRenderer.tsx`** — uses `movingUnits`, debug only

### Phase 2: Systems that read + write Miniplex entities

These systems mutate Miniplex entities directly (e.g., `entity.hackable.hackProgress = ...`). Migration requires either:
- Making Koota the source of truth and writing back to Miniplex temporarily, OR
- Cutting over all readers simultaneously

8. **`systems/power.ts`** — writes `building.powered`, `lightningRod.currentOutput`
9. **`systems/resources.ts`** — writes scavenging results
10. **`systems/hacking.ts`** — writes `hackable.hackProgress`, `hackable.hacked`
11. **`systems/signalNetwork.ts`** — writes `signalRelay.signalStrength`
12. **`systems/botAutomation.ts`** — writes `navigation.path`, `automation.patrolIndex`
13. **`systems/combat.ts`** — writes component damage
14. **`systems/enemies.ts`** — writes navigation, spawns entities
15. **`systems/fabrication.ts`** — writes building state
16. **`systems/repair.ts`** — writes component functional state
17. **`systems/beltTransport.ts`** — writes belt carrying state
18. **`systems/mining.ts`** — writes ore deposit yields
19. **`systems/processing.ts`** — writes processor progress

### Phase 3: Entity lifecycle (spawning/destroying)

These systems use `world.add()` / `world.remove()` to create/destroy Miniplex entities. They must be migrated to spawn directly in Koota.

20. **`systems/enemies.ts`** — spawns feral machine entities
21. **`systems/cultistAI.ts`** — spawns cultist entities
22. **`systems/buildingPlacement.ts`** — spawns building entities
23. **`systems/outpost.ts`** — creates/modifies outpost entities
24. **`App.tsx`** — initial entity spawning

### Phase 4: Input, rendering, UI

These are React components using `useFrame` loops. They need Koota React bindings (`useQuery` from `koota/react`).

25. **`input/FPSCamera.tsx`** — reads `getActivePlayerBot`, `playerBots`
26. **`input/FPSInput.tsx`** — reads player bot, writes input state
27. **`input/UnitInput.tsx`** — reads `units`, `buildings`
28. **`input/ObjectSelectionSystem.tsx`** — reads multiple queries
29. **`rendering/UnitRenderer.tsx`** — reads `units`, `buildings`
30. **`rendering/OtterRenderer.tsx`** — reads `otters`, `units`
31. **`rendering/HologramRenderer.tsx`** — reads `otters`, `units`
32. **`rendering/WireRenderer.tsx`** — reads `wires`
33. **`rendering/SelectionHighlight.tsx`** — reads selection queries
34. **`rendering/Flashlight.tsx`** — reads `getActivePlayerBot`
35. **`rendering/CameraEffects.tsx`** — reads `getActivePlayerBot`
36. **`ui/FPSHUD.tsx`** — reads player bot, units, buildings
37. **`ui/GameUI.tsx`** — reads units, buildings
38. **`ui/PowerOverlay.tsx`** — reads buildings
39. **`ui/InventoryView.tsx`** — reads `getActivePlayerBot`

### Phase 5: Persistence and testing

40. **`save/saveLoad.ts`** — serialize/deserialize from Koota world
41. **`systems/__tests__/territory.test.ts`** — update test fixtures
42. **`ai/PathfindingSystem.ts`** — reads `world` for entity lookup

---

## Prerequisites for Removing Miniplex

Before `miniplex` can be removed from `package.json`:

1. **All 42+ files** listed above must import from `ecs/koota/` instead of `ecs/world`
2. **Entity spawning** must use `kootaWorld.spawn()` instead of `world.add()`
3. **Entity destruction** must use `kEntity.destroy()` instead of `world.remove()`
4. **`ecs/world.ts`** — delete file (currently defines Miniplex world + queries)
5. **`ecs/koota/bridge.ts`** — delete file (no longer needed when Miniplex is gone)
6. **`ecs/types.ts`** — keep or adapt; the `Entity` interface, `UnitComponent`, etc. are still useful as shared types even after Miniplex removal. The Miniplex-specific Entity type can be replaced with a plain interface used for serialization.
7. **`systems/territory.ts:14`** — remove `import type { World } from "miniplex"`
8. **Field mapping gaps** must be resolved:
   - Add `patrolIndex` to Koota `Automation` trait, or handle in the automation system
   - Add `wanderDir` and `moving` to Koota `Otter` trait, or refactor otter system
   - Expand Koota `Hologram` trait with `spriteId`, `animState`, `opacity`, `flickerSeed`, `flickerPhase` fields used by `HologramRenderer`
9. **`getActivePlayerBot()`** — reimplement as a Koota query helper
10. **React bindings** — install/configure `koota/react` for `useQuery()` in components
11. **Run full test suite** — `npx vitest run` + manual gameplay verification
12. **Remove `miniplex`** from `package.json` dependencies

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
