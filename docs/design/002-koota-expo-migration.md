# GDD-002: Koota ECS + Expo/Metro + JSON Config Migration

**Status:** Draft
**Date:** 2026-03-10
**Scope:** Architecture migration — Miniplex → Koota ECS, Vite → Expo/Metro, hardcoded values → JSON tunables

---

## 1. Executive Summary

Migrate Syntheteria from its current Vite + Miniplex architecture to a fully data-driven Expo/Metro + Koota ECS architecture. This enables:

1. **Koota ECS** — trait-based SoA storage, relations, reactive queries, actions, change detection
2. **Expo SDK 55 + Metro** — native mobile builds (iOS/Android), static JSON imports, WASM asset handling
3. **JSON config/tunables** — all game balance in editable JSON files, type-inferred at compile time

Reference implementations: grovekeeper (Expo/Metro structure), goats-in-hell (JSON config patterns).

---

## 2. Why Koota over Miniplex

| Feature | Miniplex | Koota |
|---------|----------|-------|
| Storage | Sparse component bags (AoS) | SoA for schemas, AoS for complex |
| Components | Optional properties on entity object | `trait()` declarations with defaults |
| Queries | `.with("a", "b")` — reactive buckets | `world.query(A, B)` with `Not()`, `Or()`, `Added()`, `Changed()` |
| Relations | None — manual ID strings | First-class `relation()` with auto-destroy, exclusivity |
| React hooks | Basic (miniplex-react) | `useQuery`, `useTrait`, `useTraitEffect`, `useActions` |
| Systems | Manual function calls | `createActions()` — world-scoped action bundles |
| Change detection | None | Built-in per-trait change tracking |
| World traits | None | `world.add(Trait)` — singleton/global data |
| Events | None | `onAdd`, `onRemove`, `onChange`, `onQueryAdd`, `onQueryRemove` |

### Key wins for Syntheteria

- **Relations replace ID strings**: Wire `fromEntityId`/`toEntityId` → `ConnectedTo(entity)` relation
- **Change detection**: Only re-render belts/wires when their traits actually change
- **Query modifiers**: `Added(Position)` for new entities, `Changed(Power)` for power updates
- **World traits**: Global game state (tick, speed, resources) as world-level traits
- **Actions**: Typed, world-scoped spawn/destroy bundles replace scattered factory functions

---

## 3. Koota ECS Architecture

### 3.1 Trait Definitions

All traits live in `game/ecs/traits/`. Each file exports related traits.

```typescript
// game/ecs/traits/core.ts
import { trait } from 'koota';

// Schema-based (SoA — fast iteration)
export const Position = trait({ x: 0, y: 0, z: 0 });
export const Faction = trait({ value: 'player' as 'player' | 'cultist' | 'rogue' | 'feral' | 'wildlife' });

// Tag traits (no data)
export const IsPlayerControlled = trait();
export const IsSelected = trait();

// Complex data (AoS — callback-based)
export const PlayerCamera = trait(() => ({ yaw: 0, pitch: 0 }));
export const Navigation = trait(() => ({ path: [] as { x: number; y: number; z: number }[], pathIndex: 0, moving: false }));
```

```typescript
// game/ecs/traits/unit.ts
import { trait } from 'koota';
import type { UnitConfig } from '../../config';

export const Unit = trait(() => ({
  type: 'maintenance_bot' as string,
  displayName: 'Bot',
  speed: 3,
  components: [] as { name: string; functional: boolean; material: string }[],
}));

export const Building = trait(() => ({
  type: 'lightning_rod',
  powered: false,
  operational: false,
  components: [] as { name: string; functional: boolean; material: string }[],
}));

export const LightningRod = trait({ rodCapacity: 10, currentOutput: 0, protectionRadius: 8 });
```

