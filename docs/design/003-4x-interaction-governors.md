# GDD-003: 4X Framework, Contextual Interaction, Yuka Governors, Race Selection

**Status:** Draft
**Date:** 2026-03-10
**Scope:** Evolve Syntheteria from factory builder to full 4X with AI civilizations, contextual object interaction, and pregame setup

---

## 1. Vision: Machine Planet 4X

Syntheteria becomes a **first-person 4X** on a procedural machine planet. You are one civilization of mechanical beings competing against others for territory, resources, and dominance. Each civilization is governed by Yuka GOAP AI that makes strategic decisions about expansion, economy, military, and diplomacy.

### The 4X Pillars

| Pillar | Mechanic |
|--------|----------|
| **eXplore** | Fog of war, terrain scanning, discovering resource deposits and ruins |
| **eXpand** | Claim territory with outposts, extend power/signal networks, build infrastructure |
| **eXploit** | Mine → belt → process → fabricate pipeline, power grid, compute network |
| **eXterminate** | Combat (FPS + bot armies), hacking enemy infrastructure, sabotage |

### What Changes from Current State

| Current | 4X Evolution |
|---------|-------------|
| Single player faction vs feral/cultist enemies | Multiple AI civilizations competing on same planet |
| Tool-based interaction (select tool, then use) | Contextual object interaction (click object, see its actions) |
| Manual factory building only | AI governors auto-manage economy/military for AI civs |
| No pregame setup | Race selection + map customization screen |
| Hardcoded enemy AI (if/else patrol/aggro) | Yuka GOAP goal-oriented decision making |
| 6 fixed tools | Dynamic action menus per object type |

---

## 2. Contextual Object Interaction

### 2.1 Core Concept

**Every object on the planet surface is a kinematic Rapier physics body** that can be:
1. **Raycast-hit** (click/tap) — Rapier `castRay` from camera through crosshair
2. **Highlighted** — emissive glow outline on the Three.js mesh
3. **Action menu** — radial menu appears over the object with available actions

This replaces the tool system entirely. Instead of "equip welder, then click", you click the enemy bot and see `[ATTACK] [HACK] [SCAN]`. Click the belt and see `[ROTATE] [REMOVE] [CONNECT]`.

### 2.2 Interaction Flow

```
Player looks at object
    ↓
Crosshair hover → subtle highlight (emissive pulse)
    ↓
Click/Tap
    ↓
Object gets bright emissive highlight ring
    ↓
Radial action menu appears OVER the object (screen-projected position)
    ↓
Player selects action → action executes → menu closes
    ↓
(or click elsewhere / ESC → deselect)
```

### 2.3 Physics Layer

Every placeable/interactable object gets a kinematic Rapier collider:

```typescript
// game/physics/InteractionColliders.tsx
import { useFrame } from '@react-three/fiber';
import { RigidBody } from '@react-three/rapier';

// All buildings, belts, miners, processors, units, etc. have colliders
// Colliders are kinematic (not affected by forces) but detectable by raycasts

function InteractableBody({ entity, children }) {
  return (
    <RigidBody type="kinematicPosition" colliders="cuboid" userData={{ entityId: entity.id() }}>
      {children}
    </RigidBody>
  );
}
```

### 2.4 Raycast Selection System

```typescript
// game/input/ObjectSelection.tsx
import { useThree, useFrame } from '@react-three/fiber';
import { useWorld } from 'koota/react';

// Persistent state
let hoveredEntity: Entity | null = null;
let selectedEntity: Entity | null = null;

export function ObjectSelectionSystem() {
  const { camera, raycaster } = useThree();
  const world = useWorld();
  const rapierWorld = useRapierWorld(); // from @react-three/rapier

  useFrame(() => {
    // Cast ray from camera center (crosshair)
    const origin = camera.position;
    const direction = new Vector3(0, 0, -1).applyQuaternion(camera.quaternion);

    const ray = new rapier.Ray(origin, direction);
    const hit = rapierWorld.castRay(ray, MAX_INTERACT_RANGE, true);

    if (hit) {
      const collider = hit.collider;
      const entityId = collider.parent()?.userData?.entityId;
      hoveredEntity = entityId ? world.entity(entityId) : null;
    } else {
      hoveredEntity = null;
    }
  });

  // Click handler
  useEffect(() => {
    const onClick = () => {
      if (hoveredEntity) {
        selectedEntity = hoveredEntity;
        // Trigger radial menu
      } else {
        selectedEntity = null;
        // Close radial menu
      }
    };
    // ...
  });

  return null;
}
```

