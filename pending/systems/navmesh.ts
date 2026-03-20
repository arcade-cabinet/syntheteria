import movementConfig from "../config/movement.json";
import { worldToGrid } from "../world/sectorCoordinates";
import {
	getNeighborSectorCells,
	getPassableSectorCell,
} from "../world/structuralSpace";
import {
	getBlockedCells,
	getCachedPath,
	invalidatePathCache,
	setCachedPath,
} from "./pathfindingCache";

export interface PathResult {
	path: { q: number; r: number }[];
	cost: number;
	valid: boolean;
}

const EMPTY_PATH: PathResult = { path: [], cost: 0, valid: false };

type NavNode = {
	q: number;
	r: number;
	g: number;
	f: number;
	parent: string | null;
};

function cellKey(q: number, r: number) {
	return `${q},${r}`;
}

function heuristic(aq: number, ar: number, bq: number, br: number): number {
	return Math.max(Math.abs(aq - bq), Math.abs(ar - br));
}

function getMovementCost(floorPresetId: string): number {
	const costs = movementConfig.zoneCosts as Record<string, number>;
	return costs[floorPresetId] ?? movementConfig.defaultCost;
}

/**
 * Determines whether a cell is truly passable, accounting for both the
 * cell's own passability flag and any blocking structures placed on it.
 */
function isCellPassable(
	q: number,
	r: number,
	blockedCells: Set<string>,
): boolean {
	if (blockedCells.has(cellKey(q, r))) {
		return false;
	}
	return true;
}

export function findNavPath(
	startX: number,
	startZ: number,
	goalX: number,
	goalZ: number,
	maxNodes?: number,
): { q: number; r: number }[] {
	const result = findNavPathWithCost(startX, startZ, goalX, goalZ, maxNodes);
	return result.path;
}

export function findNavPathWithCost(
	startX: number,
	startZ: number,
	goalX: number,
	goalZ: number,
	maxNodes?: number,
	unitId?: string,
): PathResult {
	const limit = maxNodes ?? movementConfig.maxPathNodes;
	const start = worldToGrid(startX, startZ);
	const goal = worldToGrid(goalX, goalZ);

	// Check path cache first
	if (unitId) {
		const cached = getCachedPath(unitId, start.q, start.r, goal.q, goal.r);
		if (cached) {
			return cached;
		}
	}

	const startCell = getPassableSectorCell(start.q, start.r);
	const goalCell = getPassableSectorCell(goal.q, goal.r);

	if (!startCell || !goalCell) {
		return EMPTY_PATH;
	}

	const blockedCells = getBlockedCells();

	// Goal cell blocked by structure
	if (!isCellPassable(goalCell.q, goalCell.r, blockedCells)) {
		return EMPTY_PATH;
	}

	const open: NavNode[] = [];
	const closed = new Map<string, NavNode>();
	open.push({
		q: startCell.q,
		r: startCell.r,
		g: 0,
		f: heuristic(startCell.q, startCell.r, goalCell.q, goalCell.r),
		parent: null,
	});

	const goalKey = cellKey(goalCell.q, goalCell.r);

	while (open.length > 0 && closed.size < limit) {
		let bestIndex = 0;
		for (let index = 1; index < open.length; index++) {
			if (open[index].f < open[bestIndex].f) {
				bestIndex = index;
			}
		}

		const current = open.splice(bestIndex, 1)[0];
		const currentKey = cellKey(current.q, current.r);

		if (closed.has(currentKey)) {
			continue;
		}

		closed.set(currentKey, current);
		if (currentKey === goalKey) {
			const result = reconstructPath(closed, currentKey);
			if (unitId) {
				setCachedPath(unitId, start.q, start.r, goal.q, goal.r, result);
			}
			return result;
		}

		for (const neighbor of getNeighborSectorCells(current)) {
			if (!neighbor.passable) {
				continue;
			}

			if (!isCellPassable(neighbor.q, neighbor.r, blockedCells)) {
				continue;
			}

			const neighborKey = cellKey(neighbor.q, neighbor.r);
			if (closed.has(neighborKey)) {
				continue;
			}

			const moveCost = getMovementCost(neighbor.floor_preset_id);
			const g = current.g + moveCost;
			const f = g + heuristic(neighbor.q, neighbor.r, goalCell.q, goalCell.r);
			open.push({
				q: neighbor.q,
				r: neighbor.r,
				g,
				f,
				parent: currentKey,
			});
		}
	}

	return EMPTY_PATH;
}

/**
 * Find all cells reachable from a start position within a given MP budget.
 * Returns a map from cell key to the cost to reach that cell.
 */
export function findReachableCells(
	startX: number,
	startZ: number,
	maxCost: number,
): Map<string, { q: number; r: number; cost: number }> {
	const start = worldToGrid(startX, startZ);
	const startCell = getPassableSectorCell(start.q, start.r);

	if (!startCell) {
		return new Map();
	}

	const blockedCells = getBlockedCells();
	const visited = new Map<string, { q: number; r: number; cost: number }>();
	const open: { q: number; r: number; cost: number }[] = [
		{ q: startCell.q, r: startCell.r, cost: 0 },
	];

	while (open.length > 0) {
		let bestIndex = 0;
		for (let i = 1; i < open.length; i++) {
			if (open[i].cost < open[bestIndex].cost) {
				bestIndex = i;
			}
		}
		const current = open.splice(bestIndex, 1)[0];
		const key = cellKey(current.q, current.r);

		if (visited.has(key)) {
			continue;
		}
		visited.set(key, current);

		for (const neighbor of getNeighborSectorCells(current)) {
			if (!neighbor.passable) {
				continue;
			}
			if (!isCellPassable(neighbor.q, neighbor.r, blockedCells)) {
				continue;
			}
			const neighborKey = cellKey(neighbor.q, neighbor.r);
			if (visited.has(neighborKey)) {
				continue;
			}
			const moveCost = getMovementCost(neighbor.floor_preset_id);
			const totalCost = current.cost + moveCost;
			if (totalCost <= maxCost) {
				open.push({ q: neighbor.q, r: neighbor.r, cost: totalCost });
			}
		}
	}

	// Remove the start cell from reachable set
	visited.delete(cellKey(startCell.q, startCell.r));
	return visited;
}

function reconstructPath(
	closed: Map<string, NavNode>,
	goalKey: string,
): PathResult {
	const path: { q: number; r: number }[] = [];
	let currentKey: string | null = goalKey;
	let totalCost = 0;

	const goalNode = closed.get(goalKey);
	if (goalNode) {
		totalCost = goalNode.g;
	}

	while (currentKey) {
		const node = closed.get(currentKey);
		if (!node) {
			break;
		}
		if (node.parent !== null) {
			path.unshift({ q: node.q, r: node.r });
		}
		currentKey = node.parent;
	}

	return { path, cost: totalCost, valid: path.length > 0 };
}

// Re-export cache invalidation for external use
export { invalidatePathCache };
