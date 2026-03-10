# GDD-005: Visual Identity — Procedural Mechanical Generation, Yuka Vehicles, PBR Art Direction

**Status:** Draft
**Date:** 2026-03-10
**Scope:** Make it look like a machine planet, not a bunch of colored cubes. Procedural geometry with insets, decals, chrome, metals. Yuka vehicle system for bot movement.

---

## 1. The Problem

Current renderers use `meshLambertMaterial` with flat hex colors and primitive geometry (boxes, spheres, cylinders). Every bot is the same box-with-arms. Every building is a grey platform. This reads as "programmer art prototype," not "machine planet."

**The goal:** Everything on screen should look like it was *manufactured* — panel seams, bolt grids, inset details, worn chrome, oxidized copper, heat-blued titanium, emissive status indicators. Procedural generation, not hand-modeled, but with enough detail structure that every entity reads as a believable machine artifact.

---

## 2. Art Direction: Industrial Mechanical

### 2.1 Material Palette

Every surface falls into one of these material families:

| Family | Metalness | Roughness | Character |
|--------|-----------|-----------|-----------|
| **Brushed Steel** | 0.9 | 0.25-0.35 | Clean panels, structural frames |
| **Chrome** | 1.0 | 0.05-0.15 | Functional surfaces, tools, joints |
| **Rusted Iron** | 0.7 | 0.7-0.95 | Decayed structures, old ruins |
| **Oxidized Copper** | 0.6 | 0.4-0.6 | Wiring, circuit housings, patina green |
| **Anodized Aluminum** | 0.8 | 0.15-0.25 | Lightweight parts, drone bodies |
| **Heat-Blued Titanium** | 0.85 | 0.2-0.3 | High-tier components, purple/blue tint |
| **Matte Carbon** | 0.1 | 0.9-1.0 | Non-reflective armor, stealth surfaces |
| **Emissive Circuitry** | 0.3 | 0.7 | Status lights, power traces, active indicators |

### 2.2 Detail Layers

Every object has three visual layers:

```
Layer 1: BASE FORM     — CSG/procedural geometry (panels, bevels, insets)
Layer 2: SURFACE DETAIL — Procedural PBR textures (seams, bolts, wear, dirt)
Layer 3: DECALS/GLOW    — Emissive indicators, faction markings, status lights
```

### 2.3 Reference Visual Language

Think: industrial robots, CNC machines, mining equipment, spacecraft interiors. NOT:
- NOT Minecraft (uniform cubes)
- NOT low-poly indie (flat pastel)
- NOT cartoon/stylized
- YES Satisfactory (industrial, functional, detailed)
- YES Factorio 3D (mechanical, purposeful)
- YES Space Engineers (panel-based construction)
- YES Star Citizen (industrial sci-fi detail)

---

## 3. Procedural Geometry System

### 3.1 Panel-Based Construction

Every machine/building/bot is assembled from **panels** — rectangular segments with beveled edges, insets, and bolt patterns. This creates mechanical detail without hand-modeling.

```typescript
// game/rendering/procgen/PanelGeometry.ts
import * as THREE from 'three';

interface PanelConfig {
  width: number;
  height: number;
  depth: number;         // panel thickness
  bevelSize: number;     // edge bevel
  insetDepth: number;    // how deep the center is recessed
  insetMargin: number;   // border around the inset
  boltPattern: 'corners' | 'edges' | 'grid' | 'none';
  boltRadius: number;
  boltCount?: number;    // for grid pattern
  ventSlots?: number;    // horizontal vent cuts
}

/**
 * Generate a panel mesh with beveled edges, center inset, and bolt details.
 * Returns a BufferGeometry with normals suitable for PBR rendering.
 */
export function createPanelGeometry(config: PanelConfig): THREE.BufferGeometry {
  // Main panel body (box with bevel)
  // Center inset (recessed rectangle inside the panel face)
  // Bolt cylinders at specified positions
  // Vent slots (thin rectangular cuts)
  // All merged into single BufferGeometry for instancing
  // ...
}
```

### 3.2 Bot Body Generator

