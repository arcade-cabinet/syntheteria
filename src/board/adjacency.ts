import { BIOME_DEFS } from "../terrain";
import type { GeneratedBoard, TileData, WeightClass } from "./types";

const DIRECTIONS = [
	[0, -1], // North
	[0, 1], // South
	[1, 0], // East
	[-1, 0], // West
];

/** Amphibious specialization tracks that allow water traversal. */
const AMPHIBIOUS_TRACKS = new Set([
	"amphibious_recon",
	"marine",
	"aquatic_engineer",
]);
/** Aerial specialization tracks that allow mountain and water traversal. */
const AERIAL_TRACKS = new Set(["aerial_striker"]);

/** Returns true if the tile is passable for the given weight class and specialization. */
export function isPassableFor(
	tile: TileData,
	weightClass: WeightClass = "medium",
	specialization?: string,
): boolean {
	if (tile.biomeType === "water") {
		if (
			specialization &&
			(AMPHIBIOUS_TRACKS.has(specialization) ||
				AERIAL_TRACKS.has(specialization))
		) {
			return true;
		}
		return false;
	}
	if (tile.biomeType === "mountain") {
		if (specialization && AERIAL_TRACKS.has(specialization)) {
			return true;
		}
		return false;
	}
	if (tile.biomeType === "wetland" && weightClass !== "light") return false;
	return true;
}

/**
 * Returns the movement cost for entering the given tile.
 * Reads base cost from BIOME_DEFS. Heavy units pay extra in wetland.
 * When sourceElevation is provided, going UPHILL adds +1 per elevation level.
 */
export function movementCost(
	tile: TileData,
	weightClass: WeightClass = "medium",
	sourceElevation?: number,
): number {
	const biomeDef = BIOME_DEFS[tile.biomeType];
	let cost = biomeDef?.movementCost ?? 1;

	if (tile.biomeType === "wetland" && weightClass === "heavy") cost = 3;

	if (sourceElevation !== undefined && tile.elevation > sourceElevation) {
		cost += tile.elevation - sourceElevation;
	}
	return cost;
}

/** Returns the up to 4 passable neighbors (N/S/E/W) of tile at (x,z).
 *  Respects depth layers: only connects tiles with elevation difference <= 1 (ramp).
 *  Cliffs (elevation diff > 1) block traversal. */
export function tileNeighbors(
	x: number,
	z: number,
	board: GeneratedBoard,
	weightClass?: WeightClass,
): TileData[] {
	const { width, height } = board.config;
	const sourceTile = board.tiles[z]?.[x];
	if (!sourceTile) return [];
	const neighbors: TileData[] = [];

	for (const [dx, dz] of DIRECTIONS) {
		const nx = x + dx;
		const nz = z + dz;
		if (nx < 0 || nx >= width || nz < 0 || nz >= height) continue;
		const tile = board.tiles[nz][nx];
		if (
			weightClass !== undefined
				? !isPassableFor(tile, weightClass)
				: !tile.passable
		)
			continue;
		// Depth layer gating: only traverse ramps (elevation diff <= 1), not cliffs
		if (Math.abs(sourceTile.elevation - tile.elevation) > 1) continue;
		neighbors.push(tile);
	}

	return neighbors;
}

/**
 * BFS: all tiles reachable from (fromX, fromZ) within `maxSteps` movement cost.
 * Returns Set of "x,z" keys. Includes start tile. Only traverses passable tiles.
 * When weightClass is provided, uses isPassableFor and movementCost instead of tile.passable.
 */