```typescript
// game/ecs/traits/factory.ts
import { trait, relation } from 'koota';

export const Belt = trait(() => ({
  direction: 'north' as 'north' | 'south' | 'east' | 'west',
  speed: 1,
  tier: 'basic' as 'basic' | 'fast' | 'express',
  itemProgress: 0,
}));

// Relations replace ID strings
export const NextBelt = relation({ exclusive: true });      // belt → next belt
export const PrevBelt = relation({ exclusive: true });      // belt → prev belt
export const CarriesItem = relation({ exclusive: true });   // belt → item on it

export const Wire = trait(() => ({
  wireType: 'power' as 'power' | 'signal',
  length: 0,
  currentLoad: 0,
  maxCapacity: 10,
}));

// Wire endpoints as relations
export const ConnectsFrom = relation({ exclusive: true });  // wire → source entity
export const ConnectsTo = relation({ exclusive: true });    // wire → target entity

export const Miner = trait(() => ({
  resourceType: 'scrap_metal' as string,
  extractionRate: 1,
  drillHealth: 1,
  active: false,
}));

// Miner output goes to a belt
export const OutputTo = relation({ exclusive: true });  // miner/processor → belt
export const InputFrom = relation({ exclusive: true }); // processor → belt

export const Processor = trait(() => ({
  processorType: 'smelter' as 'smelter' | 'refiner' | 'separator',
  recipe: null as string | null,
  progress: 0,
  speed: 60,
  active: false,
}));

export const Item = trait(() => ({ itemType: 'scrap_metal', quantity: 1 }));
```

```typescript
// game/ecs/traits/ai.ts
import { trait, relation } from 'koota';

export const Hackable = trait({ difficulty: 5, hackProgress: 0, beingHacked: false, hacked: false });
export const SignalRelay = trait(() => ({ signalRange: 10, signalStrength: 1, connectedTo: [] as string[] }));

export const Automation = trait(() => ({
  routine: 'idle' as 'idle' | 'patrol' | 'guard' | 'work' | 'follow',
  patrolPoints: [] as { x: number; y: number; z: number }[],
  patrolIndex: 0,
}));

// Automation targets as relations
export const FollowTarget = relation({ exclusive: true });
export const WorkTarget = relation({ exclusive: true });

export const Otter = trait(() => ({
  speed: 1.5,
  wanderTimer: 4,
  wanderDir: { x: 1, z: 0 },
  moving: false,
  stationary: false,
  lines: [] as string[],
}));

export const Hologram = trait(() => ({
  spriteId: 'default',
  animState: 'idle' as 'idle' | 'walk' | 'talk',
  opacity: 1,
  flickerSeed: 0,
  flickerPhase: 0,
}));

export const HologramSource = relation({ exclusive: true }); // hologram → linked entity
```

### 3.2 World Setup

```typescript
// game/ecs/world.ts
import { createWorld } from 'koota';

export const world = createWorld();

// World-level traits (global singletons)
import { trait } from 'koota';

export const GameTime = trait({ tick: 0, speed: 1, paused: false });
export const StormState = trait({ intensity: 0.5, nextStrike: 0 });
export const ResourcePool = trait({
  scrap_metal: 0, e_waste: 0, intact_components: 0,
  refined_metal: 0, copper_wire: 0, circuit_board: 0,
  power_cell: 0, logic_core: 0,
});
export const ComputePool = trait({ totalCompute: 0, usedCompute: 0 });

// Initialize world traits
world.add(GameTime);
world.add(StormState);
world.add(ResourcePool);
world.add(ComputePool);
```

### 3.3 Actions (Replace Factory Functions)

