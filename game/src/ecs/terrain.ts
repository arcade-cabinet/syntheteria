/**
 * Continuous procedural terrain and fog-of-war system.
 *
 * Terrain is a continuous heightfield — height can be sampled at any (x, z).
 * Fog is tracked per-fragment on a low-res grid for rendering visibility.
 * Fragments are groups of connected robots sharing fog data.
 *
 * Display offsets: fragments appear clustered together initially, then
 * gradually drift apart to their real positions as the map fills in.
 * When only one fragment remains, display matches reality.
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
  // Visual offset — displaces this fragment's terrain and units for rendering.
  // Starts non-zero (clustered) and lerps toward (0,0) = real position.
  displayOffset: { x: number; z: number }
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
    displayOffset: { x: 0, z: 0 },
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

// --- Display offset management ---

// How fast offsets decay toward zero each tick (0.003 = ~0.3% per tick)
const DRIFT_RATE = 0.003

/**
 * Set initial display offsets that cluster all fragments close together.
 * Call after spawning all initial units.
 * Pulls each fragment's center toward the centroid of all fragment centers,
 * so they appear within `radius` of each other.
 */
export function clusterFragments(
  fragmentCenters: Map<string, { x: number; z: number }>,
  radius: number
) {
  if (fragmentCenters.size <= 1) return

  // Compute centroid of all fragment centers
  let cx = 0
  let cz = 0
  for (const center of fragmentCenters.values()) {
    cx += center.x
    cz += center.z
  }
  cx /= fragmentCenters.size
  cz /= fragmentCenters.size

  for (const [fragId, center] of fragmentCenters) {
    const frag = fragments.get(fragId)
    if (!frag) continue

    const dx = center.x - cx
    const dz = center.z - cz
    const dist = Math.sqrt(dx * dx + dz * dz)

    if (dist > radius) {
      // Pull toward centroid so the displayed center is within `radius`
      const scale = radius / dist
      const displayX = cx + dx * scale
      const displayZ = cz + dz * scale
      frag.displayOffset.x = displayX - center.x
      frag.displayOffset.z = displayZ - center.z
    }
    // If already within radius, no offset needed
  }
}

/**
 * Lerp all fragment display offsets toward (0, 0) — real position.
 * Called once per sim tick.
 */
export function updateDisplayOffsets() {
  for (const frag of fragments.values()) {
    frag.displayOffset.x *= 1 - DRIFT_RATE
    frag.displayOffset.z *= 1 - DRIFT_RATE

    // Snap to zero when very close
    if (
      Math.abs(frag.displayOffset.x) < 0.01 &&
      Math.abs(frag.displayOffset.z) < 0.01
    ) {
      frag.displayOffset.x = 0
      frag.displayOffset.z = 0
    }
  }
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
export function getFogAt(
  fragment: MapFragment,
  x: number,
  z: number
): FogState {
  const idx = worldToFogIndex(x, z)
  if (idx < 0) return 0
  return fragment.fog[idx] as FogState
}

/** Set fog state at a world position (only upgrades, never downgrades). */
export function setFogAt(
  fragment: MapFragment,
  x: number,
  z: number,
  state: FogState
) {
  const idx = worldToFogIndex(x, z)
  if (idx < 0) return
  if (fragment.fog[idx] < state) {
    fragment.fog[idx] = state
  }
}