Bots are assembled from panel groups with distinct visual roles:

```typescript
// game/rendering/procgen/BotGenerator.ts

interface BotVisualConfig {
  // Chassis
  chassisWidth: number;
  chassisHeight: number;
  chassisDepth: number;
  chassisMaterial: string;  // 'brushed_steel' | 'anodized' | 'carbon'

  // Head/sensor module
  headStyle: 'dome' | 'angular' | 'visor' | 'turret';
  headMaterial: string;
  sensorColor: number;     // emissive color for camera/sensor

  // Limbs
  armStyle: 'piston' | 'articulated' | 'crane' | 'none';
  armMaterial: string;
  armJointColor: number;   // chrome joint rings

  // Locomotion
  locomotionStyle: 'treads' | 'legs_biped' | 'legs_quad' | 'hover' | 'wheels';
  locomotionMaterial: string;

  // Details
  antennaCount: number;
  ventCount: number;
  panelLineCount: number;  // surface detail complexity
  wearLevel: number;       // 0-1, drives rust/damage overlay
  factionColor: number;    // accent stripe/marking color
}

export function generateBotMesh(config: BotVisualConfig, seed: number): THREE.Group {
  const group = new THREE.Group();

  // CHASSIS: main body from panels
  const chassis = buildChassis(config, seed);
  group.add(chassis);

  // HEAD: sensor module on top
  const head = buildHead(config, seed);
  group.add(head);

  // ARMS: if present
  if (config.armStyle !== 'none') {
    const [leftArm, rightArm] = buildArms(config, seed);
    group.add(leftArm, rightArm);
  }

  // LOCOMOTION: treads, legs, hover pads
  const locomotion = buildLocomotion(config, seed);
  group.add(locomotion);

  // DETAILS: antennae, vents, panel lines, faction stripe
  addDetails(group, config, seed);

  return group;
}
```

### 3.3 Chassis Construction

```typescript
function buildChassis(config: BotVisualConfig, seed: number): THREE.Group {
  const chassis = new THREE.Group();

  // Main body: NOT a single box — multiple panels
  // Front panel with inset display area
  const frontPanel = createPanelGeometry({
    width: config.chassisWidth,
    height: config.chassisHeight,
    depth: 0.02,
    bevelSize: 0.01,
    insetDepth: 0.005,
    insetMargin: 0.04,
    boltPattern: 'corners',
    boltRadius: 0.008,
  });

  // Side panels with vent slots
  const sidePanel = createPanelGeometry({
    width: config.chassisDepth,
    height: config.chassisHeight,
    depth: 0.02,
    bevelSize: 0.01,
    insetDepth: 0.003,
    insetMargin: 0.03,
    boltPattern: 'edges',
    boltRadius: 0.006,
    ventSlots: config.ventCount,
  });

  // Top panel with bolt grid
  const topPanel = createPanelGeometry({
    width: config.chassisWidth,
    height: config.chassisDepth,
    depth: 0.02,
    bevelSize: 0.01,
    insetDepth: 0.004,
    insetMargin: 0.05,
    boltPattern: 'grid',
    boltRadius: 0.005,
    boltCount: 4,
  });

  // Assemble panels into chassis box
  // Each panel gets its own material from the palette
  // ...

  return chassis;
}
```

### 3.4 Building Generator

```typescript
// game/rendering/procgen/BuildingGenerator.ts

interface BuildingVisualConfig {
  type: string;              // 'furnace' | 'miner' | 'processor' | 'turret' | 'wall'
  width: number;
  height: number;
  depth: number;
  material: string;          // primary material family
  accentMaterial: string;    // trim, accents
  hopperStyle?: 'open_top' | 'side_feed' | 'belt_input';
  outputStyle?: 'front_slot' | 'belt_output' | 'drop';
  statusLights: number;     // count of emissive indicator dots
  chimneyCount: number;
  pipeCount: number;
  panelComplexity: number;  // 1-5 detail level
  wearLevel: number;
}
```

### 3.5 Ore Deposit Generator

Ore deposits are organic/geological — NOT mechanical:

```typescript
// game/rendering/procgen/DepositGenerator.ts

interface DepositVisualConfig {
  oreType: string;
  meshStyle: 'rubble_pile' | 'vein_protrusion' | 'crystal_cluster' | 'seam_band' | 'glowing_nodule';
  scale: [number, number];  // min/max random scale
  material: string;
  emissive?: number;        // for rare earth glow
  detailLevel: number;
}

/**
 * Generate organic-shaped deposit mesh.
 * Uses displaced icosphere for rubble/nodules,
 * extruded curves for veins/seams,
 * elongated octahedrons for crystals.
 */
export function generateDepositMesh(config: DepositVisualConfig, seed: number): THREE.Mesh {
  switch (config.meshStyle) {
    case 'rubble_pile':
      return generateRubblePile(config, seed);
    case 'vein_protrusion':
      return generateVeinMesh(config, seed);
    case 'crystal_cluster':
      return generateCrystalCluster(config, seed);
    case 'seam_band':
      return generateSeamBand(config, seed);
    case 'glowing_nodule':
      return generateGlowingNodule(config, seed);
  }
}

function generateRubblePile(config: DepositVisualConfig, seed: number): THREE.Mesh {
  // Start with icosphere, displace vertices with noise
  const geo = new THREE.IcosahedronGeometry(1, 2);
  const positions = geo.attributes.position;

  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i);
    const y = positions.getY(i);
    const z = positions.getZ(i);

    // Noise-based displacement — creates organic, rough surface
    const noiseVal = fbmNoise3D(x * 2, y * 2, z * 2, seed);
    const displacement = 0.7 + noiseVal * 0.6; // 0.7-1.3 range

    positions.setXYZ(i, x * displacement, y * displacement * 0.6, z * displacement);
  }

  geo.computeVertexNormals();
  return new THREE.Mesh(geo);
}

function generateCrystalCluster(config: DepositVisualConfig, seed: number): THREE.Group {
  const group = new THREE.Group();
  const crystalCount = 3 + Math.floor(pseudoRandom(seed) * 5);

  for (let i = 0; i < crystalCount; i++) {
    // Each crystal: elongated octahedron with slight random rotation
    const height = 0.3 + pseudoRandom(seed + i * 7) * 0.7;
    const width = 0.08 + pseudoRandom(seed + i * 11) * 0.12;

    const crystal = new THREE.Mesh(
      new THREE.OctahedronGeometry(width, 0),
    );
    crystal.scale.set(1, height / width, 1);
    crystal.position.set(
      (pseudoRandom(seed + i * 13) - 0.5) * 0.5,
      height * 0.5,
      (pseudoRandom(seed + i * 17) - 0.5) * 0.5,
    );
    crystal.rotation.set(
      (pseudoRandom(seed + i * 19) - 0.5) * 0.3,
      pseudoRandom(seed + i * 23) * Math.PI,
      (pseudoRandom(seed + i * 29) - 0.5) * 0.3,
    );

    group.add(crystal);
  }
  return group;
}
```

---

## 4. Procedural PBR Material System (Expanded)

### 4.1 Material Factory

Expand the existing canvas-based procedural textures into a full material factory:

```typescript
// game/rendering/materials/MaterialFactory.ts

interface MaterialSpec {
  // Base PBR
  baseColor: [number, number, number];
  metalness: number;
  roughness: number;

  // Texture patterns
  panelLines: boolean;        // visible seam/panel cut lines
  boltGrid: boolean;          // regular bolt pattern in normal map
  wearPattern: 'none' | 'edge_wear' | 'heavy_rust' | 'scratches' | 'heat_blue';
  wearIntensity: number;      // 0-1

  // Decals
  factionStripe: boolean;
  factionColor: number;
  statusDots: number;         // emissive indicator count

  // Surface variation
  dirtyOverlay: boolean;      // oil stains, grime
  reflectionOverride?: number; // env map intensity
}
```

### 4.2 Material Palette JSON