```typescript
// game/ecs/actions.ts
import { createActions } from 'koota';
import { Position, Faction, Unit, Building, LightningRod, PlayerCamera, Navigation, IsPlayerControlled } from './traits';
import { Belt, NextBelt, PrevBelt, Wire, ConnectsFrom, ConnectsTo, Miner, OutputTo } from './traits/factory';
import { unitConfig, beltConfig, minerConfig } from '../config';

export const gameActions = createActions((world) => ({
  spawnUnit: (opts: { x: number; z: number; unitType: string; playerControlled?: boolean }) => {
    const cfg = unitConfig[opts.unitType];
    const entity = world.spawn(
      Position({ x: opts.x, y: 0, z: opts.z }),
      Faction({ value: 'player' }),
      Unit({
        type: opts.unitType,
        displayName: cfg.displayName,
        speed: cfg.speed,
        components: structuredClone(cfg.defaultComponents),
      }),
      Navigation(),
    );
    if (opts.playerControlled) {
      entity.add(IsPlayerControlled);
      entity.add(PlayerCamera);
    }
    return entity;
  },

  spawnBelt: (opts: { x: number; z: number; direction: string; tier?: string }) => {
    const cfg = beltConfig[opts.tier ?? 'basic'];
    return world.spawn(
      Position({ x: opts.x, y: 0, z: opts.z }),
      Faction({ value: 'player' }),
      Belt({ direction: opts.direction, speed: cfg.speed, tier: opts.tier ?? 'basic' }),
    );
  },

  linkBelts: (from: Entity, to: Entity) => {
    from.add(NextBelt(to));
    to.add(PrevBelt(from));
  },

  spawnMiner: (opts: { x: number; z: number; resourceType: string }) => {
    const cfg = minerConfig[opts.resourceType];
    return world.spawn(
      Position({ x: opts.x, y: 0, z: opts.z }),
      Faction({ value: 'player' }),
      Building({ type: 'miner', powered: false, operational: false }),
      Miner({
        resourceType: opts.resourceType,
        extractionRate: cfg.extractionRate,
        drillHealth: 1,
        active: false,
      }),
    );
  },

  spawnWire: (from: Entity, to: Entity, wireType: 'power' | 'signal') => {
    const fromPos = from.get(Position);
    const toPos = to.get(Position);
    const dx = toPos.x - fromPos.x, dz = toPos.z - fromPos.z;
    const length = Math.sqrt(dx * dx + dz * dz);

    return world.spawn(
      Wire({ wireType, length, currentLoad: 0, maxCapacity: 10 }),
      ConnectsFrom(from),
      ConnectsTo(to),
    );
  },

  spawnLightningRod: (opts: { x: number; z: number }) => {
    return world.spawn(
      Position({ x: opts.x, y: 0, z: opts.z }),
      Faction({ value: 'player' }),
      Building({ type: 'lightning_rod', powered: true, operational: true }),
      LightningRod({ rodCapacity: 10, currentOutput: 7, protectionRadius: 8 }),
    );
  },
}));
```

### 3.4 System Migration Pattern

Each existing system function becomes a Koota query-based system:

```typescript
// Before (Miniplex):
import { miners, buildings } from '../ecs/world';

export function miningSystem() {
  for (const entity of miners) {
    if (!entity.building.powered || !entity.miner.active) continue;
    // ... extraction logic
  }
}

// After (Koota):
import { world } from '../ecs/world';
import { Miner, Building, Position } from '../ecs/traits';

export function miningSystem() {
  world.query(Miner, Building).updateEach(([miner, building]) => {
    if (!building.powered || !miner.active) return;
    miner.drillHealth -= 0.001;
    // ... extraction logic uses miner.extractionRate from JSON config
  });
}
```

**Wire network using relations:**
```typescript
// Before: manual BFS over entity ID strings
// After: query relations directly
import { Wire, ConnectsFrom, ConnectsTo } from '../ecs/traits/factory';
import { Building, LightningRod, Position } from '../ecs/traits';

export function wireNetworkSystem() {
  // Find all power sources
  const sources = world.query(LightningRod, Building);

  // Traverse wire network via relations
  world.query(Wire, ConnectsFrom('*'), ConnectsTo('*')).updateEach(
    ([wire], entity) => {
      if (wire.wireType !== 'power') return;
      const from = entity.targetsFor(ConnectsFrom)[0];
      const to = entity.targetsFor(ConnectsTo)[0];
      // BFS power distribution using relation graph
    }
  );
}
```

