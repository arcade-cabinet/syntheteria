# Koota ECS Patterns — Syntheteria Reference

> Comprehensive reference for Koota patterns, derived from the official examples at
> `/Users/jbogaty/src/reference-codebases/koota/examples/`. This document serves the
> same role as `AI_DESIGN.md` does for Yuka — it's the authoritative guide for how
> Syntheteria should use Koota.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [World Creation](#world-creation)
3. [Trait Patterns](#trait-patterns)
4. [System Patterns](#system-patterns)
5. [Actions Pattern](#actions-pattern)
6. [Schedule & Frameloop](#schedule--frameloop)
7. [React Integration](#react-integration)
8. [Sim/View Split](#simview-split)
9. [Barrel Exports](#barrel-exports)
10. [Mapping to Syntheteria](#mapping-to-syntheteria)

---

## Architecture Overview

Koota projects follow a **sim/view split** — pure ECS logic is separated from rendering:

```
src/
├── main.tsx          Entry point — WorldProvider + App
├── app.tsx           Thin React root — Renderers + Frameloop + Startup
├── world.ts          createWorld() call only
├── actions.ts        createActions() command factory
├── startup.ts        One-time entity initialization
├── frameloop.ts      Per-frame system execution
├── traits/
│   └── index.ts      All trait definitions (barrel export)
├── systems/
│   ├── schedule.ts   System execution order (if using directed)
│   └── *.ts          One system per file
└── utils/            Shared helpers
```

### Key Principles

1. **World is a parameter, not a singleton** — every system receives `world: World`
2. **Traits are data, not behavior** — minimal value containers
3. **Systems are pure functions** — accept world, query, update
4. **Actions centralize mutations** — `createActions()` factory for spawning/modifying entities
5. **React reads, ECS owns** — React components read via hooks, mutations go through actions
6. **One file per system** — named after what it does (`update-movement.ts`, `poll-keyboard.ts`)

---

## World Creation

### Pattern: `world.ts`

The world file does ONE thing — create the world with its singleton traits:

```typescript
// world.ts
import { createWorld } from 'koota';
import { Time, Keyboard, SpatialHashMap, EnemySpawner } from './traits';

export const world = createWorld(Time, Keyboard, SpatialHashMap, EnemySpawner);
```

**Singletons** are traits added directly to the world (not to entities). They hold global state:
- `Time` — frame delta/elapsed
- `Keyboard` — pressed keys set
- `SpatialHashMap` — spatial lookup
- Config/settings that need runtime mutation

### Syntheteria Currently

`src/create-world.ts` — correct pattern. The world is created with singleton traits and exported.

---

## Trait Patterns

### Simple Value Traits

```typescript
export const Position = trait({ x: 0, y: 0, z: 0 });
export const Time = trait({ delta: 0, current: 0 });
```

### Factory Default Traits

When a trait contains mutable objects (arrays, Sets, Maps, Vector3s), wrap the default in a factory function to avoid shared references:

```typescript
export const Movement = trait({
  velocity: () => new Vector3(),   // Factory — new instance per entity
  force: () => new Vector3(),
  thrust: 1,                       // Primitive — shared is fine
  maxSpeed: 10,
  damping: 0.9,
});

export const Keyboard = trait(() => new Set<string>());
export const Avoidance = trait({
  neighbors: () => [] as Entity[],
  range: 1.5,
});
```

### Marker Traits (Tag Components)

Traits with no data act as tags for querying:

```typescript
export const IsEnemy = trait();
export const IsPlayer = trait();
export const IsShieldVisible = trait();
```

### DOM/Three.js Reference Traits

```typescript
export const Ref = trait(() => null! as HTMLDivElement);
export const Transform = trait({
  position: () => new Vector3(),
  rotation: () => new Euler(),
  quaternion: () => new Quaternion(),
});
```

### Relation Traits

Relations express entity-to-entity connections:

```typescript
import { relation, ordered } from 'koota';

export const ChildOf = relation();                            // Basic parent-child
export const FiredBy = relation({ autoDestroy: 'orphan' });   // Auto-destroy when target dies
export const Targeting = relation({ exclusive: true });        // One target at a time
export const HeldBy = relation();
export const OrderedCards = ordered(HeldBy);                   // Ordered collection
```

Query with relations:

```typescript
// Find all children of a specific parent
const children = world.query(ChildOf(parentEntity));

// Ordered list API
const cards = hand.get(OrderedCards);
cards.push(newCard);    // Add to ordered list
cards.splice(idx, 1);   // Remove from list
```

### File Organization

All traits in one file (`traits/index.ts`) for small projects. For larger projects, one file per trait or logical group, with barrel export:

```typescript
// traits/index.ts
export * from './position';
export * from './movement';
export * from './markers';
```

---

## System Patterns

### Basic Query System

```typescript
// systems/move-bodies.ts
export function moveBodies(world: World) {
  const { delta } = world.get(Time)!;

  world.query(Position, Velocity, Not(Dragging))
    .updateEach(([position, velocity]) => {
      position.x += velocity.x * delta;
      position.y += velocity.y * delta;
    });
}
```

### Query Methods

```typescript
// updateEach — mutable access to trait values
world.query(Position, Velocity).updateEach(([pos, vel]) => {
  pos.x += vel.x;
});

// forEach — read + entity reference
world.query(Position, Velocity).forEach(([pos, vel], entity) => {
  if (pos.x > 100) entity.destroy();
});

// map / filter / reduce — standard iteration
const positions = world.query(Position).map(([pos]) => pos);

// useStores — direct array access for high-performance inner loops
world.query(Position, Velocity).useStores(([posStore, velStore], entities) => {
  for (let i = 0; i < entities.length; i++) {
    const id = entities[i].id();
    posStore[id].x += velStore[id].x;
  }
});
```

### Singleton Access

```typescript
export function updateTime(world: World) {
  const now = performance.now();
  world.set(Time, (prev) => ({
    delta: (now - prev.last) / 1000,
    last: now,
  }));
}
```

### Negative Queries (Not)

```typescript
import { Not } from 'koota';

// Entities with Position AND Velocity but NOT Dragging
world.query(Position, Velocity, Not(Dragging));
```

### Entity Lifecycle in Systems

```typescript
export function spawnEnemies(world: World) {
  const { delta } = world.get(Time)!;
  const spawner = world.get(EnemySpawner)!;

  spawner.accumulatedTime += delta;
  if (spawner.accumulatedTime >= spawner.interval) {
    spawner.accumulatedTime = 0;
    world.spawn(IsEnemy, Movement, Transform);
  }
}

export function cleanupBullets(world: World) {
  world.query(Bullet).forEach(([bullet], entity) => {
    if (bullet.timeAlive > bullet.lifetime) {
      entity.destroy();
    }
  });
}
```

---

## Actions Pattern

### createActions Factory

Actions centralize entity creation and complex mutations. They're defined as a factory that receives the world:

```typescript
// actions.ts
import { createActions } from 'koota';
import { IsPlayer, Movement, Transform, IsEnemy, Bullet } from './traits';

export const actions = createActions((world) => ({
  spawnPlayer: (transform?: TransformValue) => {
    return world.spawn(IsPlayer, Movement, Input, Transform(transform));
  },

  spawnEnemy: (options: { position?: [number, number, number] } = {}) => {
    const enemy = world.spawn(
      IsEnemy,
      Movement({ thrust: 0.5, damping: 0.98 }),
      Transform,
    );
    if (options.position) {
      enemy.set(Transform, (prev) => ({
        position: prev.position.set(...options.position!),
      }));
    }
    return enemy;
  },

  spawnBullet: (position: Vector3, rotation: Quaternion) => {
    const direction = new Vector3(0, 1, 0).applyQuaternion(rotation);
    return world.spawn(
      Transform({ position: position.clone(), quaternion: rotation.clone() }),
      Bullet({ direction }),
    );
  },

  destroyAllEnemies: () => {
    world.query(IsEnemy).forEach((enemy) => enemy.destroy());
  },
}));
```

### Usage in React

```typescript
import { useActions } from 'koota/react';
import { actions } from './actions';

function Startup() {
  const { spawnPlayer } = useActions(actions);

  useEffect(() => {
    const player = spawnPlayer();
    return () => player?.destroy();
  }, [spawnPlayer]);

  return null;
}
```

### Usage Outside React (imperative)

```typescript
const { spawnBoid } = actions(world);
for (let i = 0; i < CONFIG.initialCount; i++) {
  spawnBoid();
}
```

---

## Schedule & Frameloop

### Option A: directed.Schedule (Non-React / Three.js)

For projects using Three.js directly (not R3F):

```typescript
// systems/schedule.ts
import { Schedule } from 'directed';
import type { World } from 'koota';

export const schedule = new Schedule<{ world: World }>();

schedule.createTag('init');
schedule.createTag('update', { after: 'init' });
schedule.createTag('end', { after: 'update' });

schedule.add(updateTime, { tag: 'update' });
schedule.add(updateGravity, { after: updateTime, tag: 'update' });
schedule.add(moveBodies, { after: updateGravity, tag: 'update' });

// View systems added from view/main.ts:
// schedule.add(syncThreeObjects, { after: 'update' });

schedule.build();
```

Execution:

```typescript
const main = () => {
  schedule.run({ world });
  requestAnimationFrame(main);
};
requestAnimationFrame(main);
```

### Option B: Frameloop Component (React)

For React/R3F projects, systems run inside a React component:

```typescript
// frameloop.ts
import { useWorld } from 'koota/react';
import { useAnimationFrame } from './utils/use-animation-frame';

export function Frameloop() {
  const world = useWorld();

  useAnimationFrame(() => {
    updateTime(world);
    pollKeyboard(world);
    spawnEnemies(world);
    updateMovement(world);
    updateCollisions(world);
    cleanupBullets(world);
  });

  return null;
}
```

For R3F, use `useFrame` instead:

```typescript
export function Frameloop() {
  const world = useWorld();

  useFrame(({ clock }, delta) => {
    world.set(Time, { delta, current: clock.elapsedTime });
    updateMovement(world);
    // ... other systems
  });

  return null;
}
```

### Syntheteria Consideration

Syntheteria is turn-based, not real-time. The "frameloop" runs rendering updates (camera, animations, particles) per-frame, but game logic runs per-turn via explicit system calls. This means we need TWO loops:
- **Render loop** — `useFrame`/`requestAnimationFrame` for animations, camera, particles
- **Turn loop** — explicit `advanceTurn(world)` triggered by user action

---

## React Integration

### Core Hooks

```typescript
import { useWorld, useQuery, useQueryFirst, useTrait, useHas, useActions, useTraitEffect } from 'koota/react';

// Access the world
const world = useWorld();

// Query all entities with traits
const enemies = useQuery(IsEnemy, Transform);

// Query first matching entity
const player = useQueryFirst(IsPlayer, Transform);

// Read a trait value (re-renders when trait changes)
const movement = useTrait(entity, Movement);

// Check if entity has a trait (boolean, re-renders on change)
const isDragging = useHas(entity, Dragging);

// Access actions
const { spawnPlayer } = useActions(actions);

// Effect that runs when trait changes
useTraitEffect(entity, Input, (input) => {
  if (input && input.length() > 0) setIsThrusting(true);
});
```

### WorldProvider

```typescript
// main.tsx
import { WorldProvider } from 'koota/react';
import { world } from './world';

ReactDOM.createRoot(root).render(
  <WorldProvider world={world}>
    <App />
  </WorldProvider>
);
```

### Entity Renderer Pattern

```typescript
function EnemyRenderer() {
  const enemies = useQuery(IsEnemy, Transform);
  return enemies.map((enemy) => <EnemyView key={enemy.id()} entity={enemy} />);
}

const EnemyView = ({ entity }: { entity: Entity }) => {
  const groupRef = useRef<THREE.Group>(null);

  const handleInit = useCallback((group: THREE.Group | null) => {
    if (!entity.isAlive() || !group) return;
    groupRef.current = group;
    // Sync Three.js ref to ECS trait
    entity.set(Transform, (prev) => ({
      position: group.position.copy(prev.position),
      rotation: group.rotation.copy(prev.rotation),
    }));
  }, [entity]);

  return (
    <group ref={handleInit}>
      <mesh>
        <dodecahedronGeometry />
        <meshBasicMaterial color="white" wireframe />
      </mesh>
    </group>
  );
};
```

### DOM Renderer Pattern

```typescript
function CardView({ entity }: { entity: Entity }) {
  const card = useTrait(entity, Card);
  const isDragging = useHas(entity, Dragging);

  const handleInit = useCallback((div: HTMLDivElement | null) => {
    if (!div) return;
    entity.add(Ref(div));
    return () => entity.remove(Ref);
  }, [entity]);

  const handlePointerDown = useCallback((event: React.PointerEvent) => {
    entity.set(Position, { x: centerX, y: centerY });
    entity.add(Dragging({ offset }));
  }, [entity]);

  return (
    <div ref={handleInit} onPointerDown={handlePointerDown}
         className={`card ${isDragging ? 'dragging' : ''}`}>
      <div className="card-name">{card.name}</div>
    </div>
  );
}
```

---

## Sim/View Split

### Pattern: Pure Sim + View Layer

The sim package contains all game logic — it has ZERO rendering dependencies:

```
sim/
├── index.ts        Barrel export (public API)
├── world.ts        createWorld()
├── config.ts       TypeScript constants
├── actions.ts      createActions()
├── traits/         All trait definitions
│   └── index.ts
├── systems/        All game logic systems
│   └── schedule.ts
└── utils/          Shared helpers
```

The view package imports from sim and adds rendering:

```
view/
├── main.ts         Entry point — sets up renderer + schedule
├── scene.ts        THREE.Scene()
├── systems/        View-only systems
│   ├── init.ts           Create meshes, add to scene
│   └── syncThreeObjects  Query → update mesh transforms
└── traits/
    └── InstancedMesh.ts  Three.js resource traits
```

### Key Rule

**View imports sim. Sim never imports view.**

```typescript
// view/main.ts
import { world, schedule, actions, CONFIG } from '../sim';

// Add view systems AFTER sim systems
schedule.add(syncThreeObjects, { after: 'update' });
schedule.build();
```

---

## Barrel Exports

### Package Index Pattern

Every package has an `index.ts` that exports its public API:

```typescript
// sim/index.ts
export * from './traits';
export { world } from './world';
export { CONFIG } from './config';
export { schedule } from './systems/schedule';
export { actions } from './actions';
```

### Consumer Pattern

Other packages import from the barrel, never into internals:

```typescript
// CORRECT
import { Position, Velocity, world, actions } from '../sim';

// WRONG
import { Position } from '../sim/traits/position';
import { world } from '../sim/world';
```

---

## Mapping to Syntheteria

### What We Already Have Right

| Koota Pattern | Syntheteria | Status |
|---------------|-------------|--------|
| `world.ts` | `src/create-world.ts` | DONE |
| `traits/index.ts` | `src/traits/index.ts` | DONE |
| `systems/` with `world: World` param | `src/systems/` | DONE |
| sim/view split | **`src/board/`** + **`src/lib/`** (math, fog helpers, assets) + **`src/views/title/`** + **`src/views/board/`** — **`src/rendering/` retired** (§8) — **no `src/view/`** after §0 | IN PROGRESS — [COMPREHENSIVE_ENGINEERING_PLAN.md](COMPREHENSIVE_ENGINEERING_PLAN.md) §0 + §8 |
| One system per file | `src/systems/*.ts` | DONE (but some files >500 LOC) |
| Config as TS constants | `src/config/*.ts` (11 files) | DONE |
| Singleton traits | Board, Time etc. on world | DONE |

### What We Need to Add

| Koota Pattern | Current State | Action Required |
|---------------|---------------|-----------------|
| `actions.ts` | Entity spawning scattered | Create `src/actions.ts` with `createActions()` |
| `app.tsx` | `main.tsx` is 1253 lines | Extract thin `App.tsx` into `src/app/` |
| `startup.ts` | Init logic in `main.tsx` + `init-world.ts` | Create `src/app/Startup.tsx` component |
| `frameloop.ts` | Render loop embedded in `main.tsx` | Create `src/app/Frameloop.tsx` component |
| `WorldProvider` | Not using `WorldProvider` | Wrap app in `<WorldProvider world={world}>` |
| `useQuery` / `useTrait` | Direct world queries in components | Adopt Koota React hooks |
| `useActions` | Direct `world.spawn()` calls | Use `useActions(actions)` in components |
| Barrel exports only | 367 deep import violations | Fix all imports to go through `index.ts` |
| Files < 500 LOC | 29 files over limit | Split oversized files |

### App Structure Target

```
src/
├── main.tsx              Thin: ReactDOM.createRoot + WorldProvider + App
├── create-world.ts       createWorld() with singletons
├── actions.ts            createActions() — all entity spawning/mutation
│
├── app/                  App shell (React)
│   ├── index.ts
│   ├── App.tsx           Thin root: <Globe /> + <Frameloop /> + <Startup />
│   ├── Startup.tsx       One-time world initialization
│   ├── Frameloop.tsx     Per-frame render loop + per-turn game logic
│   ├── session.ts        Game session lifecycle
│   ├── debug.ts          E2E debug bridge
│   ├── hudData.ts        Pure HUD data readers
│   └── types.ts          Phase, GameSession types
│
├── traits/               All ECS trait definitions
│   └── index.ts          Barrel export
├── systems/              All game logic systems
│   └── index.ts          Barrel export
├── config/               TypeScript constants (11 files)
│   └── index.ts          Barrel export
│
├── board/                Board generation & grid (+ sphere/depth from ex-`rendering/` after §8)
├── ai/                   Yuka GOAP
├── buildings/            Building definitions
├── factions/             Faction & cult definitions
├── robots/               Robot archetypes & specializations
├── resources/            Resource types
├── terrain/              Terrain types & floor defs
├── narrative/            Speech profiles & lore
├── db/                   SQLite persistence
├── audio/                Tone.js audio engine
├── lib/                  Shared utils (+ modelPaths, particles, fog helpers after §8)
│
├── views/                All render adapters (barrel per subpackage)
│   ├── title/            R3F — globe, StormSky, PathRenderer, …
│   └── board/            Phaser + enable3d — WorldScene, terrain, units, …
├── ui/                   DOM overlay components
│   ├── game/
│   └── landing/
├── camera/               Camera components
└── input/                Input handling
```

### Turn-Based Adaptation

Koota examples are real-time. Syntheteria is turn-based. The adaptation:

```typescript
// app/Frameloop.tsx
export function Frameloop() {
  const world = useWorld();

  // RENDER LOOP — runs every frame (animations, camera, particles)
  useFrame(({ clock }, delta) => {
    world.set(Time, { delta, current: clock.elapsedTime });
    updateAnimations(world);
    updateParticles(world);
    updateCamera(world);
  });

  return null;
}

// Turn advancement is NOT in the frameloop — it's triggered by user action:
// actions.ts
export const actions = createActions((world) => ({
  endTurn: () => {
    advanceTurn(world);      // AI, attacks, environment, new turn
    autoSave(world);
  },
  // ...
}));
```

---

## Koota API Quick Reference

### Entity

```typescript
const entity = world.spawn(TraitA, TraitB);   // Create entity with traits
entity.add(TraitC);                            // Add trait to existing entity
entity.remove(TraitC);                         // Remove trait
entity.has(TraitC);                            // Check if has trait
entity.get(TraitA);                            // Read trait value (or null)
entity.set(TraitA, { x: 10 });                // Set trait value
entity.set(TraitA, (prev) => ({ x: prev.x + 1 })); // Update with function
entity.destroy();                              // Remove entity from world
entity.isAlive();                              // Check if still exists
entity.id();                                   // Get numeric ID (METHOD, not property!)
```

### World

```typescript
const world = createWorld(SingletonA, SingletonB);
world.spawn(TraitA, TraitB);                   // Create entity
world.query(TraitA, TraitB);                   // Query entities
world.get(SingletonA);                         // Read singleton
world.set(SingletonA, { value: 42 });          // Set singleton
world.add(SingletonB);                         // Add singleton
world.destroy();                               // Destroy world (cleanup)
```

### Query

```typescript
import { Not, Or, Changed } from 'koota';

world.query(A, B);                     // Has A AND B
world.query(A, Not(B));                // Has A but NOT B
world.query(A, Or(B, C));              // Has A AND (B OR C)
world.query(Changed(A));               // A was modified this frame

// Iteration
query.updateEach(([a, b]) => { ... }); // Mutable access
query.forEach(([a, b], entity) => { ... }); // Read + entity
query.map(([a]) => a.x);              // Transform
query.useStores(([aStore, bStore], entities) => { ... }); // Direct arrays
```

---

## Reference Examples

| Example | Pattern | Key Files |
|---------|---------|-----------|
| `revade` | R3F game with actions, startup, frameloop | `app.tsx`, `actions.ts`, `frameloop.ts`, `startup.ts` |
| `cards` | DOM rendering with relations, ordered collections | `app.tsx`, `actions.ts`, `traits/index.ts` |
| `boids` | sim/view split with Three.js schedule | `sim/index.ts`, `view/main.ts`, `sim/systems/schedule.ts` |
| `n-body` | High-performance useStores pattern | `sim/systems/updateGravity.ts` |
| `graph-traversal` | Headless ECS with relations | `traits/child-of.ts`, `systems/traverse.ts` |
| `react-120` | 1000 entities with React DOM rendering | `view/renderers/ball-renderer.tsx` |

All examples at: `/Users/jbogaty/src/reference-codebases/koota/examples/`
