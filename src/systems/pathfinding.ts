import { gridToWorld } from "../world/sectorCoordinates";
import type { Vec3 } from "../ecs/traits";
import { findNavPath } from "./navmesh";

export function findPath(start: Vec3, goal: Vec3): { q: number; r: number }[] {
	return findNavPath(start.x, start.z, goal.x, goal.z);
}