### 2.5 Emissive Highlight System

```typescript
// game/rendering/SelectionHighlight.tsx
// When an entity is hovered or selected, its mesh gets an emissive glow

function HighlightEffect({ entity, mode }: { entity: Entity; mode: 'hover' | 'selected' }) {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((_, delta) => {
    if (!meshRef.current) return;
    const mat = meshRef.current.material as THREE.MeshStandardMaterial;

    if (mode === 'hover') {
      // Subtle pulse
      const pulse = 0.1 + Math.sin(performance.now() * 0.003) * 0.05;
      mat.emissiveIntensity = pulse;
      mat.emissive.setHex(0x00ffaa);
    } else {
      // Bright steady glow
      mat.emissiveIntensity = 0.4;
      mat.emissive.setHex(0x00ffdd);
    }
  });
}
```

### 2.6 Contextual Radial Action Menu

The radial menu is **context-sensitive** — actions depend on what you clicked and what you can do.

```typescript
// game/ui/ObjectActionMenu.tsx
// Screen-projected over the selected 3D object

interface ObjectAction {
  id: string;
  label: string;
  icon: string;
  color: string;
  enabled: boolean;     // greyed out if requirements not met
  tooltip?: string;     // why disabled
}

// Action resolver — determines available actions per entity type
function getActionsForEntity(entity: Entity, playerEntity: Entity): ObjectAction[] {
  const actions: ObjectAction[] = [];

  // Universal: scan is always available
  actions.push({ id: 'scan', label: 'SCAN', icon: '◎', color: '#00ffaa', enabled: true });

  // Unit-specific actions
  if (entity.has(Unit)) {
    const faction = entity.get(Faction);

    if (faction.value === 'player') {
      // Friendly unit
      actions.push({ id: 'switch', label: 'PILOT', icon: '⇄', color: '#44aaff', enabled: true });
      actions.push({ id: 'repair', label: 'REPAIR', icon: '⚙', color: '#44aaff',
        enabled: hasRepairMaterials(entity) });
      actions.push({ id: 'command', label: 'ORDER', icon: '▶', color: '#44ff88', enabled: true });
    } else {
      // Enemy unit
      actions.push({ id: 'attack', label: 'ATTACK', icon: '⚡', color: '#ff4444',
        enabled: hasWeapon(playerEntity) });
      if (entity.has(Hackable)) {
        actions.push({ id: 'hack', label: 'HACK', icon: '⬡', color: '#aa44ff',
          enabled: hasComputePower() });
      }
    }
  }

  // Building-specific actions
  if (entity.has(Building)) {
    actions.push({ id: 'info', label: 'STATUS', icon: '▣', color: '#aa8844', enabled: true });
    actions.push({ id: 'salvage', label: 'SALVAGE', icon: '◈', color: '#ff8844', enabled: true });

    if (entity.has(Processor)) {
      actions.push({ id: 'recipe', label: 'RECIPE', icon: '⬡', color: '#aa44ff', enabled: true });
    }
  }

  // Belt-specific
  if (entity.has(Belt)) {
    actions.push({ id: 'rotate', label: 'ROTATE', icon: '↻', color: '#44ff88', enabled: true });
    actions.push({ id: 'remove', label: 'REMOVE', icon: '✕', color: '#ff4444', enabled: true });
  }

  // Wire-specific
  if (entity.has(Wire)) {
    actions.push({ id: 'disconnect', label: 'CUT', icon: '✂', color: '#ff4444', enabled: true });
  }

  // Terrain / empty ground (clicked via ground raycast)
  // → BUILD submenu
  if (!entity) {
    actions.push({ id: 'build_belt', label: 'BELT', icon: '═', color: '#44ff88', enabled: true });
    actions.push({ id: 'build_miner', label: 'MINER', icon: '⛏', color: '#aa8844', enabled: true });
    actions.push({ id: 'build_rod', label: 'ROD', icon: '⚡', color: '#ffaa00', enabled: true });
    actions.push({ id: 'build_fab', label: 'FAB', icon: '⬡', color: '#aa44ff', enabled: true });
  }

  return actions;
}
```

### 2.7 Ground Click → Build Mode