### 3.5 React Integration

```typescript
// game/ecs/Provider.tsx
import { WorldProvider } from 'koota/react';
import { world } from './world';

export function GameWorldProvider({ children }: { children: React.ReactNode }) {
  return <WorldProvider world={world}>{children}</WorldProvider>;
}
```

```typescript
// Renderer example — BeltRenderer.tsx
import { useQuery, useTrait } from 'koota/react';
import { Belt, Position } from '../ecs/traits';

function BeltRenderer() {
  const belts = useQuery(Belt, Position);
  return belts.map(entity => <BeltMesh key={entity.id()} entity={entity} />);
}

function BeltMesh({ entity }: { entity: Entity }) {
  const belt = useTrait(entity, Belt);
  const pos = useTrait(entity, Position);
  if (!belt || !pos) return null;
  // ... render belt at position with direction
}
```

### 3.6 Simulation Tick (useFrame)

```typescript
// game/ecs/GameSystems.tsx
import { useFrame } from '@react-three/fiber';
import { world } from './world';
import { GameTime } from './world';

// Import all systems
import { miningSystem } from '../systems/mining';
import { processingSystem } from '../systems/processing';
// ... etc

export function GameSystems() {
  useFrame((_, delta) => {
    const time = world.get(GameTime);
    if (time.paused) return;

    world.set(GameTime, { tick: time.tick + 1 });

    // Run all systems in order
    powerSystem();
    wireNetworkSystem();
    signalNetworkSystem();
    miningSystem();
    processingSystem();
    beltTransportSystem(delta);
    fabricationSystem();
    hackingSystem();
    enemySystem();
    combatSystem();
    otterSystem();
  });

  return null;
}
```

---

## 4. JSON Config / Tunables System

### 4.1 Directory Structure

```
config/
├── units.json          # Bot types, speeds, default components
├── buildings.json      # Building types, power requirements
├── belts.json          # Belt tier speeds, capacities
├── mining.json         # Extraction rates per resource type
├── processing.json     # Smelter/refiner/separator recipes
├── fabrication.json    # Fabrication recipes and costs
├── combat.json         # Damage values, attack ranges, cooldowns
├── enemies.json        # Enemy types (feral, cultist) stats
├── power.json          # Lightning rod capacities, wire limits, storm
├── hacking.json        # Compute costs, hack speeds
├── terrain.json        # Heightfield params, zone colors, deposit distribution
├── audio.json          # Volume levels, frequency ranges, ambient layers
└── rendering.json      # Material params, LOD distances, particle counts
```

### 4.2 Config File Examples

```jsonc
// config/units.json
{
  "maintenance_bot": {
    "displayName": "Maintenance Bot",
    "speed": 3,
    "defaultComponents": [
      { "name": "camera", "functional": true, "material": "electronic" },
      { "name": "arms", "functional": false, "material": "metal" },
      { "name": "locomotion", "functional": true, "material": "metal" },
      { "name": "power_cell", "functional": true, "material": "electronic" }
    ]
  },
  "utility_drone": {
    "displayName": "Utility Drone",
    "speed": 5,
    "defaultComponents": [
      { "name": "camera", "functional": false, "material": "electronic" },
      { "name": "arms", "functional": true, "material": "metal" },
      { "name": "locomotion", "functional": true, "material": "metal" }
    ]
  },
  "fabrication_unit": {
    "displayName": "Fabrication Unit",
    "speed": 0,
    "defaultComponents": [
      { "name": "power_supply", "functional": false, "material": "electronic" },
      { "name": "fabrication_arm", "functional": true, "material": "metal" },
      { "name": "material_hopper", "functional": true, "material": "metal" }
    ]
  }
}
```

```jsonc
// config/belts.json
{
  "basic": { "speed": 1.0, "color": "#666666" },
  "fast": { "speed": 2.5, "color": "#4488cc" },
  "express": { "speed": 5.0, "color": "#cc4444" }
}
```