```jsonc
// config/materials.json
{
  "brushed_steel": {
    "baseColor": [180, 185, 195],
    "metalness": 0.9,
    "roughness": 0.3,
    "panelLines": true,
    "boltGrid": true,
    "wearPattern": "edge_wear",
    "wearIntensity": 0.2
  },
  "chrome": {
    "baseColor": [220, 225, 230],
    "metalness": 1.0,
    "roughness": 0.08,
    "panelLines": false,
    "boltGrid": false,
    "wearPattern": "scratches",
    "wearIntensity": 0.1
  },
  "rusted_iron": {
    "baseColor": [140, 110, 80],
    "metalness": 0.7,
    "roughness": 0.85,
    "panelLines": true,
    "boltGrid": true,
    "wearPattern": "heavy_rust",
    "wearIntensity": 0.8
  },
  "oxidized_copper": {
    "baseColor": [120, 180, 130],
    "metalness": 0.6,
    "roughness": 0.5,
    "panelLines": false,
    "boltGrid": false,
    "wearPattern": "edge_wear",
    "wearIntensity": 0.4
  },
  "anodized_aluminum": {
    "baseColor": [200, 205, 215],
    "metalness": 0.8,
    "roughness": 0.2,
    "panelLines": true,
    "boltGrid": false,
    "wearPattern": "scratches",
    "wearIntensity": 0.15
  },
  "heat_blued_titanium": {
    "baseColor": [100, 90, 160],
    "metalness": 0.85,
    "roughness": 0.25,
    "panelLines": true,
    "boltGrid": true,
    "wearPattern": "heat_blue",
    "wearIntensity": 0.6
  },
  "matte_carbon": {
    "baseColor": [30, 32, 35],
    "metalness": 0.1,
    "roughness": 0.95,
    "panelLines": false,
    "boltGrid": false,
    "wearPattern": "none",
    "wearIntensity": 0
  },
  "scorched_metal": {
    "baseColor": [60, 50, 45],
    "metalness": 0.7,
    "roughness": 0.8,
    "panelLines": true,
    "boltGrid": false,
    "wearPattern": "heavy_rust",
    "wearIntensity": 0.6,
    "dirtyOverlay": true
  }
}
```

### 4.3 Normal Map Detail Layers

The existing `MetalMaterial.ts` generates rivet grids and seam lines — expand this into a composable system:

```typescript
// game/rendering/materials/NormalMapComposer.ts

type NormalDetail =
  | { type: 'bolts'; spacing: number; radius: number; height: number }
  | { type: 'seams'; spacing: number; width: number; depth: number; direction: 'horizontal' | 'vertical' | 'both' }
  | { type: 'vents'; count: number; slotWidth: number; slotHeight: number }
  | { type: 'inset'; margin: number; depth: number }
  | { type: 'hex_pattern'; size: number; depth: number }
  | { type: 'cross_hatch'; spacing: number; depth: number };

/**
 * Compose multiple normal map detail layers into a single texture.
 * Each layer is rendered additively into the normal map.
 */
export function composeNormalMap(
  size: number,
  layers: NormalDetail[]
): THREE.CanvasTexture {
  // ...renders each detail type into a shared canvas
}
```

### 4.4 Cube Material Variants

Material cubes should look distinct and beautiful — NOT flat-colored boxes:

```jsonc
// config/cubeMaterials.json
{
  "scrap_cube": {
    "material": "rusted_iron",
    "normalDetails": [
      { "type": "seams", "spacing": 64, "width": 2, "depth": 0.5, "direction": "both" },
      { "type": "bolts", "spacing": 48, "radius": 3, "height": 0.4 }
    ],
    "edgeBevel": 0.02,
    "wearOverlay": "heavy_rust"
  },
  "copper_cube": {
    "material": "oxidized_copper",
    "normalDetails": [
      { "type": "seams", "spacing": 32, "width": 1, "depth": 0.3, "direction": "horizontal" },
      { "type": "inset", "margin": 8, "depth": 0.2 }
    ],
    "edgeBevel": 0.03,
    "wearOverlay": "edge_wear"
  },
  "silicon_cube": {
    "material": "chrome",
    "normalDetails": [
      { "type": "hex_pattern", "size": 16, "depth": 0.15 }
    ],
    "edgeBevel": 0.04,
    "translucency": 0.3,
    "internalGlow": "#8899cc"
  },
  "titanium_cube": {
    "material": "heat_blued_titanium",
    "normalDetails": [
      { "type": "seams", "spacing": 48, "width": 1, "depth": 0.4, "direction": "both" },
      { "type": "bolts", "spacing": 64, "radius": 2, "height": 0.5 },
      { "type": "inset", "margin": 6, "depth": 0.3 }
    ],
    "edgeBevel": 0.02,
    "wearOverlay": "heat_blue"
  },
  "rare_earth_cube": {
    "material": "anodized_aluminum",
    "normalDetails": [
      { "type": "cross_hatch", "spacing": 12, "depth": 0.1 }
    ],
    "edgeBevel": 0.05,
    "emissiveVeins": true,
    "emissiveColor": "#00ccff",
    "emissiveIntensity": 0.4
  },
  "carbon_cube": {
    "material": "matte_carbon",
    "normalDetails": [
      { "type": "seams", "spacing": 24, "width": 1, "depth": 0.2, "direction": "horizontal" }
    ],
    "edgeBevel": 0.01,
    "wearOverlay": "none"
  }
}
```

---

## 5. Yuka Vehicle System for Bot Movement

### 5.1 Why Yuka Vehicles

Current bots use simple `worldPosition.x += speed * dx` movement. Yuka's `Vehicle` class provides:

- **Velocity / acceleration** model (not instant teleportation)
- **maxSpeed, maxForce, maxTurnRate** — physically-grounded movement
- **Steering behaviors** — smooth pathfollowing, obstacle avoidance, formations
- **Mass** — heavier bots accelerate slower, feel different
- **EntityManager** — batch-updates all vehicles per frame

### 5.2 Integration Architecture

```typescript
// game/ai/vehicles/VehicleManager.ts
import { EntityManager, Time, Vehicle, NavMesh } from 'yuka';
import * as THREE from 'three';

// Singleton Yuka entity manager
export const yukaEntityManager = new EntityManager();
export const yukaTime = new Time();

// Maps Koota entity IDs to Yuka vehicles
const vehicleMap = new Map<number, Vehicle>();

/**
 * Sync callback: copies Yuka world matrix → Three.js mesh.
 * Called automatically by EntityManager.update()
 */
function syncCallback(entity: Vehicle, renderComponent: THREE.Object3D) {
  renderComponent.matrix.copy(entity.worldMatrix as unknown as THREE.Matrix4);
}

/**
 * Create a Yuka Vehicle for a Koota entity.
 */
export function createVehicle(entityId: number, mesh: THREE.Object3D, config: VehicleConfig): Vehicle {
  const vehicle = new Vehicle();

  // Physical properties from JSON config
  vehicle.maxSpeed = config.maxSpeed;
  vehicle.maxForce = config.maxForce;
  vehicle.maxTurnRate = config.maxTurnRate;
  vehicle.mass = config.mass;

  // Link to Three.js mesh
  mesh.matrixAutoUpdate = false;
  vehicle.setRenderComponent(mesh, syncCallback);

  // Register
  yukaEntityManager.add(vehicle);
  vehicleMap.set(entityId, vehicle);

  return vehicle;
}

/**
 * Remove a Yuka vehicle when entity is destroyed.
 */
export function removeVehicle(entityId: number) {
  const vehicle = vehicleMap.get(entityId);
  if (vehicle) {
    yukaEntityManager.remove(vehicle);
    vehicleMap.delete(entityId);
  }
}
```

### 5.3 Steering Behaviors per Bot Type

