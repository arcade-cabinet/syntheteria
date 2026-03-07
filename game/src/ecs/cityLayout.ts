/**
 * Procedural city layout generator.
 *
 * Generates a somewhat labyrinthine industrial city with:
 * - Large factory buildings and warehouses
 * - Narrow streets and alleyways between them
 * - Open plazas and junctions
 * - Rubble and collapsed sections that partially block paths
 *
 * The layout is deterministic (seeded) so navmesh and rendering agree.
 * Buildings are stored as axis-aligned rectangles in world space.
 */

// City layout doesn't need WORLD_HALF — it uses its own bounds

// Seeded PRNG for deterministic city generation
function seededRandom(seed: number): () => number {
  let s = seed
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff
    return s / 0x7fffffff
  }
}

export interface CityBuilding {
  /** World-space center */
  x: number
  z: number
  /** Half-extents */
  halfW: number
  halfD: number
  /** Building height for rendering */
  height: number
  /** Type affects visual appearance */
  type: "factory" | "warehouse" | "tower" | "ruin" | "wall"
}

let cachedBuildings: CityBuilding[] | null = null

/**
 * City area: the starting area is an industrial district roughly
 * centered around where the player spawns (near x=5..20, z=10..18).
 * We generate the city in a region around (-30,-30) to (50,50) world coords,
 * leaving open terrain beyond for future areas.
 */
const CITY_MIN_X = -30
const CITY_MAX_X = 50
const CITY_MIN_Z = -20
const CITY_MAX_Z = 50

export function getCityBuildings(): CityBuilding[] {
  if (cachedBuildings) return cachedBuildings

  const rng = seededRandom(42)
  const buildings: CityBuilding[] = []

  // --- Grid-based block layout ---
  // Streets run roughly every 8-12 units, creating city blocks.
  // Within each block, place 1-3 buildings with gaps (alleys).

  const BLOCK_SIZE = 10
  const STREET_WIDTH = 3

  for (let bz = CITY_MIN_Z; bz < CITY_MAX_Z; bz += BLOCK_SIZE + STREET_WIDTH) {
    for (let bx = CITY_MIN_X; bx < CITY_MAX_X; bx += BLOCK_SIZE + STREET_WIDTH) {
      // Skip some blocks for plazas / open areas
      const skipChance = rng()
      if (skipChance < 0.15) continue

      // Keep a clear area around spawn points (5,10) to (20,18)
      const blockCenterX = bx + BLOCK_SIZE / 2
      const blockCenterZ = bz + BLOCK_SIZE / 2
      if (blockCenterX > 2 && blockCenterX < 23 && blockCenterZ > 7 && blockCenterZ < 21) {
        // Spawn area — place smaller/fewer buildings
        if (rng() < 0.6) continue
        const hw = 1.5 + rng() * 1.5
        const hd = 1.5 + rng() * 1.5
        const h = 1.5 + rng() * 2
        buildings.push({
          x: blockCenterX + (rng() - 0.5) * 3,
          z: blockCenterZ + (rng() - 0.5) * 3,
          halfW: hw,
          halfD: hd,
          height: h,
          type: rng() < 0.5 ? "ruin" : "warehouse",
        })
        continue
      }

      // Normal city block: fill with buildings
      const numBuildings = rng() < 0.3 ? 1 : rng() < 0.7 ? 2 : 3
      const subDivisions = subdivideBlock(bx, bz, BLOCK_SIZE, numBuildings, rng)

      for (const sub of subDivisions) {
        // Inset from block edge for alley space
        const inset = 0.3 + rng() * 0.5
        const hw = Math.max(1.2, sub.w / 2 - inset)
        const hd = Math.max(1.2, sub.d / 2 - inset)

        const typeRoll = rng()
        let type: CityBuilding["type"]
        let height: number

        if (typeRoll < 0.25) {
          type = "factory"
          height = 3 + rng() * 4
        } else if (typeRoll < 0.5) {
          type = "warehouse"
          height = 2 + rng() * 3
        } else if (typeRoll < 0.65) {
          type = "tower"
          height = 5 + rng() * 6
        } else if (typeRoll < 0.85) {
          type = "ruin"
          height = 1 + rng() * 3
        } else {
          type = "wall"
          height = 2 + rng() * 2
        }

        buildings.push({
          x: sub.cx,
          z: sub.cz,
          halfW: hw,
          halfD: hd,
          height,
          type,
        })
      }
    }
  }

  // Add some outer perimeter walls / large ruins at edges
  addPerimeterStructures(buildings, rng)

  cachedBuildings = buildings
  return buildings
}

