/**
 * Unit & Building ECS Traits — mobile robots, structures, and their parts.
 *
 * Koota features used:
 *   - trait() with callback → AoS storage for components with arrays/nested data
 *   - trait() with schema object → SoA storage for flat numeric/boolean fields
 *
 * Migration notes:
 *   - entity.unit → Unit trait (AoS)
 *   - entity.building → Building trait (AoS)
 *   - entity.lightningRod → LightningRod trait (SoA)
 *   - UnitComponent interface → ComponentSlot (kept as a plain type, not a trait)
 *   - ComponentType union extracted for type safety across the codebase
 */

// ---------------------------------------------------------------------------
// Supporting types
// ---------------------------------------------------------------------------

/**
 * All component types that can be installed in a unit or building.
 *
 * Components are physical parts — they break individually instead of a global
 * HP bar. This is the core of Syntheteria's damage model.
 */
export type ComponentType =
  | "camera"           // vision / sensor — required for fog-of-war reveal
  | "arms"             // manipulation — required for repair, fabrication, carrying cubes
  | "legs"             // ground locomotion
  | "wheels"           // faster ground locomotion, less terrain traversal
  | "hover_unit"       // hover locomotion — ignores terrain penalties
  | "power_cell"       // portable power source for mobile units
  | "power_supply"     // fixed power source for buildings
  | "fabrication_arm"  // can fabricate components from raw materials
  | "material_hopper"  // stores raw materials for fabrication
  | "drill_head"       // mining attachment
  | "signal_antenna"   // extends signal network range
  | "armor_plate"      // absorbs damage before other components take hits
  | "weapon_laser"     // ranged energy weapon
  | "weapon_emp"       // disables electronics temporarily
  | "weapon_claw"      // melee physical weapon
  | "cargo_bay";       // carries material cubes

/**
 * Material types for component fabrication.
 * Determines what resource is consumed to build or repair the component.
 */
export type ComponentMaterial = "metal" | "plastic" | "electronic";

/**
 * A single component slot on a unit or building.
 *
 * Not a Koota trait — this is nested data inside the Unit/Building traits.
 * Each slot represents one physical part that can be functional or broken.
 */
export interface ComponentSlot {
  /** Which component type occupies this slot */
  type: ComponentType;
  /** Whether this component is currently working */
  functional: boolean;
  /**
   * Component health as a fraction 0..1.
   * At 0, the component is non-functional. Damage reduces this value;
   * repair restores it. When health drops to 0, `functional` flips to false.
   */
  health: number;
  /** Material required to fabricate a replacement */
  material: ComponentMaterial;
}

// ---------------------------------------------------------------------------
// Trait schemas
// ---------------------------------------------------------------------------

/**
 * Unit — a mobile robot entity that can move, act, and be commanded.
 *
 * Koota: `trait(() => ({ ... }))` — AoS storage (callback form) because
 * `components` is a variable-length array of ComponentSlot objects.
 *
 * Replaces `entity.unit` on the Miniplex Entity.
 * Entities with Unit also typically have Position, Faction, and Navigation.
 */
export interface UnitSchema {
  /**
   * Unit archetype identifier (e.g., "maintenance_bot", "utility_drone").
   * Maps to a key in config/units.json for default stats.
   */
  type: string;
  /** Human-readable display name shown in UI */
  displayName: string;
  /** Movement speed in world units per second at 1x game speed */
  speed: number;
  /** Whether this unit is currently selected by the player */
  selected: boolean;
  /**
   * Physical components installed on this unit.
   * Each slot can be functional or broken — there is no global HP.
   */
  components: ComponentSlot[];
}

/**
 * Building — a stationary structure placed in the world.
 *
 * Koota: `trait(() => ({ ... }))` — AoS storage (callback form) because
 * `components` is a variable-length array.
 *
 * Replaces `entity.building` on the Miniplex Entity.
 * Buildings are always paired with Position and Faction.
 * Some buildings have additional specialization traits (LightningRod, Miner, etc.)
 */
export interface BuildingSchema {
  /**
   * Building archetype identifier (e.g., "lightning_rod", "fabrication_unit", "miner").
   * Maps to a key in config/buildings.json.
   */
  type: string;
  /** Whether this building is receiving power from the grid */
  powered: boolean;
  /**
   * Whether this building is currently operational.
   * A building can be powered but non-operational (e.g., missing components,
   * no recipe set, input hopper empty).
   */
  operational: boolean;
}

/**
 * LightningRod — specialization trait for buildings that harvest storm energy.
 *
 * Koota: `trait({ capacity: 10, currentOutput: 0, protectionRadius: 8 })` — SoA
 * storage (flat numerics, ideal for power system iteration).
 *
 * Replaces `entity.lightningRod` on the Miniplex Entity.
 * Always paired with Building trait.
 */
export interface LightningRodSchema {
  /**
   * Maximum energy the rod can harvest per storm strike.
   * Higher capacity rods are more expensive to build.
   */
  capacity: number;
  /**
   * Current power output in energy units.
   * Fluctuates with storm intensity (sine wave + random surges).
   */
  currentOutput: number;
  /**
   * Radius in world units within which this rod protects buildings
   * from lightning damage.
   */
  protectionRadius: number;
}

// ---------------------------------------------------------------------------
// Koota trait declarations (pseudocode)
// ---------------------------------------------------------------------------
//
// import { trait } from 'koota';
//
// export const Unit = trait(() => ({
//   type: 'maintenance_bot' as string,
//   displayName: 'Bot',
//   speed: 3,
//   selected: false,
//   components: [] as ComponentSlot[],
// }));
//
// export const Building = trait(() => ({
//   type: 'lightning_rod' as string,
//   powered: false,
//   operational: false,
// }));
//
// export const LightningRod = trait({
//   capacity: 10,
//   currentOutput: 0,
//   protectionRadius: 8,
// });

// ---------------------------------------------------------------------------
// Queries that would use these traits
// ---------------------------------------------------------------------------
//
// All mobile units:
//   world.query(Unit, Position)
//
// All player-owned units:
//   world.query(Unit, Faction).updateEach(([u, f]) => { if (f.value === 'player') ... })
//
// Selected units (for command dispatch):
//   world.query(Unit, IsSelected, Position)
//
// Units that can repair (have functional arms):
//   world.query(Unit, Position)
//     .updateEach(([u, p]) => {
//       if (u.components.some(c => c.type === 'arms' && c.functional)) ...
//     })
//
// All buildings:
//   world.query(Building, Position)
//
// Powered buildings only:
//   world.query(Building, Position)
//     .updateEach(([b, p]) => { if (b.powered) ... })
//
// Lightning rods (for power system):
//   world.query(LightningRod, Building, Position)
//
// Buildings whose power state changed (for visual update):
//   world.query(Changed(Building), Position)
//
// Newly placed buildings (for navmesh rebuild trigger):
//   world.query(Added(Building), Position)
