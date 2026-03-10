/**
 * Navigation mesh built from terrain.
 *
 * Samples terrain walkability on a coarse grid to build a navigation graph.
 * A* pathfinding over the graph produces world-space waypoints.
 * Line-of-sight path smoothing removes redundant waypoints for natural movement.
 */

import { isInsideBuilding, nearBuildingEdge } from "../ecs/cityLayout";
import {
	getWalkCost,
	isWalkable,
	WORLD_HALF,
	WORLD_SIZE,
} from "../ecs/terrain";
import type { Vec3 } from "../ecs/types";

// Navigation graph resolution — one node every NAV_STEP world units
export const NAV_STEP = 2;
const NAV_SIZE = Math.floor(WORLD_SIZE / NAV_STEP); // nodes per axis

// Walkability grid: true = walkable
let walkGrid: boolean[] = [];
// Walk cost grid
let costGrid: number[] = [];

/** Initialize the navigation graph by sampling terrain walkability. */
export function buildNavGraph() {
	const total = NAV_SIZE * NAV_SIZE;
	walkGrid = new Array(total);
	costGrid = new Array(total);

	for (let gz = 0; gz < NAV_SIZE; gz++) {
		for (let gx = 0; gx < NAV_SIZE; gx++) {
			const wx = gx * NAV_STEP - WORLD_HALF + NAV_STEP / 2;
			const wz = gz * NAV_STEP - WORLD_HALF + NAV_STEP / 2;
			const idx = gz * NAV_SIZE + gx;

			// Buildings block movement
			if (isInsideBuilding(wx, wz)) {
				walkGrid[idx] = false;
				costGrid[idx] = 0;
			} else {
				walkGrid[idx] = isWalkable(wx, wz);
				costGrid[idx] = getWalkCost(wx, wz);
				// Slightly higher cost near building edges (units hug walls less)
				if (nearBuildingEdge(wx, wz)) {
					costGrid[idx] = Math.max(costGrid[idx], 1.3);
				}
			}
		}
	}
}

// --- Coordinate conversion ---

function worldToNav(wx: number, wz: number): { gx: number; gz: number } {
	return {
		gx: Math.floor((wx + WORLD_HALF) / NAV_STEP),
		gz: Math.floor((wz + WORLD_HALF) / NAV_STEP),
	};
}

function navToWorld(gx: number, gz: number): { x: number; z: number } {
	return {
		x: gx * NAV_STEP - WORLD_HALF + NAV_STEP / 2,
		z: gz * NAV_STEP - WORLD_HALF + NAV_STEP / 2,
	};
}

function navIndex(gx: number, gz: number): number {
	return gz * NAV_SIZE + gx;
}

function inBounds(gx: number, gz: number): boolean {
	return gx >= 0 && gx < NAV_SIZE && gz >= 0 && gz < NAV_SIZE;
}

// --- A* pathfinding ---

interface AStarNode {
	gx: number;
	gz: number;
	g: number;
	f: number;
	parentIdx: number; // index into closedList, -1 for start
}

const NEIGHBORS = [
	[0, -1],
	[0, 1],
	[-1, 0],
	[1, 0],
	[-1, -1],
	[-1, 1],
	[1, -1],
	[1, 1],
];

function heuristic(ax: number, az: number, bx: number, bz: number): number {
	const dx = Math.abs(ax - bx);
	const dz = Math.abs(az - bz);
	// Octile distance (consistent heuristic for 8-directional movement)
	return Math.max(dx, dz) + 0.414 * Math.min(dx, dz);
}

/**
 * Find a path from start to goal in world coordinates.
 * Returns array of Vec3 waypoints, or empty array if no path.
 */