```jsonc
// config/botMovement.json
{
  "maintenance_bot": {
    "maxSpeed": 3.0,
    "maxForce": 5.0,
    "maxTurnRate": 2.0,
    "mass": 2.0,
    "steering": {
      "obstacleAvoidance": { "weight": 1.0, "radius": 1.5 },
      "separation": { "weight": 0.5, "radius": 2.0 }
    }
  },
  "utility_drone": {
    "maxSpeed": 5.0,
    "maxForce": 8.0,
    "maxTurnRate": 3.5,
    "mass": 0.8,
    "steering": {
      "obstacleAvoidance": { "weight": 0.8, "radius": 1.0 },
      "wander": { "weight": 0.3, "radius": 3.0, "distance": 5.0 }
    }
  },
  "battle_bot": {
    "maxSpeed": 4.0,
    "maxForce": 10.0,
    "maxTurnRate": 1.5,
    "mass": 5.0,
    "steering": {
      "obstacleAvoidance": { "weight": 1.0, "radius": 2.0 },
      "pursuit": { "weight": 0.8 },
      "separation": { "weight": 0.6, "radius": 3.0 }
    }
  },
  "harvester_bot": {
    "maxSpeed": 2.0,
    "maxForce": 3.0,
    "maxTurnRate": 1.0,
    "mass": 8.0,
    "steering": {
      "obstacleAvoidance": { "weight": 1.0, "radius": 2.5 },
      "arrive": { "weight": 0.7, "deceleration": 3 }
    }
  }
}
```

### 5.4 Game Loop Integration

```typescript
// game/ecs/GameSystems.tsx (addition)
import { yukaEntityManager, yukaTime } from '../ai/vehicles/VehicleManager';

export function GameSystems() {
  useFrame((_, delta) => {
    // Update Yuka vehicles (steering, pathfollowing, obstacle avoidance)
    yukaTime.update();
    yukaEntityManager.update(delta);

    // Then run ECS systems which read updated positions
    // ...
  });
}
```

### 5.5 Steering Behaviors Available

| Behavior | Use Case |
|----------|----------|
| `SeekBehavior` | Move directly toward a target (harvesting, approaching enemy) |
| `FleeBehavior` | Move away from a threat (damaged bot retreating) |
| `ArriveBehavior` | Seek but decelerate smoothly at target (cube pickup precision) |
| `PursuitBehavior` | Predict and intercept a moving target (combat pursuit) |
| `EvadeBehavior` | Predict and flee from a moving pursuer |
| `WanderBehavior` | Random meandering (idle patrol, wildlife) |
| `ObstacleAvoidanceBehavior` | Steer around obstacles (buildings, terrain features) |
| `FollowPathBehavior` | Follow a navmesh path with smooth curves |
| `AlignmentBehavior` | Match heading with nearby allies (formation movement) |
| `CohesionBehavior` | Stay near group center (squad movement) |
| `SeparationBehavior` | Maintain spacing from nearby entities |
| `InterposeBehavior` | Position between two entities (bodyguard) |
| `OffsetPursuitBehavior` | Follow a leader at a fixed offset (formation) |

### 5.6 Formation Movement

AI civilization armies can move in formations using combined steering:

```typescript
import { Vehicle, OffsetPursuitBehavior, SeparationBehavior } from 'yuka';

function createSquad(leader: Vehicle, followers: Vehicle[], formation: Vec3[]) {
  followers.forEach((follower, i) => {
    // Follow leader at formation offset
    const offset = new YUKA.Vector3(formation[i].x, 0, formation[i].z);
    const offsetPursuit = new OffsetPursuitBehavior(leader, offset);
    follower.steering.add(offsetPursuit);

    // Maintain spacing from each other
    const separation = new SeparationBehavior();
    separation.weight = 0.5;
    follower.steering.add(separation);
  });
}
```

---

## 6. Yuka NavMesh for Pathfinding

Replace the current A* grid-based navmesh with Yuka's built-in NavMesh:

