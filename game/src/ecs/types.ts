/**
 * Syntheteria ECS Entity type and component definitions.
 * All components are optional — Miniplex queries select by presence.
 *
 * Navigation uses continuous 3D positions (no grid/tiles).
 * Units move freely through the world via navmesh pathfinding.
 */

export interface Vec3 {
  x: number
  y: number
  z: number
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
    type: string
    health: number
    maxHealth: number
    speed: number // world units per second at 1x game speed
    selected: boolean
    hasCamerasSensor: boolean // produces detailed maps vs abstract
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
  }

  // Lightning rod specialization
  lightningRod: {
    rodCapacity: number
    currentOutput: number
    protectionRadius: number
  }
}