When the player clicks empty ground (terrain hit, no entity collider), the radial shows buildable items. Selecting one enters placement mode where a ghost preview follows the crosshair until confirmed.

### 2.8 What Gets Removed

| Removed | Replaced By |
|---------|-------------|
| `RadialToolMenu.tsx` | `ObjectActionMenu.tsx` (context-sensitive per object) |
| `EquippedToolView.tsx` | No equipped tool concept — actions are contextual |
| `getEquippedTool()` / tool state | `getActionsForEntity()` per selection |
| `FPSInput.tsx` (E to interact) | `ObjectSelectionSystem.tsx` (click/tap any physics object) |
| `fpsCombat.ts` (welder raycast) | Attack action from radial menu on enemy entity |
| `buildingPlacement.ts` (tool-initiated) | Ground-click → build submenu → placement mode |

---

## 3. Yuka GOAP Governor AI

### 3.1 Architecture

Each AI civilization is managed by a **Governor** — a Yuka `Think`-based GOAP agent that evaluates strategic goals each tick and picks the highest-priority action.

```
CivilizationGovernor
├── Think<GovernorEntity> brain
│   ├── ExpandEvaluator        — claim new territory
│   ├── EconomyEvaluator       — build factories, optimize production
│   ├── MilitaryEvaluator      — build combat units, defend borders
│   ├── ResearchEvaluator      — upgrade technology tiers
│   ├── DiplomacyEvaluator     — trade, alliances, threats
│   └── DefenseEvaluator       — fortify borders, repair damage
├── State machine: IDLE → DECIDING → EXECUTING → IDLE
├── Per-civ resource pool
├── Per-civ territory map
└── Per-civ unit roster
```

### 3.2 GovernorEntity (Yuka Bridge)

```typescript
// game/ai/governor/entity.ts
import { GameEntity, Think } from 'yuka';

export class CivGovernorEntity extends GameEntity {
  brain: Think<CivGovernorEntity>;

  // Transient context set each tick before evaluation
  civId: string = '';
  resources: ResourceSnapshot = {} as ResourceSnapshot;
  territory: TerritorySnapshot = {} as TerritorySnapshot;
  threats: ThreatSnapshot = {} as ThreatSnapshot;
  techLevel: number = 0;

  constructor() {
    super();
    this.brain = new Think<CivGovernorEntity>(this);
  }
}
```

### 3.3 Strategic Evaluators

```typescript
// game/ai/governor/evaluators.ts
import { GoalEvaluator } from 'yuka';
import type { CivGovernorEntity } from './entity';

export class ExpandEvaluator extends GoalEvaluator<CivGovernorEntity> {
  calculateDesirability(entity: CivGovernorEntity): number {
    const { territory, resources } = entity;
    // High desire when: few territories, surplus resources, no immediate threats
    const fewTerritories = Math.max(0, 1 - territory.claimedTiles / 50);
    const hasResources = resources.scrapMetal > 20 ? 0.3 : 0;
    const noThreats = entity.threats.borderPressure < 0.3 ? 0.2 : 0;
    return this.characterBias * (fewTerritories * 0.5 + hasResources + noThreats);
  }
  setGoal(): void {}
}

export class EconomyEvaluator extends GoalEvaluator<CivGovernorEntity> {
  calculateDesirability(entity: CivGovernorEntity): number {
    const { resources, territory } = entity;
    // High desire when: low resource production, have territory to build on
    const lowProduction = resources.productionRate < territory.claimedTiles * 0.5 ? 0.6 : 0.1;
    const hasSpace = territory.emptyBuildSlots > 0 ? 0.3 : 0;
    return this.characterBias * (lowProduction + hasSpace);
  }
  setGoal(): void {}
}

export class MilitaryEvaluator extends GoalEvaluator<CivGovernorEntity> {
  calculateDesirability(entity: CivGovernorEntity): number {
    const { threats, resources } = entity;
    // High desire when: border pressure, enough resources for units
    const threat = threats.borderPressure;
    const canAfford = resources.refinedMetal > 10 ? 0.3 : 0;
    const lowArmy = threats.militaryStrength < threats.enemyStrength ? 0.4 : 0;
    return this.characterBias * (threat * 0.5 + canAfford + lowArmy);
  }
  setGoal(): void {}
}

export class DefenseEvaluator extends GoalEvaluator<CivGovernorEntity> {
  calculateDesirability(entity: CivGovernorEntity): number {
    const { threats, territory } = entity;
    // High desire when: recent attacks, unfortified borders
    const recentAttack = threats.recentDamage > 0 ? 0.5 : 0;
    const unfortified = territory.unfortifiedBorders / Math.max(1, territory.totalBorders);
    return this.characterBias * (recentAttack + unfortified * 0.4);
  }
  setGoal(): void {}
}

export class ResearchEvaluator extends GoalEvaluator<CivGovernorEntity> {
  calculateDesirability(entity: CivGovernorEntity): number {
    // Low urgency base, but increases with stability
    const stable = entity.threats.borderPressure < 0.2 ? 0.3 : 0;
    const hasCompute = entity.resources.computeAvailable > 5 ? 0.3 : 0;
    return this.characterBias * (0.1 + stable + hasCompute);
  }
  setGoal(): void {}
}

export class DiplomacyEvaluator extends GoalEvaluator<CivGovernorEntity> {
  calculateDesirability(entity: CivGovernorEntity): number {
    // Only relevant when there are multiple civs and trade is possible
    const hasNeighbors = entity.threats.knownCivs > 0 ? 0.2 : 0;
    const wantsTrade = entity.resources.surplusTypes > 0 ? 0.3 : 0;
    return this.characterBias * (hasNeighbors + wantsTrade);
  }
  setGoal(): void {}
}
```