```jsonc
// config/mining.json
{
  "scrap_metal": { "extractionRate": 1.0, "drillWear": 0.001, "abundance": 0.4 },
  "e_waste": { "extractionRate": 0.8, "drillWear": 0.0008, "abundance": 0.3 },
  "rare_alloy": { "extractionRate": 0.3, "drillWear": 0.003, "abundance": 0.05 },
  "copper": { "extractionRate": 0.6, "drillWear": 0.0015, "abundance": 0.15 },
  "fiber_optics": { "extractionRate": 0.4, "drillWear": 0.002, "abundance": 0.1 }
}
```

```jsonc
// config/processing.json
{
  "recipes": {
    "smelt_scrap": {
      "processor": "smelter",
      "input": { "scrap_metal": 2 },
      "output": { "refined_metal": 1 },
      "ticks": 60,
      "powerRequired": true
    },
    "refine_ewaste": {
      "processor": "refiner",
      "input": { "e_waste": 3 },
      "output": { "copper_wire": 1, "circuit_board": 1 },
      "ticks": 90,
      "powerRequired": true
    },
    "separate_alloy": {
      "processor": "separator",
      "input": { "rare_alloy": 1 },
      "output": { "power_cell": 1 },
      "ticks": 120,
      "powerRequired": true
    }
  }
}
```

```jsonc
// config/enemies.json
{
  "feral_bot": {
    "speed": 2,
    "aggroRange": 8,
    "attackDamage": 1,
    "attackCooldown": 60,
    "patrolRadius": 10
  },
  "cultist_acolyte": {
    "speed": 2.5,
    "aggroRange": 12,
    "attackDamage": 2,
    "attackCooldown": 45,
    "lightningDamage": 3,
    "lightningRange": 6,
    "fleeHealthThreshold": 0.3
  },
  "cultist_priest": {
    "speed": 1.5,
    "aggroRange": 15,
    "attackDamage": 3,
    "attackCooldown": 30,
    "lightningDamage": 5,
    "lightningRange": 10,
    "summonCooldown": 300,
    "fleeHealthThreshold": 0.2
  }
}
```

```jsonc
// config/power.json
{
  "lightningRod": {
    "baseCapacity": 10,
    "baseOutput": 7,
    "protectionRadius": 8
  },
  "wire": {
    "maxLength": 20,
    "maxCapacity": 10,
    "powerLossPerUnit": 0.02
  },
  "storm": {
    "baseIntensity": 0.5,
    "strikeInterval": [30, 120],
    "intensityVariation": 0.3,
    "powerPerStrike": 5
  }
}
```

### 4.3 Config Index (Type-Safe Imports)

```typescript
// game/config/index.ts
import rawUnits from '../../config/units.json';
import rawBelts from '../../config/belts.json';
import rawMining from '../../config/mining.json';
import rawProcessing from '../../config/processing.json';
import rawEnemies from '../../config/enemies.json';
import rawPower from '../../config/power.json';
import rawCombat from '../../config/combat.json';
import rawHacking from '../../config/hacking.json';
import rawFabrication from '../../config/fabrication.json';
import rawTerrain from '../../config/terrain.json';
import rawAudio from '../../config/audio.json';
import rawRendering from '../../config/rendering.json';

// Type inference directly from JSON — no manual type definitions needed
export type UnitConfig = (typeof rawUnits)[keyof typeof rawUnits];
export type BeltConfig = (typeof rawBelts)[keyof typeof rawBelts];
export type MiningConfig = (typeof rawMining)[keyof typeof rawMining];
export type EnemyConfig = (typeof rawEnemies)[keyof typeof rawEnemies];

export const unitConfig = rawUnits;
export const beltConfig = rawBelts;
export const miningConfig = rawMining;
export const processingConfig = rawProcessing;
export const enemyConfig = rawEnemies;
export const powerConfig = rawPower;
export const combatConfig = rawCombat;
export const hackingConfig = rawHacking;
export const fabricationConfig = rawFabrication;
export const terrainConfig = rawTerrain;
export const audioConfig = rawAudio;
export const renderingConfig = rawRendering;
```

