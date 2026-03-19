/**
 * BoardNavGraph — Yuka Graph built from board tiles.
 *
 * Converts our GeneratedBoard into a Yuka Graph with Nodes and weighted Edges.
 * AI pathfinding uses Yuka's AStar search instead of our manual BFS/A*.
 *
 * Key improvements over the handwritten adjacency.shortestPath():
 * - Weighted edges respect terrain cost (abyssal = 2, corrupted = 3)
 * - Dynamic cost updates (corruption spreads, tiles become more expensive)
 * - Yuka's optimized priority queue vs our Map-based linear scan
 * - Graph is built once per board and updated incrementally
 */

import { AStar, Edge, Graph, Node } from "yuka";
import type { GeneratedBoard, TileData } from "../../board";
import { isPassableFor, movementCost } from "../../board";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const DIRECTIONS = [
	[0, -1], // North
	[0, 1], // South
	[1, 0], // East
	[-1, 0], // West
];

/** Convert (x, z) to a flat node index. */
function tileIndex(x: number, z: number, width: number): number {
	return z * width + x;
}

/** Convert flat index back to (x, z). */
function indexToTile(index: number, width: number): { x: number; z: number } {
	return { x: index % width, z: Math.floor(index / width) };
}

// ---------------------------------------------------------------------------
// NavGraph builder
// ---------------------------------------------------------------------------

export interface NavGraphResult {
	graph: Graph;
	width: number;
	height: number;
	/** When true, X-axis wraps (longitude on sphere). */
	wrapX: boolean;
}

/**
 * Build a Yuka Graph from a GeneratedBoard.
 * Each passable tile becomes a Node; each valid neighbor connection becomes an Edge
 * with cost = movementCost(destination tile).
 *
 * When useSphere=true, the X axis wraps (tileX=0 ↔ tileX=width-1) to support
 * east-west traversal on the sphere's equirectangular projection.
 */
export function buildNavGraph(
	board: GeneratedBoard,
	useSphere = true,
): NavGraphResult {
	const { width, height } = board.config;
	const graph = new Graph();

	// Add nodes for every passable tile
	for (let z = 0; z < height; z++) {
		for (let x = 0; x < width; x++) {
			const tile = board.tiles[z][x];
			if (isPassableFor(tile)) {
				const node = new Node(tileIndex(x, z, width));
				graph.addNode(node);
			}
		}
	}

	// Add edges for each passable neighbor.
	// Vertical edges: only connect tiles with elevation difference <= 1 (ramp).
	// Tiles with elevation difference > 1 (cliff) are not traversable.
	// Ramp traversal adds +1 cost on top of the base movement cost.
	for (let z = 0; z < height; z++) {
		for (let x = 0; x < width; x++) {
			const tile = board.tiles[z][x];
			if (!isPassableFor(tile)) continue;

			const fromIdx = tileIndex(x, z, width);

			for (const [dx, dz] of DIRECTIONS) {
				let nx = x + dx;
				const nz = z + dz;

				// Sphere wrapping: X axis wraps around (longitude)
				if (useSphere) {
					nx = ((nx % width) + width) % width;
				}

				if (nx < 0 || nx >= width || nz < 0 || nz >= height) continue;

				const neighbor = board.tiles[nz][nx];
				if (!isPassableFor(neighbor)) continue;

				// Depth layer gating: only connect if elevation difference <= 1
				const elevDiff = Math.abs(tile.elevation - neighbor.elevation);
				if (elevDiff > 1) continue;

				const toIdx = tileIndex(nx, nz, width);
				const baseCost = movementCost(neighbor);
				// Uphill ramp traversal costs +1 extra movement; downhill is free
				const isUphill = neighbor.elevation > tile.elevation;
				const cost = isUphill ? baseCost + 1 : baseCost;
				graph.addEdge(new Edge(fromIdx, toIdx, cost));
			}
		}
	}

	return { graph, width, height, wrapX: useSphere };
}

/**
 * Update edge cost for a specific tile (e.g., corruption increases cost).
 * Updates all edges pointing TO this tile.
 */