export function findNavPath(
	startX: number,
	startZ: number,
	goalX: number,
	goalZ: number,
	maxNodes: number = 5000,
): Vec3[] {
	const start = worldToNav(startX, startZ);
	const goal = worldToNav(goalX, goalZ);

	// Clamp to bounds
	start.gx = Math.max(0, Math.min(NAV_SIZE - 1, start.gx));
	start.gz = Math.max(0, Math.min(NAV_SIZE - 1, start.gz));
	goal.gx = Math.max(0, Math.min(NAV_SIZE - 1, goal.gx));
	goal.gz = Math.max(0, Math.min(NAV_SIZE - 1, goal.gz));

	// If goal is unwalkable, find nearest walkable node
	if (!walkGrid[navIndex(goal.gx, goal.gz)]) {
		const nearest = findNearestWalkable(goal.gx, goal.gz);
		if (!nearest) return [];
		goal.gx = nearest.gx;
		goal.gz = nearest.gz;
	}

	if (!walkGrid[navIndex(start.gx, start.gz)]) {
		const nearest = findNearestWalkable(start.gx, start.gz);
		if (!nearest) return [];
		start.gx = nearest.gx;
		start.gz = nearest.gz;
	}

	// A* with binary heap would be ideal but linear scan is fine for <5000 nodes
	const open: AStarNode[] = [];
	const closedList: AStarNode[] = [];
	const visited = new Set<number>();

	const h = heuristic(start.gx, start.gz, goal.gx, goal.gz);
	open.push({ gx: start.gx, gz: start.gz, g: 0, f: h, parentIdx: -1 });

	while (open.length > 0 && closedList.length < maxNodes) {
		// Find node with lowest f
		let bestI = 0;
		for (let i = 1; i < open.length; i++) {
			if (open[i].f < open[bestI].f) bestI = i;
		}
		const current = open.splice(bestI, 1)[0];
		const currentKey = navIndex(current.gx, current.gz);

		if (visited.has(currentKey)) continue;
		visited.add(currentKey);

		const closedIdx = closedList.length;
		closedList.push(current);

		// Goal reached?
		if (current.gx === goal.gx && current.gz === goal.gz) {
			return reconstructPath(
				closedList,
				closedIdx,
				startX,
				startZ,
				goalX,
				goalZ,
			);
		}

		// Explore neighbors
		for (const [dx, dz] of NEIGHBORS) {
			const nx = current.gx + dx;
			const nz = current.gz + dz;
			if (!inBounds(nx, nz)) continue;

			const nKey = navIndex(nx, nz);
			if (visited.has(nKey)) continue;
			if (!walkGrid[nKey]) continue;

			const isDiag = dx !== 0 && dz !== 0;
			const moveCost = costGrid[nKey] * (isDiag ? 1.414 : 1.0) * NAV_STEP;
			const g = current.g + moveCost;
			const f = g + heuristic(nx, nz, goal.gx, goal.gz) * NAV_STEP;

			open.push({ gx: nx, gz: nz, g, f, parentIdx: closedIdx });
		}
	}

	return []; // no path found
}

function reconstructPath(
	closed: AStarNode[],
	goalIdx: number,
	startX: number,
	startZ: number,
	goalX: number,
	goalZ: number,
): Vec3[] {
	// Walk back through parents
	const navPath: { gx: number; gz: number }[] = [];
	let idx = goalIdx;
	while (idx >= 0) {
		navPath.unshift({ gx: closed[idx].gx, gz: closed[idx].gz });
		idx = closed[idx].parentIdx;
	}

	// Convert to world coords
	const worldPath: Vec3[] = navPath.map((n) => {
		const w = navToWorld(n.gx, n.gz);
		return { x: w.x, y: 0, z: w.z };
	});

	// Replace first and last with exact positions
	if (worldPath.length > 0) {
		worldPath[0] = { x: startX, y: 0, z: startZ };
		worldPath[worldPath.length - 1] = { x: goalX, y: 0, z: goalZ };
	}

	// Smooth path using line-of-sight checks
	return smoothPath(worldPath);
}

/** Find nearest walkable nav node to (gx, gz) via BFS. */
function findNearestWalkable(
	gx: number,
	gz: number,
): { gx: number; gz: number } | null {
	const queue: [number, number][] = [[gx, gz]];
	const visited = new Set<number>();
	visited.add(navIndex(gx, gz));

	while (queue.length > 0) {
		const [cx, cz] = queue.shift()!;
		if (walkGrid[navIndex(cx, cz)]) return { gx: cx, gz: cz };

		for (const [dx, dz] of NEIGHBORS) {
			const nx = cx + dx;
			const nz = cz + dz;
			if (!inBounds(nx, nz)) continue;
			const key = navIndex(nx, nz);
			if (visited.has(key)) continue;
			visited.add(key);
			queue.push([nx, nz]);
		}
	}
	return null;
}

// --- Path smoothing via line-of-sight ---

/**
 * Remove redundant waypoints by checking if a straight line between
 * non-adjacent waypoints is walkable (all nav cells along the line are walkable).
 */
function smoothPath(path: Vec3[]): Vec3[] {
	if (path.length <= 2) return path;

	const result: Vec3[] = [path[0]];
	let current = 0;

	while (current < path.length - 1) {
		// Try to skip as many waypoints as possible
		let furthest = current + 1;
		for (let i = path.length - 1; i > current + 1; i--) {
			if (hasLineOfSight(path[current], path[i])) {
				furthest = i;
				break;
			}
		}
		result.push(path[furthest]);
		current = furthest;
	}

	return result;
}

/** Check if a straight line between two points is walkable (terrain + buildings). */
function hasLineOfSight(a: Vec3, b: Vec3): boolean {
	const dx = b.x - a.x;
	const dz = b.z - a.z;
	const dist = Math.sqrt(dx * dx + dz * dz);
	const steps = Math.ceil(dist / (NAV_STEP * 0.5)); // sample every half nav step

	for (let i = 0; i <= steps; i++) {
		const t = i / steps;
		const x = a.x + dx * t;
		const z = a.z + dz * t;
		if (!isWalkable(x, z) || isInsideBuilding(x, z)) return false;
	}
	return true;
}
