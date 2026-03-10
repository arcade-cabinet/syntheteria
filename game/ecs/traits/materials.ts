/**
 * Materials ECS Traits — the physical cube economy.
 *
 * In Syntheteria's factory-planet layer, resources are not abstract numbers
 * in an inventory. They are physical material cubes that exist in the world:
 * mined from deposits, carried on belts, stacked in hoppers, and placed as
 * building blocks. Every cube is a real entity with position and physics.
 *
 * Koota features used:
 *   - trait() with callback → AoS storage for complex/nested data
 *   - trait() with schema object → SoA storage for flat numerics
 *   - relation() → first-class entity-to-entity references
 *   - Potential world traits for global material tracking
 *
 * Migration notes:
 *   - No direct Miniplex predecessor — this is a new system for the
 *     factory-planet expansion. The old resource system used abstract
 *     resource counts in the ResourcePool world trait.
 */

// ---------------------------------------------------------------------------
// Supporting types
// ---------------------------------------------------------------------------

/**
 * All ore types that can be found in deposits and extracted by miners.
 */
export type OreType =
  | "scrap_metal"
  | "e_waste"
  | "rare_alloy"
  | "copper"
  | "fiber_optics"
  | "iron"
  | "silicon"
  | "titanium";

/**
 * All processed/refined material types that cubes can be made of.
 * Ore is smelted/refined into these materials, which are then used
 * for fabrication and construction.
 */
export type MaterialType =
  | "refined_metal"
  | "copper_wire"
  | "circuit_board"
  | "power_cell"
  | "logic_core"
  | "steel_plate"
  | "glass_panel"
  | "composite_fiber"
  | "titanium_alloy";

// ---------------------------------------------------------------------------
// Terrain / deposits
// ---------------------------------------------------------------------------

/**
 * OreDeposit — a mineable resource node in the terrain.
 *
 * Koota: `trait({ ... })` — SoA storage (flat numerics).
 *
 * Ore deposits are placed during world generation. A Miner building must be
 * placed on top of a deposit to extract resources. Deposits deplete over
 * time as ore is extracted.
 */
export interface OreDepositSchema {
  /** What type of ore this deposit contains */
  oreType: OreType;
  /**
   * Current remaining yield in abstract units.
   * Decreases each time the miner extracts from this deposit.
   */
  currentYield: number;
  /**
   * Maximum yield this deposit started with.
   * Used for UI display (percentage remaining).
   */
  maxYield: number;
  /**
   * Rock hardness — affects drill wear rate.
   * Higher hardness = faster drill degradation.
   */
  hardness: number;
}

// ---------------------------------------------------------------------------
// Material cubes — the physical economy
// ---------------------------------------------------------------------------

/**
 * MaterialCube — a physical block of processed material that exists in the world.
 *
 * Koota: `trait(() => ({ ... }))` — AoS storage (callback form).
 *
 * Material cubes are the fundamental economic unit. They are:
 *   - Produced by processors from raw ore
 *   - Transported on conveyor belts
 *   - Stored in hoppers
 *   - Carried by units with arms + cargo_bay
 *   - Stacked on the ground as building walls/structures
 *   - Consumed by fabrication units to build components
 *
 * Each cube is a real entity with Position and can be seen/interacted with.
 */
export interface MaterialCubeSchema {
  /** What material this cube is made of */
  material: MaterialType | OreType;
  /**
   * Quality grade 0..1.
   * Higher quality cubes produce better components when fabricated.
   * Quality is determined by processor speed and recipe tier.
   */
  quality: number;
  /** Current hit points — cubes can be damaged by combat or environmental hazards */
  hp: number;
  /** Maximum hit points for this material type */
  maxHp: number;
  /**
   * Whether this cube is currently damaged (hp < maxHp).
   * Damaged cubes produce lower-quality components when used in fabrication.
   */
  damaged: boolean;
}

/**
 * HeldBy — relation from a material cube to the entity carrying it.
 *
 * Koota: `relation({ exclusive: true })` — a cube can only be held by
 * one entity at a time.
 *
 * Usage: `cubeEntity.add(HeldBy(unitEntity))`
 * Query: `world.query(MaterialCube, HeldBy('*'))` — all cubes being carried
 * Traverse: `entity.targetsFor(HeldBy)[0]` — who is carrying this cube
 *
 * The inverse query (what cubes does a unit hold) is done via:
 *   `world.query(MaterialCube, HeldBy(specificUnitEntity))`
 */