### 3.4 Governor Profiles (JSON-Driven)

Each civilization race has a governor profile that biases the evaluator weights:

```jsonc
// config/civilizations.json
{
  "reclaimer": {
    "displayName": "The Reclaimers",
    "description": "Scavenger machines that rebuild from ruins. Strong economy, weak military.",
    "color": "#00ffaa",
    "governor": {
      "expandWeight": 0.7,
      "economyWeight": 1.2,
      "militaryWeight": 0.5,
      "defenseWeight": 0.8,
      "researchWeight": 0.9,
      "diplomacyWeight": 1.0
    },
    "startingUnits": [
      { "type": "maintenance_bot", "count": 3 },
      { "type": "utility_drone", "count": 1 }
    ],
    "bonuses": {
      "miningEfficiency": 1.3,
      "fabricationSpeed": 1.2,
      "combatDamage": 0.8
    }
  },
  "volt_collective": {
    "displayName": "Volt Collective",
    "description": "Lightning-worshipping machines. Powerful storms, aggressive expansion.",
    "color": "#ffaa00",
    "governor": {
      "expandWeight": 1.1,
      "economyWeight": 0.7,
      "militaryWeight": 1.3,
      "defenseWeight": 0.6,
      "researchWeight": 0.5,
      "diplomacyWeight": 0.4
    },
    "startingUnits": [
      { "type": "maintenance_bot", "count": 2 },
      { "type": "fabrication_unit", "count": 1 }
    ],
    "bonuses": {
      "lightningRodOutput": 1.5,
      "combatDamage": 1.3,
      "miningEfficiency": 0.9
    }
  },
  "signal_choir": {
    "displayName": "The Signal Choir",
    "description": "Networked hive-mind. Supreme hacking, distributed compute.",
    "color": "#aa44ff",
    "governor": {
      "expandWeight": 0.8,
      "economyWeight": 0.9,
      "militaryWeight": 0.6,
      "defenseWeight": 0.7,
      "researchWeight": 1.4,
      "diplomacyWeight": 1.1
    },
    "startingUnits": [
      { "type": "utility_drone", "count": 2 },
      { "type": "signal_relay", "count": 3 }
    ],
    "bonuses": {
      "hackingSpeed": 1.5,
      "signalRange": 1.4,
      "miningEfficiency": 0.8
    }
  },
  "iron_creed": {
    "displayName": "Iron Creed",
    "description": "Armored fortress builders. Slow expansion, impenetrable defense.",
    "color": "#aa8844",
    "governor": {
      "expandWeight": 0.4,
      "economyWeight": 1.0,
      "militaryWeight": 0.9,
      "defenseWeight": 1.5,
      "researchWeight": 0.7,
      "diplomacyWeight": 0.6
    },
    "startingUnits": [
      { "type": "maintenance_bot", "count": 2 },
      { "type": "fabrication_unit", "count": 2 }
    ],
    "bonuses": {
      "buildingHealth": 1.5,
      "wallStrength": 2.0,
      "combatDamage": 1.1,
      "miningEfficiency": 0.7,
      "expansionSpeed": 0.6
    }
  }
}
```

