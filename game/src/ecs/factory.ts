/**
 * Factory functions for spawning entities.
 */
import { world } from "./world"
import { createFragment, getFragment, getTerrainHeight } from "./terrain"
import type { Entity } from "./types"

let nextEntityId = 0

/**
 * Spawn a robot unit at a world position.
 * Creates a new fragment if no fragmentId is provided.
 */
export function spawnUnit(options: {
  x: number
  z: number
  fragmentId?: string
  type?: string
  hasCamera?: boolean
}): Entity {
  const { x, z, type = "maintenance_bot", hasCamera = true } = options

  // Create or reuse fragment
  let fragment
  if (options.fragmentId) {
    fragment = getFragment(options.fragmentId)
    if (!fragment) throw new Error(`Fragment ${options.fragmentId} not found`)
  } else {
    fragment = createFragment()
  }

  const y = getTerrainHeight(x, z)

  const entity = world.add({
    id: `unit_${nextEntityId++}`,
    faction: "player" as const,
    worldPosition: { x, y, z },
    mapFragment: { fragmentId: fragment.id },
    unit: {
      type,
      health: 100,
      maxHealth: 100,
      speed: 5, // world units per second
      selected: false,
      hasCamerasSensor: hasCamera,
    },
  } as Entity)

  return entity
}

/**
 * Spawn a lightning rod building at a world position.
 */
export function spawnLightningRod(options: {
  x: number
  z: number
  fragmentId: string
}): Entity {
  const fragment = getFragment(options.fragmentId)
  if (!fragment) throw new Error(`Fragment ${options.fragmentId} not found`)

  const y = getTerrainHeight(options.x, options.z)

  return world.add({
    id: `bldg_${nextEntityId++}`,
    faction: "player" as const,
    worldPosition: { x: options.x, y, z: options.z },
    mapFragment: { fragmentId: options.fragmentId },
    building: { type: "lightning_rod", powered: true, operational: true },
    lightningRod: {
      rodCapacity: 10,
      currentOutput: 7,
      protectionRadius: 8,
    },
  } as Entity)
}