Metro bundles JSON at compile time — zero async loading, zero runtime overhead.

---

## 5. Expo / Metro Migration

### 5.1 New Project Structure

```
syntheteria/
├── app/                    # Expo Router file-based routing
│   ├── _layout.tsx         # Root layout: fonts, persistence, providers
│   ├── +html.tsx           # Web HTML template (SharedArrayBuffer headers)
│   ├── index.tsx           # Title screen
│   └── game/
│       └── index.tsx       # Game screen: Canvas + HUD + controls
├── assets/
│   ├── images/             # App icons, splash
│   └── textures/           # PBR texture sets (Color, Normal, Roughness, AO)
├── config/                 # JSON tunables (see §4)
│   ├── units.json
│   ├── belts.json
│   └── ...
├── game/                   # Game logic (moved from game/src/)
│   ├── config/
│   │   └── index.ts        # Type-safe config imports
│   ├── ecs/
│   │   ├── world.ts        # Koota world + world traits
│   │   ├── traits/         # All trait definitions
│   │   │   ├── core.ts
│   │   │   ├── unit.ts
│   │   │   ├── factory.ts
│   │   │   └── ai.ts
│   │   ├── actions.ts      # createActions spawn/destroy bundles
│   │   └── Provider.tsx    # WorldProvider wrapper
│   ├── systems/            # ECS systems (same files, Koota queries)
│   ├── input/              # FPS input
│   ├── audio/              # Tone.js audio
│   ├── rendering/          # R3F renderers
│   ├── physics/            # Rapier WASM
│   ├── save/               # Drizzle ORM + expo-sqlite
│   └── ui/                 # React overlays
├── app.json                # Expo config
├── babel.config.js         # babel-preset-expo
├── metro.config.js         # Metro + WASM/GLB assets
├── tsconfig.json           # Extends expo/tsconfig.base
├── drizzle.config.ts       # Drizzle ORM config
├── global.css              # NativeWind (optional)
└── package.json            # Expo dependencies
```

### 5.2 Key Configuration Files

**app.json:**
```json
{
  "expo": {
    "name": "Syntheteria",
    "slug": "syntheteria",
    "version": "1.0.0",
    "orientation": "landscape",
    "plugins": [
      ["expo-router", {
        "headers": {
          "Cross-Origin-Embedder-Policy": "credentialless",
          "Cross-Origin-Opener-Policy": "same-origin"
        }
      }],
      "expo-sqlite",
      "expo-font",
      "expo-asset"
    ],
    "web": {
      "bundler": "metro",
      "output": "static",
      "favicon": "./assets/images/favicon.png"
    }
  }
}
```

**metro.config.js:**
```javascript
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Rapier WASM + 3D model assets
config.resolver.assetExts = [...(config.resolver.assetExts || []), 'wasm', 'glb', 'hdr'];
config.resolver.sourceExts = (config.resolver.sourceExts || []).filter(ext => ext !== 'wasm');

// Fix: Tone.js ESM → tslib CJS resolution
const path = require('path');
const tslibCJS = path.resolve(__dirname, 'node_modules/tslib/tslib.js');
const _origResolve = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === 'tslib') {
    return { filePath: tslibCJS, type: 'sourceFile' };
  }
  if (_origResolve) return _origResolve(context, moduleName, platform);
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
```

**babel.config.js:**
```javascript
module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ['babel-preset-expo', { unstable_transformImportMeta: true }],
    ],
  };
};
```

**tsconfig.json:**
```json
{
  "extends": "expo/tsconfig.base",
  "compilerOptions": {
    "strict": true,
    "allowImportingTsExtensions": true,
    "baseUrl": ".",
    "paths": { "@/*": ["./*"] },
    "resolveJsonModule": true
  },
  "include": ["**/*.ts", "**/*.tsx", ".expo/types/**/*.ts", "expo-env.d.ts"]
}
```