### 3.5 CivilizationGovernor Class

```typescript
// game/ai/governor/CivilizationGovernor.ts
import { GoalEvaluator } from 'yuka';
import { CivGovernorEntity } from './entity';
import {
  ExpandEvaluator, EconomyEvaluator, MilitaryEvaluator,
  DefenseEvaluator, ResearchEvaluator, DiplomacyEvaluator
} from './evaluators';
import { civConfig } from '../../config';

type StrategicAction = 'expand' | 'economy' | 'military' | 'defense' | 'research' | 'diplomacy';

export class CivilizationGovernor {
  private entity: CivGovernorEntity;
  private civId: string;
  private state: 'idle' | 'deciding' | 'executing' = 'idle';
  private currentAction: StrategicAction | null = null;
  private cooldown = 0;

  constructor(civId: string) {
    this.civId = civId;
    this.entity = new CivGovernorEntity();
    this.entity.civId = civId;

    const profile = civConfig[civId].governor;

    this.entity.brain.addEvaluator(new ExpandEvaluator(profile.expandWeight));
    this.entity.brain.addEvaluator(new EconomyEvaluator(profile.economyWeight));
    this.entity.brain.addEvaluator(new MilitaryEvaluator(profile.militaryWeight));
    this.entity.brain.addEvaluator(new DefenseEvaluator(profile.defenseWeight));
    this.entity.brain.addEvaluator(new ResearchEvaluator(profile.researchWeight));
    this.entity.brain.addEvaluator(new DiplomacyEvaluator(profile.diplomacyWeight));
  }

  update(dt: number, context: CivContext): void {
    // Update entity context for evaluators
    this.entity.resources = context.resources;
    this.entity.territory = context.territory;
    this.entity.threats = context.threats;
    this.entity.techLevel = context.techLevel;

    this.cooldown -= dt;
    if (this.cooldown > 0) return;

    // Evaluate all strategic goals
    let bestAction: StrategicAction = 'economy';
    let bestScore = 0;

    // Use Yuka Think to evaluate
    for (const evaluator of this.entity.brain.evaluators) {
      const score = evaluator.calculateDesirability(this.entity);
      if (score > bestScore) {
        bestScore = score;
        bestAction = evaluator.constructor.name.replace('Evaluator', '').toLowerCase() as StrategicAction;
      }
    }

    this.executeAction(bestAction, context);
    this.cooldown = 5; // Re-evaluate every 5 seconds
  }

  private executeAction(action: StrategicAction, context: CivContext): void {
    switch (action) {
      case 'expand':
        this.doExpand(context);
        break;
      case 'economy':
        this.doBuildFactory(context);
        break;
      case 'military':
        this.doTrainUnits(context);
        break;
      case 'defense':
        this.doFortify(context);
        break;
      case 'research':
        this.doResearch(context);
        break;
      case 'diplomacy':
        this.doTrade(context);
        break;
    }
  }

  // ... action implementations that spawn entities, place buildings, etc.
}
```

### 3.6 AI Civilization System

```typescript
// game/systems/civilizationAI.ts
// Runs once per sim tick for each non-player civilization

import { CivilizationGovernor } from '../ai/governor/CivilizationGovernor';

const governors = new Map<string, CivilizationGovernor>();

export function initCivilizations(civIds: string[]) {
  for (const id of civIds) {
    governors.set(id, new CivilizationGovernor(id));
  }
}

export function civilizationAISystem(delta: number) {
  for (const [civId, governor] of governors) {
    const context = gatherCivContext(civId); // Query Koota world for this civ's state
    governor.update(delta, context);
  }
}
```

### 3.7 Unit-Level AI (Yuka for Individuals Too)

Individual units (ferals, cultist patrols, automated bots) also use Yuka evaluators instead of hardcoded if/else:

```typescript
// game/ai/unit/UnitBrain.ts
import { GameEntity, Think, GoalEvaluator } from 'yuka';

class PatrolEvaluator extends GoalEvaluator<UnitBrainEntity> {
  calculateDesirability(entity: UnitBrainEntity): number {
    if (entity.ctx.nearbyEnemies > 0) return 0;
    return this.characterBias * 0.3;
  }
}

class AttackEvaluator extends GoalEvaluator<UnitBrainEntity> {
  calculateDesirability(entity: UnitBrainEntity): number {
    if (entity.ctx.nearbyEnemies === 0) return 0;
    const hasWeapons = entity.ctx.weaponFunctional ? 0.5 : 0;
    const healthFactor = entity.ctx.healthPercent > 0.3 ? 0.3 : 0;
    return this.characterBias * (hasWeapons + healthFactor);
  }
}

class FleeEvaluator extends GoalEvaluator<UnitBrainEntity> {
  calculateDesirability(entity: UnitBrainEntity): number {
    if (entity.ctx.nearbyEnemies === 0) return 0;
    const lowHealth = entity.ctx.healthPercent < 0.3 ? 0.7 : 0;
    const outnumbered = entity.ctx.nearbyEnemies > entity.ctx.nearbyAllies ? 0.3 : 0;
    return this.characterBias * (lowHealth + outnumbered);
  }
}

class GuardEvaluator extends GoalEvaluator<UnitBrainEntity> {
  calculateDesirability(entity: UnitBrainEntity): number {
    if (!entity.ctx.assignedPost) return 0;
    return this.characterBias * 0.5;
  }
}
```

This replaces the current `cultistAI.ts` and `enemies.ts` hardcoded behavior trees.

---

## 4. Race Selection & Map Customization

### 4.1 Pregame Flow

```
Title Screen → [NEW GAME] → Race Selection → Map Setup → Game Start
```

### 4.2 Race Selection Screen

```typescript
// app/setup/index.tsx (expo-router)
// Full-screen race selection with 3D preview

interface RaceSelectionState {
  selectedRace: string | null;
  opponents: string[];     // AI civ selections
  opponentCount: number;   // 1-3 AI opponents
}
```

**UI Layout:**
```
┌─────────────────────────────────────────────────────┐
│                  SELECT YOUR CIVILIZATION            │
│                                                     │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────┐ │
│  │ RECLAIMER│ │   VOLT   │ │  SIGNAL  │ │  IRON  │ │
│  │    ◎     │ │    ⚡    │ │    ⬡     │ │   ▦    │ │
│  │ #00ffaa  │ │ #ffaa00  │ │ #aa44ff  │ │ #aa8844│ │
│  └──────────┘ └──────────┘ └──────────┘ └────────┘ │
│                                                     │
│  ┌─────────────────────────────────────────────────┐ │
│  │  THE RECLAIMERS                                 │ │
│  │  Scavenger machines that rebuild from ruins.    │ │
│  │                                                 │ │
│  │  + Mining Efficiency   +30%                     │ │
│  │  + Fabrication Speed   +20%                     │ │
│  │  − Combat Damage       -20%                     │ │
│  │                                                 │ │
│  │  Starting Units: 3x Maintenance Bot,            │ │
│  │                  1x Utility Drone               │ │
│  └─────────────────────────────────────────────────┘ │
│                                                     │
│  OPPONENTS: [1▼]  [Random ▼] [Random ▼] [Random ▼] │
│                                                     │
│                         [NEXT: MAP SETUP →]         │
└─────────────────────────────────────────────────────┘
```

### 4.3 Map Customization Screen

```typescript
// app/setup/map.tsx
interface MapConfig {
  planetSize: 'small' | 'medium' | 'large' | 'huge';
  resourceDensity: 'sparse' | 'normal' | 'abundant';
  stormIntensity: 'calm' | 'moderate' | 'violent';
  ruinsDensity: 'few' | 'normal' | 'many';
  startingDistance: 'close' | 'normal' | 'far';
  seed: string;           // editable world seed
  terrainType: 'standard' | 'archipelago' | 'pangaea' | 'continents';
}
```

**UI Layout:**
```
┌─────────────────────────────────────────────────────┐
│                    MAP SETUP                         │
│                                                     │
│  Planet Size    [●  Small  ○ Medium  ○ Large]       │
│  Resources      [○ Sparse  ● Normal  ○ Abundant]   │
│  Storm Power    [○ Calm    ● Moderate ○ Violent]    │
│  Ruins          [○ Few     ● Normal   ○ Many]      │
│  Start Distance [○ Close   ● Normal   ○ Far]       │
│  Terrain        [○ Standard ● Continents ○ Pangaea] │
│                                                     │
│  World Seed: [MACH-7742-BETA________] [🎲 Random]   │
│                                                     │
│  ┌─────────────────────────────────────┐             │
│  │                                     │             │
│  │     [Mini-map preview of planet]    │             │
│  │     (procedural heightmap preview)  │             │
│  │                                     │             │
│  └─────────────────────────────────────┘             │
│                                                     │
│  [← BACK]                        [START GAME →]     │
└─────────────────────────────────────────────────────┘
```