function subdivideBlock(
  bx: number,
  bz: number,
  size: number,
  count: number,
  rng: () => number
): { cx: number; cz: number; w: number; d: number }[] {
  if (count === 1) {
    return [{ cx: bx + size / 2, cz: bz + size / 2, w: size, d: size }]
  }
  if (count === 2) {
    // Split horizontally or vertically
    if (rng() < 0.5) {
      const split = 0.35 + rng() * 0.3
      const w1 = size * split
      const w2 = size * (1 - split)
      return [
        { cx: bx + w1 / 2, cz: bz + size / 2, w: w1 - 0.5, d: size },
        { cx: bx + w1 + w2 / 2, cz: bz + size / 2, w: w2 - 0.5, d: size },
      ]
    } else {
      const split = 0.35 + rng() * 0.3
      const d1 = size * split
      const d2 = size * (1 - split)
      return [
        { cx: bx + size / 2, cz: bz + d1 / 2, w: size, d: d1 - 0.5 },
        { cx: bx + size / 2, cz: bz + d1 + d2 / 2, w: size, d: d2 - 0.5 },
      ]
    }
  }
  // 3 buildings: split once, then split the larger half
  const split = 0.45 + rng() * 0.1
  if (rng() < 0.5) {
    const w1 = size * split
    const w2 = size * (1 - split)
    const subSplit = 0.4 + rng() * 0.2
    const d1 = size * subSplit
    const d2 = size * (1 - subSplit)
    return [
      { cx: bx + w1 / 2, cz: bz + size / 2, w: w1 - 0.5, d: size },
      { cx: bx + w1 + w2 / 2, cz: bz + d1 / 2, w: w2 - 0.5, d: d1 - 0.5 },
      { cx: bx + w1 + w2 / 2, cz: bz + d1 + d2 / 2, w: w2 - 0.5, d: d2 - 0.5 },
    ]
  } else {
    const d1 = size * split
    const d2 = size * (1 - split)
    const subSplit = 0.4 + rng() * 0.2
    const w1 = size * subSplit
    const w2 = size * (1 - subSplit)
    return [
      { cx: bx + size / 2, cz: bz + d1 / 2, w: size, d: d1 - 0.5 },
      { cx: bx + w1 / 2, cz: bz + d1 + d2 / 2, w: w1 - 0.5, d: d2 - 0.5 },
      { cx: bx + w1 + w2 / 2, cz: bz + d1 + d2 / 2, w: w2 - 0.5, d: d2 - 0.5 },
    ]
  }
}

function addPerimeterStructures(buildings: CityBuilding[], rng: () => number) {
  // Large wall segments along city edges
  const segments = [
    { x: CITY_MIN_X - 2, z: 10, halfW: 1.5, halfD: 15, type: "wall" as const },
    { x: CITY_MAX_X + 2, z: 10, halfW: 1.5, halfD: 15, type: "wall" as const },
    { x: 10, z: CITY_MIN_Z - 2, halfW: 15, halfD: 1.5, type: "wall" as const },
    { x: 10, z: CITY_MAX_Z + 2, halfW: 15, halfD: 1.5, type: "wall" as const },
  ]

  for (const seg of segments) {
    if (rng() < 0.3) continue // Some perimeter sections are destroyed
    buildings.push({
      ...seg,
      height: 3 + rng() * 2,
    })
  }
}

/**
 * Check if a world position is inside any building footprint.
 * Used by navmesh to mark cells as unwalkable.
 */
export function isInsideBuilding(x: number, z: number): boolean {
  const buildings = getCityBuildings()
  for (const b of buildings) {
    if (
      x >= b.x - b.halfW &&
      x <= b.x + b.halfW &&
      z >= b.z - b.halfD &&
      z <= b.z + b.halfD
    ) {
      return true
    }
  }
  return false
}

/**
 * Check if a world position is near a building edge (for movement cost increase).
 */
export function nearBuildingEdge(x: number, z: number, margin: number = 0.5): boolean {
  const buildings = getCityBuildings()
  for (const b of buildings) {
    const nearX = x >= b.x - b.halfW - margin && x <= b.x + b.halfW + margin
    const nearZ = z >= b.z - b.halfD - margin && z <= b.z + b.halfD + margin
    if (nearX && nearZ) {
      const insideX = x >= b.x - b.halfW && x <= b.x + b.halfW
      const insideZ = z >= b.z - b.halfD && z <= b.z + b.halfD
      if (!insideX || !insideZ) return true // Near edge but not inside
    }
  }
  return false
}
