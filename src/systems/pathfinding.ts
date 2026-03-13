import type { Vec3 } from "../ecs/traits";
import {
	findNavPath,
	findNavPathWithCost,
	findReachableCells,
	invalidatePathCache,
	type PathResult,
} from "./navmesh";

export type { PathResult } from "./navmesh";

export function findPath(start: Vec3, goal: Vec3): { q: number; r: number }[] {
	return findNavPath(start.x, start.z, goal.x, goal.z);
}

export function findPathWithCost(
	start: Vec3,
	goal: Vec3,
	unitId?: string,
): PathResult {
	return findNavPathWithCost(
		start.x,
		start.z,
		goal.x,
		goal.z,
		undefined,
		unitId,
	);
}

export function getReachableCells(
	position: Vec3,
	maxMP: number,
): Map<string, { q: number; r: number; cost: number }> {
	return findReachableCells(position.x, position.z, maxMP);
}

export { invalidatePathCache };