### 4.4 Map Config JSON

```jsonc
// config/mapPresets.json
{
  "planetSize": {
    "small": { "gridSize": 64, "terrainScale": 1.0 },
    "medium": { "gridSize": 128, "terrainScale": 1.0 },
    "large": { "gridSize": 256, "terrainScale": 1.0 },
    "huge": { "gridSize": 512, "terrainScale": 1.0 }
  },
  "resourceDensity": {
    "sparse": { "depositMultiplier": 0.5, "richness": 0.7 },
    "normal": { "depositMultiplier": 1.0, "richness": 1.0 },
    "abundant": { "depositMultiplier": 1.5, "richness": 1.3 }
  },
  "stormIntensity": {
    "calm": { "baseIntensity": 0.2, "strikeInterval": [60, 180] },
    "moderate": { "baseIntensity": 0.5, "strikeInterval": [30, 120] },
    "violent": { "baseIntensity": 0.8, "strikeInterval": [10, 60] }
  },
  "startingDistance": {
    "close": { "minCivSpacing": 30 },
    "normal": { "minCivSpacing": 60 },
    "far": { "minCivSpacing": 100 }
  }
}
```

---

## 5. Territory System

### 5.1 Territory Claims

Territory is claimed by placing **outposts** — a new building type:

```typescript
// Koota traits
export const Outpost = trait({
  claimRadius: 8,
  level: 1,
  civId: '',
});

export const TerritoryMarker = trait({
  civId: '',
  contested: false,
});
```

- Buildings can only be placed within claimed territory
- Resources within territory provide passive bonuses
- Territory borders are visualized as colored ground overlays
- Overlapping claims create **contested zones** (faster combat, no building)

### 5.2 Fog of War

```typescript
export const FogOfWar = trait({
  visibility: 'hidden' as 'hidden' | 'explored' | 'visible',
  lastSeen: 0,  // tick when last had vision
});
```

- `hidden` — never explored (black)
- `explored` — previously seen but no current vision (darkened, shows terrain but not units)
- `visible` — currently within vision range of a friendly unit/building

---

## 6. Technology System

### 6.1 Tech Tiers

```jsonc
// config/technology.json
{
  "tiers": {
    "1_salvage": {
      "name": "Salvage Tech",
      "cost": { "compute": 0 },
      "unlocks": ["basic_belt", "basic_miner", "lightning_rod"]
    },
    "2_refining": {
      "name": "Refining",
      "cost": { "compute": 50 },
      "requires": ["1_salvage"],
      "unlocks": ["smelter", "refiner", "fast_belt", "power_wire"]
    },
    "3_fabrication": {
      "name": "Fabrication",
      "cost": { "compute": 150 },
      "requires": ["2_refining"],
      "unlocks": ["fabrication_unit", "signal_wire", "signal_relay"]
    },
    "4_combat": {
      "name": "Combat Systems",
      "cost": { "compute": 300 },
      "requires": ["3_fabrication"],
      "unlocks": ["combat_drone", "turret", "wall"]
    },
    "5_hacking": {
      "name": "Network Warfare",
      "cost": { "compute": 500 },
      "requires": ["3_fabrication"],
      "unlocks": ["hacking_rig", "signal_jammer", "virus_probe"]
    },
    "6_advanced": {
      "name": "Advanced Engineering",
      "cost": { "compute": 800 },
      "requires": ["4_combat", "5_hacking"],
      "unlocks": ["express_belt", "fusion_reactor", "heavy_drone"]
    }
  }
}
```

---

## 7. Migration from Current Systems

### 7.1 What Gets Replaced

| Current File | Replaced By |
|-------------|-------------|
| `RadialToolMenu.tsx` | `ObjectActionMenu.tsx` |
| `EquippedToolView.tsx` | Removed (no tool concept) |
| `FPSInput.tsx` | `ObjectSelectionSystem.tsx` |
| `fpsCombat.ts` | Attack action + unit combat AI |
| `buildingPlacement.ts` | Ground-click → build submenu |
| `enemies.ts` | Yuka `UnitBrain` evaluators |
| `cultistAI.ts` | Yuka `UnitBrain` evaluators (cultist profile) |
| `botAutomation.ts` | Yuka `UnitBrain` evaluators (automation profile) |