### 5.3 Web SharedArrayBuffer Support

```tsx
// app/+html.tsx
import { ScrollViewStyleReset } from 'expo-router/html';

export default function Root({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <ScrollViewStyleReset />
        {/* Enable SharedArrayBuffer for Rapier WASM */}
        <script src="/coi-serviceworker.js" />
      </head>
      <body>{children}</body>
    </html>
  );
}
```

### 5.4 Root Layout

```tsx
// app/_layout.tsx
import { Stack } from 'expo-router';
import { WorldProvider } from 'koota/react';
import { world } from '@/game/ecs/world';

export default function RootLayout() {
  return (
    <WorldProvider world={world}>
      <Stack screenOptions={{ headerShown: false }} />
    </WorldProvider>
  );
}
```

### 5.5 Game Screen

```tsx
// app/game/index.tsx
import { Canvas } from '@react-three/fiber';
import { Physics } from '@react-three/rapier';
import { Platform } from 'react-native';
import { GameSystems } from '@/game/ecs/GameSystems';
import { FPSCamera } from '@/game/input/FPSCamera';
import { TerrainRenderer } from '@/game/rendering/TerrainRenderer';
// ... other renderers

export default function GameScreen() {
  return (
    <View style={{ flex: 1 }}>
      <Canvas shadows gl={{ antialias: true }}>
        <Physics>
          <GameSystems />
          <FPSCamera />
          <TerrainRenderer />
          <CityRenderer />
          <UnitRenderer />
          <BeltRenderer />
          <WireRenderer />
          <FactoryRenderer />
          {/* ... */}
        </Physics>
      </Canvas>

      {/* HUD overlays */}
      <FPSHUD />
      {Platform.OS !== 'web' && <MobileControls />}
    </View>
  );
}
```

### 5.6 Dependencies Change

**Remove:**
- `vite`, `@vitejs/plugin-react`
- `react-dom` (on native; kept for web)

**Add:**
- `expo` (~55.x), `expo-router`, `expo-sqlite`, `expo-asset`, `expo-font`
- `koota` (replaces `miniplex`)
- `react-native`, `react-native-web`
- `@react-three/rapier` (replaces direct `@dimforge/rapier3d-compat`)
- `babel-preset-expo`
- `coi-serviceworker` (dev dependency for web WASM)
- `drizzle-kit` (dev dependency for migrations)

---

## 6. Save/Load with Koota

### 6.1 Serialization Strategy

Koota has no built-in serialization. Custom implementation using trait store APIs:

```typescript
// game/save/serialize.ts
import { world } from '../ecs/world';
import { Position, Faction, Unit, Building, Belt, Wire, Miner, Processor } from '../ecs/traits';

const SERIALIZABLE_TRAITS = [Position, Faction, Unit, Building, Belt, Wire, Miner, Processor, /* ... */];

export function serializeWorld(): string {
  const entities: any[] = [];

  for (const entity of world.entities) {
    const data: Record<string, any> = { id: entity.id() };
    for (const Trait of SERIALIZABLE_TRAITS) {
      if (entity.has(Trait)) {
        data[Trait.name ?? Trait.toString()] = structuredClone(entity.get(Trait));
      }
    }
    entities.push(data);
  }

  // World-level traits
  const globals = {
    gameTime: world.get(GameTime),
    resources: world.get(ResourcePool),
    storm: world.get(StormState),
  };

  return JSON.stringify({ entities, globals, version: 1 });
}
```

### 6.2 Persistence Backend

```typescript
// game/save/persistence.ts
import { Platform } from 'react-native';

export async function saveGame(data: string): Promise<void> {
  if (Platform.OS === 'web') {
    // IndexedDB (existing pattern)
    const db = await openDB();
    await db.put('saves', { key: 'autosave', data, timestamp: Date.now() });
  } else {
    // expo-sqlite via Drizzle
    const db = getDb();
    if (db) await db.insert(saves).values({ key: 'autosave', data }).onConflictDoUpdate(/* ... */);
  }
}
```

