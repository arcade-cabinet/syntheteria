import type {
	NavigationAdapter,
	NavigationPathNode,
	NavigationPoint,
} from "./NavigationAdapter";

export class SquareGridNavigationAdapter implements NavigationAdapter {
	readonly kind = "square" as const;

	findPath(
		start: NavigationPoint,
		goal: NavigationPoint,
	): NavigationPathNode[] {
		const startX = Math.round(start.x);
		const startZ = Math.round(start.z);
		const goalX = Math.round(goal.x);
		const goalZ = Math.round(goal.z);
		const path: NavigationPathNode[] = [];

		let currentX = startX;
		let currentZ = startZ;
		while (currentX !== goalX || currentZ !== goalZ) {
			if (currentX < goalX) currentX++;
			else if (currentX > goalX) currentX--;

			if (currentZ < goalZ) currentZ++;
			else if (currentZ > goalZ) currentZ--;

			path.push({ q: currentX, r: currentZ });
		}

		return path;
	}
}