export type HeldByRelation = "relation({ exclusive: true })";

/**
 * OnBelt — relation from a material cube to the belt segment it is riding on.
 *
 * Koota: `relation({ exclusive: true })` — a cube is on at most one belt.
 *
 * Usage: `cubeEntity.add(OnBelt(beltEntity))`
 * Query: `world.query(MaterialCube, OnBelt('*'))` — all cubes on belts
 *
 * Note: This is an alternative to Belt.carrying (string). With physical cubes,
 * the cube itself tracks which belt it is on, rather than the belt tracking
 * what it carries. Both approaches can coexist during migration.
 */
export type OnBeltRelation = "relation({ exclusive: true })";

/**
 * InHopper — relation from a material cube to the hopper storing it.
 *
 * Koota: `relation({ exclusive: true })` — a cube is in at most one hopper.
 *
 * Usage: `cubeEntity.add(InHopper(hopperEntity))`
 * Query: `world.query(MaterialCube, InHopper(specificHopperEntity))` — cubes in a hopper
 */
export type InHopperRelation = "relation({ exclusive: true })";

/**
 * PlacedAt — trait (not relation) for cubes that have been placed on the
 * build grid as structural elements.
 *
 * Koota: `trait({ gridX: 0, gridZ: 0, gridY: 0 })` — SoA storage.
 *
 * When a cube is "placed," it snaps to the grid and becomes part of the
 * physical world geometry. Placed cubes can form walls, platforms, and
 * structures. They remain individual entities so they can be damaged
 * and destroyed independently.
 *
 * Note: This is a trait rather than a relation because the grid position
 * is a coordinate, not a reference to another entity.
 */
export interface PlacedAtSchema {
  /** Grid X coordinate (world X / grid cell size) */
  gridX: number;
  /** Grid Z coordinate (world Z / grid cell size) */
  gridZ: number;
  /** Grid Y coordinate (height layer — 0 = ground, 1 = first stack, etc.) */
  gridY: number;
}

// ---------------------------------------------------------------------------
// Storage
// ---------------------------------------------------------------------------

/**
 * PowderStorage — bulk storage for ground/powdered materials.
 *
 * Koota: `trait({ ... })` — SoA storage (flat numerics).
 *
 * Some recipes produce or consume powdered materials rather than cubes.
 * Powder is abstract (not physical cubes) and stored in fixed containers.
 */
export interface PowderStorageSchema {
  /** What material is stored in powder form */
  material: string;
  /** Current amount in the container */
  amount: number;
  /** Maximum capacity of this storage container */
  capacity: number;
}

/**
 * Hopper — a container that holds material cubes for processing.
 *
 * Koota: `trait(() => ({ ... }))` — AoS storage (callback form) because
 * `contents` is a variable-length array.
 *
 * Hoppers sit at the input/output of processors and fabrication units.
 * Cubes are loaded in from belts or by units, and consumed by the machine.
 */
export interface HopperSchema {
  /** Maximum number of cube slots in this hopper */
  slots: number;
  /**
   * Current contents — aggregated view of cubes by material type.
   * The actual cubes are individual entities with InHopper relations;
   * this array is a denormalized cache for quick recipe-checking.
   */
  contents: { material: string; count: number }[];
}

// ---------------------------------------------------------------------------
// Physics / interaction
// ---------------------------------------------------------------------------

/**
 * Grabbable — marks an entity as something a unit can pick up and carry.
 *
 * Koota: `trait({ weight: 1 })` — SoA storage.
 *
 * Weight affects carry speed: heavier items slow the carrier down.
 * Formula: effective_speed = base_speed * (1 / (1 + weight * 0.1))
 */
export interface GrabbableSchema {
  /**
   * Weight in abstract mass units.
   * Affects carry speed and whether a unit's cargo_bay can hold it.
   */
  weight: number;
}

/**
 * CubeStack — a column of placed cubes at a grid position.
 *
 * Koota: `trait(() => ({ ... }))` — AoS storage (callback form) because
 * `cubes` is a variable-length array.
 *
 * When cubes are placed on the grid, they snap-stack vertically. This trait
 * tracks the stack at a given grid cell. The individual cubes still exist as
 * entities with PlacedAt traits; this is a spatial index for efficient
 * height queries and rendering.
 */