---

## 7. Migration Phases

### Phase 1: Foundation (Expo + Metro)
1. Create Expo project structure (`app/`, `app.json`, `metro.config.js`, `babel.config.js`)
2. Move `game/src/` → `game/` (flatten one level)
3. Replace `vite.config.ts` with Metro config
4. Add `+html.tsx` with SharedArrayBuffer headers
5. Verify R3F + Rapier + Tone.js work under Metro
6. Update all imports to `@/` path alias

### Phase 2: JSON Config Layer
1. Create `config/` directory with all JSON tunables
2. Create `game/config/index.ts` type-safe import barrel
3. Replace hardcoded values in factory functions, systems, and renderers
4. Verify config types are correctly inferred

### Phase 3: Koota ECS Migration
1. Install `koota` package
2. Define all traits in `game/ecs/traits/`
3. Create world with `createWorld()` + world traits
4. Create `gameActions` with `createActions()`
5. Migrate each system one at a time:
   - Replace `for (const e of query)` → `world.query(T).updateEach()`
   - Replace entity ID strings → relations
   - Replace manual state → world traits
6. Migrate renderers to `useQuery` / `useTrait`
7. Migrate save/load to Koota serialization
8. Remove Miniplex dependency

### Phase 4: Native Mobile
1. Set up expo-sqlite + Drizzle ORM schema
2. Platform-specific controls (already have MobileControls)
3. Test on iOS/Android simulators
4. Performance profiling on mobile

---

## 8. Miniplex → Koota Cheat Sheet

| Miniplex | Koota |
|----------|-------|
| `new World<Entity>()` | `createWorld()` |
| `world.add({ id, pos, unit })` | `world.spawn(Position(pos), Unit(cfg))` |
| `world.remove(entity)` | `entity.destroy()` |
| `world.with("unit", "pos")` | `world.query(Unit, Position)` |
| `query.where(e => ...)` | `world.query(A, Not(B))` |
| `for (const e of query)` | `query.updateEach(([a, b]) => {})` |
| `entity.unit.speed` | `entity.get(Unit).speed` |
| `entity.unit.speed = 5` | `entity.set(Unit, { speed: 5 })` |
| `entity.belt = beltData` | `entity.add(Belt(beltData))` |
| `delete entity.belt` | `entity.remove(Belt)` |
| `"unit" in entity` | `entity.has(Unit)` |
| N/A | `relation()` — first-class entity relations |
| N/A | `world.add(Trait)` — global/singleton traits |
| N/A | `createActions()` — typed action bundles |
| N/A | `onAdd`, `onChange`, `onRemove` — events |

---

## 9. Risk Assessment

| Risk | Mitigation |
|------|-----------|
| Koota is newer/less battle-tested than Miniplex | Same ecosystem (pmndrs), actively maintained, R3F-native |
| Large migration surface (20+ systems) | Phase 3 migrates one system at a time; both can coexist temporarily |
| Metro bundler differences from Vite | Grovekeeper proves R3F + Rapier + Tone.js all work under Metro |
| SharedArrayBuffer on web | `coi-serviceworker` + COOP/COEP headers (proven in grovekeeper) |
| Save/load compatibility break | Version field in save format; migration function for old saves |
| Mobile performance | Profile early in Phase 4; Koota SoA storage is more cache-friendly |

---

## 10. Success Criteria

- [ ] All game systems run on Koota ECS with trait-based queries
- [ ] Relations replace all entity ID string references (belts, wires, automation targets)
- [ ] All game balance values come from JSON config files (zero hardcoded tunables)
- [ ] Game runs under Expo/Metro on web with identical functionality
- [ ] Game builds and runs on iOS/Android via Expo
- [ ] Save/load works on web (IndexedDB) and native (expo-sqlite)
- [ ] Config changes in JSON files take effect without code changes