export function updateTileCost(
	navGraph: NavGraphResult,
	x: number,
	z: number,
	newCost: number,
): void {
	const toIdx = tileIndex(x, z, navGraph.width);
	const edges: Edge[] = [];

	// Find all edges pointing to this tile
	for (const [dx, dz] of DIRECTIONS) {
		const nx = x + dx;
		const nz = z + dz;
		if (nx < 0 || nx >= navGraph.width || nz < 0 || nz >= navGraph.height)
			continue;
		const fromIdx = tileIndex(nx, nz, navGraph.width);
		if (navGraph.graph.hasEdge(fromIdx, toIdx)) {
			navGraph.graph.getEdgesOfNode(fromIdx, edges);
			for (const edge of edges) {
				if (edge.to === toIdx) {
					edge.cost = newCost;
				}
			}
			edges.length = 0;
		}
	}
}

// ---------------------------------------------------------------------------
// A* pathfinding using Yuka
// ---------------------------------------------------------------------------

/**
 * Custom heuristic using Manhattan distance for our grid.
 * Yuka's default uses Euclidean on node positions, but our nodes
 * don't have 3D positions — they're indexed by tile coordinates.
 *
 * When wrapX=true, the X-axis distance accounts for east-west wrapping
 * (shortest path may cross the board edge on a sphere).
 */
class ManhattanHeuristic {
	private width: number;
	private wrapX: boolean;

	constructor(width: number, wrapX = false) {
		this.width = width;
		this.wrapX = wrapX;
	}

	calculate(_graph: Graph, source: number, target: number): number {
		const sx = source % this.width;
		const sz = Math.floor(source / this.width);
		const tx = target % this.width;
		const tz = Math.floor(target / this.width);

		let dx = Math.abs(sx - tx);
		if (this.wrapX) {
			dx = Math.min(dx, this.width - dx);
		}
		return dx + Math.abs(sz - tz);
	}
}

/**
 * Find shortest path using Yuka's A*.
 * Returns tile coordinates array (like adjacency.shortestPath).
 */
export function yukaShortestPath(
	fromX: number,
	fromZ: number,
	toX: number,
	toZ: number,
	navGraph: NavGraphResult,
): Array<{ x: number; z: number }> {
	const { graph, width } = navGraph;
	const sourceIdx = tileIndex(fromX, fromZ, width);
	const targetIdx = tileIndex(toX, toZ, width);

	if (!graph.hasNode(sourceIdx) || !graph.hasNode(targetIdx)) {
		return [];
	}

	const astar = new AStar(graph, sourceIdx, targetIdx);
	astar.heuristic = new ManhattanHeuristic(width, navGraph.wrapX);
	astar.search();

	if (!astar.found) return [];

	return astar.getPath().map((idx) => indexToTile(idx, width));
}

// ---------------------------------------------------------------------------
// Module-level cache — rebuilt when board changes
// ---------------------------------------------------------------------------

let _cachedNavGraph: NavGraphResult | null = null;
let _cachedBoardSeed: string | null = null;

/**
 * Get or build the NavGraph for the given board.
 * Cached by board seed — only rebuilds when the board changes.
 */
export function getOrBuildNavGraph(
	board: GeneratedBoard,
	useSphere = true,
): NavGraphResult {
	const key = `${board.config.seed}_${board.config.width}_${board.config.height}_${useSphere}`;
	if (_cachedNavGraph && _cachedBoardSeed === key) {
		return _cachedNavGraph;
	}
	_cachedNavGraph = buildNavGraph(board, useSphere);
	_cachedBoardSeed = key;
	return _cachedNavGraph;
}

/** Clear the cached NavGraph (e.g., on new game). */
export function clearNavGraphCache(): void {
	_cachedNavGraph = null;
	_cachedBoardSeed = null;
}

// ---------------------------------------------------------------------------
// Sphere-aware Manhattan distance
// ---------------------------------------------------------------------------

/**
 * Manhattan distance between two tiles, optionally wrapping X for sphere.
 * When wrapX=true, the horizontal distance is min(|dx|, width - |dx|).
 */
export function sphereManhattan(
	ax: number,
	az: number,
	bx: number,
	bz: number,
	width: number,
	wrapX = false,
): number {
	let dx = Math.abs(ax - bx);
	if (wrapX) dx = Math.min(dx, width - dx);
	return dx + Math.abs(az - bz);
}

// Re-export for convenience
export { tileIndex, indexToTile };
