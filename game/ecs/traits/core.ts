/**
 * Core ECS Traits — fundamental components shared across all entity types.
 *
 * Koota features used:
 *   - trait() with schema objects → SoA (struct-of-arrays) storage for fast iteration
 *   - trait() with callback → AoS (array-of-structs) for complex/nested data
 *   - Tag traits (no data) for boolean flags
 *
 * Migration notes:
 *   - Vec3 / worldPosition → Position trait (SoA)
 *   - entity.faction string → Faction trait (SoA, typed union)
 *   - entity.playerControlled → IsPlayerControlled trait (AoS, has nested state)
 *   - entity.navigation → Navigation trait (AoS, has arrays)
 *   - entity.mapFragment → MapFragment trait (SoA)
 */

// ---------------------------------------------------------------------------
// Type definitions
// ---------------------------------------------------------------------------

/**
 * All factions in the game world.
 *
 * - "player"           — the awakened AI and its reclaimed machines
 * - "reclaimers"       — allied scavenger faction; trades scrap for intel
 * - "volt_collective"  — lightning-worshipping cult (primary antagonist)
 * - "signal_choir"     — rogue AI collective; neutral until provoked
 * - "iron_creed"       — militaristic machine faction; guards resource zones
 * - "feral"            — unaligned broken machines; hostile to all
 * - "wildlife"         — otters, birds, ambient creatures; non-combatant
 */
export type FactionId =
  | "player"
  | "reclaimers"
  | "volt_collective"
  | "signal_choir"
  | "iron_creed"
  | "feral"
  | "wildlife";

// ---------------------------------------------------------------------------
// Trait schemas (design-only — interfaces + JSDoc)
// ---------------------------------------------------------------------------

/**
 * Position — continuous 3D world-space coordinates.
 *
 * Koota: `trait({ x: 0, y: 0, z: 0 })` — SoA storage.
 *
 * Replaces `worldPosition?: Vec3` on the Miniplex Entity.
 * Every spatially-present entity has this trait.
 */
export interface PositionSchema {
  /** World-space X coordinate */
  x: number;
  /** World-space Y coordinate (vertical / altitude) */
  y: number;
  /** World-space Z coordinate */
  z: number;
}

/**
 * Faction — which team/alignment this entity belongs to.
 *
 * Koota: `trait({ value: 'player' as FactionId })` — SoA storage.
 *
 * Replaces `faction: "player" | "cultist" | ...` on the Miniplex Entity.
 * Expanded from 5 factions to 7 to support the factory-planet narrative.
 */
export interface FactionSchema {
  /** The faction identifier */
  value: FactionId;
}

/**
 * IsPlayerControlled — marks the entity currently being piloted by the player
 * in first-person mode.
 *
 * Koota: `trait(() => ({ isActive: true, yaw: 0, pitch: 0 }))` — AoS storage
 * (callback form) because this is mutated frequently by the input system.
 *
 * Replaces `playerControlled?: { isActive, yaw, pitch }` on the Miniplex Entity.
 * Only one entity should have this trait at a time.
 */
export interface IsPlayerControlledSchema {
  /** Whether the player is actively controlling this entity right now */
  isActive: boolean;
  /** Horizontal look angle in radians */
  yaw: number;
  /** Vertical look angle in radians, clamped to +/-PI/2 */
  pitch: number;
}

/**
 * Navigation — path-following state for entities that move through the world.
 *
 * Koota: `trait(() => ({ path: [], pathIndex: 0, moving: false }))` — AoS storage
 * (callback form) because `path` is a variable-length array.
 *
 * Replaces `navigation?: { path, pathIndex, moving }` on the Miniplex Entity.
 */
export interface NavigationSchema {
  /** Sequence of world-space waypoints from navmesh A* */
  path: PositionSchema[];
  /** Index of the current waypoint being walked toward */
  pathIndex: number;
  /** Whether the entity is actively moving along the path */
  moving: boolean;
}

/**
 * MapFragment — fog-of-war grouping. Entities belong to a map fragment that
 * is revealed when the player's units explore that area.
 *
 * Koota: `trait({ fragmentId: '' })` — SoA storage.
 *
 * Replaces `mapFragment?: { fragmentId }` on the Miniplex Entity.
 */
export interface MapFragmentSchema {
  /** Unique identifier for the map fragment this entity belongs to */
  fragmentId: string;
}

/**
 * IsSelected — tag trait indicating the entity is currently selected by the
 * player in the RTS-style top-down view.
 *
 * Koota: `trait()` — tag trait, no data (pure marker).
 *
 * Previously tracked as `unit.selected` or `building.selected` booleans inside
 * the Unit/Building components. Extracting it as a standalone tag trait allows
 * efficient queries like `world.query(Unit, IsSelected)`.
 */
export type IsSelectedTag = Record<string, never>;

// ---------------------------------------------------------------------------
// Koota trait declarations (pseudocode — actual Koota API calls)
// ---------------------------------------------------------------------------
//
// import { trait } from 'koota';
//
// export const Position    = trait({ x: 0, y: 0, z: 0 });
// export const Faction     = trait({ value: 'player' as FactionId });
// export const MapFragment = trait({ fragmentId: '' });
// export const IsSelected  = trait();  // tag — no data
//
// // AoS (callback form) for complex/mutable data:
// export const IsPlayerControlled = trait(() => ({
//   isActive: true,
//   yaw: 0,
//   pitch: 0,
// }));
//
// export const Navigation = trait(() => ({
//   path: [] as PositionSchema[],
//   pathIndex: 0,
//   moving: false,
// }));

// ---------------------------------------------------------------------------
// Queries that would use these traits
// ---------------------------------------------------------------------------
//
// All spatial entities:
//   world.query(Position)
//
// All player-faction entities:
//   world.query(Faction).updateEach(([f]) => { if (f.value === 'player') ... })
//   — or use a tag trait IsPlayerFaction for O(1) filtering
//
// The currently-piloted entity:
//   world.query(IsPlayerControlled, Position)
//
// All entities with active navigation:
//   world.query(Navigation, Position)
//
// Newly spawned entities (for fog-of-war reveal):
//   world.query(Added(Position), MapFragment)
//
// Currently selected units (for RTS command dispatch):
//   world.query(IsSelected, Position)
//
// Entities whose position changed (for spatial index update):
//   world.query(Changed(Position))
