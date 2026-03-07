/**
 * Fragment merge system: detects when units from different fragments
 * are close enough to trigger a merge, then combines their fragments.
 */
import { units } from "../ecs/world"
import type { Entity } from "../ecs/types"
import {
  getFragment,
  deleteFragment,
  CHUNK_SIZE,
  TILE_SIZE,
} from "../ecs/fragments"

const MERGE_DISTANCE = 3 // tiles

/**
 * Check if any units from different fragments are close enough to merge.
 * Returns merge events to be animated by the renderer.
 */
export interface MergeEvent {
  absorbedId: string
  survivorId: string
  offsetDelta: { x: number; y: number } // how far the absorbed fragment moves
}

export function fragmentMergeSystem(): MergeEvent[] {
  const events: MergeEvent[] = []
  const unitList = Array.from(units)

  for (let i = 0; i < unitList.length; i++) {
    for (let j = i + 1; j < unitList.length; j++) {
      const a = unitList[i]
      const b = unitList[j]

      if (a.mapFragment.fragmentId === b.mapFragment.fragmentId) continue

      // Check distance between world positions
      const dx = a.worldPosition.x - b.worldPosition.x
      const dz = a.worldPosition.z - b.worldPosition.z
      const dist = Math.sqrt(dx * dx + dz * dz)

      if (dist <= MERGE_DISTANCE * TILE_SIZE) {
        const event = mergeFragments(a, b)
        if (event) events.push(event)
      }
    }
  }

  return events
}

function mergeFragments(unitA: Entity, unitB: Entity): MergeEvent | null {
  const fragA = getFragment(unitA.mapFragment.fragmentId)
  const fragB = getFragment(unitB.mapFragment.fragmentId)
  if (!fragA || !fragB) return null

  // Survivor is the one with more chunks (or fragA by default)
  const [survivor, absorbed] = fragA.chunks.size >= fragB.chunks.size
    ? [fragA, fragB]
    : [fragB, fragA]

  // Calculate the offset to move absorbed chunks into survivor's coordinate space
  // The delta is: where the absorbed fragment's origin should be relative to survivor's origin
  const offsetDelta = {
    x: absorbed.displayOffset.x - survivor.displayOffset.x,
    y: absorbed.displayOffset.y - survivor.displayOffset.y,
  }

  // Move all chunks from absorbed to survivor
  // We need to recalculate chunk positions based on the world-space offset
  const tileOffsetX = Math.round(offsetDelta.x / TILE_SIZE)
  const tileOffsetY = Math.round(offsetDelta.y / TILE_SIZE)
  const chunkOffsetX = Math.floor(tileOffsetX / CHUNK_SIZE)
  const chunkOffsetY = Math.floor(tileOffsetY / CHUNK_SIZE)

  for (const [_key, chunk] of absorbed.chunks) {
    const newCx = chunk.cx + chunkOffsetX
    const newCy = chunk.cy + chunkOffsetY
    const newKey = `${newCx},${newCy}`

    // Only add if survivor doesn't already have this chunk
    if (!survivor.chunks.has(newKey)) {
      chunk.cx = newCx
      chunk.cy = newCy
      chunk.fragmentId = survivor.id
      survivor.chunks.set(newKey, chunk)
    } else {
      // Merge fog data — keep the higher detail level
      const existing = survivor.chunks.get(newKey)!
      for (let y = 0; y < chunk.fog.length; y++) {
        for (let x = 0; x < chunk.fog[y].length; x++) {
          const eFog = existing.fog[y][x]
          const aFog = chunk.fog[y][x]
          if (eFog === "unexplored" && aFog !== "unexplored") {
            existing.fog[y][x] = aFog
          } else if (eFog === "abstract" && aFog === "detailed") {
            existing.fog[y][x] = "detailed"
          }
        }
      }
    }
  }

  // Update all entities that belonged to the absorbed fragment
  for (const entity of units) {
    if (entity.mapFragment.fragmentId === absorbed.id) {
      entity.mapFragment.fragmentId = survivor.id
      // Recalculate world position based on new fragment offset
      const [cx, cy] = entity.position.chunkId.split(",").map(Number)
      const newCx = cx + chunkOffsetX
      const newCy = cy + chunkOffsetY
      entity.position.chunkId = `${newCx},${newCy}`
      entity.worldPosition.x = survivor.displayOffset.x + (newCx * CHUNK_SIZE + entity.position.x) * TILE_SIZE
      entity.worldPosition.z = survivor.displayOffset.y + (newCy * CHUNK_SIZE + entity.position.y) * TILE_SIZE
    }
  }

  survivor.mergedWith.add(absorbed.id)
  deleteFragment(absorbed.id)

  return {
    absorbedId: absorbed.id,
    survivorId: survivor.id,
    offsetDelta,
  }
}