export interface CubeStackSchema {
  /**
   * Ordered array of material cube entity IDs from bottom to top.
   * Index 0 = ground level cube, index N = topmost cube.
   */
  cubes: string[];
  /** Grid X coordinate of this stack */
  gridX: number;
  /** Grid Z coordinate of this stack */
  gridZ: number;
  /**
   * Current height of the stack (number of cubes).
   * Cached for quick access without reading `cubes.length`.
   */
  height: number;
}

// ---------------------------------------------------------------------------
// Koota trait + relation declarations (pseudocode)
// ---------------------------------------------------------------------------
//
// import { trait, relation } from 'koota';
//
// // --- Deposits ---
// export const OreDeposit = trait({
//   oreType: 'scrap_metal' as OreType,
//   currentYield: 100,
//   maxYield: 100,
//   hardness: 1,
// });
//
// // --- Material Cubes ---
// export const MaterialCube = trait(() => ({
//   material: 'refined_metal' as MaterialType | OreType,
//   quality: 1,
//   hp: 10,
//   maxHp: 10,
//   damaged: false,
// }));
//
// // Relations for cube location tracking
// export const HeldBy  = relation({ exclusive: true });  // cube → carrier entity
// export const OnBelt  = relation({ exclusive: true });  // cube → belt entity
// export const InHopper = relation({ exclusive: true }); // cube → hopper entity
//
// // Grid placement (trait, not relation)
// export const PlacedAt = trait({ gridX: 0, gridZ: 0, gridY: 0 });
//
// // --- Storage ---
// export const PowderStorage = trait({
//   material: '' as string,
//   amount: 0,
//   capacity: 100,
// });
//
// export const Hopper = trait(() => ({
//   slots: 8,
//   contents: [] as { material: string; count: number }[],
// }));
//
// // --- Physics ---
// export const Grabbable = trait({ weight: 1 });
//
// export const CubeStack = trait(() => ({
//   cubes: [] as string[],
//   gridX: 0,
//   gridZ: 0,
//   height: 0,
// }));

// ---------------------------------------------------------------------------
// Queries that would use these traits
// ---------------------------------------------------------------------------
//
// All ore deposits (for minimap / deposit overlay):
//   world.query(OreDeposit, Position)
//
// Depleted deposits (for removal or visual change):
//   world.query(OreDeposit, Position)
//     .updateEach(([deposit, pos]) => { if (deposit.currentYield <= 0) ... })
//
// All material cubes in the world:
//   world.query(MaterialCube, Position)
//
// Cubes currently being carried:
//   world.query(MaterialCube, HeldBy('*'))
//
// Cubes on conveyor belts (for belt transport system):
//   world.query(MaterialCube, OnBelt('*'))
//
// Cubes in a specific hopper (for recipe ingredient checking):
//   world.query(MaterialCube, InHopper(hopperEntity))
//
// All placed/structural cubes (for collision and rendering):
//   world.query(MaterialCube, PlacedAt)
//
// Cubes at a specific grid column (for stacking height check):
//   world.query(PlacedAt)
//     .updateEach(([placed]) => { if (placed.gridX === x && placed.gridZ === z) ... })
//   — or use CubeStack spatial index instead for O(1) lookup
//
// Free cubes (not held, not on belt, not in hopper, not placed):
//   world.query(MaterialCube, Not(HeldBy('*')), Not(OnBelt('*')), Not(InHopper('*')), Not(PlacedAt))
//
// Grabbable items near a unit (for pickup command):
//   world.query(Grabbable, MaterialCube, Position)
//
// Damaged cubes (for visual degradation / repair targets):
//   world.query(MaterialCube, Position)
//     .updateEach(([cube, pos]) => { if (cube.damaged) ... })
//
// Cube stacks (for instanced rendering of walls/structures):
//   world.query(CubeStack)
//
// Hoppers that are full (for belt backup detection):
//   world.query(Hopper)
//     .updateEach(([hopper]) => {
//       const totalCount = hopper.contents.reduce((s, c) => s + c.count, 0);
//       if (totalCount >= hopper.slots) ...
//     })
