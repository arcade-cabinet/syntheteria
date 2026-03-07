/**
 * A* pathfinding over chunk grids.
 * Works within a single fragment — cross-fragment pathing not supported (fragments are disconnected).
 */
import type { GridCell } from "../ecs/types"
import {
  getFragment,
  CHUNK_SIZE,
  type MapFragment,
} from "../ecs/fragments"

interface AStarNode {
  cell: GridCell
  g: number
  h: number
  f: number
  parent: AStarNode | null
}

function heuristic(ax: number, ay: number, bx: number, by: number): number {
  return Math.abs(ax - bx) + Math.abs(ay - by)
}

function cellKey(cell: GridCell): string {
  return `${cell.chunkId}:${cell.x},${cell.y}`
}

/**
 * Get the global tile coordinates (across chunks) for a GridCell.
 */
function globalCoords(cell: GridCell): { gx: number; gy: number } {
  const [cx, cy] = cell.chunkId.split(",").map(Number)
  return { gx: cx * CHUNK_SIZE + cell.x, gy: cy * CHUNK_SIZE + cell.y }
}

/**
 * Convert global tile coordinates back to a GridCell.
 */
function toGridCell(gx: number, gy: number): GridCell {
  const cx = Math.floor(gx / CHUNK_SIZE)
  const cy = Math.floor(gy / CHUNK_SIZE)
  let tx = gx - cx * CHUNK_SIZE
  let ty = gy - cy * CHUNK_SIZE
  // Handle negatives
  if (tx < 0) tx += CHUNK_SIZE
  if (ty < 0) ty += CHUNK_SIZE
  return { chunkId: `${cx},${cy}`, x: tx, y: ty }
}

function getWalkCost(fragment: MapFragment, gx: number, gy: number): number {
  const cell = toGridCell(gx, gy)
  const [cx, cy] = cell.chunkId.split(",").map(Number)
  const chunk = fragment.chunks.get(`${cx},${cy}`)
  if (!chunk) return 1.0 // unexplored territory — allow pathing through it
  return chunk.walkCosts[cell.y][cell.x]
}

const NEIGHBORS = [
  [0, -1], [0, 1], [-1, 0], [1, 0], // cardinal
  [-1, -1], [-1, 1], [1, -1], [1, 1], // diagonal
]

/**
 * Find a path from start to goal within a fragment.
 * Returns array of GridCells, or empty array if no path found.
 */
export function findPath(
  fragmentId: string,
  start: GridCell,
  goal: GridCell,
  maxNodes: number = 1000
): GridCell[] {
  const fragment = getFragment(fragmentId)
  if (!fragment) return []

  const startG = globalCoords(start)
  const goalG = globalCoords(goal)

  const open: AStarNode[] = []
  const closed = new Set<string>()

  const startNode: AStarNode = {
    cell: start,
    g: 0,
    h: heuristic(startG.gx, startG.gy, goalG.gx, goalG.gy),
    f: 0,
    parent: null,
  }
  startNode.f = startNode.g + startNode.h
  open.push(startNode)

  let nodesExplored = 0

  while (open.length > 0 && nodesExplored < maxNodes) {
    // Find node with lowest f
    let bestIdx = 0
    for (let i = 1; i < open.length; i++) {
      if (open[i].f < open[bestIdx].f) bestIdx = i
    }
    const current = open.splice(bestIdx, 1)[0]
    const currentKey = cellKey(current.cell)

    if (closed.has(currentKey)) continue
    closed.add(currentKey)
    nodesExplored++

    const currentG = globalCoords(current.cell)

    // Goal reached?
    if (currentG.gx === goalG.gx && currentG.gy === goalG.gy) {
      // Reconstruct path
      const path: GridCell[] = []
      let node: AStarNode | null = current
      while (node) {
        path.unshift(node.cell)
        node = node.parent
      }
      return path
    }

    // Explore neighbors
    for (const [ndx, ndy] of NEIGHBORS) {
      const ngx = currentG.gx + ndx
      const ngy = currentG.gy + ndy
      const neighborCell = toGridCell(ngx, ngy)
      const neighborKey = cellKey(neighborCell)

      if (closed.has(neighborKey)) continue

      const walkCost = getWalkCost(fragment, ngx, ngy)
      if (walkCost === 0) continue // unwalkable

      // Diagonal movement costs sqrt(2) times the walk cost
      const isDiag = ndx !== 0 && ndy !== 0
      const moveCost = walkCost * (isDiag ? 1.414 : 1.0)

      const g = current.g + moveCost
      const h = heuristic(ngx, ngy, goalG.gx, goalG.gy)

      open.push({
        cell: neighborCell,
        g,
        h,
        f: g + h,
        parent: current,
      })
    }
  }

  return [] // no path found
}
