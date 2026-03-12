import {
	getNeighborSectorCells,
	getPassableSectorCell,
} from "../world/structuralSpace";
import { worldToGrid } from "../world/sectorCoordinates";

function heuristic(aq: number, ar: number, bq: number, br: number): number {
	return Math.max(Math.abs(aq - bq), Math.abs(ar - br));
}

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

export function findNavPath(
	startX: number,
	startZ: number,
	goalX: number,
	goalZ: number,
	maxNodes = 5000,
): { q: number; r: number }[] {
	const start = worldToGrid(startX, startZ);
	const goal = worldToGrid(goalX, goalZ);

	const startCell = getPassableSectorCell(start.q, start.r);
	const goalCell = getPassableSectorCell(goal.q, goal.r);

	if (!startCell || !goalCell) {
		return [];
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

	while (open.length > 0 && closed.size < maxNodes) {
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
			return reconstructPath(closed, currentKey);
		}

		for (const neighbor of getNeighborSectorCells(current)) {
			if (!neighbor.passable) {
				continue;
			}

			const neighborKey = cellKey(neighbor.q, neighbor.r);
			if (closed.has(neighborKey)) {
				continue;
			}

			const g = current.g + 1;
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

	return [];
}

function reconstructPath(
	closed: Map<string, NavNode>,
	goalKey: string,
): { q: number; r: number }[] {
	const path: { q: number; r: number }[] = [];
	let currentKey: string | null = goalKey;
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
	return path;
}
