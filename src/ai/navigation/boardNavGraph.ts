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

import { Graph, Node, Edge, AStar } from "yuka";
import type { GeneratedBoard, TileData } from "../../board/types";
import { isPassableFor, movementCost } from "../../board/adjacency";

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
function indexToTile(
	index: number,
	width: number,
): { x: number; z: number } {
	return { x: index % width, z: Math.floor(index / width) };
}

// ---------------------------------------------------------------------------
// NavGraph builder
// ---------------------------------------------------------------------------

export interface NavGraphResult {
	graph: Graph;
	width: number;
	height: number;
}

/**
 * Build a Yuka Graph from a GeneratedBoard.
 * Each passable tile becomes a Node; each valid neighbor connection becomes an Edge
 * with cost = movementCost(destination tile).
 */
export function buildNavGraph(board: GeneratedBoard): NavGraphResult {
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

	// Add edges for each passable neighbor
	for (let z = 0; z < height; z++) {
		for (let x = 0; x < width; x++) {
			const tile = board.tiles[z][x];
			if (!isPassableFor(tile)) continue;

			const fromIdx = tileIndex(x, z, width);

			for (const [dx, dz] of DIRECTIONS) {
				const nx = x + dx;
				const nz = z + dz;
				if (nx < 0 || nx >= width || nz < 0 || nz >= height) continue;

				const neighbor = board.tiles[nz][nx];
				if (!isPassableFor(neighbor)) continue;

				const toIdx = tileIndex(nx, nz, width);
				const cost = movementCost(neighbor);
				graph.addEdge(new Edge(fromIdx, toIdx, cost));
			}
		}
	}

	return { graph, width, height };
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
 */
class ManhattanHeuristic {
	private width: number;

	constructor(width: number) {
		this.width = width;
	}

	calculate(_graph: Graph, source: number, target: number): number {
		const sx = source % this.width;
		const sz = Math.floor(source / this.width);
		const tx = target % this.width;
		const tz = Math.floor(target / this.width);
		return Math.abs(sx - tx) + Math.abs(sz - tz);
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
	astar.heuristic = new ManhattanHeuristic(width);
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
export function getOrBuildNavGraph(board: GeneratedBoard): NavGraphResult {
	const key = `${board.config.seed}_${board.config.width}_${board.config.height}`;
	if (_cachedNavGraph && _cachedBoardSeed === key) {
		return _cachedNavGraph;
	}
	_cachedNavGraph = buildNavGraph(board);
	_cachedBoardSeed = key;
	return _cachedNavGraph;
}

/** Clear the cached NavGraph (e.g., on new game). */
export function clearNavGraphCache(): void {
	_cachedNavGraph = null;
	_cachedBoardSeed = null;
}

// Re-export for convenience
export { tileIndex, indexToTile };
