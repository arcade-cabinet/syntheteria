/**
 * Continuous procedural terrain and fog-of-war system.
 * Replaces the old chunk/tile/fragment system.
 *
 * Terrain is a continuous heightfield — height can be sampled at any (x, z).
 * Fog is tracked per-fragment on a low-res grid for rendering visibility.
 * Fragments are groups of connected robots sharing fog data.
 */

// World bounds (terrain extends from -HALF to +HALF on each axis)
export const WORLD_SIZE = 200
export const WORLD_HALF = WORLD_SIZE / 2

// Fog grid resolution — one cell per world unit
export const FOG_RES = WORLD_SIZE

export type FogState = 0 | 1 | 2 // 0=unexplored, 1=abstract, 2=detailed

export interface MapFragment {
  id: string
  fog: Uint8Array // FOG_RES * FOG_RES, row-major
  mergedWith: Set<string>
}

// --- Procedural terrain ---

/**
 * Sample terrain height at any continuous world position.
 * Returns Y value (elevation). Same noise as the old chunk system.
 */
export function getTerrainHeight(x: number, z: number): number {
  const wx = x * 0.08
  const wz = z * 0.08
  const h =
    0.5 +
    0.3 * Math.sin(wx * 1.2 + wz * 0.8) +
    0.15 * Math.sin(wx * 2.5 + wz * 1.7 + 1.3) +
    0.05 * Math.sin(wx * 5.1 + wz * 4.3 + 2.7)
  return Math.max(0, Math.min(1, h)) * 0.5 // 0–0.5 elevation
}

/**
 * Is the terrain walkable at this position?
 * Water (very low terrain) is impassable.
 */
export function isWalkable(x: number, z: number): boolean {
  const raw = getTerrainHeight(x, z) / 0.5 // undo the *0.5 scaling
  return raw >= 0.15 // below 0.15 is water
}

/**
 * Walk cost multiplier at a position (for weighted A*).
 * 1.0 = normal, higher = harder, 0 = impassable.
 */
export function getWalkCost(x: number, z: number): number {
  const raw = getTerrainHeight(x, z) / 0.5
  if (raw < 0.15) return 0 // water
  if (raw < 0.3) return 1.5 // rough
  if (raw < 0.7) return 1.0 // normal
  return 2.0 // steep
}

// --- Fragment (fog-of-war group) management ---

const fragments = new Map<string, MapFragment>()
let nextFragmentId = 0

function createFogGrid(): Uint8Array {
  return new Uint8Array(FOG_RES * FOG_RES) // all zeros = unexplored
}

export function createFragment(): MapFragment {
  const id = `frag_${nextFragmentId++}`
  const fragment: MapFragment = {
    id,
    fog: createFogGrid(),
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

// --- Fog helpers ---

/** Convert world position to fog grid index. Returns -1 if out of bounds. */
export function worldToFogIndex(x: number, z: number): number {
  const gx = Math.floor(x + WORLD_HALF)
  const gz = Math.floor(z + WORLD_HALF)
  if (gx < 0 || gx >= FOG_RES || gz < 0 || gz >= FOG_RES) return -1
  return gz * FOG_RES + gx
}

/** Get fog state at a world position for a fragment. */
export function getFogAt(fragment: MapFragment, x: number, z: number): FogState {
  const idx = worldToFogIndex(x, z)
  if (idx < 0) return 0
  return fragment.fog[idx] as FogState
}

/** Set fog state at a world position (only upgrades, never downgrades). */
export function setFogAt(fragment: MapFragment, x: number, z: number, state: FogState) {
  const idx = worldToFogIndex(x, z)
  if (idx < 0) return
  if (fragment.fog[idx] < state) {
    fragment.fog[idx] = state
  }
}

/**
 * Build a combined fog map from all fragments.
 * Returns Uint8Array[FOG_RES * FOG_RES] with max fog state at each cell.
 */
export function buildCombinedFog(): Uint8Array {
  const combined = new Uint8Array(FOG_RES * FOG_RES)
  for (const frag of fragments.values()) {
    for (let i = 0; i < combined.length; i++) {
      if (frag.fog[i] > combined[i]) {
        combined[i] = frag.fog[i]
      }
    }
  }
  return combined
}