```typescript
// game/ai/navigation/NavigationMesh.ts
import { NavMesh, NavMeshLoader } from 'yuka';

let navMesh: NavMesh | null = null;

/**
 * Generate navigation mesh from terrain + buildings.
 * Could also load from a pre-baked .glb navigation mesh.
 */
export function buildNavigationMesh(terrain: TerrainData, buildings: BuildingData[]): NavMesh {
  const loader = new NavMeshLoader();

  // Option A: Generate from terrain walkability
  // Option B: Load pre-baked from GLB asset
  // Option C: Build programmatically from terrain heightfield

  navMesh = new NavMesh();
  // ... build regions from walkable terrain
  return navMesh;
}

/**
 * Find a path between two world positions using the NavMesh.
 */
export function findNavPath(from: Vec3, to: Vec3): Vec3[] {
  if (!navMesh) return [];
  const path = navMesh.findPath(
    new YUKA.Vector3(from.x, from.y, from.z),
    new YUKA.Vector3(to.x, to.y, to.z),
  );
  return path.map(p => ({ x: p.x, y: p.y, z: p.z }));
}
```

### 5.7 Yuka Perception for AI Vision

```typescript
// game/ai/perception/VisionSystem.ts
import { Vision, MemorySystem, GameEntity } from 'yuka';

function setupVision(vehicle: Vehicle, range: number, fov: number) {
  const vision = new Vision(vehicle);
  vision.range = range;
  vision.fieldOfView = fov; // radians

  const memory = new MemorySystem(vehicle);
  memory.memorySpan = 5; // seconds before forgetting

  // Each frame, update visible entities
  // vision.visible(targetPosition) returns boolean
}
```

---

## 7. Faction Visual Identity

Each civilization race has a distinct visual signature:

```jsonc
// config/factionVisuals.json
{
  "reclaimer": {
    "primaryMaterial": "rusted_iron",
    "accentMaterial": "oxidized_copper",
    "emissiveColor": "#00ffaa",
    "stripeColor": "#00cc88",
    "botStyle": {
      "chassisMaterial": "rusted_iron",
      "headStyle": "visor",
      "armStyle": "crane",
      "locomotionStyle": "treads",
      "wearLevel": 0.6
    },
    "buildingStyle": {
      "material": "rusted_iron",
      "accentMaterial": "oxidized_copper",
      "pipeCount": 4,
      "chimneyCount": 2,
      "panelComplexity": 3
    }
  },
  "volt_collective": {
    "primaryMaterial": "chrome",
    "accentMaterial": "heat_blued_titanium",
    "emissiveColor": "#ffaa00",
    "stripeColor": "#ff8800",
    "botStyle": {
      "chassisMaterial": "chrome",
      "headStyle": "turret",
      "armStyle": "piston",
      "locomotionStyle": "legs_biped",
      "wearLevel": 0.2
    },
    "buildingStyle": {
      "material": "chrome",
      "accentMaterial": "heat_blued_titanium",
      "pipeCount": 1,
      "chimneyCount": 0,
      "panelComplexity": 4
    }
  },
  "signal_choir": {
    "primaryMaterial": "anodized_aluminum",
    "accentMaterial": "matte_carbon",
    "emissiveColor": "#aa44ff",
    "stripeColor": "#8833dd",
    "botStyle": {
      "chassisMaterial": "anodized_aluminum",
      "headStyle": "dome",
      "armStyle": "articulated",
      "locomotionStyle": "hover",
      "wearLevel": 0.1
    },
    "buildingStyle": {
      "material": "anodized_aluminum",
      "accentMaterial": "matte_carbon",
      "pipeCount": 0,
      "chimneyCount": 0,
      "panelComplexity": 5
    }
  },
  "iron_creed": {
    "primaryMaterial": "brushed_steel",
    "accentMaterial": "scorched_metal",
    "emissiveColor": "#aa8844",
    "stripeColor": "#886633",
    "botStyle": {
      "chassisMaterial": "brushed_steel",
      "headStyle": "angular",
      "armStyle": "piston",
      "locomotionStyle": "legs_quad",
      "wearLevel": 0.3
    },
    "buildingStyle": {
      "material": "brushed_steel",
      "accentMaterial": "scorched_metal",
      "pipeCount": 2,
      "chimneyCount": 1,
      "panelComplexity": 3
    }
  }
}
```

---

## 8. Environment Art

### 8.1 Terrain Zones (Procedural PBR)

