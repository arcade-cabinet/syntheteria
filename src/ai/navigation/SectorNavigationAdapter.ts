import { findPath } from "../../systems/pathfinding";
import type {
	NavigationAdapter,
	NavigationPathNode,
	NavigationPoint,
} from "./NavigationAdapter";

export class SectorNavigationAdapter implements NavigationAdapter {
	readonly kind = "sector" as const;

	findPath(
		start: NavigationPoint,
		goal: NavigationPoint,
	): NavigationPathNode[] {
		return findPath(start, goal);
	}
}