### 7.2 What Gets Added

| New System | Purpose |
|-----------|---------|
| `ObjectSelectionSystem` | Rapier raycast → highlight → radial menu |
| `SelectionHighlight` | Emissive glow on hovered/selected objects |
| `ObjectActionMenu` | Context-sensitive radial actions per entity |
| `CivilizationGovernor` | Yuka GOAP strategic AI per civilization |
| `UnitBrain` | Yuka GOAP tactical AI per unit |
| `civilizationAI.ts` | System that ticks all governors |
| `territory.ts` | Territory claiming, borders, fog of war |
| `technology.ts` | Tech tree progression |
| `app/setup/index.tsx` | Race selection screen |
| `app/setup/map.tsx` | Map customization screen |
| `config/civilizations.json` | Race definitions + governor profiles |
| `config/technology.json` | Tech tree |
| `config/mapPresets.json` | Map generation presets |

### 7.3 Expo Router Structure (Updated)

```
app/
├── _layout.tsx         # Root: fonts, WorldProvider, persistence
├── +html.tsx           # Web: SharedArrayBuffer headers
├── index.tsx           # Title screen
├── setup/
│   ├── _layout.tsx     # Setup flow layout
│   ├── index.tsx       # Race selection
│   └── map.tsx         # Map customization
└── game/
    └── index.tsx       # Game screen: Canvas + HUD
```

---

## 8. Implementation Phases

### Phase 1: Contextual Interaction (replaces tool system)
1. Add kinematic Rapier colliders to all entity renderers
2. Build `ObjectSelectionSystem` with crosshair raycast
3. Build `SelectionHighlight` with emissive glow
4. Build `ObjectActionMenu` with context-sensitive actions
5. Wire actions to existing systems (attack, hack, repair, build, salvage)
6. Remove tool system (`RadialToolMenu`, `EquippedToolView`, tool state)

### Phase 2: Yuka Unit AI (replaces hardcoded AI)
1. Add `yuka` dependency
2. Create `UnitBrainEntity` + evaluators (patrol, attack, flee, guard)
3. Migrate `enemies.ts` → Yuka evaluator-based decisions
4. Migrate `cultistAI.ts` → Yuka evaluator-based (with lightning attack evaluator)
5. Migrate `botAutomation.ts` → Yuka evaluator-based routines
6. JSON-driven unit AI profiles per faction

### Phase 3: Civilization System
1. Create `CivilizationGovernor` with strategic evaluators
2. Add `config/civilizations.json` with race definitions
3. Build territory claiming (outposts, claim radius, borders)
4. Build fog of war system
5. Governor action execution (spawn buildings, train units, expand)
6. AI civilization tick system

### Phase 4: Pregame Setup
1. Create `app/setup/index.tsx` — race selection screen
2. Create `app/setup/map.tsx` — map customization
3. Add `config/mapPresets.json`
4. Wire map config to terrain generation
5. Wire race selection to starting conditions
6. Opponent placement on generated map

### Phase 5: Technology & Diplomacy
1. Add `config/technology.json` tech tree
2. Build tech progression system (compute → research → unlocks)
3. Add diplomacy evaluator actions (trade offers, alliances)
4. Victory conditions (domination, tech supremacy, economic victory)

---

## 9. Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `yuka` | ^0.7.8 | GOAP AI, goal evaluators, entity framework |
| `koota` | latest | ECS (from GDD-002) |
| `@react-three/rapier` | ^2.2.0 | Physics raycasting for object selection |

Yuka is already proven in the grovekeeper codebase with the same pattern (GovernorEntity + Think + GoalEvaluator).

---

## 10. Success Criteria

- [ ] Every surface object is clickable with emissive highlight feedback
- [ ] Radial action menu shows context-appropriate actions per entity type
- [ ] No tool system — all interaction is contextual
- [ ] AI civilizations autonomously expand, build, and compete via Yuka governors
- [ ] Race selection screen with 4 distinct civilizations
- [ ] Map customization with seed, size, density controls
- [ ] Fog of war with explored/visible/hidden states
- [ ] Territory claiming with visual borders
- [ ] Unit AI uses Yuka evaluators (not hardcoded if/else)
- [ ] All civilization stats, governor weights, and tech tree from JSON config
