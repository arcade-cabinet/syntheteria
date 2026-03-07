/**
 * Factory functions for spawning entities.
 */
import { world } from "./world"
import {
  createFragment,
  getFragment,
  getOrCreateChunk,
  tileToWorld,
} from "./fragments"
import type { Entity } from "./types"

let nextEntityId = 0

/**
 * Spawn a robot unit at the given chunk/tile coordinates within a new or existing fragment.
 */
export function spawnUnit(options: {
  fragmentId?: string
  cx: number
  cy: number
  tx: number
  ty: number
  type?: string
  hasCamera?: boolean
  fragmentOffsetX?: number
  fragmentOffsetY?: number
}): Entity {
  const {
    cx, cy, tx, ty,
    type = "maintenance_bot",
    hasCamera = true,
    fragmentOffsetX = 0,
    fragmentOffsetY = 0,
  } = options

  // Create or reuse fragment
  let fragment
  if (options.fragmentId) {
    fragment = getFragment(options.fragmentId)
    if (!fragment) throw new Error(`Fragment ${options.fragmentId} not found`)
  } else {
    fragment = createFragment(fragmentOffsetX, fragmentOffsetY)
  }

  // Ensure chunk exists
  getOrCreateChunk(fragment, cx, cy)

  const worldPos = tileToWorld(cx, cy, tx, ty, fragment)
  const chunkId = `${cx},${cy}`

  const entity = world.add({
    id: `unit_${nextEntityId++}`,
    faction: "player" as const,
    position: { chunkId, x: tx, y: ty },
    worldPosition: { ...worldPos },
    mapFragment: { fragmentId: fragment.id },
    unit: {
      type,
      health: 100,
      maxHealth: 100,
      speed: 3,
      selected: false,
      hasCamerasSensor: hasCamera,
    },
  } as Entity)

  return entity
}

/**
 * Spawn a lightning rod building.
 */
export function spawnLightningRod(options: {
  fragmentId: string
  cx: number
  cy: number
  tx: number
  ty: number
}): Entity {
  const fragment = getFragment(options.fragmentId)
  if (!fragment) throw new Error(`Fragment ${options.fragmentId} not found`)

  getOrCreateChunk(fragment, options.cx, options.cy)
  const worldPos = tileToWorld(options.cx, options.cy, options.tx, options.ty, fragment)
  const chunkId = `${options.cx},${options.cy}`

  return world.add({
    id: `bldg_${nextEntityId++}`,
    faction: "player" as const,
    position: { chunkId, x: options.tx, y: options.ty },
    worldPosition: { ...worldPos },
    mapFragment: { fragmentId: options.fragmentId },
    building: { type: "lightning_rod", powered: true, operational: true },
    lightningRod: {
      rodCapacity: 10,
      currentOutput: 7,
      protectionRadius: 8,
    },
  } as Entity)
}
