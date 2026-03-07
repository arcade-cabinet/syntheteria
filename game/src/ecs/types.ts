/**
 * Syntheteria ECS Entity type and component definitions.
 * All components are optional — Miniplex queries select by presence.
 *
 * Navigation uses continuous 3D positions (no grid/tiles).
 * Units move freely through the world via navmesh pathfinding.
 *
 * Units have functional/broken parts instead of hit points.
 */

export interface Vec3 {
  x: number
  y: number
  z: number
}

/** A physical component that can be functional or broken */
export interface UnitComponent {
  name: string
  functional: boolean
  /** Material needed to fabricate a replacement */
  material: "metal" | "plastic" | "electronic"
}

export interface Entity {
  // Identity
  id: string
  faction: "player" | "cultist" | "rogue" | "feral"

  // Continuous 3D position (single source of truth)
  worldPosition: Vec3

  // Which map fragment this entity belongs to (for fog-of-war grouping)
  mapFragment: { fragmentId: string }

  // Unit (mobile robot)
  unit: {
    type: "maintenance_bot" | "utility_drone"
    displayName: string
    speed: number // world units per second at 1x game speed
    selected: boolean
    components: UnitComponent[]
  }

  // Navigation — navmesh path as world-space waypoints
  navigation: {
    path: Vec3[]
    pathIndex: number
    moving: boolean
  }

  // Building / facility
  building: {
    type: string
    powered: boolean
    operational: boolean
    components: UnitComponent[]
  }

  // Lightning rod specialization
  lightningRod: {
    rodCapacity: number
    currentOutput: number
    protectionRadius: number
  }
}

// --- Component helpers ---

export function hasCamera(entity: Entity): boolean {
  return entity.unit.components.some(
    (c) => c.name === "camera" && c.functional
  )
}

export function hasArms(entity: Entity): boolean {
  return entity.unit.components.some(
    (c) => c.name === "arms" && c.functional
  )
}

export function hasFunctionalComponent(
  components: UnitComponent[],
  name: string
): boolean {
  return components.some((c) => c.name === name && c.functional)
}

export function getBrokenComponents(components: UnitComponent[]): UnitComponent[] {
  return components.filter((c) => !c.functional)
}

export function getFunctionalComponents(components: UnitComponent[]): UnitComponent[] {
  return components.filter((c) => c.functional)
}
