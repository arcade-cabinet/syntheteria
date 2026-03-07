/**
 * Factory functions for spawning entities.
 */
import { world } from "./world"
import { createFragment, getFragment, getTerrainHeight } from "./terrain"
import type { Entity, UnitComponent } from "./types"

let nextEntityId = 0

/**
 * Spawn a maintenance bot at a world position.
 * Components determine what the bot can do (camera for vision, arms for repair, etc.)
 */
export function spawnUnit(options: {
  x: number
  z: number
  fragmentId?: string
  type?: "maintenance_bot" | "utility_drone"
  displayName?: string
  speed?: number
  components: UnitComponent[]
}): Entity {
  const {
    x,
    z,
    type = "maintenance_bot",
    displayName = "Maintenance Bot",
    speed = 3,
    components,
  } = options

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
      displayName,
      speed,
      selected: false,
      components,
    },
    navigation: { path: [], pathIndex: 0, moving: false },
  } as Partial<Entity> as Entity)

  return entity
}

/**
 * Spawn a fabrication unit (stationary building) at a world position.
 */
export function spawnFabricationUnit(options: {
  x: number
  z: number
  fragmentId: string
  powered?: boolean
  components?: UnitComponent[]
}): Entity {
  const fragment = getFragment(options.fragmentId)
  if (!fragment) throw new Error(`Fragment ${options.fragmentId} not found`)

  const y = getTerrainHeight(options.x, options.z)

  return world.add({
    id: `bldg_${nextEntityId++}`,
    faction: "player" as const,
    worldPosition: { x: options.x, y, z: options.z },
    mapFragment: { fragmentId: options.fragmentId },
    building: {
      type: "fabrication_unit",
      powered: options.powered ?? false,
      operational: (options.powered ?? false),
      selected: false,
      components: options.components ?? [
        { name: "power_supply", functional: false, material: "electronic" },
        { name: "fabrication_arm", functional: true, material: "metal" },
        { name: "material_hopper", functional: true, material: "metal" },
      ],
    },
  } as Partial<Entity> as Entity)
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
    building: {
      type: "lightning_rod",
      powered: true,
      operational: true,
      selected: false,
      components: [],
    },
    lightningRod: {
      rodCapacity: 10,
      currentOutput: 7,
      protectionRadius: 8,
    },
  } as Partial<Entity> as Entity)
}