export function reachableTiles(
	fromX: number,
	fromZ: number,
	maxSteps: number,
	board: GeneratedBoard,
	weightClass?: WeightClass,
): Set<string> {
	const result = new Set<string>();
	const startTile = board.tiles[fromZ]?.[fromX];
	if (!startTile) return result;
	if (
		weightClass !== undefined
			? !isPassableFor(startTile, weightClass)
			: !startTile.passable
	)
		return result;

	const startKey = `${fromX},${fromZ}`;
	result.add(startKey);

	// Track accumulated cost to each tile for Dijkstra-style BFS
	const costMap = new Map<string, number>();
	costMap.set(startKey, 0);

	const queue: [number, number, number][] = [[fromX, fromZ, 0]];

	while (queue.length > 0) {
		const [cx, cz, cost] = queue.shift()!;
		if (cost >= maxSteps) continue;

		const sourceTile = board.tiles[cz]?.[cx];
		const neighbors = tileNeighbors(cx, cz, board, weightClass);
		for (const neighbor of neighbors) {
			const key = `${neighbor.x},${neighbor.z}`;
			const stepCost =
				weightClass !== undefined
					? movementCost(neighbor, weightClass, sourceTile?.elevation)
					: movementCost(neighbor, "medium", sourceTile?.elevation);
			const newCost = cost + stepCost;
			if (newCost > maxSteps) continue;
			const prevCost = costMap.get(key);
			if (prevCost === undefined || newCost < prevCost) {
				costMap.set(key, newCost);
				result.add(key);
				queue.push([neighbor.x, neighbor.z, newCost]);
			}
		}
	}

	return result;
}

/**
 * A* shortest path from (fromX,fromZ) to (toX,toZ). Returns tile sequence.
 * Returns empty array if no path.
 */
export function shortestPath(
	fromX: number,
	fromZ: number,
	toX: number,
	toZ: number,
	board: GeneratedBoard,
): TileData[] {
	const startTile = board.tiles[fromZ]?.[fromX];
	const endTile = board.tiles[toZ]?.[toX];

	if (!startTile?.passable || !endTile?.passable) return [];

	// Path to self
	if (fromX === toX && fromZ === toZ) return [startTile];

	function heuristic(x: number, z: number): number {
		return Math.abs(x - toX) + Math.abs(z - toZ);
	}

	const openSet = new Map<string, { x: number; z: number }>();
	const cameFrom = new Map<string, string>();
	const gScore = new Map<string, number>();
	const fScore = new Map<string, number>();

	const startKey = `${fromX},${fromZ}`;
	openSet.set(startKey, { x: fromX, z: fromZ });
	gScore.set(startKey, 0);
	fScore.set(startKey, heuristic(fromX, fromZ));

	while (openSet.size > 0) {
		// Find node in openSet with lowest fScore
		let currentKey = "";
		let currentF = Number.POSITIVE_INFINITY;
		for (const [key] of openSet) {
			const f = fScore.get(key) ?? Number.POSITIVE_INFINITY;
			if (f < currentF) {
				currentF = f;
				currentKey = key;
			}
		}

		const current = openSet.get(currentKey)!;
		const endKey = `${toX},${toZ}`;

		if (currentKey === endKey) {
			// Reconstruct path
			const path: TileData[] = [];
			let traceKey: string | undefined = endKey;
			while (traceKey !== undefined) {
				const [tx, tz] = traceKey.split(",").map(Number);
				path.unshift(board.tiles[tz][tx]);
				traceKey = cameFrom.get(traceKey);
			}
			return path;
		}

		openSet.delete(currentKey);
		const currentTile = board.tiles[current.z][current.x];
		const neighbors = tileNeighbors(current.x, current.z, board);

		for (const neighbor of neighbors) {
			const neighborKey = `${neighbor.x},${neighbor.z}`;
			const stepCost = movementCost(neighbor, "medium", currentTile.elevation);
			const tentativeG =
				(gScore.get(currentKey) ?? Number.POSITIVE_INFINITY) + stepCost;

			if (tentativeG < (gScore.get(neighborKey) ?? Number.POSITIVE_INFINITY)) {
				cameFrom.set(neighborKey, currentKey);
				gScore.set(neighborKey, tentativeG);
				fScore.set(neighborKey, tentativeG + heuristic(neighbor.x, neighbor.z));
				if (!openSet.has(neighborKey)) {
					openSet.set(neighborKey, { x: neighbor.x, z: neighbor.z });
				}
			}
		}
	}

	return [];
}
