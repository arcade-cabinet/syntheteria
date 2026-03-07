/**
 * Map fragment and chunk data structures.
 * Fragments are disconnected islands of explored terrain floating in void.
 */

export const CHUNK_SIZE = 16 // 16x16 tile grid per chunk
export const TILE_SIZE = 1   // 1 world unit per tile

export type FogState = "unexplored" | "abstract" | "detailed" | "stale"

export interface Chunk {
  id: string
  fragmentId: string
  // Grid position of this chunk within the world (chunk coords, not tile coords)
  cx: number
  cy: number
  // Terrain height per tile (0-1 range, used for vertex colors)
  heightMap: number[][]
  // Walk costs for A* (0 = unwalkable)
  walkCosts: number[][]
  // Fog state per tile
  fog: FogState[][]
  // Whether any tile in this chunk has been revealed
  hasRevealed: boolean
}

export interface MapFragment {
  id: string
  chunks: Map<string, Chunk>
  // Display offset — fragments float at arbitrary positions until merged
  displayOffset: { x: number; y: number }
  // Connected fragment IDs (after merging)
  mergedWith: Set<string>
}

// Global fragment store
const fragments = new Map<string, MapFragment>()

let nextFragmentId = 0
let nextChunkId = 0

export function createFragment(offsetX: number, offsetY: number): MapFragment {
  const id = `frag_${nextFragmentId++}`
  const fragment: MapFragment = {
    id,
    chunks: new Map(),
    displayOffset: { x: offsetX, y: offsetY },
    mergedWith: new Set(),
  }
  fragments.set(id, fragment)
  return fragment
}

export function getFragment(id: string): MapFragment | undefined {
  return fragments.get(id)
}

export function getAllFragments(): MapFragment[] {
  return Array.from(fragments.values())
}

export function deleteFragment(id: string) {
  fragments.delete(id)
}

/**
 * Create a chunk with procedural terrain.
 * Uses simple value noise for height; walk costs derived from height.
 */
export function createChunk(fragmentId: string, cx: number, cy: number): Chunk {
  const id = `chunk_${nextChunkId++}`
  const heightMap: number[][] = []
  const walkCosts: number[][] = []
  const fog: FogState[][] = []

  for (let y = 0; y < CHUNK_SIZE; y++) {
    heightMap[y] = []
    walkCosts[y] = []
    fog[y] = []
    for (let x = 0; x < CHUNK_SIZE; x++) {
      // Simple procedural height using sin waves (deterministic by world position)
      const wx = (cx * CHUNK_SIZE + x) * 0.08
      const wy = (cy * CHUNK_SIZE + y) * 0.08
      const h = 0.5
        + 0.3 * Math.sin(wx * 1.2 + wy * 0.8)
        + 0.15 * Math.sin(wx * 2.5 + wy * 1.7 + 1.3)
        + 0.05 * Math.sin(wx * 5.1 + wy * 4.3 + 2.7)
      const clamped = Math.max(0, Math.min(1, h))
      heightMap[y][x] = clamped

      // Walk cost: higher terrain is harder to traverse. Very low = water (unwalkable)
      if (clamped < 0.15) {
        walkCosts[y][x] = 0 // water/impassable
      } else if (clamped < 0.3) {
        walkCosts[y][x] = 1.5 // rough
      } else if (clamped < 0.7) {
        walkCosts[y][x] = 1.0 // normal
      } else {
        walkCosts[y][x] = 2.0 // steep
      }

      fog[y][x] = "unexplored"
    }
  }

  return { id, fragmentId, cx, cy, heightMap, walkCosts, fog, hasRevealed: false }
}

/**
 * Get or create a chunk at the given chunk coordinates within a fragment.
 */
export function getOrCreateChunk(fragment: MapFragment, cx: number, cy: number): Chunk {
  const key = `${cx},${cy}`
  let chunk = fragment.chunks.get(key)
  if (!chunk) {
    chunk = createChunk(fragment.id, cx, cy)
    fragment.chunks.set(key, chunk)
  }
  return chunk
}

/**
 * Convert tile position (within a chunk) to world coordinates,
 * accounting for the fragment's display offset.
 */
export function tileToWorld(
  cx: number, cy: number,
  tx: number, ty: number,
  fragment: MapFragment
): { x: number; y: number; z: number } {
  return {
    x: fragment.displayOffset.x + (cx * CHUNK_SIZE + tx) * TILE_SIZE,
    y: 0,
    z: fragment.displayOffset.y + (cy * CHUNK_SIZE + ty) * TILE_SIZE,
  }
}

/**
 * Convert world position to chunk and tile coordinates.
 */
export function worldToTile(
  wx: number, wz: number,
  fragment: MapFragment
): { cx: number; cy: number; tx: number; ty: number } {
  const localX = (wx - fragment.displayOffset.x) / TILE_SIZE
  const localZ = (wz - fragment.displayOffset.y) / TILE_SIZE
  const cx = Math.floor(localX / CHUNK_SIZE)
  const cy = Math.floor(localZ / CHUNK_SIZE)
  const tx = Math.floor(localX) - cx * CHUNK_SIZE
  const ty = Math.floor(localZ) - cy * CHUNK_SIZE
  return { cx, cy, tx, ty }
}
