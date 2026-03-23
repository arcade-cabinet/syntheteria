import { findPath } from "../../systems/pathfinding";
import type {
	NavigationAdapter,
	NavigationPathNode,
	NavigationPoint,
} from "./NavigationAdapter";

export class HexNavigationAdapter implements NavigationAdapter {
	readonly kind = "hex" as const;

	findPath(
		start: NavigationPoint,
		goal: NavigationPoint,
	): NavigationPathNode[] {
		return findPath(start, goal);
	}
}