Each terrain zone gets distinct PBR treatment:

| Zone | Ground Material | Features |
|------|----------------|----------|
| Foundry Plains | Scorched metal plates, slag pools | Flat, dark, heat distortion |
| Slag Heaps | Piled rusted debris, orange-brown | Lumpy terrain, scrap deposits |
| Cable Forests | Black carbon fiber trunks, copper canopy | Vertical elements, eerie |
| Processor Graveyards | Circuit board ground, silicon clusters | Green-tinted, crystalline |
| Mountain Ridges | Brushed titanium seams, bare rock | Steep, ore-rich, windy |
| Ravine Networks | Oxidized copper walls, water stains | Deep, narrow, copper veins |

### 8.2 Ruin Structures

Procedural city ruins should have visible machine heritage:

```typescript
// Building ruins have:
// - Panel-based walls (not smooth boxes)
// - Exposed girder frameworks (cylinder/box composites)
// - Broken pipe stubs (cylinders with emissive interiors)
// - Collapsed ceiling sections (angled panel fragments)
// - Rust and wear gradients (heavier near ground)
// - Occasional emissive elements (still-powered circuit traces)
```

### 8.3 Lighting

- **Ambient**: Low, warm brownish (machine planet atmosphere)
- **Directional**: Cool white, harsh shadows (distant star)
- **Emissive**: Cyan-green from player faction, warm orange from Volt Collective, purple from Signal Choir
- **Storm**: Lightning flashes illuminate entire scene briefly, blue-white
- **Furnace/machine glow**: Orange-red interior glow, visible at distance

---

## 9. Performance: Instancing

For hundreds/thousands of cubes, deposits, and bots — use instanced meshes:

```typescript
// Each material cube type has ONE InstancedMesh
// Position/rotation/scale per instance via InstancedMesh.setMatrixAt()

// Cube instancers (one per material type, single draw call each)
const scrapInstancer = new THREE.InstancedMesh(cubeGeometry, scrapMaterial, MAX_CUBES);
const copperInstancer = new THREE.InstancedMesh(cubeGeometry, copperMaterial, MAX_CUBES);

// Bot instancers (per bot visual config hash)
// Building instancers (per building type)
```

This is critical for maintaining 60fps with hundreds of physical cubes in the world.

---

## 10. Migration from Current Renderers

| Current | New |
|---------|-----|
| `UnitRenderer.tsx` (flat boxes) | `BotRenderer.tsx` (procedural panel geometry + PBR) |
| `BuildingMesh` (grey platforms) | `BuildingRenderer.tsx` (procedural machines + PBR) |
| `meshLambertMaterial` everywhere | `MeshStandardMaterial` from `MaterialFactory` |
| No ore deposits | `DepositRenderer.tsx` (organic procedural geometry) |
| No cubes | `CubeRenderer.tsx` (instanced PBR cubes) |
| `createMetalMaterial()` (3 variants) | `MaterialFactory` (8+ material families, composable) |
| Simple navmesh A* | Yuka `NavMesh` + `Vehicle` steering |
| `worldPosition.x += dx` movement | Yuka `Vehicle` with velocity/acceleration/steering |

---

## 11. Success Criteria

- [ ] Bots are visually distinct machines with panels, bolts, vents, chrome joints
- [ ] Each faction has recognizable visual identity (materials, head style, locomotion)
- [ ] Material cubes have unique PBR treatments (not flat-colored boxes)
- [ ] Ore deposits are organic geological formations (not cubes or spheres)
- [ ] Buildings have industrial detail (pipes, chimneys, status lights, panel lines)
- [ ] All surfaces use `MeshStandardMaterial` with proper metalness/roughness
- [ ] Normal maps show bolt grids, seam lines, insets, vent slots
- [ ] Bots move with Yuka Vehicle physics (acceleration, smooth turning)
- [ ] Steering behaviors provide obstacle avoidance, formation movement
- [ ] Instanced rendering maintains 60fps with hundreds of entities
- [ ] Each material family is JSON-configurable
- [ ] Terrain zones have distinct PBR ground materials
