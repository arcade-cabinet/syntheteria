/**
 * Syntheteria ECS Entity type and component definitions.
 * All components are optional — Miniplex queries select by presence.
 */

export interface GridCell {
  chunkId: string
  x: number
  y: number
}

export interface Entity {
  // Identity
  id: string
  faction: "player" | "cultist" | "rogue" | "feral"

  // Spatial — grid position within a chunk
  position: GridCell

  // Continuous 3D coords for smooth rendering (updated per-frame)
  worldPosition: { x: number; y: number; z: number }

  // Which map fragment this entity belongs to
  mapFragment: { fragmentId: string }

  // Unit (mobile robot)
  unit: {
    type: string
    health: number
    maxHealth: number
    speed: number // grid cells per second at 1x game speed
    selected: boolean
    hasCamerasSensor: boolean // produces detailed maps vs abstract
  }

  // Navigation — A* path
  navigation: {
    path: GridCell[]
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
